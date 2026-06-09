#!/usr/bin/env python3
"""
FastAPI wrapper for PRIME calculation engine
Provides REST API endpoints for the GUI application
"""

import sys
import os
import inspect as _inspect
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import uvicorn
import asyncio

# Import data endpoints
from data_endpoints import router as data_router
from backup_endpoints import router as backup_router

# Report output directory - must match data_endpoints.py REPORTS_DIR for ingestion
REPORTS_OUTPUT_DIR = Path(__file__).parent.parent / "storage" / "reports"
REPORTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Import performance optimizations (DISABLED - causes startup hang)
# from performance_optimizations import (
#     cached_calculation,
#     optimizer,
#     initialize_performance_optimizations,
#     performance_monitor
# )

# Add the PRIME code to Python path
current_dir = Path(__file__).parent
gui_app_dir = current_dir.parent
sys.path.insert(0, str(gui_app_dir))

try:
    print("[import] Loading PRIME modules...")
    from new_prime_python_code.PRIME_Calculations import predict_weight_loss

    print("[import] OK PRIME_Calculations")
    from new_prime_python_code.PRIME_Utils import calculate_rmr, calculate_tdee

    print("[import] OK PRIME_Utils")
    from new_prime_python_code.PRIME_RMR_Calculations_v2 import get_rmr_and_tdee

    print("[import] OK PRIME_RMR_Calculations_v2")
    from new_prime_python_code.PRIME_Diet_Calculations_v2 import (
        calculate_weekly_rate_of_fat_loss,
        calculate_weekly_muscle_gain,
    )

    print("[import] OK PRIME_Diet_Calculations_v2")

    from new_prime_python_code.PRIME_Report_Generator_v3_Fast import (
        generate_prime_report_terminal_fast,
    )

    print("[import] OK PRIME_Report_Generator_v3_Fast")

    from new_prime_python_code.PRIME_AI_Confidence_Analyzer import AIConfidenceAnalyzer

    print("[import] OK PRIME_AI_Confidence_Analyzer")

    print("[import] All PRIME modules loaded successfully")
except ImportError as e:
    print(f"[import] ERROR importing PRIME modules: {e}")
    print(f"[import] Python path: {sys.path}")
    # Temporarily disable exit to test database endpoints
    # sys.exit(1)

# Module-level signature constant — computed ONCE at startup (MEDIUM fix).
# Avoids the per-request `import inspect; inspect.signature(predict_weight_loss)`
# calls that previously appeared at ~line 437 and ~line 631.
try:
    _PWL_SIG = _inspect.signature(predict_weight_loss)
except Exception:
    _PWL_SIG = None  # graceful fallback if import failed above

app = FastAPI(
    title="PRIME Body Fat Calculator API",
    description="REST API wrapper for the PRIME calculation engine",
    version="1.0.0",
)

# Add performance middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include data persistence endpoints
app.include_router(data_router)

# Include backup endpoints
app.include_router(backup_router)

# CORS Configuration - Use environment variable for production security
# Set ALLOWED_ORIGINS env var as comma-separated list in production
# Example: ALLOWED_ORIGINS=https://myapp.com,https://api.myapp.com
def get_allowed_origins() -> list:
    """Get allowed origins from environment or use development defaults."""
    env_origins = os.environ.get("ALLOWED_ORIGINS", "")
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]

    # Development defaults - specific origins only (no wildcard)
    # STANDARDIZED PORT: Frontend 3713 | Backend 8313
    return [
        "http://localhost:3713",
        "http://127.0.0.1:3713",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3005",
        "http://localhost:3010",
        "http://localhost:4000",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3010",
        "http://127.0.0.1:4000",
        "http://127.0.0.1:5000",
        # Docker network origins
        "http://apex-fit-ai:3000",
        "http://apex-fit-ai-new:3000",
        # NAS/production origins (configurable via env)
    ]

