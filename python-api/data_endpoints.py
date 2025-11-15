"""
Data persistence endpoints for the PRIME API
Handles user data, entries, reports, and settings storage
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pydantic import ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Set

# Import database module
from database import Database

router = APIRouter()

# Initialize database
db = Database()

# Data storage directory for legacy JSON files
APP_ROOT = Path(__file__).parent.parent
DATA_DIR = APP_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

REPORTS_DIR = APP_ROOT / "storage" / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# File paths for settings (still using JSON for settings)
SETTINGS_FILE = DATA_DIR / "settings.json"

class UserProfile(BaseModel):
    """User profile payload stored in the Python service."""

    model_config = ConfigDict(extra="allow")

    name: str
    age: Optional[int] = None
    gender: str
    height_feet: int
    height_inches: int
    height_cm: Optional[float] = None
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
    timeline_weeks: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    dob: Optional[str] = None

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
    summary: Optional[Dict[str, Any]] = None
    filepath: Optional[str] = None
    html_content: Optional[str] = None
    calculation_result: Optional[Dict[str, Any]] = None
    pdf_path: Optional[str] = None
    markdown_path: Optional[str] = None
    html_path: Optional[str] = None
    file_base: Optional[str] = None

    class Config:
        extra = "allow"

def _parse_report_timestamp(stem: str) -> Optional[datetime]:
    parts = stem.split('_')
    if len(parts) >= 2 and parts[-1].isdigit() and len(parts[-1]) == 6 and parts[-2].isdigit() and len(parts[-2]) == 8:
        try:
            return datetime.strptime(parts[-2] + parts[-1], "%Y%m%d%H%M%S")
        except ValueError:
            return None
    return None

def _relative_path(path: Path) -> str:
    try:
        return str(path.relative_to(APP_ROOT))
    except ValueError:
        return str(path)

def ingest_legacy_reports():
    """Import existing report files into the database so they appear in the app"""
    if not REPORTS_DIR.exists():
        return

    try:
        existing_reports = {report['id'] for report in db.get_reports("default")}  # type: ignore
    except Exception:
        existing_reports = set()

    new_reports = 0
    for html_file in REPORTS_DIR.glob("*.html"):
        report_id = html_file.stem
        if report_id in existing_reports:
            continue

        try:
            html_content = html_file.read_text(encoding='utf-8')
        except Exception:
            continue

        pdf_file = REPORTS_DIR / f"{report_id}.pdf"
        markdown_file = REPORTS_DIR / f"{report_id}.md"

        timestamp = _parse_report_timestamp(report_id)
        date_iso = (timestamp or datetime.now()).isoformat()

        identifier_parts = report_id.split('_')
        user_identifier = " ".join(identifier_parts[:-2]).strip() if len(identifier_parts) > 2 else report_id.replace('_', ' ')
        title_date = timestamp.strftime("%Y-%m-%d %H:%M") if timestamp else "Legacy Report"
        title = f"Progress Report - {user_identifier or 'User'} ({title_date})"

        report_payload = {
            "id": report_id,
            "title": title,
            "date": date_iso,
            "generated_at": date_iso,
            "html_content": html_content,
            "calculation_result": {},
            "file_path": _relative_path(pdf_file) if pdf_file.exists() else None,
            "pdf_path": _relative_path(pdf_file) if pdf_file.exists() else None,
            "markdown_path": _relative_path(markdown_file) if markdown_file.exists() else None,
            "html_path": _relative_path(html_file),
            "file_base": report_id,
            "summary": {}
        }

        try:
            db.save_report(report_payload, "default")
            new_reports += 1
        except Exception:
            continue

    if new_reports:
        print(f"Ingested {new_reports} legacy reports from {REPORTS_DIR}")

ingest_legacy_reports()

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
    if not user_dict.get('height_cm'):
        user_dict['height_cm'] = (user.height_feet * 12 + user.height_inches) * 2.54
    # Normalize timeline calculations if provided
    if user_dict.get('start_date') and user_dict.get('timeline_weeks') and not user_dict.get('end_date'):
        start_date = datetime.fromisoformat(user_dict['start_date'])
        delta = int(user_dict['timeline_weeks']) * 7
        user_dict['end_date'] = (start_date + timedelta(days=delta)).date().isoformat()
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

@router.get("/api/data/calculation")
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
            "timeline_weeks": 0,
        },
    }


@router.post("/api/data/calculation")
async def save_calculation(calculation: Dict[str, Any]):
    """Persist a calculation result"""
    try:
        db.save_calculation(calculation, "default")
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to save calculation") from exc

    return calculation

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
