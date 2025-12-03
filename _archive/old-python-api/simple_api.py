#!/usr/bin/env python3
"""
Simple API for testing data persistence endpoints
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
from pathlib import Path
import uvicorn

app = FastAPI(title="Body Fat Estimator API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data storage
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# In-memory storage for quick testing
users = {}
entries = []
reports = []
settings = {}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/data/user")
async def get_user():
    """Get user data"""
    if "default" in users:
        return users["default"]
    
    # Return default user
    return {
        "name": "MJ Prime",
        "age": 47,
        "dob": "070478",
        "gender": "m",
        "height_feet": 5,
        "height_inches": 9,
        "height_cm": 175.26,
        "current_weight": 266.5,
        "current_bf": 35.2,
        "goal_weight": 217,
        "goal_bf": 9.9,
        "timeline_weeks": 16,
        "activity_level": 2,
        "resistance_training": True,
        "is_athlete": True,
        "workout_type": "Bodybuilding",
        "workout_days": 3,
        "job_activity": 1,
        "leisure_activity": 1,
        "experience_level": "Advanced",
        "volume_score": 5,
        "intensity_score": 5,
        "frequency_score": 3,
        "is_bodybuilder": True,
        "protein_intake": 265,
        "diet_type": "keto",
        "ped_use": True,
        "exercise_type": "resistance",
        "sleep_quality": "poor",
        "start_date": "07/21/25",
        "end_date": "11/10/25"
    }

@app.post("/api/data/user")
async def save_user(user_data: dict):
    """Save user data"""
    users["default"] = user_data
    # Save to file
    user_file = DATA_DIR / "user_data.json"
    with open(user_file, 'w') as f:
        json.dump(user_data, f, indent=2)
    return {"success": True}

@app.get("/api/data/entries")
async def get_entries():
    """Get all entries"""
    # Load from file if exists
    entries_file = DATA_DIR / "entries.json"
    if entries_file.exists():
        with open(entries_file, 'r') as f:
            global entries
            entries = json.load(f)
    
    # Sort by date descending
    entries.sort(key=lambda x: x.get('date', ''), reverse=True)
    return entries

@app.post("/api/data/entries")
async def save_entry(entry: dict):
    """Save new entry"""
    # Add timestamp
    if 'timestamp' not in entry:
        entry['timestamp'] = datetime.now().isoformat()
    
    # Update or add entry
    entry_id = entry.get('id')
    existing = next((i for i, e in enumerate(entries) if e.get('id') == entry_id), None)
    
    if existing is not None:
        entries[existing] = entry
    else:
        entries.append(entry)
    
    # Save to file
    entries_file = DATA_DIR / "entries.json"
    with open(entries_file, 'w') as f:
        json.dump(entries, f, indent=2)
    
    return {"success": True, "entry": entry}

@app.get("/api/data/reports")
async def get_reports():
    """Get all reports"""
    # Load from file if exists
    reports_file = DATA_DIR / "reports.json"
    if reports_file.exists():
        with open(reports_file, 'r') as f:
            global reports
            reports = json.load(f)
    
    # Sort by date descending
    reports.sort(key=lambda x: x.get('date', ''), reverse=True)
    return reports

@app.post("/api/data/report")
async def save_report(report: dict):
    """Save report"""
    reports.append(report)
    
    # Save to file
    reports_file = DATA_DIR / "reports.json"
    with open(reports_file, 'w') as f:
        json.dump(reports, f, indent=2)
    
    return {"success": True, "report": report}

@app.post("/api/data/calculation")
async def save_calculation(calc_data: dict):
    """Save calculation data"""
    return {"success": True}

@app.get("/api/data/route")
async def get_route(key: str):
    """Get settings by key"""
    if key in settings:
        return {key: settings[key]}
    raise HTTPException(status_code=404, detail=f"Key '{key}' not found")

@app.post("/api/data/route")
async def save_route(data: dict):
    """Save settings"""
    settings.update(data)
    
    # Save to file
    settings_file = DATA_DIR / "settings.json"
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)
    
    return {"success": True}

# Calculation endpoints
@app.post("/calculate")
async def calculate(user_data: dict):
    """Mock calculation endpoint"""
    return {
        "user_data": user_data,
        "progression": [],
        "summary": {
            "total_weight_loss": 49.5,
            "body_fat_reduction": 25.3,
            "muscle_gain": 0,
            "timeline_weeks": 16
        }
    }

@app.post("/generate-report")
async def generate_report(user_data: dict):
    """Mock report generation"""
    return {
        "success": True,
        "html_content": "<h1>Body Fat Report</h1><p>Report content here...</p>",
        "pdf_path": "/reports/report.pdf"
    }

@app.post("/api/ai/insights")
async def ai_insights(data: dict):
    """Mock AI insights"""
    return {
        "insights": [
            {
                "type": "tip",
                "title": "Stay Consistent",
                "message": "Keep tracking your progress daily for best results",
                "priority": "medium",
                "category": "general"
            }
        ]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)