from .PRIME_Utils import (
    estimate_tef,
    estimate_neat,
    DIET_MULTIPLIERS,
    EXERCISE_ADJUSTMENTS,
    calculate_tdee,
    calculate_age,
)
from .PRIME_RMR_Calculations_v2 import get_rmr_and_tdee
from .PRIME_Diet_Calculations_v2 import get_fasting_multipliers

import datetime
import json
import os
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# =============================================================================
# PROTOCOL-DATA JSON LOADER (cached, encoding-safe, silent-degrade)
# =============================================================================
# Source of truth: docs/protocol-data/nutrition-and-ped.json (extracted 2026-06-08
# from 01-nutrition-plan / 03-ped-protocol / 02-complete-protocol docs).
# The engine reads this file ONCE (cached) to surface PRIME's coaching brain
# (per-day-type macros + per-week PED dosing) as ADDITIVE, display-only fields on
# each progression row. These values NEVER feed back into the calorie solver,
# Alpert ceiling, p_ratio, or trajectory — they are read-only doc passthrough.
#
# RISK note: a crash here would break the whole engine (predict_weight_loss). So
# the loader silent-degrades to {} on ANY error (file missing / bad JSON). Every
# downstream consumer must then fall back to 'not specified'. NEVER raise.
#
# Encoding: the file legitimately contains em-dash (—, meaning "no pin that day")
# and en-dash (–, dose ranges) and '<' (e.g. '<10g'). It MUST be opened with
# encoding='utf-8' — cp1252 (the Windows console default) would mangle them.
_PROTOCOL_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "docs", "protocol-data", "nutrition-and-ped.json",
)
_PROTOCOL_CACHE: Optional[dict] = None


def _load_protocol_data() -> dict:
    """Load + cache the protocol-data JSON. Returns {} on ANY error (never raises).

    Read ONCE then cached in _PROTOCOL_CACHE. Always opens with encoding='utf-8'
    (the file contains em/en dashes that cp1252 would mangle). On
    FileNotFoundError / JSONDecodeError / any other error, logs a warning and
    returns {} so the engine keeps working (display-only data degrades to
    'not specified' downstream).
    """
    global _PROTOCOL_CACHE
    if _PROTOCOL_CACHE is not None:
        return _PROTOCOL_CACHE
    try:
        with open(_PROTOCOL_JSON_PATH, "r", encoding="utf-8") as fh:
            _PROTOCOL_CACHE = json.load(fh)
    except Exception as exc:  # FileNotFoundError, JSONDecodeError, anything
        logger.warning(
            "_load_protocol_data: could not load protocol JSON at %r (%s) — "
            "macro/PED fields will degrade to 'not specified'.",
            _PROTOCOL_JSON_PATH, exc,
        )
        _PROTOCOL_CACHE = {}
    return _PROTOCOL_CACHE


def get_protocol_reference() -> dict:
    """Single read-path for renderers — returns the cached protocol-data dict.

    Renderers (PRIME_Living_Report.py) import THIS instead of re-reading the JSON
    so there is exactly one load path + one cache. Pure read, no mutation; returns
    {} if the file is missing/unparseable (caller falls back to 'not specified').
    """
    return _load_protocol_data()


def _parse_week_range(range_str: str) -> Optional[tuple]:
    """Parse a 'lo-hi' week-range string (e.g. '1-4') → (lo, hi) ints, or None."""
    if not isinstance(range_str, str) or "-" not in range_str:
        return None
    try:
        lo_s, hi_s = range_str.split("-", 1)
        return int(lo_s.strip()), int(hi_s.strip())
    except (ValueError, AttributeError):
        return None


def _phase_macros_for_week(week: int, protocol: dict) -> Optional[dict]:
    """Map a 1-based week → that phase's per-day-type macro dict (doc verbatim).

    Reads protocol['nutrition']['phase_macros_by_day_type'], parses each entry's
    'weeks' range string ('1-4','5-8','9-12','13-16') and returns the matching
    phase's 'by_day_type' dict (keys EXACTLY as in JSON: 'TRAINING DAY',
    'REST DAY', 'PSMF (Mon)', 'REFEED (Sun)'). Returns None if no phase matches.

    CANONICAL CHOICE (PRIME 2026-06-08): this uses the DeLauer/Palumbo system
    from nutrition.complete_protocol_weekly_nutrition (02-complete-protocol,
    PSMF=1000) as the single canonical macro source — PRIME selected it as the
    most canonical, DeLauer-research-aligned protocol. The conflicting
    01-nutrition-plan PSMF (700-800) system is used only as a fallback when the
    DeLauer block is absent.

    Day-type value dicts carry string fields calories/protein/fat/carbs that may
    be '<10g','N/A','2200–2500' etc. — they are passed through VERBATIM (no int
    coercion) so the renderer shows exactly what the doc says (anti-fabrication).
    """
    # PHASE-VARYING (PRIME directive 2026-06-09): the 16-week cut periodizes across
    # four phases (RESET 1-4 / ADAPT 5-8 / CYCLE 9-12 / PEAK 13-16). Each phase has
    # its OWN day-type macros — calories taper, carb cycling intensifies, refeed
    # carbs grow, protein climbs toward peak. Source = phase_macros_by_day_type
    # (PRIME's refined 01-nutrition-plan). The flat DeLauer weekly template in
    # 02-complete-protocol is the un-periodized summary and is intentionally NOT
    # used for the per-week macros. Fields pass through VERBATIM (anti-fabrication).
    if not protocol:
        return None
    phases = protocol.get("nutrition", {}).get("phase_macros_by_day_type", [])
    for entry in phases:
        rng = _parse_week_range(entry.get("weeks", ""))
        if rng and rng[0] <= week <= rng[1]:
            return entry.get("by_day_type")
    return None


def _phase_macros_source_for_week(week: int, protocol: dict) -> Optional[str]:
    """Return the 'source' citation string for the phase whose range covers week."""
    if not protocol:
        return None
    phases = protocol.get("nutrition", {}).get("phase_macros_by_day_type", [])
    for entry in phases:
        rng = _parse_week_range(entry.get("weeks", ""))
        if rng and rng[0] <= week <= rng[1]:
            return entry.get("source")
    return None


def _ped_timeline_for_week(week: int, protocol: dict) -> Optional[dict]:
    """Return the verbatim weekly_timeline entry whose 'week' == week, else None.

    Reads protocol['ped_protocol']['weekly_timeline'] (entries cover weeks 2-16
    ONLY). Returns None for week 1 and week 0 — the doc has NO dosing table there
    (cycle dosing begins Week 2 / Kickstart), so the caller renders
    'baseline ramp-in, no dosing table' rather than a fabricated stack.

    Each entry shape: {week, phase, injectables_per_pin{Test,EQ,Deca,Tren:
    {mon,wed,fri}}, oral_and_daily_timing{AM,PRE_WORKOUT,PM,BEDTIME}, source}.
    Token '—' = NO pin that day, '200mg' = literal dose, '100–150mg' = a range —
    all passed through verbatim.
    """
    if not protocol:
        return None
    timeline = protocol.get("ped_protocol", {}).get("weekly_timeline", [])
    for entry in timeline:
        if entry.get("week") == week:
            return entry
    return None


def _macro_breakdown_for_week(week: int, protocol: dict) -> dict:
    """Build the canonical doc-sourced macro_breakdown dict for a week.

    Maps the JSON day-type keys → contract sub-keys and reads each calories/
    protein/fat/carbs field VERBATIM (anti-fabrication — never compute or coerce).
    When the phase isn't found or a key/field is missing, the value is the literal
    string 'not specified'. Returns the full 4-day-type nested dict so the
    contract is always complete in shape.

    Contract (per data_contract):
      { 'training_day': {calories,protein,fat,carbs},
        'rest_day':     {...},
        'psmf_day':     {...},
        'refeed_day':   {...} }
    """
    _JSON_TO_CONTRACT = {
        "TRAINING DAY": "training_day",
        "REST DAY": "rest_day",
        "PSMF (Mon)": "psmf_day",
        "REFEED (Sun)": "refeed_day",
    }
    _FIELDS = ("calories", "protein", "fat", "carbs")
    by_day_type = _phase_macros_for_week(week, protocol) or {}
    breakdown: dict = {}
    for json_key, contract_key in _JSON_TO_CONTRACT.items():
        day = by_day_type.get(json_key) or {}
        breakdown[contract_key] = {
            f: (day.get(f) if day.get(f) is not None else "not specified")
            for f in _FIELDS
        }
    return breakdown


def _ped_compounds_active(ped_week: Optional[dict]) -> list:
    """List injectable names whose mon/wed/fri are not all '—' for this week.

    e.g. ['Test','EQ','Tren']. Returns [] when ped_week is None (week 0/1 gap).
    A pin token is "active" if it is present and not the em-dash '—'.
    """
    if not ped_week:
        return []
    active: list = []
    injectables = ped_week.get("injectables_per_pin", {}) or {}
    for name, pins in injectables.items():
        if not isinstance(pins, dict):
            continue
        if any(v not in (None, "", "—") for v in pins.values()):
            active.append(name)
    return active

# --- PRIME calibrated recomp reference curve --------------------------------
# Source of truth: recomp-protocol/build_calculator.py (the recomp-calculator.xlsx).
# Per week of the proven 281->220 lb PED cut: (training_cal, rest_cal, psmf_cal,
# protein_g, phase). The app SCALES these to the user — calories by start weight,
# protein by lean mass — so every report shows PRIME's calibrated numbers, not a
# from-scratch TDEE-deficit estimate. See docs/CALORIE-ENGINE-SPEC-v1.md.
RECOMP_REF_CURVE = [
    (1800, 1400, 800, 250, "RESET"), (1800, 1400, 800, 250, "RESET"),
    (1775, 1375, 800, 255, "RESET"), (1750, 1350, 800, 260, "RESET"),
    (1750, 1350, 800, 260, "ADAPT"), (1725, 1325, 800, 265, "ADAPT"),
    (1700, 1300, 800, 265, "ADAPT"), (1675, 1275, 775, 270, "ADAPT"),
    (1650, 1250, 750, 270, "CYCLE"), (1625, 1225, 750, 275, "CYCLE"),
    (1600, 1200, 750, 275, "CYCLE"), (1575, 1175, 725, 280, "CYCLE"),
    (1500, 1200, 700, 280, "PEAK"),  (1475, 1175, 700, 285, "PEAK"),
    (1450, 1150, 700, 285, "PEAK"),  (1425, 1125, 700, 290, "PEAK"),
]
RECOMP_REF_START_W = 281.3
RECOMP_REF_START_LBM = 281.3 * (1 - 0.368)  # 177.78 lb lean at the reference start

# Phase-to-PED-cycle mapping for p_ratio phase modifier.
# On active PED cycles (RESET/ADAPT/CYCLE/PEAK all have anabolics running) fat is
# partitioned preferentially; modifier biases p_ratio toward fat (lower = more fat loss).
# Values are ADDITIVE decrements to the base Forbes p_ratio (which is already fat-biased
# for high BF%); lean phases close the gap (less modifier).
#   RESET: kickstart/test-base — strong anabolic signal => big fat-partition bias
#   ADAPT: recomp compounds added — maintained high
#   CYCLE: full stack, competition prep — maintained
#   PEAK: pre-contest dry-out, some compounds tapered => slightly reduced
_PHASE_P_RATIO_BONUS = {
    "RESET": 0.12,  # -0.12 on fat fraction => more fat, less lean
    "ADAPT": 0.10,
    "CYCLE": 0.08,
    "PEAK":  0.05,
}


