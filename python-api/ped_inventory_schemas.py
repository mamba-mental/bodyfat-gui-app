"""Pydantic request and response contracts for PED inventory and coverage."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class PedInventoryItemInput(BaseModel):
    user_id: str = "default"
    label_name: str = Field(min_length=1, max_length=160)
    canonical_compound: str = Field(min_length=1, max_length=80)
    formulation: Literal["injectable", "oral", "other"]
    strength_value: Decimal = Field(gt=0)
    strength_unit: Literal["mg", "mcg"]
    available_units: Decimal = Field(ge=0)
    inventory_unit: Literal["mL", "tablet", "capsule"]
    expiration_date: date
    lot_reference: Optional[str] = Field(default=None, max_length=120)
    source_note: Optional[str] = Field(default=None, max_length=500)
    confirmed: bool = False
    status: Literal["active", "depleted", "archived"] = "active"


class PedInventoryItemResponse(PedInventoryItemInput):
    id: str
    created_at: str
    updated_at: str


class PedRangeResolution(BaseModel):
    compound: str = Field(min_length=1)
    source_value: str = Field(min_length=1)
    selected_value: Decimal = Field(gt=0)
    unit: Literal["mg", "mcg"]


class PedReviewEvidence(BaseModel):
    reviewer_name: str = Field(min_length=1, max_length=160)
    reviewer_role: str = Field(min_length=1, max_length=120)
    review_note: str = Field(min_length=1, max_length=1000)
    attested: bool = False
    recorded_at: Optional[str] = None


class PedInventoryCoverageRequest(BaseModel):
    user_id: str = "default"
    start_week: int = Field(ge=1)
    start_date: date
    range_resolutions: List[PedRangeResolution] = Field(default_factory=list)


class PedInventoryCoverageResponse(BaseModel):
    ready: bool
    validation_status: str
    medical_safety_status: str
    required_by_compound: List[Dict[str, Any]]
    scheduled_events: List[Dict[str, Any]]
    blockers: List[Dict[str, Any]]
    range_requirements: List[Dict[str, Any]]
    unused_inventory: List[Dict[str, Any]]
