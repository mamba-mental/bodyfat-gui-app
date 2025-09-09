#!/usr/bin/env python3
"""
FastAPI wrapper for PRIME calculation engine
Provides REST API endpoints for the GUI application
"""

import sys
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uvicorn
import asyncio

# Import data endpoints
from data_endpoints import router as data_router

# Import performance optimizations
from performance_optimizations import (
    cached_calculation, 
    optimizer, 
    initialize_performance_optimizations,
    performance_monitor
)

# Add the PRIME code to Python path
current_dir = Path(__file__).parent
gui_app_dir = current_dir.parent
terminal_app_dir = gui_app_dir.parent
prime_code_dir = terminal_app_dir / "new_prime_python_code"
sys.path.insert(0, str(prime_code_dir))
sys.path.insert(0, str(terminal_app_dir))

try:
    from new_prime_python_code.PRIME_Calculations import predict_weight_loss
    from new_prime_python_code.PRIME_Utils import calculate_rmr, calculate_tdee
    from new_prime_python_code.PRIME_RMR_Calculations_v2 import get_rmr_and_tdee
    from new_prime_python_code.PRIME_Diet_Calculations_v2 import calculate_weekly_rate_of_fat_loss, calculate_weekly_muscle_gain
    from new_prime_python_code.PRIME_Report_Generator_v3 import generate_prime_report_terminal
    from new_prime_python_code.PRIME_Report_Generator_v3_Fast import generate_prime_report_terminal_fast
    from new_prime_python_code.PRIME_AI_Confidence_Analyzer import AIConfidenceAnalyzer
except ImportError as e:
    print(f"Error importing PRIME modules: {e}")
    print(f"Python path: {sys.path}")
    print(f"Prime code directory: {prime_code_dir}")
    print(f"Available files: {list(prime_code_dir.glob('*.py')) if prime_code_dir.exists() else 'Directory not found'}")
    # Temporarily disable exit to test database endpoints
    # sys.exit(1)

app = FastAPI(
    title="PRIME Body Fat Calculator API",
    description="REST API wrapper for the PRIME calculation engine",
    version="1.0.0"
)

# Add performance middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include data persistence endpoints
app.include_router(data_router)

# Enable CORS for the Next.js development server and all localhost ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:4000",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001", 
        "http://127.0.0.1:4000",
        "http://127.0.0.1:5000",
        "*"  # Allow all origins in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

class WeeklyProgression(BaseModel):
    date: str
    weight: float
    body_fat_percentage: float
    daily_calorie_intake: float
    tdee: float
    weekly_caloric_output: float
    total_weight_lost: float
    lean_mass: float
    fat_mass: float
    muscle_gain: float
    rmr: float
    tef: float
    neat: float

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

def parse_date_string(date_str: str) -> datetime:
    """Parse date string in various formats to datetime object"""
    # Try different date formats
    formats = [
        "%m/%d/%y",      # MM/DD/YY
        "%m/%d/%Y",      # MM/DD/YYYY
        "%m%d%y",        # MMDDYY
        "%m%d%Y",        # MMDDYYYY
        "%d/%m/%Y",      # DD/MM/YYYY
        "%Y-%m-%d",      # ISO format
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
        5: "very active"
    }
    return activity_map.get(level, "moderate")

def get_activity_level_description(level: int) -> str:
    """Convert activity level integer to description for report"""
    activity_descriptions = {
        1: "Sedentary (little or no exercise)",
        2: "Lightly Active (exercise 1-3 days/week)",
        3: "Moderately Active (exercise 3-5 days/week)",
        4: "Very Active (exercise 6-7 days/week)",
        5: "Extremely Active (physical job or training twice per day)"
    }
    return activity_descriptions.get(level, "Moderately Active")

