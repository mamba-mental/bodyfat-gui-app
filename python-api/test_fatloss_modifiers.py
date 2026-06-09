"""Body-recomp model contract (rewritten 2026-06-08 — PRIME reconciliation).

This ONE line has been flip-flopped historically:
  v1: `fat_loss = weekly_fat_target`                       -> BF converges to goal, modifiers inert
  v2 (F8 audit): `fat_loss = weekly_weight_target * fat_loss_ratio`
                                                            -> modifiers shape composition, BF drifts off goal
  v3 (this fix): back to `fat_loss = weekly_fat_target`    -> GOAL IS SACRED.

Reconciliation (the peace treaty that stops the flip-flop):
  - Body-fat % ALWAYS converges to goal_bf by the target date. Recomp = hitting
    weight AND body fat; the goal defines the trajectory, never a side effect.
  - diet / exercise / PED (+ type) / fasting / workout-days / experience / lifestyle
    modifiers move the CALORIE PRESCRIPTION (what to eat to get there + feasibility),
    NEVER the endpoint. (Calorie wiring pending — see xfail below.)

Extended 2026-06-08 (Agent 1 — math engine upgrade):
  Tests for:
  (a) dual-goal invariant holds (weight + BF converge to goal ±0.5)
  (b) no week exceeds Alpert fat-oxidation ceiling (front-load respected)
  (c) PSMF day never below calorie_floor, never below protein_g*4
  (d) lean_gain goal RAMPS (no week jumps straight to goal weight)
  (e) every contract field (existing + new) present on each row
"""
import os
import sys
from datetime import datetime

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from new_prime_python_code.PRIME_Calculations import predict_weight_loss  # noqa: E402


# ---------------------------------------------------------------------------
# Shared test fixture builder
# ---------------------------------------------------------------------------

def _run(exercise_type: str = "resistance", **overrides):
    """Run predict_weight_loss with standard PRIME params, allow overrides."""
    params = dict(
        current_weight=266.8, current_bf=39.2,
        goal_weight=217.0, goal_bf=13.0,
        start_date=datetime(2026, 6, 3), end_date=datetime(2026, 9, 23),
        dob=datetime(1990, 1, 1), gender="m",
        activity_level="moderate", height_cm=180.0, is_athlete=False,
        daily_protein_intake=200, job_activity="light", leisure_activity="light",
        experience_level="intermediate", is_bodybuilder=False, ped_use=False,
        diet_type="balanced", exercise_type=exercise_type, sleep_quality="good",
        workout_days=4, volume_score=7, intensity_score=7, eating_window_hours=12.0,
        goal_type="cut", calorie_floor=1200.0,
    )
    params.update(overrides)
    return predict_weight_loss(**params)


# ---------------------------------------------------------------------------
# EXISTING TESTS (unchanged — keep the peace treaty intact)
# ---------------------------------------------------------------------------

def test_bf_and_weight_converge_to_goal():
    """Recomp contract: BOTH weight and body-fat land on goal at the target date."""
    for ex in ("resistance", "cardio"):
        prog = _run(ex)
        assert prog, "progression should be non-empty"
        final = prog[-1]
        assert abs(final["weight"] - 217.0) < 0.5, (
            f"[{ex}] final weight {final['weight']:.1f} must converge to goal 217"
        )
        assert abs(final["body_fat_percentage"] - 13.0) < 0.1, (
            f"[{ex}] final BF {final['body_fat_percentage']:.2f}% must converge to goal 13% "
            "(the regression PRIME flagged — goal is sacred)"
        )


def test_goal_is_sacred_regardless_of_modifiers():
    """Endpoint BF must NOT depend on exercise_type — the goal defines the endpoint."""
    bf_res = _run("resistance")[-1]["body_fat_percentage"]
    bf_cardio = _run("cardio")[-1]["body_fat_percentage"]
    assert abs(bf_res - bf_cardio) < 0.1, (
        "Goal is sacred: exercise_type must not change the ENDPOINT body fat "
        f"(got {bf_res:.2f}% vs {bf_cardio:.2f}%). Modifiers belong in calories, not the endpoint."
    )


@pytest.mark.xfail(
    reason="PENDING (2026-06-08 reconciliation): wire diet/exercise/PED(+type)/fasting/"
           "workout-days/experience/lifestyle modifiers into the CALORIE prescription. "
           "Today they affect neither the endpoint (correct) nor calories yet (to build). "
           "Source of truth = PRIME's recomp-protocol methodology, not invented coefficients.",
    strict=False,
)
def test_modifiers_change_calorie_prescription():
    """The CORRECT expression of 'modifiers matter': they move CALORIES, not the endpoint.

    Once wired, a higher fat-partitioning / activity modifier (cardio, PED, more workout
    days) should change the weekly daily_calorie_intake path while BF still lands on goal.
    """
    cal_res = sum(w["daily_calorie_intake"] for w in _run("resistance"))
    cal_cardio = sum(w["daily_calorie_intake"] for w in _run("cardio"))
    assert cal_res != cal_cardio, "exercise_type should change the calorie prescription"


# ---------------------------------------------------------------------------
# NEW TESTS (2026-06-08 — Agent 1 math engine upgrade)
# ---------------------------------------------------------------------------

# (a) Dual-goal invariant — both weight AND BF converge to goal ±0.5
def test_dual_goal_invariant_tight():
    """(a) Both weight AND body_fat_percentage must converge to goal within ±0.5."""
    prog = _run()
    final = prog[-1]
    assert abs(final["weight"] - 217.0) <= 0.5, (
        f"Weight {final['weight']:.2f} did not converge to 217.0 (±0.5)"
    )
    assert abs(final["body_fat_percentage"] - 13.0) <= 0.5, (
        f"BF {final['body_fat_percentage']:.2f}% did not converge to 13.0% (±0.5)"
    )


# (b) Front-loaded fat loss + Alpert feasibility flag
def test_alpert_feasibility_flag_fires_when_cap_exceeded():
    """(b) When weekly fat loss exceeds the Alpert cap, feasibility must be 'ceiling_capped'.

    Per the spec (CALC-VALIDATION-FINDINGS-2026-06-08.txt + PRIME's reframe):
      - The Alpert ceiling is INFORMATIONAL (PEDs + protocol may physiologically exceed
        the general-population ceiling — that's PRIME's whole reframe).
      - The feasibility flag surfaces this for visibility; it does NOT cap the trajectory.
      - Alpert cap = fat_mass_at_start_of_week * 0.062
        (= 31 kcal/lb-fat/day * 7 days / 3500 kcal/lb)

    The fat_mass in each row is the POST-loss value. Pre-loss = fat_mass + fat_loss_lb.
    """
    prog = _run()
    for row in prog:
        if row["week_number"] == 0:
            continue
        # Pre-loss fat mass = post-loss fat_mass + fat_loss_lb (what it was at start of week)
        fat_loss = row["weekly_fat_loss_lb"]
        fat_mass_before = row["fat_mass"] + fat_loss
        alpert_cap = fat_mass_before * 0.062

        # Graduated, ratio-based feasibility (fixture uses ped_use=False => agg band (1.0, 1.15]).
        ratio = fat_loss / alpert_cap if alpert_cap > 0 else 0.0
        if ratio > 1.15:
            assert row["feasibility"] == "ceiling_capped", (
                f"Week {row['week_number']}: ratio={ratio:.3f} (>1.15) must be "
                f"ceiling_capped, got '{row['feasibility']}'"
            )
        elif ratio > 1.0:
            assert row["feasibility"] == "aggressive", (
                f"Week {row['week_number']}: ratio={ratio:.3f} (1.0-1.15] must be "
                f"aggressive, got '{row['feasibility']}'"
            )
        else:
            assert row["feasibility"] == "on_track", (
                f"Week {row['week_number']}: ratio={ratio:.3f} (<=1.0) must be "
                f"on_track, got '{row['feasibility']}'"
            )


def test_front_loaded_fat_loss_geometric_convergence():
    """(b) Fat loss is FRONT-LOADED (geometric decay), not flat.

    True front-load: fat shrinks by a constant FRACTION each week, so the absolute
    weekly loss is LARGE early and TAPERS late ("fast early on PEDs, grind late"),
    while still converging EXACTLY to goal_fat_mass at the final week.

    This replaces a prior assertion that locked in the equal-installment formula
    (fat_remaining / remaining_weeks) — mathematically FLAT, the exact behavior
    PRIME flagged as wrong (see docs/CALC-VALIDATION-FINDINGS-2026-06-08).

    Verified properties:
      1. weekly_fat_loss_lb is monotonically NON-INCREASING (tapers — front-loaded).
      2. Week-1 loss is well above the final-week loss (genuinely front-loaded, not flat).
      3. Final fat_mass converges to goal_fat_mass.
      4. Post-loss fat tracks the geometric target initial_fat * decay**week.
    """
    prog = _run()
    goal_fat_mass = 217.0 * 0.13  # goal_weight * goal_bf / 100
    weeks_rows = [r for r in prog if r["week_number"] >= 1]
    losses = [r["weekly_fat_loss_lb"] for r in weeks_rows]

    # 1. Front-loaded: weekly fat loss tapers (monotonically non-increasing).
    for a, b in zip(losses, losses[1:]):
        assert b <= a + 1e-6, (
            f"fat loss must taper (front-loaded): {b:.3f} followed {a:.3f}"
        )

    # 2. Genuinely front-loaded, not flat: week-1 loss clearly exceeds the last week.
    assert losses[0] > losses[-1] * 1.5, (
        f"week-1 loss {losses[0]:.3f} should be well above final-week loss "
        f"{losses[-1]:.3f} (a flat formula would make them equal)"
    )

    # 3. Converges to goal fat mass at the final week.
    assert abs(weeks_rows[-1]["fat_mass"] - goal_fat_mass) < 0.5, (
        f"final fat_mass {weeks_rows[-1]['fat_mass']:.2f} must converge to "
        f"goal_fat_mass {goal_fat_mass:.2f}"
    )

    # 4. Geometric shape: post-loss fat ~= initial_fat * decay**week.
    initial_fat = prog[0]["fat_mass"]
    n = weeks_rows[-1]["week_number"]
    decay = (goal_fat_mass / initial_fat) ** (1.0 / n)
    for r in weeks_rows:
        wk = r["week_number"]
        expected = max(goal_fat_mass, initial_fat * (decay ** wk))
        assert abs(r["fat_mass"] - expected) < 0.5, (
            f"week {wk}: fat_mass {r['fat_mass']:.2f} should track geometric "
            f"target {expected:.2f}"
        )


