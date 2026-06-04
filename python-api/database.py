"""
SQLite database for persistent storage
"""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Use the data directory (DATA_DIR environment variable or fallback)
            data_dir_env = os.environ.get('DATA_DIR')
            if data_dir_env:
                data_dir = Path(data_dir_env)
            else:
                # Fallback to relative path for local development
                data_dir = Path(__file__).parent.parent / "data"
            
            db_path = data_dir / "bodyfat.db"

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
                    program_id TEXT,
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

            # Migration: Add program_id column to entries table if it doesn't exist
            cursor = conn.execute("PRAGMA table_info(entries)")
            columns = [row[1] for row in cursor.fetchall()]
            if 'program_id' not in columns:
                conn.execute('ALTER TABLE entries ADD COLUMN program_id TEXT')

            # --- ReComp Cycle schema (F1: idempotent; was previously Alembic-only) ---
            # Guarantees a fresh / non-migrated DB has the cycle schema so save_entry,
            # save_cycle, and report save never 500 on a missing column or table. This
            # makes the API self-migrating at startup (the launcher does not run Alembic).
            conn.execute('''
                CREATE TABLE IF NOT EXISTS cycles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT,
                    start_date TEXT NOT NULL,
                    end_date TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    start_weight REAL,
                    start_bf REAL,
                    goal_weight REAL,
                    goal_bf REAL,
                    timeline_weeks INTEGER,
                    weighin_days TEXT,
                    weighin_per_week INTEGER,
                    legacy_program_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_cycles_one_active "
                "ON cycles(user_id) WHERE status='active'"
            )

            entry_cols = [r[1] for r in conn.execute("PRAGMA table_info(entries)")]
            if 'cycle_id' not in entry_cols:
                conn.execute('ALTER TABLE entries ADD COLUMN cycle_id TEXT')

            report_cols = [r[1] for r in conn.execute("PRAGMA table_info(reports)")]
            if 'cycle_id' not in report_cols:
                conn.execute('ALTER TABLE reports ADD COLUMN cycle_id TEXT')
            if 'source_fingerprint' not in report_cols:
                conn.execute('ALTER TABLE reports ADD COLUMN source_fingerprint TEXT')
            if 'updated_at' not in report_cols:
                conn.execute('ALTER TABLE reports ADD COLUMN updated_at TIMESTAMP')

            # Stamp alembic_version to head so `alembic upgrade head` is a no-op on a
            # DB this code already migrated (prevents double-apply if Alembic is run).
            conn.execute('CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)')
            if not conn.execute("SELECT 1 FROM alembic_version LIMIT 1").fetchone():
                conn.execute("INSERT INTO alembic_version (version_num) VALUES ('f3c461796ba2')")

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
                    'program_id': row['program_id'],
                    'cycle_id': row['cycle_id'] if 'cycle_id' in row.keys() else None,
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                entries.append(entry)

            return entries
    
    def save_entry(self, entry: Dict[str, Any], user_id: str = "default"):
        """Save (insert or update) an entry.

        cycle_id resolution is deliberately non-clobbering:
          1. explicit cycle_id on the payload wins;
          2. else, if this entry id already exists, keep its current cycle_id
             (so an idempotent re-save that omits cycle_id can NOT re-tag it -
             this was the ReComp Cycle data-drift bug: load-time re-saves kept
             moving historical entries into the active cycle);
          3. else (a genuinely new entry) fall back to the active cycle.
        """
        with sqlite3.connect(self.db_path) as conn:
            cycle_id = entry.get('cycle_id')
            if not cycle_id:
                existing = conn.execute(
                    'SELECT cycle_id FROM entries WHERE id = ?', (entry['id'],)
                ).fetchone()
                cycle_id = (existing[0] if existing and existing[0] else None)                     or self.get_active_cycle_id(user_id)
            conn.execute('''
                INSERT OR REPLACE INTO entries
                (id, user_id, date, weight, body_fat_percentage, notes, program_id, cycle_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                entry['id'],
                user_id,
                entry['date'],
                entry['weight'],
                entry.get('body_fat_percentage'),
                entry.get('notes'),
                entry.get('program_id'),
                cycle_id
            ))
            conn.commit()
    
    def delete_entry(self, entry_id: str):
        """Delete an entry"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM entries WHERE id = ?', (entry_id,))
            conn.commit()

    # ---- ReComp Cycles ----
    def get_cycles(self, user_id: str = "default") -> List[Dict[str, Any]]:
        """All cycles for a user, newest first. weighin_days returned as a list."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            try:
                cursor = conn.execute(
                    'SELECT * FROM cycles WHERE user_id = ? ORDER BY start_date DESC', (user_id,)
                )
            except sqlite3.OperationalError:
                return []  # cycles table not migrated yet
            out = []
            for row in cursor:
                c = dict(row)
                try:
                    c['weighin_days'] = json.loads(c.get('weighin_days') or '[]')
                except Exception:
                    c['weighin_days'] = []
                out.append(c)
            return out

    def get_active_cycle_id(self, user_id: str = "default") -> Optional[str]:
        with sqlite3.connect(self.db_path) as conn:
            try:
                row = conn.execute(
                    "SELECT id FROM cycles WHERE user_id = ? AND status = 'active' LIMIT 1",
                    (user_id,),
                ).fetchone()
                return row[0] if row else None
            except sqlite3.OperationalError:
                return None

    def save_cycle(self, cycle: Dict[str, Any], user_id: str = "default"):
        """Insert/update a cycle. Demotes any other active cycle first (one-active)."""
        with sqlite3.connect(self.db_path) as conn:
            if cycle.get('status', 'active') == 'active':
                conn.execute(
                    "UPDATE cycles SET status='stopped', updated_at=CURRENT_TIMESTAMP "
                    "WHERE user_id=? AND status='active' AND id<>?",
                    (user_id, cycle['id']),
                )
            wd = cycle.get('weighin_days')
            conn.execute('''
                INSERT OR REPLACE INTO cycles
                (id,user_id,name,start_date,end_date,status,start_weight,start_bf,goal_weight,
                 goal_bf,timeline_weeks,weighin_days,weighin_per_week,legacy_program_id,
                 created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,
                 COALESCE((SELECT created_at FROM cycles WHERE id=?),CURRENT_TIMESTAMP),
                 CURRENT_TIMESTAMP)
            ''', (
                cycle['id'], user_id, cycle.get('name'), cycle['start_date'], cycle.get('end_date'),
                cycle.get('status', 'active'), cycle.get('start_weight'), cycle.get('start_bf'),
                cycle.get('goal_weight'), cycle.get('goal_bf'), cycle.get('timeline_weeks'),
                json.dumps(wd if isinstance(wd, list) else []), cycle.get('weighin_per_week', 0),
                cycle.get('legacy_program_id'), cycle['id'],
            ))
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
                report_data['cycle_id'] = row['cycle_id'] if 'cycle_id' in row.keys() else None
                if row['file_path'] and not report_data.get('file_path'):
                    report_data['file_path'] = row['file_path']
                if not report_data.get('pdf_path') and row['file_path']:
                    report_data['pdf_path'] = row['file_path']
                if report_data.get('pdf_path') and not report_data.get('file_base'):
                    report_data['file_base'] = Path(report_data['pdf_path']).stem
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
                (id, user_id, title, date, data, file_path, cycle_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                report['id'],
                user_id,
                report.get('title', 'Report'),
                report.get('date', datetime.now().isoformat()),
                data_json,
                report.get('file_path') or report.get('pdf_path'),
                # Tag the report with its cycle so the Reports page can scope it.
                # Falls back to the active cycle when the caller doesn't specify one.
                report.get('cycle_id') or self.get_active_cycle_id(user_id)
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