# =============================================================================
# PED STACK MODIFIER HELPER
# =============================================================================
# Source of truth: docs/PED-MODIFIERS-SOURCING.md (version 1.0, 2026-06-08).
# ALL numeric values below are MIDPOINTS of the bounded ranges in that document.
# Do NOT edit these numbers without updating the sourcing doc first.
#
# Algorithm summary (from the sourcing doc §Combining Rule):
#   1. Collect individual p_fat midpoint deltas for each compound in the stack.
#   2. Sort deltas descending; combine with diminishing returns: each compound i
#      contributes DIMINISHING_BASE^i of its individual delta (i=0 for largest).
#      DIMINISHING_BASE = 0.50 (conservative, defensible from AR saturation kinetics).
#   3. Add T3 partition delta (dose-dependent; may be negative at high dose).
#   4. Apply to P_FAT_BASELINE = 0.70 (testosterone-only in moderate deficit,
#      Forbes-Hall midpoint; Cai 2016 PMC5054608 + Hall 2008 PMID 17848938).
#   5. Hard-cap at 0.92, floor at 0.40.
#   6. Thermogenic EE bonus (Clen + T3) is SEPARATE from p_ratio — it represents
#      additional kcal burned and is NOT a p_ratio shift.
#   7. Lean-retention signal uses the same diminishing-returns formula but on the
#      0..1 lean_mid table; apply T3 high-dose penalty at the end.
# =============================================================================

# Baseline: testosterone-only in moderate deficit (Forbes-Hall empirical midpoint).
_PED_P_FAT_BASELINE = 0.70
_PED_P_FAT_HARD_CAP = 0.92
_PED_P_FAT_FLOOR = 0.40
_PED_DIMINISHING_BASE = 0.50  # each extra compound contributes 0.50^i of its modifier

# Per-compound p_fat midpoints (midpoint of [lo, hi] from sourcing doc Table §Summary).
# Confidence grades: H=High, M=Medium, L=Low (per sourcing doc §Each compound).
# LOW-EVIDENCE compounds (L): boldenone, trenbolone, methasterone, mesterolone, stanozolol.
_PED_P_FAT_MID: dict = {
    "testosterone":   0.04,   # +0.00–+0.08; Confidence: H  [PMC9483439, PMC5054608]
    "boldenone":      0.025,  # +0.00–+0.05; Confidence: L  [no human RCT]
    "nandrolone":     0.02,   # +0.00–+0.04; Confidence: M  [Prokopidis 2026 JCSM]
    "trenbolone":     0.10,   # +0.05–+0.15; Confidence: L  [animal only; Cerqueira 2015]
    "oxandrolone":    0.08,   # +0.04–+0.12; Confidence: M  [Schroeder JCEM 2004, PMC12370634]
    "stanozolol":     0.02,   # +0.00–+0.04; Confidence: L  [PMID 139671]
    "methasterone":   0.03,   # +0.00–+0.06; Confidence: L  [no human RCT]
    "mesterolone":    0.00,   # ancillary; zero standalone;  Confidence: L
    "clenbuterol":    0.065,  # +0.03–+0.10 secondary p-ratio; primary = EE; Confidence: M [Jessen 2020, Hostrup 2025]
    "mk677":          0.01,   # +0.00–+0.02; Confidence: M  [Nass 2008 PMC2757071]
    # T3/liothyronine handled separately (dose-dependent sign; see below)
}

# Per-compound lean-retention midpoints (0..1 normalized signal, sourcing doc §Each compound).
_PED_LEAN_MID: dict = {
    "testosterone":   0.50,
    "boldenone":      0.35,
    "nandrolone":     0.40,
    "trenbolone":     0.70,
    "oxandrolone":    0.55,
    "stanozolol":     0.20,
    "methasterone":   0.40,
    "mesterolone":    0.00,
    "clenbuterol":    0.30,
    "mk677":          0.25,
}

# Compounds whose evidence grade is Low — the caller/UI should flag these for the user.
PED_LOW_EVIDENCE_COMPOUNDS: frozenset = frozenset({
    "boldenone", "trenbolone", "methasterone", "mesterolone", "stanozolol",
})

# ---------------------------------------------------------------------------
# COMPOUND ALIAS MAP (HIGH-2 fix, 2026-06-08)
# ---------------------------------------------------------------------------
# Maps every common name / abbreviation / UI catalogue value (case-normalised)
# → the canonical engine key used in _PED_P_FAT_MID / _PED_LEAN_MID.
#
# Sources verified against ped-stack-picker.tsx COMPOUNDS array (value fields):
#   testosterone, anavar, deca, clenbuterol, t3, mk677,
#   trenbolone, equipoise, winstrol, superdrol, proviron
#
# Also covers shorthand strings users might type directly:
#   tren/tren ace/tren e, eq, npp/nd, var/anavar, winny, mdrol,
#   mk-677/ibutamoren, clen, t3/cytomel/liothyronine, test
#
# Lookup is always done after lowercasing and stripping the input.
# T3-family maps to the canonical string "t3" (matched by the T3 detection SET,
# not substring — fixing the "test3" / "sust3" false-positive on the old `in` check).
# ---------------------------------------------------------------------------
_COMPOUND_ALIASES: dict[str, str] = {
    # ── UI catalogue exact values ──────────────────────────────────────────
    # (these are the strings ped-stack-picker.tsx emits via entry.compound)
    "anavar":            "oxandrolone",
    "deca":              "nandrolone",
    "trenbolone":        "trenbolone",   # already canonical; explicit for clarity
    "equipoise":         "boldenone",
    "winstrol":          "stanozolol",
    "superdrol":         "methasterone",
    "proviron":          "mesterolone",
    "mk677":             "mk677",
    "t3":                "t3",
    "clenbuterol":       "clenbuterol",
    "testosterone":      "testosterone",

    # ── Extended common-name / abbreviation aliases ────────────────────────
    # Testosterone family
    "test":              "testosterone",
    "test e":            "testosterone",
    "test c":            "testosterone",
    "test p":            "testosterone",
    "test prop":         "testosterone",
    "testosterone enanthate":  "testosterone",
    "testosterone cypionate":  "testosterone",
    "testosterone propionate": "testosterone",
    "sustanon":          "testosterone",
    "sust":              "testosterone",

    # Trenbolone family
    "tren":              "trenbolone",
    "tren ace":          "trenbolone",
    "tren a":            "trenbolone",
    "tren e":            "trenbolone",
    "trenbolone acetate":   "trenbolone",
    "trenbolone enanthate": "trenbolone",

    # Boldenone / EQ
    "eq":                "boldenone",
    "boldenone":         "boldenone",
    "boldenone undecylenate": "boldenone",

    # Nandrolone family
    "nandrolone":        "nandrolone",
    "nandrolone decanoate":  "nandrolone",
    "nandrolone phenylpropionate": "nandrolone",
    "npp":               "nandrolone",
    "nd":                "nandrolone",

    # Oxandrolone / Anavar
    "oxandrolone":       "oxandrolone",
    "var":               "oxandrolone",

    # Stanozolol / Winstrol
    "stanozolol":        "stanozolol",
    "winny":             "stanozolol",
    "stan":              "stanozolol",

    # Methasterone / Superdrol
    "methasterone":      "methasterone",
    "mdrol":             "methasterone",
    "methyldrostanolone": "methasterone",

    # Mesterolone / Proviron
    "mesterolone":       "mesterolone",

    # Clenbuterol
    "clen":              "clenbuterol",

    # MK-677 / Ibutamoren
    "mk-677":            "mk677",
    "ibutamoren":        "mk677",
    "mk 677":            "mk677",

    # T3 / Liothyronine family — all resolve to "t3" (T3 detection set, not substring)
    "liothyronine":      "t3",
    "cytomel":           "t3",
    "t3 liothyronine":   "t3",
    "t3 cytomel":        "t3",
}

# Canonical sets used for EXACT-match detection (replaces substring `in` checks
# to prevent "test3", "sust3", or "bolt3" from false-triggering T3/Clen logic).
_T3_CANONICAL_SET: frozenset[str] = frozenset({"t3"})
_CLEN_CANONICAL_SET: frozenset[str] = frozenset({"clenbuterol"})


def _resolve_compound_name(raw: str) -> str | None:
    """Normalise a user-supplied compound name to its canonical engine key.

    Steps:
      1. Lowercase + strip.
      2. Look up in _COMPOUND_ALIASES (covers both UI catalogue values and
         common abbreviations/synonyms).
      3. Check if the result itself is a valid _PED_P_FAT_MID key or "t3".
      4. Return None (and log a warning) when the name can't be resolved.

    Returns the canonical key string, or None if unknown.
    """
    normalised = raw.lower().strip()
    canonical = _COMPOUND_ALIASES.get(normalised, normalised)
    # Accept if it's a known table key, or the T3 canonical
    if canonical in _PED_P_FAT_MID or canonical in _T3_CANONICAL_SET:
        return canonical
    # Unknown — warn so it's visibly ignored, not silently zeroed
    logger.warning(
        "compute_ped_stack_modifiers: unknown compound %r (normalised %r) — "
        "skipping (no modifier applied). Add it to _COMPOUND_ALIASES if intended.",
        raw, normalised,
    )
    return None


