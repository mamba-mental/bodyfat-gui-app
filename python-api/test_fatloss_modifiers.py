"""TDD test for F8 (audit HIGH-1) — fat-loss modifiers must affect the projection.

Requirement (BDD):
  Feature: Diet / exercise / PED / fasting / bodybuilder inputs shape fat loss
    Scenario: Exercise type changes the projected body-fat trajectory
      Given two identical cuts that differ ONLY by exercise_type
      When the weekly progression is computed
      Then the projected final body-fat % differs
      (cardio raises the fat_loss fraction -> more of each week's loss is fat)

Was RED: predict_weight_loss built fat_loss_ratio from all five modifiers, then
discarded it with `fat_loss = weekly_fat_target`. So the modifiers had ZERO
effect on body composition — every cut produced the same body-fat curve.

We isolate on `exercise_type` because (unlike ped/diet/fasting, which also feed
estimate_muscle_gain) it touches the body-comp trajectory ONLY via fat_loss_ratio.
Its NEAT effect lands only in display fields, never in the weight/fat path.
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from new_prime_python_code.PRIME_Calculations import predict_weight_loss  # noqa: E402


def _run(exercise_type: str):
    return predict_weight_loss(
        current_weight=266.8, current_bf=39.2,
        goal_weight=217.0, goal_bf=13.0,
        start_date=datetime(2026, 6, 3), end_date=datetime(2026, 9, 23),
        dob=datetime(1990, 1, 1), gender="m",
        activity_level="moderate", height_cm=180.0, is_athlete=False,
        daily_protein_intake=200, job_activity="light", leisure_activity="light",
        experience_level="intermediate", is_bodybuilder=False, ped_use=False,
        diet_type="balanced", exercise_type=exercise_type, sleep_quality="good",
        workout_days=4, volume_score=7, intensity_score=7, eating_window_hours=12.0,
    )


def test_exercise_type_changes_projected_body_fat():
    resistance = _run("resistance")  # fat_loss multiplier 1.0
    cardio = _run("cardio")          # fat_loss multiplier 1.2

    assert resistance and cardio, "progression should be non-empty"
    bf_res = resistance[-1]["body_fat_percentage"]
    bf_cardio = cardio[-1]["body_fat_percentage"]

    # The modifier must actually move the projection (RED when fat_loss_ratio is dead).
    assert bf_res != bf_cardio, (
        "fat_loss_ratio is discarded — exercise_type has no effect on the "
        f"projected body fat (both ended at {bf_res}%)"
    )
    # cardio directs MORE of each week's loss to fat -> leaner end state.
    assert bf_cardio < bf_res


def test_fat_mass_responds_to_exercise_type():
    # Direct check on fat mass (the value fat_loss_ratio governs).
    resistance = _run("resistance")
    cardio = _run("cardio")
    assert cardio[-1]["fat_mass"] < resistance[-1]["fat_mass"]