# (c) PSMF day never below calorie_floor, never below protein_g*4
def test_psmf_floor_never_violated():
    """(c) psmf_calories must be >= calorie_floor AND >= protein_g * 4 on every row."""
    floor = 1200.0
    prog = _run(calorie_floor=floor)
    for row in prog:
        psmf = row["psmf_calories"]
        protein_floor = row["protein_g"] * 4
        assert psmf >= floor - 1e-6, (
            f"Week {row['week_number']}: psmf_calories={psmf} < calorie_floor={floor}"
        )
        assert psmf >= protein_floor - 1e-6, (
            f"Week {row['week_number']}: psmf_calories={psmf} < protein_g*4={protein_floor} "
            f"(protein_g={row['protein_g']})"
        )


def test_psmf_floor_respected_with_high_protein():
    """(c) PSMF floor holds even when protein requirements push it above base floor."""
    # Very high protein to stress-test the protein floor
    prog = _run(daily_protein_intake=300, calorie_floor=1000.0)
    for row in prog:
        psmf = row["psmf_calories"]
        protein_floor = row["protein_g"] * 4
        assert psmf >= 1000.0 - 1e-6, (
            f"Week {row['week_number']}: psmf_calories={psmf} < calorie_floor=1000"
        )
        assert psmf >= protein_floor - 1e-6, (
            f"Week {row['week_number']}: psmf_calories={psmf} < protein_g*4={protein_floor}"
        )


# (d) lean_gain goal RAMPS (no week jumps straight to goal weight)
def test_lean_gain_ramps_not_jumps():
    """(d) A lean_gain goal must ramp weight up week-by-week, never jumping to goal.

    The sign-aware clamp uses min() for gain goals, so each week can only step
    toward goal_weight by at most (goal - current) / remaining_weeks. The weight
    on week 1 must be STRICTLY between current_weight and goal_weight, not equal
    to goal_weight.
    """
    start_w = 200.0
    goal_w = 215.0
    prog = predict_weight_loss(
        current_weight=start_w, current_bf=15.0,
        goal_weight=goal_w, goal_bf=14.0,
        start_date=datetime(2026, 6, 3), end_date=datetime(2026, 9, 23),
        dob=datetime(1990, 1, 1), gender="m",
        activity_level="moderate", height_cm=180.0, is_athlete=False,
        daily_protein_intake=200, job_activity="light", leisure_activity="light",
        experience_level="intermediate", is_bodybuilder=False, ped_use=False,
        diet_type="balanced", exercise_type="resistance", sleep_quality="good",
        workout_days=4, volume_score=7, intensity_score=7, eating_window_hours=12.0,
        goal_type="lean_gain", calorie_floor=1200.0,
    )
    # Must have progression (at least 2 rows: week 0 + week 1)
    assert len(prog) >= 2, "lean_gain progression must have at least 2 rows"

    week1_weight = prog[1]["weight"]

    # Week 1 must be GREATER than start (it's ramping up)
    assert week1_weight > start_w, (
        f"lean_gain: week 1 weight {week1_weight:.2f} should be > start {start_w}"
    )

    # Week 1 must be LESS than goal (it must NOT jump straight there)
    assert week1_weight < goal_w, (
        f"lean_gain: week 1 weight {week1_weight:.2f} jumped straight to goal {goal_w} — "
        "must ramp, not jump"
    )

    # Progression must be monotonically increasing (each week >= previous)
    weights = [row["weight"] for row in prog]
    for i in range(1, len(weights)):
        assert weights[i] >= weights[i - 1] - 1e-6, (
            f"lean_gain: weight decreased from week {i-1} ({weights[i-1]:.2f}) "
            f"to week {i} ({weights[i]:.2f}) — must ramp up monotonically"
        )


# (e) Every contract field present on each row (existing + new)
CONTRACT_FIELDS_EXISTING = [
    "week_number", "date", "weight", "body_fat_percentage",
    "daily_calorie_intake", "tdee", "weekly_caloric_output", "total_weight_lost",
    "lean_mass", "fat_mass", "muscle_gain", "rmr", "tef", "neat",
    "training_calories", "rest_calories", "psmf_calories", "protein_g", "phase",
]

CONTRACT_FIELDS_NEW = [
    "weekly_average_calories",
    "calorie_floor",
    "weekly_fat_loss_lb",
    "p_ratio",
    "rmr_method",
    "below_rmr",
    "feasibility",
]

ALL_CONTRACT_FIELDS = CONTRACT_FIELDS_EXISTING + CONTRACT_FIELDS_NEW


def test_all_contract_fields_present_on_every_row():
    """(e) Every contract field (existing + new) must be present on EVERY row."""
    prog = _run()
    assert prog, "progression must be non-empty"
    for row in prog:
        for field in ALL_CONTRACT_FIELDS:
            assert field in row, (
                f"Week {row.get('week_number', '?')}: missing contract field '{field}'"
            )


def test_new_fields_have_correct_types():
    """(e) New contract fields must have the correct Python types."""
    prog = _run()
    for row in prog:
        wk = row["week_number"]
        assert isinstance(row["weekly_average_calories"], (int, float)), \
            f"Week {wk}: weekly_average_calories must be numeric"
        assert isinstance(row["calorie_floor"], float), \
            f"Week {wk}: calorie_floor must be float"
        assert isinstance(row["weekly_fat_loss_lb"], float), \
            f"Week {wk}: weekly_fat_loss_lb must be float"
        assert 0.0 <= row["p_ratio"] <= 1.0, \
            f"Week {wk}: p_ratio={row['p_ratio']} must be in [0, 1]"
        assert row["rmr_method"] in (
            "cunningham_measured_lbm", "ten_haaf", "mifflin"
        ), f"Week {wk}: unknown rmr_method '{row['rmr_method']}'"
        assert isinstance(row["below_rmr"], bool), \
            f"Week {wk}: below_rmr must be bool"
        assert row["feasibility"] in ("on_track", "aggressive", "ceiling_capped"), \
            f"Week {wk}: unknown feasibility '{row['feasibility']}'"


# ---------------------------------------------------------------------------
# Additional robustness tests
# ---------------------------------------------------------------------------

def test_backwards_compat_no_new_params():
    """Calling predict_weight_loss without goal_type/calorie_floor must still work."""
    prog = predict_weight_loss(
        current_weight=266.8, current_bf=39.2,
        goal_weight=217.0, goal_bf=13.0,
        start_date=datetime(2026, 6, 3), end_date=datetime(2026, 9, 23),
        dob=datetime(1990, 1, 1), gender="m",
        activity_level="moderate", height_cm=180.0, is_athlete=False,
        daily_protein_intake=200, job_activity="light", leisure_activity="light",
        experience_level="intermediate", is_bodybuilder=False, ped_use=False,
        diet_type="balanced", exercise_type="resistance", sleep_quality="good",
        workout_days=4, volume_score=7, intensity_score=7, eating_window_hours=12.0,
        # goal_type and calorie_floor intentionally omitted — must use defaults
    )
    assert prog, "backwards compat call must return a non-empty progression"
    final = prog[-1]
    assert abs(final["weight"] - 217.0) <= 0.5, "backwards compat: weight must converge"


def test_extra_kwargs_accepted_gracefully():
    """**kwargs in predict_weight_loss must accept unknown keyword args without error."""
    prog = _run(unknown_future_param="some_value", another_param=42)
    assert prog, "extra kwargs must be ignored gracefully"


def test_daily_calorie_intake_is_training_day_number():
    """daily_calorie_intake must equal training_calories (the spec semantics fix)."""
    prog = _run()
    for row in prog:
        if row["week_number"] == 0:
            continue
        assert row["daily_calorie_intake"] == row["training_calories"], (
            f"Week {row['week_number']}: daily_calorie_intake={row['daily_calorie_intake']} "
            f"!= training_calories={row['training_calories']}. "
            "Spec: daily_calorie_intake = training-day headline number."
        )


def test_weekly_average_calories_formula():
    """weekly_average_calories must equal round((3*train + 3*rest + 1*psmf) / 7)."""
    prog = _run()
    for row in prog:
        expected = round((3 * row["training_calories"] + 3 * row["rest_calories"] + 1 * row["psmf_calories"]) / 7)
        assert row["weekly_average_calories"] == expected, (
            f"Week {row['week_number']}: weekly_average_calories={row['weekly_average_calories']} "
            f"!= formula result {expected}"
        )


def test_p_ratio_in_range():
    """p_ratio must be in [0, 1] and should be high (fat-dominant) early in a cut."""
    prog = _run()
    # Starting at 39.2% BF, p_ratio should be quite high (fat-dominant)
    early = prog[1]  # week 1
    assert early["p_ratio"] > 0.8, (
        f"Week 1 p_ratio={early['p_ratio']:.3f} should be > 0.8 at 39% BF "
        "(fat-dominant partitioning early in cut)"
    )
    # All rows in [0, 1]
    for row in prog:
        assert 0.0 <= row["p_ratio"] <= 1.0, \
            f"Week {row['week_number']}: p_ratio={row['p_ratio']} out of [0,1]"


