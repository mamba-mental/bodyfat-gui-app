#!/usr/bin/env python3
"""
API with SQLite database for persistent storage
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List
from datetime import datetime, timedelta
import uvicorn
from database import Database

app = FastAPI(title="Body Fat Estimator API with Database")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()

@app.get("/health")
async def health():
    return {"status": "healthy", "database": "sqlite"}

@app.get("/api/data/user")
async def get_user():
    """Get user data"""
    user = db.get_user()
    
    if not user:
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
    
    return user

@app.post("/api/data/user")
async def save_user(user_data: dict):
    """Save user data"""
    db.save_user(user_data)
    return {"success": True}

@app.get("/api/data/entries")
async def get_entries():
    """Get all entries"""
    entries = db.get_entries()
    return entries

@app.post("/api/data/entries")
async def save_entry(entry: dict):
    """Save new entry"""
    # Generate ID if not provided
    if 'id' not in entry:
        entry['id'] = f"entry_{datetime.now().timestamp()}"
    
    # Add timestamp if not provided
    if 'timestamp' not in entry:
        entry['timestamp'] = datetime.now().isoformat()
    
    db.save_entry(entry)
    return {"success": True, "entry": entry}

@app.delete("/api/data/entries/{entry_id}")
async def delete_entry(entry_id: str):
    """Delete an entry"""
    db.delete_entry(entry_id)
    return {"success": True}

@app.get("/api/data/reports")
async def get_reports():
    """Get all reports"""
    reports = db.get_reports()
    return reports

@app.post("/api/data/report")
async def save_report(report: dict):
    """Save report"""
    # Generate ID if not provided
    if 'id' not in report:
        report['id'] = f"report_{datetime.now().timestamp()}"
    
    db.save_report(report)
    return {"success": True, "report": report}

@app.post("/api/data/calculation")
async def save_calculation(calc_data: dict):
    """Save calculation data"""
    db.save_calculation(calc_data)
    return {"success": True}

@app.get("/api/data/calculation")
async def get_calculation():
    """Get latest calculation"""
    calc = db.get_latest_calculation()
    if calc:
        return calc
    
    # Return empty calculation
    return {
        "progression": [],
        "summary": {
            "total_weight_loss": 0,
            "body_fat_reduction": 0,
            "muscle_gain": 0,
            "timeline_weeks": 0
        }
    }

@app.get("/api/data/route")
async def get_route(key: str):
    """Get settings by key"""
    # For now, just return not found
    raise HTTPException(status_code=404, detail=f"Key '{key}' not found")

@app.post("/api/data/route")
async def save_route(data: dict):
    """Save settings"""
    # For now, just return success
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
    """Generate comprehensive report"""
    try:
        from report_generator import ReportGenerator
        
        # Get latest calculation for progression data
        calc = db.get_latest_calculation()
        if not calc or not calc.get('progression'):
            # Generate mock progression if none exists
            progression = []
            current_weight = user_data.get('current_weight', 266.5)
            current_bf = user_data.get('current_bf', 35.2)
            goal_weight = user_data.get('goal_weight', 217)
            goal_bf = user_data.get('goal_bf', 9.9)
            
            weeks = 16
            weight_loss_per_week = (current_weight - goal_weight) / weeks
            bf_loss_per_week = (current_bf - goal_bf) / weeks
            
            for i in range(weeks + 1):
                week_date = datetime.now() + timedelta(weeks=i)
                weight = current_weight - (weight_loss_per_week * i)
                bf = current_bf - (bf_loss_per_week * i)
                lean_mass = weight * (1 - bf/100)
                fat_mass = weight * (bf/100)
                
                progression.append({
                    'date': week_date.strftime('%Y-%m-%d'),
                    'weight': weight,
                    'body_fat_percentage': bf,
                    'lean_mass': lean_mass,
                    'fat_mass': fat_mass,
                    'daily_calorie_intake': 2000 - (50 * i),  # Progressive reduction
                    'tdee': 2500 - (20 * i),  # Metabolic adaptation
                    'goal_weight': goal_weight,
                    'goal_bf': goal_bf
                })
        else:
            progression = calc.get('progression', [])
        
        # Get entries for actual vs predicted
        entries = db.get_entries()
        
        # Generate comprehensive report
        generator = ReportGenerator()
        report_data = generator.generate_comprehensive_report(user_data, progression, entries)
        
        # Save report to database
        report = {
            'id': f"report_{datetime.now().timestamp()}",
            'title': f"Body Composition Report - {user_data.get('name', 'User')}",
            'date': datetime.now().isoformat(),
            'summary': report_data.get('analytics', {}),
            'generated_at': datetime.now().isoformat()
        }
        db.save_report(report)
        
        return report_data
        
    except Exception as e:
        print(f"Report generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "html_content": "<h1>Error generating report</h1>",
            "pdf_path": ""
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

# Data import endpoint
@app.post("/api/import/data")
async def import_data(data: dict):
    """Import data from JSON"""
    try:
        db.import_data(
            user_data=data.get('user'),
            entries=data.get('entries', []),
            reports=data.get('reports', [])
        )
        return {"success": True, "message": "Data imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Import any existing data on startup
    import json
    from pathlib import Path
    
    extracted_dir = Path(__file__).parent.parent / "data" / "extracted"
    
    if extracted_dir.exists():
        print("Checking for extracted data to import...")
        
        # Import user data
        user_file = extracted_dir / "user_data.json"
        if user_file.exists():
            with open(user_file) as f:
                user_data = json.load(f)
                db.save_user(user_data)
                print("Imported user data")
        
        # Import entries
        entries_file = extracted_dir / "entries.json"
        if entries_file.exists():
            with open(entries_file) as f:
                entries = json.load(f)
                for entry in entries:
                    db.save_entry(entry)
                print(f"Imported {len(entries)} entries")
        
        # Import reports
        reports_file = extracted_dir / "reports.json"
        if reports_file.exists():
            with open(reports_file) as f:
                reports = json.load(f)
                for report in reports:
                    db.save_report(report)
                print(f"Imported {len(reports)} reports")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)