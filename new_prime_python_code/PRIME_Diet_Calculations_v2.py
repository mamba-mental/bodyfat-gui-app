#!/usr/bin/env python
# diet_calculations.py - Diet-based calculations for the BF Estimator
# Created: 03/27/25
# Updated: 04/08/25 - Aligned with utils.py and calculations.py for bodybuilding enhancements
# Updated: 11/21/25 - Added Intermittent Fasting Logic

import math
from typing import Dict, List, Any, Union, Tuple, Optional
from .PRIME_Utils import calculate_tdee, DIET_MULTIPLIERS, EXERCISE_ADJUSTMENTS

def get_diet_multipliers(diet_type: str) -> Tuple[float, float]:
    """
    Get the fat loss and muscle gain multipliers for a specific diet type.
    
    Args:
        diet_type: The type of diet (keto, low-carb, etc.)
        
    Returns:
        Tuple of (fat_loss_multiplier, muscle_gain_multiplier)
    """
    diet_type = diet_type.lower() if diet_type else "balanced"
    return DIET_MULTIPLIERS.get(diet_type, (1.0, 1.0))  # Default to balanced if not found

def get_fasting_multipliers(eating_window: float) -> Tuple[float, float]:
    """
    Calculate multipliers based on eating frequency/window.
    
    Args:
        eating_window (float): Hours allowed for eating (e.g., 8 for 16:8, 1 for OMAD).
        
    Returns:
        Tuple of (fat_loss_multiplier, muscle_gain_multiplier)
        
    Logic:
        - Standard (12+ hours): Neutral (1.0, 1.0)
        - 16:8 (8 hours): Slight fat loss boost, neutral muscle.
        - Warrior/20:4 (4 hours): Moderate fat loss boost, slight muscle drag (protein timing).
        - OMAD (<2 hours): High fat loss boost, moderate muscle drag.
    """
    if eating_window >= 12:
        return 1.0, 1.0
    elif eating_window >= 8: # 16:8 Protocol
        return 1.025, 1.0   # 2.5% Fat loss boost, neutral muscle
    elif eating_window >= 4: # 20:4 Protocol
        return 1.05, 0.98   # 5% Fat loss boost, 2% muscle drag
    else:                    # OMAD / Extended
        return 1.08, 0.95   # 8% Fat loss boost, 5% muscle drag

def calculate_nutrition_info(protein_g: float, carbs_g: float, fat_g: float, diet_type: str = "balanced") -> Dict[str, Any]:
    """
    Calculate nutrition information and macronutrient ratios based on protein, carbs, and fat.
    
    Args:
        protein_g: Protein in grams
        carbs_g: Carbohydrates in grams
        fat_g: Fat in grams
        diet_type: The type of diet (keto, low-carb, etc.)
        
    Returns:
        Dictionary with total calories, macronutrient ratios, diet quality, and warnings
    """
    protein_cal = protein_g * 4
    carbs_cal = carbs_g * 4
    fat_cal = fat_g * 9
    total_cal = protein_cal + carbs_cal + fat_cal
    
    protein_ratio = (protein_cal / total_cal) * 100 if total_cal > 0 else 0
    carbs_ratio = (carbs_cal / total_cal) * 100 if total_cal > 0 else 0
    fat_ratio = (fat_cal / total_cal) * 100 if total_cal > 0 else 0
    
    warnings = []
    diet_quality = "Good"
    
    if diet_type.lower() == "keto":
        if carbs_ratio > 10:
            warnings.append(f"Carbs too high for keto ({carbs_ratio:.1f}%). Aim for <10%.")
            diet_quality = "Needs Adjustment"
        if fat_ratio < 65:
            warnings.append(f"Fat too low for keto ({fat_ratio:.1f}%). Aim for >65%.")
            diet_quality = "Needs Adjustment"
    elif diet_type.lower() == "low-carb" and carbs_ratio > 25:
        warnings.append(f"Carbs too high for low-carb ({carbs_ratio:.1f}%). Aim for <25%.")
        diet_quality = "Needs Adjustment"
    
    if protein_ratio < 15:
        warnings.append(f"Protein low ({protein_ratio:.1f}%). Increase for muscle preservation.")
        diet_quality = "Suboptimal" if diet_quality == "Good" else diet_quality
    
    if total_cal < 1200:
        warnings.append(f"Calories ({total_cal:.0f}) very low. May be too restrictive.")
        diet_quality = "Potentially Harmful"
    
    return {
        "total_calories": total_cal,
        "protein_cal": protein_cal,
        "carbs_cal": carbs_cal,
        "fat_cal": fat_cal,
        "protein_ratio": protein_ratio,
        "carbs_ratio": carbs_ratio,
        "fat_ratio": fat_ratio,
        "diet_quality": diet_quality,
        "warnings": warnings
    }