ALLOWED_ORIGINS = get_allowed_origins()
print(f"[CORS] Configured origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)


class UserData(BaseModel):
    # Personal Information
    name: str
    age: int
    gender: str  # 'm' or 'f'
    height_feet: int
    height_inches: int
    height_cm: float
    dob: str

    # Current State
    current_weight: float  # lbs
    current_bf: float  # percentage

    # Goals
    goal_weight: float  # lbs
    goal_bf: float  # percentage
    start_date: str
    end_date: str

    # Activity & Training
    activity_level: int  # 1-5 scale
    resistance_training: bool
    is_athlete: bool
    workout_type: str  # "Bodybuilding", "Cardio", "General Fitness"
    workout_days: int  # per week
    job_activity: int  # 1-4 scale
    leisure_activity: int  # 1-4 scale
    experience_level: str
    volume_score: float
    intensity_score: float
    frequency_score: float
    is_bodybuilder: bool

    # Nutrition
    protein_intake: float  # grams
    diet_type: str  # "keto", "high_protein", "balanced", "high_carb"
    eating_pattern: str = "standard"  # "standard", "intermittent_fasting", "omad"
    eating_window_hours: float = 12.0

    # Advanced Options
    ped_use: bool

    exercise_type: str  # "resistance", "cardio", "hiit"
    sleep_quality: str  # "good", "poor"

    # Optional fields from GUI
    timeline_weeks: Optional[int] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    neck: Optional[float] = None
    sex: Optional[str] = None  # Alternative to gender

    # New contract fields (optional with defaults for back-compat)
    goal_type: str = "cut"          # "cut" | "recomp" | "lean_gain" | "maintain"
    calorie_floor: float = 1200.0   # Configurable calorie floor; 1200 kcal default

    # PED stack — compound-level detail for the engine modifier system.
    # Each item: {"compound": str, "dose_mg": float|None, "phase": str|None}.
    # When None / empty, behaviour is identical to the legacy ped_use bool path.
    # Old callers that only send ped_use=True are fully backwards-compatible.
    # See docs/PED-MODIFIERS-SOURCING.md for valid compound names.
    ped_stack: Optional[List[Dict[str, Any]]] = None

    # Controller fields (2026-06-08 — contest-prep course-correction system)
    lean_ceiling_lb: float = 189.0          # Proven lean-mass ceiling (lb). PRIME default = 189.
    max_cardio_min_per_day: int = 75        # Hard cap on daily LISS cardio (min).
    # actual_entries: list of actual weigh-ins for course-correction.
    # Each: {"week": int, "weight": float, "bf": float}
    actual_entries: Optional[List[Dict[str, Any]]] = None


class WeeklyProgression(BaseModel):
    # ---- EXISTING fields (keep as-is, never drop) ----
    week_number: int = 0
    date: str
    weight: float
    body_fat_percentage: float
    daily_calorie_intake: float  # training-day headline (= training_calories)
    tdee: float
    weekly_caloric_output: float
    total_weight_lost: float
    lean_mass: float
    fat_mass: float
    muscle_gain: float
    rmr: float
    tef: float
    neat: float
    # ---- Calibrated curve day-type breakdown (were dropped before — P0 fix) ----
    training_calories: float = 0.0
    rest_calories: float = 0.0
    psmf_calories: float = 0.0
    protein_g: float = 0.0
    phase: str = ""
    # ---- NEW contract fields (Optional + sane defaults for back-compat) ----
    # weekly_average_calories: the 3-training/3-rest/1-PSMF weekly average the engine
    # already computes as daily_calorie_intake inside scaled_recomp_targets.  We
    # surface it under its own name so callers have both semantics explicitly.
    weekly_average_calories: Optional[float] = None
    calorie_floor: Optional[float] = None       # Agent 1 emits; pass-through here
    weekly_fat_loss_lb: Optional[float] = None  # Agent 1 emits; pass-through here
    p_ratio: Optional[float] = None             # Agent 1 emits; pass-through here
    rmr_method: Optional[str] = None            # Agent 1 emits; pass-through here
    below_rmr: Optional[bool] = None            # Agent 1 emits; pass-through here
    feasibility: Optional[str] = None           # Agent 1 emits; pass-through here
    # ---- PED stack fields (Optional; None when no stack provided) ----
    ped_ee_bonus_kcal: Optional[float] = None   # Thermogenic EE bonus kcal/day (Clen/T3)
    ped_confidence: Optional[str] = None        # Weakest evidence grade ("high"|"medium"|"low")
    # ---- CONTROLLER fields (2026-06-08 — contest-prep course-correction system) ----
    required_weight: Optional[float] = None     # Required weight at this week (lb)
    required_bf: Optional[float] = None         # Required BF% at this week
    lean_ceiling_lb: Optional[float] = None     # Lean-mass ceiling (lb)
    prescribed_cardio_sessions: Optional[int] = None   # Prescribed LISS sessions/week
    prescribed_cardio_min: Optional[int] = None         # Minutes per LISS session
    cardio_kcal: Optional[float] = None         # Total cardio kcal/week prescribed
    carbs_g: Optional[int] = None               # Carbohydrate prescription (g/day, training-day)
    required_deficit: Optional[float] = None    # Required weekly deficit (kcal)
    max_safe_deficit: Optional[float] = None    # Max achievable deficit (diet + cardio ceiling)
    residual_gap: Optional[float] = None        # Unachievable gap after all levers (kcal)
    correction_status: Optional[str] = None     # "on_track" | "pushing_limits" | "maxed_out"


class CalculationResult(BaseModel):
    user_data: UserData
    progression: List[WeeklyProgression]
    summary: Dict[str, float]
    confidence_score: Optional[float] = None
    ai_analysis: Optional[str] = None


class EntryUpdate(BaseModel):
    date: str
    weight: float
    body_fat_percentage: Optional[float] = None
    notes: Optional[str] = None


class AISettings(BaseModel):
    """AI provider settings for confidence analysis and report generation."""
    provider: Optional[str] = None  # anthropic, openrouter, openai, gemini, groq, etc.
    model: Optional[str] = None  # Model identifier
    api_key: Optional[str] = None  # Optional API key override


class CalculationRequest(BaseModel):
    """Request model for calculation with optional AI settings."""
    user_data: UserData
    ai_settings: Optional[AISettings] = None


class ReportRequest(BaseModel):
    """Request model for report generation with optional AI settings."""
    user_data: UserData
    ai_settings: Optional[AISettings] = None


def get_ai_analyzer(ai_settings: Optional[AISettings] = None):
    """
    Create an AIConfidenceAnalyzer with the specified settings.
    Falls back to environment variables if no settings provided.
    """
    if ai_settings:
        return AIConfidenceAnalyzer(
            api_key=ai_settings.api_key,
            provider=ai_settings.provider,
            model=ai_settings.model
        )
    else:
        # Use default (reads from environment variables)
        return AIConfidenceAnalyzer()


def parse_date_string(date_str: str) -> datetime:
    """Parse date string in various formats to datetime object"""
    # Try different date formats
    formats = [
        "%m/%d/%y",  # MM/DD/YY
        "%m/%d/%Y",  # MM/DD/YYYY
        "%m%d%y",  # MMDDYY
        "%m%d%Y",  # MMDDYYYY
        "%d/%m/%Y",  # DD/MM/YYYY
        "%Y-%m-%d",  # ISO format
    ]

    # Special handling for 6-digit dates (MMDDYY)
    if len(date_str) == 6 and date_str.isdigit():
        # Assume MMDDYY format
        month = date_str[0:2]
        day = date_str[2:4]
        year = date_str[4:6]
        # Assume 1900s for years 50-99, 2000s for 00-49
        if int(year) >= 50:
            year = "19" + year
        else:
            year = "20" + year
        date_str = f"{month}/{day}/{year}"
        formats.insert(0, "%m/%d/%Y")

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    # If all else fails, try ISO format
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        raise ValueError(f"Unable to parse date string: {date_str}")


def get_activity_level_string(level: int) -> str:
    """Convert activity level integer to string"""
    activity_map = {
        1: "sedentary",
        2: "light",
        3: "moderate",
        4: "active",
        5: "very active",
    }
    return activity_map.get(level, "moderate")


def get_activity_level_description(level: int) -> str:
    """Convert activity level integer to description for report"""
    activity_descriptions = {
        1: "Sedentary (little or no exercise)",
        2: "Lightly Active (exercise 1-3 days/week)",
        3: "Moderately Active (exercise 3-5 days/week)",
        4: "Very Active (exercise 6-7 days/week)",
        5: "Extremely Active (physical job or training twice per day)",
    }
    return activity_descriptions.get(level, "Moderately Active")


def convert_user_data_to_prime_format(user_data: UserData) -> Dict[str, Any]:
    """Convert GUI UserData to PRIME calculation format"""
    return {
        "name": user_data.name,
        "current_weight": user_data.current_weight,
        "current_bf": user_data.current_bf,
        "goal_weight": user_data.goal_weight,
        "goal_bf": user_data.goal_bf,
        "start_date": user_data.start_date,
        "end_date": user_data.end_date,
        "dob": user_data.dob,
        "age": user_data.age,
        "gender": "Male"
        if user_data.gender == "m"
        else "Female",  # Capitalize for report
        "height_feet": user_data.height_feet,
        "height_inches": user_data.height_inches,
        "height_cm": user_data.height_cm,
        "protein_intake": user_data.protein_intake,
        "activity_level": user_data.activity_level,
        "activity_factor": user_data.activity_level,  # Add missing field
        "activity_level_description": get_activity_level_description(
            user_data.activity_level
        ),  # Add description
        "resistance_training": user_data.resistance_training,  # Keep as boolean
        "is_athlete": user_data.is_athlete,  # Keep as boolean
        "workout_type": user_data.workout_type,
        "workout_days": user_data.workout_days,
        "job_activity": user_data.job_activity,
        "leisure_activity": user_data.leisure_activity,
        "experience_level": user_data.experience_level,
        "volume_score": user_data.volume_score,
        "intensity_score": user_data.intensity_score,
        "frequency_score": user_data.frequency_score,
        "is_bodybuilder": user_data.is_bodybuilder,
        "ped_use": user_data.ped_use,
        # MEDIUM fix: include ped_stack so the AI path always has compound-level
        # detail without relying on the post-hoc patch at line ~535.
        "ped_stack": user_data.ped_stack,
        "diet_type": user_data.diet_type,
        "eating_pattern": user_data.eating_pattern,
        "eating_window_hours": user_data.eating_window_hours,
        "exercise_type": user_data.exercise_type,
        "sleep_quality": user_data.sleep_quality,
    }


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "PRIME Body Fat Calculator API", "status": "running"}


