import os
import sqlite3
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient

PYTHON_API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, PYTHON_API_DIR)

from challenge_protocol import select_protocol_window
from ped_inventory import build_inventory_coverage
from ped_inventory_repository import PedInventoryRepository
import ped_inventory_endpoints


def _item(compound, unit="mg", available="5000", *, confirmed=True, expires="2027-01-01", formulation=None):
    return {
        "id": f"inventory-{compound}-{unit}",
        "user_id": "default",
        "label_name": compound,
        "canonical_compound": compound,
        "formulation": formulation or ("oral" if compound in {"t3", "clenbuterol", "proviron", "superdrol", "mk677"} else "injectable"),
        "strength_value": "1",
        "strength_unit": unit,
        "available_units": available,
        "inventory_unit": "tablet" if unit == "mcg" or compound in {"proviron", "superdrol", "mk677"} else "mL",
        "expiration_date": expires,
        "confirmed": confirmed,
        "status": "active",
    }


def _complete_week_two_inventory():
    return [
        _item("testosterone"),
        _item("equipoise"),
        _item("deca"),
        _item("t3", "mcg"),
        _item("clenbuterol", "mcg"),
        _item("proviron"),
        _item("superdrol"),
        _item("mk677"),
        _item("anavar"),
    ]


def test_inventory_schema_and_crud_are_additive_and_editable(tmp_path):
    db_path = str(tmp_path / "ped-inventory.db")
    repo = PedInventoryRepository(db_path)

    with sqlite3.connect(db_path) as conn:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(ped_inventory_items)")}
    assert {
        "id",
        "user_id",
        "label_name",
        "canonical_compound",
        "formulation",
        "strength_value",
        "strength_unit",
        "available_units",
        "inventory_unit",
        "expiration_date",
        "confirmed",
        "status",
    }.issubset(columns)

    created = repo.create_item(_item("testosterone", available="10.5"))
    assert created["available_units"] == "10.5"
    assert created["confirmed"] is True

    updated = repo.update_item(created["id"], {"available_units": "8.25", "label_name": "Test C 250"})
    assert updated["available_units"] == "8.25"
    assert updated["label_name"] == "Test C 250"
    assert repo.list_items()[0]["id"] == created["id"]

    assert repo.delete_item(created["id"]) is True
    assert repo.list_items() == []


def test_exact_source_events_allocate_confirmed_inventory_without_using_extra_items():
    protocol = select_protocol_window(2)
    coverage = build_inventory_coverage(
        protocol=protocol,
        inventory_items=_complete_week_two_inventory(),
        start_date="2026-08-11",
        range_resolutions=[
            {
                "compound": "clenbuterol",
                "source_value": "40–60mcg",
                "selected_value": "50",
                "unit": "mcg",
            }
        ],
    )

    assert coverage["ready"] is True
    testosterone = next(row for row in coverage["required_by_compound"] if row["compound"] == "testosterone")
    assert testosterone["required_amount"] == "1200"
    assert testosterone["unit"] == "mg"
    assert len(coverage["scheduled_events"]) > 14
    assert coverage["blockers"] == []
    assert [item["canonical_compound"] for item in coverage["unused_inventory"]] == ["anavar"]


def test_source_range_expiration_confirmation_and_unit_problems_fail_closed():
    protocol = select_protocol_window(2)
    inventory = [
        _item("testosterone", expires="2026-08-10"),
        _item("equipoise", confirmed=False),
        _item("deca"),
        _item("t3", "mg"),
    ]

    coverage = build_inventory_coverage(
        protocol=protocol,
        inventory_items=inventory,
        start_date="2026-08-11",
        range_resolutions=[],
    )

    assert coverage["ready"] is False
    codes = {blocker["code"] for blocker in coverage["blockers"]}
    assert "unresolved_source_range" in codes
    assert "expired_inventory" in codes
    assert "unconfirmed_inventory" in codes
    assert "unit_mismatch" in codes
    assert all(blocker["severity"] == "critical" for blocker in coverage["blockers"])


def test_reviewed_range_value_must_stay_inside_the_literal_source_range():
    protocol = select_protocol_window(2)
    coverage = build_inventory_coverage(
        protocol=protocol,
        inventory_items=_complete_week_two_inventory(),
        start_date="2026-08-11",
        range_resolutions=[
            {
                "compound": "clenbuterol",
                "source_value": "40–60mcg",
                "selected_value": "80",
                "unit": "mcg",
            }
        ],
    )

    assert coverage["ready"] is False
    assert any(blocker["code"] == "range_selection_outside_source" for blocker in coverage["blockers"])


def test_inventory_formulation_must_match_the_source_event():
    protocol = select_protocol_window(2)
    inventory = _complete_week_two_inventory()
    t3 = next(item for item in inventory if item["canonical_compound"] == "t3")
    t3["formulation"] = "injectable"

    coverage = build_inventory_coverage(
        protocol=protocol,
        inventory_items=inventory,
        start_date="2026-08-11",
        range_resolutions=[
            {
                "compound": "clenbuterol",
                "source_value": "40–60mcg",
                "selected_value": "50",
                "unit": "mcg",
            }
        ],
    )

    assert coverage["ready"] is False
    assert any(blocker["code"] == "formulation_mismatch" for blocker in coverage["blockers"])


def test_inventory_api_crud_and_coverage_contract(monkeypatch, tmp_path):
    repo = PedInventoryRepository(str(tmp_path / "ped-inventory-api.db"))
    monkeypatch.setattr(ped_inventory_endpoints, "repo", repo)
    app = FastAPI()
    app.include_router(ped_inventory_endpoints.router)
    client = TestClient(app)
    payload = {
        "user_id": "default",
        "label_name": "Test C 250",
        "canonical_compound": "testosterone",
        "formulation": "injectable",
        "strength_value": "250",
        "strength_unit": "mg",
        "available_units": "10",
        "inventory_unit": "mL",
        "expiration_date": "2027-01-01",
        "confirmed": True,
        "status": "active",
    }

    created = client.post("/api/data/ped-inventory", json=payload)
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert client.get("/api/data/ped-inventory").json()[0]["label_name"] == "Test C 250"

    payload["available_units"] = "8.5"
    updated = client.put(f"/api/data/ped-inventory/{item_id}", json=payload)
    assert updated.status_code == 200
    assert updated.json()["available_units"] == "8.5"

    coverage = client.post(
        "/api/data/ped-inventory/coverage",
        json={
            "start_week": 2,
            "start_date": "2026-08-11",
            "range_resolutions": [],
        },
    )
    assert coverage.status_code == 200
    assert coverage.json()["ready"] is False
    assert coverage.json()["validation_status"] == "inventory_math_only_not_medical_safety"
    assert coverage.json()["medical_safety_status"] == "not_validated"

    assert client.delete(f"/api/data/ped-inventory/{item_id}").status_code == 200
    assert client.get("/api/data/ped-inventory").json() == []
