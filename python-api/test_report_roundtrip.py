"""ATDD acceptance test for F6 — a report persists + reads from one backend.

Requirement (BDD):
  Feature: A saved report is readable through every read path, identically
    Scenario: A cycle-tagged report survives the persist -> read round-trip
      Given an active cycle "cyc-0626"
      When a report tagged to that cycle is saved
      Then reading it back via the LIST path returns cycle_id "cyc-0626"
      And reading it back via the DETAIL path returns the SAME cycle_id

Was RED on the detail path: get_report() (single) never read the cycle_id column,
so the list view was cycle-tagged but the detail view was cycle-blind — the same
report gave two answers depending on how it was read (a persist/read split).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from database import Database  # noqa: E402


def _seed(db):
    db.save_cycle(
        {"id": "cyc-0626", "name": "PRIME.TIME-06.2026",
         "start_date": "2026-06-03", "status": "active"},
        "default",
    )


def test_report_cycle_id_survives_list_and_detail(tmp_path):
    db = Database(str(tmp_path / "f6.db"))
    _seed(db)

    # WHEN a report tagged to the active cycle is saved
    db.save_report(
        {"id": "rep-1", "title": "Progress #1", "date": "2026-06-10",
         "cycle_id": "cyc-0626", "html_content": "<div>ok</div>"},
        "default",
    )

    # THEN the LIST path returns it with the cycle id
    listed = db.get_reports("default")
    assert len(listed) == 1
    assert listed[0]["cycle_id"] == "cyc-0626"

    # AND the DETAIL path returns the SAME cycle id (was None before F6)
    detail = db.get_report("rep-1", "default")
    assert detail is not None
    assert detail["cycle_id"] == "cyc-0626"


def test_report_without_cycle_falls_back_to_active(tmp_path):
    db = Database(str(tmp_path / "f6b.db"))
    _seed(db)

    # A report saved without an explicit cycle_id attaches to the active cycle.
    db.save_report({"id": "rep-2", "title": "Auto", "date": "2026-06-11"}, "default")
    detail = db.get_report("rep-2", "default")
    assert detail is not None
    assert detail["cycle_id"] == "cyc-0626"
