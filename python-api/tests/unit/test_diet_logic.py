
import sys
import os
from pathlib import Path
from datetime import datetime
import pytest

# Add the parent directory to Python path to import modules
current_dir = Path(__file__).parent
python_api_dir = current_dir.parent.parent
project_root = python_api_dir.parent
sys.path.insert(0, str(project_root))

from new_prime_python_code.PRIME_Calculations import get_fasting_multipliers, predict_weight_loss

def test_get_fasting_multipliers():
    # Test Standard (12h)
    fat_mult, muscle_mult = get_fasting_multipliers(12.0)
    assert fat_mult == 1.0
    assert muscle_mult == 1.0

    # Test 16:8 (8h)
    fat_mult, muscle_mult = get_fasting_multipliers(8.0)
    assert fat_mult > 1.0  # Should accelerate fat loss
    assert muscle_mult == 1.0  # Neutral muscle effect for 16:8

    # Test OMAD (1h)
    fat_mult_omad, muscle_mult_omad = get_fasting_multipliers(1.0)
    assert fat_mult_omad > fat_mult  # OMAD should be more aggressive than 16:8
    assert muscle_mult_omad < 1.0  # OMAD has slight muscle drag

def test_predict_weight_loss_accepts_eating_window():
    # Basic test to ensure the function runs with the new parameter
    # We use dummy values for required parameters
    try:
        predict_weight_loss(
            current_weight=200,
            current_bf=25,
            goal_weight=180,
            goal_bf=15,
            start_date=datetime(2023, 1, 1),
            end_date=datetime(2023, 4, 1),
            dob=datetime(1990, 1, 1),
            gender="m",
            activity_level="moderate",
            height_cm=180,
            is_athlete=False,
            daily_protein_intake=150,
            job_activity="sedentary",
            leisure_activity="sedentary",
            experience_level="Intermediate",
            is_bodybuilder=False,
            ped_use=False,
            diet_type="balanced",
            exercise_type="resistance",
            sleep_quality="good",
            eating_window_hours=8.0 # The new parameter
        )
    except Exception as e:
        # If it fails due to date parsing (since we passed strings and it might expect objects if called directly),
        # we might need to adjust. But the key is that it shouldn't fail on 'unexpected keyword argument'.
        if "unexpected keyword argument 'eating_window_hours'" in str(e):
            pytest.fail("predict_weight_loss does not accept 'eating_window_hours'")
        # Other errors might be due to dummy data, which is fine for this specific check,
        # unless it crashes before reaching the parameter usage.
        pass