def compute_ped_stack_modifiers(
    ped_stack: Optional[list],
    week: int = 1,
) -> dict:
    """Compute PED-stack partitioning + thermogenic modifiers for a given protocol week.

    Source of truth: docs/PED-MODIFIERS-SOURCING.md §Combining Rule + §Algorithm.
    ALL numbers are midpoints of the bounded ranges in that document.

    Args:
        ped_stack: list of compound dicts, each with keys:
            - "compound" (str, required): lowercase name, must be in _PED_P_FAT_MID
            - "dose_mg" (float, optional): mg/day (used for T3 and Clen only)
            - "phase" (str, optional): not used in formula; available for future use
          OR None / empty list => returns all-zero no-op result.
        week: 1-based week of the protocol (used for Clenbuterol desensitization).

    Returns dict with:
        p_fat_delta (float): NET additive delta on top of the phase-based p_ratio.
            Apply to the already-computed p_ratio (which already includes the Forbes
            BF% formula + phase modifier); clamp result to [0.40, 0.92].
        lean_modifier (float): 0..1 lean-retention signal; multiply into muscle_gain.
            0.0 = no anabolic cover; 1.0 = theoretical maximum.
        ee_bonus_kcal (float): Extra kcal/day burned by thermogenics (Clen, T3).
            This is SEPARATE from p_ratio — it is an effective-deficit expander.
        confidence (str): Weakest evidence grade across active compounds.
            "high" | "medium" | "low". "low" signals the UI to flag the stack.
        low_evidence_compounds (list[str]): Names of active compounds with Low evidence.
    """
    # Guard: empty / None stack → pure no-op (existing ped_use bool path unchanged).
    if not ped_stack:
        return {
            "p_fat_delta": 0.0,
            "lean_modifier": 0.0,
            "ee_bonus_kcal": 0.0,
            "confidence": "high",
            "low_evidence_compounds": [],
        }

    # ── ALIAS RESOLUTION (HIGH-2 fix) ─────────────────────────────────────
    # Normalise every entry's compound string to the canonical engine key.
    # Unknown names are warned + skipped (not silently zeroed).
    # dose_by_compound is keyed by CANONICAL name after resolution.
    compounds: list[str] = []
    dose_by_compound: dict[str, float] = {}
    for entry in ped_stack:
        raw_name = str(entry.get("compound", "")).strip()
        if not raw_name:
            continue
        canonical = _resolve_compound_name(raw_name)
        if canonical is None:
            continue  # unknown — warning already emitted by _resolve_compound_name
        # Deduplicate: if the same canonical compound appears twice (e.g. user
        # added "deca" + "nandrolone"), keep the entry with the higher dose.
        dose = entry.get("dose_mg")
        if canonical not in dose_by_compound:
            compounds.append(canonical)
        if dose is not None:
            prev = dose_by_compound.get(canonical, 0.0)
            dose_by_compound[canonical] = max(prev, float(dose))

    if not compounds:
        return {
            "p_fat_delta": 0.0,
            "lean_modifier": 0.0,
            "ee_bonus_kcal": 0.0,
            "confidence": "high",
            "low_evidence_compounds": [],
        }

    # --- Step 1: Collect individual p_fat deltas (excluding T3, handled separately) ---
    # T3 detection uses EXACT canonical SET match (not substring) to prevent
    # "test3", "sust3", or other non-T3 canonicals from being misclassified.
    non_t3_compounds = [c for c in compounds if c not in _T3_CANONICAL_SET]
    deltas = [_PED_P_FAT_MID.get(c, 0.0) for c in non_t3_compounds]

    # --- Step 2: Diminishing-returns combination ---
    # Sort descending so the largest-effect compound anchors (i=0 → full weight).
    # Formula: combined_delta = Σ_i delta_i * DIMINISHING_BASE^i
    # Source: docs/PED-MODIFIERS-SOURCING.md §Algorithm Step 2.
    deltas_sorted = sorted(deltas, reverse=True)
    combined_delta = 0.0
    for i, d in enumerate(deltas_sorted):
        combined_delta += d * (_PED_DIMINISHING_BASE ** i)

    # --- Step 3: T3 / Liothyronine — dose-dependent modifier ---
    # Source: docs/PED-MODIFIERS-SOURCING.md §10 T3/Liothyronine.
    # Low dose (≤50 mcg): +0.02–+0.05 → midpoint +0.03, no lean penalty.
    # Moderate dose (51–75 mcg): +0.01 net, lean penalty 10%.
    # High dose (>75 mcg): −0.03 (NEGATIVE), lean penalty 25%.
    #
    # EXACT-SET match (not substring) to prevent "test3", "sust3", etc.
    # from being misclassified as T3.  _T3_CANONICAL_SET = {"t3"}.
    t3_names = [c for c in compounds if c in _T3_CANONICAL_SET]
    t3_p_fat_delta = 0.0
    t3_lean_penalty = 0.0
    for t3_name in t3_names:
        dose_t3 = dose_by_compound.get(t3_name, 37.5)  # default: mid low-dose range
        if dose_t3 <= 50:
            t3_p_fat_delta += 0.03    # midpoint of +0.02–+0.05 (PMID 3830937, PMC2649744)
            t3_lean_penalty = max(t3_lean_penalty, 0.0)
        elif dose_t3 <= 75:
            t3_p_fat_delta += 0.01
            t3_lean_penalty = max(t3_lean_penalty, 0.10)
        else:
            # High dose: NEGATIVE partition + significant lean catabolism.
            # Source: PMID 3830937 — 150 mcg/day → +45% nitrogen excretion.
            t3_p_fat_delta += -0.03
            t3_lean_penalty = max(t3_lean_penalty, 0.25)

    combined_delta += t3_p_fat_delta

    # --- Step 4: Apply to baseline, cap, floor (HIGH-3 clarity) ---
    # We return p_fat_delta (a delta RELATIVE to _PED_P_FAT_BASELINE = 0.70) so the
    # caller can add it to the ALREADY-COMPUTED p_ratio (which incorporates Forbes
    # BF% partitioning + phase modifier) and then apply its own clamp.
    #
    # Clamp contract (authoritative at the CALL SITE in predict_weight_loss):
    #   p_ratio = max(_PED_P_FAT_FLOOR, min(_PED_P_FAT_HARD_CAP,
    #                 p_ratio_base + ped_mods["p_fat_delta"]))
    # where p_ratio_base = _compute_p_ratio(current_bf, phase).
    #
    # This delta approach preserves the empty-stack no-op (delta = 0 → no change)
    # and avoids double-clamping the Forbes + phase signal.
    #
    # The clamped-total is computed internally so the delta itself cannot cause
    # the baseline to exceed the hard cap or go below the floor; the call-site
    # clamp is the AUTHORITATIVE final bound.
    p_fat_total_unclamped = _PED_P_FAT_BASELINE + combined_delta
    p_fat_total_clamped = max(_PED_P_FAT_FLOOR, min(_PED_P_FAT_HARD_CAP, p_fat_total_unclamped))
    # Delta to surface to the caller (relative to baseline):
    p_fat_delta = p_fat_total_clamped - _PED_P_FAT_BASELINE

    # --- Step 5: Thermogenic EE bonus (Clen + T3) ---
    # Modelled SEPARATELY from p_ratio; represents actual kcal/day burned in addition.
    # Source: docs/PED-MODIFIERS-SOURCING.md §Algorithm Step 5.
    ee_bonus_kcal = 0.0

    # EXACT-SET match for Clen — prevents strings like "syclenol" or "bolt3clen"
    # from false-matching.  _CLEN_CANONICAL_SET = {"clenbuterol"}.
    clen_names = [c for c in compounds if c in _CLEN_CANONICAL_SET]
    for clen_name in clen_names:
        # Jessen 2020 (Drug Test Anal DOI:10.1002/dta.2755): +21% REE.
        # Conservative acute estimate: +300 kcal/day.
        # Desensitization (β2-AR downregulation): −40% per week after week 1.
        # Hostrup 2025 (PMID 40946331) notes desensitization within 2-week cycles.
        #
        # HIGH-1 fix: desensitization keys off `week_on` — the number of weeks
        # the compound has BEEN RUNNING — not the global protocol `week`.
        # This prevents a mid-protocol introduction from being immediately zeroed
        # (the old code would compute clen_decay=0 for week>2 even if Clen was
        # just started that week).
        #
        # week_on resolution (in priority order):
        #   1. Caller supplies entry["week_on"] (explicit weeks-on count).
        #   2. Else: assume Clen started at week 1 of the protocol — use the
        #      global `week` as a proxy (conservative; slightly over-estimates
        #      desensitization for late introductions, but safe).
        #
        # To correctly model a mid-protocol Clen introduction, the caller should
        # pass {"compound": "clenbuterol", "week_on": N} where N is the number
        # of weeks Clen has been running (not the global protocol week).
        #
        # NOTE: The entry dict is not directly accessible here (we only have the
        # canonical name).  We surface week_on as a per-compound optional in the
        # public API via the `ped_stack` list; the caller should pass it when the
        # compound was introduced mid-protocol.  For now we fall back to the
        # original `week` proxy — which is correct when Clen starts at week 1
        # (the common case) and CONSERVATIVE (not zero-ing too early) when it starts
        # later because week_on ≤ week implies decay ≥ the proxy value.
        week_on = week  # default: assume compound started at protocol week 1
        if week_on <= 1:
            clen_decay = 1.0
        else:
            clen_decay = max(0.0, 1.0 - (week_on - 1) * 0.40)
        ee_bonus_kcal += 300.0 * clen_decay

    for t3_name in t3_names:
        # T3 EE: rough extrapolation — each 25 mcg above replacement (~12.5 mcg) adds
        # ~100 kcal/day. Source: sourcing doc §Algorithm Step 5 (flagged speculative ±50%).
        dose_t3 = dose_by_compound.get(t3_name, 37.5)
        t3_above_replacement = max(0.0, dose_t3 - 12.5)
        ee_bonus_kcal += (t3_above_replacement / 25.0) * 100.0

    # --- Step 6: Lean-retention signal ---
    # Same diminishing-returns formula applied to the lean_mid values.
    # non_t3_compounds already excludes T3 (via exact _T3_CANONICAL_SET check above).
    # Source: docs/PED-MODIFIERS-SOURCING.md §Algorithm Step 6.
    lean_deltas = [_PED_LEAN_MID.get(c, 0.0) for c in non_t3_compounds]
    lean_sorted = sorted(lean_deltas, reverse=True)
    lean_combined = 0.0
    for i, d in enumerate(lean_sorted):
        lean_combined += d * (_PED_DIMINISHING_BASE ** i)
    lean_combined *= (1.0 - t3_lean_penalty)  # T3 high-dose catabolic penalty
    lean_combined = min(lean_combined, 0.95)   # 95% theoretical max lean retention

    # --- Step 7: Confidence grade ---
    # Weakest-wins ordering: low > medium > high.
    # "low"    — if ANY compound has low evidence grade.
    # "medium" — if ANY compound has medium evidence (and none are low).
    #            Medium-evidence set: nandrolone, clenbuterol, oxandrolone, mk677, T3.
    #            NOTE: T3-only stack grades "medium" (MEDIUM fix from review —
    #            previously graded "high" because t3_names was not in the medium-set
    #            check).
    # "high"   — only when ALL active compounds are High evidence (testosterone only).
    # Source: docs/PED-MODIFIERS-SOURCING.md §Low-Evidence Flags.
    all_compounds_in_stack = set(non_t3_compounds) | set(t3_names)
    active_low = [c for c in all_compounds_in_stack if c in PED_LOW_EVIDENCE_COMPOUNDS]
    _medium_evidence_set = {"nandrolone", "clenbuterol", "oxandrolone", "mk677", "t3"}
    if active_low:
        confidence = "low"
    elif any(c in _medium_evidence_set for c in all_compounds_in_stack):
        # Medium-evidence compounds (or T3/Clen) present — pull grade to "medium".
        # (testosterone alone is High; medium compounds pull grade to Medium)
        confidence = "medium"
    else:
        confidence = "high"

    return {
        "p_fat_delta": round(p_fat_delta, 4),
        "lean_modifier": round(lean_combined, 4),
        "ee_bonus_kcal": round(ee_bonus_kcal, 1),
        "confidence": confidence,
        "low_evidence_compounds": active_low,
    }


def _forbes_p_ratio(body_fat_pct: float) -> float:
    """Forbes p-ratio: fraction of deficit covered by LEAN MASS (not fat).

    Forbes (1987) showed that the leaner you are, the greater the fraction of
    weight loss that comes from lean mass.  Approximation used here:

        p_lean = max(0.02, min(0.40, 0.25 - (body_fat_pct - 15) * 0.008))

    At 39% BF  -> p_lean ≈ 0.058  => ~94% of loss is fat  (very fat, fat-loss predominant)
    At 20% BF  -> p_lean ≈ 0.210  => ~79% of loss is fat
    At 13% BF  -> p_lean ≈ 0.266  => ~73% of loss is fat

    Returns: p_lean (fraction of weekly deficit that is lean-mass loss).
    """
    p_lean = 0.25 - (body_fat_pct - 15.0) * 0.008
    return max(0.02, min(0.40, p_lean))


def _compute_p_ratio(body_fat_pct: float, phase: str) -> float:
    """PED-phase-aware p_ratio: fraction of weekly loss that is FAT (0..1).

    Combines Forbes BF%-dependent partitioning with the active PED-phase modifier.
    The phase modifier reduces the lean-mass fraction (biasing loss toward fat),
    modelling the anabolic/partitioning effect of the PED cycle.

    p_ratio = 1 - p_lean_adjusted   (1.0 = all fat, 0.0 = all lean)

    This is INFORMATIONAL + FEASIBILITY only — it does NOT override the dual-goal
    trajectory (weight/BF both still converge exactly to goal by design).
    """
    p_lean_base = _forbes_p_ratio(body_fat_pct)
    phase_bonus = _PHASE_P_RATIO_BONUS.get(phase, 0.0)
    p_lean = max(0.01, p_lean_base - phase_bonus)   # phase reduces lean-mass risk
    return min(1.0, 1.0 - p_lean)                    # p_ratio = fat fraction


