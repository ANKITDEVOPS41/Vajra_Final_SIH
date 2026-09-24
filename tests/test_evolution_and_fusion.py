"""
Test Suite for Milestone 3 (Evolution) & Milestone 4 (Multimodal Fusion)
Run: PYTHONPATH=.. pytest tests/test_evolution_and_fusion.py -v
"""

import sys
import os
import pytest
import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from convectnow.backend.cell_evolution import CellEvolutionTracker, EvolutionState
from convectnow.backend.multimodal_fusion import MultimodalFusionEngine
from convectnow.backend.cell_tracker import PersistentCellTracker
from convectnow.backend.server import app


# ── Milestone 3: Evolution Tracker Tests ─────────────────────────────────────

def test_cell_evolution_intensifying_trend():
    """
    Simulates a rapidly growing storm:
    14:00 (42 dBZ, 80 km2, 5/min) ->
    14:10 (47 dBZ, 100 km2, 12/min) ->
    14:20 (53 dBZ, 130 km2, 24/min)
    Expected: Status = INTENSIFYING, footprint expands.
    """
    tracker = CellEvolutionTracker()
    cid = "CELL-A17"

    # Scan 1
    tracker.record_observation(
        cell_id=cid, centroid_x=50.0, centroid_y=50.0,
        peak_dbz=42.0, mean_dbz=35.0, area_km2=80.0,
        lightning_rate_per_min=5.0, minute_offset=0.0
    )

    # Scan 2 (+10m)
    tracker.record_observation(
        cell_id=cid, centroid_x=53.0, centroid_y=47.0,
        peak_dbz=47.0, mean_dbz=40.0, area_km2=100.0,
        lightning_rate_per_min=12.0, minute_offset=10.0
    )

    # Scan 3 (+20m)
    rec = tracker.record_observation(
        cell_id=cid, centroid_x=57.0, centroid_y=43.0,
        peak_dbz=53.0, mean_dbz=45.0, area_km2=130.0,
        lightning_rate_per_min=24.0, minute_offset=20.0
    )

    assert rec.current_state == EvolutionState.INTENSIFYING
    assert rec.state_probabilities["INTENSIFYING"] > 0.40
    assert rec.rate_dbz_per_10min > 0.0
    assert rec.rate_area_percent_per_10min > 0.0
    assert rec.footprint_expansion_factor > 1.0
    assert len(rec.history) == 3


def test_cell_evolution_weakening_trend():
    """
    Simulates a collapsing storm:
    15:00 (55 dBZ, 140 km2) ->
    15:10 (48 dBZ, 100 km2) ->
    15:20 (39 dBZ, 60 km2)
    Expected: Status = WEAKENING, footprint shrinks.
    """
    tracker = CellEvolutionTracker()
    cid = "CELL-A17"

    tracker.record_observation(cid, 50.0, 50.0, 55.0, 48.0, 140.0, lightning_rate_per_min=20.0, minute_offset=0.0)
    tracker.record_observation(cid, 52.0, 50.0, 48.0, 41.0, 100.0, lightning_rate_per_min=8.0, minute_offset=10.0)
    rec = tracker.record_observation(cid, 54.0, 50.0, 39.0, 33.0, 60.0, lightning_rate_per_min=1.0, minute_offset=20.0)

    assert rec.current_state == EvolutionState.WEAKENING
    assert rec.rate_dbz_per_10min < 0.0
    assert rec.footprint_expansion_factor <= 1.0


# ── Milestone 2: Persistent Cell Tracker Tests ───────────────────────────────

def test_persistent_cell_tracker_hungarian_matching():
    """
    Verifies that a cell displaced between Scan 1 and Scan 2 maintains its identity
    and computes true ground displacement velocity.
    """
    tracker = PersistentCellTracker(max_distance_px=25.0)

    # Scan 1: Two cells
    dets_t0 = [
        {"centroid_x": 40.0, "centroid_y": 60.0, "peak_dbz": 52.0, "mean_dbz": 44.0, "area_km2": 95.0, "bbox": [35, 55, 45, 65]},
        {"centroid_x": 90.0, "centroid_y": 80.0, "peak_dbz": 44.0, "mean_dbz": 38.0, "area_km2": 60.0, "bbox": [85, 75, 95, 85]},
    ]
    t0_cells = tracker.update(dets_t0, dt_minutes=5.0)
    assert len(t0_cells) == 2
    id_1 = t0_cells[0]["cell_id"]
    id_2 = t0_cells[1]["cell_id"]

    # Scan 2: Displaced eastward by 4 px (~4 km in 5 min -> ~48 km/h)
    dets_t1 = [
        {"centroid_x": 44.0, "centroid_y": 59.0, "peak_dbz": 54.0, "mean_dbz": 46.0, "area_km2": 110.0, "bbox": [39, 54, 49, 64]},
        {"centroid_x": 93.0, "centroid_y": 79.0, "peak_dbz": 43.0, "mean_dbz": 37.0, "area_km2": 55.0, "bbox": [88, 74, 98, 84]},
    ]
    t1_cells = tracker.update(dets_t1, dt_minutes=5.0)

    # Persistent IDs must match
    assert t1_cells[0]["cell_id"] == id_1
    assert t1_cells[1]["cell_id"] == id_2
    assert t1_cells[0]["velocity_kmh"] > 30.0
    assert len(t1_cells[0]["trajectory_history"]) == 2


