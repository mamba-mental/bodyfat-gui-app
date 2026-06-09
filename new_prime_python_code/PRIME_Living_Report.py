"""
PRIME_Living_Report.py
======================
Pure renderer for the Ap³xFit Living Progress Report (Clinical Playbook design).

Produces:
  render_living_report_html(calc_result, user_data, actual_entries=None) -> str
  render_living_report_md(calc_result, user_data, actual_entries=None) -> str

CONTRACT:
  - PURE RENDERER: reads engine fields, formats them. Zero math.
  - Every computed value comes from calc_result (the list returned by predict_weight_loss).
  - If a field is missing from the engine output, a TODO comment marks it — we do NOT compute.
  - Self-contained HTML (CDN fonts + Chart.js ok, file:// compatible).
  - Safety strip is ALWAYS VISIBLE, ALWAYS EXPANDED (never collapsed) in BOTH formats.

Coach knowledge sourced from:
  python-api/coach_knowledge.py — SAFETY_CONTRAINDICATIONS, ELECTROLYTE_PROTOCOL,
                                   PRIME_GUARDRAILS, COACH_SYSTEM_PROMPT
"""

from __future__ import annotations

import sys
import os
from pathlib import Path
from datetime import date, datetime, timedelta
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Import coach knowledge — try both possible import paths
# ---------------------------------------------------------------------------
try:
    from coach_knowledge import (
        SAFETY_CONTRAINDICATIONS,
        ELECTROLYTE_PROTOCOL,
        PRIME_GUARDRAILS,
    )
except ImportError:
    # Running from bodyfat-gui-app root or new_prime_python_code/
    _ck_path = Path(__file__).parent.parent / "python-api"
    sys.path.insert(0, str(_ck_path))
    from coach_knowledge import (
        SAFETY_CONTRAINDICATIONS,
        ELECTROLYTE_PROTOCOL,
        PRIME_GUARDRAILS,
    )

# ---------------------------------------------------------------------------
# Protocol reference (nutrition + PED JSON) — single read-path via the engine.
# Renderers import get_protocol_reference() so there is exactly ONE JSON load
# path + cache (engine-owned). A missing/unparseable file degrades to {} and
# every macro/PED consumer falls back to 'not specified' — NEVER raises (the
# renderer must always produce a report).
# ---------------------------------------------------------------------------
try:
    from new_prime_python_code.PRIME_Calculations import get_protocol_reference
except ImportError:
    try:
        from PRIME_Calculations import get_protocol_reference
    except ImportError:
        def get_protocol_reference() -> dict:  # type: ignore
            """Fallback: protocol JSON unavailable → degrade to 'not specified'."""
            return {}