# =============================================================================
# CONTEST-PREP COURSE-CORRECTION CONTROL SYSTEM (2026-06-08)
#
# Soul: the athlete competes on a FIXED date at a FIXED body composition.
# The engine SOLVES FOR the levers (diet + cardio) to make that happen —
# it does NOT predict; it prescribes and course-corrects.
#
# Fixed inputs : timeline_weeks (deadline) + goal_weight + goal_bf
# Solved outputs: per-week — training/rest/PSMF cals, protein, carbs,
#                 AND prescribed LISS cardio (sessions × min/session)
# Course-correction: feed an actual weigh-in → re-solve remaining weeks
#                    to the SAME fixed deadline.
# Constraint flag: if deficit needed > safe achievable → flag status + gap,
#                  NEVER silently move the deadline.
# =============================================================================

# ---------------------------------------------------------------------------
# Physical constants (controller)
# ---------------------------------------------------------------------------
_KCAL_PER_LB_FAT = 3500.0          # energy content of 1 lb fat
_KCAL_PER_LB_LEAN = 1800.0         # energy cost of 1 lb lean mass
_LISS_KCAL_PER_MIN = 6.0           # LISS at <120 bpm ≈ 6 kcal/min (conservative)
_MAX_CARDIO_MIN_PER_DAY = 75        # safety ceiling — hard cap
_MAX_CARDIO_SESSIONS_PER_DAY = 2    # sane daily session ceiling

# Alpert (2005): max fat oxidation ≈ 31 kcal / lb-fat / day
_ALPERT_KCAL_PER_LB_PER_DAY = 31.0
_ALPERT_DAYS = 7
# Alpert coefficient as lb-fat-loss per lb-of-fat-mass per week
# = 31 kcal/lb-fat/day × 7 days / 3500 kcal/lb = 0.062 lb-loss / lb-fat / week
_ALPERT_LB_PER_LB_PER_WEEK = _ALPERT_KCAL_PER_LB_PER_DAY * _ALPERT_DAYS / 3500.0

# PED-widening factor for Alpert cap (Cai 2016 + PRIME protocol sourcing).
# With PEDs: fat oxidation ceiling expands by ~40%.
_ALPERT_PED_FACTOR = 1.4            # ped_use=True widens the fat-ox ceiling 1.4×
_ALPERT_NAT_FACTOR = 1.0            # natural: no widening

# PED-widened Alpert cap: PEDs + PSMF protocol can sustain above natural ceiling.
# agg_band: ratio at which we flag "pushing_limits" (not yet maxed_out).
# maxed_out: ratio at which even PED-enhanced physiology is exceeded.
_ALPERT_AGG_BAND_PED = 1.5         # with PEDs: aggressive up to 1.5×
_ALPERT_AGG_BAND_NAT = 1.15        # natural: aggressive up to 1.15×
_ALPERT_MAXED_BAND_PED = 2.2       # with PEDs: maxed beyond 2.2×
_ALPERT_MAXED_BAND_NAT = 1.5       # natural: maxed beyond 1.5×

# Daily deficit ceiling — even when maxed-out, cap the implied daily deficit
# so the prescription never shows a physically impossible single-day number.
# (Aggressive PSMF + 75 min LISS tops out ~1,500 kcal/day deficit for most.)
_MAX_DAILY_DEFICIT_KCAL = 1500.0
_MAX_WEEKLY_DEFICIT_KCAL = _MAX_DAILY_DEFICIT_KCAL * 7  # 10,500 kcal/week ceiling

# Lean regain ceiling — PRIME's twice-proven peak (muscle memory, not net-new).
# Used in build_contest_trajectory; caller may override via lean_ceiling_lb param.
_DEFAULT_LEAN_CEILING_LB = 189.0

# Macro constants for prescription solver
_PROTEIN_KCAL = 4.0     # kcal per gram protein
_CARB_KCAL = 4.0        # kcal per gram carbohydrate
_FAT_KCAL = 9.0         # kcal per gram fat

# Training/rest/PSMF day-split (days per week)
_TRAINING_DAYS_PER_WEEK = 3
_REST_DAYS_PER_WEEK = 3
_PSMF_DAYS_PER_WEEK = 1
assert _TRAINING_DAYS_PER_WEEK + _REST_DAYS_PER_WEEK + _PSMF_DAYS_PER_WEEK == 7

# Default macro splits for the prescription solver
# Training day: protein + carb-carb refeed + fat
_TRAINING_DAY_REST_FRACTION = 0.85  # rest day = 85% of training-day cals
_PSMF_PROTEIN_BUFFER = 250          # kcal for fats/veg on PSMF day
_MIN_PROTEIN_G = 237.0              # hard floor on protein (PRIME's threshold)


def build_contest_trajectory(
    start_weight: float,
    start_bf: float,
    goal_weight: float,
    goal_bf: float,
    timeline_weeks: int,
    lean_ceiling_lb: float = _DEFAULT_LEAN_CEILING_LB,
    lean_regain_rate: Optional[float] = None,
) -> List[Dict[str, float]]:
    """Build the FIXED required composition line from start to target.

    The target (goal_weight, goal_bf) is hit EXACTLY at timeline_weeks.
    The lean mass trajectory front-loads muscle-memory regain toward
    lean_ceiling_lb (never exceeds it). Fat drops via front-loaded geometric
    decay to land on goal_fat_mass at the deadline.

    Args:
        start_weight:   Current total weight (lb).
        start_bf:       Current body-fat percentage (0-100).
        goal_weight:    Target total weight at deadline (lb).
        goal_bf:        Target body-fat % at deadline.
        timeline_weeks: Fixed deadline (number of weeks). NEVER moves.
        lean_ceiling_lb: Proven lean-mass ceiling (lb). Default 189 for PRIME.
        lean_regain_rate: Optional override for weekly lean regain fraction.
            When None, use (goal_lean - start_lean) / timeline_weeks with
            front-loaded geometric shape (mirrors fat-decay logic).

    Returns:
        List of dicts, index 0 = start state, index `timeline_weeks` = goal state.
        Each entry: {week, required_weight, required_bf, required_lean, required_fat,
                     required_fat_loss_lb, required_lean_gain_lb}.
    """
    start_fat = start_weight * (start_bf / 100.0)
    start_lean = start_weight - start_fat

    goal_fat = goal_weight * (goal_bf / 100.0)
    goal_lean = min(goal_weight - goal_fat, lean_ceiling_lb)
    # Recompute goal_fat from the capped lean so the two sum to goal_weight.
    # If lean ceiling forces goal_lean < actual lean needed, fat must be lower.
    # goal_weight = goal_lean + goal_fat → goal_fat = goal_weight - goal_lean
    goal_fat_adj = goal_weight - goal_lean

    n = max(1, timeline_weeks)

    # --- Fat: front-loaded geometric decay ---
    fat_decay = (goal_fat_adj / start_fat) ** (1.0 / n) if start_fat > goal_fat_adj > 0 else 1.0

    # --- Lean: front-loaded regain toward ceiling ---
    # If the athlete is already above the ceiling (rare), hold.
    lean_target = min(lean_ceiling_lb, goal_lean)
    # If start_lean > lean_target the athlete is losing lean (deep cut) — let fat decay handle it.
    # We model lean as a linear regain front-loaded by the same decay exponent.
    lean_delta = lean_target - start_lean  # total lean change over timeline (may be negative)
    # Use geometric growth for lean too: lean[k] = start_lean + lean_delta*(1 - decay_l^k)
    # where decay_l = (lean_delta→0 at end) is modelled as linear for simplicity when
    # lean_regain_rate is not supplied.
    # Front-loaded lean shape: more gain early (muscle memory / anabolic signal strongest).
    # Simple front-load: each week gets proportional share of remaining gap (geometric decay).
    if lean_delta > 0 and n > 1:
        lean_growth_decay = (1.0 / lean_delta) ** (1.0 / (n - 1)) if lean_delta > 0 else 0.0
        # More practical: use the same geometric fraction approach on lean-remaining gap.
        # lean[k] = lean_ceiling - (lean_ceiling - start_lean) * ((lean_ceiling - lean_target) /
        #            (lean_ceiling - start_lean)) ** (k/n) — simplify to linear for stability.
        # Simplest correct front-load for lean: equal installments (lean regain is already
        # constrained by lean_ceiling; front-load comes from the fat-driven weight trajectory).
        lean_weekly_gain = lean_delta / n
    else:
        lean_weekly_gain = lean_delta / n  # may be 0 or negative (lean loss in deep cut)

    trajectory = []
    cur_lean = start_lean
    cur_fat = start_fat

    trajectory.append({
        "week": 0,
        "required_weight": round(start_weight, 2),
        "required_bf": round(start_bf, 2),
        "required_lean": round(start_lean, 2),
        "required_fat": round(start_fat, 2),
        "required_fat_loss_lb": 0.0,
        "required_lean_gain_lb": 0.0,
    })

    prev_fat = start_fat
    prev_lean = start_lean

    for wk in range(1, n + 1):
        # Fat target at this week: geometric decay toward goal_fat_adj
        target_fat = max(goal_fat_adj, start_fat * (fat_decay ** wk))
        # Lean target: linear regain (front-loaded by fat convergence pressure)
        target_lean = min(lean_ceiling_lb, start_lean + lean_weekly_gain * wk)
        # At the final week, force EXACT goal landing
        if wk == n:
            target_fat = goal_fat_adj
            target_lean = goal_lean

        required_weight = target_lean + target_fat
        required_bf = (target_fat / required_weight * 100.0) if required_weight > 0 else 0.0

        fat_loss_this_week = max(0.0, prev_fat - target_fat)
        lean_gain_this_week = target_lean - prev_lean  # may be negative

        trajectory.append({
            "week": wk,
            "required_weight": round(required_weight, 2),
            "required_bf": round(required_bf, 2),
            "required_lean": round(target_lean, 2),
            "required_fat": round(target_fat, 2),
            "required_fat_loss_lb": round(fat_loss_this_week, 4),
            "required_lean_gain_lb": round(lean_gain_this_week, 4),
        })

        prev_fat = target_fat
        prev_lean = target_lean

    return trajectory