def test_below_rmr_flag_is_boolean():
    """below_rmr must be a bool on every row."""
    prog = _run()
    for row in prog:
        assert isinstance(row["below_rmr"], bool), \
            f"Week {row['week_number']}: below_rmr is not bool (got {type(row['below_rmr'])})"


def test_feasibility_labels():
    """feasibility must be one of the three valid strings on every row."""
    prog = _run()
    valid = {"on_track", "aggressive", "ceiling_capped"}
    for row in prog:
        assert row["feasibility"] in valid, \
            f"Week {row['week_number']}: feasibility='{row['feasibility']}' not in {valid}"


def test_maintain_goal_holds_weight():
    """goal_type='maintain' must keep weight at current_weight throughout."""
    start_w = 250.0
    prog = predict_weight_loss(
        current_weight=start_w, current_bf=25.0,
        goal_weight=start_w, goal_bf=25.0,
        start_date=datetime(2026, 6, 3), end_date=datetime(2026, 8, 3),
        dob=datetime(1990, 1, 1), gender="m",
        activity_level="moderate", height_cm=180.0, is_athlete=False,
        daily_protein_intake=180, job_activity="light", leisure_activity="light",
        experience_level="intermediate", is_bodybuilder=False, ped_use=False,
        diet_type="balanced", exercise_type="resistance", sleep_quality="good",
        workout_days=3, volume_score=7, intensity_score=7, eating_window_hours=12.0,
        goal_type="maintain", calorie_floor=1200.0,
    )
    for row in prog:
        if row["week_number"] == 0:
            continue
        assert abs(row["weight"] - start_w) < 0.1, (
            f"maintain: week {row['week_number']} weight {row['weight']:.2f} drifted "
            f"from start {start_w}"
        )


# =============================================================================
# PED STACK MODIFIER TESTS (2026-06-08)
# Source of truth: docs/PED-MODIFIERS-SOURCING.md
# =============================================================================

import sys as _sys
import os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from new_prime_python_code.PRIME_Calculations import (  # noqa: E402
    compute_ped_stack_modifiers,
    PED_LOW_EVIDENCE_COMPOUNDS,
    _PED_P_FAT_FLOOR,
    _PED_P_FAT_HARD_CAP,
    _PED_P_FAT_BASELINE,
)


# ---------------------------------------------------------------------------
# (a) Empty / None stack = no-op (identical output to the legacy bool path)
# ---------------------------------------------------------------------------

def test_ped_stack_none_is_noop():
    """(a) ped_stack=None must not change any output compared to no stack."""
    prog_no_stack = _run(ped_use=True)
    prog_none_stack = _run(ped_use=True, ped_stack=None)

    assert len(prog_no_stack) == len(prog_none_stack), "row count must be identical"
    for a, b in zip(prog_no_stack, prog_none_stack):
        assert a["weight"] == b["weight"], f"Week {a['week_number']}: weight differs"
        assert a["body_fat_percentage"] == b["body_fat_percentage"], (
            f"Week {a['week_number']}: BF differs"
        )
        assert a["p_ratio"] == b["p_ratio"], (
            f"Week {a['week_number']}: p_ratio differs when stack is None"
        )
        assert a["muscle_gain"] == b["muscle_gain"], (
            f"Week {a['week_number']}: muscle_gain differs when stack is None"
        )


def test_ped_stack_empty_list_is_noop():
    """(a) ped_stack=[] (empty list) must behave identically to ped_stack=None."""
    prog_none = _run(ped_use=True, ped_stack=None)
    prog_empty = _run(ped_use=True, ped_stack=[])

    for a, b in zip(prog_none, prog_empty):
        assert a["p_ratio"] == b["p_ratio"], (
            f"Week {a['week_number']}: p_ratio differs between None and []"
        )


def test_compute_ped_stack_modifiers_none_returns_zeros():
    """compute_ped_stack_modifiers(None) must return all-zero no-op dict."""
    result = compute_ped_stack_modifiers(None, week=1)
    assert result["p_fat_delta"] == 0.0
    assert result["lean_modifier"] == 0.0
    assert result["ee_bonus_kcal"] == 0.0
    assert result["confidence"] == "high"
    assert result["low_evidence_compounds"] == []


def test_compute_ped_stack_modifiers_empty_returns_zeros():
    """compute_ped_stack_modifiers([]) must return all-zero no-op dict."""
    result = compute_ped_stack_modifiers([], week=1)
    assert result["p_fat_delta"] == 0.0
    assert result["lean_modifier"] == 0.0
    assert result["ee_bonus_kcal"] == 0.0


# ---------------------------------------------------------------------------
# (b) p_ratio NEVER exceeds 0.92 or goes below 0.40 with ANY stack
# ---------------------------------------------------------------------------

def test_p_ratio_always_within_hard_bounds():
    """(b) p_ratio in [0.40, 0.92] for every row regardless of stack."""
    # Test with a maximal anabolic stack (all compounds)
    full_stack = [
        {"compound": "testosterone",  "dose_mg": 500},
        {"compound": "trenbolone",    "dose_mg": 400},
        {"compound": "oxandrolone",   "dose_mg": 50},
        {"compound": "nandrolone",    "dose_mg": 300},
        {"compound": "boldenone",     "dose_mg": 400},
        {"compound": "stanozolol",    "dose_mg": 50},
        {"compound": "methasterone",  "dose_mg": 20},
        {"compound": "clenbuterol",   "dose_mg": 120},
        {"compound": "mk677",         "dose_mg": 25},
        {"compound": "t3",            "dose_mg": 100},  # high-dose → lean penalty
    ]
    prog = _run(ped_use=True, ped_stack=full_stack)
    for row in prog:
        assert row["p_ratio"] <= _PED_P_FAT_HARD_CAP + 1e-9, (
            f"Week {row['week_number']}: p_ratio={row['p_ratio']:.4f} exceeds 0.92 hard cap"
        )
        assert row["p_ratio"] >= _PED_P_FAT_FLOOR - 1e-9, (
            f"Week {row['week_number']}: p_ratio={row['p_ratio']:.4f} below 0.40 floor"
        )


def test_compute_ped_stack_p_fat_hard_cap():
    """(b) compute_ped_stack_modifiers: applying delta to baseline never produces >0.92."""
    # A stack with maximum-modifier compounds — even summed, delta must be capped.
    stack = [
        {"compound": "trenbolone"},
        {"compound": "oxandrolone"},
        {"compound": "testosterone"},
        {"compound": "clenbuterol"},
        {"compound": "nandrolone"},
        {"compound": "boldenone"},
        {"compound": "methasterone"},
        {"compound": "stanozolol"},
    ]
    result = compute_ped_stack_modifiers(stack, week=1)
    p_fat = _PED_P_FAT_BASELINE + result["p_fat_delta"]
    assert p_fat <= _PED_P_FAT_HARD_CAP + 1e-9, (
        f"p_fat_total={p_fat:.4f} exceeds 0.92 cap even before floor clamp"
    )
    assert p_fat >= _PED_P_FAT_FLOOR - 1e-9, (
        f"p_fat_total={p_fat:.4f} below 0.40 floor"
    )


def test_t3_high_dose_produces_negative_p_fat_delta():
    """(b) T3 at high dose (>75 mcg) must produce a NEGATIVE p_fat_delta."""
    result_high = compute_ped_stack_modifiers(
        [{"compound": "t3", "dose_mg": 100}], week=1
    )
    result_low = compute_ped_stack_modifiers(
        [{"compound": "t3", "dose_mg": 25}], week=1
    )
    assert result_high["p_fat_delta"] < result_low["p_fat_delta"], (
        "High-dose T3 should produce a lower (more negative) p_fat_delta than low-dose"
    )
    # Specifically: high-dose T3 alone should produce a negative delta
    assert result_high["p_fat_delta"] < 0.0, (
        f"High-dose T3 (100mcg) p_fat_delta={result_high['p_fat_delta']:.4f} should be negative"
    )


# ---------------------------------------------------------------------------
# (c) Diminishing returns: 5-compound stack modifier < sum of individuals
# ---------------------------------------------------------------------------

def test_diminishing_returns_five_compounds():
    """(c) Five-compound stack modifier < naive sum of individual modifiers."""
    compounds = ["testosterone", "trenbolone", "oxandrolone", "nandrolone", "boldenone"]
    individual_sum = sum(
        compute_ped_stack_modifiers([{"compound": c}], week=1)["p_fat_delta"]
        for c in compounds
    )
    combined = compute_ped_stack_modifiers(
        [{"compound": c} for c in compounds], week=1
    )["p_fat_delta"]
    # The combined delta must be STRICTLY less than the naive sum
    # (diminishing returns prevents simple additivity)
    assert combined < individual_sum, (
        f"Diminishing returns failed: combined={combined:.4f} >= sum_of_individuals={individual_sum:.4f}. "
        "Each extra compound must contribute DIMINISHING_BASE^i of its modifier."
    )


def test_diminishing_returns_lean_modifier():
    """(c) Lean modifier sum for N compounds < naive sum of N individual modifiers.

    The diminishing-returns formula (DIMINISHING_BASE^i) means a multi-compound
    stack's lean_modifier is strictly less than the sum of each compound computed
    individually.  This is the core invariant — not that marginal gain per compound
    decreases in any given ordering (the sort-descending step can re-order gains).
    """
    compounds = ["nandrolone", "clenbuterol", "mk677"]
    individual_sum = sum(
        compute_ped_stack_modifiers([{"compound": c}], week=1)["lean_modifier"]
        for c in compounds
    )
    combined = compute_ped_stack_modifiers(
        [{"compound": c} for c in compounds], week=1
    )["lean_modifier"]
    # Combined must be LESS than the naive sum (diminishing returns in effect)
    assert combined < individual_sum, (
        f"Diminishing returns must make combined lean_modifier < sum of individuals: "
        f"combined={combined:.4f}, naive_sum={individual_sum:.4f}"
    )


