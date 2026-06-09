"""
Contract tests for the /calculate pipeline.

Verifies:
  1. All contract fields (existing + new) survive the round-trip and are NOT None
     for a normal 16-week request.
  2. A timeline < 1 week returns 4xx (not 500).
  3. goal_type and calorie_floor are accepted without error.
  4. get_smoothed_start_bf helper in database.py returns correct averages.

Run:
    cd python-api && python -m pytest test_pipeline_contract.py -q
"""

import sys
import os
from pathlib import Path

# Ensure the parent (bodyfat-gui-app) is on sys.path so that
# `new_prime_python_code` can be imported by main.py at import time.
_here = Path(__file__).parent
_root = _here.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Import the app — this triggers the PRIME module import chain.
# ---------------------------------------------------------------------------
from main import app  # noqa: E402

client = TestClient(app, raise_server_exceptions=False)

# ---------------------------------------------------------------------------
# Shared fixture: a valid 16-week request payload (PRIME's reference cut)
# ---------------------------------------------------------------------------
# The raw UserData fields (reused to build both wrapped and flat payloads)
_USER_DATA_FIELDS = {
    "name": "PRIME Test",
    "age": 35,
    "gender": "m",
    "height_feet": 5,
    "height_inches": 11,
    "height_cm": 180.3,
    "dob": "01/01/1990",
    "current_weight": 281.3,
    "current_bf": 36.8,
    "goal_weight": 220.0,
    "goal_bf": 13.0,
    "start_date": "01/01/2026",
    "end_date": "04/23/2026",   # ~16 weeks
    "activity_level": 3,
    "resistance_training": True,
    "is_athlete": True,
    "workout_type": "Bodybuilding",
    "workout_days": 5,
    "job_activity": 2,
    "leisure_activity": 2,
    "experience_level": "Advanced",
    "volume_score": 8.0,
    "intensity_score": 8.0,
    "frequency_score": 0.8,
    "is_bodybuilder": True,
    "protein_intake": 250.0,
    "diet_type": "high_protein",
    "eating_pattern": "standard",
    "eating_window_hours": 12.0,
    "ped_use": True,
    "exercise_type": "resistance",
    "sleep_quality": "good",
    "timeline_weeks": 16,
    # New contract fields
    "goal_type": "cut",
    "calorie_floor": 1200.0,
}

# /calculate and /generate-report both accept `user_data: UserData` plus an
# optional second body param.  FastAPI wraps multiple body params, so the
# request body must be {"user_data": {...}}.
VALID_PAYLOAD = {"user_data": _USER_DATA_FIELDS}

# /generate-report accepts a single `user_data: UserData` body — no wrapping.
REPORT_PAYLOAD = _USER_DATA_FIELDS

# ---------------------------------------------------------------------------
# Contract field lists
# ---------------------------------------------------------------------------
EXISTING_FIELDS = [
    "week_number",
    "date",
    "weight",
    "body_fat_percentage",
    "daily_calorie_intake",
    "tdee",
    "weekly_caloric_output",
    "total_weight_lost",
    "lean_mass",
    "fat_mass",
    "muscle_gain",
    "rmr",
    "tef",
    "neat",
    "training_calories",
    "rest_calories",
    "psmf_calories",
    "protein_g",
    "phase",
]

# These new fields come from the engine (Agent 1 may not have landed yet;
# we assert NOT None only when the field is present in the response dict).
# Fields the current engine already emits via scaled_recomp_targets:
ENGINE_EMITS_NOW = [
    "training_calories",
    "rest_calories",
    "psmf_calories",
    "protein_g",
    "phase",
    "weekly_average_calories",   # surfaced from daily_calorie_intake by API layer
]