def calculate_weekly_rate_of_fat_loss(
    current_weight: float, 
    body_fat_percentage: float, 
    tdee: float, 
    daily_calories: float,
    diet_type: str = "balanced",
    activity_level: str = "moderate",
    exercise_type: str = "resistance",
    ped_use: bool = False,
    is_bodybuilder: bool = False,
    eating_window: float = 12.0
) -> float:
    """
    Calculate the expected weekly rate of fat loss based on caloric deficit and new parameters.
    
    Args:
        current_weight: Current weight in pounds
        body_fat_percentage: Current body fat percentage (0-100)
        tdee: Total Daily Energy Expenditure in calories
        daily_calories: Daily caloric intake
        diet_type: The type of diet (keto, low-carb, etc.)
        activity_level: Activity level (sedentary, light, moderate, active, very active)
        exercise_type: Exercise type (resistance, cardio, hiit)
        ped_use: Whether PEDs are used
        is_bodybuilder: Bodybuilding mode toggle
        eating_window: Eating window in hours (e.g., 8 for 16:8 fasting)
        
    Returns:
        Expected weekly fat loss in pounds
    """
    fat_loss_multiplier, _ = get_diet_multipliers(diet_type)
    
    # Apply Fasting Multiplier
    fasting_boost, _ = get_fasting_multipliers(eating_window)
    fat_loss_multiplier *= fasting_boost

    fat_loss_multiplier *= EXERCISE_ADJUSTMENTS.get(exercise_type, {"fat_loss": 1.0})["fat_loss"]
    if ped_use:
        fat_loss_multiplier *= 1.2  # PED boost
    
    deficit = tdee - daily_calories
    weekly_deficit = deficit * 7
    weekly_fat_loss = (weekly_deficit / 3500) * fat_loss_multiplier
    
    bf_factor = min(1.2, max(0.8, body_fat_percentage / 25))
    weekly_fat_loss *= bf_factor
    
    activity_factors = {
        "sedentary": 0.9,
        "light": 0.95,
        "moderate": 1.0,
        "active": 1.05,
        "very active": 1.1
    }
    weekly_fat_loss *= activity_factors.get(activity_level, 1.0)
    
    max_weekly_loss = current_weight * (0.015 if is_bodybuilder else 0.01)  # Higher cap for bodybuilders
    return min(max(0, weekly_fat_loss), max_weekly_loss)

