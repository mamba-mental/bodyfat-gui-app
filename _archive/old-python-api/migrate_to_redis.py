#!/usr/bin/env python3
"""
Migration Script: SQLite/JSON to Redis Consolidation
Phase 1: Redis-First Architecture

This script migrates all data from SQLite and JSON to Redis
"""

import json
import sqlite3
import sys
import os
from datetime import datetime
from typing import Dict, List, Any
import redis

# Configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6385")
DB_PATH = "../data/bodyfat.db"
JSON_PATH = "../nas-data/apexfit-data.json"


def connect_redis():
    """Connect to Redis"""
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()  # Test connection
        return r
    except Exception as e:
        print(f"[X] Error connecting to Redis at {REDIS_URL}: {e}")
        sys.exit(1)


def connect_sqlite():
    """Connect to SQLite database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"[X] Error connecting to SQLite at {DB_PATH}: {e}")
        return None


def read_json_data() -> Dict[str, Any]:
    """Read data from JSON file"""
    if not os.path.exists(JSON_PATH):
        print(f"[!] JSON file not found at {JSON_PATH}, skipping")
        return {}

    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[X] Error reading JSON: {e}")
        return {}


def migrate_users_to_redis(
    r: redis.Redis, conn: sqlite3.Connection = None, json_data: Dict[str, Any] = None
) -> int:
    """Migrate users to Redis"""
    migrated = 0

    # Migrate from SQLite first (primary source)
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()

        for user in users:
            user_id = user["id"]
            user_data = json.loads(user["data"])

            # Store in Redis
            r.set(f"user:{user_id}", json.dumps(user_data))
            print(f"  Migrated user {user_id} from SQLite")
            migrated += 1

    # Migrate from JSON (if not in SQLite)
    if json_data and "users" in json_data:
        for user_id, user_data in json_data["users"].items():
            # Only migrate if not already in Redis
            if not r.exists(f"user:{user_id}"):
                r.set(f"user:{user_id}", json.dumps(user_data))
                print(f"  Migrated user {user_id} from JSON")
                migrated += 1

    return migrated


def migrate_entries_to_redis(
    r: redis.Redis, conn: sqlite3.Connection = None, json_data: Dict[str, Any] = None
) -> int:
    """Migrate entries to Redis"""
    migrated = 0

    # Migrate from SQLite first
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM entries ORDER BY date DESC")
        entries = cursor.fetchall()

        for entry in entries:
            entry_id = entry["id"]
            user_id = entry["user_id"]

            # Store entry hash
            r.hset(
                f"entry:{user_id}:{entry_id}",
                mapping={
                    "id": entry_id,
                    "user_id": user_id,
                    "date": entry["date"],
                    "weight": str(entry["weight"]),
                    "body_fat_percentage": str(entry["body_fat_percentage"])
                    if entry["body_fat_percentage"]
                    else "",
                    "notes": entry["notes"] if entry["notes"] else "",
                    "created_at": entry["created_at"] if entry["created_at"] else "",
                    "updated_at": entry["updated_at"] if entry["updated_at"] else "",
                },
            )

            # Add to sorted set for date-based queries
            timestamp = int(datetime.fromisoformat(entry["date"]).timestamp())
            r.zadd(f"entries:{user_id}", {entry_id: timestamp})

            print(f"  Migrated entry {entry_id} from SQLite")
            migrated += 1

    # Migrate from JSON
    if json_data and "entries" in json_data:
        for entry in json_data["entries"]:
            entry_id = entry.get("id")
            if not entry_id:
                continue

            user_id = entry.get("user_id", "1")

            # Only migrate if not already in Redis
            if not r.exists(f"entry:{user_id}:{entry_id}"):
                r.hset(
                    f"entry:{user_id}:{entry_id}",
                    mapping={
                        "id": entry_id,
                        "user_id": user_id,
                        "date": entry.get("date", ""),
                        "weight": str(entry.get("weight", 0)),
                        "body_fat_percentage": str(
                            entry.get("body_fat_percentage", "")
                        ),
                        "notes": entry.get("notes", ""),
                        "created_at": "",
                        "updated_at": "",
                    },
                )

                if entry.get("date"):
                    try:
                        timestamp = int(
                            datetime.fromisoformat(entry["date"]).timestamp()
                        )
                        r.zadd(f"entries:{user_id}", {entry_id: timestamp})
                    except:
                        pass

                print(f"  Migrated entry {entry_id} from JSON")
                migrated += 1

    return migrated


def migrate_reports_to_redis(
    r: redis.Redis, conn: sqlite3.Connection = None, json_data: Dict[str, Any] = None
) -> int:
    """Migrate reports to Redis"""
    migrated = 0

    # Migrate from SQLite first
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports ORDER BY date DESC")
        reports = cursor.fetchall()

        for report in reports:
            report_id = report["id"]
            user_id = report["user_id"]

            # Store report hash
            r.hset(
                f"report:{user_id}:{report_id}",
                mapping={
                    "id": report_id,
                    "user_id": user_id,
                    "title": report["title"],
                    "date": report["date"],
                    "data": report["data"],
                    "file_path": report["file_path"] if report["file_path"] else "",
                    "created_at": report["created_at"] if report["created_at"] else "",
                },
            )

            # Add to sorted set
            timestamp = int(datetime.fromisoformat(report["date"]).timestamp())
            r.zadd(f"reports:{user_id}", {report_id: timestamp})

            print(f"  Migrated report {report_id} from SQLite")
            migrated += 1

    # Migrate from JSON
    if json_data and "reports" in json_data:
        for report in json_data["reports"]:
            report_id = report.get("id")
            if not report_id:
                continue

            user_id = report.get("user_id", "1")

            # Only migrate if not already in Redis
            if not r.exists(f"report:{user_id}:{report_id}"):
                r.hset(
                    f"report:{user_id}:{report_id}",
                    mapping={
                        "id": report_id,
                        "user_id": user_id,
                        "title": report.get("title", "Report"),
                        "date": report.get("date", ""),
                        "data": json.dumps(report),
                        "file_path": report.get("file_path", ""),
                        "created_at": "",
                    },
                )

                if report.get("date"):
                    try:
                        timestamp = int(
                            datetime.fromisoformat(report["date"]).timestamp()
                        )
                        r.zadd(f"reports:{user_id}", {report_id: timestamp})
                    except:
                        pass

                print(f"  Migrated report {report_id} from JSON")
                migrated += 1

    return migrated


def migrate_calculations_to_redis(
    r: redis.Redis, conn: sqlite3.Connection = None, json_data: Dict[str, Any] = None
) -> int:
    """Migrate calculations to Redis"""
    migrated = 0

    # Migrate from SQLite first
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM calculations ORDER BY created_at DESC")
        calculations = cursor.fetchall()

        for calc in calculations:
            calc_id = calc["id"]
            user_id = calc["user_id"]

            # Store calculation hash
            r.hset(
                f"calculation:{user_id}:{calc_id}",
                mapping={
                    "id": str(calc_id),
                    "user_id": user_id,
                    "data": calc["data"],
                    "created_at": calc["created_at"] if calc["created_at"] else "",
                },
            )

            # Add to sorted set
            r.zadd(f"calculations:{user_id}", {str(calc_id): calc_id})

            print(f"  Migrated calculation {calc_id} from SQLite")
            migrated += 1

    # Migrate from JSON
    if json_data and "calculations" in json_data:
        calc_counter = 1
        for user_id, calc_list in json_data["calculations"].items():
            if not isinstance(calc_list, list):
                calc_list = [calc_list]

            for calc in calc_list:
                calc_id = calc_counter

                # Store calculation hash
                r.hset(
                    f"calculation:{user_id}:{calc_id}",
                    mapping={
                        "id": str(calc_id),
                        "user_id": user_id,
                        "data": json.dumps(calc),
                        "created_at": "",
                    },
                )

                r.zadd(f"calculations:{user_id}", {str(calc_id): calc_id})

                print(f"  Migrated calculation {calc_id} from JSON")
                migrated += 1
                calc_counter += 1

    return migrated


def verify_migration(r: redis.Redis) -> Dict[str, int]:
    """Verify migrated data"""
    counts = {"users": 0, "entries": 0, "reports": 0, "calculations": 0}

    # Count users
    user_keys = r.keys("user:*")
    counts["users"] = len(user_keys)

    # Count entries
    entry_keys = r.keys("entry:*")
    counts["entries"] = len(entry_keys)

    # Count reports
    report_keys = r.keys("report:*")
    counts["reports"] = len(report_keys)

    # Count calculations
    calc_keys = r.keys("calculation:*")
    counts["calculations"] = len(calc_keys)

    return counts


def create_backups():
    """Create backups of source files"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if os.path.exists(JSON_PATH):
        backup_path = f"{JSON_PATH}.backup.{timestamp}"
        os.rename(JSON_PATH, backup_path)
        print(f"[OK] Created JSON backup: {backup_path}")

    # Note: SQLite backup would require copying the file
    # We'll keep SQLite as backup for now


