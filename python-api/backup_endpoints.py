"""
Backup API Endpoints
Provides REST API for backup operations to ensure zero data loss.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backup_system import get_backup_system

router = APIRouter(prefix="/api/backup", tags=["backup"])


class BackupRequest(BaseModel):
    label: Optional[str] = None


class RestoreRequest(BaseModel):
    backup_path: str


@router.post("/create")
async def create_backup(request: BackupRequest = None) -> Dict[str, Any]:
    """
    Create a full database backup.

    Args:
        label: Optional label for the backup (e.g., 'pre-migration')

    Returns:
        Backup metadata including path, timestamp, and checksum
    """
    try:
        backup_system = get_backup_system()
        label = request.label if request else None
        result = backup_system.create_backup(label=label)
        return {
            "success": True,
            "message": "Backup created successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


@router.post("/export")
async def export_to_json() -> Dict[str, Any]:
    """
    Export all data to JSON format.

    Returns:
        Export metadata including path and counts
    """
    try:
        backup_system = get_backup_system()
        result = backup_system.export_to_json()
        return {
            "success": True,
            "message": "Data exported successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/restore")
async def restore_from_backup(request: RestoreRequest) -> Dict[str, Any]:
    """
    Restore database from a backup file.

    Args:
        backup_path: Path to the backup .db file

    Returns:
        Restore status and verification results
    """
    try:
        backup_system = get_backup_system()
        result = backup_system.restore_from_backup(request.backup_path)
        return {
            "success": True,
            "message": "Database restored successfully",
            "data": result
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")


@router.get("/verify")
async def verify_integrity() -> Dict[str, Any]:
    """
    Verify database integrity and entry count.

    Returns:
        Integrity verification results including entry count check
    """
    try:
        backup_system = get_backup_system()
        result = backup_system.verify_integrity()
        return {
            "success": result["status"] == "OK",
            "message": f"Integrity check: {result['status']}",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/list")
async def list_backups() -> Dict[str, Any]:
    """
    List all available backups.

    Returns:
        List of backup files with metadata
    """
    try:
        backup_system = get_backup_system()
        backups = backup_system.list_backups()
        return {
            "success": True,
            "message": f"Found {len(backups)} backup(s)",
            "data": backups
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"List failed: {str(e)}")