@app.post("/calculate", response_model=CalculationResult)
# @cached_calculation  # DISABLED - performance_optimizations not imported
# @performance_monitor  # DISABLED - performance_optimizations not imported
async def calculate_progression(user_data: UserData, ai_settings: Optional[AISettings] = None):
    """
    Calculate weight loss progression using PRIME engine.

    Optionally accepts AI settings for confidence analysis.
    If not provided, uses environment variable defaults.

    AI Settings (optional):
    - provider: anthropic, openrouter, openai, gemini, groq, mistral, xai, fireworks, perplexity
    - model: Model identifier (e.g., 'claude-sonnet-4-20250514', 'google/gemini-flash-1.5-8b')
    - api_key: Override API key for the provider
    """
    try:
        # Validate timeline at the API boundary — guard against ValueError -> 500.
        _start = parse_date_string(user_data.start_date)
        _end = parse_date_string(user_data.end_date)
        _weeks = (_end - _start).days // 7
        if _weeks < 1:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Timeline too short: start={user_data.start_date}, "
                    f"end={user_data.end_date} => {_weeks} week(s). "
                    "Must be at least 1 week."
                ),
            )

        # Convert to PRIME format
        prime_data = convert_user_data_to_prime_format(user_data)

        # Build keyword args; pass goal_type/calorie_floor/ped_stack/controller params
        # when the engine supports them (use **kwargs guard so this file doesn't break
        # if the engine hasn't yet been updated in a given deployment).
        # _PWL_SIG is a module-level constant — avoids per-request import+inspect.
        _extra_kwargs: Dict[str, Any] = {}
        _sig = _PWL_SIG or _inspect.signature(predict_weight_loss)
        if "goal_type" in _sig.parameters:
            _extra_kwargs["goal_type"] = user_data.goal_type
        if "calorie_floor" in _sig.parameters:
            _extra_kwargs["calorie_floor"] = user_data.calorie_floor
        if "ped_stack" in _sig.parameters:
            _extra_kwargs["ped_stack"] = user_data.ped_stack  # None when not sent by frontend
        # Controller params (2026-06-08)
        if "lean_ceiling_lb" in _sig.parameters:
            _extra_kwargs["lean_ceiling_lb"] = user_data.lean_ceiling_lb
        if "max_cardio_min_per_day" in _sig.parameters:
            _extra_kwargs["max_cardio_min_per_day"] = user_data.max_cardio_min_per_day
        if "actual_entries" in _sig.parameters:
            _extra_kwargs["actual_entries"] = user_data.actual_entries

        # Run PRIME calculations with individual parameters
        progression = predict_weight_loss(
            current_weight=user_data.current_weight,
            current_bf=user_data.current_bf,
            goal_weight=user_data.goal_weight,
            goal_bf=user_data.goal_bf,
            start_date=_start,
            end_date=_end,
            dob=parse_date_string(user_data.dob),
            gender=user_data.gender,
            activity_level=get_activity_level_string(user_data.activity_level),
            height_cm=user_data.height_cm,
            is_athlete=user_data.is_athlete,
            daily_protein_intake=user_data.protein_intake,
            job_activity=get_activity_level_string(user_data.job_activity),
            leisure_activity=get_activity_level_string(user_data.leisure_activity),
            experience_level=user_data.experience_level,
            is_bodybuilder=user_data.is_bodybuilder,
            ped_use=user_data.ped_use,
            diet_type=user_data.diet_type,
            exercise_type=user_data.exercise_type,
            sleep_quality=user_data.sleep_quality,
            workout_days=user_data.workout_days,
            volume_score=user_data.volume_score,
            intensity_score=user_data.intensity_score,
            eating_window_hours=user_data.eating_window_hours,
            **_extra_kwargs,
        )

        # Convert progression to API format — pass through ALL contract fields.
        # daily_calorie_intake from the engine is already the weekly average (the
        # 3-training/3-rest/1-PSMF headline set by scaled_recomp_targets).
        # We also surface it explicitly as weekly_average_calories so callers
        # have both field names without ambiguity.
        api_progression = []
        for week_data in progression:
            _training_cal = week_data.get("training_calories", 0.0)
            api_progression.append(
                WeeklyProgression(
                    week_number=week_data.get("week_number", 0),
                    date=week_data.get("date", ""),
                    weight=week_data.get("weight", 0.0),
                    body_fat_percentage=week_data.get("body_fat_percentage", 0.0),
                    # daily_calorie_intake = training-day headline (spec: training_calories)
                    daily_calorie_intake=_training_cal if _training_cal else week_data.get("daily_calorie_intake", 0.0),
                    tdee=week_data.get("tdee", 0.0),
                    weekly_caloric_output=week_data.get("weekly_caloric_output", 0.0),
                    total_weight_lost=week_data.get("total_weight_lost", 0.0),
                    lean_mass=week_data.get("lean_mass", 0.0),
                    fat_mass=week_data.get("fat_mass", 0.0),
                    muscle_gain=week_data.get("muscle_gain", 0.0),
                    rmr=week_data.get("rmr", 0.0),
                    tef=week_data.get("tef", 0.0),
                    neat=week_data.get("neat", 0.0),
                    # Calibrated curve day-type breakdown (P0 fix — were dropped before)
                    training_calories=week_data.get("training_calories", 0.0),
                    rest_calories=week_data.get("rest_calories", 0.0),
                    psmf_calories=week_data.get("psmf_calories", 0.0),
                    protein_g=week_data.get("protein_g", 0.0),
                    phase=week_data.get("phase", ""),
                    # New contract fields — pass through; None when engine hasn't emitted them yet
                    weekly_average_calories=week_data.get("weekly_average_calories") or week_data.get("daily_calorie_intake"),
                    calorie_floor=week_data.get("calorie_floor"),
                    weekly_fat_loss_lb=week_data.get("weekly_fat_loss_lb"),
                    p_ratio=week_data.get("p_ratio"),
                    rmr_method=week_data.get("rmr_method"),
                    below_rmr=week_data.get("below_rmr"),
                    feasibility=week_data.get("feasibility"),
                    # PED stack pass-through (None when no stack in request)
                    ped_ee_bonus_kcal=week_data.get("ped_ee_bonus_kcal"),
                    ped_confidence=week_data.get("ped_confidence"),
                    # Controller fields pass-through (None when engine hasn't emitted them)
                    required_weight=week_data.get("required_weight"),
                    required_bf=week_data.get("required_bf"),
                    lean_ceiling_lb=week_data.get("lean_ceiling_lb"),
                    prescribed_cardio_sessions=week_data.get("prescribed_cardio_sessions"),
                    prescribed_cardio_min=week_data.get("prescribed_cardio_min"),
                    cardio_kcal=week_data.get("cardio_kcal"),
                    carbs_g=week_data.get("carbs_g"),
                    required_deficit=week_data.get("required_deficit"),
                    max_safe_deficit=week_data.get("max_safe_deficit"),
                    residual_gap=week_data.get("residual_gap"),
                    correction_status=week_data.get("correction_status"),
                )
            )

        # Calculate summary statistics
        summary = {
            "total_weight_loss": user_data.current_weight - user_data.goal_weight,
            "body_fat_reduction": user_data.current_bf - user_data.goal_bf,
            "muscle_gain": sum(week.muscle_gain for week in api_progression),
            "timeline_weeks": len(api_progression),
        }

        # Get AI confidence analysis
        confidence_score = None
        ai_analysis = None
        try:
            ai_analyzer = get_ai_analyzer(ai_settings)

            # Augment prime_data with ped_stack + current phase for the AI prompt.
            prime_data["ped_stack"] = user_data.ped_stack
            prime_data["phase"] = progression[0].get("phase", "N/A") if progression else "N/A"

            # Prepare calculation results for AI
            calc_results = {
                "tdee": progression[0]["tdee"] if progression else 0,
                "daily_calorie_intake": progression[0]["daily_calorie_intake"]
                if progression
                else 0,
                "weekly_weight_loss_target": progression[0]["weekly_caloric_output"]
                / 3500
                if progression
                else 0,
                "progression": progression,
            }

            confidence_result = await ai_analyzer.generate_ai_confidence_analysis(
                prime_data, calc_results
            )
            confidence_score = confidence_result.overall_score
            ai_analysis = confidence_result.detailed_analysis
        except Exception as ai_error:
            print(f"AI analysis failed: {ai_error}")
            # Continue without AI analysis

        return CalculationResult(
            user_data=user_data,
            progression=api_progression,
            summary=summary,
            confidence_score=confidence_score,
            ai_analysis=ai_analysis,
        )

    except HTTPException:
        # Re-raise HTTPExceptions (e.g. timeline validation 422) directly.
        raise
    except Exception as e:
        print(f"Calculation error: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")


