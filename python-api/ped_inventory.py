"""Deterministic source-event parsing and confirmed-inventory allocation.

Inventory is treated only as a supply constraint. This module does not select a
protocol, recommend a compound, resolve a source range, or claim medical safety.
"""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Tuple

from challenge_protocol import canonicalize_compound, parse_source_dose


def _decimal(value: Any) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"Invalid decimal inventory value: {value}") from exc


def _text(value: Decimal) -> str:
    normalized = value.normalize()
    return format(normalized, "f") if normalized != normalized.to_integral() else str(normalized.quantize(Decimal("1")))


def _block(code: str, message: str, compound: str | None = None, **context: Any) -> Dict[str, Any]:
    return {
        "code": code,
        "severity": "critical",
        "message": message,
        **({"compound": compound} if compound else {}),
        **context,
    }


def _resolution_map(rows: Iterable[Dict[str, Any]]) -> Dict[Tuple[str, str], Dict[str, Any]]:
    return {
        (str(row.get("compound", "")).lower(), str(row.get("source_value", "")).strip()): row
        for row in rows
    }


def _parse_event(
    compound: str,
    source_name: str,
    source_value: str,
    resolutions: Dict[Tuple[str, str], Dict[str, Any]],
) -> Tuple[Decimal | None, str | None, Dict[str, Any] | None, Dict[str, Any] | None]:
    metadata = parse_source_dose(source_value)
    resolution = metadata.get("dose_resolution")
    if resolution == "exact_source_value":
        return _decimal(metadata["dose_mg"]), metadata["dose_unit"], None, None
    if resolution == "not_parsed":
        return None, None, None, _block(
            "unparsed_source_value", f"{source_name} has an unparsed source value: {source_value}", compound, source_value=source_value
        )
    requirement = {
        "compound": compound,
        "source_name": source_name,
        "source_value": source_value,
        "minimum": _text(_decimal(metadata["dose_range"][0])),
        "maximum": _text(_decimal(metadata["dose_range"][1])),
        "unit": metadata["dose_unit"],
    }
    selected = resolutions.get((compound, source_value.strip()))
    if not selected:
        return None, metadata["dose_unit"], requirement, _block(
            "unresolved_source_range", f"{source_name} still has an unresolved source range: {source_value}", compound, source_value=source_value
        )
    value = _decimal(selected.get("selected_value"))
    unit = str(selected.get("unit", "")).lower()
    low, high = map(_decimal, metadata["dose_range"])
    if unit != metadata["dose_unit"] or value < low or value > high:
        return None, metadata["dose_unit"], requirement, _block(
            "range_selection_outside_source",
            f"The reviewed value for {source_name} must remain within {source_value}",
            compound,
            source_value=source_value,
        )
    return value, unit, requirement, None


def _event_rows(protocol: Dict[str, Any], resolutions: List[Dict[str, Any]], start: date) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    events: List[Dict[str, Any]] = []
    requirements: Dict[Tuple[str, str], Dict[str, Any]] = {}
    blockers: List[Dict[str, Any]] = []
    by_range = _resolution_map(resolutions)
    for day in protocol.get("days", []):
        day_number = int(day.get("day_number", 0))
        event_date = (start + timedelta(days=day_number - 1)).isoformat()
        raw_events = [(row.get("source_name"), row.get("source_value"), "injection") for row in day.get("injections", [])]
        for timing, value in day.get("oral_and_daily_timing", {}).items():
            for segment in re.split(r",|\+", str(value or "")):
                source_name, separator, source_value = segment.partition(":")
                if separator:
                    raw_events.append((source_name.strip(), source_value.strip(), timing))
        for source_name, source_value, timing in raw_events:
            compound = canonicalize_compound(str(source_name))
            if not compound:
                blockers.append(_block("unknown_compound", f"Unknown source compound: {source_name}"))
                continue
            amount, unit, requirement, blocker = _parse_event(compound, str(source_name), str(source_value), by_range)
            if requirement:
                key = (compound, str(source_value).strip())
                requirements.setdefault(key, {**requirement, "occurrence_count": 0})["occurrence_count"] += 1
            if blocker:
                blockers.append(blocker)
                continue
            events.append({
                "day_number": day_number,
                "date": event_date,
                "compound": compound,
                "source_name": str(source_name).strip(),
                "timing": timing,
                "formulation": "injectable" if timing == "injection" else "oral",
                "source_value": str(source_value).strip(),
                "amount": _text(amount or Decimal("0")),
                "unit": unit,
                "resolution": "reviewed_range_selection" if requirement else "exact_source_value",
                "allocations": [],
            })
    return events, list(requirements.values()), _dedupe(blockers)


