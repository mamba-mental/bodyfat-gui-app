import os
import sys
import asyncio
from datetime import datetime, timedelta

import pytest

PYTHON_API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, PYTHON_API_DIR)

from challenge_plan import build_plan_snapshot, readiness_blockers
import challenge_endpoints
from fastapi import HTTPException


def _template():
    return {
        "id": "template-r2",
        "revision_number": 2,
        "structured_json": {
            "title": "Two-Week Emergency Cut",
            "days": [
                {
                    "day_number": day,
                    "training": "Lift" if day not in {3, 5, 7, 10, 12, 14} else None,
                    "nutrition_type": "standard",
                }
                for day in range(1, 15)
            ],
        },
    }


def _protocol():
    return {
        "protocol_id": "ped-source",
        "version": "2026-06-08",
        "source_sha256": "source-hash",
        "start_week": 9,
        "end_week": 10,
        "ped_stack": [{"compound": "testosterone"}],
        "days": [{"day_number": day, "source_week": 9 if day <= 7 else 10} for day in range(1, 15)],
    }


def _calculation():
    return {
        "progression": [
            {"week_number": 1, "training_calories": 2400, "rest_calories": 2050, "protein_g": 220},
            {"week_number": 2, "training_calories": 2300, "rest_calories": 1950, "protein_g": 220},
        ],
        "summary": {"timeline_weeks": 2},
    }


def test_plan_snapshot_aligns_fourteen_days_and_uses_week_specific_targets():
    plan = build_plan_snapshot(_template(), _protocol(), _calculation(), "2026-08-11")

    assert plan["end_date"] == "2026-08-24"
    assert len(plan["days"]) == 14
    assert plan["days"][0]["nutrition_target"]["calories"] == 2400
    assert plan["days"][2]["nutrition_target"]["calories"] == 2050
    assert plan["days"][7]["nutrition_target"]["calories"] == 2300
    assert plan["days"][13]["nutrition_target"]["calories"] == 1950
    assert plan["days"][13]["protocol_schedule"]["source_week"] == 10


def test_week_zero_baseline_is_not_used_as_a_challenge_prescription():
    calculation = _calculation()
    calculation["progression"].insert(
        0,
        {"week_number": 0, "training_calories": 9999, "rest_calories": 9999, "protein_g": 1},
    )

    plan = build_plan_snapshot(_template(), _protocol(), calculation, "2026-08-11")

    assert plan["days"][0]["nutrition_target"]["calories"] == 2400
    assert plan["days"][7]["nutrition_target"]["calories"] == 2300
    assert [row["week_number"] for row in plan["calculation_progression"]] == [1, 2]


def test_plan_builder_rejects_any_non_fourteen_day_input():
    protocol = _protocol()
    protocol["days"].pop()
    with pytest.raises(ValueError, match="exactly 14 days"):
        build_plan_snapshot(_template(), protocol, _calculation(), "2026-08-11")


def test_activation_readiness_requires_active_template_source_and_acknowledgement():
    plan = build_plan_snapshot(_template(), _protocol(), _calculation(), "2026-08-11")
    assert readiness_blockers("active", plan, True) == []
    blockers = readiness_blockers("draft", plan, False)
    assert any("template" in blocker for blocker in blockers)
    assert any("acknowledgement" in blocker for blocker in blockers)


def test_inventory_checked_activation_requires_coverage_member_confirmation_and_review():
    plan = build_plan_snapshot(_template(), _protocol(), _calculation(), "2026-08-11")
    blocked_coverage = {
        "ready": False,
        "blockers": [
            {"code": "insufficient_inventory", "severity": "critical", "message": "Testosterone is short by 200 mg"}
        ],
    }

    blockers = readiness_blockers(
        "active",
        plan,
        True,
        inventory_required=True,
        inventory_coverage=blocked_coverage,
        member_inventory_confirmed=False,
        review_evidence=None,
    )

    assert "Testosterone is short by 200 mg" in blockers
    assert any("member confirmation" in blocker.lower() for blocker in blockers)
    assert any("documented review" in blocker.lower() for blocker in blockers)

    assert readiness_blockers(
        "active",
        plan,
        True,
        inventory_required=True,
        inventory_coverage={"ready": True, "blockers": []},
        member_inventory_confirmed=True,
        review_evidence={
            "reviewer_name": "Dr. Example",
            "reviewer_role": "licensed clinician",
            "review_note": "Existing source schedule reviewed separately.",
            "attested": True,
        },
    ) == []


def test_active_plan_amendments_reject_elapsed_and_logged_days(monkeypatch):
    today = datetime.now().date()
    revision = {
        "revision_number": 1,
        "template_revision_id": "template-r1",
        "protocol_id": "member-source",
        "protocol_version": "2026-08-10",
        "protocol_start_week": 9,
        "protocol_snapshot_json": {"days": [{"day_number": day} for day in range(1, 15)]},
        "calculation_snapshot_json": {"progression": []},
        "plan_snapshot_json": {
            "days": [
                {
                    "day_number": 1,
                    "date": (today - timedelta(days=1)).isoformat(),
                    "nutrition_target": {"calories": 2100, "protein_g": 210},
                },
                {
                    "day_number": 2,
                    "date": (today + timedelta(days=1)).isoformat(),
                    "nutrition_target": {"calories": 2100, "protein_g": 210},
                },
            ]
        },
    }

    class FakeRepository:
        def get_plan_revisions(self, cycle_id):
            return [revision]

        def get_daily_logs(self, cycle_id):
            return [{"day_number": 2}]

    monkeypatch.setattr(challenge_endpoints, "repo", FakeRepository())

    for day, message in ((1, "Only future"), (2, "completed/logged")):
        payload = challenge_endpoints.ChallengeAmendPayload(
            effective_day=day,
            reason="Test protection",
            nutrition_calories=2200,
            safety_acknowledged=True,
        )
        with pytest.raises(HTTPException, match=message):
            asyncio.run(challenge_endpoints.amend_challenge("cut-1", payload))