class RecalculateRequest(BaseModel):
    user_data: UserData
    entry: EntryUpdate


@app.post("/recalculate")
async def recalculate_with_entry(request: RecalculateRequest):
    """Recalculate progression with a new entry"""
    try:
        # Update user data with new entry
        updated_data = request.user_data.copy()
        updated_data.current_weight = request.entry.weight
        if request.entry.body_fat_percentage:
            updated_data.current_bf = request.entry.body_fat_percentage

        # Recalculate with updated data
        return await calculate_progression(updated_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recalculation failed: {str(e)}")


@app.post("/generate-report")
# @performance_monitor  # DISABLED - performance_optimizations not imported
async def generate_report(user_data: UserData):
    """Generate HTML/PDF report using PRIME report generator.

    REGRESSION NOTE (2026-06-08): the old implementation reset start_date to
    datetime.now() and may have extended end_date, causing the report HTML to
    show a different timeline/trajectory than the /calculate result the frontend
    already displayed.  Fixed: use the SAME start/end dates as /calculate so
    report == saved calc.  If the remaining window is very short the engine
    itself handles clamping via its dual-goal convergence logic.
    """
    try:
        # Validate timeline at the API boundary (same guard as /calculate)
        _start = parse_date_string(user_data.start_date)
        _end = parse_date_string(user_data.end_date)
        _weeks = (_end - _start).days // 7
        if _weeks < 1:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Timeline too short: start={user_data.start_date}, "
                    f"end={user_data.end_date} => {_weeks} week(s). "
                    "Must be at least 1 week."
                ),
            )

        # Convert to PRIME format
        prime_data = convert_user_data_to_prime_format(user_data)

        # Build keyword args; pass goal_type/calorie_floor/ped_stack/controller params
        # when supported. _PWL_SIG is a module-level constant.
        _extra_kwargs: Dict[str, Any] = {}
        _sig_r = _PWL_SIG or _inspect.signature(predict_weight_loss)
        if "goal_type" in _sig_r.parameters:
            _extra_kwargs["goal_type"] = user_data.goal_type
        if "calorie_floor" in _sig_r.parameters:
            _extra_kwargs["calorie_floor"] = user_data.calorie_floor
        if "ped_stack" in _sig_r.parameters:
            _extra_kwargs["ped_stack"] = user_data.ped_stack
        # Controller params (2026-06-08)
        if "lean_ceiling_lb" in _sig_r.parameters:
            _extra_kwargs["lean_ceiling_lb"] = user_data.lean_ceiling_lb
        if "max_cardio_min_per_day" in _sig_r.parameters:
            _extra_kwargs["max_cardio_min_per_day"] = user_data.max_cardio_min_per_day
        if "actual_entries" in _sig_r.parameters:
            _extra_kwargs["actual_entries"] = user_data.actual_entries

        # Calculate progression using the SAME dates as /calculate — no date drift.
        progression = predict_weight_loss(
            current_weight=user_data.current_weight,
            current_bf=user_data.current_bf,
            goal_weight=user_data.goal_weight,
            goal_bf=user_data.goal_bf,
            start_date=_start,
            end_date=_end,
            dob=parse_date_string(user_data.dob),
            gender=user_data.gender,
            activity_level=get_activity_level_string(user_data.activity_level),
            height_cm=user_data.height_cm,
            is_athlete=user_data.is_athlete,
            daily_protein_intake=user_data.protein_intake,
            job_activity=get_activity_level_string(user_data.job_activity),
            leisure_activity=get_activity_level_string(user_data.leisure_activity),
            experience_level=user_data.experience_level,
            is_bodybuilder=user_data.is_bodybuilder,
            ped_use=user_data.ped_use,
            diet_type=user_data.diet_type,
            exercise_type=user_data.exercise_type,
            sleep_quality=user_data.sleep_quality,
            workout_days=user_data.workout_days,
            volume_score=user_data.volume_score,
            intensity_score=user_data.intensity_score,
            eating_window_hours=user_data.eating_window_hours,
            **_extra_kwargs,
        )

        # Generate report using fast version (no AI analysis)
        # This skips the 20+ second AI API call for instant report generation
        # Output to storage/reports/ to match data_endpoints.py ingestion path
        markdown_path, pdf_path = generate_prime_report_terminal_fast(
            prime_data, progression, output_dir=str(REPORTS_OUTPUT_DIR)
        )

        # Read the generated HTML content
        html_path = markdown_path.replace(".md", ".html")
        html_content = ""
        if os.path.exists(html_path):
            with open(html_path, "r", encoding="utf-8") as f:
                html_content = f.read()

        return {
            "success": True,
            "markdown_path": markdown_path,
            "pdf_path": pdf_path,
            "html_content": html_content,
        }

    except HTTPException:
        # Re-raise HTTPExceptions (e.g. timeline validation 422) directly
        # so they are not swallowed and converted into a 500.
        raise
    except Exception as e:
        import traceback
        print("=" * 60)
        print("REPORT GENERATION ERROR - FULL TRACEBACK:")
        print("=" * 60)
        traceback.print_exc()
        print("=" * 60)
        import sys
        sys.stdout.flush()
        sys.stderr.flush()
        raise HTTPException(
            status_code=500, detail=f"Report generation failed: {str(e)}"
        )


