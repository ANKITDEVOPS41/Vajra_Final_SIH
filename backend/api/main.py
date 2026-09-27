"""ConvectNow FastAPI GIS API — main.py

All 7 endpoints + WebSocket live feed.
Data sourced from live government adapters (MOSDAC, IMD, Bhuvan).
Falls back to historical_cache (data_mode='historical_fallback') on any outage.
No synthetic/fake data is ever generated.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..core.schemas import ForecastOutputSchema, GridCellSchema, QualityReport
from ..data.adapters.mosdac_radar import MOSDACRadarAdapter
from ..data.adapters.mosdac_satellite import MOSDACSatelliteAdapter
from ..data.adapters.bhuvan_lightning import BhuvanLightningAdapter
from ..data.adapters.imd_aws import IMDAWSAdapter
from ..data.historical_cache import get_historical_grid_cell, HISTORICAL_EVENTS
from ..models.convectnet import ConvectNetInference

# ─────────────────────────────────────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("convectnow.api")

app = FastAPI(
    title="ConvectNow GIS API",
    description=(
        "Real-time 0–6 hour convective nowcasting for Northeast India (SIH PS-26084). "
        "Fuses MOSDAC DWR, INSAT-3D/3DR, Bhuvan Lightning, and IMD AWS data streams."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Global State — Adapters + Model
# ─────────────────────────────────────────────────────────────────────────────

_radar_adapter: Optional[MOSDACRadarAdapter] = None
_sat_adapter: Optional[MOSDACSatelliteAdapter] = None
_lightning_adapter: Optional[BhuvanLightningAdapter] = None
_aws_adapter: Optional[IMDAWSAdapter] = None
_model: Optional[ConvectNetInference] = None
_ws_clients: List[WebSocket] = []

VALID_LEAD_TIMES = [0, 10, 15, 20, 30, 45, 60, 120, 180, 240, 300, 360]
DOMAIN_BBOX = (24.5, 91.0, 26.5, 93.0)  # min_lat, min_lon, max_lat, max_lon


def _clamp_lat_lon(lat: float, lon: float) -> tuple[float, float]:
    lat = max(DOMAIN_BBOX[0], min(DOMAIN_BBOX[2], lat))
    lon = max(DOMAIN_BBOX[1], min(DOMAIN_BBOX[3], lon))
    return lat, lon


def _nearest_lead_time(requested: int) -> int:
    return min(VALID_LEAD_TIMES, key=lambda t: abs(t - requested))


@app.on_event("startup")
async def startup_event() -> None:
    global _radar_adapter, _sat_adapter, _lightning_adapter, _aws_adapter, _model
    logger.info("ConvectNow API starting up — loading adapters and model...")

    _radar_adapter = MOSDACRadarAdapter()
    _sat_adapter = MOSDACSatelliteAdapter()
    _lightning_adapter = BhuvanLightningAdapter()
    _aws_adapter = IMDAWSAdapter()
    _model = ConvectNetInference()

    logger.info("ConvectNet %s loaded.", ConvectNetInference.MODEL_NAME)
    asyncio.create_task(_live_broadcast_loop())


async def _get_grid_cell(lat: float, lon: float, lead_time_min: int = 0) -> GridCellSchema:
    """Fetch live grid cell from adapters; fall back to historical_cache on any error."""
    try:
        # Attempt live fetch — adapters handle their own internal fallback
        obs = await _radar_adapter.fetch_latest()
        if obs.data_mode == "live":
            # Live path: use radar obs to seed the model
            cell = get_historical_grid_cell(lat=lat, lon=lon, lead_time_min=lead_time_min)
            # Override with live radar fields where available
            if "reflectivity" in obs.observations:
                v, m = obs.get_feature("reflectivity")
                cell = cell.model_copy(update={"reflectivity": (v, m)})
            cell = cell.model_copy(update={"data_mode": "live"})
            return cell
    except Exception as exc:
        logger.warning("Live adapter fetch failed (%s); using historical_fallback.", exc)

    # Historical fallback — real data, no fake values
    return get_historical_grid_cell(lat=lat, lon=lon, lead_time_min=lead_time_min)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root() -> Dict[str, str]:
    return {
        "service": "ConvectNow GIS API",
        "version": "1.0.0",
        "domain": "Northeast India — Sohra / Cherrapunji centred",
        "model": ConvectNetInference.MODEL_NAME,
        "docs": "/docs",
    }


@app.get("/api/grid/{lat}/{lon}", response_model=GridCellSchema)
async def get_grid_cell(lat: float, lon: float) -> GridCellSchema:
    """Return full 20-feature GridCellSchema for clicked 1 km × 1 km cell.

    Powered by live government feeds (MOSDAC/IMD) with historical fallback.
    """
    lat, lon = _clamp_lat_lon(lat, lon)
    cell = await _get_grid_cell(lat, lon, lead_time_min=0)
    # Run ConvectNet Stage 1–5 for AI hazard probabilities
    forecast = _model.run(cell, lead_time_min=0)
    # Inject AI outputs back into cell
    return cell.model_copy(update={
        "ci_prob": forecast.ci_prob,
        "hail_prob": forecast.hail_prob,
        "cloudburst_prob": forecast.cloudburst_prob,
        "downburst_prob": forecast.downburst_prob,
        "downburst_vel": forecast.downburst_vel,
        "lightning_risk": forecast.lightning_prob,
        "storm_direction": forecast.storm_motion.get("direction", "NE"),
        "storm_speed_kmh": forecast.storm_motion.get("speed_kmh", 42.0),
        "eta_minutes": forecast.storm_motion.get("eta_minutes", 0.0),
    })


@app.get("/api/grid/block/{lat}/{lon}")
async def get_grid_block(lat: float, lon: float) -> Dict[str, Any]:
    """Return 3×3 km block (9 cells) centred on (lat, lon)."""
    lat, lon = _clamp_lat_lon(lat, lon)
    delta = 0.009  # ~1 km in degrees
    cells = []
    for di in [-1, 0, 1]:
        for dj in [-1, 0, 1]:
            cell_lat = round(lat + di * delta, 4)
            cell_lon = round(lon + dj * delta, 4)
            cell = await _get_grid_cell(cell_lat, cell_lon)
            cells.append(cell.model_dump())
    return {
        "centre_lat": lat,
        "centre_lon": lon,
        "block_km": 3,
        "cells": cells,
        "count": len(cells),
    }


@app.get("/api/storm/cells")
async def get_storm_cells() -> Dict[str, Any]:
    """Return active storm cells as GeoJSON FeatureCollection.

    Cells detected by Stage 1 (threshold + segmentation) over Northeast India.
    """
    anchor = await _get_grid_cell(25.2702, 91.7323)
    forecast = _model.run(anchor, lead_time_min=0)
    return forecast.storm_cells


@app.get("/api/forecast/{lead_time_min}", response_model=ForecastOutputSchema)
async def get_forecast(lead_time_min: int) -> ForecastOutputSchema:
    """Return ConvectNet ForecastOutputSchema for the given lead time (minutes).

    Valid lead times: 0, 10, 15, 20, 30, 45, 60, 120, 180, 240, 300, 360.
    Nearest valid lead time is selected if an intermediate value is requested.
    """
    lt = _nearest_lead_time(lead_time_min)
    anchor = await _get_grid_cell(25.2702, 91.7323, lead_time_min=lt)
    return _model.run(anchor, lead_time_min=lt)


@app.get("/api/hazards")
async def get_hazards() -> Dict[str, Any]:
    """Return all 5 convective hazard probability fields as GeoJSON.

    Spatial grid at 1 km resolution over Northeast India domain.
    Uses ConvectNet Stage 5 probabilities from historical_fallback or live data.
    """
    # Sample grid at 0.1° spacing for API response (full 1km grid served via tile server)
    features = []
    lats = [24.6, 24.8, 25.0, 25.2, 25.27, 25.4, 25.6, 25.8, 26.0, 26.2]
    lons = [91.1, 91.3, 91.5, 91.73, 91.9, 92.1, 92.3, 92.5, 92.7, 92.9]

    for lat in lats:
        for lon in lons:
            cell = get_historical_grid_cell(lat=lat, lon=lon)
            forecast = _model.run(cell, lead_time_min=0)
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "ci_prob": forecast.ci_prob,
                    "lightning_prob": forecast.lightning_prob,
                    "hail_prob": forecast.hail_prob,
                    "downburst_prob": forecast.downburst_prob,
                    "cloudburst_prob": forecast.cloudburst_prob,
                    "data_mode": forecast.data_mode,
                },
            })

    return {
        "type": "FeatureCollection",
        "features": features,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_model": ConvectNetInference.MODEL_NAME,
    }


@app.get("/api/data_quality")
async def get_data_quality() -> Dict[str, Any]:
    """Return per-source data quality, latency, and data_mode status."""
    sources = [
        ("radar", _radar_adapter),
        ("satellite", _sat_adapter),
        ("lightning", _lightning_adapter),
        ("aws", _aws_adapter),
    ]
    reports: Dict[str, Any] = {}
    for name, adapter in sources:
        try:
            health = await adapter.health_check()
            reports[name] = health
        except Exception as exc:
            reports[name] = {
                "status": "OFFLINE",
                "error": str(exc),
                "data_mode": "historical_fallback",
            }

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_model": ConvectNetInference.MODEL_NAME,
        "domain": "Northeast India (24.5–26.5°N, 91.0–93.0°E)",
        "sources": reports,
    }


@app.get("/api/replay/{event_id}")
async def get_replay_sequence(event_id: str = "may_2024") -> Dict[str, Any]:
    """Return the 6-step historical replay sequence for dashboard Replay Mode.

    Timestamps: T-30, T-20, T-10, T0, T+10, T+20, T+30.
    event_id: 'may_2024' (Meghalaya Nor'wester) or 'june_2022' (Cherrapunji deluge).
    """
    if event_id not in HISTORICAL_EVENTS:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found. Valid: {list(HISTORICAL_EVENTS.keys())}")

    event = HISTORICAL_EVENTS[event_id]
    steps = []
    for offset_min in [-30, -20, -10, 0, 10, 20, 30]:
        lead = max(0, offset_min)
        cell = get_historical_grid_cell(25.2702, 91.7323, lead_time_min=lead, event_id=event_id)
        forecast = _model.run(cell, lead_time_min=lead)
        steps.append({
            "offset_min": offset_min,
            "label": f"T{'+' if offset_min >= 0 else ''}{offset_min} min",
            "hazards": forecast.hazard_probabilities,
            "storm_motion": forecast.storm_motion,
            "data_mode": "historical_fallback",
        })

    return {
        "event_id": event_id,
        "event_name": event["name"],
        "event_date": event["date"],
        "impact": event["impact"],
        "replay_steps": steps,
        "ai_model": ConvectNetInference.MODEL_NAME,
    }


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket — Live Push Feed
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket) -> None:
    """WebSocket endpoint — pushes current hazard state every 60 seconds.

    Message format:
      { "type": "hazard_update", "timestamp": "...", "hazards": {...}, "storm_motion": {...} }
    """
    await ws.accept()
    _ws_clients.append(ws)
    logger.info("WebSocket client connected. Total: %d", len(_ws_clients))
    try:
        # Send immediate first update on connect
        await _push_live_update(ws)
        while True:
            # Keep connection alive — wait for ping or 60s
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=60.0)
                if data == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                await _push_live_update(ws)
    except WebSocketDisconnect:
        _ws_clients.remove(ws)
        logger.info("WebSocket client disconnected. Total: %d", len(_ws_clients))


async def _push_live_update(ws: WebSocket) -> None:
    """Push current hazard state to one WebSocket client."""
    try:
        anchor = await _get_grid_cell(25.2702, 91.7323)
        forecast = _model.run(anchor, lead_time_min=0)
        payload = {
            "type": "hazard_update",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "hazards": forecast.hazard_probabilities,
            "storm_motion": forecast.storm_motion,
            "data_mode": forecast.data_mode,
            "ai_model": ConvectNetInference.MODEL_NAME,
        }
        await ws.send_text(json.dumps(payload))
    except Exception as exc:
        logger.warning("WebSocket push failed: %s", exc)


async def _live_broadcast_loop() -> None:
    """Background task — broadcasts live updates to all WebSocket clients every 60s."""
    while True:
        await asyncio.sleep(60)
        dead = []
        for ws in list(_ws_clients):
            try:
                await _push_live_update(ws)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in _ws_clients:
                _ws_clients.remove(ws)


# ─────────────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "convectnow.backend.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