# ---------------------------------------------------------------------------
# (d) Clenbuterol desensitization reduces ee_bonus after week 1
# ---------------------------------------------------------------------------

def test_clen_desensitization_reduces_ee_bonus_after_week1():
    """(d) Clen EE bonus at week 2 must be LESS than week 1 (−40%/week desensitization)."""
    stack = [{"compound": "clenbuterol", "dose_mg": 120}]
    ee_week1 = compute_ped_stack_modifiers(stack, week=1)["ee_bonus_kcal"]
    ee_week2 = compute_ped_stack_modifiers(stack, week=2)["ee_bonus_kcal"]
    ee_week3 = compute_ped_stack_modifiers(stack, week=3)["ee_bonus_kcal"]
    assert ee_week1 > 0.0, "Clen EE bonus in week 1 must be > 0"
    assert ee_week2 < ee_week1, (
        f"Clen EE bonus must decrease after week 1: week1={ee_week1}, week2={ee_week2}"
    )
    assert ee_week3 < ee_week2, (
        f"Clen EE bonus must continue decreasing: week2={ee_week2}, week3={ee_week3}"
    )


def test_clen_desensitization_at_40_pct_per_week():
    """(d) Desensitization rate must be approximately −40% per week after week 1."""
    stack = [{"compound": "clenbuterol", "dose_mg": 120}]
    ee_week1 = compute_ped_stack_modifiers(stack, week=1)["ee_bonus_kcal"]
    ee_week2 = compute_ped_stack_modifiers(stack, week=2)["ee_bonus_kcal"]
    # Week 2 should be week 1 × (1 − 0.40) = 60% of week 1
    expected_week2 = ee_week1 * 0.60
    assert abs(ee_week2 - expected_week2) < 1.0, (
        f"Clen desensitization: expected week2 ≈ {expected_week2:.1f}, got {ee_week2:.1f}"
    )


def test_clen_fully_desensitized_by_week3():
    """(d) Clen EE bonus reaches zero by week 3 (1 - 2*0.40 = 0.20, week 4 = zero)."""
    stack = [{"compound": "clenbuterol", "dose_mg": 120}]
    ee_week4 = compute_ped_stack_modifiers(stack, week=4)["ee_bonus_kcal"]
    # At week 4: decay = max(0, 1 - (4-1)*0.40) = max(0, 1 - 1.2) = 0.0
    assert ee_week4 == 0.0, (
        f"Clen must be fully desensitized by week 4 (week=4 → decay=0): got {ee_week4}"
    )


# ---------------------------------------------------------------------------
# (e) Trajectory unaffected: engine converges to goal regardless of stack
# ---------------------------------------------------------------------------

def test_trajectory_goal_sacred_with_full_stack():
    """(e) Dual-goal invariant must hold even with a full PED stack."""
    full_stack = [
        {"compound": "testosterone",  "dose_mg": 500},
        {"compound": "trenbolone",    "dose_mg": 400},
        {"compound": "oxandrolone",   "dose_mg": 50},
        {"compound": "nandrolone",    "dose_mg": 300},
        {"compound": "clenbuterol",   "dose_mg": 120},
    ]
    prog = _run(ped_use=True, ped_stack=full_stack)
    final = prog[-1]
    assert abs(final["weight"] - 217.0) <= 0.5, (
        f"Weight {final['weight']:.2f} did not converge to 217.0 with full stack"
    )
    assert abs(final["body_fat_percentage"] - 13.0) <= 0.5, (
        f"BF {final['body_fat_percentage']:.2f}% did not converge to 13.0% with full stack"
    )


def test_trajectory_identical_with_and_without_stack():
    """(e) Weight and BF trajectory must be IDENTICAL whether or not a stack is provided.

    The stack affects p_ratio (reported), muscle_gain, and ped_ee_bonus_kcal —
    NOT the dual-goal convergence trajectory (weight + BF path).
    """
    prog_no_stack = _run(ped_use=True, ped_stack=None)
    prog_with_stack = _run(ped_use=True, ped_stack=[
        {"compound": "testosterone", "dose_mg": 500},
        {"compound": "trenbolone",   "dose_mg": 400},
        {"compound": "t3",           "dose_mg": 50},
    ])
    for a, b in zip(prog_no_stack, prog_with_stack):
        assert abs(a["weight"] - b["weight"]) < 1e-6, (
            f"Week {a['week_number']}: weight trajectory changed with stack: "
            f"{a['weight']:.4f} vs {b['weight']:.4f}"
        )
        assert abs(a["body_fat_percentage"] - b["body_fat_percentage"]) < 1e-6, (
            f"Week {a['week_number']}: BF trajectory changed with stack: "
            f"{a['body_fat_percentage']:.4f} vs {b['body_fat_percentage']:.4f}"
        )
        assert abs(a["fat_mass"] - b["fat_mass"]) < 1e-6, (
            f"Week {a['week_number']}: fat_mass changed with stack"
        )


# ---------------------------------------------------------------------------
# Additional PED stack correctness tests
# ---------------------------------------------------------------------------

def test_ped_stack_emits_new_fields_on_every_row():
    """PED stack new fields (ped_ee_bonus_kcal, ped_confidence) present on every row."""
    stack = [{"compound": "testosterone"}, {"compound": "clenbuterol", "dose_mg": 80}]
    prog = _run(ped_use=True, ped_stack=stack)
    for row in prog:
        assert "ped_ee_bonus_kcal" in row, f"Week {row['week_number']}: missing ped_ee_bonus_kcal"
        assert "ped_confidence" in row, f"Week {row['week_number']}: missing ped_confidence"
        assert isinstance(row["ped_ee_bonus_kcal"], float), (
            f"Week {row['week_number']}: ped_ee_bonus_kcal must be float"
        )
        assert row["ped_confidence"] in ("high", "medium", "low"), (
            f"Week {row['week_number']}: ped_confidence='{row['ped_confidence']}' invalid"
        )


def test_low_evidence_compounds_flag():
    """Low-evidence compounds must set confidence='low' and appear in low_evidence_compounds."""
    for compound in PED_LOW_EVIDENCE_COMPOUNDS:
        result = compute_ped_stack_modifiers([{"compound": compound}], week=1)
        assert result["confidence"] == "low", (
            f"{compound} should produce confidence='low', got '{result['confidence']}'"
        )
        assert compound in result["low_evidence_compounds"], (
            f"{compound} must appear in low_evidence_compounds list"
        )


def test_high_confidence_testosterone_only():
    """Testosterone-only stack must produce confidence='high' (High evidence)."""
    result = compute_ped_stack_modifiers([{"compound": "testosterone", "dose_mg": 500}], week=1)
    assert result["confidence"] == "high", (
        f"Testosterone alone should be High evidence, got '{result['confidence']}'"
    )


def test_stack_p_ratio_modifier_is_positive():
    """A trenbolone + testosterone stack must produce a positive p_fat_delta.

    Note: at 39.2% BF + RESET phase the base p_ratio (Forbes + phase bonus) already
    exceeds 0.92, so the clamped output stays at 0.92 regardless of the stack.
    The correct assertion is that compute_ped_stack_modifiers itself returns
    p_fat_delta > 0, proving the combining formula works. The 0.92 cap is a
    downstream clamping step applied in predict_weight_loss.
    """
    result = compute_ped_stack_modifiers([
        {"compound": "testosterone", "dose_mg": 500},
        {"compound": "trenbolone",   "dose_mg": 400},
    ], week=1)
    assert result["p_fat_delta"] > 0.0, (
        f"Test + Tren stack should produce positive p_fat_delta, "
        f"got {result['p_fat_delta']:.4f}"
    )
    # Verify the final per-row p_ratio is always within [0.40, 0.92]
    prog = _run(ped_use=True, ped_stack=[
        {"compound": "testosterone", "dose_mg": 500},
        {"compound": "trenbolone",   "dose_mg": 400},
    ])
    for row in prog:
        assert row["p_ratio"] <= 0.92 + 1e-9, (
            f"Week {row['week_number']}: p_ratio={row['p_ratio']:.4f} exceeds 0.92 cap"
        )


def test_clen_stack_produces_positive_ee_bonus():
    """Clenbuterol stack must produce ped_ee_bonus_kcal > 0 on week-1 rows."""
    stack = [{"compound": "clenbuterol", "dose_mg": 120}]
    prog = _run(ped_use=True, ped_stack=stack)
    # Week 0 uses week=1 for the stack (first active week) — must have EE bonus
    assert prog[0]["ped_ee_bonus_kcal"] > 0.0, "Week 0: Clen must produce EE bonus > 0"
    assert prog[1]["ped_ee_bonus_kcal"] > 0.0, "Week 1: Clen must produce EE bonus > 0"


# ===========================================================================
# ALIAS NORMALIZATION TESTS (HIGH-2 fix, 2026-06-08)
# Verifies that every compound the UI picker can emit resolves to a real
# engine table entry — no more silent-zero on common names.
# ===========================================================================

# Complete list of UI catalogue `value` strings from ped-stack-picker.tsx:
_UI_CATALOGUE_VALUES = [
    "testosterone", "anavar", "deca", "clenbuterol",
    "t3", "mk677", "trenbolone", "equipoise", "winstrol",
    "superdrol", "proviron",
]