# ---------------------------------------------------------------------------
# /generate-living-report  (2026-06-08)
# ---------------------------------------------------------------------------
# Additive endpoint — mirrors /generate-report but produces the Clinical
# Playbook Living Progress Report (HTML + MD) via PRIME_Living_Report.py.
# Pure renderer: no math here; engine is the single source of truth.
# ---------------------------------------------------------------------------
class LivingReportRequest(BaseModel):
    """Request body for /generate-living-report."""
    user_data: UserData
    actual_entries: Optional[List[Dict[str, Any]]] = None   # weigh-in overrides


@app.post("/generate-living-report")
async def generate_living_report(request: LivingReportRequest):
    """Generate the Clinical Playbook Living Progress Report (HTML + Markdown).

    Returns:
        {
            "success": bool,
            "html_content": str,   # self-contained HTML
            "md_content": str,     # portable Markdown
            "html_path": str,      # saved file path (storage/reports/)
            "md_path": str,        # saved file path (storage/reports/)
        }

    The renderer is a PURE renderer over predict_weight_loss() output:
    all prescription values come from the engine, not from this endpoint.
    Safety strip is always visible and always expanded (council hard-gate).
    """
    try:
        # Lazy-import the renderer so startup time is unaffected
        from new_prime_python_code.PRIME_Living_Report import (
            render_living_report_html,
            render_living_report_md,
        )
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"PRIME_Living_Report not importable: {e}",
        )

    user_data = request.user_data
    actual_entries = request.actual_entries or user_data.actual_entries

    try:
        # ── 1. Validate timeline ──────────────────────────────────────────
        _start = parse_date_string(user_data.start_date)
        _end = parse_date_string(user_data.end_date)
        _weeks = (_end - _start).days // 7
        if _weeks < 1:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Timeline too short: start={user_data.start_date}, "
                    f"end={user_data.end_date} => {_weeks} week(s). "
                    "Must be at least 1 week."
                ),
            )

        # ── 1b. Load REAL logged weigh-ins (control-system model, PRIME
        #        2026-06-09): map each DB entry to its cycle week so COMPLETED
        #        and CURRENT weeks render actual data, not projections.
        #        Best-effort — never blocks report generation.
        if not actual_entries:
            try:
                from datetime import datetime as _dt_e
                from database import Database as _DB
                _rows = _DB().get_entries("default")
                _by_week: Dict[int, Dict[str, Any]] = {}
                for _r in _rows:
                    _wt = _r.get("weight")
                    _bf = _r.get("body_fat_percentage")
                    if _wt is None or _bf is None:
                        continue
                    _ds = str(_r.get("date") or "")[:10]
                    try:
                        _ed = parse_date_string(_ds)  # returns datetime (matches _start type)
                    except Exception:
                        continue
                    _wk = (_ed - _start).days // 7 + 1
                    if _wk < 1 or _wk > _weeks:
                        continue
                    # rows are DESC by date → first seen per week is the latest
                    if _wk not in _by_week:
                        _by_week[_wk] = {
                            "week": _wk,
                            "weight": float(_wt),
                            "bf": float(_bf),
                            "date": _ds,
                            "photo": _r.get("photo"),
                        }
                if _by_week:
                    actual_entries = list(_by_week.values())
            except Exception:
                pass  # best-effort; fall back to provided/empty actual_entries

        # ── 2. Run the engine (same call as /generate-report) ────────────
        _extra_kwargs: Dict[str, Any] = {}
        _sig_r = _PWL_SIG or _inspect.signature(predict_weight_loss)
        if "goal_type" in _sig_r.parameters:
            _extra_kwargs["goal_type"] = user_data.goal_type
        if "calorie_floor" in _sig_r.parameters:
            _extra_kwargs["calorie_floor"] = user_data.calorie_floor
        if "ped_stack" in _sig_r.parameters:
            _extra_kwargs["ped_stack"] = user_data.ped_stack
        if "lean_ceiling_lb" in _sig_r.parameters:
            _extra_kwargs["lean_ceiling_lb"] = user_data.lean_ceiling_lb
        if "max_cardio_min_per_day" in _sig_r.parameters:
            _extra_kwargs["max_cardio_min_per_day"] = user_data.max_cardio_min_per_day
        if "actual_entries" in _sig_r.parameters:
            _extra_kwargs["actual_entries"] = actual_entries

        progression = predict_weight_loss(
            current_weight=user_data.current_weight,
            current_bf=user_data.current_bf,
            goal_weight=user_data.goal_weight,
            goal_bf=user_data.goal_bf,
            start_date=_start,
            end_date=_end,
            dob=parse_date_string(user_data.dob),
            gender=user_data.gender,
            activity_level=get_activity_level_string(user_data.activity_level),
            height_cm=user_data.height_cm,
            is_athlete=user_data.is_athlete,
            daily_protein_intake=user_data.protein_intake,
            job_activity=get_activity_level_string(user_data.job_activity),
            leisure_activity=get_activity_level_string(user_data.leisure_activity),
            experience_level=user_data.experience_level,
            is_bodybuilder=user_data.is_bodybuilder,
            ped_use=user_data.ped_use,
            diet_type=user_data.diet_type,
            exercise_type=user_data.exercise_type,
            sleep_quality=user_data.sleep_quality,
            workout_days=user_data.workout_days,
            volume_score=user_data.volume_score,
            intensity_score=user_data.intensity_score,
            eating_window_hours=user_data.eating_window_hours,
            **_extra_kwargs,
        )

        # ── 3. Build user_data dict for the renderer ──────────────────────
        renderer_user_data = {
            "name": user_data.name,
            "start_weight": user_data.current_weight,
            "start_bf_percentage": user_data.current_bf,
            "goal_weight": user_data.goal_weight,
            "goal_bf_percentage": user_data.goal_bf,
            "weeks": _weeks,
            "ped_enhanced": user_data.ped_use,
            "lean_ceiling_lb": user_data.lean_ceiling_lb,
            "start_date": _start,
            "end_date": _end,
        }

        # ── 4. Render ─────────────────────────────────────────────────────
        html_content = render_living_report_html(
            progression, renderer_user_data, actual_entries=actual_entries
        )
        md_content = render_living_report_md(
            progression, renderer_user_data, actual_entries=actual_entries
        )

        # ── 5. Persist to storage/reports/ (same dir as /generate-report) ─
        from datetime import datetime as _dt
        _ts = _dt.now().strftime("%Y%m%d_%H%M%S")
        _stem = f"living_report_{user_data.name.replace(' ', '_')}_{_ts}"

        html_out_path = REPORTS_OUTPUT_DIR / f"{_stem}.html"
        md_out_path = REPORTS_OUTPUT_DIR / f"{_stem}.md"

        html_out_path.write_text(html_content, encoding="utf-8")
        md_out_path.write_text(md_content, encoding="utf-8")

        # ── 6. Persist a database row so the report appears in Report History ─
        # The /api/data/reports endpoint queries the SQLite reports table
        # (db.get_reports), so file-only saves are invisible to the UI.
        _report_id = f"living-{_stem}"
        _ts_iso = _dt.now().isoformat()
        try:
            from database import Database as _DB2
            _db2 = _DB2()
            _db2.save_report(
                {
                    "id": _report_id,
                    "title": f"Living Report — {user_data.name} ({_ts})",
                    "date": _ts_iso,
                    "generated_at": _ts_iso,
                    "report_type": "living",
                    "html_path": str(html_out_path),
                    "md_path": str(md_out_path),
                    "html_content": html_content,
                },
                "default",
            )
        except Exception as _db_err:
            # Non-fatal: the files are already saved; log but don't block the response.
            print(f"[living-report] WARNING: DB row insert failed: {_db_err}")

        return {
            "success": True,
            "id": _report_id,
            "html_content": html_content,
            "md_content": md_content,
            "html_path": str(html_out_path),
            "md_path": str(md_out_path),
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 60)
        print("LIVING REPORT GENERATION ERROR - FULL TRACEBACK:")
        print("=" * 60)
        traceback.print_exc()
        print("=" * 60)
        raise HTTPException(
            status_code=500, detail=f"Living report generation failed: {str(e)}"
        )