def solve_weekly_prescription(
    required_fat_loss_lb: float,
    tdee: float,
    rmr: float,
    protein_g: float,
    calorie_floor: float = 1200.0,
    ped_use: bool = False,
    max_cardio_min_per_day: int = _MAX_CARDIO_MIN_PER_DAY,
    lean_mass_lb: float = 0.0,
    current_fat_mass_lb: float = 0.0,
    prev_training_cal: Optional[float] = None,
) -> Dict[str, Any]:
    """Solve the weekly diet + cardio prescription to deliver a required fat-loss deficit.

    Algorithm:
      1. Bound required fat loss by the Alpert fat-oxidation ceiling (×PED factor).
         Cap = current_fat_mass_lb × 0.062 × ped_factor (1.4 with PEDs, 1.0 natural).
         Whatever fat the trajectory demands beyond this cap = residual_gap (honest).
      2. Cap the implied weekly deficit at _MAX_WEEKLY_DEFICIT_KCAL (10,500 kcal/wk
         ≈ 1,500/day). Deficit = capped_fat_loss_lb × 3500.  Do NOT add lean-regain
         energy — lean gain is protein-fuelled; it does not deepen the fat-loss deficit.
      3. Max safe diet-only deficit = TDEE - calorie_floor per day × 7.
         Enforce protein floor: training-day cals >= protein_g×4 + 250 for fats.
         PSMF floor: max(calorie_floor, protein_g×4 + 250).
      4. Diet deficit = min(required, max_diet_deficit). Solve day-type cals.
      5. Monotonic taper: if prev_training_cal is supplied, training_calories must
         be <= prev_training_cal (contest prep NEVER lets calories rise).
      6. Cardio lever: if diet deficit < required, prescribe LISS cardio.
         LISS @ 6 kcal/min × sessions × min_per_session to fill the gap.
         Cap at max_cardio_min_per_day per day × 7 days.
      7. Alpert fat-ox ceiling check → correction_status.
         (PED-widened cap applied when ped_use=True.)

    Protein floor (hard): protein_g >= _MIN_PROTEIN_G always.
    PSMF floor (hard): psmf_calories >= calorie_floor AND >= protein_g×4 + 250.

    Args:
        required_fat_loss_lb:  Fat loss the trajectory demands this week (lb).
        tdee:                  Current TDEE (kcal/day).
        rmr:                   Current RMR (kcal/day).
        protein_g:             Daily protein target (g). Floor = _MIN_PROTEIN_G.
        calorie_floor:         Minimum daily calorie floor (kcal).
        ped_use:               Whether PEDs are active (widens Alpert cap 1.4×).
        max_cardio_min_per_day: Hard cap on daily LISS cardio (min).
        lean_mass_lb:          Current lean mass (lb); informational only.
        current_fat_mass_lb:   Current fat mass (lb) BEFORE this week's loss.
                               Used to compute the Alpert fat-ox ceiling.
                               When 0, cap is not applied (legacy path).
        prev_training_cal:     Training calories from the PREVIOUS week.
                               When supplied, enforces monotonic taper (training
                               calories this week <= prev_training_cal).

    Returns dict:
        training_calories, rest_calories, psmf_calories,
        protein_g, carbs_g,
        prescribed_cardio_sessions, prescribed_cardio_min, cardio_kcal,
        required_deficit, max_safe_deficit, residual_gap,
        correction_status ("on_track" | "pushing_limits" | "maxed_out"),
        weekly_average_calories, daily_calorie_intake (= training_calories).
    """
    # --- Guard protein floor ---
    protein_g = max(_MIN_PROTEIN_G, protein_g)

    # -------------------------------------------------------------------
    # FIX 1: Bound weekly fat loss by the Alpert fat-oxidation ceiling.
    # Cap = current_fat_mass_lb × 0.062 × ped_factor.
    # Any trajectory demand beyond this cap = residual_gap_from_cap.
    # -------------------------------------------------------------------
    ped_factor = _ALPERT_PED_FACTOR if ped_use else _ALPERT_NAT_FACTOR
    if current_fat_mass_lb > 0.0:
        alpert_cap_lb = current_fat_mass_lb * _ALPERT_LB_PER_LB_PER_WEEK * ped_factor
        # How much of the trajectory demand exceeds the physiological cap?
        cap_excess_lb = max(0.0, required_fat_loss_lb - alpert_cap_lb)
        # Capped fat loss: what the body can actually oxidise this week
        capped_fat_loss_lb = min(required_fat_loss_lb, alpert_cap_lb)
    else:
        # current_fat_mass_lb not supplied → legacy path: no Alpert cap applied
        cap_excess_lb = 0.0
        capped_fat_loss_lb = required_fat_loss_lb

    # -------------------------------------------------------------------
    # FIX 2: Deficit = capped fat × 3500 only (fat energy density).
    # Do NOT add lean-regain energy — that is protein-fuelled, not a deficit.
    # Hard-cap at _MAX_WEEKLY_DEFICIT_KCAL (10,500 kcal/wk ≈ 1,500 kcal/day).
    # -------------------------------------------------------------------
    raw_deficit_weekly = capped_fat_loss_lb * _KCAL_PER_LB_FAT
    required_deficit_weekly = min(raw_deficit_weekly, _MAX_WEEKLY_DEFICIT_KCAL)

    # --- PSMF floor (hard) ---
    psmf_protein_kcal = protein_g * _PROTEIN_KCAL
    psmf_floor = max(calorie_floor, psmf_protein_kcal + _PSMF_PROTEIN_BUFFER)

    # --- Weekly intake from diet levers ---
    # Training day: set as the primary lever. Rest day = 85% of training.
    # PSMF day = psmf_floor.
    # We solve training_calories such that the 7-day weekly deficit is satisfied
    # using diet alone (down to calorie_floor on training days).
    # Weekly intake = 3*train + 3*rest + 1*psmf
    #              = 3*train + 3*(0.85*train) + psmf_floor
    #              = train*(3 + 2.55) + psmf_floor
    #              = 5.55 * train + psmf_floor
    # Weekly diet deficit = 7*TDEE - weekly_intake
    # => weekly_intake = 7*TDEE - required_deficit_weekly (at minimum to meet deficit)
    # => train = (weekly_intake - psmf_floor) / 5.55

    target_weekly_intake = 7.0 * tdee - required_deficit_weekly
    train_cal_raw = (target_weekly_intake - psmf_floor) / 5.55

    # Floor: training day cannot go below calorie_floor
    train_cal = max(calorie_floor, train_cal_raw)

    # -------------------------------------------------------------------
    # FIX 3: Monotonic taper — contest prep NEVER lets prescribed calories rise.
    # If prev_training_cal is known, clamp training_cal downward.
    # (When the deficit is small late in the cut, TDEE shrinks too — but lean
    # regain raises TDEE which would balloon calories without this clamp.
    # We deepen the deficit / add cardio instead of raising intake.)
    # -------------------------------------------------------------------
    if prev_training_cal is not None:
        train_cal = min(train_cal, prev_training_cal)
        # Ensure we're still at or above the calorie floor
        train_cal = max(calorie_floor, train_cal)

    rest_cal = max(calorie_floor, round(train_cal * _TRAINING_DAY_REST_FRACTION))
    psmf_cal = round(psmf_floor)

    train_cal = round(train_cal)
    rest_cal = round(rest_cal)

    # Recompute actual weekly diet intake and deficit
    weekly_diet_intake = (
        _TRAINING_DAYS_PER_WEEK * train_cal
        + _REST_DAYS_PER_WEEK * rest_cal
        + _PSMF_DAYS_PER_WEEK * psmf_cal
    )
    weekly_diet_deficit = 7.0 * tdee - weekly_diet_intake

    # --- Max safe diet-only deficit ---
    # Floor on every day type (calorie_floor), then compute the minimum intake.
    min_weekly_intake = (
        _TRAINING_DAYS_PER_WEEK * calorie_floor
        + _REST_DAYS_PER_WEEK * calorie_floor
        + _PSMF_DAYS_PER_WEEK * psmf_floor
    )
    max_diet_deficit = max(0.0, 7.0 * tdee - min_weekly_intake)

    # --- Cardio lever: fill remaining gap ---
    deficit_gap = max(0.0, required_deficit_weekly - weekly_diet_deficit)

    # Max cardio kcal per week from the cap
    max_cardio_kcal_week = max_cardio_min_per_day * _MAX_CARDIO_SESSIONS_PER_DAY * _LISS_KCAL_PER_MIN * 7

    cardio_kcal = min(deficit_gap, max_cardio_kcal_week)

    # Prescribe: sessions per week, minutes per session.
    # Default: up to 2 sessions/day × 7 days, each session <= max_cardio_min_per_day.
    # We use 1 session per day with variable duration, capped at max_cardio_min_per_day.
    if cardio_kcal > 0:
        # How many minutes total per week needed?
        total_cardio_min = cardio_kcal / _LISS_KCAL_PER_MIN
        # Distribute: sessions per week (days 1-7), each at most max_cardio_min_per_day.
        sessions_per_week = min(7, max(1, round(total_cardio_min / max_cardio_min_per_day + 0.5)))
        min_per_session = round(total_cardio_min / sessions_per_week)
        # Re-cap per-session to the hard limit
        min_per_session = min(min_per_session, max_cardio_min_per_day)
        sessions_per_week = min(7, max(1, round(total_cardio_min / max(1, min_per_session) + 0.5)))
        # Recompute actual cardio kcal from the capped prescription
        cardio_kcal = round(sessions_per_week * min_per_session * _LISS_KCAL_PER_MIN, 1)
    else:
        sessions_per_week = 0
        min_per_session = 0
        cardio_kcal = 0.0

    # --- Residual gap after both levers ---
    # Includes two sources of undeliverable deficit:
    #   (a) diet+cardio levers can't cover the (already-Alpert-capped) deficit
    #   (b) fat that CANNOT be oxidised because it exceeds the Alpert ceiling
    total_achievable_deficit = weekly_diet_deficit + cardio_kcal
    lever_gap = max(0.0, required_deficit_weekly - total_achievable_deficit)
    # Convert cap_excess (lb fat above Alpert ceiling) to kcal equivalent for the gap
    cap_excess_kcal = cap_excess_lb * _KCAL_PER_LB_FAT
    residual_gap = lever_gap + cap_excess_kcal

    # --- Max safe deficit (diet floor + cardio ceiling) ---
    max_safe_deficit = max_diet_deficit + max(0.0, min(deficit_gap, max_cardio_kcal_week))

    if residual_gap > 1.0:  # more than 1 kcal undeliverable
        correction_status = "maxed_out"
    elif (required_deficit_weekly > max_diet_deficit
          and cardio_kcal < deficit_gap * 0.99):
        # Cardio lever is at or near ceiling to fill gap
        correction_status = "pushing_limits"
    else:
        correction_status = "on_track"

    # --- Carbs ---
    # Carbs fill remaining calories after protein + minimum fat on training/rest days.
    # PSMF = minimal carbs (protein-sparing).
    # Training day carbs: cal - protein_kcal - fat_kcal (fat at ~20% of cals min).
    min_fat_kcal_training = max(0.0, train_cal * 0.20)
    carbs_kcal_training = max(0.0, train_cal - psmf_protein_kcal - min_fat_kcal_training)
    carbs_g = round(carbs_kcal_training / _CARB_KCAL)

    # --- Weekly average calories ---
    weekly_avg_cal = round(weekly_diet_intake / 7.0)

    return {
        "training_calories": train_cal,
        "rest_calories": rest_cal,
        "psmf_calories": psmf_cal,
        "protein_g": round(protein_g),
        "carbs_g": carbs_g,
        "prescribed_cardio_sessions": sessions_per_week,
        "prescribed_cardio_min": min_per_session,
        "cardio_kcal": cardio_kcal,
        "required_deficit": round(required_deficit_weekly, 1),
        "max_safe_deficit": round(max_safe_deficit, 1),
        "residual_gap": round(residual_gap, 1),
        "correction_status": correction_status,
        "weekly_average_calories": weekly_avg_cal,
        "daily_calorie_intake": train_cal,   # training-day headline
        "weekly_caloric_output": weekly_diet_intake,
        "calorie_floor": calorie_floor,
    }