# Fields Agent 1 will add — we assert the key IS present in the model
# (non-null once Agent 1 lands; nullable until then — test only presence).
AGENT1_FIELDS = [
    "calorie_floor",
    "weekly_fat_loss_lb",
    "p_ratio",
    "rmr_method",
    "below_rmr",
    "feasibility",
]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCalculateEndpoint:
    def test_valid_request_returns_200(self):
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:400]}"

    def test_progression_not_empty(self):
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["progression"]) > 0, "Progression list must not be empty"

    def test_existing_fields_present_and_not_none(self):
        """All pre-contract fields must be present and non-None in every week."""
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        progression = resp.json()["progression"]
        for i, week in enumerate(progression):
            for field in EXISTING_FIELDS:
                assert field in week, (
                    f"Week {i}: existing field '{field}' missing from response"
                )
                assert week[field] is not None, (
                    f"Week {i}: existing field '{field}' is None — was dropped by the model"
                )

    def test_engine_emits_now_fields_not_none(self):
        """Fields the current engine already emits must be non-None."""
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        progression = resp.json()["progression"]
        for i, week in enumerate(progression):
            for field in ENGINE_EMITS_NOW:
                assert field in week, (
                    f"Week {i}: engine-emitted field '{field}' missing from response"
                )
                assert week[field] is not None, (
                    f"Week {i}: engine-emitted field '{field}' is None — dropped somewhere"
                )

    def test_agent1_fields_present_in_model(self):
        """Agent 1 fields must at least be present as keys in the response
        (value may be None until Agent 1 lands; key must exist)."""
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        progression = resp.json()["progression"]
        assert len(progression) > 0
        week0 = progression[0]
        for field in AGENT1_FIELDS:
            assert field in week0, (
                f"Agent 1 field '{field}' not present in WeeklyProgression response — "
                "add it to the Pydantic model even if value is None for now"
            )

    def test_training_calories_nonzero(self):
        """training_calories must be a positive number (not stripped to 0)."""
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        for i, week in enumerate(resp.json()["progression"]):
            assert week["training_calories"] > 0, (
                f"Week {i}: training_calories is {week['training_calories']}, expected > 0"
            )

    def test_phase_nonempty_string(self):
        """phase must be a non-empty string (RESET/ADAPT/CYCLE/PEAK)."""
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        for i, week in enumerate(resp.json()["progression"]):
            assert isinstance(week["phase"], str) and week["phase"], (
                f"Week {i}: phase is empty or not a string: {week['phase']!r}"
            )

    def test_daily_calorie_intake_equals_training_calories(self):
        """daily_calorie_intake should equal training_calories per spec fix."""
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        for i, week in enumerate(resp.json()["progression"]):
            assert week["daily_calorie_intake"] == week["training_calories"], (
                f"Week {i}: daily_calorie_intake ({week['daily_calorie_intake']}) "
                f"!= training_calories ({week['training_calories']})"
            )

    def test_weekly_average_calories_present_and_positive(self):
        """weekly_average_calories must be present and > 0."""
        resp = client.post("/calculate", json=VALID_PAYLOAD)
        assert resp.status_code == 200
        for i, week in enumerate(resp.json()["progression"]):
            wac = week.get("weekly_average_calories")
            assert wac is not None and wac > 0, (
                f"Week {i}: weekly_average_calories={wac!r}, expected positive float"
            )

    def test_goal_type_accepted(self):
        """goal_type field must be accepted without validation error."""
        payload = {"user_data": {**_USER_DATA_FIELDS, "goal_type": "cut"}}
        resp = client.post("/calculate", json=payload)
        assert resp.status_code == 200, (
            f"goal_type='cut' was rejected: {resp.status_code} {resp.text[:200]}"
        )

    def test_calorie_floor_accepted(self):
        """calorie_floor field must be accepted without validation error."""
        payload = {"user_data": {**_USER_DATA_FIELDS, "calorie_floor": 1200.0}}
        resp = client.post("/calculate", json=payload)
        assert resp.status_code == 200, (
            f"calorie_floor=1200.0 was rejected: {resp.status_code} {resp.text[:200]}"
        )


