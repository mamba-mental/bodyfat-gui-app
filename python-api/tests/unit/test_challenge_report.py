import os
import sys
import asyncio

PYTHON_API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, PYTHON_API_DIR)

from challenge_report import render_challenge_report
import challenge_endpoints


def test_challenge_report_uses_saved_plan_protocol_and_actual_logs():
    cycle = {"id": "cut-1", "name": "Two-Week Emergency Cut"}
    protocol_days = [
        {
            "day_number": day,
            "injections": [{"source_name": "Test", "source_value": "source value"}],
            "oral_and_daily_timing": {"AM": "source timing"},
        }
        for day in range(1, 15)
    ]
    plan_days = [
        {
            "day_number": day,
            "date": f"2026-08-{10 + day:02d}",
            "training": "Lift",
            "cardio": "Walk",
            "nutrition_target": {"calories": 2200, "protein_g": 220},
            "protocol_schedule": protocol_days[day - 1],
        }
        for day in range(1, 15)
    ]
    revision = {
        "revision_number": 3,
        "template_revision_id": "template-r2",
        "protocol_id": "ped-source",
        "protocol_version": "2026-06-08",
        "protocol_snapshot_json": {
            "protocol_id": "ped-source",
            "version": "2026-06-08",
            "source_sha256": "abc123",
            "start_week": 9,
            "end_week": 10,
            "days": protocol_days,
        },
        "plan_snapshot_json": {
            "start_date": "2026-08-11",
            "end_date": "2026-08-24",
            "template_revision_number": 2,
            "inventory_coverage": {
                "ready": True,
                "required_by_compound": [
                    {"compound": "testosterone", "required_amount": "1200", "available_amount": "1500", "remaining_amount": "300", "unit": "mg"}
                ],
                "unused_inventory": [{"label_name": "Unused item", "canonical_compound": "anavar"}],
                "validation_status": "inventory_math_only_not_medical_safety",
            },
            "ped_review": {
                "reviewer_name": "Dr. Example",
                "reviewer_role": "licensed clinician",
                "review_note": "Existing source schedule reviewed separately.",
                "attested": True,
            },
            "days": plan_days,
        },
    }
    logs = [{"day_number": 1, "calories": 2150, "protein_g": 219, "steps": 9400, "training_completed": True}]

    markdown, html = render_challenge_report(cycle, revision, logs, [])

    assert "Plan revision: 3" in markdown
    assert "Report mode: Progress (1 of 14 days logged)" in markdown
    assert "source timing" in markdown
    assert "2150 kcal" in markdown
    assert "not a medical recommendation" in markdown
    assert "Inventory coverage at activation" in markdown
    assert "1200 mg required" in markdown
    assert "inventory math only" in markdown.lower()
    assert "Dr. Example" in markdown
    assert "source timing" in html
    assert "1 of 14 days logged" in html


def test_stopped_challenge_report_is_labeled_without_rewriting_the_plan():
    cycle = {"id": "cut-1", "name": "Two-Week Emergency Cut", "status": "stopped"}
    revision = {
        "revision_number": 1,
        "template_revision_id": "template-r1",
        "protocol_snapshot_json": {
            "protocol_id": "ped-source",
            "version": "2026-06-08",
            "source_sha256": "abc123",
            "start_week": 9,
            "end_week": 10,
        },
        "plan_snapshot_json": {
            "start_date": "2026-08-11",
            "end_date": "2026-08-24",
            "template_revision_number": 1,
            "days": [],
        },
    }

    markdown, html = render_challenge_report(cycle, revision, [], [])

    assert "Report mode: Stopped early (0 of 14 days logged)" in markdown
    assert "Report mode:</strong> Stopped early" in html


def test_report_endpoint_saves_a_source_bound_two_week_report(monkeypatch, tmp_path):
    protocol_days = [
        {
            "day_number": day,
            "injections": [{"source_name": "Source compound", "source_value": "source value"}],
            "oral_and_daily_timing": {"AM": "source timing"},
        }
        for day in range(1, 15)
    ]
    revision = {
        "revision_number": 4,
        "template_revision_id": "template-r4",
        "protocol_id": "member-source",
        "protocol_version": "2026-08-10",
        "protocol_snapshot_json": {
            "protocol_id": "member-source",
            "version": "2026-08-10",
            "source_sha256": "source-fingerprint",
            "start_week": 9,
            "end_week": 10,
            "days": protocol_days,
            "ped_stack_by_week": {"1": [], "2": []},
        },
        "plan_snapshot_json": {
            "title": "Two-Week Emergency Cut",
            "start_date": "2026-08-11",
            "end_date": "2026-08-24",
            "template_revision_number": 4,
            "days": [
                {
                    "day_number": day,
                    "date": f"2026-08-{10 + day:02d}",
                    "nutrition_type": "standard",
                    "nutrition_target": {"calories": 2100, "protein_g": 210},
                    "training": "Lift" if day % 2 else "Recovery",
                    "cardio": "Walk",
                    "protocol_schedule": protocol_days[day - 1],
                }
                for day in range(1, 15)
            ],
        },
    }

    class FakeRepository:
        def get_cycle(self, cycle_id):
            return {"id": cycle_id, "name": "Two-Week Emergency Cut", "status": "active"}

        def get_plan_revisions(self, cycle_id):
            return [revision]

        def get_daily_logs(self, cycle_id):
            return [{"day_number": 1, "calories": 2050, "protein_g": 211, "steps": 9000}]

        def get_amendments(self, cycle_id):
            return []

    saved = []

    class FakeDatabase:
        def save_report(self, report):
            saved.append(report)

    monkeypatch.setattr(challenge_endpoints, "repo", FakeRepository())
    monkeypatch.setattr(challenge_endpoints, "Database", FakeDatabase)
    monkeypatch.setattr(challenge_endpoints, "REPORTS_OUTPUT_DIR", tmp_path)

    report = asyncio.run(challenge_endpoints.generate_challenge_report("cut-1"))

    assert report["report_type"] == "two_week_cut"
    assert report["report_mode"] == "progress"
    assert report["plan_revision"] == 4
    assert report["template_revision_id"] == "template-r4"
    assert report["protocol_id"] == "member-source"
    assert report["source_fingerprint"] == "source-fingerprint"
    assert report["completion"] == {"days_logged": 1, "days_total": 14}
    assert "Day-by-day diet, training, PED schedule, and actuals" in report["markdown_content"]
    assert saved == [report]
    assert os.path.isfile(report["html_path"])
    assert os.path.isfile(report["markdown_path"])