def _prepare_inventory(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    prepared = []
    for item in items:
        row = dict(item)
        row["canonical_compound"] = str(row.get("canonical_compound", "")).lower()
        row["formulation"] = str(row.get("formulation", "")).lower()
        row["strength_unit"] = str(row.get("strength_unit", "")).lower()
        try:
            row["strength"] = _decimal(row.get("strength_value"))
            row["starting_amount"] = row["strength"] * _decimal(row.get("available_units"))
        except ValueError:
            row["starting_amount"] = Decimal("0")
        row["remaining_amount"] = row["starting_amount"]
        prepared.append(row)
    return prepared


def _eligible(item: Dict[str, Any], event: Dict[str, Any]) -> bool:
    return (
        item.get("status") == "active"
        and bool(item.get("confirmed"))
        and item.get("formulation") == event.get("formulation")
        and item.get("strength_unit") == event.get("unit")
        and str(item.get("expiration_date")) >= str(event.get("date"))
        and item.get("remaining_amount", Decimal("0")) > 0
    )


def _allocate_event(event: Dict[str, Any], candidates: List[Dict[str, Any]]) -> Decimal:
    needed = _decimal(event["amount"])
    compatible = []
    for item in sorted(candidates, key=lambda row: (str(row.get("expiration_date")), str(row.get("id")))):
        if not _eligible(item, event):
            continue
        unit = str(item.get("inventory_unit"))
        strength = item["strength"]
        if unit in {"tablet", "capsule"} and needed % strength != 0:
            continue
        compatible.append(item)
    for item in compatible:
        if needed <= 0:
            break
        take = min(needed, item["remaining_amount"])
        if str(item.get("inventory_unit")) in {"tablet", "capsule"}:
            take = (take // item["strength"]) * item["strength"]
        if take <= 0:
            continue
        item["remaining_amount"] -= take
        needed -= take
        event["allocations"].append({
            "inventory_item_id": item.get("id"),
            "label_name": item.get("label_name"),
            "expiration_date": item.get("expiration_date"),
            "amount": _text(take),
            "unit": event["unit"],
            "inventory_units": _text(take / item["strength"]),
        })
    return needed


def _allocation_block(compound: str, unit: str, event: Dict[str, Any], candidates: List[Dict[str, Any]], shortage: Decimal) -> Dict[str, Any]:
    active = [row for row in candidates if row.get("status") == "active"]
    confirmed = [row for row in active if row.get("confirmed")]
    matching_unit = [row for row in confirmed if row.get("strength_unit") == unit]
    matching = [row for row in matching_unit if row.get("formulation") == event.get("formulation")]
    if any(not row.get("confirmed") for row in active):
        code, reason = "unconfirmed_inventory", "Only unconfirmed inventory is available"
    elif confirmed and not matching_unit:
        code, reason = "unit_mismatch", f"Confirmed inventory does not use {unit}"
    elif matching_unit and not matching:
        code, reason = "formulation_mismatch", f"Confirmed inventory is not {event.get('formulation')}"
    elif matching and all(str(row.get("expiration_date")) < str(event.get("date")) for row in matching):
        code, reason = "expired_inventory", f"Matching inventory is expired by {event.get('date')}"
    elif matching and all(str(row.get("inventory_unit")) in {"tablet", "capsule"} for row in matching):
        code, reason = "non_divisible_inventory_unit", "Available tablet or capsule strengths cannot represent the sourced event exactly"
    else:
        code, reason = "insufficient_inventory", "Confirmed inventory is missing or insufficient"
    return _block(code, f"{compound}: {reason}; shortage {_text(shortage)} {unit}", compound, day_number=event.get("day_number"))


def _dedupe(blockers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    unique = {}
    for blocker in blockers:
        key = (blocker.get("code"), blocker.get("compound"), blocker.get("source_value"), blocker.get("message"))
        unique.setdefault(key, blocker)
    return list(unique.values())


def build_inventory_coverage(
    protocol: Dict[str, Any],
    inventory_items: List[Dict[str, Any]],
    start_date: str,
    range_resolutions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build an auditable coverage snapshot using Decimal arithmetic only."""
    start = date.fromisoformat(str(start_date))
    events, range_requirements, blockers = _event_rows(protocol, range_resolutions, start)
    inventory = _prepare_inventory(inventory_items)
    by_compound: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for item in inventory:
        by_compound[item["canonical_compound"]].append(item)
    shortages: Dict[Tuple[str, str], Decimal] = defaultdict(lambda: Decimal("0"))
    for event in events:
        candidates = by_compound.get(event["compound"], [])
        shortage = _allocate_event(event, candidates)
        if shortage > 0:
            shortages[(event["compound"], event["unit"])] += shortage
            blockers.append(_allocation_block(event["compound"], event["unit"], event, candidates, shortage))
    totals: Dict[Tuple[str, str], Decimal] = defaultdict(lambda: Decimal("0"))
    for event in events:
        totals[(event["compound"], event["unit"])] += _decimal(event["amount"])
    required = []
    for (compound, unit), amount in sorted(totals.items()):
        candidates = [row for row in by_compound.get(compound, []) if row.get("confirmed") and row.get("status") == "active" and row.get("strength_unit") == unit]
        available = sum((row["starting_amount"] for row in candidates), Decimal("0"))
        remaining = sum((row["remaining_amount"] for row in candidates), Decimal("0"))
        required.append({
            "compound": compound,
            "required_amount": _text(amount),
            "available_amount": _text(available),
            "remaining_amount": _text(remaining),
            "shortage_amount": _text(shortages[(compound, unit)]),
            "unit": unit,
            "event_count": sum(1 for event in events if event["compound"] == compound and event["unit"] == unit),
        })
    allocated_ids = {allocation["inventory_item_id"] for event in events for allocation in event["allocations"]}
    required_compounds = {compound for compound, _ in totals}
    unused = [
        {key: row.get(key) for key in ("id", "label_name", "canonical_compound", "expiration_date", "available_units", "inventory_unit")}
        for row in inventory
        if row.get("id") not in allocated_ids and row.get("canonical_compound") not in required_compounds
    ]
    final_blockers = _dedupe(blockers)
    return {
        "ready": not final_blockers,
        "validation_status": "inventory_math_only_not_medical_safety",
        "medical_safety_status": "not_validated",
        "required_by_compound": required,
        "scheduled_events": events,
        "blockers": final_blockers,
        "range_requirements": range_requirements,
        "unused_inventory": unused,
    }
