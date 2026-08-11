import os
import sqlite3
import sys

PYTHON_API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, PYTHON_API_DIR)

from challenge_repository import ChallengeRepository
from database import Database


def test_challenge_schema_extends_cycles_and_preserves_template_revisions(tmp_path):
    db_path = str(tmp_path / "challenge.db")
    Database(db_path)
    repo = ChallengeRepository(db_path)

    with sqlite3.connect(db_path) as conn:
        cycle_columns = {row[1] for row in conn.execute("PRAGMA table_info(cycles)")}
    assert {
        "plan_mode",
        "timeline_days",
        "template_id",
        "template_revision_id",
        "plan_snapshot_json",
        "current_plan_revision",
        "protocol_id",
        "protocol_version",
        "protocol_status",
        "protocol_start_week",
        "protocol_snapshot_json",
        "safety_acknowledged_at",
    }.issubset(cycle_columns)

    created = repo.create_template(
        name="14-Day Cut",
        duration_days=14,
        raw_source="# draft",
        structured={"days": [{"day_number": day} for day in range(1, 15)]},
        source_sha256="source-hash",
        revision_note="Initial import",
    )
    revised = repo.add_template_revision(
        template_id=created["id"],
        raw_source="# revised",
        structured={"days": [{"day_number": day} for day in range(1, 15)]},
        source_sha256="revised-hash",
        revision_note="Calorie update",
    )

    assert created["current_revision"]["revision_number"] == 1
    assert revised["revision_number"] == 2
    history = repo.get_template_revisions(created["id"])
    assert [row["revision_number"] for row in history] == [2, 1]
    assert history[1]["structured_json"]["days"][0]["day_number"] == 1


def test_plan_revisions_amendments_and_daily_logs_round_trip(tmp_path):
    db_path = str(tmp_path / "challenge-roundtrip.db")
    db = Database(db_path)
    repo = ChallengeRepository(db_path)
    db.save_cycle(
        {
            "id": "cut-1",
            "name": "14-Day Cut",
            "start_date": "2026-08-11",
            "status": "active",
            "plan_mode": "two_week_cut",
            "timeline_days": 14,
        }
    )

    repo.save_plan_revision(
        cycle_id="cut-1",
        revision_number=1,
        template_revision_id="template-r1",
        protocol_id="ped-source",
        protocol_version="2026-06-08",
        protocol_start_week=9,
        protocol_snapshot={"days": [{"day_number": 1}]},
        calculation_snapshot={"progression": [{"week_number": 1}]},
        plan_snapshot={"days": [{"day_number": 1, "calories": 2450}]},
    )
    repo.save_amendment(
        amendment_id="amend-1",
        cycle_id="cut-1",
        effective_day=8,
        reason="Recovery adjustment",
        patch={"days.8.calories": 2550},
        previous_plan_revision=1,
        new_plan_revision=2,
    )
    repo.save_daily_log(
        cycle_id="cut-1",
        day_number=1,
        plan_revision=1,
        values={
            "date": "2026-08-11",
            "calories": 2410,
            "protein_g": 218,
            "steps": 9200,
            "training_completed": True,
            "sleep_hours": 7.5,
        },
    )

    assert repo.get_plan_revisions("cut-1")[0]["protocol_start_week"] == 9
    assert repo.get_amendments("cut-1")[0]["effective_day"] == 8
    logs = repo.get_daily_logs("cut-1")
    assert logs[0]["calories"] == 2410
    assert logs[0]["training_completed"] is True


def test_challenge_report_fingerprint_is_indexed_for_reproducibility(tmp_path):
    db_path = str(tmp_path / "challenge-report.db")
    db = Database(db_path)
    db.save_report(
        {
            "id": "report-cut-1",
            "title": "14-Day Plan & Progress Report",
            "date": "2026-08-24",
            "cycle_id": "cut-1",
            "source_fingerprint": "sha256:protocol-source",
            "markdown_path": "storage/reports/report-cut-1.md",
        }
    )

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT cycle_id, source_fingerprint, updated_at FROM reports WHERE id = ?",
            ("report-cut-1",),
        ).fetchone()

    assert row[0] == "cut-1"
    assert row[1] == "sha256:protocol-source"
    assert row[2]
