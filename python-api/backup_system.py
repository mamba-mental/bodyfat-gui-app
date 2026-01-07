"""
Backup System for BodyFat GUI App
Ensures zero data loss during migrations and updates.
"""

import sqlite3
import json
import os
import shutil
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple


class BackupSystem:
    """Handles database backups, exports, and integrity verification."""

    def __init__(self, db_path: str = None, backup_dir: str = None):
        if db_path is None:
            data_dir_env = os.environ.get('DATA_DIR')
            if data_dir_env:
                data_dir = Path(data_dir_env)
            else:
                data_dir = Path(__file__).parent.parent / "data"
            db_path = data_dir / "bodyfat.db"

        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir) if backup_dir else self.db_path.parent / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def create_backup(self, label: str = None) -> Dict[str, Any]:
        """
        Create a full backup of the SQLite database.

        Args:
            label: Optional label for the backup (e.g., 'pre-migration')

        Returns:
            Dict with backup metadata including path, timestamp, and checksum
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        label_suffix = f"_{label}" if label else ""
        backup_filename = f"bodyfat_backup_{timestamp}{label_suffix}.db"
        backup_path = self.backup_dir / backup_filename

        # Copy the database file
        shutil.copy2(self.db_path, backup_path)

        # Calculate checksum
        checksum = self._calculate_checksum(backup_path)

        # Get entry count for verification
        entry_count = self._get_entry_count()

        # Create metadata file
        metadata = {
            "backup_path": str(backup_path),
            "original_path": str(self.db_path),
            "timestamp": timestamp,
            "label": label,
            "checksum": checksum,
            "entry_count": entry_count,
            "created_at": datetime.now().isoformat()
        }

        metadata_path = backup_path.with_suffix(".json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        return metadata

    def export_to_json(self, output_path: str = None) -> Dict[str, Any]:
        """
        Export all data to JSON format for portability.

        Returns:
            Dict containing all exported data with metadata
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if output_path is None:
            output_path = self.backup_dir / f"bodyfat_export_{timestamp}.json"
        else:
            output_path = Path(output_path)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            # Export users
            users = []
            cursor = conn.execute("SELECT * FROM users")
            for row in cursor:
                users.append({
                    "id": row["id"],
                    "name": row["name"],
                    "data": json.loads(row["data"]),
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"]
                })

            # Export entries (CRITICAL - must preserve all 12)
            entries = []
            cursor = conn.execute("SELECT * FROM entries ORDER BY date DESC")
            for row in cursor:
                entries.append({
                    "id": row["id"],
                    "user_id": row["user_id"],
                    "date": row["date"],
                    "weight": row["weight"],
                    "body_fat_percentage": row["body_fat_percentage"],
                    "notes": row["notes"],
                    "program_id": row["program_id"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"]
                })

            # Export reports
            reports = []
            cursor = conn.execute("SELECT * FROM reports ORDER BY date DESC")
            for row in cursor:
                reports.append({
                    "id": row["id"],
                    "user_id": row["user_id"],
                    "title": row["title"],
                    "date": row["date"],
                    "data": json.loads(row["data"]),
                    "file_path": row["file_path"],
                    "created_at": row["created_at"]
                })

            # Export calculations
            calculations = []
            cursor = conn.execute("SELECT * FROM calculations ORDER BY created_at DESC")
            for row in cursor:
                calculations.append({
                    "id": row["id"],
                    "user_id": row["user_id"],
                    "data": json.loads(row["data"]),
                    "created_at": row["created_at"]
                })

        export_data = {
            "metadata": {
                "exported_at": datetime.now().isoformat(),
                "source_db": str(self.db_path),
                "entry_count": len(entries),
                "report_count": len(reports),
                "user_count": len(users)
            },
            "users": users,
            "entries": entries,
            "reports": reports,
            "calculations": calculations
        }

        with open(output_path, "w") as f:
            json.dump(export_data, f, indent=2)

        return {
            "export_path": str(output_path),
            "metadata": export_data["metadata"]
        }

    def restore_from_backup(self, backup_path: str) -> Dict[str, Any]:
        """
        Restore database from a backup file.

        Args:
            backup_path: Path to the backup .db file

        Returns:
            Dict with restore status and verification results
        """
        backup_path = Path(backup_path)

        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        # Verify backup integrity
        metadata_path = backup_path.with_suffix(".json")
        if metadata_path.exists():
            with open(metadata_path) as f:
                metadata = json.load(f)

            current_checksum = self._calculate_checksum(backup_path)
            if current_checksum != metadata.get("checksum"):
                raise ValueError("Backup file checksum mismatch - file may be corrupted")

        # Create safety backup of current database before restore
        safety_backup = self.create_backup(label="pre-restore-safety")

        # Restore the backup
        shutil.copy2(backup_path, self.db_path)

        # Verify restoration
        restored_count = self._get_entry_count()

        return {
            "restored_from": str(backup_path),
            "safety_backup": safety_backup,
            "entry_count_after_restore": restored_count,
            "restored_at": datetime.now().isoformat()
        }

    def verify_integrity(self) -> Dict[str, Any]:
        """
        Verify database integrity and entry count.

        Returns:
            Dict with integrity verification results
        """
        results = {
            "verified_at": datetime.now().isoformat(),
            "database_path": str(self.db_path),
            "checks": {}
        }

        with sqlite3.connect(self.db_path) as conn:
            # Run SQLite integrity check
            cursor = conn.execute("PRAGMA integrity_check")
            integrity_result = cursor.fetchone()[0]
            results["checks"]["sqlite_integrity"] = integrity_result == "ok"

            # Count entries (CRITICAL - must be >= 12)
            cursor = conn.execute("SELECT COUNT(*) FROM entries WHERE user_id = 'default'")
            entry_count = cursor.fetchone()[0]
            results["checks"]["entry_count"] = entry_count
            results["checks"]["entry_count_sufficient"] = entry_count >= 12

            # Calculate data checksum
            cursor = conn.execute("""
                SELECT
                    SUM(weight) as weight_sum,
                    SUM(body_fat_percentage) as bf_sum,
                    COUNT(*) as count
                FROM entries WHERE user_id = 'default'
            """)
            row = cursor.fetchone()
            results["checks"]["data_checksum"] = {
                "weight_sum": row[0],
                "bf_sum": row[1],
                "count": row[2]
            }

            # Get date range
            cursor = conn.execute("""
                SELECT MIN(date), MAX(date)
                FROM entries WHERE user_id = 'default'
            """)
            row = cursor.fetchone()
            results["checks"]["date_range"] = {
                "earliest": row[0],
                "latest": row[1]
            }

        # Overall status
        results["status"] = "OK" if all([
            results["checks"]["sqlite_integrity"],
            results["checks"]["entry_count_sufficient"]
        ]) else "FAILED"

        return results

    def list_backups(self) -> list:
        """List all available backups."""
        backups = []

        for backup_file in self.backup_dir.glob("bodyfat_backup_*.db"):
            metadata_file = backup_file.with_suffix(".json")

            backup_info = {
                "path": str(backup_file),
                "filename": backup_file.name,
                "size_bytes": backup_file.stat().st_size,
                "created": datetime.fromtimestamp(backup_file.stat().st_mtime).isoformat()
            }

            if metadata_file.exists():
                with open(metadata_file) as f:
                    metadata = json.load(f)
                backup_info["metadata"] = metadata

            backups.append(backup_info)

        return sorted(backups, key=lambda x: x["created"], reverse=True)

    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def _get_entry_count(self) -> int:
        """Get count of entries in the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM entries WHERE user_id = 'default'")
            return cursor.fetchone()[0]


# Singleton instance for API use
_backup_system: Optional[BackupSystem] = None


def get_backup_system() -> BackupSystem:
    """Get or create the backup system singleton."""
    global _backup_system
    if _backup_system is None:
        _backup_system = BackupSystem()
    return _backup_system
