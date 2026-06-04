"""ATDD acceptance test for F1 — schema migration guaranteed before any save.

Requirement (BDD):
  Feature: A fresh database supports the ReComp Cycle domain
    Scenario: First save on a brand-new, never-migrated database
      Given a brand-new database file (init_db only, no Alembic run)
      When the user saves an active cycle and a weigh-in tagged to it
      Then both persist with their cycle identity
      And no OperationalError / 500 occurs on a missing column or table

This was RED before F1: init_db created the legacy schema (no `cycles` table,
no `entries.cycle_id`), so save_cycle/save_entry raised sqlite3.OperationalError.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from database import Database  # noqa: E402


def test_fresh_db_supports_cycle_and_entry_save(tmp_path):
    # GIVEN a brand-new (non-migrated) database file
    db = Database(str(tmp_path / "fresh.db"))

    # WHEN we save an active cycle and a weigh-in tagged to it
    db.save_cycle(
        {
            "id": "c1", "name": "PRIME.TIME-06.2026", "start_date": "2026-06-03",
            "status": "active", "start_weight": 266.8, "start_bf": 39.2,
            "goal_weight": 217.0, "goal_bf": 13.0, "timeline_weeks": 16,
            "weighin_days": [], "weighin_per_week": 0,
        },
        "default",
    )
    db.save_entry(
        {"id": "e1", "date": "2026-06-03", "weight": 266.8,
         "body_fat_percentage": 39.2, "cycle_id": "c1"},
        "default",
    )

    # THEN both persist with their cycle identity (no missing-column 500)
    entries = db.get_entries("default")
    assert len(entries) == 1
    assert entries[0]["cycle_id"] == "c1"
    assert db.get_active_cycle_id("default") == "c1"

    cycles = db.get_cycles("default")
    assert len(cycles) == 1
    assert cycles[0]["status"] == "active"


def test_one_active_cycle_invariant_on_fresh_db(tmp_path):
    # GIVEN a fresh DB with one active cycle
    db = Database(str(tmp_path / "fresh2.db"))
    db.save_cycle({"id": "a", "name": "A", "start_date": "2026-05-01", "status": "active"}, "default")
    # WHEN a second active cycle is saved
    db.save_cycle({"id": "b", "name": "B", "start_date": "2026-06-01", "status": "active"}, "default")
    # THEN only the newest is active (save_cycle demotes the prior active one)
    active = [c for c in db.get_cycles("default") if c["status"] == "active"]
    assert len(active) == 1
    assert active[0]["id"] == "b"
