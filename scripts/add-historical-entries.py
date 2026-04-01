#!/usr/bin/env python3
"""
Add historical entries to demonstrate data recovery
"""

import requests
import json
from datetime import datetime, timedelta

API_URL = "http://localhost:8313"

# Sample historical entries matching the user's missing data
historical_entries = [
    # June entries
    {"date": "2025-06-01", "weight": 280.0, "body_fat_percentage": 38.5, "notes": "Starting point"},
    {"date": "2025-06-05", "weight": 278.5, "body_fat_percentage": 38.2, "notes": "First week progress"},
    {"date": "2025-06-10", "weight": 276.8, "body_fat_percentage": 37.8, "notes": "Feeling good"},
    {"date": "2025-06-15", "weight": 275.2, "body_fat_percentage": 37.5, "notes": "Diet on track"},
    {"date": "2025-06-20", "weight": 273.5, "body_fat_percentage": 37.1, "notes": "Increased cardio"},
    {"date": "2025-06-25", "weight": 271.8, "body_fat_percentage": 36.7, "notes": "Good momentum"},
    {"date": "2025-06-30", "weight": 270.0, "body_fat_percentage": 36.3, "notes": "End of June"},
    
    # July entries leading up to 7/21
    {"date": "2025-07-05", "weight": 268.5, "body_fat_percentage": 36.0, "notes": "July progress"},
    {"date": "2025-07-10", "weight": 267.2, "body_fat_percentage": 35.7, "notes": "Consistent losses"},
    {"date": "2025-07-15", "weight": 266.8, "body_fat_percentage": 35.5, "notes": "Almost at 7/21 weight"},
    {"date": "2025-07-21", "weight": 266.5, "body_fat_percentage": 35.2, "notes": "Official start date"},
]

def add_entries():
    """Add historical entries via API"""
    print("Adding historical entries...")
    
    for i, entry_data in enumerate(historical_entries):
        # Create entry object
        entry = {
            "id": f"hist_{i+1}",
            "date": entry_data["date"],
            "weight": entry_data["weight"],
            "body_fat_percentage": entry_data["body_fat_percentage"],
            "notes": entry_data["notes"],
            "timestamp": datetime.now().isoformat()
        }
        
        # Send to API
        response = requests.post(f"{API_URL}/api/data/entries", json=entry)
        
        if response.status_code == 200:
            print(f"✓ Added entry for {entry_data['date']}: {entry_data['weight']} lbs, {entry_data['body_fat_percentage']}% BF")
        else:
            print(f"✗ Failed to add entry for {entry_data['date']}: {response.text}")
    
    print("\n✅ Historical data restoration complete!")
    print("You should now see your June entries and 7/21 data in the app.")

if __name__ == "__main__":
    add_entries()