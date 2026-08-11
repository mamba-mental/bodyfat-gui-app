"""Source-bound PED protocol selection for the 14-day challenge.

This module intentionally does not recommend, rank, or invent compounds or doses.
It exposes only literal values from the checked-in protocol source and records the
source hash so a generated plan/report can be reproduced later.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PROTOCOL_PATH = PROJECT_ROOT / "docs" / "protocol-data" / "nutrition-and-ped.json"
WEEKDAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

COMPOUND_ALIASES = {
    "test": "testosterone",
    "testosterone": "testosterone",
    "eq": "equipoise",
    "equipoise": "equipoise",
    "deca": "deca",
    "tren": "trenbolone",
    "tren e": "trenbolone",
    "trenbolone": "trenbolone",
    "t3": "t3",
    "clen": "clenbuterol",
    "clenbuterol": "clenbuterol",
    "proviron": "proviron",
    "superdrol": "superdrol",
    "anavar": "anavar",
    "mk-677": "mk677",
    "mk677": "mk677",
    "winstrol": "winstrol",
}


def _source_path(path: Optional[str | Path]) -> Path:
    resolved = Path(path).resolve() if path else DEFAULT_PROTOCOL_PATH
    if not resolved.is_file():
        raise FileNotFoundError(f"PED protocol source not found: {resolved}")
    return resolved


def _load_source(path: Optional[str | Path] = None) -> tuple[Path, bytes, Dict[str, Any]]:
    resolved = _source_path(path)
    raw = resolved.read_bytes()
    return resolved, raw, json.loads(raw.decode("utf-8-sig"))


def load_protocol_catalog(path: Optional[str | Path] = None) -> Dict[str, Any]:
    """Return source metadata and valid consecutive two-week start positions."""
    resolved, raw, payload = _load_source(path)
    metadata = payload.get("_meta", {})
    timeline = payload.get("ped_protocol", {}).get("weekly_timeline", [])
    weeks = sorted(int(row["week"]) for row in timeline)
    week_set = set(weeks)
    available_starts = [week for week in weeks if week + 1 in week_set]
    version = str(metadata.get("extraction_date") or "unversioned")

    return {
        "protocol_id": f"mj-prime-ped-{version}",
        "version": version,
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "source_path": str(resolved),
        "source_files": metadata.get("source_files", []),
        "anti_fabrication_note": metadata.get("anti_fabrication_note"),
        "weekly_timeline_note": payload.get("ped_protocol", {}).get("weekly_timeline_note"),
        "available_weeks": weeks,
        "available_start_weeks": available_starts,
    }


def _is_active(value: Any) -> bool:
    normalized = str(value or "").strip().lower()
    return bool(normalized) and normalized not in {"off", "—", "-", "n/a", "none"}


def _canonical_compound(name: str) -> Optional[str]:
    normalized = re.sub(r"\s+", " ", name.strip().lower())
    normalized = re.sub(r"\s*\(.*?\)\s*", "", normalized).strip()
    return COMPOUND_ALIASES.get(normalized)


def _compound_names(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, str]]:
    names: Dict[str, str] = {}
    for row in rows:
        for raw_name, schedule in row.get("injectables_per_pin", {}).items():
            if any(_is_active(value) for value in schedule.values()):
                canonical = _canonical_compound(raw_name)
                if canonical:
                    names[canonical] = raw_name
        for timing in row.get("oral_and_daily_timing", {}).values():
            for segment in str(timing or "").split(","):
                raw_name, separator, value = segment.partition(":")
                if not separator or not _is_active(value):
                    continue
                canonical = _canonical_compound(raw_name)
                if canonical:
                    names[canonical] = raw_name.strip()
    return [
        {"compound": canonical, "source_name": names[canonical]}
        for canonical in sorted(names)
    ]


def _dose_metadata(value: str) -> Dict[str, Any]:
    """Parse source dose metadata without choosing a value from a range."""
    normalized = str(value or "").replace("—", "-").replace("–", "-")
    ranged = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(mcg|mg)\b", normalized, re.I)
    if ranged:
        return {
            "dose_range": [float(ranged.group(1)), float(ranged.group(2))],
            "dose_unit": ranged.group(3).lower(),
            "dose_resolution": "range_unresolved",
        }
    exact = re.search(r"(\d+(?:\.\d+)?)\s*(mcg|mg)\b", normalized, re.I)
    if exact:
        return {
            # The engine's historical field is named dose_mg even though T3/Clen
            # values are interpreted in mcg. Keep the API name for compatibility
            # and preserve the literal unit alongside it.
            "dose_mg": float(exact.group(1)),
            "dose_unit": exact.group(2).lower(),
            "dose_resolution": "exact_source_value",
        }
    return {"dose_resolution": "not_parsed"}


def _weekly_stack(row: Dict[str, Any], first_active_week: Dict[str, int]) -> List[Dict[str, Any]]:
    entries: Dict[str, Dict[str, Any]] = {}

    def include(raw_name: str, source_value: Any) -> None:
        canonical = _canonical_compound(raw_name)
        if not canonical or not _is_active(source_value):
            return
        entry = entries.setdefault(
            canonical,
            {
                "compound": canonical,
                "source_name": raw_name.strip(),
                "source_week": int(row["week"]),
                "phase": row.get("phase"),
                "week_on": int(row["week"]) - first_active_week.get(canonical, int(row["week"])) + 1,
                "source_values": [],
            },
        )
        literal = str(source_value).strip()
        if literal not in entry["source_values"]:
            entry["source_values"].append(literal)
        metadata = _dose_metadata(literal)
        # Exact values may feed the model. Ranges are deliberately retained as
        # ranges and never collapsed to a midpoint or other invented dose.
        if metadata.get("dose_resolution") == "range_unresolved":
            entry.update(metadata)
            entry.pop("dose_mg", None)
        elif "dose_mg" in metadata and "dose_range" not in entry:
            entry.update(metadata)

    for raw_name, schedule in row.get("injectables_per_pin", {}).items():
        for source_value in schedule.values():
            include(raw_name, source_value)
    for timing in row.get("oral_and_daily_timing", {}).values():
        for segment in re.split(r",|\+", str(timing or "")):
            raw_name, separator, source_value = segment.partition(":")
            if separator:
                include(raw_name, source_value)
    return [entries[key] for key in sorted(entries)]


def select_protocol_window(
    start_week: int,
    path: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """Map two consecutive sourced protocol weeks onto exactly fourteen days."""
    _, _, payload = _load_source(path)
    catalog = load_protocol_catalog(path)
    by_week = {
        int(row["week"]): row
        for row in payload.get("ped_protocol", {}).get("weekly_timeline", [])
    }
    for required_week in (int(start_week), int(start_week) + 1):
        if required_week not in by_week:
            raise ValueError(
                f"Cannot build a 14-day PED schedule: source week {required_week} is missing"
            )

    selected = [by_week[int(start_week)], by_week[int(start_week) + 1]]
    all_rows = [by_week[key] for key in sorted(by_week)]
    first_active_week: Dict[str, int] = {}
    for row in all_rows:
        for entry in _compound_names([row]):
            first_active_week.setdefault(entry["compound"], int(row["week"]))
    ped_stack_by_week = {
        str(index + 1): _weekly_stack(row, first_active_week)
        for index, row in enumerate(selected)
    }
    days: List[Dict[str, Any]] = []
    for week_offset, source_week in enumerate(selected):
        injectables = source_week.get("injectables_per_pin", {})
        for day_index, weekday in enumerate(WEEKDAYS):
            day_injections = []
            for source_name, schedule in injectables.items():
                source_value = schedule.get(weekday)
                if not _is_active(source_value):
                    continue
                day_injections.append(
                    {
                        "compound": _canonical_compound(source_name) or source_name,
                        "source_name": source_name,
                        "source_value": source_value,
                    }
                )
            days.append(
                {
                    "day_number": week_offset * 7 + day_index + 1,
                    "weekday": weekday,
                    "source_week": int(source_week["week"]),
                    "phase": source_week.get("phase"),
                    "injections": day_injections,
                    "oral_and_daily_timing": source_week.get("oral_and_daily_timing", {}),
                    "source": source_week.get("source"),
                }
            )

    return {
        "protocol_id": catalog["protocol_id"],
        "version": catalog["version"],
        "source_sha256": catalog["source_sha256"],
        "start_week": int(start_week),
        "end_week": int(start_week) + 1,
        "days": days,
        "ped_stack": _compound_names(selected),
        "ped_stack_by_week": ped_stack_by_week,
        "unresolved_dose_compounds": sorted({
            entry["compound"]
            for stack in ped_stack_by_week.values()
            for entry in stack
            if entry.get("dose_resolution") in {"range_unresolved", "not_parsed"}
        }),
        "member_confirmation_required": True,
        "clinical_review_status": "not_recorded",
        "source_note": catalog.get("weekly_timeline_note"),
        "anti_fabrication_note": catalog.get("anti_fabrication_note"),
    }