# ---------------------------------------------------------------------------
# Phase colour mapping (CSS class / hex)
# ---------------------------------------------------------------------------
_PHASE_CSS: dict[str, str] = {
    "RESET": "phase-reset",
    "ADAPT": "phase-adapt",
    "CYCLE": "phase-cycle",
    "PEAK":  "phase-peak",
}
_PHASE_PILL_STYLE: dict[str, str] = {
    "RESET": "",
    "ADAPT": "",
    "CYCLE": "",
    "PEAK":  "background:var(--red);color:#fff;",
}
_PHASE_FEASIBILITY_LABEL: dict[str, str] = {
    "on_track":      "ON TRACK",
    "aggressive":    "AGGRESSIVE",
    "ceiling_capped":"MAXED OUT",
    "pushing_limits":"PUSHING LIMITS",
    "maxed_out":     "MAXED OUT",
}
_CORRECTION_NARRATIVE: dict[str, str] = {
    "on_track":      "Re-solved prescription is within safe deficit range.",
    "pushing_limits":"Diet + cardio levers are at or near ceiling. No further cuts available without constraint breach.",
    "maxed_out":     "Required deficit exceeds both diet and cardio ceilings. Residual gap flagged below.",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _w(row: dict, *keys: str, default: Any = None) -> Any:
    """Safe field reader — returns the first key found, or default."""
    for k in keys:
        if k in row and row[k] is not None:
            return row[k]
    return default


def _fmt_lb(v: Any, decimals: int = 1) -> str:
    if v is None:
        return "—"
    return f"{float(v):.{decimals}f} lb"


def _fmt_pct(v: Any, decimals: int = 1) -> str:
    if v is None:
        return "—"
    return f"{float(v):.{decimals}f}%"


def _fmt_kcal(v: Any) -> str:
    if v is None:
        return "—"
    return f"{int(round(float(v))):,}"


def _fmt_g(v: Any) -> str:
    if v is None:
        return "—"
    return f"{int(round(float(v)))} g"


def _html_escape(s: Any) -> str:
    """Minimal HTML escape — '<10g' etc. must not break markup."""
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _fmt_macro_cell(v: Any) -> str:
    """Display a literal doc macro string VERBATIM (anti-fabrication).

    None/''/'N/A' → 'not specified'. Otherwise the literal doc string
    ('80g','<10g','2200–2500','not specified') returned unchanged. NEVER
    computes or rounds. Caller is responsible for HTML-escaping when emitted
    into markup (see _fmt_macro_cell_html).
    """
    if v is None:
        return "not specified"
    s = str(v).strip()
    if s == "" or s.upper() == "N/A":
        return "not specified"
    return s


def _fmt_macro_cell_html(v: Any) -> str:
    """HTML-safe variant of _fmt_macro_cell — escapes '<' in '<10g' etc."""
    return _html_escape(_fmt_macro_cell(v))


def _fmt_date_mmddyy(mmddyy: str) -> str:
    """Convert engine date string 'MMDDYY' to 'Mon Jun 2, 2026'."""
    try:
        d = datetime.strptime(str(mmddyy), "%m%d%y")
        return d.strftime("%b %-d, %Y") if sys.platform != "win32" else d.strftime("%b %d, %Y").replace(" 0", " ")
    except Exception:
        return str(mmddyy)


def _delta_class(actual: Optional[float], required: Optional[float]) -> str:
    """CSS class: ahead (green) / behind (warn) / neutral."""
    if actual is None or required is None:
        return ""
    diff = float(actual) - float(required)
    if diff < -0.05:
        return "ahead"
    if diff > 0.05:
        return "behind"
    return ""


def _signed_delta(actual: Optional[float], required: Optional[float], unit: str = "") -> str:
    """Formatted signed delta string."""
    if actual is None or required is None:
        return "—"
    diff = float(actual) - float(required)
    sign = "+" if diff >= 0 else ""
    return f"{sign}{diff:.1f}{unit}"


def _week_start_date(start_date_str: str, week: int) -> str:
    """Calculate week start date from engine start-date string (MMDDYY)."""
    try:
        base = datetime.strptime(str(start_date_str), "%m%d%y")
        d = base + timedelta(weeks=week - 1)
        return d.strftime("%b %d, %Y").replace(" 0", " ")
    except Exception:
        return f"Wk {week}"


def _week_end_date(start_date_str: str, week: int) -> str:
    """Calculate week end date from engine start-date string (MMDDYY)."""
    try:
        base = datetime.strptime(str(start_date_str), "%m%d%y")
        d = base + timedelta(weeks=week - 1, days=6)
        return d.strftime("%b %d, %Y").replace(" 0", " ")
    except Exception:
        return f"Wk {week}"


def _correction_status_display(status: Optional[str]) -> str:
    return _PHASE_FEASIBILITY_LABEL.get(str(status) if status else "", str(status or ""))


# ---------------------------------------------------------------------------
# Derive "current week" from actual_entries
# ---------------------------------------------------------------------------

def _current_week(actual_entries: Optional[list]) -> int:
    """Return the latest week number that has an actual entry, or 0 if none."""
    if not actual_entries:
        return 0
    return max(int(e.get("week", 0)) for e in actual_entries)


def _actual_for_week(actual_entries: Optional[list], week: int) -> Optional[dict]:
    """Return the actual entry for a given week, or None."""
    if not actual_entries:
        return None
    for e in actual_entries:
        if int(e.get("week", -1)) == week:
            return e
    return None


def _latest_actual(actual_entries: Optional[list]) -> Optional[dict]:
    """Return the most recent actual weigh-in entry."""
    if not actual_entries:
        return None
    return max(actual_entries, key=lambda e: int(e.get("week", 0)))


# ---------------------------------------------------------------------------
# Safety strip content (sourced from coach_knowledge — no invention)
# ---------------------------------------------------------------------------

def _safety_contraindications_lines() -> list[str]:
    lines = []
    sc = SAFETY_CONTRAINDICATIONS
    if "psmf_absolute_no" in sc:
        lines.append(("PSMF ABSOLUTE CONTRAINDICATIONS", sc["psmf_absolute_no"]))
    if "extended_fasting_48h_plus_absolute_no" in sc:
        lines.append(("EXTENDED FASTING 48h+ ABSOLUTE NO", sc["extended_fasting_48h_plus_absolute_no"]))
    if "requires_medical_supervision" in sc:
        lines.append(("REQUIRES MEDICAL SUPERVISION", sc["requires_medical_supervision"]))
    if "water_fasting_stop_signs" in sc:
        lines.append(("STOP FASTING IMMEDIATELY IF", sc["water_fasting_stop_signs"]))
    if "psmf_max_duration_by_category" in sc:
        dur = sc["psmf_max_duration_by_category"]
        items = [f"Cat-{k.replace('cat','')}: {v}" for k, v in dur.items()]
        lines.append(("PSMF MAX DURATION BY BF CATEGORY", items))
    return lines


def _electrolyte_lines() -> list[tuple[str, Any]]:
    ep = ELECTROLYTE_PROTOCOL
    lines = []
    if "daily_targets_mg" in ep and "psmf" in ep["daily_targets_mg"]:
        psmf_e = ep["daily_targets_mg"]["psmf"]
        items = [
            f"Sodium: {psmf_e['sodium'][0]:,}–{psmf_e['sodium'][1]:,} mg/day",
            f"Potassium: {psmf_e['potassium'][0]:,}–{psmf_e['potassium'][1]:,} mg/day",
            f"Magnesium: {psmf_e['magnesium'][0]:,}–{psmf_e['magnesium'][1]:,} mg/day",
        ]
        lines.append(("DAILY ELECTROLYTE TARGETS (PSMF PROTOCOL)", items))
    if "quick_fix_ketoade" in ep:
        lines.append(("KETOADE QUICK FIX", [ep["quick_fix_ketoade"]]))
    if "prime_rule" in ep:
        lines.append(("PRIME RULE", [ep["prime_rule"]]))
    return lines


# ---------------------------------------------------------------------------
# PED timeline helpers (read protocol JSON — verbatim, no invention)
# ---------------------------------------------------------------------------

def _ped_key_transitions(protocol: dict) -> list:
    """Return ped_protocol.key_transitions list (week-keyed change notes), or []."""
    if not protocol:
        return []
    return protocol.get("ped_protocol", {}).get("key_transitions", []) or []


def _ped_bloodwork_weeks(protocol: dict) -> dict:
    """Map int week → bloodwork timing label (Baseline/Wk4/Wk8/Wk12).

    Baseline (cycle_day D+0) maps to week 0; 'Week N' rows map to int N. Returns
    {} if the schedule is missing. Pure read of bloodwork_schedule.
    """
    out: dict = {}
    if not protocol:
        return out
    sched = protocol.get("ped_protocol", {}).get("bloodwork_schedule", []) or []
    for entry in sched:
        timing = str(entry.get("timing", "")).strip()
        if not timing:
            continue
        if timing.lower() == "baseline":
            out[0] = entry
        else:
            # 'Week 4' → 4
            digits = "".join(ch for ch in timing if ch.isdigit())
            if digits:
                out[int(digits)] = entry
    return out


# ============================================================================
# HTML RENDERER
# ============================================================================

_CSS = """/* ══ CLINICAL PLAYBOOK — DESIGN TOKENS ══ */
:root {
  --ink:       #14181d;
  --ink-mid:   #2b3039;
  --ink-sub:   #4a5260;
  --ink-3:     #6b7f8f;
  --paper:     #f7f5f0;
  --white:     #ffffff;
  --grey-lt:   #f1eeea;
  --rule:      #d6dde3;
  --rule-lt:   #edf1f4;
  --amber:     #f59e0b;
  --amber-d:   #d97706;
  --amber-bg:  #fef3c7;
  --teal:      #0f7c8a;
  --teal-dim:  #d0eef1;
  --green:     #0a6b3d;
  --red:       #a3000f;
  --warn:      #7a5500;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; -webkit-font-smoothing: antialiased; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: 'Archivo', sans-serif;
  font-weight: 400;
  line-height: 1.55;
  width: 1200px;
  margin: 0 auto;
  padding-bottom: 0;
}
.mono   { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.mono-sm{ font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; font-variant-numeric: tabular-nums; }
.mono-xs{ font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-variant-numeric: tabular-nums; }
.label  { font-size: 9.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
.label-amber { font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--amber-d); }
.label-teal  { font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--teal); }
.delta-pos  { color: var(--green); }
.delta-neg  { color: var(--red); }
.delta-warn { color: var(--warn); }
.ahead  { color: var(--green); }
.behind { color: var(--warn); }
/* HEADER */
.header-band { background: var(--ink); color: var(--white); position: relative; }
.header-inner { display: grid; grid-template-columns: 1fr auto; align-items: stretch; min-height: 190px; }
.header-left  { padding: 28px 44px 24px; border-right: 3px solid var(--amber); display: flex; flex-direction: column; justify-content: space-between; }
.brand-row    { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.brand-logo   { font-family: 'Anton', sans-serif; font-size: 22px; letter-spacing: .04em; color: var(--amber); line-height: 1; }
.brand-sep    { width: 2px; height: 22px; background: rgba(255,255,255,.22); }
.brand-sub    { font-family: 'Archivo Narrow', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.5); }
.header-report-title { font-family: 'Archivo Narrow', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 4px; }
.cycle-label  { font-family: 'Anton', sans-serif; font-size: 30px; letter-spacing: .03em; color: var(--white); line-height: 1; margin-bottom: 14px; }
.athlete-row  { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.athlete-name { font-family: 'Archivo', sans-serif; font-size: 15px; font-weight: 700; color: var(--white); }
.athlete-stats{ display: flex; gap: 10px; flex-wrap: wrap; }
.ath-stat     { font-family: 'Inter Tight', sans-serif; font-size: 11.5px; font-weight: 500; color: rgba(255,255,255,.5); padding: 3px 8px; border: 1px solid rgba(255,255,255,.12); }
.cadence-tag  { font-family: 'Inter Tight', sans-serif; font-size: 10px; color: rgba(255,255,255,.32); margin-top: 10px; letter-spacing: .04em; font-style: italic; }
.header-right { background: var(--amber); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 40px; gap: 2px; min-width: 200px; }
.week-num     { font-family: 'Anton', sans-serif; font-size: 96px; line-height: .85; color: var(--ink); letter-spacing: -.01em; }
.week-of      { font-family: 'Archivo Narrow', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-mid); }
.phase-badge  { margin-top: 8px; background: var(--ink); color: var(--amber); font-family: 'Archivo Narrow', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; padding: 4px 14px; }
/* DYNAMIC FRAMING NOTE */
.dynamic-note { background: var(--ink-mid); padding: 10px 44px; border-top: 2px solid var(--teal); border-bottom: 1px solid rgba(255,255,255,.08); }
.dynamic-note-text { font-family: 'Inter Tight', sans-serif; font-size: 11.5px; color: rgba(255,255,255,.65); line-height: 1.5; }
.dynamic-note-text strong { color: var(--teal); font-weight: 600; }
/* GOAL STRIP */
.goal-strip   { background: var(--ink-mid); color: var(--white); padding: 11px 44px; display: flex; align-items: center; gap: 10px; border-top: 3px solid var(--amber); flex-wrap: wrap; }
.goal-label   { font-family: 'Archivo Narrow', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); flex-shrink: 0; }
.goal-text    { font-family: 'Inter Tight', sans-serif; font-size: 12px; color: rgba(255,255,255,.65); }
.goal-text strong { color: var(--white); font-weight: 600; }
.goal-sep     { width: 1px; height: 14px; background: rgba(255,255,255,.15); margin: 0 4px; }
/* TRACKER */
.tracker-wrap { background: var(--white); border-bottom: 2px solid var(--ink); padding: 14px 44px; }
.tracker-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.tracker-title  { font-family: 'Anton', sans-serif; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--ink); }
.tracker-caption{ font-family: 'Inter Tight', sans-serif; font-size: 10px; color: var(--ink-3); }
.tracker-strip  { display: flex; gap: 3px; align-items: stretch; height: 28px; }
.tracker-cell   { flex: 1; display: flex; align-items: center; justify-content: center; font-family: 'IBM Plex Mono', monospace; font-size: 8.5px; font-weight: 500; letter-spacing: .05em; position: relative; cursor: default; }
.tracker-cell.phase-reset { background: rgba(107,127,143,.18); color: var(--ink-sub); border: 1px solid rgba(107,127,143,.25); }
.tracker-cell.phase-adapt { background: rgba(245,158,11,.15); color: var(--amber-d);  border: 1px solid rgba(245,158,11,.3); }
.tracker-cell.phase-cycle { background: rgba(15,124,138,.12); color: var(--teal);     border: 1px solid rgba(15,124,138,.25); }
.tracker-cell.phase-peak  { background: rgba(163,0,15,.10);   color: var(--red);      border: 1px solid rgba(163,0,15,.2); }
.tracker-cell.has-data::after { content:''; position:absolute; bottom:3px; left:50%; transform:translateX(-50%); width:5px; height:5px; border-radius:50%; background:var(--amber); }
.tracker-cell.current { outline: 2px solid var(--amber); outline-offset:-1px; font-weight:700; }
.tracker-legend { display:flex; gap:16px; margin-top:8px; }
.tleg { display:flex; align-items:center; gap:5px; font-size:9px; color:var(--ink-3); }
.tleg-dot { width:9px; height:9px; border-radius:1px; }
/* MAIN */
.main { padding: 32px 44px 40px; display: flex; flex-direction: column; gap: 28px; }
.section-head  { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.section-rule  { flex: 1; height: 2px; background: var(--ink); }
.section-label { font-family: 'Anton', sans-serif; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; color: var(--ink); white-space: nowrap; }
/* SUMMARY GRID */
.summary-grid  { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; border: 2px solid var(--ink); }
.summary-cell  { padding: 20px 22px; border-right: 2px solid var(--ink); background: var(--white); }
.summary-cell:last-child { border-right: none; background: var(--ink); color: var(--white); }
.sc-label { font-family: 'Archivo Narrow', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--ink-sub); margin-bottom: 6px; }
.summary-cell:last-child .sc-label { color: rgba(255,255,255,.45); }
.sc-main  { font-family: 'IBM Plex Mono', monospace; font-size: 28px; font-weight: 500; line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums; }
.summary-cell:last-child .sc-main { color: var(--amber); font-size: 22px; padding-top: 4px; }
.sc-sub   { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-sub); margin-top: 4px; font-variant-numeric: tabular-nums; }
.summary-cell:last-child .sc-sub { color: rgba(255,255,255,.5); }
.sc-delta { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500; }
.status-pill  { display: inline-block; background: var(--amber); color: var(--ink); font-family: 'Archivo Narrow', sans-serif; font-size: 9.5px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; padding: 4px 10px; margin-top: 8px; }
/* TRAJECTORY CHART */
.chart-wrap { background: var(--white); border: 2px solid var(--ink); overflow: hidden; }
.chart-head { background: var(--ink); padding: 11px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--amber); }
.chart-title { font-family: 'Anton', sans-serif; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; color: var(--white); }
.chart-caption { font-family: 'Inter Tight', sans-serif; font-size: 10px; color: rgba(255,255,255,.4); }
.chart-body { padding: 18px 20px; }
.chart-legend { display: flex; gap: 20px; margin-bottom: 10px; }
.cl-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--ink-sub); }
.cl-line { width: 24px; height: 2px; }
/* AI COACH PANEL */
.coach-panel { border: 2px solid var(--ink); background: var(--white); overflow: hidden; }
.cp-header   { background: var(--ink); padding: 16px 22px; border-bottom: 3px solid var(--amber); }
.cp-eyebrow  { font-family: 'Archivo Narrow', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: var(--amber); margin-bottom: 3px; }
.cp-title    { font-family: 'Anton', sans-serif; font-size: 22px; letter-spacing: .04em; color: var(--white); line-height: 1.1; }
.cp-directive{ padding: 16px 22px; background: #fafaf8; border-bottom: 1.5px solid var(--rule); font-family: 'Archivo', sans-serif; font-size: 13px; font-weight: 600; color: var(--ink); line-height: 1.5; }
.cp-directive em { color: var(--amber-d); font-style: normal; }
.cp-bullets  { padding: 0; }
.cp-bullet   { display: flex; gap: 12px; padding: 13px 22px; border-bottom: 1px solid var(--rule); align-items: flex-start; }
.cp-bullet:last-child { border-bottom: none; }
.cb-num      { width: 22px; height: 22px; background: var(--amber); color: var(--ink); font-family: 'Anton', sans-serif; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
.cb-content  { flex: 1; }
.cb-label    { font-family: 'Archivo Narrow', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--ink-sub); margin-bottom: 2px; }
.cb-text     { font-family: 'Archivo', sans-serif; font-size: 12px; font-weight: 500; color: var(--ink); line-height: 1.45; }
.cb-text strong { font-weight: 700; }
.cp-footer   { background: var(--grey-lt); padding: 12px 22px; border-top: 1.5px solid var(--rule); display: flex; gap: 12px; }
.cpf-item    { flex: 1; text-align: center; }
.cpf-label   { font-family: 'Archivo Narrow', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-sub); margin-bottom: 2px; }
.cpf-val     { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 500; color: var(--ink); font-variant-numeric: tabular-nums; }
.cpf-sep     { width: 1px; background: var(--rule); align-self: stretch; }
/* WEEK CARDS */
.week-cards  { display: flex; flex-direction: column; gap: 16px; }
.wk-card     { border: 2px solid var(--ink); background: var(--white); overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
/* WEEK ACCORDION (PRIME 2026-06-09): current open, others collapsed, click to expand */
.wk-acc { border: 1.5px solid var(--rule); background: var(--white); margin-bottom: 9px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
.wk-acc[open] { border-color: var(--ink); border-width: 2px; }
.wk-summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 11px 18px; background: var(--grey-lt); }
.wk-summary::-webkit-details-marker { display: none; }
.wk-summary:hover { background: rgba(15,124,138,.06); }
.acc-wk { font-family: 'Anton', sans-serif; font-size: 15px; letter-spacing: .1em; color: var(--ink); min-width: 52px; }
.acc-badge { font-family: 'Archivo Narrow', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; padding: 2px 8px; }
.acc-cur  { background: var(--amber); color: var(--ink); }
.acc-done { background: rgba(15,124,138,.15); color: var(--teal); }
.acc-miss { background: rgba(163,0,15,.12); color: var(--red); }
.acc-proj { background: var(--grey-lt); color: var(--ink-3); border: 1px dashed var(--rule); }
.acc-detail { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-sub); flex: 1; }
.acc-chevron { color: var(--ink-3); font-size: 11px; }
.wk-acc[open] .acc-chevron { transform: rotate(180deg); display: inline-block; }
.wk-acc > .wk-card { border: none; }
.proj-banner { background: rgba(245,158,11,.1); border: 1px dashed var(--amber-d); color: var(--amber-d); font-family: 'Archivo Narrow', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 8px 14px; margin: 0 0 10px 0; }
@media print { .wk-acc > .wk-card { display: block !important; } .wk-summary { background: var(--white); } }
.wk-header   { background: var(--ink); color: var(--white); padding: 12px 20px; display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 16px; }
.wk-num      { font-family: 'Anton', sans-serif; font-size: 20px; letter-spacing: .04em; color: var(--amber); }
.wk-meta     { display: flex; flex-direction: column; gap: 1px; }
.wk-dates    { font-family: 'Archivo', sans-serif; font-size: 12.5px; font-weight: 600; color: var(--white); }
.wk-phase-label { font-family: 'Archivo Narrow', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.45); }
.wk-feasibility { font-family: 'Archivo Narrow', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; padding: 3px 8px; color: var(--amber); background: rgba(245,158,11,.15); border: 1px solid var(--amber); }
.wk-phase-pill  { font-family: 'Archivo Narrow', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; padding: 3px 8px; background: var(--amber); color: var(--ink); }
.wk-body-full   { display: grid; grid-template-columns: 1fr 1fr; }
.wk-col-l { padding: 16px 20px; border-right: 1px solid var(--rule); }
.wk-col-r { padding: 16px 20px; }
.pva-table { width: 100%; border-collapse: collapse; }
.pva-table th { font-size: 9px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); text-align: right; padding: 4px 0 6px; border-bottom: 1px solid var(--rule); }
.pva-table th:first-child { text-align: left; }
.pva-table td { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; font-variant-numeric: tabular-nums; color: var(--ink); text-align: right; padding: 5px 0; border-bottom: 1px solid var(--rule-lt); }
.pva-table td:first-child { font-family: 'Archivo', sans-serif; font-size: 11px; color: var(--ink-sub); text-align: left; }
.pva-table tr:last-child td { border-bottom: none; }
.wi-table { width: 100%; border-collapse: collapse; }
.wi-table th { font-size: 9px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); text-align: left; padding: 4px 0 6px; border-bottom: 1px solid var(--rule); }
.wi-table th:not(:first-child) { text-align: right; }
.wi-table td { font-size: 11.5px; color: var(--ink); padding: 5px 0; border-bottom: 1px solid var(--rule-lt); }
.wi-table td:not(:first-child) { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; text-align: right; }
.wi-table tr:last-child td { border-bottom: none; }
.report-tag  { display: inline-block; font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; background: var(--teal-dim); color: var(--teal); padding: 1px 5px; margin-left: 6px; vertical-align: middle; border: 1px solid var(--teal); }
.photo-slot  { width: 100%; height: 72px; background: var(--grey-lt); border: 1.5px dashed var(--rule); display: flex; align-items: center; justify-content: center; margin-top: 10px; }
.photo-slot-text { font-size: 9.5px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); }
.coach-note  { margin-top: 10px; padding: 10px 12px; border-left: 2px solid var(--amber); background: var(--amber-bg); font-family: 'Archivo', sans-serif; font-size: 11.5px; color: var(--ink-mid); font-style: italic; line-height: 1.45; }
.wk-body-pending { display: grid; grid-template-columns: 1fr auto; gap: 0; }
.wk-pending-table { flex: 1; padding: 12px 20px; }
.wk-pending-photo { width: 140px; border-left: 1px solid var(--rule); display: flex; align-items: center; justify-content: center; background: var(--grey-lt); }
.wk-pending-photo-text { font-size: 8.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); writing-mode: vertical-lr; transform: rotate(180deg); }
/* DATA SECTIONS */
.data-section { border: 1px solid var(--rule); background: var(--white); }
.ds-head  { display: flex; align-items: baseline; gap: 12px; padding: 13px 20px 10px; border-bottom: 1px solid var(--rule); background: var(--grey-lt); }
.ds-title { font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink); }
.ds-rule  { flex: 1; height: 1px; background: var(--rule-lt); }
.ds-body  { padding: 16px 20px; }
.data-2col{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.data-3col{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
.metric-row { display: grid; grid-template-columns: 200px 1fr; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--rule-lt); font-size: 12px; }
.metric-row:last-child { border-bottom: none; }
.metric-key { color: var(--ink-sub); font-size: 11px; }
.metric-val { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; color: var(--ink); }
.teal-stat  { color: var(--teal); font-weight: 500; }
/* SAFETY STRIP — ALWAYS EXPANDED, ALWAYS VISIBLE */
.safety-strip { border: 2px solid var(--red); background: var(--white); overflow: hidden; }
.safety-strip-header { background: var(--red); padding: 14px 22px; display: flex; align-items: center; gap: 12px; }
.safety-strip-title { font-family: 'Anton', sans-serif; font-size: 15px; letter-spacing: .2em; text-transform: uppercase; color: var(--white); }
.safety-strip-sub { font-family: 'Archivo Narrow', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: rgba(255,255,255,.65); }
.safety-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
.safety-section { }
.safety-section-title { font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--red); margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid rgba(163,0,15,.2); }
.safety-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 3px; }
.safety-list li { font-size: 11.5px; color: var(--ink-mid); line-height: 1.4; padding-left: 14px; position: relative; }
.safety-list li::before { content: '▸'; position: absolute; left: 0; color: var(--red); font-size: 9px; top: 2px; }
.safety-electrolyte { background: rgba(15,124,138,.06); border: 1px solid rgba(15,124,138,.25); padding: 12px 16px; }
.safety-electrolyte-title { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--teal); margin-bottom: 6px; }
.safety-bloodwork { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.3); padding: 12px 16px; margin-top: 4px; }
.safety-bloodwork-title { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--amber-d); margin-bottom: 6px; }
/* COLLAPSIBLE PED SAFETY (bottom placement, default collapsed — per PRIME 2026-06-08) */
.safety-details { border: 2px solid var(--red); background: var(--white); margin-top: 28px; }
.safety-details > summary { padding: 14px 22px; cursor: pointer; list-style: none; display: flex; align-items: center; gap: 12px; background: var(--red); color: var(--white); }
.safety-details > summary::-webkit-details-marker { display: none; }
.safety-details > summary::after { content: '▾ show'; margin-left: auto; font-family: 'Archivo Narrow', sans-serif; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
.safety-details[open] > summary::after { content: '▴ hide'; }
.safety-summary-icon { font-size: 16px; line-height: 1; }
.safety-summary-title { font-family: 'Anton', sans-serif; font-size: 15px; letter-spacing: .2em; text-transform: uppercase; }
.safety-summary-sub { font-family: 'Archivo Narrow', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.7); }
/* APPENDIX */
details { border: 1px solid var(--rule); background: var(--white); margin-top: 0; }
details > summary { padding: 12px 20px; cursor: pointer; list-style: none; display: flex; align-items: center; gap: 10px; background: var(--grey-lt); border-bottom: 1px solid var(--rule); font-family: 'Archivo Narrow', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--ink); }
details > summary::after { content: '▾'; margin-left: auto; color: var(--ink-3); }
details[open] > summary::after { content: '▴'; }
details > summary::-webkit-details-marker { display: none; }
.appendix-body { padding: 20px; }
.appendix-section { margin-bottom: 18px; }
.appendix-section:last-child { margin-bottom: 0; }
.appendix-title { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--teal); margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--rule-lt); }
.appendix-text { font-size: 11.5px; color: var(--ink-sub); line-height: 1.6; }
/* FOOTER */
.report-footer { background: var(--ink); color: rgba(255,255,255,.5); padding: 14px 44px; display: flex; align-items: center; justify-content: space-between; }
.footer-brand  { font-family: 'Archivo Narrow', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--amber); }
.footer-meta   { font-family: 'IBM Plex Mono', monospace; font-size: 10px; }
.footer-cadence{ font-family: 'Inter Tight', sans-serif; font-size: 10px; color: rgba(255,255,255,.35); font-style: italic; max-width: 420px; text-align: center; }
/* PED TIMELINE SECTION (doc-sourced weekly dosing — verbatim, no invention) */
.ped-timeline-section { border: 2px solid var(--ink); background: var(--white); overflow: hidden; page-break-inside: avoid; }
.ped-warning-strip { background: var(--amber-bg); border-bottom: 2px solid var(--amber); padding: 11px 20px; display: flex; align-items: flex-start; gap: 10px; }
.ped-warning-icon { color: var(--amber-d); font-size: 15px; line-height: 1.2; flex-shrink: 0; }
.ped-warning-text { font-family: 'Archivo', sans-serif; font-size: 11.5px; color: var(--warn); line-height: 1.45; }
.ped-warning-text strong { color: var(--amber-d); font-weight: 700; }
.ped-table { width: 100%; border-collapse: collapse; }
.ped-table th { font-size: 8.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--ink); background: var(--grey-lt); white-space: nowrap; }
.ped-table td { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-variant-numeric: tabular-nums; color: var(--ink-mid); text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--rule-lt); vertical-align: top; }
.ped-table td:first-child { font-family: 'Anton', sans-serif; font-size: 12px; color: var(--amber-d); text-align: center; }
.ped-table tr:last-child td { border-bottom: none; }
.ped-table tr.ped-current td { background: rgba(245,158,11,.08); }
.ped-table tr.ped-bloodwork td:last-child { color: var(--amber-d); font-weight: 600; }
.ped-phase-cell { font-family: 'Archivo Narrow', sans-serif !important; font-size: 9px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-sub) !important; }
.ped-gap-row td { color: var(--ink-3); font-style: italic; }
.ped-orals-cell { font-size: 9px !important; color: var(--ink-sub); line-height: 1.5; }
.ped-transition-note { margin-top: 6px; padding: 7px 10px; border-left: 2px solid var(--teal); background: rgba(15,124,138,.06); font-family: 'Archivo', sans-serif; font-size: 10px; color: var(--ink-mid); font-style: italic; line-height: 1.4; }
.ped-transition-note strong { color: var(--teal); font-style: normal; font-weight: 700; }
.ped-source-foot { padding: 9px 20px; background: var(--grey-lt); border-top: 1px solid var(--rule); font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: var(--ink-3); }
/* MACRO ROWS in week cards (per-day-type carbs/fat/protein, doc verbatim) */
.macro-multi { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; }
/* COACH'S PIVOTS PANEL (directional changes + IF/THEN triggers — engine + doc) */
.pivots-panel { border: 2px solid var(--ink); background: var(--white); overflow: hidden; page-break-inside: avoid; }
.pivots-empty { padding: 16px 22px; font-family: 'Archivo', sans-serif; font-size: 12px; color: var(--ink-sub); font-style: italic; }
.pivots-group-title { padding: 11px 22px 8px; font-family: 'Archivo Narrow', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-sub); background: var(--grey-lt); border-bottom: 1px solid var(--rule); }
.pivot-row { display: flex; gap: 12px; padding: 11px 22px; border-bottom: 1px solid var(--rule); align-items: flex-start; }
.pivot-row:last-child { border-bottom: none; }
.pivot-wk { font-family: 'Anton', sans-serif; font-size: 12px; color: var(--amber-d); flex: 0 0 auto; min-width: 42px; }
.pivot-body { flex: 1; }
.pivot-change { font-family: 'Archivo', sans-serif; font-size: 12px; font-weight: 600; color: var(--ink); line-height: 1.45; }
.pivot-why { font-family: 'Archivo', sans-serif; font-size: 11px; color: var(--ink-sub); line-height: 1.4; margin-top: 2px; }
.pivot-why strong { color: var(--teal); font-weight: 700; }
.pivot-ifthen { display: flex; gap: 10px; padding: 9px 22px; border-bottom: 1px solid var(--rule-lt); align-items: baseline; }
.pivot-ifthen:last-child { border-bottom: none; }
.pivot-if  { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; font-weight: 600; color: var(--warn); flex: 0 0 auto; }
.pivot-then{ font-family: 'Archivo', sans-serif; font-size: 11.5px; color: var(--ink-mid); }
.pivot-src { font-family: 'IBM Plex Mono', monospace; font-size: 8.5px; color: var(--ink-3); margin-left: 6px; }
/* PRINTABLE WEEKLY CHECK-OFF (tickable foods + PED doses + daily tasks) */
.checkoff-section { border: 2px solid var(--ink); background: var(--white); overflow: hidden; }
.checkoff-head { background: var(--ink); color: var(--white); padding: 13px 22px; border-bottom: 3px solid var(--amber); }
.checkoff-head-title { font-family: 'Anton', sans-serif; font-size: 16px; letter-spacing: .14em; text-transform: uppercase; color: var(--white); }
.checkoff-head-sub { font-family: 'Archivo Narrow', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--amber); margin-top: 2px; }
.checkoff-week { page-break-inside: avoid; break-inside: avoid; padding: 16px 22px; border-bottom: 2px solid var(--rule); }
.checkoff-week:last-child { border-bottom: none; }
.checkoff-week-hd { font-family: 'Archivo', sans-serif; font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid var(--rule); }
.checkoff-group { margin-bottom: 14px; }
.checkoff-group:last-child { margin-bottom: 0; }
.checkoff-group-title { font-family: 'Archivo Narrow', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--teal); margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid var(--rule-lt); }
.checkoff-item { display: flex; gap: 8px; padding: 4px 0; align-items: flex-start; }
.checkoff-box { width: 14px; height: 14px; border: 1.5px solid var(--ink); display: inline-block; flex: 0 0 auto; margin-top: 1px; }
.checkoff-text { font-family: 'Archivo', sans-serif; font-size: 11.5px; color: var(--ink-mid); line-height: 1.4; }
.checkoff-text strong { color: var(--ink); font-weight: 700; }
.checkoff-text .mono-sm { color: var(--ink-sub); }
@media print {
  body { width: 100%; }
  .wk-card, .data-section, .chart-wrap, .coach-panel, .safety-strip { page-break-inside: avoid; break-inside: avoid; }
  .report-footer, .tracker-wrap, .goal-strip { page-break-inside: avoid; break-inside: avoid; }
  .ped-timeline-section { page-break-inside: avoid; break-inside: avoid; }
  .pivots-panel { page-break-inside: avoid; break-inside: avoid; }
  .checkoff-section, .checkoff-week { page-break-inside: avoid; break-inside: avoid; }
  .checkoff-week { page-break-after: always; }
  .checkoff-week:last-child { page-break-after: auto; }
  .checkoff-box { width: 14px; height: 14px; border: 1.5px solid var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .chart-wrap { display: none; }
}"""


def _ped_pin_cell(injectables: dict, compound: str) -> str:
    """Format one injectable's Mon/Wed/Fri pins as 'mon · wed · fri' (verbatim).

    Token '—' = NO pin that day (kept verbatim, NOT blanked). '200mg' literal,
    '100–150mg' a range — all passed through unchanged. Missing compound →
    'not specified'.
    """
    pins = (injectables or {}).get(compound)
    if not isinstance(pins, dict):
        return "not specified"
    mon = _html_escape(pins.get("mon", "—") or "—")
    wed = _html_escape(pins.get("wed", "—") or "—")
    fri = _html_escape(pins.get("fri", "—") or "—")
    return f"{mon} · {wed} · {fri}"


def _ped_orals_cell(oral_timing: dict) -> str:
    """Format oral_and_daily_timing as AM/PRE/PM/BED stacked lines (verbatim)."""
    ot = oral_timing or {}
    parts = []
    for slot_key, slot_label in (
        ("AM", "AM"),
        ("PRE_WORKOUT", "PRE"),
        ("PM", "PM"),
        ("BEDTIME", "BED"),
    ):
        val = ot.get(slot_key)
        if val and str(val).strip() and str(val).strip() != "—":
            parts.append(f"<strong>{slot_label}:</strong> {_html_escape(val)}")
    return "<br>".join(parts) if parts else "not specified"


def _html_ped_timeline(calc_result: list, protocol: dict, current_wk: int) -> str:
    """Build the PED Timeline section — verbatim weekly dosing from engine/JSON.

    Per-week grid: Wk | Phase | Test (M/W/F) | EQ | Deca | Tren | Orals | Bloodwork.
    Reads each engine row's 'ped_week' (None for week 0/1 → gap row), plus
    'ped_low_evidence_compounds' for the amber warning strip and the bloodwork
    schedule from the protocol JSON. EVERY dose printed comes from the doc or
    shows 'not specified'/'—' — no invention.
    """
    bloodwork = _ped_bloodwork_weeks(protocol)

    # Collect any low-evidence compounds flagged across the run (for the warning).
    low_ev: list = []
    ped_conf = None
    for r in calc_result[1:]:
        for c in (_w(r, "ped_low_evidence_compounds", default=[]) or []):
            if c not in low_ev:
                low_ev.append(c)
        if ped_conf is None:
            ped_conf = _w(r, "ped_confidence", default=None)

    warning_html = ""
    if low_ev:
        conf_str = f" Engine confidence: <strong>{_html_escape(ped_conf)}</strong>." if ped_conf else ""
        warning_html = f"""
  <div class="ped-warning-strip">
    <span class="ped-warning-icon">⚠</span>
    <span class="ped-warning-text"><strong>Low-evidence compounds in stack:</strong>
    {_html_escape(", ".join(str(c) for c in low_ev))}. Partition/fat-loss modifiers for these
    are weakly evidenced — treat their contribution as uncertain.{conf_str}</span>
  </div>"""

    rows_html = ""
    for r in calc_result[1:]:
        wn = r["week_number"]
        pw = _w(r, "ped_week", default=None)
        row_cls = "ped-current" if wn == current_wk else ""
        bw = bloodwork.get(wn)
        bw_cell = ""
        if bw:
            bw_cell = f"{_html_escape(bw.get('timing',''))} ({_html_escape(bw.get('cycle_day',''))})"
        if bw:
            row_cls = (row_cls + " ped-bloodwork").strip()

        if not pw:
            # Week 1 (and any week with no dosing table) — honest gap, no invention.
            rows_html += f"""
      <tr class="ped-gap-row {row_cls}">
        <td>{wn}</td>
        <td class="ped-phase-cell" colspan="6">No PED dosing table in protocol — baseline / ramp-in (cycle dosing begins Week 2)</td>
        <td>{bw_cell or '—'}</td>
      </tr>"""
            continue

        inj = pw.get("injectables_per_pin", {}) or {}
        rows_html += f"""
      <tr class="{row_cls}">
        <td>{wn}</td>
        <td class="ped-phase-cell">{_html_escape(pw.get('phase','—'))}</td>
        <td>{_ped_pin_cell(inj, 'Test')}</td>
        <td>{_ped_pin_cell(inj, 'EQ')}</td>
        <td>{_ped_pin_cell(inj, 'Deca')}</td>
        <td>{_ped_pin_cell(inj, 'Tren')}</td>
        <td class="ped-orals-cell">{_ped_orals_cell(pw.get('oral_and_daily_timing', {}))}</td>
        <td>{bw_cell or '—'}</td>
      </tr>"""

    # Source citation (verbatim from the weekly_timeline first entry, else label).
    src = ""
    tl = (protocol or {}).get("ped_protocol", {}).get("weekly_timeline", [])
    if tl:
        src = str(tl[0].get("source", ""))
    if not src:
        src = "03-ped-protocol — Week-by-Week Dose Checklists (per-pin Mon/Wed/Fri)"

    return f"""
<div class="ped-timeline-section">{warning_html}
  <table class="ped-table">
    <thead>
      <tr>
        <th>Wk</th><th>Phase</th>
        <th>Test (M·W·F)</th><th>EQ (M·W·F)</th><th>Deca (M·W·F)</th><th>Tren (M·W·F)</th>
        <th>Orals &amp; Daily Timing</th><th>Bloodwork Due</th>
      </tr>
    </thead>
    <tbody>{rows_html}
    </tbody>
  </table>
  <div class="ped-source-foot">Per-pin tokens are verbatim from the protocol doc — “—” means no pin that day · range tokens (e.g. 100–150mg) shown as-written · {_html_escape(src)}</div>
</div>"""


def _html_safety_strip(weeks: int) -> str:
    """Render the permanent PED safety strip (collapsible <details>, bottom).

    Per PRIME 2026-06-08 this is a collapsible <details>, default collapsed,
    positioned at the BOTTOM of the report (after the appendix, before </main>).
    This is the CORRECT current behavior — do NOT convert to an always-open div
    or move to the top. (The older docstrings referencing 'always-expanded' are
    stale; only the <details> behavior below is authoritative for HTML.)
    """
    # Bloodwork due weeks (council hard-gate: Wk 4, 8, 12)
    bloodwork_weeks = [w for w in [4, 8, 12] if w <= weeks]

    contras = _safety_contraindications_lines()
    electros = _electrolyte_lines()

    sections_html = ""

    # --- contraindications ---
    for title, items in contras:
        items_html = "\n".join(f"<li>{i}</li>" for i in items)
        sections_html += f"""
      <div class="safety-section">
        <div class="safety-section-title">{title}</div>
        <ul class="safety-list">{items_html}</ul>
      </div>"""

    # --- electrolyte protocol ---
    sections_html += '<div class="safety-electrolyte">'
    for title, items in electros:
        items_html = "\n".join(f"<li>{i}</li>" for i in items)
        sections_html += f"""
      <div class="safety-electrolyte-title">{title}</div>
      <ul class="safety-list">{items_html}</ul>"""
    sections_html += "</div>"

    # --- bloodwork ---
    bw_items = "".join(f"<li>Week {w} — full bloodwork panel due (lipids, LFTs, CBC, hormones)</li>" for w in bloodwork_weeks)
    bw_items += "<li>PCT reminder: plan post-cycle therapy BEFORE the final week</li>"
    bw_items += '<li><strong style="color:var(--red);">RED:</strong> If heart palpitations, fainting, chest pain, extreme weakness — STOP IMMEDIATELY</li>'
    bw_items += '<li><strong style="color:var(--warn);">YELLOW:</strong> Persistent nausea, severe dizziness, confusion — reduce cardio, contact physician</li>'
    sections_html += f"""
      <div class="safety-bloodwork">
        <div class="safety-bloodwork-title">BLOODWORK + PCT SCHEDULE</div>
        <ul class="safety-list">{bw_items}</ul>
      </div>"""

    return f"""
<details class="safety-details" id="safety-strip">
  <summary class="safety-summary">
    <span class="safety-summary-icon">⚠</span>
    <span class="safety-summary-title">PED Safety Protocol</span>
    <span class="safety-summary-sub">PCT · bloodwork Wk 4/8/12 · electrolytes · contraindications — click to expand</span>
  </summary>
  <div class="safety-body">{sections_html}</div>
</details>"""


# ---------------------------------------------------------------------------
# Coach's Pivots + Weekly Check-Off helpers (RENDERER-B)
#   Pivots  = engine week-over-week deltas (real changes) + doc conditional_rules
#             (IF/THEN coach directives). No new math — only fields already on
#             the progression rows.
#   Check-off = printable tickable list of the CURRENT week's foods (doc
#             sample_meal_plans), PED doses (engine ped_week) + daily tasks
#             (doc nutrition_critical_rules + engine cardio prescription).
#   Every line traces to an engine flag or a doc source — never invented.
# ---------------------------------------------------------------------------

def _meal_plan_for_day_type(protocol: dict, day_type: str) -> Optional[dict]:
    """Return the sample_meal_plans entry matching a day_type label, or None.

    Tolerant match: the meal-plan day_type labels are 'TRAINING DAY' / 'REST DAY'
    / 'PSMF DAY' / 'REFEED DAY'. Pure read — verbatim, no invention.
    """
    if not protocol:
        return None
    plans = protocol.get("nutrition", {}).get("sample_meal_plans", []) or []
    want = str(day_type).strip().upper()
    for p in plans:
        if str(p.get("day_type", "")).strip().upper() == want:
            return p
    return None


def _pivot_deltas(calc_result: list) -> list[dict]:
    """Compute week-over-week directional changes from engine rows (no new math).

    Each returned dict: {week, change (str), why (str)}. Only REAL changes between
    consecutive engine rows are emitted (training_calories, prescribed_cardio_*,
    correction_status, phase). The 'why' traces to an engine flag (correction_status
    / feasibility / residual_gap). Returns [] if nothing changed.
    """
    out: list[dict] = []
    rows = calc_result[1:]  # skip baseline week 0
    for i in range(1, len(rows)):
        prev, cur = rows[i - 1], rows[i]
        wn = cur["week_number"]
        changes: list[str] = []

        p_phase = _w(prev, "phase")
        c_phase = _w(cur, "phase")
        if p_phase and c_phase and p_phase != c_phase:
            changes.append(f"Phase {p_phase} → {c_phase}")

        p_tc = _w(prev, "training_calories")
        c_tc = _w(cur, "training_calories")
        if p_tc is not None and c_tc is not None and int(round(float(p_tc))) != int(round(float(c_tc))):
            arrow = "↓" if float(c_tc) < float(p_tc) else "↑"
            changes.append(f"Training kcal {_fmt_kcal(p_tc)} {arrow} {_fmt_kcal(c_tc)}")

        p_cs = int(_w(prev, "prescribed_cardio_sessions", default=0) or 0)
        c_cs = int(_w(cur, "prescribed_cardio_sessions", default=0) or 0)
        p_cm = int(_w(prev, "prescribed_cardio_min", default=0) or 0)
        c_cm = int(_w(cur, "prescribed_cardio_min", default=0) or 0)
        if (p_cs, p_cm) != (c_cs, c_cm):
            changes.append(f"Cardio {p_cs}×{p_cm}m → {c_cs}×{c_cm}m LISS")

        p_corr = _w(prev, "correction_status")
        c_corr = _w(cur, "correction_status")
        if p_corr and c_corr and p_corr != c_corr:
            changes.append(
                f"Correction {_correction_status_display(p_corr)} → {_correction_status_display(c_corr)}"
            )

        if not changes:
            continue

        # 'why' = engine flag for this week (correction_status / residual_gap).
        why_parts = []
        corr = _w(cur, "correction_status", default="on_track")
        narrative = _CORRECTION_NARRATIVE.get(str(corr), "")
        if narrative:
            why_parts.append(narrative)
        rg = _w(cur, "residual_gap", default=0.0)
        if float(rg or 0) > 1:
            why_parts.append(f"Residual gap {_fmt_kcal(rg)} kcal/wk flagged.")
        out.append({
            "week": wn,
            "change": "; ".join(changes),
            "why": " ".join(why_parts) if why_parts else "Re-solve from latest weigh-in (engine).",
        })
    return out


def _html_coach_pivots(calc_result: list, protocol: dict) -> str:
    """Build the Coach's Pivots panel — directional changes + IF/THEN triggers.

    Directional changes come from _pivot_deltas (real engine week-over-week
    changes). IF/THEN directives come verbatim from coach_pivots.conditional_rules
    (trigger/action/source). 'not specified'/empty-state handled. No invention.
    """
    deltas = _pivot_deltas(calc_result)
    cond_rules = (protocol or {}).get("coach_pivots", {}).get("conditional_rules", []) or []

    body = ""

    # --- Directional changes (engine week-over-week) ---
    if deltas:
        body += '<div class="pivots-group-title">Directional Changes — Engine Re-Solve History</div>'
        for d in deltas:
            body += f"""
      <div class="pivot-row">
        <div class="pivot-wk">Wk {d['week']}</div>
        <div class="pivot-body">
          <div class="pivot-change">{_html_escape(d['change'])}</div>
          <div class="pivot-why">{_html_escape(d['why'])}</div>
        </div>
      </div>"""
    else:
        body += ('<div class="pivots-empty">No week-over-week prescription changes yet — '
                 'the engine is holding the current protocol. Pivots appear here as calories, '
                 'cardio, phase or correction status shift.</div>')

    # --- IF/THEN coach directives (doc conditional_rules, verbatim) ---
    if cond_rules:
        body += '<div class="pivots-group-title">Coach Directives — IF / THEN Triggers</div>'
        for rule in cond_rules:
            trig = _fmt_macro_cell(rule.get("trigger"))
            act = _fmt_macro_cell(rule.get("action"))
            src = rule.get("source")
            src_html = f'<span class="pivot-src">{_html_escape(src)}</span>' if src else ""
            body += f"""
      <div class="pivot-ifthen">
        <div class="pivot-if">IF {_html_escape(trig)}</div>
        <div class="pivot-then">→ {_html_escape(act)}{src_html}</div>
      </div>"""

    return f"""
<div class="pivots-panel">{body}
</div>"""


def _checkoff_meals_items(meal_plan: Optional[dict]) -> list[str]:
    """Build food checkbox lines from a sample_meal_plans entry (verbatim).

    Each non-TOTAL meal → 'Meal (time): food — P/F/C/cal' from the doc strings.
    Missing plan → a single 'not specified' line. No invention.
    """
    if not meal_plan:
        return ["not specified — no sample meal plan for this day type in protocol"]
    items: list[str] = []
    for m in meal_plan.get("meals", []) or []:
        label = str(m.get("meal", "")).strip()
        if label.upper() == "TOTAL":
            continue
        food = str(m.get("food", "")).strip()
        macros = (
            f"{_fmt_macro_cell(m.get('protein'))}P / "
            f"{_fmt_macro_cell(m.get('fat'))}F / "
            f"{_fmt_macro_cell(m.get('carbs'))}C · "
            f"{_fmt_macro_cell(m.get('calories'))} cal"
        )
        food_str = f"{food} — " if food else ""
        items.append(f"<strong>{_html_escape(label)}:</strong> {_html_escape(food_str)}<span class=\"mono-sm\">{_html_escape(macros)}</span>")
    return items or ["not specified"]


def _checkoff_ped_items(ped_week: Optional[dict]) -> list[str]:
    """Build PED-dose checkbox lines from an engine ped_week entry (verbatim).

    One line per pin day (Mon/Wed/Fri) listing each injectable that is NOT '—',
    plus one line per non-empty oral_and_daily_timing slot. None / week-1 gap →
    a single honest 'not specified' line. No invention.
    """
    if not ped_week:
        return ["not specified — no PED dosing table for this week (baseline / ramp-in)"]
    items: list[str] = []
    inj = ped_week.get("injectables_per_pin", {}) or {}
    for day_key, day_label in (("mon", "Mon"), ("wed", "Wed"), ("fri", "Fri")):
        pins = []
        for compound, sched in inj.items():
            if not isinstance(sched, dict):
                continue
            dose = sched.get(day_key)
            if dose and str(dose).strip() and str(dose).strip() != "—":
                pins.append(f"{compound} {str(dose).strip()}")
        if pins:
            items.append(f"<strong>{day_label} pin:</strong> {_html_escape(' + '.join(pins))}")
    ot = ped_week.get("oral_and_daily_timing", {}) or {}
    for slot_key, slot_label in (("AM", "AM"), ("PRE_WORKOUT", "Pre-WO"), ("PM", "PM"), ("BEDTIME", "Bedtime")):
        val = ot.get(slot_key)
        if val and str(val).strip() and str(val).strip() != "—":
            items.append(f"<strong>{slot_label}:</strong> {_html_escape(str(val).strip())}")
    return items or ["not specified"]


def _checkoff_daily_tasks(row: dict, protocol: dict) -> list[str]:
    """Build daily-task checkbox lines from doc rules + the engine cardio row.

    Weigh-in + the doc's nutrition_critical_rules (verbatim) + the engine's
    prescribed cardio (sessions × min). No invention.
    """
    items: list[str] = ["<strong>Weigh-in</strong> + log weight/BF (track weekly average)"]
    c_sess = int(_w(row, "prescribed_cardio_sessions", default=0) or 0)
    c_min = int(_w(row, "prescribed_cardio_min", default=0) or 0)
    if c_sess > 0:
        items.append(f"<strong>Cardio:</strong> {c_sess} × {c_min} min LISS this week (fasted AM, HR &lt; 120 bpm)")
    rules = (protocol or {}).get("coach_pivots", {}).get("nutrition_critical_rules", []) or []
    for rule in rules:
        items.append(_html_escape(_fmt_macro_cell(rule)))
    if not rules:
        items.append("not specified — nutrition critical rules not in protocol")
    return items


def _html_weekly_checkoff(calc_result: list, protocol: dict, current_wk: int) -> str:
    """Build the printable Weekly Check-Off for the CURRENT week (and remaining).

    One tickable block per week from current_wk onward (☐ checkboxes): FOODS
    (doc sample_meal_plans by phase day-type) + PED DOSES (engine ped_week) +
    DAILY TASKS (doc rules + engine cardio). page-break-inside:avoid per block.
    Every value is doc/engine-sourced or 'not specified'.
    """
    rows = calc_result[1:]
    # Start at the current week (or week 1 if none logged yet); print to the end.
    start_wk = current_wk if current_wk and current_wk >= 1 else 1
    weeks_html = ""
    for r in rows:
        wn = r["week_number"]
        if wn < start_wk:
            continue
        phase_macros = _w(r, "macro_breakdown", default={}) or {}
        ped_week = _w(r, "ped_week", default=None)
        is_current = (wn == current_wk)
        cur_tag = ' <span style="color:var(--amber-d);">← current week</span>' if is_current else ""

        # FOODS — Training / Rest / PSMF day-type meal plans (doc verbatim)
        foods_html = ""
        for dt_label, dt_key in (("Training Day", "TRAINING DAY"), ("Rest Day", "REST DAY"), ("PSMF (Mon)", "PSMF DAY")):
            mp = _meal_plan_for_day_type(protocol, dt_key)
            items = _checkoff_meals_items(mp)
            items_html = "".join(
                f'<div class="checkoff-item"><span class="checkoff-box"></span>'
                f'<span class="checkoff-text">{it}</span></div>'
                for it in items
            )
            foods_html += (
                f'<div class="checkoff-group-title" style="margin-top:8px;">Foods — {dt_label}</div>'
                f'{items_html}'
            )

        # PED DOSES — engine ped_week (verbatim)
        ped_items = _checkoff_ped_items(ped_week)
        ped_html = "".join(
            f'<div class="checkoff-item"><span class="checkoff-box"></span>'
            f'<span class="checkoff-text">{it}</span></div>'
            for it in ped_items
        )

        # DAILY TASKS — doc rules + engine cardio
        task_items = _checkoff_daily_tasks(r, protocol)
        tasks_html = "".join(
            f'<div class="checkoff-item"><span class="checkoff-box"></span>'
            f'<span class="checkoff-text">{it}</span></div>'
            for it in task_items
        )

        weeks_html += f"""
  <div class="checkoff-week">
    <div class="checkoff-week-hd">Week {wn} Check-Off{cur_tag}</div>
    <div class="checkoff-group">{foods_html}</div>
    <div class="checkoff-group">
      <div class="checkoff-group-title">PED Doses to Take</div>
      {ped_html}
    </div>
    <div class="checkoff-group">
      <div class="checkoff-group-title">Daily Tasks</div>
      {tasks_html}
    </div>
  </div>"""

    if not weeks_html:
        weeks_html = '<div class="checkoff-week"><div class="pivots-empty">not specified — no remaining weeks to print.</div></div>'

    return f"""
<div class="checkoff-section">
  <div class="checkoff-head">
    <div class="checkoff-head-title">Weekly Check-Off — Print &amp; Tick</div>
    <div class="checkoff-head-sub">Foods · PED doses · daily tasks — one page per week · all items doc/engine-sourced</div>
  </div>{weeks_html}
</div>"""


def render_living_report_html(
    calc_result: list[dict],
    user_data: dict,
    actual_entries: Optional[list[dict]] = None,
    view: str = "weekly",
) -> str:
    """Render the Clinical Playbook Living Progress Report as a self-contained HTML string.

    Args:
        calc_result:    Output of predict_weight_loss() — list of weekly dicts (week 0..N).
        user_data:      Dict with keys: name, goal_weight, goal_bf, start_weight, start_bf,
                        age, height_feet, height_inches, cycle_name, weigh_in_days,
                        rmr_method (optional), lean_ceiling_lb (optional).
        actual_entries: Optional list of actual weigh-in dicts, each:
                        {"week": int, "weight": float, "bf": float, "date": str (optional)}.

    Returns:
        A self-contained HTML string (file:// compatible, CDN fonts/Chart.js).
    """
    if not calc_result:
        return "<html><body><p>No data.</p></body></html>"

    # Protocol reference (nutrition + PED JSON) — read ONCE via the engine's
    # single load-path. Missing/unparseable file → {} (every consumer falls
    # back to 'not specified'); never raises.
    protocol = get_protocol_reference() or {}

    weeks = len(calc_result) - 1  # week 0 is baseline
    baseline = calc_result[0]
    current_wk = _current_week(actual_entries)
    latest_act = _latest_actual(actual_entries)
    # Calendar-based current week (PRIME 2026-06-09 / control-system model): the
    # cut's current week is driven by TODAY vs the cycle start — not only by logged
    # weigh-ins. Weigh-ins mark COMPLETED weeks; the calendar says where we ARE.
    # Take the later of (latest weigh-in week, calendar week); clamp to [1, weeks].
    _sd_cur = user_data.get("start_date")
    try:
        if isinstance(_sd_cur, str):
            _sd_cur = datetime.strptime(_sd_cur[:10], "%Y-%m-%d").date()
        if _sd_cur is not None:
            _cal_wk = max(1, min(weeks, (date.today() - _sd_cur).days // 7 + 1))
            current_wk = max(current_wk, _cal_wk)
    except Exception:
        pass
    if current_wk < 1:
        current_wk = 1

    # User-data helpers
    name = user_data.get("name", "PRIME")
    goal_weight = user_data.get("goal_weight", _w(baseline, "weight", default=217))
    goal_bf = user_data.get("goal_bf", 13.0)
    start_weight = _w(baseline, "weight", default=267.0)
    start_bf = _w(baseline, "body_fat_percentage", default=39.2)
    age = user_data.get("age", "")
    ht_f = user_data.get("height_feet", 5)
    ht_i = user_data.get("height_inches", 9)
    cycle_name = user_data.get("cycle_name", "PRIME.TIME")
    weigh_days = user_data.get("weigh_in_days", "Mon / Thu / Sat")
    rmr_method = user_data.get("rmr_method", _w(baseline, "rmr_method", default="Cunningham"))
    lean_ceil = user_data.get("lean_ceiling_lb", _w(baseline, "lean_ceiling_lb", default=189))
    gen_date = date.today().strftime("%Y-%m-%d")

    # Current week's engine row (for the coach panel — the re-solved prescription)
    _cw = min(current_wk, weeks)
    cur_row = calc_result[_cw] if _cw < len(calc_result) else calc_result[-1]
    # "Now" weight/BF — use actual if available, else engine row
    now_weight = float(latest_act["weight"]) if latest_act else _w(cur_row, "weight", default=start_weight)
    now_bf = float(latest_act["bf"]) if latest_act else _w(cur_row, "body_fat_percentage", default=start_bf)
    now_date = latest_act.get("date", gen_date) if latest_act else gen_date

    # Required line at current week
    req_weight = _w(cur_row, "required_weight", default=None)
    req_bf = _w(cur_row, "required_bf", default=None)

    # Status
    wt_diff = (now_weight - req_weight) if req_weight is not None else None
    bf_diff = (now_bf - req_bf) if req_bf is not None else None
    weeks_remaining = weeks - current_wk

    # Correction status from the engine (the re-solved row)
    corr_status = _w(cur_row, "correction_status", default="on_track")
    residual_gap = _w(cur_row, "residual_gap", default=0.0)

    # Phase of current week
    cur_phase = _w(cur_row, "phase", default="RESET")
    rmr_val = _w(cur_row, "rmr", default=_w(baseline, "rmr", default=2180))
    tdee_val = _w(cur_row, "tdee", default=2830)

    # ── STATUS PILL TEXT ──
    if wt_diff is None:
        status_pill_text = "On Track"
    elif abs(wt_diff) < 0.5:
        status_pill_text = "On Track"
    elif wt_diff < 0:
        status_pill_text = f"AHEAD by {abs(wt_diff):.1f} lb"
    else:
        status_pill_text = f"BEHIND by {wt_diff:.1f} lb"

    # ── START-DATE string from baseline row ──
    start_date_str = _w(baseline, "date", default="")

    # ── TRACKER CELLS ──
    tracker_cells_html = ""
    for r in calc_result[1:]:  # skip week 0
        wn = r["week_number"]
        phase = _w(r, "phase", default="RESET")
        pcss = _PHASE_CSS.get(phase, "phase-reset")
        has_data = _actual_for_week(actual_entries, wn) is not None
        is_current = (wn == current_wk)
        classes = f"tracker-cell {pcss}"
        if has_data:
            classes += " has-data"
        if is_current:
            classes += " current"
        req_w_tt = _w(r, "required_weight", default="")
        tracker_cells_html += f'<div class="{classes}" title="Wk {wn} · {phase} · req {req_w_tt} lb">{wn}</div>\n'

    # ── CHART DATA ──
    planned_w = [_w(r, "required_weight", default=_w(r, "weight")) for r in calc_result]
    planned_bf = [_w(r, "required_bf", default=_w(r, "body_fat_percentage")) for r in calc_result]
    actual_w_arr = []
    actual_bf_arr = []
    for r in calc_result:
        wn = r["week_number"]
        act = _actual_for_week(actual_entries, wn)
        if wn == 0:
            actual_w_arr.append(round(start_weight, 1))
            actual_bf_arr.append(round(start_bf, 1))
        elif act:
            actual_w_arr.append(round(float(act["weight"]), 1))
            actual_bf_arr.append(round(float(act["bf"]), 1))
        else:
            actual_w_arr.append(None)
            actual_bf_arr.append(None)

    import json
    planned_w_js = json.dumps(planned_w)
    planned_bf_js = json.dumps(planned_bf)
    actual_w_js = json.dumps(actual_w_arr)
    actual_bf_js = json.dumps(actual_bf_arr)
    chart_labels_js = json.dumps(["Start"] + [f"Wk{i}" for i in range(1, weeks + 1)])
    # min/max for chart axes
    all_w = [x for x in actual_w_arr if x] + [x for x in planned_w if x]
    chart_y_min = int(min(all_w) - 5) if all_w else 210
    chart_y_max = int(max(all_w) + 10) if all_w else 275

    # ── COACH PANEL BULLETS ──
    train_cal = _w(cur_row, "training_calories", default="—")
    rest_cal = _w(cur_row, "rest_calories", default="—")
    psmf_cal = _w(cur_row, "psmf_calories", default="—")
    protein_g = _w(cur_row, "protein_g", default="—")
    carbs_g = _w(cur_row, "carbs_g", default="—")
    cardio_sess = _w(cur_row, "prescribed_cardio_sessions", default=0)
    cardio_min = _w(cur_row, "prescribed_cardio_min", default=0)
    lean_mass = _w(cur_row, "lean_mass", default=None)
    cal_floor = _w(cur_row, "calorie_floor", default=1200)

    # Coach directive sentence — narrates the engine's flags, no new math
    directive_parts = []
    if wt_diff is not None:
        if wt_diff > 0.5:
            directive_parts.append(f"You are <em>{wt_diff:.1f} lb behind the required line</em>")
        elif wt_diff < -0.5:
            directive_parts.append(f"You are <em>{abs(wt_diff):.1f} lb ahead of the required line</em>")
        else:
            directive_parts.append("You are <em>on the required line</em>")
    if bf_diff is not None:
        if bf_diff > 0.2:
            directive_parts.append(f"BF% is {bf_diff:.1f}% above target")
        elif bf_diff < -0.2:
            directive_parts.append(f"BF% is {abs(bf_diff):.1f}% ahead of target")
    if corr_status == "maxed_out" and residual_gap and float(residual_gap) > 1:
        directive_parts.append(f"a residual gap of {float(residual_gap):.0f} kcal/wk cannot be closed by diet or cardio alone — flagged")
    directive_parts.append("Re-solved prescription below is your updated protocol from this weigh-in.")
    directive_sentence = ". ".join(directive_parts) + "."

    coach_bullets = [
        ("Calories — Training / Rest / PSMF",
         f"Training days: <strong>{_fmt_kcal(train_cal)} kcal</strong> · "
         f"Rest days: <strong>{_fmt_kcal(rest_cal)} kcal</strong> · "
         f"PSMF: <strong>{_fmt_kcal(psmf_cal)} kcal</strong> (floor: {_fmt_kcal(cal_floor)} kcal — zero negotiation)"),
        ("Protein — Non-Negotiable",
         f"Hold at <strong>{_fmt_g(protein_g)}/day</strong>"
         + (f" · Carbs: <strong>{_fmt_g(carbs_g)}/day</strong>" if carbs_g and int(carbs_g) > 0 else "")
         + (f" · 1.4 g/lb lean mass ≈ {_fmt_g(protein_g)}" if lean_mass else "")),
        ("Prescribed Cardio — LISS",
         (f"<strong>{cardio_sess} session{'s' if int(cardio_sess) != 1 else ''} × {cardio_min} min</strong> LISS this week (fasted AM, HR &lt; 120 bpm)"
          if int(cardio_sess or 0) > 0 else "No additional cardio prescribed this week — diet levers are covering the deficit")),
        ("Correction Status",
         f"Engine flag: <strong>{_correction_status_display(corr_status)}</strong>. "
         + _CORRECTION_NARRATIVE.get(str(corr_status), "")
         + (f" Residual gap: <strong>{float(residual_gap):.0f} kcal/wk</strong>." if float(residual_gap or 0) > 1 else "")),
        ("Recheck Trigger",
         f"Re-weigh on next scheduled day. If still behind required line, add 1 LISS session before cutting calories further — floor is {_fmt_kcal(cal_floor)} kcal."),
    ]
    bullets_html = ""
    for i, (lbl, txt) in enumerate(coach_bullets, 1):
        border_style = ' style="border-bottom:none;"' if i == len(coach_bullets) else ""
        bullets_html += f"""
      <div class="cp-bullet"{border_style}>
        <div class="cb-num">{i}</div>
        <div class="cb-content">
          <div class="cb-label">{lbl}</div>
          <div class="cb-text">{txt}</div>
        </div>
      </div>"""

    # ── WEEK CARDS ──
    week_cards_html = ""
    for r in calc_result[1:]:
        wn = r["week_number"]
        phase = _w(r, "phase", default="RESET")
        pcss = _PHASE_CSS.get(phase, "phase-reset")
        pill_style = _PHASE_PILL_STYLE.get(phase, "")
        act = _actual_for_week(actual_entries, wn)
        is_current = (wn == current_wk)
        is_past = (wn < current_wk)

        req_w = _w(r, "required_weight")
        req_bf_wk = _w(r, "required_bf")
        train_c = _w(r, "training_calories")
        rest_c = _w(r, "rest_calories")
        psmf_c = _w(r, "psmf_calories")
        prot_g = _w(r, "protein_g")
        carbs_g_wk = _w(r, "carbs_g")
        c_sess = _w(r, "prescribed_cardio_sessions", default=0)
        c_min = _w(r, "prescribed_cardio_min", default=0)
        feas = _w(r, "feasibility", default="on_track")
        feas_label = _PHASE_FEASIBILITY_LABEL.get(feas, feas.upper() if feas else "")
        corr_s = _w(r, "correction_status", default="on_track")

        wk_start = _week_start_date(start_date_str, wn)
        wk_end = _week_end_date(start_date_str, wn)

        # ── Per-day-type macro breakdown (doc verbatim, anti-fabrication) ──
        mb = _w(r, "macro_breakdown", default={}) or {}
        _mb_t = mb.get("training_day", {}) or {}
        _mb_rd = mb.get("rest_day", {}) or {}
        _mb_p = mb.get("psmf_day", {}) or {}
        macro_carbs_cell = (
            f"{_fmt_macro_cell_html(_mb_t.get('carbs'))} / "
            f"{_fmt_macro_cell_html(_mb_rd.get('carbs'))} / "
            f"{_fmt_macro_cell_html(_mb_p.get('carbs'))}"
        )
        macro_fat_cell = (
            f"{_fmt_macro_cell_html(_mb_t.get('fat'))} / "
            f"{_fmt_macro_cell_html(_mb_rd.get('fat'))} / "
            f"{_fmt_macro_cell_html(_mb_p.get('fat'))}"
        )
        macro_prot_cell = (
            f"{_fmt_macro_cell_html(_mb_t.get('protein'))} / "
            f"{_fmt_macro_cell_html(_mb_rd.get('protein'))} / "
            f"{_fmt_macro_cell_html(_mb_p.get('protein'))}"
        )

        # ── Per-week PED transition note (doc key_transitions — source-cited) ──
        wk_transition_note = ""
        for _t in _ped_key_transitions(protocol):
            try:
                _t_wk = int(str(_t.get("week", "")).strip())
            except (TypeError, ValueError):
                continue
            if _t_wk == wn:
                _what = _html_escape(_t.get("what_changes", ""))
                _why = _html_escape(_t.get("why", ""))
                wk_transition_note = (
                    f'<div class="ped-transition-note"><strong>PED change this week:</strong> '
                    f'{_what} — {_why}</div>'
                )
                break

        # ── Progress photo embed (full card) — render act['photo'] verbatim ──
        #    Frontend supplies a data: URI (base64) OR an absolute file:// path.
        #    Constrain to data:/file:/http(s): only; otherwise keep placeholder
        #    (no fabricated/unsafe src). No photo → dashed placeholder slot.
        photo_html_full = (
            f'<div class="photo-slot"><span class="photo-slot-text">Progress photo · {wk_start}</span></div>'
        )
        pending_photo_html = (
            f'<div class="wk-pending-photo"><div class="wk-pending-photo-text">Photo slot · {wk_start}</div></div>'
        )
        if act and act.get("photo"):
            _ph = str(act["photo"]).strip()
            if _ph[:5] in ("data:", "file:") or _ph[:5] == "http:" or _ph[:6] == "https:":
                photo_html_full = (
                    f'<div class="photo-slot" style="height:auto;padding:0;border-style:solid;">'
                    f'<img src="{_html_escape(_ph)}" alt="Progress photo Wk {wn}" '
                    f'style="width:100%;height:auto;display:block;"/></div>'
                )
                pending_photo_html = (
                    f'<div class="wk-pending-photo" style="background:var(--white);">'
                    f'<img src="{_html_escape(_ph)}" alt="Progress photo Wk {wn}" '
                    f'style="width:140px;height:auto;display:block;"/></div>'
                )

        # Peak phase special styling
        if phase == "PEAK":
            pill_extra = "background:var(--red);color:#fff;"
            feas_extra = "color:var(--red);border-color:var(--red);background:rgba(163,0,15,0.08);"
        else:
            pill_extra = ""
            feas_extra = ""

        card_border = ""
        if is_current:
            card_border = " style=\"outline:2px solid var(--amber); outline-offset:-1px;\""
        elif wn == weeks:
            card_border = " style=\"border-color:var(--red);\""

        header_bg = ""
        if wn == weeks:
            header_bg = " style=\"background:var(--red);\""

        current_tag = ""
        if is_current:
            current_tag = " &nbsp;<span style=\"color:var(--amber);font-size:10px;font-weight:700;\">← CURRENT</span>"

        # ── Accordion wrap (PRIME 2026-06-09): weekly view = current week open,
        #    all others collapsed (click any to expand). blueprint view = all open.
        is_future = not (is_past or is_current)
        acc_open = " open" if (view == "blueprint" or is_current) else ""
        if is_current:
            _sum_badge = '<span class="acc-badge acc-cur">CURRENT</span>'
            _sum_detail = f'{phase} phase &middot; {wk_start}'
        elif is_past and act:
            _sum_badge = '<span class="acc-badge acc-done">DONE</span>'
            _sum_detail = f'logged {float(act["weight"]):.1f} lb ({_signed_delta(float(act["weight"]), req_w)} vs req)'
        elif is_past:
            _sum_badge = '<span class="acc-badge acc-miss">NO LOG</span>'
            _sum_detail = f'{phase} phase &middot; no weigh-in logged'
        else:
            _sum_badge = '<span class="acc-badge acc-proj">PROJECTED</span>'
            _sum_detail = f'target {_fmt_lb(req_w)} / {_fmt_pct(req_bf_wk)} &middot; re-solves at weigh-in'
        wk_summary = (
            f'<summary class="wk-summary"><span class="acc-wk">WK {wn}</span>'
            f'{_sum_badge}<span class="acc-detail">{_sum_detail}</span>'
            f'<span class="acc-chevron">&#9662;</span></summary>'
        )

        if is_past or is_current:
            # Full card with actuals
            act_weight = f"{float(act['weight']):.1f} lb" if act else "— (pending)"
            act_bf_str = f"{float(act['bf']):.1f}%" if act else "—"
            delta_w = _signed_delta(float(act["weight"]) if act else None, req_w)
            delta_bf = _signed_delta(float(act["bf"]) if act else None, req_bf_wk, "%")
            dw_cls = _delta_class(float(act["weight"]) if act else None, req_w)
            dbf_cls = _delta_class(float(act["bf"]) if act else None, req_bf_wk)
            wi_rows = ""
            # TODO: engine does not emit per-week weigh-in log (Mon/Thu/Sat entries);
            #       actual_entries only carries one entry per week. Display that entry as Mon report.
            if act:
                act_date_str = act.get("date", wk_start)
                wi_rows += f'<tr><td>{act_date_str}<span class="report-tag">REPORT</span></td><td>{float(act["weight"]):.1f} lb</td><td>{float(act["bf"]):.1f}%</td></tr>'
            wi_rows += f"<tr><td>{wk_end} (end)</td><td>—</td><td>—</td></tr>"

            coach_note_text = ""
            if corr_s == "on_track":
                coach_note_text = f"Week {wn}: prescribed calories met the required deficit. Continue protocol."
            elif corr_s == "pushing_limits":
                coach_note_text = f"Week {wn}: diet + cardio levers are near ceiling. Compliance is critical."
            elif corr_s == "maxed_out":
                coach_note_text = (f"Week {wn}: required deficit exceeds safe ceiling. "
                                   f"Residual gap: {_fmt_kcal(_w(r, 'residual_gap'))} kcal/wk — flagged.")

            card_html = f"""
    <div class="wk-card"{card_border}>
      <div class="wk-header"{header_bg}>
        <div class="wk-num">WK {wn}</div>
        <div class="wk-meta">
          <div class="wk-dates">{wk_start} – {wk_end}{current_tag}</div>
          <div class="wk-phase-label">{phase} Phase</div>
        </div>
        <div class="wk-feasibility" style="{feas_extra}">{feas_label}</div>
        <div class="wk-phase-pill" style="{pill_extra}{pill_style}">{phase}</div>
      </div>
      <div class="wk-body-full">
        <div class="wk-col-l">
          <div class="label" style="margin-bottom:8px;">Required Line vs. Actual</div>
          <table class="pva-table">
            <thead><tr><th>Metric</th><th>Required</th><th>Actual</th><th>Delta</th></tr></thead>
            <tbody>
              <tr><td>Weight (Mon)</td><td>{_fmt_lb(req_w)}</td><td>{act_weight}</td><td class="{dw_cls}">{delta_w}</td></tr>
              <tr><td>Body Fat</td><td>{_fmt_pct(req_bf_wk)}</td><td>{act_bf_str}</td><td class="{dbf_cls}">{delta_bf}</td></tr>
              <tr><td>Train kcal</td><td>{_fmt_kcal(train_c)}</td><td>—</td><td>—</td></tr>
              <tr><td>Rest kcal</td><td>{_fmt_kcal(rest_c)}</td><td>—</td><td>—</td></tr>
              <tr><td>PSMF kcal</td><td>{_fmt_kcal(psmf_c)}</td><td>—</td><td>—</td></tr>
              <tr><td>Protein</td><td>{_fmt_g(prot_g)}</td><td>—</td><td>—</td></tr>
              <tr><td>Protein (T/R/PSMF)</td><td class="macro-multi">{macro_prot_cell}</td><td>—</td><td>—</td></tr>
              <tr><td>Carbs (T/R/PSMF)</td><td class="macro-multi">{macro_carbs_cell}</td><td>—</td><td>—</td></tr>
              <tr><td>Fat (T/R/PSMF)</td><td class="macro-multi">{macro_fat_cell}</td><td>—</td><td>—</td></tr>
              {f'<tr><td>Cardio</td><td>{int(c_sess or 0)} × {int(c_min or 0)} min LISS</td><td>—</td><td>—</td></tr>' if int(c_sess or 0) > 0 else ''}
            </tbody>
          </table>
          <div class="label" style="margin:12px 0 8px;">Weigh-In Log</div>
          <table class="wi-table">
            <thead><tr><th>Date</th><th>Weight</th><th>BF%</th></tr></thead>
            <tbody>{wi_rows}</tbody>
          </table>
        </div>
        <div class="wk-col-r">
          <div class="label" style="margin-bottom:6px;">Progress Photo</div>
          {photo_html_full}
          <div class="label" style="margin:10px 0 6px;">Coach Note</div>
          <div class="coach-note">{coach_note_text}</div>
          {wk_transition_note}
        </div>
      </div>
    </div>"""
        else:
            # Pending card (future weeks)
            card_html = f"""
    <div class="wk-card"{card_border}>
      <div class="wk-header"{header_bg}>
        <div class="wk-num">WK {wn}</div>
        <div class="wk-meta">
          <div class="wk-dates">{wk_start} – {wk_end}</div>
          <div class="wk-phase-label">{phase} Phase</div>
        </div>
        <div class="wk-feasibility" style="{feas_extra}">{feas_label}</div>
        <div class="wk-phase-pill" style="{pill_extra}{pill_style}">{phase}</div>
      </div>
      <div class="wk-body-pending">
        <div class="proj-banner">PROJECTED &mdash; re-solves at your next weigh-in; these targets are estimates until logged.</div>
        <div class="wk-pending-table">
          <table class="pva-table">
            <thead><tr><th>Metric</th><th>Re-solved Target</th><th>Actual</th></tr></thead>
            <tbody>
              <tr><td>Weight target</td><td class="mono-sm">{_fmt_lb(req_w)}</td><td style="color:var(--ink-3);font-family:'IBM Plex Mono',monospace;text-align:right;">— pending</td></tr>
              <tr><td>Body Fat target</td><td class="mono-sm">{_fmt_pct(req_bf_wk)}</td><td style="color:var(--ink-3);font-family:'IBM Plex Mono',monospace;text-align:right;">— pending</td></tr>
              <tr><td>Calorie intake</td><td class="mono-sm" style="font-style:italic;color:var(--teal);">re-solves at weigh-in</td><td style="color:var(--ink-3);font-family:'IBM Plex Mono',monospace;text-align:right;">— not set</td></tr>
              <tr><td>Protein target</td><td class="mono-sm">{_fmt_g(prot_g)}</td><td style="color:var(--ink-3);font-family:'IBM Plex Mono',monospace;text-align:right;">— pending</td></tr>
              <tr><td>Protein (T/R/PSMF)</td><td class="mono-sm">{macro_prot_cell}</td><td style="color:var(--ink-3);font-family:'IBM Plex Mono',monospace;text-align:right;">— pending</td></tr>
              <tr><td>Carbs (T/R/PSMF)</td><td class="mono-sm">{macro_carbs_cell}</td><td style="color:var(--ink-3);font-family:'IBM Plex Mono',monospace;text-align:right;">— pending</td></tr>
              <tr><td>Fat (T/R/PSMF)</td><td class="mono-sm">{macro_fat_cell}</td><td style="color:var(--ink-3);font-family:'IBM Plex Mono',monospace;text-align:right;">— pending</td></tr>
              {f'<tr><td>Cardio prescription</td><td class="mono-sm">{int(c_sess or 0)} × {int(c_min or 0)} min LISS</td><td style="color:var(--ink-3);font-family:IBM Plex Mono,monospace;text-align:right;">— pending</td></tr>' if int(c_sess or 0) > 0 else ''}
            </tbody>
          </table>
          {wk_transition_note}
        </div>
        {pending_photo_html}
      </div>
    </div>"""
        week_cards_html += (
            f'\n    <details class="wk-acc"{acc_open}>{wk_summary}{card_html}\n    </details>'
        )

    # ── PED TIMELINE SECTION (built outside the main f-string to avoid
    #    brace-escaping issues; interpolated as {ped_timeline_html} above the
    #    week cards) ──
    ped_timeline_html = _html_ped_timeline(calc_result, protocol, current_wk)

    # ── COACH'S PIVOTS + WEEKLY CHECK-OFF (RENDERER-B) — built outside the main
    #    f-string (brace-escaping safety) and interpolated as plain variables ──
    pivots_html = _html_coach_pivots(calc_result, protocol)
    checkoff_html = _html_weekly_checkoff(calc_result, protocol, current_wk)

    # ── CLINICAL DATA SECTIONS ──
    lean_mass_start = start_weight * (1 - start_bf / 100)
    fat_mass_start = start_weight * (start_bf / 100)
    lean_mass_now = now_weight * (1 - now_bf / 100)
    fat_mass_now = now_weight * (now_bf / 100)
    goal_fat_mass = goal_weight * (goal_bf / 100)
    fat_still_to_lose = max(0.0, fat_mass_now - goal_fat_mass)

    # Last week of engine for final predicted results
    last_row = calc_result[-1]
    pred_end_weight = _w(last_row, "weight")
    pred_end_bf = _w(last_row, "body_fat_percentage")

    # weekly avg weight loss (engine: total_weight_lost / week_number)
    total_lost = _w(last_row, "total_weight_lost", default=0)
    avg_wk_loss = total_lost / weeks if weeks > 0 else 0

    peak_weeks = [r for r in calc_result[1:] if _w(r, "phase") == "PEAK"]

    # ── ASSEMBLE HTML ──
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1200" />
<title>Ap³xFit · Clinical Playbook — Living Progress Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Archivo+Narrow:ital,wght@0,400;0,600;0,700;0,800;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=Inter+Tight:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<style>{_CSS}</style>
</head>
<body>

<header class="header-band">
  <div class="header-inner">
    <div class="header-left">
      <div>
        <div class="brand-row">
          <span class="brand-logo">AP&#xB3;XFIT</span>
          <div class="brand-sep"></div>
          <span class="brand-sub">Living Progress Report</span>
        </div>
        <div class="header-report-title">Clinical Playbook · {weeks}-Week Recomposition Cut · Full Report</div>
        <div class="cycle-label">{cycle_name}</div>
      </div>
      <div>
        <div class="athlete-row">
          <span class="athlete-name">{name}</span>
          <div class="athlete-stats">
            {f'<span class="ath-stat">{age} yrs</span>' if age else ''}
            <span class="ath-stat">{ht_f}′ {ht_i}″</span>
            <span class="ath-stat">Goal {goal_weight:.0f} lb @ {goal_bf:.0f}% BF</span>
            <span class="ath-stat">{weeks}-wk CUT</span>
            <span class="ath-stat">{weigh_days}</span>
          </div>
        </div>
        <div class="cadence-tag">Full report — generated on the week's first weigh-in · Thu/Sat = AI Coach check-ins</div>
      </div>
    </div>
    <div class="header-right">
      <div class="week-num">{current_wk if current_wk > 0 else 1}</div>
      <div class="week-of">of {weeks}</div>
      <div class="phase-badge">{cur_phase}</div>
    </div>
  </div>
</header>

<div class="dynamic-note">
  <div class="dynamic-note-text">
    <strong>Re-solved as of {now_date} weigh-in.</strong>
    Every number in this report — calories, required weight, cardio prescription, deficit — is the
    <strong>current re-solved prescription from your latest actual weigh-in ({now_weight:.1f} lb / {now_bf:.1f}% BF)</strong>,
    not a static plan. The engine re-built the entire remaining trajectory from that data point to the fixed deadline.
  </div>
</div>

<div class="goal-strip">
  <span class="goal-label">Objective</span>
  <span class="goal-text">Target <strong>{goal_weight:.0f} lb @ {goal_bf:.0f}% BF</strong></span>
  <div class="goal-sep"></div>
  <span class="goal-text">Start <strong>{start_weight:.1f} lb / {start_bf:.1f}%</strong></span>
  <div class="goal-sep"></div>
  <span class="goal-text">Protocol <strong>{weeks}-week aggressive cut</strong></span>
  <div class="goal-sep"></div>
  <span class="goal-text">Weigh-ins <strong>{weigh_days}</strong></span>
</div>

<div class="tracker-wrap">
  <div class="tracker-header">
    <span class="tracker-title">{weeks}-Week Progress Tracker</span>
    <span class="tracker-caption">Phase · photo-on-file dot · current week outlined · all targets re-solved from latest weigh-in</span>
  </div>
  <div class="tracker-strip">
{tracker_cells_html}
  </div>
  <div class="tracker-legend">
    <div class="tleg"><div class="tleg-dot" style="background:rgba(107,127,143,.4);"></div>RESET (Wk 1–4)</div>
    <div class="tleg"><div class="tleg-dot" style="background:rgba(245,158,11,.5);"></div>ADAPT (Wk 5–8)</div>
    <div class="tleg"><div class="tleg-dot" style="background:rgba(15,124,138,.45);"></div>CYCLE (Wk 9–12)</div>
    <div class="tleg"><div class="tleg-dot" style="background:rgba(163,0,15,.35);"></div>PEAK (Wk 13–16)</div>
    <div class="tleg"><div class="tleg-dot" style="background:var(--amber);border-radius:50%;"></div>Weigh-in data on file</div>
    <div class="tleg"><div class="tleg-dot" style="outline:2px solid var(--amber);background:transparent;"></div>Current week</div>
  </div>
</div>

<div class="main">

<!-- ── STATUS SUMMARY ── -->
<div>
  <div class="section-head">
    <span class="section-label">Status Summary</span>
    <div class="section-rule"></div>
    <span class="section-label">Week {current_wk} of {weeks}</span>
  </div>
  <div class="summary-grid">
    <div class="summary-cell">
      <div class="sc-label">Baseline · Wk 0</div>
      <div class="sc-main mono">{start_weight:.1f}<span style="font-size:14px;font-weight:300"> lb</span></div>
      <div class="sc-sub">{start_bf:.1f}% BF · {lean_mass_start:.1f} lb lean</div>
    </div>
    <div class="summary-cell">
      <div class="sc-label">Now · Wk {current_wk} Actual</div>
      <div class="sc-main mono">{now_weight:.1f}<span style="font-size:14px;font-weight:300"> lb</span></div>
      <div class="sc-sub {"delta-pos" if now_weight < start_weight else ""}">
        {"▼" if now_weight < start_weight else "▲"} {abs(now_weight - start_weight):.1f} lb &nbsp;·&nbsp;
        {"▼" if now_bf < start_bf else "▲"} {abs(now_bf - start_bf):.1f}% BF
      </div>
    </div>
    <div class="summary-cell">
      <div class="sc-label">vs. Required Line</div>
      <div class="sc-main mono" style="font-size:20px;padding-top:3px;color:var({'--green' if wt_diff is None or wt_diff <= 0 else '--warn'});">
        {f'{abs(wt_diff):.1f} lb {"ahead" if wt_diff and wt_diff < 0 else "behind"}' if wt_diff is not None else '— baseline'}
      </div>
      <div class="sc-sub {"delta-pos" if bf_diff is not None and bf_diff < 0 else "delta-warn" if bf_diff is not None and bf_diff > 0 else ""}">
        {f'BF% {"▼" if bf_diff and bf_diff < 0 else "▲"} {abs(bf_diff):.1f}% vs req {req_bf:.1f}%' if bf_diff is not None and req_bf is not None else '—'}
      </div>
    </div>
    <div class="summary-cell">
      <div class="sc-label">Goal Status</div>
      <div class="sc-main">{goal_weight:.0f} lb / {goal_bf:.0f}%</div>
      <div class="sc-sub">{weeks_remaining} weeks remaining</div>
      <div class="status-pill">{status_pill_text}</div>
    </div>
  </div>
</div>

<!-- ── TRAJECTORY CHART ── -->
<div>
  <div class="section-head">
    <span class="section-label">Trajectory</span>
    <div class="section-rule"></div>
    <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ink-3);">Required line (teal dashed) · Actual (amber dots) · BF% (right axis)</span>
  </div>
  <div class="chart-wrap">
    <div class="chart-head">
      <span class="chart-title">{weeks}-Week Weight + BF% Trajectory — Re-solved from Latest Weigh-in</span>
      <span class="chart-caption">Required line updates after every weigh-in · engine is the single source of truth</span>
    </div>
    <div class="chart-body">
      <div class="chart-legend">
        <div class="cl-item"><div class="cl-line" style="background:var(--teal);border-top:2px dashed var(--teal);"></div> Required Weight</div>
        <div class="cl-item"><div class="cl-line" style="background:var(--amber);"></div> Actual Weight</div>
        <div class="cl-item"><div class="cl-line" style="background:var(--red);border-top:2px dashed var(--red);"></div> Required BF%</div>
        <div class="cl-item"><div class="cl-line" style="background:rgba(163,0,15,.55);"></div> Actual BF%</div>
      </div>
      <canvas id="trajChart" height="220"></canvas>
    </div>
  </div>
</div>

<!-- ── AI COACH PANEL ── -->
<div>
  <div class="section-head">
    <span class="section-label">AI Coach — Week {current_wk if current_wk > 0 else 1} Prescription</span>
    <div class="section-rule"></div>
  </div>
  <div class="coach-panel">
    <div class="cp-header">
      <div class="cp-eyebrow">Re-Solved Prescription · Weigh-in {now_date}</div>
      <div class="cp-title">COACH'S DIRECTIVES</div>
    </div>
    <div class="cp-directive">{directive_sentence}</div>
    <div class="cp-bullets">{bullets_html}</div>
    <div class="cp-footer">
      <div class="cpf-item"><div class="cpf-label">Goal</div><div class="cpf-val">CUT</div></div>
      <div class="cpf-sep"></div>
      <div class="cpf-item"><div class="cpf-label">RMR Method</div><div class="cpf-val">{rmr_method}</div></div>
      <div class="cpf-sep"></div>
      <div class="cpf-item"><div class="cpf-label">RMR</div><div class="cpf-val">{_fmt_kcal(rmr_val)} kcal</div></div>
      <div class="cpf-sep"></div>
      <div class="cpf-item"><div class="cpf-label">TDEE est.</div><div class="cpf-val">{_fmt_kcal(tdee_val)} kcal</div></div>
      <div class="cpf-sep"></div>
      <div class="cpf-item"><div class="cpf-label">Lean Ceiling</div><div class="cpf-val">{lean_ceil} lb</div></div>
    </div>
  </div>
</div>

<!-- ── COACH'S PIVOTS (directional changes + IF/THEN triggers) ── -->
<div>
  <div class="section-head">
    <span class="section-label">Coach's Pivots — Directional Changes &amp; Triggers</span>
    <div class="section-rule"></div>
    <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ink-3);">Engine week-over-week re-solves · doc IF/THEN coach directives · every change traces to a flag or source</span>
  </div>
  {pivots_html}
</div>

<!-- ── PED TIMELINE (doc-sourced weekly dosing schedule) ── -->
<div>
  <div class="section-head">
    <span class="section-label">PED Timeline</span>
    <div class="section-rule"></div>
    <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ink-3);">Weeks 2–{weeks} per-pin dosing · Wk 1 = baseline ramp-in (no dosing table) · all doses verbatim from protocol</span>
  </div>
  {ped_timeline_html}
