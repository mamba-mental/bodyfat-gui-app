"""SQLite persistence for manually confirmed PED inventory records."""

from __future__ import annotations

import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional


def initialize_ped_inventory_schema(conn: sqlite3.Connection) -> None:
    """Apply the additive inventory schema to an open SQLite connection."""
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS ped_inventory_items (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'default',
            label_name TEXT NOT NULL,
            canonical_compound TEXT NOT NULL,
            formulation TEXT NOT NULL,
            strength_value TEXT NOT NULL,
            strength_unit TEXT NOT NULL,
            available_units TEXT NOT NULL,
            inventory_unit TEXT NOT NULL,
            expiration_date TEXT NOT NULL,
            lot_reference TEXT,
            source_note TEXT,
            confirmed INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_ped_inventory_user_compound
            ON ped_inventory_items(user_id, canonical_compound, status, expiration_date);
        """
    )


class PedInventoryRepository:
    """Small repository with explicit mutation boundaries and deterministic ordering."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            data_dir = Path(os.environ.get("DATA_DIR") or Path(__file__).resolve().parent.parent / "data")
            db_path = str(data_dir / "bodyfat.db")
        self.db_path = str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            initialize_ped_inventory_schema(conn)
            conn.commit()

    @staticmethod
    def _decode(row: sqlite3.Row) -> Dict[str, Any]:
        item = dict(row)
        item["confirmed"] = bool(item.get("confirmed"))
        return item

    def list_items(self, user_id: str = "default") -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """SELECT * FROM ped_inventory_items WHERE user_id=?
                   ORDER BY canonical_compound, expiration_date, created_at, id""",
                (user_id,),
            )
            return [self._decode(row) for row in rows]

    def get_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM ped_inventory_items WHERE id=?", (item_id,)).fetchone()
            return self._decode(row) if row else None

    def create_item(self, values: Dict[str, Any]) -> Dict[str, Any]:
        item_id = str(values.get("id") or uuid.uuid4())
        fields = self._stored_fields(values)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO ped_inventory_items
                   (id,user_id,label_name,canonical_compound,formulation,strength_value,
                    strength_unit,available_units,inventory_unit,expiration_date,lot_reference,
                    source_note,confirmed,status)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (item_id, *fields),
            )
            conn.commit()
        return self.get_item(item_id) or {}

    def update_item(self, item_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        current = self.get_item(item_id)
        if not current:
            raise ValueError(f"Unknown PED inventory item: {item_id}")
        merged = {**current, **values, "id": item_id}
        fields = self._stored_fields(merged)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """UPDATE ped_inventory_items SET
                   user_id=?,label_name=?,canonical_compound=?,formulation=?,strength_value=?,
                   strength_unit=?,available_units=?,inventory_unit=?,expiration_date=?,lot_reference=?,
                   source_note=?,confirmed=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?""",
                (*fields, item_id),
            )
            conn.commit()
        return self.get_item(item_id) or {}

    def delete_item(self, item_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            changed = conn.execute("DELETE FROM ped_inventory_items WHERE id=?", (item_id,)).rowcount
            conn.commit()
        return bool(changed)

    @staticmethod
    def _stored_fields(values: Dict[str, Any]) -> tuple:
        return (
            str(values.get("user_id") or "default"),
            str(values["label_name"]).strip(),
            str(values["canonical_compound"]).strip().lower(),
            str(values["formulation"]).strip().lower(),
            str(values["strength_value"]),
            str(values["strength_unit"]).strip().lower(),
            str(values["available_units"]),
            str(values["inventory_unit"]).strip(),
            str(values["expiration_date"]),
            values.get("lot_reference"),
            values.get("source_note"),
            int(bool(values.get("confirmed"))),
            str(values.get("status") or "active").strip().lower(),
        )