def calculate_weekly_muscle_gain(
    current_weight: float,
    body_fat_percentage: float,
    protein_intake: float,
    diet_type: str = "balanced",
    resistance_training: bool = False,
    experience_level: str = "intermediate",
    exercise_type: str = "resistance",
    ped_use: bool = False,
    is_bodybuilder: bool = False,
    sleep_quality: str = "good",
    eating_window: float = 12.0
) -> float:
    """
    Calculate the expected weekly muscle gain with enhanced parameters.
    
    Args:
        current_weight: Current weight in pounds
        body_fat_percentage: Current body fat percentage (0-100)
        protein_intake: Daily protein intake in grams
        diet_type: The type of diet (keto, low-carb, etc.)
        resistance_training: Whether the user does resistance training
        experience_level: Training experience (beginner, novice, intermediate, advanced, elite)
        exercise_type: Exercise type (resistance, cardio, hiit)
        ped_use: Whether PEDs are used
        is_bodybuilder: Bodybuilding mode toggle
        sleep_quality: Sleep quality (good, poor)
        eating_window: Eating window in hours (e.g., 8 for 16:8 fasting)
        
    Returns:
        Expected weekly muscle gain in pounds
    """
    if not resistance_training:
        return 0.05  # Reduced baseline for no training
    
    _, muscle_gain_multiplier = get_diet_multipliers(diet_type)
    
    # Apply Fasting Multiplier (potential negative impact on muscle if window is too small)
    _, fasting_drag = get_fasting_multipliers(eating_window)
    muscle_gain_multiplier *= fasting_drag

    muscle_gain_multiplier *= EXERCISE_ADJUSTMENTS.get(exercise_type, {"muscle_gain": 1.0})["muscle_gain"]
    if ped_use:
        muscle_gain_multiplier *= 1.5  # PED boost
    if is_bodybuilder:
        muscle_gain_multiplier *= 1.2  # Bodybuilding boost
    sleep_multiplier = 1.0 if sleep_quality == "good" else 0.8
    
    base_gains = {
        "beginner": 0.5,
        "novice": 0.35,
        "intermediate": 0.25,
        "advanced": 0.15,
        "elite": 0.1
    }
    base_muscle_gain = base_gains.get(experience_level.lower(), 0.25)
    
    lean_mass = current_weight * (1 - (body_fat_percentage / 100))
    protein_factor = min(1.2, max(0.5, protein_intake / lean_mass))
    
    bf_optimal = 14  # Assuming male default
    bf_factor = max(0.7, min(1.0, 1.0 - (0.02 * abs(body_fat_percentage - bf_optimal))))
    
    weekly_muscle_gain = base_muscle_gain * protein_factor * muscle_gain_multiplier * bf_factor * sleep_multiplier
    return weekly_muscle_gain