def main():
    """Main migration function"""
    print("=" * 70)
    print("SQLite/JSON to Redis Migration Tool")
    print("Phase 1: Redis-First Architecture")
    print("=" * 70)
    print()

    # Connect to Redis
    print("[...] Connecting to Redis...")
    r = connect_redis()
    print(f"[OK] Connected to Redis at {REDIS_URL}")
    print()

    # Connect to SQLite (optional)
    conn = None
    if os.path.exists(DB_PATH):
        print("[...] Connecting to SQLite...")
        conn = connect_sqlite()
        if conn:
            print(f"[OK] Connected to SQLite at {DB_PATH}")
        print()
    else:
        print("[!] SQLite database not found, skipping SQLite migration")
        print()

    # Read JSON data (optional)
    json_data = None
    if os.path.exists(JSON_PATH):
        print("[...] Reading JSON data...")
        json_data = read_json_data()
        print(f"[OK] Read JSON data: {len(json_data)} keys")
        print()
    else:
        print("[!] JSON file not found, skipping JSON migration")
        print()

    # Migrate data
    try:
        print("[...] Migrating users to Redis...")
        user_count = migrate_users_to_redis(r, conn, json_data)
        print(f"[OK] Migrated {user_count} users\n")

        print("[...] Migrating entries to Redis...")
        entry_count = migrate_entries_to_redis(r, conn, json_data)
        print(f"[OK] Migrated {entry_count} entries\n")

        print("[...] Migrating reports to Redis...")
        report_count = migrate_reports_to_redis(r, conn, json_data)
        print(f"[OK] Migrated {report_count} reports\n")

        print("[...] Migrating calculations to Redis...")
        calc_count = migrate_calculations_to_redis(r, conn, json_data)
        print(f"[OK] Migrated {calc_count} calculations\n")

    except Exception as e:
        print(f"[X] Error during migration: {e}")
        if conn:
            conn.close()
        sys.exit(1)

    # Close SQLite connection
    if conn:
        conn.close()

    # Verify migration
    print("[...] Verifying migration...")
    counts = verify_migration(r)
    print(f"   Users in Redis: {counts['users']}")
    print(f"   Entries in Redis: {counts['entries']}")
    print(f"   Reports in Redis: {counts['reports']}")
    print(f"   Calculations in Redis: {counts['calculations']}")
    print()

    # Create backups
    print("[...] Creating backups...")
    create_backups()
    print()

    print("=" * 70)
    print("[OK] Migration completed successfully!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Update Next.js API routes to use Redis client")
    print("2. Remove JSON storage code")
    print("3. Test application with Redis as primary storage")
    print("4. Optionally: Update Python API to also use Redis")
    print()


if __name__ == "__main__":
    main()
