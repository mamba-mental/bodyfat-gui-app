"""
Data persistence endpoints for the PRIME API
Handles user data, entries, reports, and settings storage
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import os
from pathlib import Path

# Import database module
from database import Database

router = APIRouter()

# Initialize database
db = Database()

# Data storage directory for legacy JSON files
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# File paths for settings (still using JSON for settings)
SETTINGS_FILE = DATA_DIR / "settings.json"

class UserProfile(BaseModel):
    name: str
    age: int
    gender: str
    height_feet: int
    height_inches: int
    current_weight: float
    current_bf: float
    goal_weight: float
    goal_bf: float
    activity_level: int
    resistance_training: bool
    is_athlete: bool
    workout_type: str
    workout_days: int
    job_activity: int
    leisure_activity: int
    experience_level: str
    volume_score: float
    intensity_score: float
    frequency_score: float
    is_bodybuilder: bool
    protein_intake: float
    diet_type: str
    ped_use: bool
    exercise_type: str
    sleep_quality: str

class Entry(BaseModel):
    id: str
    date: str
    weight: float
    body_fat_percentage: Optional[float] = None
    notes: Optional[str] = None
    timestamp: Optional[str] = None

class Report(BaseModel):
    id: str
    title: str
    date: str
    summary: Dict[str, Any]
    filepath: Optional[str] = None

def load_json_file(filepath: Path, default: Any = None):
    """Load JSON data from file"""
    if filepath.exists():
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            pass
    return default or {}

def save_json_file(filepath: Path, data: Any):
    """Save JSON data to file"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "data-api"}

@router.get("/api/data/user")
async def get_user_data():
    """Get user profile data"""
    user_data = db.get_user("default")
    if not user_data:
        # Return default user data
        return {
            "name": "User",
            "age": 30,
            "gender": "m",
            "height_feet": 5,
            "height_inches": 10,
            "current_weight": 180,
            "current_bf": 20,
            "goal_weight": 160,
            "goal_bf": 12,
            "activity_level": 3,
            "resistance_training": True,
            "is_athlete": False,
            "workout_type": "General Fitness",
            "workout_days": 3,
            "job_activity": 2,
            "leisure_activity": 2,
            "experience_level": "Intermediate",
            "volume_score": 3,
            "intensity_score": 3,
            "frequency_score": 3,
            "is_bodybuilder": False,
            "protein_intake": 150,
            "diet_type": "balanced",
            "ped_use": False,
            "exercise_type": "resistance",
            "sleep_quality": "good"
        }
    return user_data

@router.post("/api/data/user")
async def save_user_data(user: UserProfile):
    """Save user profile data"""
    user_dict = user.dict()
    # Calculate height_cm if not provided
    if 'height_cm' not in user_dict:
        user_dict['height_cm'] = (user.height_feet * 12 + user.height_inches) * 2.54
    db.save_user(user_dict, "default")
    return {"success": True, "message": "User data saved"}

@router.get("/api/data/entries")
async def get_entries():
    """Get all body fat entries"""
    entries = db.get_entries("default")
    return entries

@router.post("/api/data/entries")
async def save_entry(entry: Entry):
    """Save a new body fat entry"""
    # Convert to dict
    entry_dict = entry.dict()
    
    # Add timestamp if not provided
    if not entry_dict.get('timestamp'):
        entry_dict['created_at'] = datetime.now().isoformat()
        entry_dict['updated_at'] = datetime.now().isoformat()
    
    db.save_entry(entry_dict, "default")
    return {"success": True, "message": "Entry saved", "entry": entry_dict}

@router.delete("/api/data/entries/{entry_id}")
async def delete_entry(entry_id: str):
    """Delete a body fat entry"""
    db.delete_entry(entry_id)
    return {"success": True, "message": "Entry deleted"}

@router.get("/api/data/reports")
async def get_reports():
    """Get all generated reports"""
    reports = db.get_reports("default")
    return reports

@router.post("/api/data/report")
async def save_report(report: Report):
    """Save a generated report"""
    # Convert to dict
    report_dict = report.dict()
    
    db.save_report(report_dict, "default")
    return {"success": True, "message": "Report saved", "report": report_dict}

@router.get("/api/data/reports/{report_id}")
async def get_report(report_id: str):
    """Get a specific report by ID"""
    report = db.get_report(report_id, "default")
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.post("/api/data/calculation")
async def get_last_calculation():
    """Get the last calculation result"""
    calculation = db.get_latest_calculation("default")
    if calculation:
        return calculation
    
    # Return a placeholder if no calculation exists
    return {
        "progression": [],
        "summary": {
            "total_weight_loss": 0,
            "body_fat_reduction": 0,
            "muscle_gain": 0,
            "timeline_weeks": 0
        }
    }

@router.get("/api/data/route")
async def get_route_data(key: str):
    """Get data by key (for theme settings etc)"""
    settings = load_json_file(SETTINGS_FILE, {})
    if key in settings:
        return {key: settings[key]}
    raise HTTPException(status_code=404, detail=f"Key '{key}' not found")

@router.post("/api/data/route")
async def save_route_data(data: Dict[str, Any]):
    """Save data by key (for theme settings etc)"""
    settings = load_json_file(SETTINGS_FILE, {})
    settings.update(data)
    save_json_file(SETTINGS_FILE, settings)
    return {"success": True, "message": "Settings saved"}