def convert_user_data_to_prime_format(user_data: UserData) -> Dict[str, Any]:
    """Convert GUI UserData to PRIME calculation format"""
    return {
        'name': user_data.name,
        'current_weight': user_data.current_weight,
        'current_bf': user_data.current_bf,
        'goal_weight': user_data.goal_weight,
        'goal_bf': user_data.goal_bf,
        'start_date': user_data.start_date,
        'end_date': user_data.end_date,
        'dob': user_data.dob,
        'age': user_data.age,
        'gender': 'Male' if user_data.gender == 'm' else 'Female',  # Capitalize for report
        'height_feet': user_data.height_feet,
        'height_inches': user_data.height_inches,
        'height_cm': user_data.height_cm,
        'protein_intake': user_data.protein_intake,
        'activity_level': user_data.activity_level,
        'activity_factor': user_data.activity_level,  # Add missing field
        'activity_level_description': get_activity_level_description(user_data.activity_level),  # Add description
        'resistance_training': user_data.resistance_training,  # Keep as boolean
        'is_athlete': user_data.is_athlete,  # Keep as boolean
        'workout_type': user_data.workout_type,
        'workout_days': user_data.workout_days,
        'job_activity': user_data.job_activity,
        'leisure_activity': user_data.leisure_activity,
        'experience_level': user_data.experience_level,
        'volume_score': user_data.volume_score,
        'intensity_score': user_data.intensity_score,
        'frequency_score': user_data.frequency_score,
        'is_bodybuilder': user_data.is_bodybuilder,
        'ped_use': user_data.ped_use,
        'diet_type': user_data.diet_type,
        'exercise_type': user_data.exercise_type,
        'sleep_quality': user_data.sleep_quality
    }

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "PRIME Body Fat Calculator API", "status": "running"}

