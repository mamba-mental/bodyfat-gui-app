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
    eating_pattern: Optional[str] = "standard"
    eating_window_hours: Optional[float] = 12.0
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
    program_id: Optional[str] = None
    # cycle_id must be a model field or Pydantic drops it on POST, which made
    # save_entry fall back to the active cycle and silently re-tag every entry
    # (ReComp Cycle data-drift bug). Explicit cycle_id now survives the round-trip.
    cycle_id: Optional[str] = None
    # BUG-FIX (photos never persisted): photo was absent from the Pydantic model so
    # Pydantic stripped it from every POST body before it reached save_entry.
    photo: Optional[str] = None


class Report(BaseModel):
    id: str
    title: str
    # date is optional — frontend sometimes sends `generated_at` instead.
    # save_report() endpoint normalises both to a single `date` field.
    date: Optional[str] = None
    generated_at: Optional[str] = None
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
    parts = stem.split("_")
    if (
        len(parts) >= 2
        and parts[-1].isdigit()
        and len(parts[-1]) == 6
        and parts[-2].isdigit()
        and len(parts[-2]) == 8
    ):
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
        stored_reports = db.get_reports("default")
        existing_reports = {report["id"] for report in stored_reports}  # type: ignore
        # Modern generators persist a canonical row whose id differs from the
        # artifact filename. A later service restart must not ingest that same
        # HTML file again as a second "legacy" report row.
        existing_artifacts = set()
        for report in stored_reports:
            file_base = report.get("file_base")
            html_path = report.get("html_path")
            if file_base:
                existing_artifacts.add(str(file_base))
            if html_path:
                existing_artifacts.add(Path(str(html_path)).stem)
    except Exception:
        existing_reports = set()
        existing_artifacts = set()

    new_reports = 0
    for html_file in REPORTS_DIR.glob("*.html"):
        report_id = html_file.stem
        if report_id in existing_reports or report_id in existing_artifacts:
            continue

        try:
            html_content = html_file.read_text(encoding="utf-8")
        except Exception:
            continue

        pdf_file = REPORTS_DIR / f"{report_id}.pdf"
        markdown_file = REPORTS_DIR / f"{report_id}.md"

        timestamp = _parse_report_timestamp(report_id)
        date_iso = (timestamp or datetime.now()).isoformat()

        identifier_parts = report_id.split("_")
        user_identifier = (
            " ".join(identifier_parts[:-2]).strip()
            if len(identifier_parts) > 2
            else report_id.replace("_", " ")
        )
        title_date = (
            timestamp.strftime("%Y-%m-%d %H:%M") if timestamp else "Legacy Report"
        )
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
            "markdown_path": _relative_path(markdown_file)
            if markdown_file.exists()
            else None,
            "html_path": _relative_path(html_file),
            "file_base": report_id,
            "summary": {},
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
            with open(filepath, "r") as f:
                return json.load(f)
        except:
            pass
    return default or {}


def save_json_file(filepath: Path, data: Any):
    """Save JSON data to file"""
    with open(filepath, "w") as f:
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
            "eating_pattern": "standard",
            "eating_window_hours": 12.0,
            "ped_use": False,
            "exercise_type": "resistance",
            "sleep_quality": "good",
        }

    if "eating_pattern" not in user_data:
        user_data["eating_pattern"] = "standard"
    if "eating_window_hours" not in user_data:
        pattern = user_data["eating_pattern"]
        if pattern == "intermittent_fasting" or pattern == "16_8":
            user_data["eating_window_hours"] = 8.0
        elif pattern == "omad":
            user_data["eating_window_hours"] = 1.0
        else:
            user_data["eating_window_hours"] = 12.0
    return user_data