class TestTimelineValidation:
    def test_sub_one_week_returns_4xx_not_500(self):
        """A timeline < 1 week must return 4xx, not 500."""
        payload = {"user_data": {**_USER_DATA_FIELDS,
                                 "start_date": "01/01/2026",
                                 "end_date": "01/05/2026"}}  # 4 days → 0 weeks
        resp = client.post("/calculate", json=payload)
        assert 400 <= resp.status_code < 500, (
            f"Expected 4xx for sub-1-week timeline, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_same_day_start_end_returns_4xx(self):
        """Same start and end date must return 4xx."""
        payload = {"user_data": {**_USER_DATA_FIELDS,
                                 "start_date": "01/01/2026",
                                 "end_date": "01/01/2026"}}
        resp = client.post("/calculate", json=payload)
        assert 400 <= resp.status_code < 500, (
            f"Expected 4xx for same-day timeline, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_exactly_one_week_succeeds(self):
        """A 7-day (1-week) timeline must succeed."""
        payload = {"user_data": {**_USER_DATA_FIELDS,
                                 "start_date": "01/01/2026",
                                 "end_date": "01/08/2026"}}  # exactly 7 days
        resp = client.post("/calculate", json=payload)
        assert resp.status_code == 200, (
            f"Expected 200 for 1-week timeline, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_generate_report_sub_one_week_returns_4xx(self):
        """/generate-report must also return 4xx for sub-1-week timelines.
        /generate-report accepts a single UserData body (no wrapping).
        """
        payload = {**_USER_DATA_FIELDS,
                   "start_date": "01/01/2026",
                   "end_date": "01/05/2026"}
        resp = client.post("/generate-report", json=payload)
        assert 400 <= resp.status_code < 500, (
            f"Expected 4xx from /generate-report for sub-1-week timeline, "
            f"got {resp.status_code}: {resp.text[:200]}"
        )


class TestSmoothedBFHelper:
    """Unit tests for Database.get_smoothed_start_bf."""

    def _make_db(self, tmp_path):
        """Create an in-memory-ish DB at a temp path."""
        # Import here to avoid a top-level circular issue if database has side-effects
        from database import Database
        return Database(db_path=str(tmp_path / "test.db"))

    def test_returns_none_when_no_entries(self, tmp_path):
        db = self._make_db(tmp_path)
        result = db.get_smoothed_start_bf("default", n=3)
        assert result is None

    def test_single_entry_returns_that_value(self, tmp_path):
        import uuid
        db = self._make_db(tmp_path)
        db.save_entry(
            {"id": str(uuid.uuid4()), "date": "2026-01-01", "weight": 280.0,
             "body_fat_percentage": 37.0},
            user_id="default",
        )
        result = db.get_smoothed_start_bf("default", n=3)
        assert result == 37.0

    def test_averages_last_n_readings(self, tmp_path):
        import uuid
        db = self._make_db(tmp_path)
        readings = [
            ("2026-01-01", 36.0),
            ("2026-01-08", 35.5),
            ("2026-01-15", 35.0),
            ("2026-01-22", 34.5),  # most recent
        ]
        for date, bf in readings:
            db.save_entry(
                {"id": str(uuid.uuid4()), "date": date, "weight": 280.0,
                 "body_fat_percentage": bf},
                user_id="default",
            )
        # Last 3: 34.5, 35.0, 35.5 => avg = 35.0
        result = db.get_smoothed_start_bf("default", n=3)
        assert abs(result - 35.0) < 0.01, f"Expected ~35.0, got {result}"

    def test_entries_without_bf_are_excluded(self, tmp_path):
        import uuid
        db = self._make_db(tmp_path)
        # One entry with BF, one without
        db.save_entry(
            {"id": str(uuid.uuid4()), "date": "2026-01-01", "weight": 280.0,
             "body_fat_percentage": 37.0},
            user_id="default",
        )
        db.save_entry(
            {"id": str(uuid.uuid4()), "date": "2026-01-08", "weight": 278.0,
             "body_fat_percentage": None},
            user_id="default",
        )
        result = db.get_smoothed_start_bf("default", n=3)
        assert result == 37.0, f"Expected 37.0 (null BF excluded), got {result}"

    def test_clamps_to_available_readings(self, tmp_path):
        """When fewer entries than n exist, average over what's there."""
        import uuid
        db = self._make_db(tmp_path)
        db.save_entry(
            {"id": str(uuid.uuid4()), "date": "2026-01-01", "weight": 280.0,
             "body_fat_percentage": 38.0},
            user_id="default",
        )
        db.save_entry(
            {"id": str(uuid.uuid4()), "date": "2026-01-08", "weight": 278.0,
             "body_fat_percentage": 36.0},
            user_id="default",
        )
        # n=3 but only 2 entries with BF — should average both
        result = db.get_smoothed_start_bf("default", n=3)
        assert abs(result - 37.0) < 0.01, f"Expected ~37.0, got {result}"
