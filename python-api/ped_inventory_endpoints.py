"""FastAPI routes for local PED inventory and deterministic coverage checks."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException, Query, status

from challenge_protocol import select_protocol_window
from ped_inventory import build_inventory_coverage
from ped_inventory_repository import PedInventoryRepository
from ped_inventory_schemas import (
    PedInventoryCoverageRequest,
    PedInventoryCoverageResponse,
    PedInventoryItemInput,
    PedInventoryItemResponse,
)


router = APIRouter(prefix="/api/data/ped-inventory", tags=["PED inventory"])
repo = PedInventoryRepository()


def _values(payload: PedInventoryItemInput) -> dict:
    return payload.model_dump(mode="json") if hasattr(payload, "model_dump") else payload.dict()


@router.get("", response_model=List[PedInventoryItemResponse])
async def list_inventory(user_id: str = Query(default="default")):
    return repo.list_items(user_id)


@router.post("", response_model=PedInventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(payload: PedInventoryItemInput):
    return repo.create_item(_values(payload))


@router.put("/{item_id}", response_model=PedInventoryItemResponse)
async def update_inventory_item(item_id: str, payload: PedInventoryItemInput):
    try:
        return repo.update_item(item_id, _values(payload))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str):
    if not repo.delete_item(item_id):
        raise HTTPException(status_code=404, detail="PED inventory item not found")
    return {"success": True, "id": item_id}


@router.post("/coverage", response_model=PedInventoryCoverageResponse)
async def inventory_coverage(payload: PedInventoryCoverageRequest):
    try:
        protocol = select_protocol_window(payload.start_week)
        resolutions = [
            row.model_dump(mode="json") if hasattr(row, "model_dump") else row.dict()
            for row in payload.range_resolutions
        ]
        return build_inventory_coverage(
            protocol,
            repo.list_items(payload.user_id),
            payload.start_date.isoformat(),
            resolutions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