@router.post("/api/data/user")
async def save_user_data(user: UserProfile):
    """Save user profile data"""
    user_dict = user.dict()
    # Calculate height_cm if not provided
    if not user_dict.get("height_cm"):
        user_dict["height_cm"] = (user.height_feet * 12 + user.height_inches) * 2.54
    # Normalize timeline calculations if provided
    if (
        user_dict.get("start_date")
        and user_dict.get("timeline_weeks")
        and not user_dict.get("end_date")
    ):
        start_date = datetime.fromisoformat(user_dict["start_date"])
        delta = int(user_dict["timeline_weeks"]) * 7
        user_dict["end_date"] = (start_date + timedelta(days=delta)).date().isoformat()

    if not user_dict.get("eating_pattern"):
        user_dict["eating_pattern"] = "standard"
    if not user_dict.get("eating_window_hours"):
        pattern = user_dict["eating_pattern"]
        if pattern == "intermittent_fasting" or pattern == "16_8":
            user_dict["eating_window_hours"] = 8.0
        elif pattern == "omad":
            user_dict["eating_window_hours"] = 1.0
        else:
            user_dict["eating_window_hours"] = 12.0

    db.save_user(user_dict, "default")
    return {"success": True, "message": "User data saved"}


@router.get("/api/data/entries")
async def get_entries(cycle_id: Optional[str] = None):
    """Get body fat entries.

    cycle_id (optional query param): when supplied, returns only entries
    belonging to that cycle — used by the report generator to scope
    actual weigh-ins to the current/selected cycle. Omit for all entries.
    """
    entries = db.get_entries("default", cycle_id=cycle_id)  # Unified user_id (post 2026-05-04 data unification)
    return entries


@router.post("/api/data/entries")
async def save_entry(entry: Entry):
    """Save a new body fat entry"""
    # Convert to dict — includes photo (now in the Pydantic model)
    entry_dict = entry.dict()

    # Add timestamp if not provided
    if not entry_dict.get("timestamp"):
        entry_dict["created_at"] = datetime.now().isoformat()
        entry_dict["updated_at"] = datetime.now().isoformat()

    # save_entry returns the RESOLVED row (with the server-assigned cycle_id),
    # so the response carries the canonical cycle_id back to the client. Returning
    # the pre-save entry_dict here was the F2 bug: cycle_id came back null.
    saved = db.save_entry(entry_dict, "default")  # Unified user_id (post 2026-05-04 data unification)
    return {"success": True, "message": "Entry saved", "entry": saved}


@router.delete("/api/data/entries/{entry_id}")
async def delete_entry(entry_id: str):
    """Delete a body fat entry"""
    db.delete_entry(entry_id)
    return {"success": True, "message": "Entry deleted"}


@router.get("/api/data/cycles")
async def get_cycles():
    """Get all ReComp cycles for the user (newest first)."""
    return db.get_cycles("default")


@router.post("/api/data/cycles")
async def save_cycle(cycle: dict):
    """Create/update a ReComp cycle (demotes any other active cycle)."""
    db.save_cycle(cycle, "default")
    return {"success": True, "cycle": cycle}


@router.get("/api/data/reports")
async def get_reports():
    """Get all generated reports — list view, heavy fields stripped.

    Strips html_content + nested chart_images so the list response stays small
    (was 22MB for 58 reports, now ~50-100KB). Detail view at
    /api/data/reports/{id} returns the full report.
    """
    reports = db.get_reports("default")
    HEAVY_FIELDS = (
        "html_content",
        "chart_images",
        "chart_image_data",
        "calculation_result",  # one bad row had 13MB nested user_data; not needed for list view
    )
    light = []
    for r in reports:
        if isinstance(r, dict):
            light.append({k: v for k, v in r.items() if k not in HEAVY_FIELDS})
        else:
            light.append(r)
    return light


@router.post("/api/data/report")
async def save_report(report: Report):
    """Save a generated report.

    Accepts either `date` or `generated_at` from the client (frontend has
    historically sent both depending on iteration). Normalises so SQLite
    always has a populated `date` column.
    """
    report_dict = report.dict()

    # Normalise: prefer explicit `date`, fall back to `generated_at`, finally now.
    if not report_dict.get("date"):
        report_dict["date"] = report_dict.get("generated_at") or datetime.now().isoformat()

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
        raise HTTPException(
            status_code=500, detail="Failed to save calculation"
        ) from exc

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


# ==================== PROGRAM ARCHIVING ENDPOINTS ====================