</div>

<!-- ── WEEK-BY-WEEK ── -->
<div>
  <div class="section-head">
    <span class="section-label">Your Weeks</span>
    <div class="section-rule"></div>
    <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ink-3);">Current week open &middot; completed = logged &middot; future = projected (re-solves each weigh-in) &middot; click any week to expand</span>
  </div>
  <div class="week-cards">
{week_cards_html}
  </div>
</div>

<!-- ── PRINTABLE WEEKLY CHECK-OFF (foods + PED doses + daily tasks) ── -->
<div>
  <div class="section-head">
    <span class="section-label">Weekly Check-Off (Print)</span>
    <div class="section-rule"></div>
    <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ink-3);">Tickable on paper · current week first · foods (doc) · PED doses (engine) · daily tasks</span>
  </div>
  {checkoff_html}
</div>

<!-- ── CLINICAL DATA ── -->
<div>
  <div class="section-head">
    <span class="section-label">Clinical Data</span>
    <div class="section-rule"></div>
  </div>
  <div class="data-2col" style="gap:16px;">
    <div class="data-section">
      <div class="ds-head"><span class="ds-title">Metabolic Profile</span><span class="ds-rule"></span><span class="label-teal">{rmr_method}</span></div>
      <div class="ds-body">
        <div class="metric-row"><div class="metric-key">RMR ({rmr_method})</div><div class="metric-val teal-stat">{_fmt_kcal(rmr_val)} kcal</div></div>
        <div class="metric-row"><div class="metric-key">TDEE est.</div><div class="metric-val">{_fmt_kcal(tdee_val)} kcal</div></div>
        <div class="metric-row"><div class="metric-key">TEF (est. 10% of intake)</div><div class="metric-val">{_fmt_kcal(_w(cur_row, "tef", default=None))} kcal</div></div>
        <div class="metric-row"><div class="metric-key">NEAT est.</div><div class="metric-val">{_fmt_kcal(_w(cur_row, "neat", default=None))} kcal</div></div>
        <div class="metric-row"><div class="metric-key">Calorie floor (PSMF)</div><div class="metric-val delta-warn">{_fmt_kcal(cal_floor)} kcal (hard)</div></div>
        <div class="metric-row"><div class="metric-key">Lean mass (current est.)</div><div class="metric-val">{lean_mass_now:.1f} lb</div></div>
        <div class="metric-row"><div class="metric-key">Lean ceiling (proven)</div><div class="metric-val teal-stat">{lean_ceil} lb</div></div>
      </div>
    </div>
    <div class="data-section">
      <div class="ds-head"><span class="ds-title">Body Composition Changes</span><span class="ds-rule"></span></div>
      <div class="ds-body">
        <div class="metric-row"><div class="metric-key">Start fat mass</div><div class="metric-val">{fat_mass_start:.1f} lb ({start_bf:.1f}%)</div></div>
        <div class="metric-row"><div class="metric-key">Current fat mass est.</div><div class="metric-val delta-pos">{fat_mass_now:.1f} lb ({now_bf:.1f}%)</div></div>
        <div class="metric-row"><div class="metric-key">Fat lost to date</div><div class="metric-val delta-pos">▼ {max(0, fat_mass_start - fat_mass_now):.1f} lb</div></div>
        <div class="metric-row"><div class="metric-key">Start lean mass</div><div class="metric-val">{lean_mass_start:.1f} lb</div></div>
        <div class="metric-row"><div class="metric-key">Current lean mass est.</div><div class="metric-val">{lean_mass_now:.1f} lb</div></div>
        <div class="metric-row"><div class="metric-key">Lean mass change</div><div class="metric-val {('delta-pos' if lean_mass_now >= lean_mass_start else 'delta-warn')}">{'+' if lean_mass_now >= lean_mass_start else ''}{lean_mass_now - lean_mass_start:.1f} lb</div></div>
        <div class="metric-row"><div class="metric-key">Goal fat mass ({goal_bf:.0f}%)</div><div class="metric-val">{goal_fat_mass:.1f} lb</div></div>
        <div class="metric-row"><div class="metric-key">Fat still to lose</div><div class="metric-val delta-warn">{fat_still_to_lose:.1f} lb remaining</div></div>
      </div>
    </div>
  </div>