def test_alias_common_names_produce_nonzero_modifier():
    """HIGH-2: stack of COMMON names (not canonical) must produce a non-zero combined modifier.

    This was the original bug: anavar/eq/deca/winstrol/proviron/superdrol/equipoise
    were NOT in _PED_P_FAT_MID, so they were silently zeroed.
    After the alias fix, each must resolve to a canonical key with a real modifier.
    """
    common_name_stack = [
        {"compound": "anavar"},    # → oxandrolone
        {"compound": "eq"},        # → boldenone
        {"compound": "deca"},      # → nandrolone
        {"compound": "winstrol"},  # → stanozolol
    ]
    result = compute_ped_stack_modifiers(common_name_stack, week=1)
    assert result["p_fat_delta"] != 0.0, (
        "Common-name stack (anavar, eq, deca, winstrol) must produce a non-zero "
        f"p_fat_delta after alias resolution; got {result['p_fat_delta']}"
    )
    assert result["lean_modifier"] != 0.0, (
        "Common-name stack must produce a non-zero lean_modifier after alias resolution; "
        f"got {result['lean_modifier']}"
    )


def test_alias_canonical_and_common_produce_identical_modifiers():
    """HIGH-2: canonical and common-name forms of the SAME stack must produce identical modifiers.

    Before the fix, canonical-name stack returned real values while the
    common-name version returned zero (silent alias miss).
    """
    canonical_stack = [
        {"compound": "oxandrolone"},
        {"compound": "boldenone"},
        {"compound": "nandrolone"},
        {"compound": "stanozolol"},
    ]
    common_stack = [
        {"compound": "anavar"},
        {"compound": "equipoise"},
        {"compound": "deca"},
        {"compound": "winstrol"},
    ]
    canon = compute_ped_stack_modifiers(canonical_stack, week=1)
    common = compute_ped_stack_modifiers(common_stack, week=1)

    assert abs(canon["p_fat_delta"] - common["p_fat_delta"]) < 1e-9, (
        f"Canonical p_fat_delta={canon['p_fat_delta']:.6f} != "
        f"common p_fat_delta={common['p_fat_delta']:.6f} — alias map is inconsistent"
    )
    assert abs(canon["lean_modifier"] - common["lean_modifier"]) < 1e-9, (
        f"Canonical lean_modifier={canon['lean_modifier']:.6f} != "
        f"common lean_modifier={common['lean_modifier']:.6f} — alias map is inconsistent"
    )
    assert canon["confidence"] == common["confidence"], (
        f"Canonical confidence={canon['confidence']} != "
        f"common confidence={common['confidence']}"
    )


def test_every_ui_catalogue_value_resolves():
    """HIGH-2: every compound the picker can emit must resolve to a real modifier entry.

    Tests the complete COMPOUNDS array from ped-stack-picker.tsx.
    Each UI `value` string must either be a canonical engine key OR have an alias
    mapping to one — it must NOT silently return zero for a known compound.
    """
    # These are deliberately low-modifier compounds (boldenone/stanozolol/mesterolone)
    # that legitimately have small (but non-zero) p_fat modifiers.
    # We test that each one resolves by checking the individual result is consistent:
    # single-compound results with a known canonical entry must match the table value.
    from new_prime_python_code.PRIME_Calculations import (
        _PED_P_FAT_MID, _COMPOUND_ALIASES, _T3_CANONICAL_SET,
    )

    # Map: UI value → expected canonical (for human-readable failure messages)
    ui_to_canonical_expected = {
        "testosterone": "testosterone",
        "anavar":       "oxandrolone",
        "deca":         "nandrolone",
        "clenbuterol":  "clenbuterol",
        "t3":           "t3",
        "mk677":        "mk677",
        "trenbolone":   "trenbolone",
        "equipoise":    "boldenone",
        "winstrol":     "stanozolol",
        "superdrol":    "methasterone",
        "proviron":     "mesterolone",
    }

    for ui_val, expected_canonical in ui_to_canonical_expected.items():
        # Resolve via the alias map
        normalised = ui_val.lower().strip()
        canonical = _COMPOUND_ALIASES.get(normalised, normalised)
        # Must resolve to expected canonical
        assert canonical == expected_canonical, (
            f"UI value {ui_val!r} resolved to {canonical!r}, "
            f"expected {expected_canonical!r}"
        )
        # Must be in the engine table (or T3 set)
        is_in_table = canonical in _PED_P_FAT_MID or canonical in _T3_CANONICAL_SET
        assert is_in_table, (
            f"UI value {ui_val!r} → canonical {canonical!r} "
            "is NOT in _PED_P_FAT_MID or _T3_CANONICAL_SET — engine will zero it"
        )


def test_unknown_compound_returns_zero_not_error():
    """HIGH-2: an unknown compound in the stack must be silently skipped (not raise).

    The warning is emitted to the logger; the unknown compound contributes 0 to
    the modifier (but is not a hard error — the rest of the stack still works).
    """
    import logging
    stack = [
        {"compound": "totally_unknown_xyz"},
        {"compound": "testosterone"},   # known — must still work
    ]
    with __import__("unittest.mock", fromlist=["patch"]).patch.object(
        __import__("new_prime_python_code.PRIME_Calculations",
                   fromlist=["logger"]).logger,
        "warning",
    ) as mock_warn:
        result = compute_ped_stack_modifiers(stack, week=1)
        # The warning must have fired for the unknown compound
        assert mock_warn.called, (
            "logger.warning must be called for the unknown compound"
        )

    # testosterone is still in the stack — non-zero result
    assert result["p_fat_delta"] > 0.0, (
        "Known compounds in mixed stack must still contribute their modifier"
    )


def test_alias_t3_variants_all_resolve():
    """HIGH-2: all T3 name variants resolve to 't3' and are handled by T3 path."""
    t3_variants = ["t3", "liothyronine", "cytomel", "t3 liothyronine", "t3 cytomel"]
    for variant in t3_variants:
        result = compute_ped_stack_modifiers(
            [{"compound": variant, "dose_mg": 25}], week=1
        )
        # Low dose T3 → positive p_fat_delta
        assert result["p_fat_delta"] > 0.0, (
            f"T3 variant {variant!r} at 25mcg must produce positive p_fat_delta; "
            f"got {result['p_fat_delta']}"
        )


def test_alias_clen_variants_all_resolve():
    """HIGH-2: 'clen' alias must resolve to 'clenbuterol' and produce EE bonus."""
    result = compute_ped_stack_modifiers(
        [{"compound": "clen", "dose_mg": 80}], week=1
    )
    assert result["ee_bonus_kcal"] > 0.0, (
        f"'clen' alias must produce ee_bonus_kcal > 0; got {result['ee_bonus_kcal']}"
    )


def test_t3_only_confidence_is_medium():
    """MEDIUM fix: a T3-only stack must yield confidence='medium', not 'high'.

    Previous code checked `any(c in medium_set for c in all_compounds_in_stack)`
    but t3_names was not included in all_compounds_in_stack, so T3 alone yielded
    'high'.  After the fix, T3 is in the medium-evidence set.
    """
    result = compute_ped_stack_modifiers(
        [{"compound": "t3", "dose_mg": 25}], week=1
    )
    assert result["confidence"] == "medium", (
        f"T3-only stack should be 'medium' confidence, got '{result['confidence']}'"
    )


def test_clen_only_confidence_is_medium():
    """MEDIUM fix: a Clenbuterol-only stack must yield confidence='medium'."""
    result = compute_ped_stack_modifiers(
        [{"compound": "clenbuterol", "dose_mg": 80}], week=1
    )
    assert result["confidence"] == "medium", (
        f"Clen-only stack should be 'medium' confidence, got '{result['confidence']}'"
    )


def test_no_false_positive_t3_detection_from_test_compound():
    """HIGH-2: 'test3' or 'sust3' must NOT be classified as T3.

    The old substring check `'t3' in c` would fire on these strings.
    Exact-set match (_T3_CANONICAL_SET) prevents the false positive.
    """
    from new_prime_python_code.PRIME_Calculations import _resolve_compound_name
    # 'test3' must not resolve to 't3'
    canon_test3 = _resolve_compound_name("test3")
    assert canon_test3 != "t3", (
        "'test3' must not be classified as T3 (was a false positive with substring check)"
    )
    # 'sust3' must not resolve to 't3'
    canon_sust3 = _resolve_compound_name("sust3")
    assert canon_sust3 != "t3", (
        "'sust3' must not be classified as T3"
    )


# =============================================================================
# CONTROLLER TESTS (2026-06-08 — contest-prep course-correction system)
# =============================================================================

from new_prime_python_code.PRIME_Calculations import (  # noqa: E402
    build_contest_trajectory,
    solve_weekly_prescription,
    course_correct,
)


# ---------------------------------------------------------------------------
# (1) Target hit AT timeline_weeks (no extension, no early exit)
# ---------------------------------------------------------------------------

def test_target_hit_at_timeline_deadline():
    """The final row of the progression must be EXACTLY week == timeline_weeks.

    The controller NEVER extends the deadline. The loop runs all timeline_weeks
    and the goal is hit by construction of the fixed trajectory.
    """
    prog = _run()
    final = prog[-1]
    # Derive timeline_weeks from fixture params (start=2026-06-03, end=2026-09-23)
    expected_weeks = (datetime(2026, 9, 23) - datetime(2026, 6, 3)).days // 7
    assert final["week_number"] == expected_weeks, (
        f"Final row week_number={final['week_number']} must be {expected_weeks}; "
        "deadline was extended (controller must NEVER move the date)."
    )


def test_progression_length_equals_timeline_plus_one():
    """Progression list must have exactly timeline_weeks+1 rows (wk0 baseline + wk1..N)."""
    prog = _run()
    expected_weeks = (datetime(2026, 9, 23) - datetime(2026, 6, 3)).days // 7
    assert len(prog) == expected_weeks + 1, (
        f"Expected {expected_weeks + 1} rows (wk0 + {expected_weeks} weeks), "
        f"got {len(prog)}"
    )


