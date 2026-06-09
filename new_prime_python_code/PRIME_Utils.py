import datetime

# Constants for diet type multipliers (fat loss, muscle gain)
DIET_MULTIPLIERS = {
    "keto": (1.1, 0.9),          # 10% boost to fat loss, 10% reduction in muscle gain
    "high_protein": (1.0, 1.1),  # Standard fat loss, 10% boost to muscle gain
    "balanced": (1.0, 1.0),      # No adjustments
    "high_carb": (0.9, 1.05),    # 10% reduction in fat loss, 5% boost to muscle gain
}

# Constants for exercise type adjustments
EXERCISE_ADJUSTMENTS = {
    "resistance": {"muscle_gain": 1.2, "fat_loss": 1.0, "neat_boost": 50},
    "cardio": {"muscle_gain": 0.8, "fat_loss": 1.2, "neat_boost": 100},
    "hiit": {"muscle_gain": 1.0, "fat_loss": 1.1, "neat_boost": 150},
}


def calculate_age(dob, current_date):
    """
    Calculate the age of a person based on their date of birth and the current date.

    Args:
        dob (datetime.date): Date of birth.
        current_date (datetime.date): Current date for age calculation.

    Returns:
        int: Age in years.

    Notes:
        Adjusts for whether the birthday has occurred this year.
    """
    return current_date.year - dob.year - (
        (current_date.month, current_date.day) < (dob.month, dob.day)
    )


def estimate_tef(protein_cal, carb_cal, fat_cal):
    """
    Estimate the Thermic Effect of Food (TEF) based on macronutrient intake.

    Args:
        protein_cal (float): Calories from protein.
        carb_cal (float): Calories from carbohydrates.
        fat_cal (float): Calories from fat.

    Returns:
        float: Estimated TEF in calories.

    Notes:
        TEF rates: 25% for protein, 7.5% for carbs, 1.5% for fat.
        TEF DESIGN CHOICE (2026-06-08): TEF is computed here as an informational field
        emitted per row. It is NOT added into TDEE — because calculate_tdee() below
        already adds TEF on top of the activity multiplier. Adding it twice was the
        double-count bug. TDEE = (RMR * ActivityMultiplier) + TEF (once, in calculate_tdee).
        The value returned here is informational for display / downstream reporting only.
    """
    tef_protein = protein_cal * 0.25
    tef_carb = carb_cal * 0.075
    tef_fat = fat_cal * 0.015
    return tef_protein + tef_carb + tef_fat


def estimate_neat(job_activity, leisure_activity, exercise_type, user_neat_estimate=None):
    """
    Estimate Non-Exercise Activity Thermogenesis (NEAT).

    Args:
        job_activity (str): Job activity level ('sedentary', 'light', 'moderate', 'active').
        leisure_activity (str): Leisure activity level ('sedentary', 'light', 'moderate', 'active').
        exercise_type (str): Type of exercise ('resistance', 'cardio', 'hiit').
        user_neat_estimate (float, optional): User-provided NEAT estimate in calories.

    Returns:
        float: Estimated NEAT in calories.

    Notes:
        NEAT DESIGN CHOICE (2026-06-08): NEAT is calculated here as an informational
        output field, but it is NOT added into TDEE. The activity multiplier in
        calculate_tdee already captures NEAT. Including NEAT separately on top of the
        multiplier would double-count it. The field is emitted per row for display only.
    """
    if user_neat_estimate is not None:
        return user_neat_estimate

    job_factors = {'sedentary': 100, 'light': 300, 'moderate': 500, 'active': 700}
    leisure_factors = {'sedentary': 50, 'light': 150, 'moderate': 250, 'active': 350}

    base_neat = job_factors.get(job_activity, 300) + leisure_factors.get(leisure_activity, 150)
    neat_boost = EXERCISE_ADJUSTMENTS.get(exercise_type, {"neat_boost": 0})["neat_boost"]
    return base_neat + neat_boost


def calculate_rmr(weight, age, gender, height_cm, is_athlete):
    """
    Calculate Resting Metabolic Rate (RMR) using the Mifflin-St Jeor equation.

    Args:
        weight (float): Weight in kg.
        age (int): Age in years.
        gender (str): 'm' or 'f'.
        height_cm (float): Height in cm.
        is_athlete (bool): Whether the user is an athlete.

    Returns:
        float: RMR in calories.

    Notes:
        Mifflin-St Jeor. The +10% athlete boost is REMOVED (2026-06-08 — findings doc):
        the equation choice (Ten-Haaf / Cunningham vs Mifflin) handles athlete accuracy;
        an ad-hoc +10% on top is an unvalidated double-adjustment.
    """
    if weight <= 0 or age < 18 or age > 100 or height_cm < 100 or height_cm > 250:
        raise ValueError("Invalid input values for RMR calculation.")

    if gender == 'm':
        rmr = 10 * weight + 6.25 * height_cm - 5 * age + 5
    else:
        rmr = 10 * weight + 6.25 * height_cm - 5 * age - 161

    # NOTE: athlete +10% boost REMOVED 2026-06-08. Use Cunningham/Ten-Haaf instead
    # (see PRIME_RMR_Calculations_v2.get_rmr_and_tdee which selects the best equation).
    return rmr


def calculate_tdee(
    weight, age, gender, activity_level, height_cm, is_athlete,
    protein_cal, carb_cal, fat_cal,
    job_activity, leisure_activity, exercise_type,
):
    """
    Calculate Total Daily Energy Expenditure (TDEE).

    Returns:
        float: TDEE in calories.

    Notes:
        TDEE = (RMR * ActivityMultiplier) + TEF.
        TEF added ONCE here. NEAT is embedded in the activity multiplier — do NOT add
        estimate_neat() on top of this (that was the double-count bug, now fixed).
    """
    rmr = calculate_rmr(weight, age, gender, height_cm, is_athlete)
    tef = estimate_tef(protein_cal, carb_cal, fat_cal)

    activity_multipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very active': 1.9,
    }
    multiplier = activity_multipliers.get(activity_level, 1.55)

    # TDEE formula: (RMR * Activity Factor) + TEF (once).
    # NEAT is embedded in the activity multiplier — not added separately.
    return (rmr * multiplier) + tef
