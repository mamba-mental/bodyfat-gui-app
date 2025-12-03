#!/usr/bin/env python3
"""
Migration Script: JSON to SQLite Consolidation
Phase 1 of Storage Consolidation

This script migrates all data from data/apexfit-data.json to data/bodyfat.db
"""

import json
import sqlite3
import sys
import os
from datetime import datetime
from typing import Dict, List, Any

# Database connection
DB_PATH = "../data/bodyfat.db"
JSON_PATH = "../data/apexfit-data.json"


def connect_db():
    """Connect to SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def read_json_data() -> Dict[str, Any]:
    """Read data from JSON file"""
    if not os.path.exists(JSON_PATH):
        print(f"[X] JSON file not found at {JSON_PATH}")
        sys.exit(1)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def migrate_users(conn: sqlite3.Connection, data: Dict[str, Any]) -> int:
    """Migrate users from JSON to SQLite"""
    cursor = conn.cursor()
    users = data.get("users", {})
    migrated = 0

    for user_id, user_data in users.items():
        # Convert user data to JSON string for SQLite
        user_json = json.dumps(user_data)

        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))

        if cursor.fetchone():
            # Update existing user
            cursor.execute(
                """UPDATE users 
                   SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = ?""",
                (user_data.get("name", f"User {user_id}"), user_json, user_id),
            )
            print(f"  Updated user {user_id}: {user_data.get('name', 'Unknown')}")
        else:
            # Insert new user
            cursor.execute(
                """INSERT INTO users (id, name, data, created_at, updated_at)
                   VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
                (user_id, user_data.get("name", f"User {user_id}"), user_json),
            )
            print(f"  Inserted user {user_id}: {user_data.get('name', 'Unknown')}")

        migrated += 1

    conn.commit()
    return migrated