# ---------------------------------------------------------------------------
# (2) Cardio prescribed when diet floor can't make the deficit
# ---------------------------------------------------------------------------

def test_cardio_prescribed_when_deficit_exceeds_diet_floor():
    """When the required fat loss is large, prescribed_cardio_sessions > 0 must fire.

    Uses a very high fat-loss requirement relative to a low TDEE so the diet
    floor is hit and the cardio lever kicks in.
    """
    # Very large deficit relative to TDEE: 10 lb/wk fat loss required
    rx = solve_weekly_prescription(
        required_fat_loss_lb=10.0,
        tdee=2500.0,
        rmr=1800.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        ped_use=False,
    )
    assert rx["prescribed_cardio_sessions"] > 0, (
        "Cardio sessions must be > 0 when diet floor alone can't deliver required deficit; "
        f"required_deficit={rx['required_deficit']}, max_safe_diet_deficit implicit"
    )
    assert rx["prescribed_cardio_min"] > 0, (
        "Cardio minutes must be > 0 when cardio lever fires"
    )
    assert rx["cardio_kcal"] > 0.0, (
        "cardio_kcal must be > 0 when cardio lever fires"
    )


def test_cardio_sessions_zero_when_diet_covers_deficit():
    """When required fat loss is small, diet lever alone covers it → no cardio needed."""
    rx = solve_weekly_prescription(
        required_fat_loss_lb=0.5,    # modest deficit
        tdee=3000.0,                 # high TDEE
        rmr=2000.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        ped_use=False,
    )
    assert rx["prescribed_cardio_sessions"] == 0, (
        "Cardio should not be prescribed when diet deficit covers the required fat loss; "
        f"cardio_sessions={rx['prescribed_cardio_sessions']}"
    )
    assert rx["correction_status"] in ("on_track", "pushing_limits"), (
        "Status should not be maxed_out when deficit is achievable by diet alone"
    )


# ---------------------------------------------------------------------------
# (3) Course-correction: actual behind line → steeper prescription, deadline unchanged
# ---------------------------------------------------------------------------

def test_course_correct_behind_line_prescribes_steeper():
    """Actual weigh-in behind required line → corrected prescription is steeper.

    'Behind' means more fat than required at this point. The engine re-solves
    to the SAME fixed deadline — never extends it.
    """
    # Original plan: 16 weeks from 266.8 lb at 39.2% BF to 217 lb at 13% BF.
    # Say at week 4 the athlete is BEHIND: 260 lb at 38% BF (should be ~250 lb).
    result_behind = course_correct(
        goal_weight=217.0,
        goal_bf=13.0,
        original_timeline_weeks=16,
        weeks_elapsed=4,
        actual_weight=260.0,   # heavy — behind
        actual_bf=38.0,
        tdee=3000.0,
        rmr=2000.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        ped_use=False,
        lean_ceiling_lb=189.0,
    )

    # Deadline must never move
    assert result_behind["deadline_unchanged"] is True, (
        "course_correct must set deadline_unchanged=True"
    )
    assert result_behind["original_timeline_weeks"] == 16, (
        "original_timeline_weeks must remain 16 (never extended)"
    )
    assert result_behind["weeks_remaining"] == 12, (
        f"weeks_remaining should be 16-4=12; got {result_behind['weeks_remaining']}"
    )

    # Required fat loss per week must be > 0 (there's still a gap to close)
    assert result_behind["required_weekly_fat_loss_lb"] > 0.0, (
        "required_weekly_fat_loss_lb must be > 0 when behind the required line"
    )

    # Compare: at week 4, being BEHIND requires more fat loss/week than if on-track.
    result_ontrack = course_correct(
        goal_weight=217.0,
        goal_bf=13.0,
        original_timeline_weeks=16,
        weeks_elapsed=4,
        actual_weight=250.0,   # lighter — closer to plan
        actual_bf=35.0,
        tdee=3000.0,
        rmr=2000.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        ped_use=False,
        lean_ceiling_lb=189.0,
    )
    assert result_behind["required_weekly_fat_loss_lb"] > result_ontrack["required_weekly_fat_loss_lb"], (
        "Being behind requires MORE fat loss/week than being on-track; "
        f"behind={result_behind['required_weekly_fat_loss_lb']:.3f} "
        f"ontrack={result_ontrack['required_weekly_fat_loss_lb']:.3f}"
    )


def test_course_correct_returns_full_prescription_fields():
    """course_correct must return all solve_weekly_prescription fields flattened."""
    result = course_correct(
        goal_weight=217.0,
        goal_bf=13.0,
        original_timeline_weeks=16,
        weeks_elapsed=4,
        actual_weight=255.0,
        actual_bf=36.0,
        tdee=3000.0,
        rmr=2000.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        ped_use=False,
        lean_ceiling_lb=189.0,
    )
    for field in [
        "training_calories", "rest_calories", "psmf_calories", "protein_g",
        "carbs_g", "prescribed_cardio_sessions", "prescribed_cardio_min",
        "cardio_kcal", "required_deficit", "max_safe_deficit", "residual_gap",
        "correction_status", "weekly_average_calories",
        "weeks_remaining", "deadline_unchanged", "required_weekly_fat_loss_lb",
    ]:
        assert field in result, f"course_correct result missing field '{field}'"


# ---------------------------------------------------------------------------
# (4) Constraint flag: impossible case → maxed_out, residual_gap > 0, date unchanged
# ---------------------------------------------------------------------------

def test_constraint_flag_maxed_out_impossible_case():
    """When required deficit far exceeds all levers, correction_status='maxed_out'."""
    # Deliberately extreme: require 20 lb/wk fat loss but very low TDEE + tight cardio
    rx = solve_weekly_prescription(
        required_fat_loss_lb=20.0,   # 70,000 kcal/week deficit — physically impossible
        tdee=2000.0,
        rmr=1600.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        ped_use=False,
        max_cardio_min_per_day=75,
    )
    assert rx["correction_status"] == "maxed_out", (
        f"Expected correction_status='maxed_out' for impossible deficit; "
        f"got '{rx['correction_status']}' with residual_gap={rx['residual_gap']}"
    )
    assert rx["residual_gap"] > 0.0, (
        f"residual_gap must be > 0 when maxed_out; got {rx['residual_gap']}"
    )


def test_deadline_never_moves_in_full_progression_impossible():
    """Even in an impossible scenario, the progression always runs timeline_weeks rows."""
    # Small window, massive gap: 3 lb/wk required but very modest TDEE
    prog = predict_weight_loss(
        current_weight=300.0, current_bf=50.0,
        goal_weight=217.0, goal_bf=13.0,
        start_date=datetime(2026, 6, 3), end_date=datetime(2026, 8, 12),  # 10 weeks
        dob=datetime(1990, 1, 1), gender="m",
        activity_level="sedentary", height_cm=180.0, is_athlete=False,
        daily_protein_intake=237, job_activity="sedentary", leisure_activity="sedentary",
        experience_level="intermediate", is_bodybuilder=False, ped_use=False,
        diet_type="balanced", exercise_type="resistance", sleep_quality="good",
        workout_days=3, volume_score=7, intensity_score=7, eating_window_hours=12.0,
        goal_type="cut", calorie_floor=1200.0,
    )
    expected_weeks = (datetime(2026, 8, 12) - datetime(2026, 6, 3)).days // 7
    assert prog[-1]["week_number"] == expected_weeks, (
        f"Deadline must not be moved even in impossible case: "
        f"final_week={prog[-1]['week_number']}, expected={expected_weeks}"
    )
    # Some weeks must flag maxed_out (the gap is enormous)
    statuses = {row["correction_status"] for row in prog if row["week_number"] > 0}
    assert "maxed_out" in statuses, (
        "An impossible deficit must produce at least one maxed_out row"
    )


# ---------------------------------------------------------------------------
# (5) 1,200 PSMF floor + ≥237g protein hold on every row (controller version)
# ---------------------------------------------------------------------------

def test_controller_psmf_floor_and_protein_floor_every_row():
    """Controller prescription: psmf_calories >= 1200 AND protein_g >= 237 on prescribed rows.

    Week 0 is the baseline state row (not a prescription) — it uses the reference
    curve protein value which may be below 237g. The floor applies from week 1+ where
    solve_weekly_prescription runs.
    """
    prog = _run(calorie_floor=1200.0)
    for row in prog:
        wk = row["week_number"]
        if wk == 0:
            # Week 0 is baseline state — not a solve_weekly_prescription output
            continue
        assert row["psmf_calories"] >= 1200.0 - 1e-6, (
            f"Week {wk}: psmf_calories={row['psmf_calories']} < 1200 floor"
        )
        assert row["protein_g"] >= 237.0 - 1e-6, (
            f"Week {wk}: protein_g={row['protein_g']} < 237g floor"
        )


def test_solve_prescription_protein_floor():
    """solve_weekly_prescription must enforce protein_g >= _MIN_PROTEIN_G (237)."""
    from new_prime_python_code.PRIME_Calculations import _MIN_PROTEIN_G
    # Pass low protein — floor must kick in
    rx = solve_weekly_prescription(
        required_fat_loss_lb=1.5,
        tdee=2500.0,
        rmr=1800.0,
        protein_g=100.0,   # below floor
        calorie_floor=1200.0,
    )
    assert rx["protein_g"] >= _MIN_PROTEIN_G - 1e-6, (
        f"protein_g={rx['protein_g']} must be >= {_MIN_PROTEIN_G}"
    )
    assert rx["psmf_calories"] >= 1200.0 - 1e-6, (
        f"psmf_calories={rx['psmf_calories']} must be >= 1200"
    )