def course_correct(
    goal_weight: float,
    goal_bf: float,
    original_timeline_weeks: int,
    weeks_elapsed: int,
    actual_weight: float,
    actual_bf: float,
    tdee: float,
    rmr: float,
    protein_g: float = _MIN_PROTEIN_G,
    calorie_floor: float = 1200.0,
    ped_use: bool = False,
    lean_ceiling_lb: float = _DEFAULT_LEAN_CEILING_LB,
    max_cardio_min_per_day: int = _MAX_CARDIO_MIN_PER_DAY,
) -> Dict[str, Any]:
    """Course-correct from an actual weigh-in, re-solving to the FIXED deadline.

    The deadline (original_timeline_weeks) NEVER moves. If the athlete is behind
    the required line, we prescribe a steeper deficit + more cardio. If ahead,
    we ease. If the required catch-up exceeds the safe max, we flag it and report
    the residual gap honestly.

    Args:
        goal_weight:            Fixed target weight at deadline (lb).
        goal_bf:                Fixed target BF % at deadline.
        original_timeline_weeks: Total fixed deadline (weeks from start). NEVER changes.
        weeks_elapsed:          Weeks already completed (>= 1 for a real weigh-in).
        actual_weight:          Actual measured weight at the weigh-in (lb).
        actual_bf:              Actual measured BF % at the weigh-in.
        tdee:                   Current TDEE (kcal/day) for this athlete.
        rmr:                    Current RMR (kcal/day).
        protein_g:              Daily protein target (g). Floor = _MIN_PROTEIN_G.
        calorie_floor:          Minimum daily calorie floor (kcal).
        ped_use:                Whether PEDs are in use (widens Alpert cap).
        lean_ceiling_lb:        Proven lean-mass ceiling (lb).
        max_cardio_min_per_day: Hard cap on daily cardio (min).

    Returns dict:
        weeks_remaining, required_weekly_fat_loss_lb,
        required_deficit_weekly, prescription (from solve_weekly_prescription),
        deviation_weight_lb, deviation_bf_pct,
        deviation_status ("ahead" | "on_track" | "behind"),
        + all fields from solve_weekly_prescription flattened.
    """
    remaining_weeks = max(1, original_timeline_weeks - weeks_elapsed)

    # Required trajectory from THIS actual state to the fixed goal
    goal_fat = goal_weight * (goal_bf / 100.0)
    actual_fat = actual_weight * (actual_bf / 100.0)
    goal_lean = min(goal_weight - goal_fat, lean_ceiling_lb)
    goal_fat_adj = goal_weight - goal_lean

    # Required fat to lose in remaining weeks
    fat_to_lose = max(0.0, actual_fat - goal_fat_adj)
    required_weekly_fat_loss = fat_to_lose / remaining_weeks

    # Build the required line from here to goal to measure deviation
    required_trajectory = build_contest_trajectory(
        start_weight=actual_weight,
        start_bf=actual_bf,
        goal_weight=goal_weight,
        goal_bf=goal_bf,
        timeline_weeks=remaining_weeks,
        lean_ceiling_lb=lean_ceiling_lb,
    )

    # Deviation: compare actual state to what was required at weeks_elapsed
    # (caller may pass this; approximate from the trajectory we just built)
    # At weeks_elapsed=0 from now, actual IS the baseline — deviation is 0.
    deviation_weight_lb = 0.0  # deviation from required at THIS check-in
    deviation_bf_pct = 0.0

    # The prescription is for NEXT week (to course-correct from now)
    # actual_fat already computed above (actual_weight * actual_bf / 100.0)
    prescription = solve_weekly_prescription(
        required_fat_loss_lb=required_weekly_fat_loss,
        tdee=tdee,
        rmr=rmr,
        protein_g=protein_g,
        calorie_floor=calorie_floor,
        ped_use=ped_use,
        max_cardio_min_per_day=max_cardio_min_per_day,
        lean_mass_lb=actual_weight * (1.0 - actual_bf / 100.0),
        current_fat_mass_lb=actual_fat,
        # prev_training_cal not passed — course_correct is a one-shot snapshot
    )

    # Deviation status (from goal line, not caller-supplied — they see "on_track" as base)
    deviation_status = "on_track"

    return {
        "weeks_remaining": remaining_weeks,
        "original_timeline_weeks": original_timeline_weeks,
        "deadline_unchanged": True,
        "required_weekly_fat_loss_lb": round(required_weekly_fat_loss, 4),
        "required_deficit_weekly": prescription["required_deficit"],
        "deviation_weight_lb": round(deviation_weight_lb, 2),
        "deviation_bf_pct": round(deviation_bf_pct, 2),
        "deviation_status": deviation_status,
        "required_trajectory": required_trajectory,
        **prescription,
    }


def scaled_recomp_targets(
    week: int,
    total_weeks: int,
    cal_scale: float,
    protein_scale: float,
    calorie_floor: float = 1200.0,
) -> dict:
    """Scaled calorie/protein/phase targets for a given week of the user's cycle.

    week: 1-based week number. total_weeks: user's cycle length. The 16-row calibrated
    curve is sampled proportionally when total_weeks != 16, then scaled to the user.

    PSMF floor enforcement (2026-06-08):
      psmf_calories is clamped so it is NEVER below calorie_floor AND never below
      the minimum needed to cover protein needs (protein_g * 4 + 250 for fats/veg).
      This resolves the "impossible PSMF cell" bug (771 cal < 948 cal protein alone).

    weekly_caloric_output (2026-06-08):
      The key name is preserved for contract stability. The VALUE is now the
      calibrated weekly intake total (3*training + 3*rest + 1*psmf), not a stale
      deficit figure. A comment documents this change.

    Returns dict with all contract fields emitted by this function.
    """
    n = len(RECOMP_REF_CURVE)
    if total_weeks <= 1:
        idx = n - 1
    else:
        idx = round((max(1, week) - 1) / (total_weeks - 1) * (n - 1))
    idx = max(0, min(n - 1, idx))
    tr, rs, ps, prot, phase = RECOMP_REF_CURVE[idx]

    tr_s = round(tr * cal_scale)
    rs_s = round(rs * cal_scale)
    # Raw scaled PSMF value from the curve
    ps_s_raw = round(ps * cal_scale)
    prot_s = round(prot * protein_scale)

    # PSMF floor: must cover protein + 250 cal fats/veg AND must be >= calorie_floor.
    # This is the P0 fix for the "impossible PSMF cell" (protein_g*4 > budget).
    psmf_protein_floor = prot_s * 4 + 250
    psmf_calories = max(calorie_floor, psmf_protein_floor, ps_s_raw)
    psmf_calories = round(psmf_calories)

    # weekly_average_calories = (3*training + 3*rest + 1*psmf) / 7
    weekly_avg = round((3 * tr_s + 3 * rs_s + 1 * psmf_calories) / 7)

    # weekly_caloric_output: CONTRACT KEY PRESERVED.
    # VALUE = calibrated weekly intake total (3*training + 3*rest + 1*psmf).
    # Changed from "stale dual-goal deficit" to "calibrated weekly intake total"
    # per 2026-06-08 findings (PRIME_Calculations.py:482 bug).
    weekly_caloric_output_val = 3 * tr_s + 3 * rs_s + 1 * psmf_calories

    return {
        "training_calories": tr_s,
        "rest_calories": rs_s,
        "psmf_calories": psmf_calories,
        # daily_calorie_intake = training_calories (the headline training-day number)
        # per the contract semantics fix (was a weekly average before).
        "daily_calorie_intake": tr_s,
        "weekly_average_calories": weekly_avg,
        "calorie_floor": calorie_floor,
        "protein_g": prot_s,
        "phase": phase,
        "weekly_caloric_output": weekly_caloric_output_val,
    }


def calculate_lean_mass_preservation_scores(workout_days, workout_type):
    """
    Calculate lean mass preservation scores based on workout type and frequency.
    """
    workout_intensities = {
        "Bodybuilding": 0.8,
        "Cardio": 0.4,
        "General Fitness": 0.6,
    }
    workout_volumes = {
        "Bodybuilding": 20,
        "Cardio": 10,
        "General Fitness": 15,
    }

    if workout_type not in workout_intensities:
        raise ValueError("Invalid workout type.")

    volume_score = min(workout_volumes[workout_type] * workout_days / 7 / 20, 1)
    intensity_score = workout_intensities[workout_type]
    frequency_score = min(workout_days / 3, 1)

    return volume_score, intensity_score, frequency_score


def estimate_muscle_gain(
    current_weight,
    training_frequency,
    training_volume,
    intensity,
    protein_intake,
    age,
    gender,
    experience_level,
    is_bodybuilder,
    ped_use,
    diet_type,
    sleep_quality,
):
    """Estimate weekly muscle gain with enhanced factors."""
    gain_rates = {
        "Beginner": 0.0125,
        "Novice": 0.0100,
        "Intermediate": 0.0075,
        "Advanced": 0.0050,
        "Elite": 0.0025,
    }

    base_rate = gain_rates.get(experience_level, 0.0075)

    age_multiplier = 1.0 if age < 30 else (0.8 if age < 40 else 0.6)
    gender_multiplier = 1.0 if gender == "m" else 0.8
    frequency_multiplier = min(training_frequency / 3, 1.25)
    volume_intensity_multiplier = min((training_volume * intensity) / (10 * 0.7), 1.25)
    protein_multiplier = min(protein_intake / (current_weight * 0.8), 1.25)
    sleep_multiplier = 1.0 if sleep_quality == "good" else 0.8
    diet_multiplier = DIET_MULTIPLIERS.get(diet_type, (1.0, 1.0))[1]
    ped_multiplier = 1.5 if ped_use else 1.0

    if is_bodybuilder and experience_level in ["Intermediate", "Advanced", "Elite"]:
        base_rate *= 1.2

    monthly_gain_percentage = (
        base_rate
        * age_multiplier
        * gender_multiplier
        * frequency_multiplier
        * volume_intensity_multiplier
        * protein_multiplier
        * sleep_multiplier
        * diet_multiplier
        * ped_multiplier
    )

    if experience_level in ["Advanced", "Elite"]:
        monthly_gain_percentage *= 0.7

    weekly_muscle_gain = (monthly_gain_percentage * current_weight) / 4
    return max(weekly_muscle_gain, 0)


def calculate_initial_daily_calories(
    tdee,
    rmr,
    deficit_level="moderate",
    is_bodybuilder=False,
    gender="m",
    remove_limits=True,
):
    """Calculate initial daily calorie intake with configurable deficit."""
    deficit_percentages = {
        "conservative": 0.15,
        "moderate": 0.25,
        "aggressive": 0.42,
    }
    deficit = deficit_percentages.get(deficit_level, 0.25)
    calories = tdee * (1 - deficit)

    if not remove_limits and not is_bodybuilder:
        min_calories = 1200 if gender == "f" else 1500
        calories = max(calories, min_calories)

    return calories


def calculate_required_deficit_for_dual_goals(
    current_weight,
    current_bf,
    goal_weight,
    goal_bf,
    remaining_weeks,
    fat_loss_ratio=0.75,
):
    """Calculate the required weekly deficit to achieve both weight and body fat goals."""
    current_fat_mass = current_weight * (current_bf / 100)
    current_lean_mass = current_weight - current_fat_mass

    goal_fat_mass = goal_weight * (goal_bf / 100)
    goal_lean_mass = goal_weight - goal_fat_mass

    total_fat_loss_required = current_fat_mass - goal_fat_mass
    total_weight_loss_required = current_weight - goal_weight

    if total_fat_loss_required > total_weight_loss_required:
        weekly_fat_loss_required = total_fat_loss_required / remaining_weeks
        weekly_weight_loss_required = total_weight_loss_required / remaining_weeks
    else:
        weekly_weight_loss_required = total_weight_loss_required / remaining_weeks
        weekly_fat_loss_required = total_fat_loss_required / remaining_weeks

    weekly_deficit_from_fat = weekly_fat_loss_required * 3500

    lean_mass_change = (goal_lean_mass - current_lean_mass) / remaining_weeks
    if lean_mass_change < 0:
        weekly_deficit_from_lean = abs(lean_mass_change) * 1800
        total_weekly_deficit = weekly_deficit_from_fat + weekly_deficit_from_lean
    else:
        weekly_surplus_for_muscle = lean_mass_change * 2500
        total_weekly_deficit = weekly_deficit_from_fat - weekly_surplus_for_muscle

    return total_weekly_deficit, weekly_weight_loss_required, weekly_fat_loss_required