class RMRRequest(BaseModel):
    """Request body for /rmr endpoint.

    calculate_rmr signature: (weight_kg, age, gender, height_cm, is_athlete)
    NOTE: weight must be in kg (not lbs).  Callers should convert.
    """
    weight_kg: float          # weight in kilograms
    age: int
    gender: str               # 'm' or 'f'
    height_cm: float
    is_athlete: bool = False


class TDEERequest(BaseModel):
    """Request body for /tdee endpoint.

    calculate_tdee signature:
      (weight_kg, age, gender, activity_level, height_cm, is_athlete,
       protein_cal, carb_cal, fat_cal, job_activity, leisure_activity, exercise_type)
    """
    weight_kg: float
    age: int
    gender: str
    activity_level: str       # 'sedentary'|'light'|'moderate'|'active'|'very active'
    height_cm: float
    is_athlete: bool = False
    protein_cal: float = 0.0
    carb_cal: float = 0.0
    fat_cal: float = 0.0
    job_activity: str = "moderate"
    leisure_activity: str = "moderate"
    exercise_type: str = "resistance"


@app.post("/rmr")
async def calculate_rmr_endpoint(request: RMRRequest):
    """Calculate Resting Metabolic Rate (POST — fixed signature 2026-06-08).

    Old GET /rmr/{weight}/{height}/{age}/{gender} had wrong arg count/order
    and was broken (BUG from CALC-VALIDATION-FINDINGS).  Replaced with POST.
    """
    try:
        rmr = calculate_rmr(
            request.weight_kg,
            request.age,
            request.gender,
            request.height_cm,
            request.is_athlete,
        )
        return {"rmr": rmr}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"RMR validation error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RMR calculation failed: {str(e)}")


