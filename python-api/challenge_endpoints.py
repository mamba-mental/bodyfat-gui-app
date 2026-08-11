"""API routes for 14-day templates, PED source windows, and challenge records."""

from __future__ import annotations

import hashlib
import uuid
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from challenge_protocol import load_protocol_catalog, select_protocol_window
from challenge_repository import ChallengeRepository
from challenge_report import render_challenge_report, write_challenge_report
from database import Database


router = APIRouter(tags=["14-day challenge"])
repo = ChallengeRepository()
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TEMPLATE_SOURCE = (
    PROJECT_ROOT
    / "openspec"
    / "changes"
    / "add-two-week-cut-challenge"
    / "assets"
    / "two-week-cut-preliminary.md"
)
REPORTS_OUTPUT_DIR = PROJECT_ROOT / "storage" / "reports"


def _model_dict(model: BaseModel) -> Dict[str, Any]:
    return model.model_dump(exclude_none=True) if hasattr(model, "model_dump") else model.dict(exclude_none=True)


def _default_template() -> Dict[str, Any]:
    rows = [
        (1, "Chest / Back A", "20-25 min easy-moderate", "standard", "Baseline measurements"),
        (2, "Legs / Delts", "15-20 min easy", "standard", "Leave 1-2 reps in reserve"),
        (3, None, "35-45 min brisk walk; mobility", "standard", "Recovery day"),
        (4, "Arms / Core", "25-30 min easy-moderate", "standard", "No failure work"),
        (5, None, "35-45 min brisk walk", "standard", "Audit food accuracy"),
        (6, "Chest / Back B", "Optional 15 min easy", "high_carb", "Adjustment checkpoint"),
        (7, None, "25-35 min easy walk; mobility", "standard", "Waist and photos"),
        (8, "Chest / Back A", "20-25 min easy-moderate", "standard", "Progress only if recovered"),
        (9, "Legs / Delts", "15-20 min easy", "standard", "No unfamiliar movements"),
        (10, None, "35-45 min brisk walk", "standard", "Review average and recovery"),
        (11, "Arms / Core", "25-30 min easy-moderate", "standard", "Maintain load"),
        (12, None, "30-40 min brisk walk; mobility", "standard", "Prioritize sleep"),
        (13, "Chest / Back B or pump", "0-15 min easy", "conditional_high_carb", "Optional appearance prep"),
        (14, "Optional pump only", "Normal steps only", "appearance_or_standard", "Final measurements"),
    ]
    return {
        "schema_version": 1,
        "duration_days": 14,
        "title": "Two-Week Emergency Cut",
        "status": "draft",
        "nutrition": {
            "calorie_rule": "75-80% of verified maintenance",
            "protein_rule": "0.85-1.0g/lb bodyweight, or 0.9-1.0g/lb goal weight above about 25% body fat",
            "fat_rule": "0.25-0.35g/lb goal weight",
            "carbohydrate_rule": "remaining calories after protein and fat",
            "meals_per_day": 4,
            "targets_are_engine_derived": True,
        },
        "days": [
            {
                "day_number": day,
                "training": training,
                "cardio": cardio,
                "nutrition_type": nutrition,
                "key_instruction": instruction,
                "required_log_fields": ["calories", "protein_g", "steps", "sleep_hours", "resting_hr"],
            }
            for day, training, cardio, nutrition, instruction in rows
        ],
        "measurements": {"required_days": [1, 7, 14], "fields": ["weight", "waist", "photo_refs"]},
        "adjustment": {
            "checkpoint_day": 6,
            "underperforming": "reduce calories 150-200/day OR add 10 minutes to three cardio sessions",
            "overreaching": "add 150-250 kcal/day primarily from carbohydrate",
            "never_apply_both_underperforming_actions": True,
        },
        "recovery": {"hours_in_bed": "7.5-9", "reduce_volume_if_sleep_under_hours": 6},
        "safety": {
            "keep_water_and_sodium_consistent": True,
            "prohibit_dehydration_diuretics_laxatives": True,
            "member_acknowledgement_required": True,
            "ped_schedule_requires_existing_source": True,
        },
    }


class RevisionPayload(BaseModel):
    raw_source: str = "Structured editor revision"
    structured: Dict[str, Any]
    source_sha256: Optional[str] = None
    revision_note: str = Field(min_length=1)
    validation_status: str = "draft"


class StatusPayload(BaseModel):
    status: str


class ProtocolWindowPayload(BaseModel):
    start_week: int = Field(ge=1)


class PlanRevisionPayload(BaseModel):
    revision_number: int = Field(ge=1)
    template_revision_id: str
    protocol_id: str
    protocol_version: str
    protocol_start_week: int = Field(ge=1)
    protocol_snapshot: Dict[str, Any]
    calculation_snapshot: Dict[str, Any]
    plan_snapshot: Dict[str, Any]