class ProgramSummary(BaseModel):
    """Summary statistics for an archived program"""
    total_weight_change: float
    total_bf_change: float
    duration_days: int
    average_weekly_loss: float
    entries_count: int
    best_entry: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class ArchivedProgram(BaseModel):
    """Archived program data"""
    id: str
    name: str
    status: str = "archived"
    created_at: str
    archived_at: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    initial_weight: float
    initial_bf: float
    final_weight: Optional[float] = None
    final_bf: Optional[float] = None
    entry_count: int = 0
    summary: Optional[ProgramSummary] = None


class ArchiveProgramRequest(BaseModel):
    """Request to archive current program"""
    name: Optional[str] = None
    notes: Optional[str] = None


@router.get("/api/programs")
async def get_programs():
    """Get all programs (active + archived)"""
    user_data = db.get_user("default")
    if not user_data:
        return {"active": None, "archived": []}

    archived = user_data.get("archived_programs", [])

    # Build active program info from current user data
    active = None
    if user_data.get("start_date"):
        active = {
            "id": user_data.get("current_program_id", f"program-{user_data.get('start_date', 'unknown')}"),
            "name": "Current Program",
            "status": "active",
            "start_date": user_data.get("start_date"),
            "initial_weight": user_data.get("program_reference", {}).get("initial_weight", user_data.get("current_weight")),
            "initial_bf": user_data.get("program_reference", {}).get("initial_bf", user_data.get("current_bf")),
        }

    return {"active": active, "archived": archived}


@router.post("/api/programs/archive")
async def archive_program(request: ArchiveProgramRequest):
    """Archive current program and start a new one"""
    user_data = db.get_user("default")
    if not user_data:
        raise HTTPException(status_code=404, detail="No user profile found")

    # Get current program entries
    entries = db.get_entries("1")
    current_program_id = user_data.get("current_program_id")

    # Filter entries for current program (include legacy entries with no program_id)
    if current_program_id:
        program_entries = [e for e in entries if e.get("program_id") == current_program_id or e.get("program_id") is None]
    else:
        program_entries = entries

    if not program_entries:
        raise HTTPException(status_code=400, detail="No entries to archive")

    # Calculate summary
    program_ref = user_data.get("program_reference", {})
    initial_weight = program_ref.get("initial_weight", user_data.get("current_weight", 0))
    initial_bf = program_ref.get("initial_bf", user_data.get("current_bf", 0))
    start_date = user_data.get("start_date", program_entries[-1].get("date") if program_entries else datetime.now().isoformat())

    # Get latest entry for final stats
    latest_entry = program_entries[0] if program_entries else None
    final_weight = latest_entry.get("weight", initial_weight) if latest_entry else initial_weight
    final_bf = latest_entry.get("body_fat_percentage", initial_bf) if latest_entry else initial_bf
    end_date = latest_entry.get("date", datetime.now().isoformat()) if latest_entry else datetime.now().isoformat()

    # Calculate duration
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00') if start_date else datetime.now().isoformat())
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00') if end_date else datetime.now().isoformat())
        duration_days = (end_dt - start_dt).days
    except:
        duration_days = 0

    # Find best entry (lowest body fat)
    best_entry = None
    if program_entries:
        valid_entries = [e for e in program_entries if e.get("body_fat_percentage")]
        if valid_entries:
            best = min(valid_entries, key=lambda x: x.get("body_fat_percentage", 100))
            best_entry = {
                "date": best.get("date"),
                "weight": best.get("weight"),
                "bf": best.get("body_fat_percentage")
            }

    # Calculate average weekly loss
    weeks = max(duration_days / 7, 1)
    weight_change = final_weight - initial_weight
    avg_weekly = weight_change / weeks

    # Create archived program
    now = datetime.now().isoformat()
    archived_program = {
        "id": current_program_id or f"program-{int(datetime.now().timestamp() * 1000)}",
        "name": request.name or f"Program {start_date[:10]}",
        "status": "archived",
        "created_at": start_date,
        "archived_at": now,
        "start_date": start_date,
        "end_date": end_date,
        "initial_weight": initial_weight,
        "initial_bf": initial_bf,
        "final_weight": final_weight,
        "final_bf": final_bf,
        "entry_count": len(program_entries),
        "summary": {
            "total_weight_change": weight_change,
            "total_bf_change": final_bf - initial_bf,
            "duration_days": duration_days,
            "average_weekly_loss": avg_weekly,
            "entries_count": len(program_entries),
            "best_entry": best_entry,
            "notes": request.notes
        }
    }

    # Update user data with archived program and new active program
    archived_programs = user_data.get("archived_programs", [])
    archived_programs.insert(0, archived_program)

    # Create new program ID
    new_program_id = f"program-{int(datetime.now().timestamp() * 1000)}"

    updated_user = {
        **user_data,
        "archived_programs": archived_programs,
        "current_program_id": new_program_id,
        "start_date": now[:10],
        "program_reference": {
            "start_date": now[:10],
            "initial_weight": final_weight,
            "initial_bf": final_bf
        }
    }

    db.save_user(updated_user, "default")

    return {
        "success": True,
        "archived_program": archived_program,
        "new_program_id": new_program_id,
        "updated_user": updated_user
    }


