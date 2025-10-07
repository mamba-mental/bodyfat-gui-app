"""
SQLite database for persistent storage
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Use the main data directory instead of python-api/data
            db_path = Path(__file__).parent.parent / "data" / "bodyfat.db"
        
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_db()
    
    def init_db(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS entries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    date DATE NOT NULL,
                    weight REAL NOT NULL,
                    body_fat_percentage REAL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS reports (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    date DATE NOT NULL,
                    data TEXT NOT NULL,
                    file_path TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS calculations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            ''')
            
            # Create indexes for better performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date DESC)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_reports_user_date ON reports(user_id, date DESC)')
            
            conn.commit()
    
    def get_user(self, user_id: str = "default") -> Optional[Dict[str, Any]]:
        """Get user data"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            
            if row:
                user_data = json.loads(row['data'])
                user_data['id'] = row['id']
                return user_data
            
            return None
    
    def save_user(self, user_data: Dict[str, Any], user_id: str = "default"):
        """Save or update user data"""
        data_json = json.dumps(user_data)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO users (id, name, data, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (user_id, user_data.get('name', 'User'), data_json))
            conn.commit()
    
    def get_entries(self, user_id: str = "default") -> List[Dict[str, Any]]:
        """Get all entries for a user"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT * FROM entries 
                WHERE user_id = ? 
                ORDER BY date DESC
            ''', (user_id,))
            
            entries = []
            for row in cursor:
                entry = {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'date': row['date'],
                    'weight': row['weight'],
                    'body_fat_percentage': row['body_fat_percentage'],
                    'notes': row['notes'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                entries.append(entry)
            
            return entries
    
    def save_entry(self, entry: Dict[str, Any], user_id: str = "default"):
        """Save a new entry"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO entries 
                (id, user_id, date, weight, body_fat_percentage, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                entry['id'],
                user_id,
                entry['date'],
                entry['weight'],
                entry.get('body_fat_percentage'),
                entry.get('notes')
            ))
            conn.commit()
    
    def delete_entry(self, entry_id: str):
        """Delete an entry"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM entries WHERE id = ?', (entry_id,))
            conn.commit()
    
    def get_reports(self, user_id: str = "default") -> List[Dict[str, Any]]:
        """Get all reports for a user"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT * FROM reports 
                WHERE user_id = ? 
                ORDER BY date DESC
            ''', (user_id,))
            
            reports = []
            for row in cursor:
                report_data = json.loads(row['data'])
                report_data['id'] = row['id']
                report_data['file_path'] = row['file_path']
                reports.append(report_data)
            
            return reports
    
    def get_report(self, report_id: str, user_id: str = "default") -> Optional[Dict[str, Any]]:
        """Get a specific report by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT * FROM reports 
                WHERE user_id = ? AND id = ?
            ''', (user_id, report_id))
            
            row = cursor.fetchone()
            if row:
                report_data = json.loads(row['data'])
                report_data['id'] = row['id']
                report_data['file_path'] = row['file_path']
                return report_data
            
            return None
    
    def save_report(self, report: Dict[str, Any], user_id: str = "default"):
        """Save a report"""
        data_json = json.dumps({
            k: v for k, v in report.items() 
            if k not in ['id', 'file_path']
        })
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO reports 
                (id, user_id, title, date, data, file_path)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                report['id'],
                user_id,
                report.get('title', 'Report'),
                report.get('date', datetime.now().isoformat()),
                data_json,
                report.get('file_path')
            ))
            conn.commit()
    
    def get_latest_calculation(self, user_id: str = "default") -> Optional[Dict[str, Any]]:
        """Get the latest calculation result"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT * FROM calculations 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            ''', (user_id,))
            
            row = cursor.fetchone()
            if row:
                return json.loads(row['data'])
            
            return None
    
    def save_calculation(self, calculation: Dict[str, Any], user_id: str = "default"):
        """Save calculation result"""
        data_json = json.dumps(calculation)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO calculations (user_id, data)
                VALUES (?, ?)
            ''', (user_id, data_json))
            conn.commit()
    
    def import_data(self, user_data: Dict[str, Any] = None, 
                    entries: List[Dict[str, Any]] = None,
                    reports: List[Dict[str, Any]] = None):
        """Import data from JSON files"""
        if user_data:
            self.save_user(user_data)
            print(f"Imported user data for {user_data.get('name', 'User')}")
        
        if entries:
            for entry in entries:
                self.save_entry(entry)
            print(f"Imported {len(entries)} entries")
        
        if reports:
            for report in reports:
                self.save_report(report)
            print(f"Imported {len(reports)} reports")