@app.post("/tdee")
async def calculate_tdee_endpoint(request: TDEERequest):
    """Calculate Total Daily Energy Expenditure (POST — fixed signature 2026-06-08).

    Old GET /tdee/{rmr}/{activity_level} had wrong arg count and was broken
    (BUG from CALC-VALIDATION-FINDINGS).  Replaced with POST.
    """
    try:
        tdee = calculate_tdee(
            request.weight_kg,
            request.age,
            request.gender,
            request.activity_level,
            request.height_cm,
            request.is_athlete,
            request.protein_cal,
            request.carb_cal,
            request.fat_cal,
            request.job_activity,
            request.leisure_activity,
            request.exercise_type,
        )
        return {"tdee": tdee}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"TDEE validation error: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"TDEE calculation failed: {str(e)}"
        )


@app.post("/ai/insights")
async def generate_ai_insights(request: dict):
    """
    Generate AI-powered insights based on user data and progress.

    Request body can include optional ai_settings:
    {
        "user": {...},
        "entries": [...],
        "calculation": {...},
        "ai_settings": {
            "provider": "openrouter",  # optional
            "model": "google/gemini-flash-1.5-8b",  # optional
            "api_key": "..."  # optional
        }
    }
    """
    try:
        user_data = request.get("user", {})
        entries = request.get("entries", [])
        calculation = request.get("calculation", {})
        ai_settings_dict = request.get("ai_settings")

        # Parse AI settings if provided
        ai_settings = AISettings(**ai_settings_dict) if ai_settings_dict else None

        # Use AI analyzer for insights (with configurable provider)
        ai_analyzer = get_ai_analyzer(ai_settings)

        # Convert user data to PRIME format
        prime_data = convert_user_data_to_prime_format_for_ai(user_data)

        # Generate insights based on progress
        insights = []

        if entries and len(entries) >= 2:
            latest_entry = entries[0]
            previous_entry = entries[1]
            weight_change = latest_entry.get("weight", 0) - previous_entry.get(
                "weight", 0
            )

            if weight_change < -2:
                insights.append(
                    {
                        "type": "celebration",
                        "title": "Excellent Progress!",
                        "message": f"You've lost {abs(weight_change):.1f} lbs since your last entry. Your consistency is paying off!",
                        "priority": "high",
                        "category": "progress",
                    }
                )
            elif weight_change > 1:
                insights.append(
                    {
                        "type": "guidance",
                        "title": "Weight Fluctuation Detected",
                        "message": f"Weight increased by {weight_change:.1f} lbs. This could be normal - consider factors like hydration, sleep, and recent meals.",
                        "priority": "medium",
                        "category": "progress",
                    }
                )

        # Add calorie-based insights
        if calculation.get("progression"):
            current_week = calculation["progression"][0]
            deficit = current_week.get("tdee", 0) - current_week.get(
                "daily_calorie_intake", 0
            )

            if deficit > 1000:
                insights.append(
                    {
                        "type": "warning",
                        "title": "Large Calorie Deficit",
                        "message": f"Your deficit of {deficit:.0f} calories may be too aggressive. Consider a more moderate approach for sustainable results.",
                        "priority": "high",
                        "category": "nutrition",
                    }
                )
            elif deficit < 200:
                insights.append(
                    {
                        "type": "tip",
                        "title": "Conservative Approach",
                        "message": f"Your deficit of {deficit:.0f} calories will lead to gradual, sustainable progress. Consider increasing activity for faster results.",
                        "priority": "medium",
                        "category": "nutrition",
                    }
                )

        return {"insights": insights}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"AI insights generation failed: {str(e)}"
        )


