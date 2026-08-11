"""Persistence for editable 14-day templates and immutable plan revisions."""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional


CYCLE_COLUMNS = {
    "plan_mode": "TEXT NOT NULL DEFAULT 'standard'",
    "timeline_days": "INTEGER",
    "template_id": "TEXT",
    "template_revision_id": "TEXT",
    "plan_snapshot_json": "TEXT",
    "current_plan_revision": "INTEGER NOT NULL DEFAULT 0",
    "protocol_id": "TEXT",
    "protocol_version": "TEXT",
    "protocol_status": "TEXT NOT NULL DEFAULT 'not_provided'",
    "protocol_start_week": "INTEGER",
    "protocol_snapshot_json": "TEXT",
    "safety_acknowledged_at": "TEXT",
}


def _json_dump(value: Any) -> Optional[str]:
    return None if value is None else json.dumps(value, separators=(",", ":"))


def _json_load(value: Any, fallback: Any = None) -> Any:
    if value in (None, ""):
        return fallback
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return fallback


def initialize_challenge_schema(conn: sqlite3.Connection) -> None:
    """Apply idempotent challenge schema additions to an open connection."""
    cycle_columns = {row[1] for row in conn.execute("PRAGMA table_info(cycles)")}
    for name, definition in CYCLE_COLUMNS.items():
        if name not in cycle_columns:
            conn.execute(f"ALTER TABLE cycles ADD COLUMN {name} {definition}")

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS challenge_templates (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default',
            name TEXT NOT NULL,
            duration_days INTEGER NOT NULL DEFAULT 14,
            status TEXT NOT NULL DEFAULT 'draft',
            current_revision_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS challenge_template_revisions (
            id TEXT PRIMARY KEY,
            template_id TEXT NOT NULL,
            revision_number INTEGER NOT NULL,
            raw_source TEXT NOT NULL,
            structured_json TEXT NOT NULL,
            source_sha256 TEXT NOT NULL,
            validation_status TEXT NOT NULL DEFAULT 'draft',
            revision_note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(template_id, revision_number),
            FOREIGN KEY(template_id) REFERENCES challenge_templates(id)
        );

        CREATE TABLE IF NOT EXISTS challenge_plan_revisions (
            id TEXT PRIMARY KEY,
            cycle_id TEXT NOT NULL,
            revision_number INTEGER NOT NULL,
            template_revision_id TEXT NOT NULL,
            protocol_id TEXT NOT NULL,
            protocol_version TEXT NOT NULL,
            protocol_start_week INTEGER NOT NULL,
            protocol_snapshot_json TEXT NOT NULL,
            calculation_snapshot_json TEXT NOT NULL,
            plan_snapshot_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cycle_id, revision_number),
            FOREIGN KEY(cycle_id) REFERENCES cycles(id)
        );

        CREATE TABLE IF NOT EXISTS challenge_amendments (
            id TEXT PRIMARY KEY,
            cycle_id TEXT NOT NULL,
            effective_day INTEGER NOT NULL,
            effective_date TEXT,
            reason TEXT NOT NULL,
            patch_json TEXT NOT NULL,
            previous_plan_revision INTEGER NOT NULL,
            new_plan_revision INTEGER NOT NULL,
            safety_acknowledgement_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(cycle_id) REFERENCES cycles(id)
        );

        CREATE TABLE IF NOT EXISTS challenge_daily_logs (
            id TEXT PRIMARY KEY,
            cycle_id TEXT NOT NULL,
            day_number INTEGER NOT NULL,
            date TEXT NOT NULL,
            plan_revision INTEGER NOT NULL,
            calories REAL,
            protein_g REAL,
            steps INTEGER,
            training_completed INTEGER NOT NULL DEFAULT 0,
            cardio_completed INTEGER NOT NULL DEFAULT 0,
            sleep_hours REAL,
            resting_hr REAL,
            bp_systolic REAL,
            bp_diastolic REAL,
            waist REAL,
            photo_refs_json TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cycle_id, day_number),
            FOREIGN KEY(cycle_id) REFERENCES cycles(id)
        );

        CREATE INDEX IF NOT EXISTS idx_challenge_templates_user
            ON challenge_templates(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_challenge_plan_revisions_cycle
            ON challenge_plan_revisions(cycle_id, revision_number DESC);
        CREATE INDEX IF NOT EXISTS idx_challenge_daily_logs_cycle
            ON challenge_daily_logs(cycle_id, day_number);
        """
    )


class ChallengeRepository:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            data_dir = Path(os.environ.get("DATA_DIR") or Path(__file__).resolve().parent.parent / "data")
            db_path = str(data_dir / "bodyfat.db")
        self.db_path = str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            initialize_challenge_schema(conn)
            conn.commit()

    def _rows(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            return [dict(row) for row in conn.execute(query, params)]

    @staticmethod
    def _decode(row: Dict[str, Any], *fields: str) -> Dict[str, Any]:
        for field in fields:
            row[field] = _json_load(row.get(field))
        for field in ("training_completed", "cardio_completed"):
            if field in row:
                row[field] = bool(row[field])
        return row

    def create_template(
        self,
        name: str,
        duration_days: int,
        raw_source: str,
        structured: Dict[str, Any],
        source_sha256: str,
        revision_note: str,
        user_id: str = "default",
        status: str = "draft",
    ) -> Dict[str, Any]:
        template_id = str(uuid.uuid4())
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO challenge_templates (id,user_id,name,duration_days,status) VALUES (?,?,?,?,?)",
                (template_id, user_id, name, duration_days, status),
            )
            revision = self._insert_revision(
                conn, template_id, 1, raw_source, structured, source_sha256, revision_note
            )
            conn.execute(
                "UPDATE challenge_templates SET current_revision_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (revision["id"], template_id),
            )
            conn.commit()
        return {
            "id": template_id,
            "user_id": user_id,
            "name": name,
            "duration_days": duration_days,
            "status": status,
            "current_revision_id": revision["id"],
            "current_revision": revision,
        }

    def _insert_revision(
        self,
        conn: sqlite3.Connection,
        template_id: str,
        revision_number: int,
        raw_source: str,
        structured: Dict[str, Any],
        source_sha256: str,
        revision_note: str,
        validation_status: str = "draft",
    ) -> Dict[str, Any]:
        revision_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO challenge_template_revisions
               (id,template_id,revision_number,raw_source,structured_json,source_sha256,
                validation_status,revision_note) VALUES (?,?,?,?,?,?,?,?)""",
            (
                revision_id, template_id, revision_number, raw_source,
                _json_dump(structured), source_sha256, validation_status, revision_note,
            ),
        )
        return {
            "id": revision_id,
            "template_id": template_id,
            "revision_number": revision_number,
            "raw_source": raw_source,
            "structured_json": structured,
            "source_sha256": source_sha256,
            "validation_status": validation_status,
            "revision_note": revision_note,
        }

    def add_template_revision(
        self,
        template_id: str,
        raw_source: str,
        structured: Dict[str, Any],
        source_sha256: str,
        revision_note: str,
        validation_status: str = "draft",
    ) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            if not conn.execute("SELECT 1 FROM challenge_templates WHERE id=?", (template_id,)).fetchone():
                raise ValueError(f"Unknown challenge template: {template_id}")
            revision_number = conn.execute(
                "SELECT COALESCE(MAX(revision_number),0)+1 FROM challenge_template_revisions WHERE template_id=?",
                (template_id,),
            ).fetchone()[0]
            revision = self._insert_revision(
                conn, template_id, revision_number, raw_source, structured,
                source_sha256, revision_note, validation_status,
            )
            conn.execute(
                "UPDATE challenge_templates SET current_revision_id=?,status='draft',updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (revision["id"], template_id),
            )
            conn.commit()
            return revision

    def get_templates(self, user_id: str = "default") -> List[Dict[str, Any]]:
        templates = self._rows(
            "SELECT * FROM challenge_templates WHERE user_id=? ORDER BY updated_at DESC", (user_id,)
        )
        for template in templates:
            revisions = self.get_template_revisions(template["id"])
            template["current_revision"] = next(
                (row for row in revisions if row["id"] == template.get("current_revision_id")),
                revisions[0] if revisions else None,
            )
        return templates

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        rows = self._rows("SELECT * FROM challenge_templates WHERE id=?", (template_id,))
        if not rows:
            return None
        template = rows[0]
        revisions = self.get_template_revisions(template_id)
        template["revisions"] = revisions
        template["current_revision"] = next(
            (row for row in revisions if row["id"] == template.get("current_revision_id")),
            revisions[0] if revisions else None,
        )
        return template

    def set_template_status(self, template_id: str, status: str) -> Dict[str, Any]:
        if status not in {"draft", "active", "archived"}:
            raise ValueError(f"Unsupported template status: {status}")
        with sqlite3.connect(self.db_path) as conn:
            changed = conn.execute(
                "UPDATE challenge_templates SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (status, template_id),
            ).rowcount
            conn.commit()
        if not changed:
            raise ValueError(f"Unknown challenge template: {template_id}")
        return self.get_template(template_id) or {}

    def get_template_revisions(self, template_id: str) -> List[Dict[str, Any]]:
        rows = self._rows(
            "SELECT * FROM challenge_template_revisions WHERE template_id=? ORDER BY revision_number DESC",
            (template_id,),
        )
        return [self._decode(row, "structured_json") for row in rows]

    def save_plan_revision(
        self,
        cycle_id: str,
        revision_number: int,
        template_revision_id: str,
        protocol_id: str,
        protocol_version: str,
        protocol_start_week: int,
        protocol_snapshot: Dict[str, Any],
        calculation_snapshot: Dict[str, Any],
        plan_snapshot: Dict[str, Any],
    ) -> Dict[str, Any]:
        revision_id = str(uuid.uuid4())
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO challenge_plan_revisions
                   (id,cycle_id,revision_number,template_revision_id,protocol_id,protocol_version,
                    protocol_start_week,protocol_snapshot_json,calculation_snapshot_json,plan_snapshot_json)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    revision_id, cycle_id, revision_number, template_revision_id,
                    protocol_id, protocol_version, protocol_start_week,
                    _json_dump(protocol_snapshot), _json_dump(calculation_snapshot), _json_dump(plan_snapshot),
                ),
            )
            conn.execute(
                """UPDATE cycles SET template_revision_id=?,current_plan_revision=?,protocol_id=?,
                   protocol_version=?,protocol_start_week=?,protocol_snapshot_json=?,plan_snapshot_json=?,
                   protocol_status='selected',updated_at=CURRENT_TIMESTAMP WHERE id=?""",
                (
                    template_revision_id, revision_number, protocol_id, protocol_version,
                    protocol_start_week, _json_dump(protocol_snapshot), _json_dump(plan_snapshot), cycle_id,
                ),
            )
            conn.commit()
        return {"id": revision_id, "cycle_id": cycle_id, "revision_number": revision_number}

    def get_plan_revisions(self, cycle_id: str) -> List[Dict[str, Any]]:
        rows = self._rows(
            "SELECT * FROM challenge_plan_revisions WHERE cycle_id=? ORDER BY revision_number DESC",
            (cycle_id,),
        )
        return [
            self._decode(row, "protocol_snapshot_json", "calculation_snapshot_json", "plan_snapshot_json")
            for row in rows
        ]

    def get_cycle(self, cycle_id: str) -> Optional[Dict[str, Any]]:
        rows = self._rows("SELECT * FROM cycles WHERE id=?", (cycle_id,))
        if not rows:
            return None
        return self._decode(rows[0], "weighin_days", "plan_snapshot_json", "protocol_snapshot_json")

    def save_amendment(
        self,
        amendment_id: str,
        cycle_id: str,
        effective_day: int,
        reason: str,
        patch: Dict[str, Any],
        previous_plan_revision: int,
        new_plan_revision: int,
        effective_date: Optional[str] = None,
        safety_acknowledgement: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO challenge_amendments
                   (id,cycle_id,effective_day,effective_date,reason,patch_json,previous_plan_revision,
                    new_plan_revision,safety_acknowledgement_json) VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    amendment_id, cycle_id, effective_day, effective_date, reason,
                    _json_dump(patch), previous_plan_revision, new_plan_revision,
                    _json_dump(safety_acknowledgement),
                ),
            )
            conn.commit()
        return {"id": amendment_id, "cycle_id": cycle_id, "effective_day": effective_day}

    def get_amendments(self, cycle_id: str) -> List[Dict[str, Any]]:
        rows = self._rows(
            "SELECT * FROM challenge_amendments WHERE cycle_id=? ORDER BY effective_day,created_at",
            (cycle_id,),
        )
        return [self._decode(row, "patch_json", "safety_acknowledgement_json") for row in rows]

    def save_daily_log(
        self,
        cycle_id: str,
        day_number: int,
        plan_revision: int,
        values: Dict[str, Any],
    ) -> Dict[str, Any]:
        log_id = values.get("id") or str(uuid.uuid4())
        fields = (
            "date", "calories", "protein_g", "steps", "training_completed", "cardio_completed",
            "sleep_hours", "resting_hr", "bp_systolic", "bp_diastolic", "waist", "notes",
        )
        data = {field: values.get(field) for field in fields}
        data["training_completed"] = int(bool(data["training_completed"]))
        data["cardio_completed"] = int(bool(data["cardio_completed"]))
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO challenge_daily_logs
                   (id,cycle_id,day_number,date,plan_revision,calories,protein_g,steps,
                    training_completed,cardio_completed,sleep_hours,resting_hr,bp_systolic,
                    bp_diastolic,waist,photo_refs_json,notes)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(cycle_id,day_number) DO UPDATE SET
                    date=excluded.date,plan_revision=excluded.plan_revision,calories=excluded.calories,
                    protein_g=excluded.protein_g,steps=excluded.steps,
                    training_completed=excluded.training_completed,cardio_completed=excluded.cardio_completed,
                    sleep_hours=excluded.sleep_hours,resting_hr=excluded.resting_hr,
                    bp_systolic=excluded.bp_systolic,bp_diastolic=excluded.bp_diastolic,
                    waist=excluded.waist,photo_refs_json=excluded.photo_refs_json,notes=excluded.notes,
                    updated_at=CURRENT_TIMESTAMP""",
                (
                    log_id, cycle_id, day_number, data["date"], plan_revision, data["calories"],
                    data["protein_g"], data["steps"], data["training_completed"], data["cardio_completed"],
                    data["sleep_hours"], data["resting_hr"], data["bp_systolic"], data["bp_diastolic"],
                    data["waist"], _json_dump(values.get("photo_refs")), data["notes"],
                ),
            )
            conn.commit()
        return {"id": log_id, "cycle_id": cycle_id, "day_number": day_number}

    def get_daily_logs(self, cycle_id: str) -> List[Dict[str, Any]]:
        rows = self._rows(
            "SELECT * FROM challenge_daily_logs WHERE cycle_id=? ORDER BY day_number", (cycle_id,)
        )
        return [self._decode(row, "photo_refs_json") for row in rows]