class AmendmentPayload(BaseModel):
    id: str
    effective_day: int = Field(ge=1, le=14)
    effective_date: Optional[str] = None
    reason: str = Field(min_length=1)
    patch: Dict[str, Any]
    previous_plan_revision: int = Field(ge=1)
    new_plan_revision: int = Field(ge=2)
    safety_acknowledgement: Optional[Dict[str, Any]] = None


class DailyLogPayload(BaseModel):
    date: str
    plan_revision: int = Field(ge=1)
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    steps: Optional[int] = None
    training_completed: bool = False
    cardio_completed: bool = False
    sleep_hours: Optional[float] = None
    resting_hr: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    waist: Optional[float] = None
    photo_refs: Optional[list[str]] = None
    notes: Optional[str] = None


class ChallengeAmendPayload(BaseModel):
    effective_day: int = Field(ge=1, le=14)
    reason: str = Field(min_length=1)
    nutrition_calories: Optional[float] = Field(default=None, ge=0)
    protein_g: Optional[float] = Field(default=None, ge=0)
    training: Optional[str] = None
    cardio: Optional[str] = None
    key_instruction: Optional[str] = None
    safety_acknowledged: bool = False


@router.get("/api/data/challenge-templates")
async def get_templates():
    return repo.get_templates()


@router.get("/api/data/challenge-templates/{template_id}")
async def get_template(template_id: str):
    template = repo.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Challenge template not found")
    return template


@router.post("/api/data/challenge-templates/import-default")
async def import_default_template():
    existing = next((item for item in repo.get_templates() if item["name"] == "Two-Week Emergency Cut"), None)
    if existing:
        return existing
    raw_source = (
        DEFAULT_TEMPLATE_SOURCE.read_text(encoding="utf-8-sig")
        if DEFAULT_TEMPLATE_SOURCE.is_file()
        else "Two-Week Emergency Cut structured template"
    )
    return repo.create_template(
        name="Two-Week Emergency Cut",
        duration_days=14,
        raw_source=raw_source,
        structured=_default_template(),
        source_sha256=hashlib.sha256(raw_source.encode("utf-8")).hexdigest(),
        revision_note="Initial preliminary plan import",
    )


@router.get("/api/data/challenge-templates/{template_id}/revisions")
async def get_template_revisions(template_id: str):
    if not repo.get_template(template_id):
        raise HTTPException(status_code=404, detail="Challenge template not found")
    return repo.get_template_revisions(template_id)


@router.post("/api/data/challenge-templates/{template_id}/revisions")
async def add_template_revision(template_id: str, payload: RevisionPayload):
    values = _model_dict(payload)
    source_hash = values.pop("source_sha256", None) or hashlib.sha256(
        values["raw_source"].encode("utf-8")
    ).hexdigest()
    try:
        return repo.add_template_revision(template_id=template_id, source_sha256=source_hash, **values)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/api/data/challenge-templates/{template_id}/status")