# ── Milestone 4: Multimodal Fusion Engine Tests ──────────────────────────────

def test_multimodal_fusion_with_all_modalities():
    engine = MultimodalFusionEngine(radar_origin_lat=28.58, radar_origin_lon=77.21)
    evo_tracker = CellEvolutionTracker()

    evo = evo_tracker.record_observation("CELL-A01", 64.0, 64.0, 54.0, 46.0, 120.0, lightning_rate_per_min=18.0)
    cell = {"cell_id": "CELL-A01", "centroid_x": 64.0, "centroid_y": 64.0, "bbox": [58, 58, 70, 70], "area_km2": 120.0}

    # Synthetic grids
    lght_grid = np.zeros((128, 128), dtype=np.float32)
    lght_grid[60:68, 60:68] = 8.5  # High flash density

    sat_ir = np.full((128, 128), 260.0, dtype=np.float32)
    sat_ir[62:66, 62:66] = 208.0  # Cold overshooting top (<215K)

    fused = engine.fuse_cell(
        cell_dict=cell,
        evolution_record=evo,
        lightning_grid=lght_grid,
        satellite_ir_grid=sat_ir,
        nwp_fields={"cape_jkg": 2400.0, "cin_jkg": 15.0, "freezing_level_km": 4.5},
    )

    assert fused.centroid_lat == 28.58
    assert fused.centroid_lon == 77.21
    assert "RADAR" in fused.modalities_present
    assert "LIGHTNING" in fused.modalities_present
    assert "SATELLITE" in fused.modalities_present
    assert "NWP" in fused.modalities_present
    assert fused.satellite_evidence["overshooting_top_detected"] is True
    assert fused.fusion_confidence >= 0.85
    assert fused.confidence_tier == "HIGH"


def test_multimodal_fusion_missing_satellite_graceful_fallback():
    """When satellite is offline, fusion must degrade confidence gracefully without error."""
    engine = MultimodalFusionEngine()
    evo_tracker = CellEvolutionTracker()
    evo = evo_tracker.record_observation("CELL-A02", 50.0, 50.0, 44.0, 36.0, 70.0)
    cell = {"cell_id": "CELL-A02", "centroid_x": 50.0, "centroid_y": 50.0, "bbox": [45, 45, 55, 55], "area_km2": 70.0}

    fused = engine.fuse_cell(
        cell_dict=cell,
        evolution_record=evo,
        lightning_grid=None,     # No lightning
        satellite_ir_grid=None,  # No satellite
        nwp_fields=None,         # No NWP
    )

    assert "RADAR" in fused.modalities_present
    assert "SATELLITE" not in fused.modalities_present
    assert fused.data_freshness["satellite"].status == "OFFLINE"
    assert fused.fusion_confidence < 0.60  # Degraded confidence
    assert fused.confidence_tier in ["MEDIUM", "LOW"]


# ── Server API Integration Tests ─────────────────────────────────────────────

def test_api_server_storm_and_cells():
    client = TestClient(app)

    # 1. Health check
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "OPERATIONAL"

    # 2. Storm analysis with M3 & M4 enriched cells
    r_storm = client.get("/api/storm/0")
    assert r_storm.status_code == 200
    data = r_storm.json()
    assert "storm_cells" in data
    assert len(data["storm_cells"]) > 0

    cell_0 = data["storm_cells"][0]
    assert "evolution" in cell_0
    assert "state" in cell_0["evolution"]
    assert "probabilities" in cell_0["evolution"]
    assert "fusion" in cell_0
    assert "confidence" in cell_0["fusion"]
    assert "modalities_present" in cell_0["fusion"]

    # 3. Deep learning ConvectNet endpoint
    # Call twice to measure warm latency
    _ = client.get("/api/convectnet/predict?event_idx=0")
    r_dl = client.get("/api/convectnet/predict?event_idx=0")
    assert r_dl.status_code == 200
    dl_data = r_dl.json()
    assert "convectnet_predictions" in dl_data
    assert "inference_latency_ms" in dl_data
    assert dl_data["inference_latency_ms"] < 300.0  # Relaxed for CBAM + SE upgraded model
