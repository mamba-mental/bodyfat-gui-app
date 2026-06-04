"""ATDD acceptance test for F2 — every new weigh-in attaches to the active cycle.

Requirement (BDD):
  Feature: Weigh-ins belong to the active cycle
    Scenario: First weigh-in of a new cycle, posted with no explicit cycle_id
      Given an active cycle "PRIME.TIME-06.2026"
      When the user POSTs a weigh-in of 266.8 lb / 39.2% with no cycle_id
      Then the saved entry the SERVER RETURNS carries the active cycle's id
      And reading entries back returns that weigh-in tagged to the active cycle

Why this is RED before F2:
  database.save_entry() already resolves the active cycle internally, BUT the
  POST /api/data/entries endpoint returns the PRE-save `entry.dict()` — the
  resolved cycle_id is never written back onto the response. So a client that
  posts without a cycle_id gets back an entry whose cycle_id is null, and the
  React reducer state holds a cycle-orphaned weigh-in even though the DB row is
  correct. That divergence is the "active cycle looks empty" symptom.

  This test asserts the *server response* carries the canonical cycle_id — the
  contract the whole client read-back chain depends on.
"""
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A TestClient whose data endpoints write to an isolated temp DB."""
    import data_endpoints
    from database import Database

    # Point the module-level repository at a throwaway DB so the test never
    # touches the live bodyfat.db.
    test_db = Database(str(tmp_path / "f2.db"))
    monkeypatch.setattr(data_endpoints, "db", test_db)

    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(data_endpoints.router)
    return TestClient(app)


def _make_active_cycle(client):
    resp = client.post(
        "/api/data/cycles",
        json={
            "id": "cyc-0626", "name": "PRIME.TIME-06.2026",
            "start_date": "2026-06-03", "status": "active",
            "start_weight": 266.8, "start_bf": 39.2,
            "goal_weight": 217.0, "goal_bf": 13.0, "timeline_weeks": 16,
        },
    )
    assert resp.status_code == 200, resp.text


def test_weighin_without_cycle_id_attaches_to_active_cycle(client):
    # GIVEN an active cycle
    _make_active_cycle(client)

    # WHEN the user logs a weigh-in WITHOUT supplying a cycle_id
    resp = client.post(
        "/api/data/entries",
        json={
            "id": "e-f2", "date": "2026-06-03",
            "weight": 266.8, "body_fat_percentage": 39.2,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    # THEN the saved entry the server returns carries the active cycle's id
    returned = body.get("entry", body)
    assert returned.get("cycle_id") == "cyc-0626", (
        "server response must carry the resolved active cycle_id, "
        f"got: {returned.get('cycle_id')!r}"
    )

    # AND reading entries back returns that weigh-in tagged to the active cycle
    entries = client.get("/api/data/entries").json()
    assert len(entries) == 1
    assert entries[0]["cycle_id"] == "cyc-0626"


def test_explicit_cycle_id_is_not_clobbered(client):
    # GIVEN an active cycle AND a second (stopped) cycle the entry explicitly targets
    _make_active_cycle(client)
    client.post(
        "/api/data/cycles",
        json={"id": "cyc-old", "name": "OLD", "start_date": "2026-04-01",
              "status": "stopped"},
    )

    # WHEN a weigh-in is posted with an explicit cycle_id for the OLD cycle
    resp = client.post(
        "/api/data/entries",
        json={"id": "e-explicit", "date": "2026-04-15", "weight": 280.0,
              "body_fat_percentage": 41.0, "cycle_id": "cyc-old"},
    )
    assert resp.status_code == 200, resp.text
    returned = resp.json().get("entry", resp.json())

    # THEN the explicit cycle_id wins (the active cycle does NOT override it)
    assert returned.get("cycle_id") == "cyc-old"