</div>

<div class="data-2col" style="gap:16px;">
  <div class="data-section">
    <div class="ds-head"><span class="ds-title">Predicted Results (Engine)</span><span class="ds-rule"></span></div>
    <div class="ds-body">
      <div class="metric-row"><div class="metric-key">Avg weekly weight loss</div><div class="metric-val">~{avg_wk_loss:.1f} lb/wk (total run)</div></div>
      <div class="metric-row"><div class="metric-key">Time to goal (at deadline)</div><div class="metric-val">{weeks_remaining} weeks remaining</div></div>
      <div class="metric-row"><div class="metric-key">Projected end weight</div><div class="metric-val">{_fmt_lb(pred_end_weight)}</div></div>
      <div class="metric-row"><div class="metric-key">Projected end BF%</div><div class="metric-val">{_fmt_pct(pred_end_bf)}</div></div>
      <div class="metric-row"><div class="metric-key">Lean ceiling</div><div class="metric-val delta-pos">{lean_ceil} lb (proven ceiling)</div></div>
    </div>
  </div>
  <div class="data-section">
    <div class="ds-head"><span class="ds-title">Input Parameters</span><span class="ds-rule"></span><span class="label">Engine calibration</span></div>
    <div class="ds-body">
      <div class="data-2col" style="gap:12px;">
        <div>
          <div class="metric-row"><div class="metric-key">Start weight</div><div class="metric-val">{start_weight:.1f} lb</div></div>
          <div class="metric-row"><div class="metric-key">Start BF%</div><div class="metric-val">{start_bf:.1f}%</div></div>
          <div class="metric-row"><div class="metric-key">Goal weight</div><div class="metric-val">{goal_weight:.0f} lb</div></div>
          <div class="metric-row"><div class="metric-key">Goal BF%</div><div class="metric-val">{goal_bf:.0f}%</div></div>
        </div>
        <div>
          <div class="metric-row"><div class="metric-key">Protocol</div><div class="metric-val">{weeks}-week CUT</div></div>
          <div class="metric-row"><div class="metric-key">RMR formula</div><div class="metric-val teal-stat">{rmr_method}</div></div>
          <div class="metric-row"><div class="metric-key">PSMF floor</div><div class="metric-val">{_fmt_kcal(cal_floor)} kcal</div></div>
          <div class="metric-row"><div class="metric-key">Protein minimum</div><div class="metric-val">237 g/day</div></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ── APPENDIX ── -->