# ---------------------------------------------------------------------------
# (6) Empty PED stack = no-op (already tested above; verify with controller fields)
# ---------------------------------------------------------------------------

def test_empty_ped_stack_controller_fields_unaffected():
    """Empty PED stack must produce identical controller fields to None stack."""
    prog_none = _run(ped_use=True, ped_stack=None)
    prog_empty = _run(ped_use=True, ped_stack=[])

    for a, b in zip(prog_none, prog_empty):
        wk = a["week_number"]
        assert a["correction_status"] == b["correction_status"], (
            f"Week {wk}: correction_status differs: {a['correction_status']} vs {b['correction_status']}"
        )
        assert a["prescribed_cardio_sessions"] == b["prescribed_cardio_sessions"], (
            f"Week {wk}: prescribed_cardio_sessions differs"
        )
        assert a["required_deficit"] == b["required_deficit"], (
            f"Week {wk}: required_deficit differs"
        )


# ---------------------------------------------------------------------------
# (7) New controller fields present on every row
# ---------------------------------------------------------------------------

CONTROLLER_FIELDS = [
    "required_weight",
    "required_bf",
    "lean_ceiling_lb",
    "prescribed_cardio_sessions",
    "prescribed_cardio_min",
    "cardio_kcal",
    "carbs_g",
    "required_deficit",
    "max_safe_deficit",
    "residual_gap",
    "correction_status",
]


def test_controller_fields_present_on_every_row():
    """All new controller fields must be present on every row of the progression."""
    prog = _run()
    for row in prog:
        wk = row.get("week_number", "?")
        for field in CONTROLLER_FIELDS:
            assert field in row, (
                f"Week {wk}: missing controller field '{field}'"
            )


def test_controller_fields_correct_types():
    """Controller fields must have the correct Python types on every row."""
    prog = _run()
    for row in prog:
        wk = row["week_number"]
        assert isinstance(row["required_weight"], (int, float)), \
            f"Week {wk}: required_weight must be numeric"
        assert isinstance(row["required_bf"], (int, float)), \
            f"Week {wk}: required_bf must be numeric"
        assert isinstance(row["lean_ceiling_lb"], (int, float)), \
            f"Week {wk}: lean_ceiling_lb must be numeric"
        assert isinstance(row["prescribed_cardio_sessions"], int), \
            f"Week {wk}: prescribed_cardio_sessions must be int"
        assert isinstance(row["prescribed_cardio_min"], int), \
            f"Week {wk}: prescribed_cardio_min must be int"
        assert isinstance(row["cardio_kcal"], (int, float)), \
            f"Week {wk}: cardio_kcal must be numeric"
        assert isinstance(row["carbs_g"], int), \
            f"Week {wk}: carbs_g must be int"
        assert isinstance(row["required_deficit"], (int, float)), \
            f"Week {wk}: required_deficit must be numeric"
        assert isinstance(row["max_safe_deficit"], (int, float)), \
            f"Week {wk}: max_safe_deficit must be numeric"
        assert isinstance(row["residual_gap"], (int, float)), \
            f"Week {wk}: residual_gap must be numeric"
        assert row["correction_status"] in ("on_track", "pushing_limits", "maxed_out"), \
            f"Week {wk}: correction_status='{row['correction_status']}' invalid"


# ---------------------------------------------------------------------------
# (8) build_contest_trajectory unit tests
# ---------------------------------------------------------------------------

def test_build_trajectory_exact_goal_at_deadline():
    """build_contest_trajectory must land EXACTLY on goal at the final week."""
    traj = build_contest_trajectory(
        start_weight=266.8, start_bf=39.2,
        goal_weight=217.0, goal_bf=13.0,
        timeline_weeks=16,
        lean_ceiling_lb=189.0,
    )
    final = traj[-1]
    assert final["week"] == 16, f"Final trajectory week={final['week']}, expected 16"
    assert abs(final["required_weight"] - 217.0) < 0.01, (
        f"Trajectory final weight {final['required_weight']:.2f} must be 217.0"
    )
    # Final BF: derived from final lean+fat
    final_bf = final["required_bf"]
    assert abs(final_bf - 13.0) < 0.5, (
        f"Trajectory final BF {final_bf:.2f}% must converge to 13.0% (±0.5)"
    )


def test_build_trajectory_fat_is_monotonically_decreasing():
    """required_fat must monotonically decrease in build_contest_trajectory (cut mode)."""
    traj = build_contest_trajectory(
        start_weight=266.8, start_bf=39.2,
        goal_weight=217.0, goal_bf=13.0,
        timeline_weeks=16,
        lean_ceiling_lb=189.0,
    )
    fats = [t["required_fat"] for t in traj]
    for i in range(1, len(fats)):
        assert fats[i] <= fats[i - 1] + 1e-6, (
            f"required_fat must decrease: week {i} ({fats[i]:.3f}) > week {i-1} ({fats[i-1]:.3f})"
        )


def test_build_trajectory_lean_never_exceeds_ceiling():
    """required_lean must never exceed lean_ceiling_lb in the trajectory."""
    ceiling = 189.0
    traj = build_contest_trajectory(
        start_weight=266.8, start_bf=39.2,
        goal_weight=217.0, goal_bf=13.0,
        timeline_weeks=16,
        lean_ceiling_lb=ceiling,
    )
    for t in traj:
        assert t["required_lean"] <= ceiling + 1e-6, (
            f"Week {t['week']}: required_lean={t['required_lean']:.2f} > "
            f"lean_ceiling_lb={ceiling}"
        )


def test_build_trajectory_length():
    """build_contest_trajectory must return timeline_weeks+1 entries (wk0..wkN)."""
    n = 12
    traj = build_contest_trajectory(
        start_weight=250.0, start_bf=30.0,
        goal_weight=217.0, goal_bf=13.0,
        timeline_weeks=n,
        lean_ceiling_lb=189.0,
    )
    assert len(traj) == n + 1, f"Expected {n+1} trajectory entries, got {len(traj)}"


# ---------------------------------------------------------------------------
# (9) Prescription solver unit tests
# ---------------------------------------------------------------------------

def test_prescription_psmf_floor_hard():
    """solve_weekly_prescription PSMF floor must be max(calorie_floor, protein*4+250)."""
    protein = 237.0
    floor = 1200.0
    rx = solve_weekly_prescription(
        required_fat_loss_lb=2.0,
        tdee=2500.0,
        rmr=1800.0,
        protein_g=protein,
        calorie_floor=floor,
    )
    expected_psmf_floor = max(floor, protein * 4 + 250)
    assert rx["psmf_calories"] >= expected_psmf_floor - 1e-6, (
        f"psmf_calories={rx['psmf_calories']} must be >= max(calorie_floor, protein*4+250)="
        f"{expected_psmf_floor}"
    )


def test_prescription_rest_day_is_85pct_of_training():
    """rest_calories must equal round(training_calories * 0.85) when above floor."""
    rx = solve_weekly_prescription(
        required_fat_loss_lb=1.0,
        tdee=3000.0,
        rmr=2000.0,
        protein_g=237.0,
        calorie_floor=1200.0,
    )
    expected_rest = round(rx["training_calories"] * 0.85)
    # Allow ±1 for rounding
    assert abs(rx["rest_calories"] - expected_rest) <= 1, (
        f"rest_calories={rx['rest_calories']} != round(train*0.85)={expected_rest}"
    )


def test_prescription_weekly_average_formula():
    """weekly_average_calories = round((3*train + 3*rest + 1*psmf) / 7)."""
    rx = solve_weekly_prescription(
        required_fat_loss_lb=1.5,
        tdee=2800.0,
        rmr=1900.0,
        protein_g=237.0,
        calorie_floor=1200.0,
    )
    expected = round(
        (3 * rx["training_calories"] + 3 * rx["rest_calories"] + 1 * rx["psmf_calories"]) / 7
    )
    assert rx["weekly_average_calories"] == expected, (
        f"weekly_average_calories={rx['weekly_average_calories']} != formula={expected}"
    )


# =============================================================================
# CALIBRATION BUG FIX TESTS (2026-06-08 — magnitude + taper correctness)
# =============================================================================

from new_prime_python_code.PRIME_Calculations import (  # noqa: E402
    _MAX_WEEKLY_DEFICIT_KCAL,
    _MAX_DAILY_DEFICIT_KCAL,
    _ALPERT_LB_PER_LB_PER_WEEK,
    _ALPERT_PED_FACTOR,
    _ALPERT_NAT_FACTOR,
    _KCAL_PER_LB_FAT,
)

_PRIME_PARAMS = dict(
    current_weight=267.0, current_bf=39.2,
    goal_weight=217.0, goal_bf=13.0,
    start_date=datetime(2026, 6, 1), end_date=datetime(2026, 9, 21),  # 16 weeks
    dob=datetime(1990, 1, 1), gender="m",
    activity_level="moderate", height_cm=183.0, is_athlete=False,
    daily_protein_intake=237, job_activity="light", leisure_activity="light",
    experience_level="advanced", is_bodybuilder=True, ped_use=True,
    diet_type="balanced", exercise_type="resistance", sleep_quality="good",
    workout_days=3, volume_score=7, intensity_score=7, eating_window_hours=12.0,
    goal_type="cut", calorie_floor=1200.0,
    lean_ceiling_lb=189.0,
)