@router.get("/api/programs/{program_id}")
async def get_program(program_id: str):
    """Get details of a specific program"""
    user_data = db.get_user("default")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if it's the active program
    if user_data.get("current_program_id") == program_id:
        entries = db.get_entries("1")
        program_entries = [e for e in entries if e.get("program_id") == program_id]
        return {
            "id": program_id,
            "name": "Current Program",
            "status": "active",
            "start_date": user_data.get("start_date"),
            "initial_weight": user_data.get("program_reference", {}).get("initial_weight"),
            "initial_bf": user_data.get("program_reference", {}).get("initial_bf"),
            "entries": program_entries
        }

    # Check archived programs
    archived = user_data.get("archived_programs", [])
    program = next((p for p in archived if p.get("id") == program_id), None)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Get entries for this program
    entries = db.get_entries("1")
    program_entries = [e for e in entries if e.get("program_id") == program_id]

    return {
        **program,
        "entries": program_entries
    }


@router.get("/api/programs/{program_id}/entries")
async def get_program_entries(program_id: str):
    """Get entries for a specific program"""
    entries = db.get_entries("1")
    program_entries = [e for e in entries if e.get("program_id") == program_id]
    return program_entries


@router.get("/api/programs/{program_id}/compare")
async def compare_programs(program_id: str, compare_to: Optional[str] = None):
    """Compare two programs"""
    user_data = db.get_user("default")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    # Get the first program
    archived = user_data.get("archived_programs", [])
    program1 = next((p for p in archived if p.get("id") == program_id), None)

    if not program1:
        raise HTTPException(status_code=404, detail="Program not found")

    # If no compare_to specified, compare with current active program
    if not compare_to:
        # Use current stats
        program2 = {
            "id": user_data.get("current_program_id"),
            "name": "Current Program",
            "status": "active",
            "start_date": user_data.get("start_date"),
            "initial_weight": user_data.get("program_reference", {}).get("initial_weight"),
            "initial_bf": user_data.get("program_reference", {}).get("initial_bf"),
            "current_weight": user_data.get("current_weight"),
            "current_bf": user_data.get("current_bf"),
        }
    else:
        program2 = next((p for p in archived if p.get("id") == compare_to), None)
        if not program2:
            raise HTTPException(status_code=404, detail="Comparison program not found")

    return {
        "program1": program1,
        "program2": program2,
        "comparison": {
            "weight_change_diff": (program1.get("summary", {}).get("total_weight_change", 0) or 0) -
                                  (program2.get("summary", {}).get("total_weight_change", 0) or 0),
            "bf_change_diff": (program1.get("summary", {}).get("total_bf_change", 0) or 0) -
                             (program2.get("summary", {}).get("total_bf_change", 0) or 0),
            "duration_diff": (program1.get("summary", {}).get("duration_days", 0) or 0) -
                            (program2.get("summary", {}).get("duration_days", 0) or 0),
        }
    }