<details>
  <summary>Appendix — Methodology, Explainers &amp; Code Reference</summary>
  <div class="appendix-body">
    <div class="appendix-section">
      <div class="appendix-title">Understanding Your Numbers</div>
      <div class="appendix-text">
        <strong>RMR ({rmr_method}):</strong> The {rmr_method} equation uses measured lean body mass as its
        primary input, making it significantly more accurate than Harris-Benedict or Mifflin-St Jeor.
        Formula (Cunningham): RMR = 500 + (22 × LBM in kg). Current LBM: {lean_mass_now:.1f} lb ({lean_mass_now / 2.205:.1f} kg)
        → RMR ≈ {500 + 22 * (lean_mass_now / 2.205):.0f} kcal.<br><br>
        <strong>TDEE:</strong> Total Daily Energy Expenditure = RMR × activity multiplier + TEF + NEAT.
        Moderate activity (3×/week) ≈ 1.3× RMR.<br><br>
        <strong>PSMF:</strong> A Monday protocol of ~{_fmt_kcal(psmf_cal)} kcal composed primarily of lean protein
        to accelerate fat oxidation while preserving lean mass. The {_fmt_kcal(cal_floor)} kcal floor is a hard limit.
      </div>
    </div>
    <div class="appendix-section">
      <div class="appendix-title">Phase Structure Rationale</div>
      <div class="appendix-text">
        <strong>RESET (Wk 1–4):</strong> Establish baseline compliance, purge glycogen and excess water.<br>
        <strong>ADAPT (Wk 5–8):</strong> True fat-loss phase. Deficit tightens. Cardio added if fat-loss rate under plan.<br>
        <strong>CYCLE (Wk 9–12):</strong> Hormonal reset. Leptin, T3, cortisol normalize. Scale may rise 2–4 lb from glycogen refill — expected.<br>
        <strong>PEAK (Wk 13–16):</strong> Deepest deficit. Protein at maximum. Cardio at maximum. 4 weeks only to minimize muscle loss risk.
      </div>
    </div>
    <div class="appendix-section">
      <div class="appendix-title">Calorie Taper Logic</div>
      <div class="appendix-text">
        Training calories are MONOTONICALLY TAPERED — contest prep never lets prescribed calories rise.
        The solver re-derives each week's numbers from the required fat loss, the Alpert fat-oxidation ceiling
        (×1.4 PED factor), and the remaining weeks to deadline. PSMF floor = {_fmt_kcal(cal_floor)} kcal throughout.
      </div>
    </div>
    <div class="appendix-section">
      <div class="appendix-title">Engine Reference</div>
      <div class="appendix-text">
        Calculation engine: <code>new_prime_python_code/PRIME_Calculations.py</code> →
        <code>predict_weight_loss()</code> + <code>build_contest_trajectory()</code> +
        <code>solve_weekly_prescription()</code>. Report renderer: <code>new_prime_python_code/PRIME_Living_Report.py</code>.
        Coach knowledge: <code>python-api/coach_knowledge.py</code>.
      </div>
    </div>
  </div>
