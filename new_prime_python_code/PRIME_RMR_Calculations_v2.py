#!/usr/bin/env python
# rmr_calculations.py - RMR and TDEE calculations with enhanced validation
# Created: 03/28/25
# Updated: 04/08/25 - Aligned with utils.py for bodybuilding enhancements

from datetime import datetime
from typing import Dict, Tuple, Optional, Union, Any
import logging
from .PRIME_Utils import calculate_rmr, calculate_tdee, estimate_tef, estimate_neat

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('rmr_calculations')

class ValidationError(Exception):
    pass

class MissingRequiredFieldError(ValidationError):
    pass

class InvalidInputError(ValidationError):
    pass

def lbs_to_kg(weight_lbs: Union[float, int, str]) -> float:
    try:
        weight = float(weight_lbs)
        if weight <= 0:
            raise InvalidInputError(f"Weight must be positive, got {weight}")
        return weight * 0.453592
    except ValueError:
        raise InvalidInputError(f"Cannot convert weight '{weight_lbs}' to a number")

def height_to_cm(feet: Union[int, str], inches: Union[int, str] = 0) -> float:
    try:
        ft = int(feet)
        inch = int(inches) if inches else 0
        if ft < 0 or inch < 0:
            raise InvalidInputError(f"Height must be positive, got {ft} feet {inch} inches")
        total_inches = ft * 12 + inch
        return total_inches * 2.54
    except ValueError:
        raise InvalidInputError(f"Cannot convert height '{feet}' feet '{inches}' inches")

def calculate_age(dob: str) -> int:
    try:
        if len(dob) == 6 and dob.isdigit():
            dob_date = datetime.strptime(dob, "%m%d%y")
        elif '/' in dob:
            dob_date = datetime.strptime(dob, "%m/%d/%Y")
        else:
            raise InvalidInputError(f"DOB must be MMDDYY or MM/DD/YYYY, got '{dob}'")
        today = datetime.now()
        age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
        if age < 0 or age > 120:
            raise InvalidInputError(f"DOB '{dob}' results in invalid age ({age})")
        return age
    except ValueError as e:
        raise InvalidInputError(f"Invalid DOB format: {e}")

def parse_activity_factor(activity_factor: str) -> str:
    activity_map = {"1": "sedentary", "2": "light", "3": "moderate", "4": "active", "5": "very active"}
    return activity_map.get(str(activity_factor).split(':')[0].strip(), "moderate")

def validate_gender(gender: str) -> str:
    normalized = gender.lower().strip()
    if normalized in ('m', 'male', 'man', '1'):
        return 'm'
    elif normalized in ('f', 'female', 'woman', '2'):
        return 'f'
    raise InvalidInputError(f"Gender must be 'm' or 'f', got '{gender}'")

def validate_required_fields(data: Dict[str, Any]) -> None:
    required_fields = {
        'current_weight': 'Current Weight',
        'height_feet': 'Height (feet)',
        'height_inches': 'Height (inches)',
        'gender': 'Gender',
        'dob': 'Date of Birth',
        'activity_factor': 'Activity Factor'
    }
    missing = [label for field, label in required_fields.items() if field not in data or data[field] in (None, '')]
    if missing:
        raise MissingRequiredFieldError(f"Missing fields: {', '.join(missing)}")

def get_rmr_and_tdee(profile_data: Dict[str, Any]) -> Tuple[float, float]:
    """Calculate RMR and TDEE with new parameters."""
    try:
        validate_required_fields(profile_data)
        
        weight_kg = lbs_to_kg(profile_data['current_weight'])
        height_cm = height_to_cm(profile_data['height_feet'], profile_data['height_inches'])
        age = calculate_age(profile_data['dob'])
        gender = validate_gender(profile_data['gender'])
        activity_level = parse_activity_factor(profile_data.get('activity_factor', '3'))
        is_athlete = profile_data.get('is_athlete', False)
        diet_type = profile_data.get('diet_type', 'balanced')
        exercise_type = profile_data.get('exercise_type', 'resistance')
        job_activity = profile_data.get('job_activity', 'moderate')
        leisure_activity = profile_data.get('leisure_activity', 'moderate')
        is_bodybuilder = profile_data.get('is_bodybuilder', False)
        
        protein_g = profile_data.get('protein_intake', 150)  # Default assumption
        protein_cal = protein_g * 4
        carb_cal = protein_cal  # Placeholder
        fat_cal = protein_cal / 2
        
        rmr = calculate_rmr(weight_kg, age, gender, height_cm, is_athlete)
        tdee = calculate_tdee(weight_kg, age, gender, activity_level, height_cm, is_athlete, protein_cal, carb_cal, fat_cal, job_activity, leisure_activity, exercise_type)
        
        if not is_bodybuilder:
            if rmr < 800 or rmr > 3000:
                logger.warning(f"RMR ({rmr:.1f}) outside typical range 800-3000")
            if tdee < 1200 or tdee > 5000:
                logger.warning(f"TDEE ({tdee:.1f}) outside typical range 1200-5000")
        
        return round(rmr), round(tdee)
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise ValidationError(f"RMR calculation failed: {e}")

def test_rmr_calculations():
    print("=== RMR Calculator Test Cases ===")
    case1 = {
        'gender': 'm',
        'dob': '01/01/1995',
        'current_weight': 254,
        'height_feet': 6,
        'height_inches': 0,
        'activity_factor': '4',
        'is_athlete': True,
        'diet_type': 'keto',
        'exercise_type': 'resistance',
        'job_activity': 'active',
        'leisure_activity': 'moderate',
        'is_bodybuilder': True,
        'protein_intake': 200
    }
    try:
        rmr, tdee = get_rmr_and_tdee(case1)
        print(f"RMR: {rmr} calories/day")
        print(f"TDEE: {tdee} calories/day")
    except ValidationError as e:
        print(f"Validation Error: {e}")
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_rmr_calculations()