@app.post("/ai/analyze-progress")
async def analyze_progress_ai(request: dict):
    """
    Analyze user progress with AI-powered feedback.

    Request body can include optional ai_settings:
    {
        "user": {...},
        "entries": [...],
        "calculation": {...},
        "ai_settings": {
            "provider": "openrouter",  # optional
            "model": "google/gemini-flash-1.5-8b",  # optional
            "api_key": "..."  # optional
        }
    }
    """
    try:
        user_data = request.get("user", {})
        entries = request.get("entries", [])
        calculation = request.get("calculation", {})
        ai_settings_dict = request.get("ai_settings")

        # Parse AI settings if provided
        ai_settings = AISettings(**ai_settings_dict) if ai_settings_dict else None

        # Use AI analyzer for detailed analysis (with configurable provider)
        ai_analyzer = get_ai_analyzer(ai_settings)
        prime_data = convert_user_data_to_prime_format_for_ai(user_data)

        # Calculate progress metrics
        progress_analysis = "Your progress is being tracked successfully."
        recommendations = [
            "Continue with your current plan",
            "Log entries consistently",
        ]
        warnings = []
        motivational_message = "Stay committed to your goals!"
        next_steps = ["Add your next entry", "Review your nutrition plan"]
        confidence_score = 75

        if entries:
            latest_entry = entries[0]
            start_weight = user_data.get("current_weight", 0)
            current_weight = latest_entry.get("weight", start_weight)
            goal_weight = user_data.get("goal_weight", 0)

            if start_weight > 0 and goal_weight > 0:
                total_loss_needed = start_weight - goal_weight
                progress_made = start_weight - current_weight
                progress_percentage = (
                    (progress_made / total_loss_needed) * 100
                    if total_loss_needed > 0
                    else 0
                )

                if progress_percentage >= 75:
                    progress_analysis = f"Excellent progress! You're {progress_percentage:.0f}% of the way to your goal."
                    motivational_message = (
                        "You're so close to your goal! Keep pushing forward!"
                    )
                    confidence_score = 90
                elif progress_percentage >= 50:
                    progress_analysis = f"Great progress! You're {progress_percentage:.0f}% of the way to your goal."
                    motivational_message = (
                        "You're past the halfway point! The finish line is in sight!"
                    )
                    confidence_score = 85
                elif progress_percentage >= 25:
                    progress_analysis = f"Good progress! You're {progress_percentage:.0f}% of the way to your goal."
                    motivational_message = (
                        "You're building momentum! Keep up the great work!"
                    )
                    confidence_score = 80
                else:
                    progress_analysis = f"You're {progress_percentage:.0f}% of the way to your goal. Every journey starts with a single step."
                    motivational_message = "You've started your journey! Stay consistent and trust the process!"
                    confidence_score = 75

        return {
            "progress_analysis": progress_analysis,
            "recommendations": recommendations,
            "warnings": warnings,
            "motivational_message": motivational_message,
            "next_steps": next_steps,
            "confidence_score": confidence_score,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Progress analysis failed: {str(e)}"
        )


@app.post("/ai/entry-feedback")
async def get_entry_feedback(request: dict):
    """Get AI feedback for new entries"""
    try:
        user_data = request.get("user", {})
        new_entry = request.get("newEntry", {})
        recent_entries = request.get("recentEntries", [])

        feedback = []

        if new_entry.get("weight") and recent_entries:
            last_entry = recent_entries[0]
            weight_change = new_entry["weight"] - last_entry.get("weight", 0)

            if weight_change < -3:
                feedback.append(
                    {
                        "type": "warning",
                        "title": "Rapid Weight Loss",
                        "message": f"You've lost {abs(weight_change):.1f} lbs. Make sure you're eating enough and staying healthy.",
                        "priority": "high",
                        "category": "health",
                    }
                )
            elif weight_change < -1:
                feedback.append(
                    {
                        "type": "celebration",
                        "title": "Great Progress!",
                        "message": f"You've lost {abs(weight_change):.1f} lbs! Keep up the excellent work!",
                        "priority": "medium",
                        "category": "progress",
                    }
                )
            elif weight_change > 2:
                feedback.append(
                    {
                        "type": "guidance",
                        "title": "Weight Increase",
                        "message": f"Weight increased by {weight_change:.1f} lbs. Consider reviewing your recent nutrition and hydration.",
                        "priority": "medium",
                        "category": "progress",
                    }
                )

        return feedback

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Entry feedback failed: {str(e)}")


def convert_user_data_to_prime_format_for_ai(user_data: dict) -> dict:
    """Convert user data for AI analysis"""
    return {
        "current_weight": user_data.get("current_weight", 0),
        "current_bf": user_data.get("current_bf", 0),
        "goal_weight": user_data.get("goal_weight", 0),
        "goal_bf": user_data.get("goal_bf", 0),
        "age": user_data.get("age", 0),
        "gender": user_data.get("gender", "m"),
        "activity_level": user_data.get("activity_level", 3),
        "height_cm": user_data.get("height_cm", 170),
    }


# Performance monitoring endpoints
@app.get("/performance/stats")
async def get_performance_stats():
    """Get API performance statistics (performance_optimizations disabled)"""
    return {
        "cache_stats": {"hits": 0, "misses": 0},  # optimizer disabled
        "api_version": "1.0.0",
        "optimizations_enabled": False,
    }


@app.post("/performance/clear-cache")
async def clear_performance_cache():
    """Clear the calculation cache (performance_optimizations disabled)"""
    # optimizer.cache.clear()  # DISABLED
    # optimizer.cache_stats = {"hits": 0, "misses": 0}  # DISABLED
    return {"success": True, "message": "Cache disabled in dev mode"}


# Initialize performance optimizations on startup (disabled for dev)
@app.on_event("startup")
async def startup_event():
    """Initialize performance optimizations on startup (currently disabled to avoid startup issues)"""
    print("[startup] Skipping initialize_performance_optimizations() in dev mode")


if __name__ == "__main__":
    # STANDARDIZED PORTS: Frontend 3713 | Backend/Python API 8313
    # reload=True (uvicorn's WatchFiles) spawns a reloader parent + worker child on
    # Windows. A killed parent can orphan a worker that keeps the port + DB handle
    # alive, producing TWO servers on :8313 racing over different bodyfat.db files
    # (the "data drift" PRIME saw). Default to a single production process; opt into
    # reload only for local dev via BODYFAT_DEV_RELOAD=1.
    dev_reload = os.environ.get("BODYFAT_DEV_RELOAD") == "1"
    uvicorn.run("main:app", host="127.0.0.1", port=8313, reload=dev_reload, log_level="info")
# Debug trigger: chart fix 1