</details>

<!-- ── PED SAFETY PROTOCOL (collapsible, bottom — per PRIME 2026-06-08) ── -->
{_html_safety_strip(weeks)}

</div><!-- /main -->

<footer class="report-footer">
  <div class="footer-brand">Ap&#xB3;xFit Clinical Playbook</div>
  <div class="footer-cadence">Full report generates on Monday (first weigh-in of week) · Thu/Sat = AI Coach check-ins · Every number re-solved from latest weigh-in</div>
  <div class="footer-meta">{cycle_name} · generated {gen_date} · Wk {current_wk} of {weeks}</div>
</footer>

<script>
(function() {{
  const plannedW  = {planned_w_js};
  const actualW   = {actual_w_js};
  const plannedBF = {planned_bf_js};
  const actualBF  = {actual_bf_js};
  const labels    = {chart_labels_js};

  const ctx = document.getElementById('trajChart').getContext('2d');
  new Chart(ctx, {{
    data: {{
      labels,
      datasets: [
        {{
          type: 'line', label: 'Required Weight (lb)', data: plannedW,
          borderColor: '#0f7c8a', borderDash: [5,4], borderWidth: 2,
          pointRadius: 2, pointBackgroundColor: '#0f7c8a',
          fill: false, yAxisID: 'y', tension: 0.3,
        }},
        {{
          type: 'line', label: 'Actual Weight (lb)', data: actualW,
          borderColor: '#f59e0b', borderWidth: 2.5,
          pointRadius: (ctx) => actualW[ctx.dataIndex] !== null ? 5 : 0,
          pointBackgroundColor: '#f59e0b', pointBorderColor: '#14181d', pointBorderWidth: 1.5,
          fill: false, yAxisID: 'y', tension: 0.2, spanGaps: false,
        }},
        {{
          type: 'line', label: 'Required BF%', data: plannedBF,
          borderColor: '#a3000f', borderDash: [4,3], borderWidth: 1.5,
          pointRadius: 1.5, pointBackgroundColor: '#a3000f',
          fill: false, yAxisID: 'y2', tension: 0.3,
        }},
        {{
          type: 'line', label: 'Actual BF%', data: actualBF,
          borderColor: 'rgba(163,0,15,.6)', borderWidth: 2,
          pointRadius: (ctx) => actualBF[ctx.dataIndex] !== null ? 4 : 0,
          pointBackgroundColor: 'rgba(163,0,15,.7)',
          fill: false, yAxisID: 'y2', tension: 0.2, spanGaps: false,
        }},
      ]
    }},
    options: {{
      responsive: true,
      interaction: {{ mode: 'index', intersect: false }},
      plugins: {{ legend: {{ display: false }}, tooltip: {{ callbacks: {{ label(ctx) {{
        if (ctx.parsed.y === null) return null;
        const u = ctx.datasetIndex < 2 ? ' lb' : '%';
        return ctx.dataset.label + ': ' + ctx.parsed.y + u;
      }} }} }} }},
      scales: {{
        x: {{ grid: {{ color: 'rgba(0,0,0,.05)' }}, ticks: {{ font: {{ family: "'IBM Plex Mono',monospace", size: 10 }}, color: '#6b7f8f' }} }},
        y: {{
          position: 'left',
          title: {{ display: true, text: 'Weight (lb)', font: {{ family: "'IBM Plex Mono',monospace", size: 10 }}, color: '#0f7c8a' }},
          grid: {{ color: 'rgba(0,0,0,.06)' }},
          ticks: {{ font: {{ family: "'IBM Plex Mono',monospace", size: 10 }}, color: '#6b7f8f' }},
          min: {chart_y_min}, max: {chart_y_max},
        }},
        y2: {{
          position: 'right',
          title: {{ display: true, text: 'BF%', font: {{ family: "'IBM Plex Mono',monospace", size: 10 }}, color: '#a3000f' }},
          grid: {{ display: false }},
          ticks: {{ font: {{ family: "'IBM Plex Mono',monospace", size: 10 }}, color: '#a3000f', callback: v => v + '%' }},
          min: 10, max: 45,
        }},
      }}
    }}
  }});
}})();
</script>

