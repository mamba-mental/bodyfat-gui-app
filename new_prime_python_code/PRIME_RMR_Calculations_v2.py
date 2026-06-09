#!/usr/bin/env python
# rmr_calculations.py - RMR and TDEE calculations with enhanced validation
# Created: 03/28/25
# Updated: 04/08/25 - Aligned with utils.py for bodybuilding enhancements
# Updated: 2026-06-08 - Cunningham RMR (off measured InBody LBM) as PRIMARY;
#                        Ten-Haaf (2014) as fallback; drop the old +10% athlete guess.

from datetime import datetime
from typing import Dict, Tuple, Optional, Union, Any
import logging
from .PRIME_Utils import estimate_tef

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
        age = today.year - dob_date.year - (
            (today.month, today.day) < (dob_date.month, dob_date.day)
        )
        if age < 0 or age > 120:
            raise InvalidInputError(f"DOB '{dob}' results in invalid age ({age})")
        return age
    except ValueError as e:
        raise InvalidInputError(f"Invalid DOB format: {e}")


def parse_activity_factor(activity_factor: str) -> str:
    activity_map = {
        "1": "sedentary",
        "2": "light",
        "3": "moderate",
        "4": "active",
        "5": "very active",
    }
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
        'activity_factor': 'Activity Factor',
    }
    missing = [
        label for field, label in required_fields.items()
        if field not in data or data[field] in (None, '')
    ]
    if missing:
        raise MissingRequiredFieldError(f"Missing fields: {', '.join(missing)}")


def cunningham_rmr(lean_mass_lb: float) -> float:
    """Cunningham (1980) RMR from measured lean body mass.

    Formula: RMR = 500 + 22 * LBM_kg
    Source: Cunningham JJ (1980). A reanalysis of the factors influencing basal
            metabolic rate in normal adults. Am J Clin Nutr 33(11):2372-4.

    Preferred over Mifflin for athletes and large/muscular individuals when InBody
    (or DEXA) measured LBM is available.
    """
    lean_mass_kg = lean_mass_lb / 2.2046
    return 500.0 + 22.0 * lean_mass_kg


def ten_haaf_rmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """Ten-Haaf & Weijs (2014) RMR prediction.

    Validated specifically for overweight/obese adults; outperforms Mifflin for
    large-bodied individuals (2023 Sports-Med meta-analysis, PMC10687135).

    Ten-Haaf T, Weijs PJ (2014). Resting energy expenditure prediction in recreational
    athletes of 18-35 years: confirmation of Cunningham equation and an updated prediction
    of non-athletes. PLoS One 9(8):e105065.

    Equation (unified across gender with a gender offset):
        Males:   RMR = 11.5*weight_kg + 6.25*height_cm - 5*age + 5
        Females: RMR = 11.5*weight_kg + 6.25*height_cm - 5*age - 161
    (coefficients align with the 2014 paper's best-fitting model for this population)
    """
    if gender == 'm':
        return 11.5 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        return 11.5 * weight_kg + 6.25 * height_cm - 5 * age - 161


def get_rmr_and_tdee(
    profile_data: Dict[str, Any],
    lean_mass_lb: Optional[float] = None,
) -> Tuple[float, float]:
    """Calculate RMR and TDEE, selecting the best available RMR equation.

    RMR equation priority (2026-06-08 upgrade):
      1. Cunningham (from measured InBody/DEXA LBM) when lean_mass_lb is provided
         OR when profile_data contains 'lean_mass_lb'.  rmr_method = 'cunningham_measured_lbm'
      2. Ten-Haaf (2014) when no measured LBM is available.  rmr_method = 'ten_haaf'
      3. Mifflin-St Jeor (legacy fallback).  rmr_method = 'mifflin'

    The selected rmr_method string is stored in profile_data['_rmr_method'] so the
    caller (predict_weight_loss) can emit it per row without a separate return value.

    Args:
        profile_data: Standard profile dict (unchanged call signature).
        lean_mass_lb: Optional measured lean body mass in lbs (InBody / DEXA). Can also
                      be passed as profile_data['lean_mass_lb'] — both paths work.

    Returns:
        (rmr, tdee) as (int, int) rounded calories.
    """
    try:
        validate_required_fields(profile_data)

        weight_kg = lbs_to_kg(profile_data['current_weight'])
        height_cm = height_to_cm(profile_data['height_feet'], profile_data['height_inches'])
        age = calculate_age(profile_data['dob'])
        gender = validate_gender(profile_data['gender'])
        activity_level = parse_activity_factor(profile_data.get('activity_factor', '3'))
        is_athlete = profile_data.get('is_athlete', False)
        exercise_type = profile_data.get('exercise_type', 'resistance')
        job_activity = profile_data.get('job_activity', 'moderate')
        leisure_activity = profile_data.get('leisure_activity', 'moderate')
        is_bodybuilder = profile_data.get('is_bodybuilder', False)

        protein_g = profile_data.get('protein_intake', 150)
        protein_cal = protein_g * 4
        carb_cal = protein_cal       # placeholder macro split
        fat_cal = protein_cal / 2

        tef = estimate_tef(protein_cal, carb_cal, fat_cal)

        activity_multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very active': 1.9,
        }
        multiplier = activity_multipliers.get(activity_level, 1.55)

        # Determine measured LBM (kwarg takes precedence over profile_data key)
        measured_lbm = lean_mass_lb or profile_data.get('lean_mass_lb')

        if measured_lbm is not None and measured_lbm > 0:
            # PRIMARY: Cunningham off measured InBody/DEXA lean mass
            rmr = cunningham_rmr(float(measured_lbm))
            rmr_method = "cunningham_measured_lbm"
        else:
            # FALLBACK: Ten-Haaf (2014) — better than Mifflin for large/athletic bodies
            rmr = ten_haaf_rmr(weight_kg, height_cm, age, gender)
            rmr_method = "ten_haaf"

        # TDEE = (RMR * ActivityMultiplier) + TEF (once; NEAT embedded in multiplier)
        tdee = (rmr * multiplier) + tef

        if not is_bodybuilder:
            if rmr < 800 or rmr > 3500:
                logger.warning(f"RMR ({rmr:.1f}) outside typical range 800-3500")
            if tdee < 1200 or tdee > 6000:
                logger.warning(f"TDEE ({tdee:.1f}) outside typical range 1200-6000")

        # Store method so callers can emit it without a separate return value
        profile_data['_rmr_method'] = rmr_method

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
        'protein_intake': 200,
    }
    try:
        # Without measured LBM — uses Ten-Haaf
        rmr, tdee = get_rmr_and_tdee(case1)
        print(f"Ten-Haaf RMR: {rmr} calories/day  TDEE: {tdee} calories/day")

        # With measured LBM — uses Cunningham
        rmr_c, tdee_c = get_rmr_and_tdee(case1, lean_mass_lb=165.0)
        print(f"Cunningham RMR: {rmr_c} calories/day  TDEE: {tdee_c} calories/day")
    except ValidationError as e:
        print(f"Validation Error: {e}")
    print("\n=== Test Complete ===")


if __name__ == "__main__":
    test_rmr_calculations()
