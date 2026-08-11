import os
import sys

import pytest

PYTHON_API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
PROJECT_ROOT = os.path.abspath(os.path.join(PYTHON_API_DIR, ".."))
sys.path.insert(0, PYTHON_API_DIR)
sys.path.insert(0, PROJECT_ROOT)

from challenge_protocol import load_protocol_catalog, select_protocol_window
from new_prime_python_code.PRIME_Calculations import compute_ped_stack_modifiers


def test_existing_protocol_exposes_only_consecutive_two_week_starts():
    catalog = load_protocol_catalog(
        os.path.join(PROJECT_ROOT, "docs", "protocol-data", "nutrition-and-ped.json")
    )

    assert catalog["protocol_id"]
    assert catalog["source_sha256"]
    assert catalog["available_start_weeks"][0] == 2
    assert 15 in catalog["available_start_weeks"]
    assert 16 not in catalog["available_start_weeks"]


def test_selected_protocol_window_maps_exactly_fourteen_days():
    window = select_protocol_window(start_week=9)

    assert window["start_week"] == 9
    assert window["end_week"] == 10
    assert len(window["days"]) == 14
    assert [day["day_number"] for day in window["days"]] == list(range(1, 15))
    assert {day["source_week"] for day in window["days"]} == {9, 10}
    assert window["ped_stack"]
    assert all(entry["compound"] for entry in window["ped_stack"])
    assert set(window["ped_stack_by_week"]) == {"1", "2"}
    assert all(entry["source_week"] == 9 for entry in window["ped_stack_by_week"]["1"])
    t3 = next(entry for entry in window["ped_stack_by_week"]["1"] if entry["compound"] == "t3")
    assert t3["dose_range"] == [50.0, 75.0]
    assert "dose_mg" not in t3
    assert "t3" in window["unresolved_dose_compounds"]


def test_exact_source_dose_and_source_week_age_are_preserved_without_guessing():
    window = select_protocol_window(start_week=2)
    week_one = window["ped_stack_by_week"]["1"]
    t3 = next(entry for entry in week_one if entry["compound"] == "t3")
    clen = next(entry for entry in week_one if entry["compound"] == "clenbuterol")

    assert t3["dose_mg"] == 50.0
    assert t3["dose_unit"] == "mcg"
    assert clen["dose_range"] == [40.0, 60.0]
    assert clen["week_on"] == 1


def test_missing_or_non_consecutive_source_week_is_blocked():
    with pytest.raises(ValueError, match="source week 1"):
        select_protocol_window(start_week=1)

    with pytest.raises(ValueError, match="source week 17"):
        select_protocol_window(start_week=16)


def test_ranged_t3_dose_never_falls_back_to_an_invented_engine_default():
    result = compute_ped_stack_modifiers(
        [{"compound": "t3", "dose_range": [50.0, 75.0], "dose_unit": "mcg"}],
        week=1,
    )

    assert result["p_fat_delta"] == 0.0
    assert result["ee_bonus_kcal"] == 0.0
    assert result["unresolved_dose_compounds"] == ["t3"]


def test_source_week_age_drives_clen_desensitization_instead_of_resetting_at_challenge_day_one():
    fresh = compute_ped_stack_modifiers(
        [{"compound": "clenbuterol", "week_on": 1}], week=1
    )
    source_week_ten = compute_ped_stack_modifiers(
        [{"compound": "clenbuterol", "week_on": 9}], week=1
    )

    assert fresh["ee_bonus_kcal"] > 0
    assert source_week_ten["ee_bonus_kcal"] == 0.0