def test_required_deficit_never_exceeds_10500_per_week():
    """FIX-1: No week's required_deficit may exceed 10,500 kcal/wk (~1,500/day).

    The previous bug produced ~28,819 kcal/wk on week 1 (≈4,117/day) because the
    geometric fat-loss trajectory was uncapped and lean-regain energy was erroneously
    added to the fat deficit.  The fix caps the deficit at fat_loss_lb × 3500, then
    further bounds it at _MAX_WEEKLY_DEFICIT_KCAL.
    """
    prog = predict_weight_loss(**_PRIME_PARAMS)
    for row in prog:
        wk = row["week_number"]
        if wk == 0:
            continue
        assert row["required_deficit"] <= _MAX_WEEKLY_DEFICIT_KCAL + 1.0, (
            f"Week {wk}: required_deficit={row['required_deficit']:.0f} exceeds "
            f"max allowed {_MAX_WEEKLY_DEFICIT_KCAL:.0f} kcal/wk (~1,500/day). "
            "Deficit must be fat_loss_lb × 3500, capped at the weekly ceiling."
        )


def test_no_daily_deficit_exceeds_1500_kcal():
    """FIX-1: Implied daily deficit (required_deficit/7) must never exceed 1,500 kcal/day."""
    prog = predict_weight_loss(**_PRIME_PARAMS)
    for row in prog:
        wk = row["week_number"]
        if wk == 0:
            continue
        daily_deficit = row["required_deficit"] / 7.0
        assert daily_deficit <= _MAX_DAILY_DEFICIT_KCAL + 1.0, (
            f"Week {wk}: implied daily deficit={daily_deficit:.0f} exceeds 1,500 kcal/day "
            f"(required_deficit={row['required_deficit']:.0f})"
        )


def test_weekly_fat_loss_never_exceeds_alpert_cap():
    """FIX-1: Each week's fat loss must be at most current_fat_mass × 0.062 × ped_factor.

    For a ped_use=True scenario the cap is Alpert × 1.4 = 0.062 × 1.4 = 0.0868 lb/lb-fat/wk.
    The fat_mass stored on each row is the POST-loss value; pre-loss = fat_mass + fat_loss_lb.
    """
    prog = predict_weight_loss(**_PRIME_PARAMS)
    ped_factor = _ALPERT_PED_FACTOR  # ped_use=True in _PRIME_PARAMS
    for row in prog:
        wk = row["week_number"]
        if wk == 0:
            continue
        fat_loss = row["weekly_fat_loss_lb"]
        fat_mass_before = row["fat_mass"] + fat_loss
        if fat_mass_before <= 0:
            continue
        alpert_cap = fat_mass_before * _ALPERT_LB_PER_LB_PER_WEEK * ped_factor
        assert fat_loss <= alpert_cap + 1e-3, (
            f"Week {wk}: fat_loss={fat_loss:.3f} lb exceeds Alpert cap "
            f"{alpert_cap:.3f} lb (fat_mass_before={fat_mass_before:.1f}, "
            f"cap=fat_mass×0.062×{ped_factor})"
        )


def test_training_calories_monotonically_non_increasing():
    """FIX-3: Training-day calories must be MONOTONICALLY NON-INCREASING across all weeks.

    The previous bug allowed training calories to RISE late in the cut (reaching
    ~3,290 kcal/day by Wk16 because lean regain raised TDEE and the deficit was
    small).  Contest prep ALWAYS tapers down.

    PRIME's reference curve: training cal runs 1800 → 1425 (strictly descending).
    """
    prog = predict_weight_loss(**_PRIME_PARAMS)
    cut_rows = [r for r in prog if r["week_number"] >= 1]
    for i in range(1, len(cut_rows)):
        prev = cut_rows[i - 1]["training_calories"]
        curr = cut_rows[i]["training_calories"]
        assert curr <= prev + 1, (  # allow ±1 for rounding
            f"Week {cut_rows[i]['week_number']}: training_calories ROSE from "
            f"{prev} → {curr}. Contest prep requires a monotonic taper DOWN."
        )


def test_training_calories_reasonable_range():
    """FIX-3: Training calories must stay in a realistic prep range (1,200–2,800 kcal/day).

    The previous bug produced Wk1 ≈ 2,567 rising to Wk16 ≈ 3,290 — an upward
    trend that is directly inverted from contest-prep protocol. The fix:
      (a) caps calories so they never RISE (monotonic taper)
      (b) keeps them below a TDEE-derived maximum (no calorie above TDEE - small buffer)
    Upper bound is 2,800 to accommodate a 267 lb PED athlete whose TDEE is ~3,600+;
    the hard guard is the monotonic taper test, not the upper bound.
    The critical regression was calories RISING — not the absolute first-week value.
    """
    prog = predict_weight_loss(**_PRIME_PARAMS)
    for row in prog:
        wk = row["week_number"]
        if wk == 0:
            continue
        train_cal = row["training_calories"]
        assert 1200 <= train_cal <= 2800, (
            f"Week {wk}: training_calories={train_cal} out of realistic prep range "
            "[1,200–2,800]. The taper fix must keep calories within bounds."
        )


def test_maxed_out_weeks_honest_for_prime_scenario():
    """FIX-1+4: At least some weeks should be maxed_out for 217@13% in 16 wks.

    217@13% from 267@39.2% requires ~76 lb fat loss in 16 wks ≈ 4.75 lb/wk —
    well above the Alpert ceiling early (fat_mass × 0.062 × 1.4 ≈ 8.7 lb/wk early,
    then shrinks). The honest engine flags maxed_out when levers can't cover the gap.
    This test verifies the flag still fires (not silently eliminated by the fix).
    """
    prog = predict_weight_loss(**_PRIME_PARAMS)
    statuses = [r["correction_status"] for r in prog if r["week_number"] > 0]
    # The scenario may or may not be fully achievable — but at minimum, at least
    # SOME weeks must flag maxed_out to be honest about the aggressive goal.
    # (If all weeks are on_track, the Alpert cap fix may have been too permissive.)
    maxed_count = statuses.count("maxed_out")
    # For 217@13% in 16 wk we expect multiple maxed_out flags; ≥1 is the hard floor.
    assert maxed_count >= 1, (
        f"Expected at least 1 maxed_out week for 217@13% in 16 wks; "
        f"got {maxed_count}. The engine must be honest about unachievable pace."
    )


def test_wk1_required_deficit_realistic():
    """FIX-1: Week-1 required_deficit must be realistic (1,500–10,500 kcal/wk).

    The previous bug produced 28,819 kcal/wk on Wk1 — physically impossible at
    TDEE ~2,800. The post-fix value must be within the realistic range.
    """
    prog = predict_weight_loss(**_PRIME_PARAMS)
    wk1 = next(r for r in prog if r["week_number"] == 1)
    assert 1500 <= wk1["required_deficit"] <= 10_500, (
        f"Week-1 required_deficit={wk1['required_deficit']:.0f} kcal/wk is outside "
        "the realistic range [1,500–10,500]. "
        f"(Prev bug produced ~28,819 kcal/wk.)"
    )


def test_solve_prescription_alpert_cap_clips_fat_loss():
    """FIX-1: solve_weekly_prescription clips fat loss at Alpert ceiling when fat_mass supplied.

    Passing a fat_mass and a very high required_fat_loss should produce:
    - required_deficit <= fat_mass × 0.062 × ped_factor × 3500
    - residual_gap > 0 (the uncoverable demand is reported)
    - correction_status == 'maxed_out'
    """
    fat_mass = 80.0   # lb of fat
    nat_cap_lb = fat_mass * _ALPERT_LB_PER_LB_PER_WEEK * _ALPERT_NAT_FACTOR  # ≈ 4.96 lb
    # Ask for 15 lb/wk — far beyond Alpert cap
    rx = solve_weekly_prescription(
        required_fat_loss_lb=15.0,
        tdee=2800.0,
        rmr=1900.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        ped_use=False,
        current_fat_mass_lb=fat_mass,
    )
    max_achievable_deficit = nat_cap_lb * _KCAL_PER_LB_FAT
    assert rx["required_deficit"] <= max_achievable_deficit + 1.0, (
        f"required_deficit={rx['required_deficit']:.0f} must not exceed "
        f"Alpert cap equivalent {max_achievable_deficit:.0f} kcal/wk"
    )
    assert rx["residual_gap"] > 0.0, (
        f"residual_gap must be > 0 when fat loss demand exceeds Alpert cap; "
        f"got {rx['residual_gap']}"
    )
    assert rx["correction_status"] == "maxed_out", (
        f"correction_status should be 'maxed_out' when Alpert ceiling is exceeded; "
        f"got '{rx['correction_status']}'"
    )


def test_solve_prescription_taper_enforced_by_prev_training_cal():
    """FIX-3: When prev_training_cal is supplied, training_calories must be <= that value.

    This is the monotonic taper mechanism — the solver cannot produce a week where
    training calories rise above the previous week's value.
    """
    # First week with relatively low deficit → high training cal
    rx1 = solve_weekly_prescription(
        required_fat_loss_lb=1.5,
        tdee=2800.0,
        rmr=1900.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        current_fat_mass_lb=90.0,
    )
    prev_cal = float(rx1["training_calories"])
    # Second week — attempt to produce a HIGHER calorie prescription (e.g., higher TDEE)
    # by providing a much higher TDEE. Without the taper, training_cal would rise.
    rx2 = solve_weekly_prescription(
        required_fat_loss_lb=0.5,   # very small required deficit → training cal would balloon
        tdee=3500.0,                # high TDEE
        rmr=2000.0,
        protein_g=237.0,
        calorie_floor=1200.0,
        current_fat_mass_lb=85.0,
        prev_training_cal=prev_cal,  # enforce taper
    )
    assert rx2["training_calories"] <= prev_cal + 1, (  # allow ±1 rounding
        f"Taper violated: week-2 training_calories={rx2['training_calories']} "
        f"> prev_training_cal={prev_cal:.0f}. "
        "The monotonic taper must clamp calories from rising."
    )