def project_body_composition_changes(
    current_weight: float,
    current_bf: float,
    goal_weight: float,
    goal_bf: float,
    protein_intake: float,
    carbs_intake: float,
    fat_intake: float,
    diet_type: str = "balanced",
    activity_level: str = "moderate",
    height_cm: float = 170,
    age: int = 30,
    gender: str = "m",
    is_athlete: bool = False,
    job_activity: str = "moderate",
    leisure_activity: str = "moderate",
    resistance_training: bool = True,
    experience_level: str = "intermediate",
    exercise_type: str = "resistance",
    ped_use: bool = False,
    is_bodybuilder: bool = False,
    sleep_quality: str = "good",
    eating_window: float = 12.0,
    max_weeks: int = 52
) -> List[Dict[str, Any]]:
    """
    Project weekly body composition changes with dynamic adjustments.
    
    Args:
        current_weight: Starting weight in pounds
        current_bf: Starting body fat percentage (0-100)
        goal_weight: Target weight in pounds
        goal_bf: Target body fat percentage (0-100)
        protein_intake: Daily protein intake in grams
        carbs_intake: Daily carbohydrate intake in grams
        fat_intake: Daily fat intake in grams
        diet_type: The type of diet (keto, low-carb, etc.)
        activity_level: Activity level (sedentary, light, moderate, active, very active)
        height_cm: Height in centimeters
        age: Age in years
        gender: Gender (m/f)
        is_athlete: Athlete status
        job_activity: Job activity level
        leisure_activity: Leisure activity level
        resistance_training: Whether resistance training is performed
        experience_level: Training experience level
        exercise_type: Exercise type
        ped_use: Whether PEDs are used
        is_bodybuilder: Bodybuilding mode toggle
        sleep_quality: Sleep quality (good, poor)
        eating_window: Eating window in hours
        max_weeks: Maximum weeks to project
        
    Returns:
        List of weekly body composition projections
    """
    nutrition_info = calculate_nutrition_info(protein_intake, carbs_intake, fat_intake, diet_type)
    protein_cal, carb_cal, fat_cal = nutrition_info["protein_cal"], nutrition_info["carbs_cal"], nutrition_info["fat_cal"]
    
    weight = current_weight
    bf_percent = current_bf
    lean_mass = weight * (1 - (bf_percent / 100))
    fat_mass = weight * (bf_percent / 100)
    
    # Initial TDEE
    tdee = calculate_tdee(weight / 2.205, age, gender, activity_level, height_cm, is_athlete, protein_cal, carb_cal, fat_cal, job_activity, leisure_activity, exercise_type)
    daily_calories = nutrition_info["total_calories"]
    
    results = [{
        "week": 0,
        "date": "Start",
        "weight": weight,
        "body_fat_percentage": bf_percent,
        "lean_mass": lean_mass,
        "fat_mass": fat_mass,
        "tdee": tdee,
        "daily_calories": daily_calories,
        "weekly_fat_loss": 0,
        "weekly_muscle_gain": 0
    }]
    
    for week in range(1, max_weeks + 1):
        # Recalculate TDEE based on current weight (moved inside loop for accuracy)
        tdee = calculate_tdee(weight / 2.205, age, gender, activity_level, height_cm, is_athlete, protein_cal, carb_cal, fat_cal, job_activity, leisure_activity, exercise_type)

        remaining_weight_to_lose = max(weight - goal_weight, 0)
        # Removed unused fat loss calculation here
        
        remaining_weeks = max(1, max_weeks - week)
        
        weekly_weight_loss_required = remaining_weight_to_lose / remaining_weeks
        weekly_deficit_required = weekly_weight_loss_required * 3500
        daily_deficit_required = weekly_deficit_required / 7
        daily_calories = tdee - daily_deficit_required
        
        if not is_bodybuilder:
            min_calories = 1200 if gender == "f" else 1500
            daily_calories = max(daily_calories, min_calories)
        
        weekly_fat_loss = calculate_weekly_rate_of_fat_loss(
            weight, bf_percent, tdee, daily_calories, diet_type, activity_level, exercise_type, ped_use, is_bodybuilder, eating_window
        )
        weekly_muscle_gain = calculate_weekly_muscle_gain(
            weight, bf_percent, protein_intake, diet_type, resistance_training, experience_level, exercise_type, ped_use, is_bodybuilder, sleep_quality, eating_window
        )
        
        fat_mass -= weekly_fat_loss
        lean_mass += weekly_muscle_gain
        weight = fat_mass + lean_mass
        bf_percent = (fat_mass / weight) * 100 if weight > 0 else 0
        
        results.append({
            "week": week,
            "date": f"Week {week}",
            "weight": weight,
            "body_fat_percentage": bf_percent,
            "lean_mass": lean_mass,
            "fat_mass": fat_mass,
            "tdee": tdee,
            "daily_calories": daily_calories,
            "weekly_fat_loss": weekly_fat_loss,
            "weekly_muscle_gain": weekly_muscle_gain
        })
        
        if abs(weight - goal_weight) < 1 and abs(bf_percent - goal_bf) < 1:
            break
    
    return results

if __name__ == "__main__":
    print("Testing diet calculations module...")
    nutrition = calculate_nutrition_info(150, 200, 60, "keto")
    print(f"Total Calories: {nutrition['total_calories']:.0f}")
    fat_loss = calculate_weekly_rate_of_fat_loss(254, 20, 3000, 1500, "keto", "active", "resistance", True, True, eating_window=8)
    print(f"Fat Loss (16:8): {fat_loss:.2f} lbs")
    muscle_gain = calculate_weekly_muscle_gain(254, 20, 200, "keto", True, "advanced", "resistance", True, True, "good", eating_window=8)
    print(f"Muscle Gain (16:8): {muscle_gain:.2f} lbs")