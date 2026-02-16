"""GET /dashboard - KPIs, heatmap data, analytics."""

from __future__ import annotations

import structlog
from fastapi import APIRouter

from app.schemas import DashboardKPIs, HeatmapData
from app.services.clickhouse_client import clickhouse_service

router = APIRouter()
logger = structlog.get_logger()


@router.get("/dashboard/kpis", response_model=DashboardKPIs)
async def get_kpis():
    """Return dashboard KPI summary."""
    return clickhouse_service.get_kpis()


@router.get("/dashboard/heatmap", response_model=HeatmapData)
async def get_heatmap():
    """Return geo-points for deck.gl heatmap."""
    return clickhouse_service.get_heatmap_data()


@router.get("/dashboard/department-trend")
async def get_department_trend():
    """Return daily complaint counts per department (last 30 days)."""
    return clickhouse_service.get_department_trend()
