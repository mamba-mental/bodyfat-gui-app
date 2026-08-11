import json
import os
import sys
from pathlib import Path

PYTHON_API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
PROJECT_ROOT = Path(PYTHON_API_DIR).parent
sys.path.insert(0, PYTHON_API_DIR)

from challenge_endpoints import ChallengeAmendPayload


def test_shared_fixture_matches_pydantic_and_plan_mode_boundaries():
    fixture_path = PROJECT_ROOT / "tests" / "contracts" / "challenge-plan-contract.fixture.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    assert fixture["standard_plan"]["plan_mode"] == "standard"
    assert fixture["standard_plan"]["timeline_weeks"] == 15
    assert fixture["two_week_plan"]["plan_mode"] == "two_week_cut"
    assert fixture["two_week_plan"]["timeline_days"] == 14
    assert fixture["two_week_plan"]["timeline_weeks"] == 2
    assert fixture["template_revision"]["duration_days"] == 14

    amendment = ChallengeAmendPayload(**fixture["amendment"])
    assert amendment.effective_day == 8
    assert amendment.safety_acknowledged is True