@app.post("/calculate", response_model=CalculationResult)
@cached_calculation
@performance_monitor
async def calculate_progression(user_data: UserData):
    """Calculate weight loss progression using PRIME engine"""
    try:
        # Convert to PRIME format
        prime_data = convert_user_data_to_prime_format(user_data)
        
        # Run PRIME calculations with individual parameters
        progression = predict_weight_loss(
            current_weight=user_data.current_weight,
            current_bf=user_data.current_bf,
            goal_weight=user_data.goal_weight,
            goal_bf=user_data.goal_bf,
            start_date=parse_date_string(user_data.start_date),
            end_date=parse_date_string(user_data.end_date),
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
            sleep_quality=user_data.sleep_quality
        )
        
        # Convert progression to API format
        api_progression = []
        for week_data in progression:
            api_progression.append(WeeklyProgression(
                date=week_data.get('date', ''),
                weight=week_data.get('weight', 0.0),
                body_fat_percentage=week_data.get('body_fat_percentage', 0.0),
                daily_calorie_intake=week_data.get('daily_calorie_intake', 0.0),
                tdee=week_data.get('tdee', 0.0),
                weekly_caloric_output=week_data.get('weekly_caloric_output', 0.0),
                total_weight_lost=week_data.get('total_weight_lost', 0.0),
                lean_mass=week_data.get('lean_mass', 0.0),
                fat_mass=week_data.get('fat_mass', 0.0),
                muscle_gain=week_data.get('muscle_gain', 0.0),
                rmr=week_data.get('rmr', 0.0),
                tef=week_data.get('tef', 0.0),
                neat=week_data.get('neat', 0.0)
            ))
        
        # Calculate summary statistics
        summary = {
            "total_weight_loss": user_data.current_weight - user_data.goal_weight,
            "body_fat_reduction": user_data.current_bf - user_data.goal_bf,
            "muscle_gain": sum(week.muscle_gain for week in api_progression),
            "timeline_weeks": len(api_progression)
        }
        
        # Get AI confidence analysis
        confidence_score = None
        ai_analysis = None
        try:
            ai_analyzer = AIConfidenceAnalyzer()
            confidence_result = ai_analyzer.analyze_confidence(prime_data, progression)
            confidence_score = confidence_result.get('confidence_score')
            ai_analysis = confidence_result.get('analysis', '')
        except Exception as ai_error:
            print(f"AI analysis failed: {ai_error}")
            # Continue without AI analysis
        
        return CalculationResult(
            user_data=user_data,
            progression=api_progression,
            summary=summary,
            confidence_score=confidence_score,
            ai_analysis=ai_analysis
        )
        
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
@performance_monitor
async def generate_report(user_data: UserData):
    """Generate HTML/PDF report using PRIME report generator"""
    try:
        # Convert to PRIME format
        prime_data = convert_user_data_to_prime_format(user_data)
        
        # Use today as the new start date for updated calculations
        today = datetime.now()
        
        # Calculate remaining time from today to end date
        end_date = parse_date_string(user_data.end_date)
        time_remaining = end_date - today
        weeks_remaining = max(1, int(time_remaining.days / 7))
        
        # Adjust end date if needed to ensure reasonable timeline
        if weeks_remaining < 4:
            # If less than 4 weeks remaining, extend by original timeline
            original_weeks = int(user_data.timeline_weeks) if user_data.timeline_weeks else 16
            end_date = today + timedelta(weeks=original_weeks)
        
        # Calculate progression with updated dates
        progression = predict_weight_loss(
            current_weight=user_data.current_weight,
            current_bf=user_data.current_bf,
            goal_weight=user_data.goal_weight,
            goal_bf=user_data.goal_bf,
            start_date=today,  # Use today as start date for recalculation
            end_date=end_date,
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
            sleep_quality=user_data.sleep_quality
        )
        
        # Generate report using fast version (no AI analysis)
        # This skips the 20+ second AI API call for instant report generation
        markdown_path, pdf_path = generate_prime_report_terminal_fast(prime_data, progression)
        
        # Read the generated HTML content
        html_path = markdown_path.replace('.md', '.html')
        html_content = ""
        if os.path.exists(html_path):
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
        
        return {
            "success": True,
            "markdown_path": markdown_path,
            "pdf_path": pdf_path,
            "html_content": html_content
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.get("/rmr/{weight}/{height}/{age}/{gender}")
async def calculate_rmr_endpoint(weight: float, height: float, age: int, gender: str):
    """Calculate Resting Metabolic Rate"""
    try:
        rmr = calculate_rmr(weight, height, age, gender)
        return {"rmr": rmr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RMR calculation failed: {str(e)}")

@app.get("/tdee/{rmr}/{activity_level}")
async def calculate_tdee_endpoint(rmr: float, activity_level: int):
    """Calculate Total Daily Energy Expenditure"""
    try:
        tdee = calculate_tdee(rmr, activity_level)
        return {"tdee": tdee}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TDEE calculation failed: {str(e)}")

@app.post("/ai/insights")
async def generate_ai_insights(request: dict):
    """Generate AI-powered insights based on user data and progress"""
    try:
        user_data = request.get('user', {})
        entries = request.get('entries', [])
        calculation = request.get('calculation', {})
        
        # Use AI analyzer for insights
        ai_analyzer = AIConfidenceAnalyzer()
        
        # Convert user data to PRIME format
        prime_data = convert_user_data_to_prime_format_for_ai(user_data)
        
        # Generate insights based on progress
        insights = []
        
        if entries and len(entries) >= 2:
            latest_entry = entries[0]
            previous_entry = entries[1]
            weight_change = latest_entry.get('weight', 0) - previous_entry.get('weight', 0)
            
            if weight_change < -2:
                insights.append({
                    "type": "celebration",
                    "title": "Excellent Progress!",
                    "message": f"You've lost {abs(weight_change):.1f} lbs since your last entry. Your consistency is paying off!",
                    "priority": "high",
                    "category": "progress"
                })
            elif weight_change > 1:
                insights.append({
                    "type": "guidance", 
                    "title": "Weight Fluctuation Detected",
                    "message": f"Weight increased by {weight_change:.1f} lbs. This could be normal - consider factors like hydration, sleep, and recent meals.",
                    "priority": "medium",
                    "category": "progress"
                })
        
        # Add calorie-based insights
        if calculation.get('progression'):
            current_week = calculation['progression'][0]
            deficit = current_week.get('tdee', 0) - current_week.get('daily_calorie_intake', 0)
            
            if deficit > 1000:
                insights.append({
                    "type": "warning",
                    "title": "Large Calorie Deficit",
                    "message": f"Your deficit of {deficit:.0f} calories may be too aggressive. Consider a more moderate approach for sustainable results.",
                    "priority": "high",
                    "category": "nutrition"
                })
            elif deficit < 200:
                insights.append({
                    "type": "tip",
                    "title": "Conservative Approach",
                    "message": f"Your deficit of {deficit:.0f} calories will lead to gradual, sustainable progress. Consider increasing activity for faster results.",
                    "priority": "medium", 
                    "category": "nutrition"
                })
        
        return {"insights": insights}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI insights generation failed: {str(e)}")

@app.post("/ai/analyze-progress")
async def analyze_progress_ai(request: dict):
    """Analyze user progress with AI-powered feedback"""
    try:
        user_data = request.get('user', {})
        entries = request.get('entries', [])
        calculation = request.get('calculation', {})
        
        # Use AI analyzer for detailed analysis
        ai_analyzer = AIConfidenceAnalyzer()
        prime_data = convert_user_data_to_prime_format_for_ai(user_data)
        
        # Calculate progress metrics
        progress_analysis = "Your progress is being tracked successfully."
        recommendations = ["Continue with your current plan", "Log entries consistently"]
        warnings = []
        motivational_message = "Stay committed to your goals!"
        next_steps = ["Add your next entry", "Review your nutrition plan"]
        confidence_score = 75
        
        if entries:
            latest_entry = entries[0]
            start_weight = user_data.get('current_weight', 0)
            current_weight = latest_entry.get('weight', start_weight)
            goal_weight = user_data.get('goal_weight', 0)
            
            if start_weight > 0 and goal_weight > 0:
                total_loss_needed = start_weight - goal_weight
                progress_made = start_weight - current_weight
                progress_percentage = (progress_made / total_loss_needed) * 100 if total_loss_needed > 0 else 0
                
                if progress_percentage >= 75:
                    progress_analysis = f"Excellent progress! You're {progress_percentage:.0f}% of the way to your goal."
                    motivational_message = "You're so close to your goal! Keep pushing forward!"
                    confidence_score = 90
                elif progress_percentage >= 50:
                    progress_analysis = f"Great progress! You're {progress_percentage:.0f}% of the way to your goal."
                    motivational_message = "You're past the halfway point! The finish line is in sight!"
                    confidence_score = 85
                elif progress_percentage >= 25:
                    progress_analysis = f"Good progress! You're {progress_percentage:.0f}% of the way to your goal."
                    motivational_message = "You're building momentum! Keep up the great work!"
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
            "confidence_score": confidence_score
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Progress analysis failed: {str(e)}")

@app.post("/ai/entry-feedback")
async def get_entry_feedback(request: dict):
    """Get AI feedback for new entries"""
    try:
        user_data = request.get('user', {})
        new_entry = request.get('newEntry', {})
        recent_entries = request.get('recentEntries', [])
        
        feedback = []
        
        if new_entry.get('weight') and recent_entries:
            last_entry = recent_entries[0]
            weight_change = new_entry['weight'] - last_entry.get('weight', 0)
            
            if weight_change < -3:
                feedback.append({
                    "type": "warning",
                    "title": "Rapid Weight Loss",
                    "message": f"You've lost {abs(weight_change):.1f} lbs. Make sure you're eating enough and staying healthy.",
                    "priority": "high",
                    "category": "health"
                })
            elif weight_change < -1:
                feedback.append({
                    "type": "celebration",
                    "title": "Great Progress!",
                    "message": f"You've lost {abs(weight_change):.1f} lbs! Keep up the excellent work!",
                    "priority": "medium",
                    "category": "progress"
                })
            elif weight_change > 2:
                feedback.append({
                    "type": "guidance",
                    "title": "Weight Increase",
                    "message": f"Weight increased by {weight_change:.1f} lbs. Consider reviewing your recent nutrition and hydration.",
                    "priority": "medium",
                    "category": "progress"
                })
        
        return feedback
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Entry feedback failed: {str(e)}")

def convert_user_data_to_prime_format_for_ai(user_data: dict) -> dict:
    """Convert user data for AI analysis"""
    return {
        'current_weight': user_data.get('current_weight', 0),
        'current_bf': user_data.get('current_bf', 0),
        'goal_weight': user_data.get('goal_weight', 0),
        'goal_bf': user_data.get('goal_bf', 0),
        'age': user_data.get('age', 0),
        'gender': user_data.get('gender', 'm'),
        'activity_level': user_data.get('activity_level', 3),
        'height_cm': user_data.get('height_cm', 170)
    }

# Performance monitoring endpoints
@app.get("/performance/stats")
async def get_performance_stats():
    """Get API performance statistics"""
    return {
        "cache_stats": optimizer.get_cache_stats(),
        "api_version": "1.0.0",
        "optimizations_enabled": True
    }

@app.post("/performance/clear-cache")
async def clear_performance_cache():
    """Clear the calculation cache"""
    optimizer.cache.clear()
    optimizer.cache_stats = {"hits": 0, "misses": 0}
    return {"success": True, "message": "Cache cleared"}

# Initialize performance optimizations on startup
@app.on_event("startup")
async def startup_event():
    """Initialize performance optimizations on startup"""
    try:
        initialize_performance_optimizations()
        print("Performance optimizations initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize all performance optimizations: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )