"""Build a deterministic 14-day plan from template, PRIME, and PED snapshots."""

from __future__ import annotations

from copy import deepcopy
from datetime import date, timedelta
from typing import Any, Dict, List


def _as_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return deepcopy(value)
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "dict"):
        return value.dict()
    raise TypeError("Calculation result must be a mapping or Pydantic model")


def _target_for_day(day: Dict[str, Any], week: Dict[str, Any]) -> Dict[str, Any]:
    training = bool(day.get("training")) and "optional" not in str(day.get("training")).lower()
    nutrition_type = day.get("nutrition_type", "standard")
    if training or nutrition_type in {"high_carb", "conditional_high_carb", "appearance_or_standard"}:
        calories = week.get("training_calories") or week.get("daily_calorie_intake")
    else:
        calories = week.get("rest_calories") or week.get("weekly_average_calories")
    return {
        "calories": round(float(calories or 0)),
        "protein_g": round(float(week.get("protein_g") or 0)),
        "carbs_g": week.get("carbs_g"),
        "source_week_number": week.get("week_number"),
        "prime_phase": week.get("phase"),
    }


def build_plan_snapshot(
    template_revision: Dict[str, Any],
    protocol_snapshot: Dict[str, Any],
    calculation_snapshot: Any,
    start_date: str,
) -> Dict[str, Any]:
    """Combine three immutable inputs into one exact, report-ready plan."""
    template = deepcopy(template_revision.get("structured_json") or template_revision.get("structured") or {})
    template_days: List[Dict[str, Any]] = template.get("days", [])
    protocol_days: List[Dict[str, Any]] = protocol_snapshot.get("days", [])
    calculation = _as_dict(calculation_snapshot)
    progression = calculation.get("progression", [])
    planned_progression = [
        row for row in progression if int(row.get("week_number", 0)) >= 1
    ]
    if not planned_progression:
        planned_progression = progression

    if len(template_days) != 14:
        raise ValueError("The selected template revision must contain exactly 14 days")
    if len(protocol_days) != 14:
        raise ValueError("The selected PED schedule must contain exactly 14 days")
    if len(planned_progression) < 2:
        raise ValueError("PRIME must return two weekly progression rows for a 14-day plan")

    start = date.fromisoformat(start_date)
    days = []
    for index, template_day in enumerate(template_days):
        expected_day = index + 1
        protocol_day = protocol_days[index]
        if template_day.get("day_number") != expected_day or protocol_day.get("day_number") != expected_day:
            raise ValueError(f"Template and PED schedule are not aligned at day {expected_day}")
        week = planned_progression[0 if index < 7 else 1]
        days.append(
            {
                **deepcopy(template_day),
                "date": (start + timedelta(days=index)).isoformat(),
                "nutrition_target": _target_for_day(template_day, week),
                "protocol_schedule": deepcopy(protocol_day),
            }
        )

    return {
        "schema_version": 1,
        "title": template.get("title", "Two-Week Emergency Cut"),
        "duration_days": 14,
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=13)).isoformat(),
        "template_revision_id": template_revision.get("id"),
        "template_revision_number": template_revision.get("revision_number"),
        "protocol_id": protocol_snapshot.get("protocol_id"),
        "protocol_version": protocol_snapshot.get("version"),
        "protocol_source_sha256": protocol_snapshot.get("source_sha256"),
        "protocol_start_week": protocol_snapshot.get("start_week"),
        "protocol_end_week": protocol_snapshot.get("end_week"),
        "ped_stack": deepcopy(protocol_snapshot.get("ped_stack", [])),
        "days": days,
        "measurements": deepcopy(template.get("measurements", {})),
        "adjustment": deepcopy(template.get("adjustment", {})),
        "recovery": deepcopy(template.get("recovery", {})),
        "safety": deepcopy(template.get("safety", {})),
        "calculation_summary": deepcopy(calculation.get("summary", {})),
        "calculation_progression": deepcopy(planned_progression[:2]),
    }


def readiness_blockers(
    template_status: str,
    plan_snapshot: Dict[str, Any],
    safety_acknowledged: bool,
    inventory_required: bool = False,
    inventory_coverage: Dict[str, Any] | None = None,
    member_inventory_confirmed: bool = False,
    review_evidence: Dict[str, Any] | None = None,
) -> List[str]:
    blockers = []
    if template_status != "active":
        blockers.append("The selected 14-day template revision has not been activated")
    if len(plan_snapshot.get("days", [])) != 14:
        blockers.append("The plan does not contain exactly 14 days")
    if not plan_snapshot.get("ped_stack"):
        blockers.append("A source-backed PED schedule is required")
    if not plan_snapshot.get("protocol_source_sha256"):
        blockers.append("The PED schedule source fingerprint is missing")
    if not safety_acknowledged:
        blockers.append("Safety acknowledgement is required before activation")
    if inventory_required:
        coverage = inventory_coverage or {"ready": False, "blockers": []}
        blockers.extend(
            str(item.get("message"))
            for item in coverage.get("blockers", [])
            if item.get("severity") == "critical" and item.get("message")
        )
        if not coverage.get("ready") and not coverage.get("blockers"):
            blockers.append("Confirmed inventory coverage is required before activation")
        if not member_inventory_confirmed:
            blockers.append("Member confirmation of the entered PED inventory is required")
        evidence = review_evidence or {}
        if not (
            evidence.get("attested")
            and str(evidence.get("reviewer_name") or "").strip()
            and str(evidence.get("reviewer_role") or "").strip()
            and str(evidence.get("review_note") or "").strip()
        ):
            blockers.append("Documented review evidence is required before activation")
    return blockers