async def set_template_status(template_id: str, payload: StatusPayload):
    try:
        return repo.set_template_status(template_id, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/api/data/ped-protocols/catalog")
async def get_protocol_catalog():
    return load_protocol_catalog()


@router.post("/api/data/ped-protocols/window")
async def get_protocol_window(payload: ProtocolWindowPayload):
    try:
        return select_protocol_window(payload.start_week)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/api/data/challenges/{cycle_id}/plan-revisions")
async def get_plan_revisions(cycle_id: str):
    return repo.get_plan_revisions(cycle_id)


@router.post("/api/data/challenges/{cycle_id}/plan-revisions")
async def save_plan_revision(cycle_id: str, payload: PlanRevisionPayload):
    return repo.save_plan_revision(cycle_id=cycle_id, **_model_dict(payload))


@router.get("/api/data/challenges/{cycle_id}/amendments")
async def get_amendments(cycle_id: str):
    return repo.get_amendments(cycle_id)


@router.post("/api/data/challenges/{cycle_id}/amendments")
async def save_amendment(cycle_id: str, payload: AmendmentPayload):
    return repo.save_amendment(amendment_id=payload.id, cycle_id=cycle_id, **{
        key: value for key, value in _model_dict(payload).items() if key != "id"
    })


@router.get("/api/data/challenges/{cycle_id}/daily-logs")
async def get_daily_logs(cycle_id: str):
    return repo.get_daily_logs(cycle_id)


@router.put("/api/data/challenges/{cycle_id}/daily-logs/{day_number}")
async def save_daily_log(cycle_id: str, day_number: int, payload: DailyLogPayload):
    if day_number < 1 or day_number > 14:
        raise HTTPException(status_code=422, detail="Challenge day must be between 1 and 14")
    values = _model_dict(payload)
    plan_revision = values.pop("plan_revision")
    return repo.save_daily_log(cycle_id, day_number, plan_revision, values)


@router.post("/api/data/challenges/{cycle_id}/report")
async def generate_challenge_report(cycle_id: str):
    cycle = repo.get_cycle(cycle_id)
    revisions = repo.get_plan_revisions(cycle_id)
    if not cycle or not revisions:
        raise HTTPException(status_code=404, detail="Challenge or plan revision not found")
    plan_revision = revisions[0]
    protocol = plan_revision.get("protocol_snapshot_json") or {}
    if len(protocol.get("days", [])) != 14:
        raise HTTPException(status_code=422, detail="A complete source-backed PED schedule is required")

    logs = repo.get_daily_logs(cycle_id)
    amendments = repo.get_amendments(cycle_id)
    report_mode = (
        "final"
        if len(logs) >= 14
        else "stopped_early"
        if cycle.get("status") in {"stopped", "archived", "cancelled"}
        else "progress"
    )
    markdown_text, html_text = render_challenge_report(cycle, plan_revision, logs, amendments)
    markdown_path, html_path = write_challenge_report(
        REPORTS_OUTPUT_DIR, cycle_id, markdown_text, html_text
    )
    report_id = f"two-week-{uuid.uuid4()}"
    report = {
        "id": report_id,
        "title": f"{cycle.get('name') or 'Two-Week Emergency Cut'} {report_mode.replace('_', ' ').title()} Report",
        "date": datetime.now().isoformat(),
        "generated_at": datetime.now().isoformat(),
        "report_type": "two_week_cut",
        "report_mode": report_mode,
        "cycle_id": cycle_id,
        "plan_revision": plan_revision["revision_number"],
        "template_revision_id": plan_revision["template_revision_id"],
        "protocol_id": plan_revision["protocol_id"],
        "protocol_version": plan_revision["protocol_version"],
        "source_fingerprint": protocol.get("source_sha256"),
        "completion": {"days_logged": len(logs), "days_total": 14},
        "html_content": html_text,
        "markdown_content": markdown_text,
        "html_path": str(html_path),
        "markdown_path": str(markdown_path),
        "file_path": str(html_path),
    }
    Database().save_report(report)
    return report


@router.post("/api/data/challenges/{cycle_id}/amend")
async def amend_challenge(cycle_id: str, payload: ChallengeAmendPayload):
    revisions = repo.get_plan_revisions(cycle_id)
    if not revisions:
        raise HTTPException(status_code=404, detail="Challenge plan revision not found")
    if not payload.safety_acknowledged:
        raise HTTPException(status_code=422, detail="Safety acknowledgement is required for an active-plan amendment")
    completed_days = {row["day_number"] for row in repo.get_daily_logs(cycle_id)}
    if payload.effective_day in completed_days:
        raise HTTPException(status_code=409, detail="A completed/logged challenge day cannot be rewritten")

    previous = revisions[0]
    plan = deepcopy(previous["plan_snapshot_json"])
    day = next((item for item in plan.get("days", []) if item.get("day_number") == payload.effective_day), None)
    if not day:
        raise HTTPException(status_code=422, detail="The requested challenge day does not exist")
    try:
        effective_date = datetime.fromisoformat(str(day.get("date"))).date()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="The challenge day has no valid effective date") from exc
    if effective_date <= datetime.now().date():
        raise HTTPException(status_code=409, detail="Only future challenge days can be amended")
    patch: Dict[str, Any] = {}
    if payload.nutrition_calories is not None:
        day.setdefault("nutrition_target", {})["calories"] = round(payload.nutrition_calories)
        patch[f"days.{payload.effective_day}.nutrition_target.calories"] = round(payload.nutrition_calories)
    if payload.protein_g is not None:
        day.setdefault("nutrition_target", {})["protein_g"] = round(payload.protein_g)
        patch[f"days.{payload.effective_day}.nutrition_target.protein_g"] = round(payload.protein_g)
    for field in ("training", "cardio", "key_instruction"):
        value = getattr(payload, field)
        if value is not None:
            day[field] = value
            patch[f"days.{payload.effective_day}.{field}"] = value
    if not patch:
        raise HTTPException(status_code=422, detail="The amendment contains no plan changes")

    new_revision_number = int(previous["revision_number"]) + 1
    plan["amended_from_revision"] = previous["revision_number"]
    plan["latest_amendment_reason"] = payload.reason
    saved = repo.save_plan_revision(
        cycle_id=cycle_id,
        revision_number=new_revision_number,
        template_revision_id=previous["template_revision_id"],
        protocol_id=previous["protocol_id"],
        protocol_version=previous["protocol_version"],
        protocol_start_week=previous["protocol_start_week"],
        protocol_snapshot=previous["protocol_snapshot_json"],
        calculation_snapshot=previous["calculation_snapshot_json"],
        plan_snapshot=plan,
    )
    amendment = repo.save_amendment(
        amendment_id=f"amend-{uuid.uuid4()}",
        cycle_id=cycle_id,
        effective_day=payload.effective_day,
        effective_date=day.get("date"),
        reason=payload.reason,
        patch=patch,
        previous_plan_revision=previous["revision_number"],
        new_plan_revision=new_revision_number,
        safety_acknowledgement={"acknowledged": True, "recorded_at": datetime.now().isoformat()},
    )
    return {"success": True, "plan_revision": saved, "amendment": amendment, "plan_snapshot": plan}