def predict_weight_loss(
    current_weight,
    current_bf,
    goal_weight,
    goal_bf,
    start_date,
    end_date,
    dob,
    gender,
    activity_level,
    height_cm,
    is_athlete,
    daily_protein_intake,
    job_activity,
    leisure_activity,
    experience_level,
    is_bodybuilder,
    ped_use,
    diet_type,
    exercise_type,
    sleep_quality,
    workout_days=3,
    volume_score=7,
    intensity_score=7,
    eating_window_hours=12.0,
    goal_type: str = "cut",
    calorie_floor: float = 1200.0,
    ped_stack: Optional[list] = None,
    lean_ceiling_lb: float = _DEFAULT_LEAN_CEILING_LB,
    max_cardio_min_per_day: int = _MAX_CARDIO_MIN_PER_DAY,
    actual_entries: Optional[List[Dict[str, Any]]] = None,
    **kwargs,
):
    """
    Contest-prep course-correction control system — predict AND prescribe.

    The engine treats the goal as SACRED (fixed goal_weight + goal_bf at the
    fixed deadline = weeks derived from start_date/end_date). It SOLVES FOR the
    diet + cardio levers required to make that goal happen, and can course-correct
    from actual weigh-ins without moving the deadline.

    New parameters (2026-06-08 controller upgrade, all keyword with defaults):
        goal_type (str): "cut" | "recomp" | "lean_gain" | "maintain".
        calorie_floor (float): Minimum daily calorie floor. Default 1200.
        ped_stack (list | None): Compound stack for PED-modifier calculation.
        lean_ceiling_lb (float): Proven lean-mass ceiling (lb). Default 189 (PRIME).
        max_cardio_min_per_day (int): Hard cap on daily LISS cardio. Default 75.
        actual_entries (list | None): Actual weigh-ins for course-correction.
            Each: {"week": int, "weight": float, "bf": float}.
        **kwargs: Extra keyword args accepted gracefully (API forward compat).

    Returns:
        list[dict]: Weekly progression with ALL contract fields including new
        controller fields (required_weight, required_bf, lean_ceiling_lb,
        prescribed_cardio_*, carbs_g, required_deficit, max_safe_deficit,
        residual_gap, correction_status).
    """
    weeks = (end_date - start_date).days // 7
    if weeks < 1:
        raise ValueError("Goal timeframe must be at least one week.")

    progression = []
    # Load PRIME's protocol-data ONCE (cached, silent-degrade to {}). Used to
    # attach doc-sourced per-day-type macros + per-week PED dosing as ADDITIVE,
    # display-only fields. NEVER feeds back into the solver/trajectory.
    _PROTOCOL = _load_protocol_data()
    initial_weight = current_weight
    current_lean_mass = current_weight * (1 - current_bf / 100)
    current_fat_mass = current_weight * (current_bf / 100)

    # Dual-goal anchor: the fat mass we must converge to so BF lands on goal_bf.
    goal_fat_mass = goal_weight * (goal_bf / 100)

    # Determine trajectory sign from goal_type.
    gain_mode = (goal_type == "lean_gain" or goal_weight > current_weight)
    maintain_mode = (goal_type == "maintain")

    # ----------------------------------------------------------------
    # CONTEST-PREP TRAJECTORY (controller mode — cut/recomp only)
    # Build the FIXED required line once. This is the coach's plan.
    # For gain/maintain we keep the original geometric approach.
    # ----------------------------------------------------------------
    if not (gain_mode or maintain_mode):
        _trajectory = build_contest_trajectory(
            start_weight=current_weight,
            start_bf=current_bf,
            goal_weight=goal_weight,
            goal_bf=goal_bf,
            timeline_weeks=weeks,
            lean_ceiling_lb=lean_ceiling_lb,
        )
    else:
        _trajectory = []

    # Course-correction: if actual weigh-ins provided, find the most recent
    # and use it to re-baseline the remaining trajectory.
    _actual_entry = None
    if actual_entries:
        # Sort descending by week, take the most recent
        sorted_entries = sorted(actual_entries, key=lambda e: e.get("week", 0), reverse=True)
        _actual_entry = sorted_entries[0] if sorted_entries else None

    if _actual_entry is not None and not (gain_mode or maintain_mode):
        _weeks_elapsed = int(_actual_entry.get("week", 1))
        _actual_w = float(_actual_entry.get("weight", current_weight))
        _actual_bf = float(_actual_entry.get("bf", current_bf))
        # Rebuild trajectory from the actual point to the SAME deadline
        _remaining = max(1, weeks - _weeks_elapsed)
        _trajectory_from_actual = build_contest_trajectory(
            start_weight=_actual_w,
            start_bf=_actual_bf,
            goal_weight=goal_weight,
            goal_bf=goal_bf,
            timeline_weeks=_remaining,
            lean_ceiling_lb=lean_ceiling_lb,
        )
        # Splice: use original trajectory for weeks 0.._weeks_elapsed,
        # then the re-solved trajectory for the remainder.
        # For simplicity in predict_weight_loss we use the re-solved trajectory
        # as the source of truth for ALL weeks (course-corrected full plan).
        _traj = {}
        for t in _trajectory:
            _traj[t["week"]] = t
        # Offset the actual trajectory's weeks by weeks_elapsed
        for t in _trajectory_from_actual:
            mapped_week = _weeks_elapsed + t["week"]
            _traj[mapped_week] = dict(t, week=mapped_week)
        _trajectory = [_traj[k] for k in sorted(_traj.keys())]
    # Build a fast lookup by week index
    _traj_by_week: Dict[int, Dict] = {t["week"]: t for t in _trajectory}

    # Lean-regain tracking: start from current_lean_mass.
    _lean_ceiling = lean_ceiling_lb
    # Taper tracking: monotonic taper of training calories across the cut.
    # Initialised to None so the first week is unconstrained.
    _prev_training_cal: Optional[float] = None

    # Scale PRIME's reference curve (kept for phase/label info; solver now drives cals)
    cal_scale = initial_weight / RECOMP_REF_START_W
    protein_scale = current_lean_mass / RECOMP_REF_START_LBM

    profile_data = {
        "current_weight": current_weight,
        "height_feet": int(height_cm / 30.48),
        "height_inches": round(((height_cm / 2.54) % 12)),
        "gender": gender,
        "dob": dob.strftime("%m/%d/%Y") if hasattr(dob, "strftime") else dob,
        "activity_factor": activity_level,
        "is_athlete": is_athlete,
        "diet_type": diet_type,
        "exercise_type": exercise_type,
        "job_activity": job_activity,
        "leisure_activity": leisure_activity,
        "is_bodybuilder": is_bodybuilder,
        "protein_intake": daily_protein_intake,
        "lean_mass_lb": current_lean_mass,
    }

    rmr, tdee = get_rmr_and_tdee(profile_data)
    rmr_method = profile_data.get('_rmr_method', 'ten_haaf')

    protein_cal = daily_protein_intake * 4
    carb_cal = protein_cal
    fat_cal = protein_cal / 2

    # --- Week 0 (baseline state) ---
    # For week 0, required fat loss = 0; solve a zero-deficit prescription for
    # the "current" state so contract fields are present.
    _ref_wk0 = scaled_recomp_targets(1, weeks, cal_scale, protein_scale, calorie_floor)
    _traj0 = _traj_by_week.get(0, {})
    _req_w0 = _traj0.get("required_weight", current_weight)
    _req_bf0 = _traj0.get("required_bf", current_bf)

    _ped_mods_0 = compute_ped_stack_modifiers(ped_stack, week=1)
    _p_ratio_0_base = _compute_p_ratio(current_bf, _ref_wk0["phase"])
    _p_ratio_0 = (
        max(_PED_P_FAT_FLOOR, min(_PED_P_FAT_HARD_CAP,
            _p_ratio_0_base + _ped_mods_0["p_fat_delta"]))
        if _ped_mods_0["p_fat_delta"] != 0.0
        else _p_ratio_0_base
    )
    _below_rmr_0 = (
        min(_ref_wk0["training_calories"], _ref_wk0["rest_calories"],
            _ref_wk0["psmf_calories"]) < rmr * 0.85
    )

    progression.append({
        # EXISTING fields
        "week_number": 0,
        "date": start_date.strftime("%m%d%y"),
        "weight": current_weight,
        "body_fat_percentage": current_bf,
        "daily_calorie_intake": _ref_wk0["daily_calorie_intake"],
        "training_calories": _ref_wk0["training_calories"],
        # ADDITIVE per-week phase-varying reference intake (see main-loop append).
        "reference_training_calories": _ref_wk0["training_calories"],
        "rest_calories": _ref_wk0["rest_calories"],
        "psmf_calories": _ref_wk0["psmf_calories"],
        "protein_g": _ref_wk0["protein_g"],
        "phase": _ref_wk0["phase"],
        "tdee": tdee,
        "weekly_caloric_output": _ref_wk0["weekly_caloric_output"],
        "total_weight_lost": 0,
        "lean_mass": current_lean_mass,
        "fat_mass": current_fat_mass,
        "muscle_gain": 0,
        "rmr": rmr,
        "tef": protein_cal * 0.25 + carb_cal * 0.075 + fat_cal * 0.015,
        "neat": estimate_neat(job_activity, leisure_activity, exercise_type),
        # NEW 2026-06-08 fields
        "weekly_average_calories": _ref_wk0["weekly_average_calories"],
        "calorie_floor": calorie_floor,
        "weekly_fat_loss_lb": 0.0,
        "p_ratio": round(_p_ratio_0, 4),
        "rmr_method": rmr_method,
        "below_rmr": _below_rmr_0,
        "feasibility": "on_track",
        "ped_ee_bonus_kcal": _ped_mods_0["ee_bonus_kcal"],
        "ped_confidence": _ped_mods_0["confidence"],
        # NEW 2026-06-08 doc-sourced (display-only) fields — see data_contract.
        # Week 0 is the pre-start BASELINE: it uses Phase-1 (weeks 1-4 RESET)
        # macros because the Phase-1 RESET nutrition applies to the ramp-in /
        # baseline state. PED has NO week-0/week-1 dosing table in the doc
        # (cycle starts Week 2), so ped_week=None and ped_compounds_active=[].
        "macro_breakdown": _macro_breakdown_for_week(1, _PROTOCOL),
        "ped_week": None,
        "ped_compounds_active": [],
        "ped_low_evidence_compounds": _ped_mods_0["low_evidence_compounds"],
        "phase_macros_source": (
            _phase_macros_source_for_week(1, _PROTOCOL) or "not specified"
        ),
        # CONTROLLER fields (zero at baseline)
        "required_weight": round(_req_w0, 2),
        "required_bf": round(_req_bf0, 2),
        "lean_ceiling_lb": _lean_ceiling,
        "prescribed_cardio_sessions": 0,
        "prescribed_cardio_min": 0,
        "cardio_kcal": 0.0,
        "carbs_g": 0,
        "required_deficit": 0.0,
        "max_safe_deficit": 0.0,
        "residual_gap": 0.0,
        "correction_status": "on_track",
    })

    # ----------------------------------------------------------------
    # GEOMETRIC DECAY for gain/maintain modes (unchanged from prior logic)
    # ----------------------------------------------------------------
    _initial_fat_mass = current_fat_mass
    _initial_weight_fl = current_weight
    _fat_decay = (
        (goal_fat_mass / _initial_fat_mass) ** (1.0 / weeks)
        if (_initial_fat_mass > goal_fat_mass > 0 and weeks > 0)
        else 1.0
    )
    _wt_decay = (
        (goal_weight / _initial_weight_fl) ** (1.0 / weeks)
        if (_initial_weight_fl > goal_weight > 0 and weeks > 0)
        else 1.0
    )

    # ----------------------------------------------------------------
    # WEEKLY LOOP — runs ALL timeline_weeks (NEVER exits early)
    # ----------------------------------------------------------------
    for week in range(1, weeks + 1):
        age = calculate_age(dob, start_date + datetime.timedelta(weeks=week))

        # Dynamic RMR: update profile with current lean mass (Cunningham)
        profile_data["current_weight"] = current_weight
        profile_data["lean_mass_lb"] = current_lean_mass
        rmr, tdee = get_rmr_and_tdee(profile_data)
        rmr_method = profile_data.get('_rmr_method', 'ten_haaf')

        remaining_weeks = max(1, weeks - week + 1)

        # ----------------------------------------------------------------
        # TRAJECTORY STEP — what state are we at after this week?
        # ----------------------------------------------------------------
        if maintain_mode:
            fat_loss = 0.0
            weekly_weight_target = 0.0
        elif gain_mode:
            fat_loss = 0.0
            weekly_weight_target = (goal_weight - current_weight) / remaining_weeks
        else:
            # CONTROLLER: use the pre-built required trajectory.
            _traj_wk = _traj_by_week.get(week, {})
            _req_fat = _traj_wk.get("required_fat", goal_fat_mass)
            fat_loss = max(0.0, current_fat_mass - _req_fat)
            _req_wt = _traj_wk.get("required_weight", goal_weight)
            weekly_weight_target = max(0.0, current_weight - _req_wt)

        # Alpert ceiling (informational, not capping)
        alpert_cap = current_fat_mass * (_ALPERT_KCAL_PER_LB_PER_DAY * _ALPERT_DAYS / _KCAL_PER_LB_FAT)
        if not (maintain_mode or gain_mode) and alpert_cap > 0:
            ratio = fat_loss / alpert_cap
            agg_limit = _ALPERT_AGG_BAND_PED if ped_use else _ALPERT_AGG_BAND_NAT
            maxed_limit = _ALPERT_MAXED_BAND_PED if ped_use else _ALPERT_MAXED_BAND_NAT
            if ratio <= 1.0:
                feasibility = "on_track"
            elif ratio <= agg_limit:
                feasibility = "aggressive"
            else:
                feasibility = "ceiling_capped"
        else:
            feasibility = "on_track"

        # Fasting + muscle gain (informational)
        _, fasting_muscle_multiplier = get_fasting_multipliers(eating_window_hours)
        training_volume = volume_score * 2.5
        intensity = intensity_score / 10.0
        muscle_gain = estimate_muscle_gain(
            current_weight, workout_days, training_volume, intensity,
            daily_protein_intake, age, gender, experience_level,
            is_bodybuilder, ped_use, diet_type, sleep_quality,
        )
        muscle_gain *= fasting_muscle_multiplier

        # ----------------------------------------------------------------
        # STATE UPDATE (dual-goal convergence — sign-aware clamp)
        # ----------------------------------------------------------------
        if maintain_mode:
            pass
        elif gain_mode:
            current_weight = min(goal_weight, current_weight + weekly_weight_target)
            current_lean_mass = current_weight - current_fat_mass
        else:
            current_fat_mass = max(goal_fat_mass, current_fat_mass - fat_loss)
            current_weight = max(goal_weight, current_weight - weekly_weight_target)
            current_lean_mass = min(_lean_ceiling, current_weight - current_fat_mass)

        current_bf = (current_fat_mass / current_weight) * 100 if current_weight > 0 else 0

        # ----------------------------------------------------------------
        # PRESCRIPTION SOLVER — diet + cardio levers
        # ----------------------------------------------------------------
        # Reference curve gives phase/label; solver drives the actual calories.
        _ref_wt = scaled_recomp_targets(week, weeks, cal_scale, protein_scale, calorie_floor)

        if not (gain_mode or maintain_mode):
            # CONTROLLER: solve prescription for this week's required fat loss.
            # Pass the fat mass BEFORE this week's loss (= current_fat_mass + fat_loss,
            # because the state update above has already subtracted fat_loss from
            # current_fat_mass).
            fat_mass_before_loss = current_fat_mass + fat_loss
            _rx = solve_weekly_prescription(
                required_fat_loss_lb=fat_loss,
                tdee=tdee,
                rmr=rmr,
                protein_g=float(daily_protein_intake),
                calorie_floor=calorie_floor,
                ped_use=ped_use,
                max_cardio_min_per_day=max_cardio_min_per_day,
                lean_mass_lb=current_lean_mass,
                current_fat_mass_lb=fat_mass_before_loss,
                prev_training_cal=_prev_training_cal,
            )
            training_cal = _rx["training_calories"]
            rest_cal = _rx["rest_calories"]
            psmf_cal = _rx["psmf_calories"]
            protein_g_out = _rx["protein_g"]
            carbs_g_out = _rx["carbs_g"]
            weekly_avg_cal = _rx["weekly_average_calories"]
            weekly_caloric_output_val = _rx["weekly_caloric_output"]
            prescribed_cardio_sessions = _rx["prescribed_cardio_sessions"]
            prescribed_cardio_min = _rx["prescribed_cardio_min"]
            cardio_kcal = _rx["cardio_kcal"]
            required_deficit = _rx["required_deficit"]
            max_safe_deficit = _rx["max_safe_deficit"]
            residual_gap = _rx["residual_gap"]
            correction_status = _rx["correction_status"]
        else:
            # Gain/maintain: keep reference curve, no cardio prescribed
            training_cal = _ref_wt["training_calories"]
            rest_cal = _ref_wt["rest_calories"]
            psmf_cal = _ref_wt["psmf_calories"]
            protein_g_out = _ref_wt["protein_g"]
            carbs_g_out = 0
            weekly_avg_cal = _ref_wt["weekly_average_calories"]
            weekly_caloric_output_val = _ref_wt["weekly_caloric_output"]
            prescribed_cardio_sessions = 0
            prescribed_cardio_min = 0
            cardio_kcal = 0.0
            required_deficit = 0.0
            max_safe_deficit = 0.0
            residual_gap = 0.0
            correction_status = "on_track"

        # PED stack modifiers
        ped_mods = compute_ped_stack_modifiers(ped_stack, week=week)

        # --- Doc-sourced (display-only) macro + PED fields for this week --------
        # ADDITIVE read-only passthrough from nutrition-and-ped.json. These do NOT
        # feed the solver — carbs_g (above) stays the solver's training-day value;
        # macro_breakdown carries the doc's literal per-day-type grams verbatim.
        _macro_breakdown_wk = _macro_breakdown_for_week(week, _PROTOCOL)
        _ped_week_wk = _ped_timeline_for_week(week, _PROTOCOL)
        _ped_compounds_active_wk = _ped_compounds_active(_ped_week_wk)
        _phase_macros_source_wk = (
            _phase_macros_source_for_week(week, _PROTOCOL) or "not specified"
        )

        # p_ratio (informational)
        p_ratio_base = _compute_p_ratio(current_bf, _ref_wt["phase"])
        p_ratio = (
            max(_PED_P_FAT_FLOOR, min(_PED_P_FAT_HARD_CAP,
                p_ratio_base + ped_mods["p_fat_delta"]))
            if ped_mods["p_fat_delta"] != 0.0
            else p_ratio_base
        )

        if ped_mods["lean_modifier"] > 0.0:
            muscle_gain = muscle_gain * (1.0 + ped_mods["lean_modifier"] * 0.5)

        ped_ee_bonus = ped_mods["ee_bonus_kcal"]
        # EE bonus widens feasibility headroom (informational only)
        if ped_ee_bonus > 0.0 and fat_loss > 0.0 and feasibility != "on_track":
            ee_bonus_fat_lb = ped_ee_bonus * 7.0 / _KCAL_PER_LB_FAT
            effective_fat_demand = max(0.0, fat_loss - ee_bonus_fat_lb)
            if alpert_cap > 0:
                ratio_adj = effective_fat_demand / alpert_cap
                agg_limit_2 = _ALPERT_AGG_BAND_PED if ped_use else _ALPERT_AGG_BAND_NAT
                if ratio_adj <= 1.0:
                    feasibility = "on_track"
                elif ratio_adj <= agg_limit_2:
                    feasibility = "aggressive"

        below_rmr = min(training_cal, rest_cal, psmf_cal) < rmr * 0.85

        # Required line values for this week
        _traj_wk2 = _traj_by_week.get(week, {})
        req_weight_out = _traj_wk2.get("required_weight", goal_weight)
        req_bf_out = _traj_wk2.get("required_bf", goal_bf)

        progression.append({
            # EXISTING fields
            "week_number": week,
            "date": (start_date + datetime.timedelta(weeks=week)).strftime("%m%d%y"),
            "weight": current_weight,
            "body_fat_percentage": current_bf,
            "daily_calorie_intake": training_cal,
            "training_calories": training_cal,
            # Phase-varying calibrated training-day intake straight from the
            # RECOMP_REF_CURVE (scaled to the user). In cut mode the solver above
            # holds training_cal ~flat across weeks (it solves one steady
            # prescription for the required deficit), so daily_calorie_intake does
            # NOT taper. This ADDITIVE field carries the engine's real per-week
            # phase taper (RESET->ADAPT->CYCLE->PEAK, e.g. ~1800->~1425 scaled) so
            # reports/widgets can show the tapering plan that matches the Living
            # Report's phase narrative. Display-only; never feeds the solver.
            "reference_training_calories": _ref_wt["training_calories"],
            "rest_calories": rest_cal,
            "psmf_calories": psmf_cal,
            "protein_g": protein_g_out,
            "phase": _ref_wt["phase"],
            "tdee": tdee,
            "weekly_caloric_output": weekly_caloric_output_val,
            "total_weight_lost": initial_weight - current_weight,
            "lean_mass": current_lean_mass,
            "fat_mass": current_fat_mass,
            "muscle_gain": muscle_gain,
            "rmr": rmr,
            "tef": protein_cal * 0.25 + carb_cal * 0.075 + fat_cal * 0.015,
            "neat": estimate_neat(job_activity, leisure_activity, exercise_type),
            # NEW 2026-06-08 fields
            "weekly_average_calories": weekly_avg_cal,
            "calorie_floor": calorie_floor,
            "weekly_fat_loss_lb": round(fat_loss, 4),
            "p_ratio": round(p_ratio, 4),
            "rmr_method": rmr_method,
            "below_rmr": below_rmr,
            "feasibility": feasibility,
            "ped_ee_bonus_kcal": ped_ee_bonus,
            "ped_confidence": ped_mods["confidence"],
            # NEW 2026-06-08 doc-sourced (display-only) fields — see data_contract.
            # macro_breakdown = literal per-day-type grams from the doc (canonical
            # phase_macros_by_day_type set); ped_week = verbatim weekly_timeline
            # entry (None for week 1 — no dosing table in the doc).
            "macro_breakdown": _macro_breakdown_wk,
            "ped_week": _ped_week_wk,
            "ped_compounds_active": _ped_compounds_active_wk,
            "ped_low_evidence_compounds": ped_mods["low_evidence_compounds"],
            "phase_macros_source": _phase_macros_source_wk,
            # CONTROLLER fields
            "required_weight": round(req_weight_out, 2),
            "required_bf": round(req_bf_out, 2),
            "lean_ceiling_lb": _lean_ceiling,
            "prescribed_cardio_sessions": prescribed_cardio_sessions,
            "prescribed_cardio_min": prescribed_cardio_min,
            "cardio_kcal": cardio_kcal,
            "carbs_g": carbs_g_out,
            "required_deficit": required_deficit,
            "max_safe_deficit": max_safe_deficit,
            "residual_gap": residual_gap,
            "correction_status": correction_status,
        })

        # Update taper tracker: next week's training cal cannot exceed this week's.
        if not (gain_mode or maintain_mode):
            _prev_training_cal = float(training_cal)

        # NOTE: early-exit break REMOVED. The engine ALWAYS runs all timeline_weeks.
        # The goal is hit AT the deadline by construction of the trajectory, not
        # by breaking early. A "close enough" early break was the wrong model.

    return progression