</body>
</html>"""

    return html


# ============================================================================
# MARKDOWN RENDERER
# ============================================================================

def _md_ped_pin_cell(injectables: dict, compound: str) -> str:
    """Markdown variant of _ped_pin_cell — 'mon · wed · fri' verbatim (no escape)."""
    pins = (injectables or {}).get(compound)
    if not isinstance(pins, dict):
        return "not specified"
    mon = pins.get("mon", "—") or "—"
    wed = pins.get("wed", "—") or "—"
    fri = pins.get("fri", "—") or "—"
    return f"{mon} · {wed} · {fri}"


def _md_ped_orals_cell(oral_timing: dict) -> str:
    """Markdown variant — 'AM: … · PRE: … · PM: … · BED: …' verbatim, or 'not specified'."""
    ot = oral_timing or {}
    parts = []
    for slot_key, slot_label in (("AM", "AM"), ("PRE_WORKOUT", "PRE"), ("PM", "PM"), ("BEDTIME", "BED")):
        val = ot.get(slot_key)
        if val and str(val).strip() and str(val).strip() != "—":
            parts.append(f"{slot_label}: {str(val).strip()}")
    return " · ".join(parts) if parts else "not specified"


def _md_ped_timeline_and_pivots(calc_result: list, protocol: dict, current_wk: int) -> list[str]:
    """Build the '## PED Timeline & Coach Pivots' markdown block (MD parity).

    A per-week PED dosing table (Wk 1 = baseline ramp-in, no dosing table),
    key_transitions bullets, a low-evidence-compound warning, then the engine
    week-over-week pivots + doc IF/THEN conditional_rules. Every dose verbatim
    from the doc/engine or 'not specified' — no invention.
    """
    out: list[str] = []
    bloodwork = _ped_bloodwork_weeks(protocol)

    out.append("## PED Timeline & Coach Pivots")
    out.append("")

    # Low-evidence warning (engine flag).
    low_ev: list = []
    ped_conf = None
    for r in calc_result[1:]:
        for c in (_w(r, "ped_low_evidence_compounds", default=[]) or []):
            if c not in low_ev:
                low_ev.append(c)
        if ped_conf is None:
            ped_conf = _w(r, "ped_confidence", default=None)
    if low_ev:
        conf_str = f" Engine confidence: **{ped_conf}**." if ped_conf else ""
        out.append(f"> ⚠ **Low-evidence compounds in stack:** {', '.join(str(c) for c in low_ev)}. "
                   f"Partition/fat-loss modifiers for these are weakly evidenced — treat their contribution as uncertain.{conf_str}")
        out.append("")

    out.append("| Wk | Phase | Test (M·W·F) | EQ (M·W·F) | Deca (M·W·F) | Tren (M·W·F) | Orals & Daily | Bloodwork |")
    out.append("|---|---|---|---|---|---|---|---|")
    for r in calc_result[1:]:
        wn = r["week_number"]
        pw = _w(r, "ped_week", default=None)
        bw = bloodwork.get(wn)
        bw_cell = f"{bw.get('timing','')} ({bw.get('cycle_day','')})" if bw else "—"
        cur_marker = " ← current" if wn == current_wk else ""
        if not pw:
            out.append(f"| {wn}{cur_marker} | baseline | no PED dosing table in doc — baseline ramp-in | — | — | — | — | {bw_cell} |")
            continue
        inj = pw.get("injectables_per_pin", {}) or {}
        out.append(
            f"| {wn}{cur_marker} | {pw.get('phase','—')} | "
            f"{_md_ped_pin_cell(inj,'Test')} | {_md_ped_pin_cell(inj,'EQ')} | "
            f"{_md_ped_pin_cell(inj,'Deca')} | {_md_ped_pin_cell(inj,'Tren')} | "
            f"{_md_ped_orals_cell(pw.get('oral_and_daily_timing', {}))} | {bw_cell} |"
        )
    out.append("")
    out.append("*Per-pin tokens verbatim from the protocol doc — \"—\" means no pin that day · range tokens (e.g. 100–150mg) shown as-written.*")
    out.append("")

    # Key transitions (doc, verbatim).
    transitions = _ped_key_transitions(protocol)
    if transitions:
        out.append("### Key PED Transitions")
        for t in transitions:
            wk = _fmt_macro_cell(t.get("week"))
            what = _fmt_macro_cell(t.get("what_changes"))
            why = _fmt_macro_cell(t.get("why"))
            src = t.get("source")
            src_str = f" _({src})_" if src else ""
            out.append(f"- **Wk {wk}:** {what} — {why}{src_str}")
        out.append("")

    # Coach pivots — engine week-over-week deltas (real changes only).
    deltas = _pivot_deltas(calc_result)
    out.append("### Coach Pivots — Directional Changes (Engine Re-Solve)")
    if deltas:
        for d in deltas:
            out.append(f"- **Wk {d['week']}:** {d['change']} — {d['why']}")
    else:
        out.append("- No week-over-week prescription changes yet — engine is holding the current protocol.")
    out.append("")

    # Coach pivots — doc IF/THEN conditional_rules (verbatim).
    cond_rules = (protocol or {}).get("coach_pivots", {}).get("conditional_rules", []) or []
    if cond_rules:
        out.append("### Coach Directives — IF / THEN Triggers")
        for rule in cond_rules:
            trig = _fmt_macro_cell(rule.get("trigger"))
            act = _fmt_macro_cell(rule.get("action"))
            src = rule.get("source")
            src_str = f" _({src})_" if src else ""
            out.append(f"- **IF** {trig} → {act}{src_str}")
        out.append("")

    out.append("---")
    out.append("")
    return out


def _md_weekly_checkoff(calc_result: list, protocol: dict, current_wk: int) -> list[str]:
    """Build the '## Weekly Check-Off (Print)' markdown block (MD parity).

    Tickable '- [ ]' lines for the CURRENT week: foods (doc sample_meal_plans by
    day type) + PED doses (engine ped_week) + daily tasks (doc rules + engine
    cardio). All values doc/engine-sourced or 'not specified'.
    """
    out: list[str] = []
    out.append("## Weekly Check-Off (Print)")
    out.append("")

    target_wk = current_wk if current_wk and current_wk >= 1 else 1
    row = None
    for r in calc_result[1:]:
        if r["week_number"] == target_wk:
            row = r
            break
    if row is None:
        out.append("not specified — no current week to print.")
        out.append("")
        out.append("---")
        out.append("")
        return out

    out.append(f"### Week {target_wk} — tick on paper")
    out.append("")

    # FOODS — Training / Rest / PSMF (doc verbatim)
    for dt_label, dt_key in (("Training Day", "TRAINING DAY"), ("Rest Day", "REST DAY"), ("PSMF (Mon)", "PSMF DAY")):
        out.append(f"**Foods — {dt_label}**")
        mp = _meal_plan_for_day_type(protocol, dt_key)
        if not mp:
            out.append("- [ ] not specified — no sample meal plan for this day type in protocol")
        else:
            for m in mp.get("meals", []) or []:
                label = str(m.get("meal", "")).strip()
                if label.upper() == "TOTAL":
                    continue
                food = str(m.get("food", "")).strip()
                macros = (f"{_fmt_macro_cell(m.get('protein'))}P / {_fmt_macro_cell(m.get('fat'))}F / "
                          f"{_fmt_macro_cell(m.get('carbs'))}C · {_fmt_macro_cell(m.get('calories'))} cal")
                food_str = f"{food} — " if food else ""
                out.append(f"- [ ] **{label}:** {food_str}{macros}")
        out.append("")

    # PED DOSES — engine ped_week (verbatim)
    out.append("**PED Doses to Take**")
    pw = _w(row, "ped_week", default=None)
    if not pw:
        out.append("- [ ] not specified — no PED dosing table for this week (baseline / ramp-in)")
    else:
        inj = pw.get("injectables_per_pin", {}) or {}
        for day_key, day_label in (("mon", "Mon"), ("wed", "Wed"), ("fri", "Fri")):
            pins = []
            for compound, sched in inj.items():
                if not isinstance(sched, dict):
                    continue
                dose = sched.get(day_key)
                if dose and str(dose).strip() and str(dose).strip() != "—":
                    pins.append(f"{compound} {str(dose).strip()}")
            if pins:
                out.append(f"- [ ] **{day_label} pin:** {' + '.join(pins)}")
        ot = pw.get("oral_and_daily_timing", {}) or {}
        for slot_key, slot_label in (("AM", "AM"), ("PRE_WORKOUT", "Pre-WO"), ("PM", "PM"), ("BEDTIME", "Bedtime")):
            val = ot.get(slot_key)
            if val and str(val).strip() and str(val).strip() != "—":
                out.append(f"- [ ] **{slot_label}:** {str(val).strip()}")
    out.append("")

    # DAILY TASKS — doc rules + engine cardio
    out.append("**Daily Tasks**")
    out.append("- [ ] Weigh-in + log weight/BF (track weekly average)")
    c_sess = int(_w(row, "prescribed_cardio_sessions", default=0) or 0)
    c_min = int(_w(row, "prescribed_cardio_min", default=0) or 0)
    if c_sess > 0:
        out.append(f"- [ ] Cardio: {c_sess} × {c_min} min LISS this week (fasted AM, HR < 120 bpm)")
    rules = (protocol or {}).get("coach_pivots", {}).get("nutrition_critical_rules", []) or []
    if rules:
        for rule in rules:
            out.append(f"- [ ] {_fmt_macro_cell(rule)}")
    else:
        out.append("- [ ] not specified — nutrition critical rules not in protocol")
    out.append("")
    out.append("---")
    out.append("")
    return out


def render_living_report_md(
    calc_result: list[dict],
    user_data: dict,
    actual_entries: Optional[list[dict]] = None,
) -> str:
    """Render the Clinical Playbook Living Progress Report as portable Markdown.

    Safety strip is always present and always fully expanded (not a folded details block).
    """
    if not calc_result:
        return "# No data."

    weeks = len(calc_result) - 1
    baseline = calc_result[0]
    current_wk = _current_week(actual_entries)
    latest_act = _latest_actual(actual_entries)
    # Calendar-based current week (PRIME 2026-06-09 / control-system model): the
    # cut's current week is driven by TODAY vs the cycle start — not only by logged
    # weigh-ins. Weigh-ins mark COMPLETED weeks; the calendar says where we ARE.
    # Take the later of (latest weigh-in week, calendar week); clamp to [1, weeks].
    _sd_cur = user_data.get("start_date")
    try:
        if isinstance(_sd_cur, str):
            _sd_cur = datetime.strptime(_sd_cur[:10], "%Y-%m-%d").date()
        if _sd_cur is not None:
            _cal_wk = max(1, min(weeks, (date.today() - _sd_cur).days // 7 + 1))
            current_wk = max(current_wk, _cal_wk)
    except Exception:
        pass
    if current_wk < 1:
        current_wk = 1

    name = user_data.get("name", "PRIME")
    goal_weight = user_data.get("goal_weight", _w(baseline, "weight", default=217))
    goal_bf = user_data.get("goal_bf", 13.0)
    start_weight = _w(baseline, "weight", default=267.0)
    start_bf = _w(baseline, "body_fat_percentage", default=39.2)
    cycle_name = user_data.get("cycle_name", "PRIME.TIME")
    weigh_days = user_data.get("weigh_in_days", "Mon / Thu / Sat")
    rmr_method = user_data.get("rmr_method", _w(baseline, "rmr_method", default="Cunningham"))
    lean_ceil = user_data.get("lean_ceiling_lb", _w(baseline, "lean_ceiling_lb", default=189))
    gen_date = date.today().strftime("%Y-%m-%d")

    _cw = min(current_wk, weeks)
    cur_row = calc_result[_cw] if _cw < len(calc_result) else calc_result[-1]
    now_weight = float(latest_act["weight"]) if latest_act else _w(cur_row, "weight", default=start_weight)
    now_bf = float(latest_act["bf"]) if latest_act else _w(cur_row, "body_fat_percentage", default=start_bf)
    now_date = latest_act.get("date", gen_date) if latest_act else gen_date

    req_weight = _w(cur_row, "required_weight")
    req_bf = _w(cur_row, "required_bf")
    wt_diff = (now_weight - req_weight) if req_weight is not None else None
    bf_diff = (now_bf - req_bf) if req_bf is not None else None
    weeks_remaining = weeks - current_wk
    corr_status = _w(cur_row, "correction_status", default="on_track")
    residual_gap = _w(cur_row, "residual_gap", default=0.0)
    cur_phase = _w(cur_row, "phase", default="RESET")
    rmr_val = _w(cur_row, "rmr", default=_w(baseline, "rmr", default=2180))
    tdee_val = _w(cur_row, "tdee", default=2830)
    train_cal = _w(cur_row, "training_calories")
    rest_cal = _w(cur_row, "rest_calories")
    psmf_cal = _w(cur_row, "psmf_calories")
    protein_g = _w(cur_row, "protein_g")
    carbs_g = _w(cur_row, "carbs_g")
    cardio_sess = _w(cur_row, "prescribed_cardio_sessions", default=0)
    cardio_min = _w(cur_row, "prescribed_cardio_min", default=0)
    cal_floor = _w(cur_row, "calorie_floor", default=1200)
    start_date_str = _w(baseline, "date", default="")

    # Protocol reference (nutrition + PED JSON) — single read-path; {} on miss.
    protocol = get_protocol_reference() or {}

    lean_mass_start = start_weight * (1 - start_bf / 100)
    fat_mass_start = start_weight * (start_bf / 100)
    lean_mass_now = now_weight * (1 - now_bf / 100)
    fat_mass_now = now_weight * (now_bf / 100)
    goal_fat_mass = goal_weight * (goal_bf / 100)
    fat_still = max(0.0, fat_mass_now - goal_fat_mass)

    last_row = calc_result[-1]
    pred_end_weight = _w(last_row, "weight")
    pred_end_bf = _w(last_row, "body_fat_percentage")
    total_lost = _w(last_row, "total_weight_lost", default=0)
    avg_wk_loss = total_lost / weeks if weeks > 0 else 0

    lines: list[str] = []

    # ── HEADER ──
    lines.append(f"# Ap³xFit · Living Progress Report — *Clinical Playbook*")
    lines.append(f"### {cycle_name} · **WEEK {current_wk} of {weeks}** · Phase: {cur_phase}")
    lines.append(f"> {name} · Goal **{goal_weight:.0f} lb @ {goal_bf:.0f}% BF** · {weeks}-week cut · weigh-ins **{weigh_days}**")
    lines.append(f"> Generated {gen_date}")
    lines.append(f"")
    lines.append(f"> **Re-solved prescription as of {now_date} weigh-in ({now_weight:.1f} lb / {now_bf:.1f}% BF).**")
    lines.append(f"> Every week's numbers in this report are re-solved from your latest actual weigh-in to the FIXED deadline — not a static plan.")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ══ PERMANENT SAFETY STRIP — ALWAYS EXPANDED ══
    lines.append("## 🔴 PERMANENT SAFETY PROTOCOL (Council Hard-Gate — Always Expanded)")
    lines.append("")
    lines.append("> **This section is non-negotiable and always visible. Do not collapse or skip.**")
    lines.append("")

    contras = _safety_contraindications_lines()
    for title, items in contras:
        lines.append(f"### {title}")
        for item in items:
            lines.append(f"- {item}")
        lines.append("")

    electros = _electrolyte_lines()
    lines.append("### ELECTROLYTE PROTOCOL (PSMF)")
    for title, items in electros:
        lines.append(f"**{title}**")
        for item in items:
            lines.append(f"- {item}")
        lines.append("")

    lines.append("### BLOODWORK + PCT SCHEDULE")
    bloodwork_weeks = [w for w in [4, 8, 12] if w <= weeks]
    for w in bloodwork_weeks:
        lines.append(f"- **Week {w}** — full bloodwork panel due (lipids, LFTs, CBC, hormones)")
    lines.append("- PCT reminder: plan post-cycle therapy BEFORE the final week")
    lines.append("- 🔴 **STOP IMMEDIATELY:** heart palpitations, fainting, chest pain, extreme weakness, confusion")
    lines.append("- 🟡 **REDUCE + CONTACT PHYSICIAN:** persistent nausea, severe dizziness")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── STATUS SUMMARY ──
    lines.append("## Status Summary")
    lines.append("")
    wt_vs = f"+{wt_diff:.1f} lb behind" if wt_diff and wt_diff > 0 else (f"{abs(wt_diff):.1f} lb ahead" if wt_diff and wt_diff < 0 else "on required line")
    bf_vs = f"+{bf_diff:.1f}% above" if bf_diff and bf_diff > 0 else (f"{abs(bf_diff):.1f}% ahead" if bf_diff and bf_diff < 0 else "on target")
    lines.append(f"| | Baseline · Wk 0 | Now · Wk {current_wk} (actual) | vs Required Line | Goal · Wk {weeks} |")
    lines.append("|---|---|---|---|---|")
    lines.append(f"| **Weight** | {start_weight:.1f} lb | {now_weight:.1f} lb (▼{abs(now_weight-start_weight):.1f}) | **{wt_vs}** | {goal_weight:.0f} lb |")
    lines.append(f"| **Body fat** | {start_bf:.1f}% | {now_bf:.1f}% (▼{abs(now_bf-start_bf):.1f}) | {bf_vs} | {goal_bf:.0f}% |")
    lines.append(f"| **Status** | — | — | — | **{_correction_status_display(corr_status)}** |")
    lines.append("")
    lines.append(f"RMR ({rmr_method}): **{_fmt_kcal(rmr_val)}** · TDEE: **{_fmt_kcal(tdee_val)}** · Lean ceiling: **{lean_ceil} lb** · {weeks_remaining} weeks remaining.")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── 16-WEEK TRACKER ──
    lines.append("## 16-Week Tracker")
    lines.append("")
    tracker_cells = []
    for r in calc_result[1:]:
        wn = r["week_number"]
        has_data = _actual_for_week(actual_entries, wn) is not None
        is_cur = (wn == current_wk)
        cell = str(wn)
        if has_data:
            cell += "◉"
        if is_cur:
            cell = f"**‹{cell}›**"
        tracker_cells.append(cell)
    lines.append("`[RESET 1–4] [ADAPT 5–8] [CYCLE 9–12] [PEAK 13–16]` · ◉ = weigh-in logged")
    lines.append("")
    lines.append(" · ".join(tracker_cells))
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── AI COACH ──
    lines.append("## AI Coach — Re-Solved Prescription (Next Session Plan)")
    lines.append("")
    lines.append(f"> **Re-solved from weigh-in {now_date}: {now_weight:.1f} lb / {now_bf:.1f}% BF** · Correction: {_correction_status_display(corr_status)}")
    lines.append("")
    cardio_str = (f"{int(cardio_sess)} × {int(cardio_min)} min LISS (fasted AM, HR < 120 bpm)" if int(cardio_sess or 0) > 0
                  else "No additional cardio prescribed — diet levers covering deficit")
    lines.append(f"1. **Calories:** Training {_fmt_kcal(train_cal)} kcal · Rest {_fmt_kcal(rest_cal)} kcal · PSMF {_fmt_kcal(psmf_cal)} kcal (floor: {_fmt_kcal(cal_floor)} kcal)")
    lines.append(f"2. **Protein:** {_fmt_g(protein_g)}/day minimum (non-negotiable)" + (f" · Carbs: {_fmt_g(carbs_g)}/day" if carbs_g and int(carbs_g) > 0 else ""))
    lines.append(f"3. **Cardio:** {cardio_str}")
    lines.append(f"4. **Correction status:** {_correction_status_display(corr_status)} — {_CORRECTION_NARRATIVE.get(str(corr_status), '')}")
    if float(residual_gap or 0) > 1:
        lines.append(f"5. **Residual gap:** {float(residual_gap):.0f} kcal/wk cannot be closed by diet or cardio — flagged honestly. Do NOT move deadline silently.")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── PED TIMELINE & COACH PIVOTS (doc weekly_timeline + engine deltas) ──
    lines.extend(_md_ped_timeline_and_pivots(calc_result, protocol, current_wk))

    # ── WEEK-BY-WEEK ──
    lines.append("## Week-by-Week Record")
    lines.append("")
    lines.append(f"| Wk | Phase | Req Weight | Req BF% | Train kcal | Rest kcal | PSMF kcal | Protein | Cardio | Actual Weight | Actual BF% |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|")
    for r in calc_result[1:]:
        wn = r["week_number"]
        ph = _w(r, "phase", default="—")
        act = _actual_for_week(actual_entries, wn)
        rw = _fmt_lb(_w(r, "required_weight"))
        rbf = _fmt_pct(_w(r, "required_bf"))
        tc = _fmt_kcal(_w(r, "training_calories"))
        rc = _fmt_kcal(_w(r, "rest_calories"))
        pc = _fmt_kcal(_w(r, "psmf_calories"))
        pg = _fmt_g(_w(r, "protein_g"))
        cs = _w(r, "prescribed_cardio_sessions", default=0)
        cm = _w(r, "prescribed_cardio_min", default=0)
        cardio_cell = f"{int(cs or 0)}×{int(cm or 0)}m" if int(cs or 0) > 0 else "—"
        aw = f"{float(act['weight']):.1f} lb" if act else "— pending"
        abf = f"{float(act['bf']):.1f}%" if act else "—"
        cur_marker = " ← current" if wn == current_wk else ""
        lines.append(f"| {wn}{cur_marker} | {ph} | {rw} | {rbf} | {tc} | {rc} | {pc} | {pg} | {cardio_cell} | {aw} | {abf} |")

    lines.append("")
    lines.append("*All targets are re-solved from the latest actual weigh-in. PSMF floored at your calorie floor. Actuals populate as you log.*")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── MACRONUTRIENT BREAKDOWN (per Day Type — doc verbatim, anti-fabrication) ──
    lines.append("## Macronutrient Breakdown (per Day Type)")
    lines.append("")
    lines.append("*Carbs / Fat / Protein per day type, verbatim from the protocol doc (phase_macros_by_day_type). `not specified` = no doc value.*")
    lines.append("")
    lines.append("| Wk | Phase | Carbs (T/R/PSMF) | Fat (T/R/PSMF) | Protein (T/R/PSMF) |")
    lines.append("|---|---|---|---|---|")
    for r in calc_result[1:]:
        wn = r["week_number"]
        ph = _w(r, "phase", default="—")
        mb = _w(r, "macro_breakdown", default={}) or {}
        _t = mb.get("training_day", {}) or {}
        _rd = mb.get("rest_day", {}) or {}
        _p = mb.get("psmf_day", {}) or {}
        carbs_c = f"{_fmt_macro_cell(_t.get('carbs'))} / {_fmt_macro_cell(_rd.get('carbs'))} / {_fmt_macro_cell(_p.get('carbs'))}"
        fat_c = f"{_fmt_macro_cell(_t.get('fat'))} / {_fmt_macro_cell(_rd.get('fat'))} / {_fmt_macro_cell(_p.get('fat'))}"
        prot_c = f"{_fmt_macro_cell(_t.get('protein'))} / {_fmt_macro_cell(_rd.get('protein'))} / {_fmt_macro_cell(_p.get('protein'))}"
        cur_marker = " ← current" if wn == current_wk else ""
        lines.append(f"| {wn}{cur_marker} | {ph} | {carbs_c} | {fat_c} | {prot_c} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── WEEKLY CHECK-OFF (Print) ──
    lines.extend(_md_weekly_checkoff(calc_result, protocol, current_wk))

    # ── METABOLIC PROFILE ──
    lines.append("## Metabolic Profile")
    lines.append("")
    lines.append(f"| RMR ({rmr_method}) | TDEE est. | TEF | NEAT | Lean Ceiling |")
    lines.append("|---|---|---|---|---|")
    tef = _w(cur_row, "tef")
    neat = _w(cur_row, "neat")
    lines.append(f"| {_fmt_kcal(rmr_val)} kcal | {_fmt_kcal(tdee_val)} kcal | {_fmt_kcal(tef)} kcal | {_fmt_kcal(neat)} kcal | {lean_ceil} lb |")
    lines.append("")

    lines.append("## Body Composition")
    lines.append("")
    lines.append("| | Start | Now | Goal |")
    lines.append("|---|---|---|---|")
    lines.append(f"| Fat mass | {fat_mass_start:.1f} lb ({start_bf:.1f}%) | {fat_mass_now:.1f} lb ({now_bf:.1f}%) | {goal_fat_mass:.1f} lb ({goal_bf:.0f}%) |")
    lines.append(f"| Lean mass | {lean_mass_start:.1f} lb | {lean_mass_now:.1f} lb | {min(lean_ceil, goal_weight - goal_fat_mass):.1f} lb |")
    lines.append(f"| Fat to lose | — | — | {fat_still:.1f} lb remaining |")
    lines.append("")

    lines.append("## Predicted Results")
    lines.append("")
    lines.append(f"- Avg weekly weight loss: **~{avg_wk_loss:.1f} lb/wk** (over full protocol)")
    lines.append(f"- Projected end weight: **{_fmt_lb(pred_end_weight)}**")
    lines.append(f"- Projected end BF%: **{_fmt_pct(pred_end_bf)}**")
    lines.append(f"- Lean ceiling: **{lean_ceil} lb** (twice-proven competition ceiling — not a build target)")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── APPENDIX (always visible in MD — no collapse) ──
    lines.append("## Appendix — Methodology & Reference")
    lines.append("")
    lines.append("**PSMF floor:** `psmf_calories = max(calorie_floor, protein_g×4 + 250)` — never below protein needs.")
    lines.append("**Front-loaded decay:** Fat loss: geometric decay to goal_fat_mass at deadline. Lean: linear regain toward lean_ceiling_lb.")
    lines.append("**Monotonic taper:** Training calories never rise — the solver clamps each week to ≤ previous week.")
    lines.append("**Alpert ceiling:** Max fat oxidation ≈ 31 kcal/lb-fat/day × 7 days / 3500 = 0.062 lb-fat/lb-fat/wk, ×1.4 with PEDs.")
    lines.append("**Forbes p-ratio:** Fraction of deficit from lean mass; biased toward fat at high BF%. PED phase modifier applied.")
    lines.append("")
    lines.append("*Engine source: `new_prime_python_code/PRIME_Calculations.py` → `predict_weight_loss()`.")
    lines.append("Renderer: `new_prime_python_code/PRIME_Living_Report.py`. Coach knowledge: `python-api/coach_knowledge.py`.*")
    lines.append("")
    lines.append("---")
    lines.append(f"*{cycle_name} · generated {gen_date} · Wk {current_wk} of {weeks} · Full report (Mon) — Thu/Sat = AI Coach check-ins.*")

    return "\n".join(lines)