def migrate_entries(conn: sqlite3.Connection, data: Dict[str, Any]) -> int:
    """Migrate entries from JSON to SQLite"""
    cursor = conn.cursor()
    entries = data.get("entries", [])
    migrated = 0

    for entry in entries:
        entry_id = entry.get("id")
        if not entry_id:
            # Generate ID if missing
            entry_id = (
                f"entry_{entry.get('user_id', '1')}_{entry.get('date', 'unknown')}"
            )

        # Skip entries without required date field
        date = entry.get("date")
        if not date:
            print(f"  Skipping entry {entry_id}: missing date")
            continue

        # Check if entry already exists
        cursor.execute("SELECT id FROM entries WHERE id = ?", (entry_id,))

        if cursor.fetchone():
            # Update existing entry
            cursor.execute(
                """UPDATE entries 
                   SET user_id = ?, date = ?, weight = ?, body_fat_percentage = ?, notes = ?,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (
                    entry.get("user_id", "1"),
                    date,
                    entry.get("weight", 0),
                    entry.get("body_fat_percentage"),
                    entry.get("notes"),
                    entry_id,
                ),
            )
            print(f"  Updated entry {entry_id}")
        else:
            # Insert new entry
            cursor.execute(
                """INSERT INTO entries 
                   (id, user_id, date, weight, body_fat_percentage, notes, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
                (
                    entry_id,
                    entry.get("user_id", "1"),
                    date,
                    entry.get("weight", 0),
                    entry.get("body_fat_percentage"),
                    entry.get("notes"),
                ),
            )
            print(f"  Inserted entry {entry_id}")

        migrated += 1

    conn.commit()
    return migrated


def migrate_reports(conn: sqlite3.Connection, data: Dict[str, Any]) -> int:
    """Migrate reports from JSON to SQLite"""
    cursor = conn.cursor()
    reports = data.get("reports", [])
    migrated = 0

    for report in reports:
        report_id = report.get("id")
        if not report_id:
            # Generate ID if missing
            report_id = (
                f"report_{report.get('user_id', '1')}_{report.get('date', 'unknown')}"
            )

        # Skip reports without required date field
        date = report.get("date")
        if not date:
            print(f"  Skipping report {report_id}: missing date")
            continue

        # Convert report data to JSON string
        report_json = json.dumps(report)

        # Check if report already exists
        cursor.execute("SELECT id FROM reports WHERE id = ?", (report_id,))

        if cursor.fetchone():
            # Update existing report (reports table doesn't have updated_at)
            cursor.execute(
                """UPDATE reports 
                   SET user_id = ?, title = ?, date = ?, data = ?, file_path = ?
                   WHERE id = ?""",
                (
                    report.get("user_id", "1"),
                    report.get("title", "Report"),
                    date,
                    report_json,
                    report.get("file_path"),
                    report_id,
                ),
            )
            print(f"  Updated report {report_id}")
        else:
            # Insert new report
            cursor.execute(
                """INSERT INTO reports 
                   (id, user_id, title, date, data, file_path, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (
                    report_id,
                    report.get("user_id", "1"),
                    report.get("title", "Report"),
                    date,
                    report_json,
                    report.get("file_path"),
                ),
            )
            print(f"  Inserted report {report_id}")

        migrated += 1

    conn.commit()
    return migrated


def migrate_calculations(conn: sqlite3.Connection, data: Dict[str, Any]) -> int:
    """Migrate calculations from JSON to SQLite"""
    cursor = conn.cursor()
    calculations = data.get("calculations", {})
    migrated = 0

    for user_id, calc_list in calculations.items():
        if not isinstance(calc_list, list):
            calc_list = [calc_list]

        for calc in calc_list:
            # Convert calculation data to JSON string
            calc_json = json.dumps(calc)

            # Insert calculation (no ID check since calculations don't have unique IDs in JSON)
            cursor.execute(
                """INSERT INTO calculations 
                   (user_id, data, created_at)
                   VALUES (?, ?, CURRENT_TIMESTAMP)""",
                (user_id, calc_json),
            )
            print(f"  Inserted calculation for user {user_id}")
            migrated += 1

    conn.commit()
    return migrated


def verify_migration(conn: sqlite3.Connection) -> Dict[str, int]:
    """Verify migrated data counts"""
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM users")
    user_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM entries")
    entry_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM reports")
    report_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM calculations")
    calc_count = cursor.fetchone()["count"]

    return {
        "users": user_count,
        "entries": entry_count,
        "reports": report_count,
        "calculations": calc_count,
    }


def create_backup():
    """Create backup of JSON file"""
    if os.path.exists(JSON_PATH):
        backup_path = f"{JSON_PATH}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.rename(JSON_PATH, backup_path)
        print(f"[OK] Created backup: {backup_path}")
        return backup_path
    return None


def main():
    """Main migration function"""
    print("=" * 60)
    print("JSON to SQLite Migration Tool")
    print("Phase 1: Storage Consolidation")
    print("=" * 60)
    print()

    # Check if JSON file exists
    if not os.path.exists(JSON_PATH):
        print(f"[X] Error: JSON file not found at {JSON_PATH}")
        print("   No data to migrate.")
        sys.exit(1)

    # Read JSON data
    print("[...] Reading JSON data...")
    try:
        data = read_json_data()
        print(f"[OK] Successfully read JSON data")
        print(f"   Users: {len(data.get('users', {}))}")
        print(f"   Entries: {len(data.get('entries', []))}")
        print(f"   Reports: {len(data.get('reports', []))}")
        print(f"   Calculations: {len(data.get('calculations', {}))}")
        print()
    except Exception as e:
        print(f"[X] Error reading JSON: {e}")
        sys.exit(1)

    # Connect to database
    print("[...] Connecting to SQLite database...")
    try:
        conn = connect_db()
        print(f"[OK] Connected to {DB_PATH}")
        print()
    except Exception as e:
        print(f"[X] Error connecting to database: {e}")
        sys.exit(1)

    # Migrate data
    try:
        print("[...] Migrating users...")
        user_count = migrate_users(conn, data)
        print(f"[OK] Migrated {user_count} users\n")

        print("[...] Migrating entries...")
        entry_count = migrate_entries(conn, data)
        print(f"[OK] Migrated {entry_count} entries\n")

        print("[...] Migrating reports...")
        report_count = migrate_reports(conn, data)
        print(f"[OK] Migrated {report_count} reports\n")

        print("[...] Migrating calculations...")
        calc_count = migrate_calculations(conn, data)
        print(f"[OK] Migrated {calc_count} calculations\n")

    except Exception as e:
        print(f"[X] Error during migration: {e}")
        conn.rollback()
        conn.close()
        sys.exit(1)

    # Verify migration
    print("[...] Verifying migration...")
    try:
        counts = verify_migration(conn)
        print(f"   Users in DB: {counts['users']}")
        print(f"   Entries in DB: {counts['entries']}")
        print(f"   Reports in DB: {counts['reports']}")
        print(f"   Calculations in DB: {counts['calculations']}")
        print()
    except Exception as e:
        print(f"[!] Warning: Could not verify migration: {e}")
        print()

    # Close connection
    conn.close()

    # Create backup
    print("[...] Creating backup of JSON file...")
    backup_path = create_backup()
    if backup_path:
        print(f"[OK] Backup created at: {backup_path}")
    print()

    print("=" * 60)
    print("[OK] Migration completed successfully!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Test the application to ensure data is accessible")
    print("2. Remove JSON storage code from Next.js routes")
    print("3. Remove Redis code and dependencies")
    print("4. Update API routes to use SQLite only")
    print()


if __name__ == "__main__":
    main()
