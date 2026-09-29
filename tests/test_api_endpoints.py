"""
Tests for API endpoints, PyTorch model evaluation, and fallback re-wiring.
Confirms absence of monkey patch, active model execution with latency > 0,
and synthetic_data == False.
"""
import time
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.api.main import app, _run_model
from backend.models.inference import ConvectNetInference, build_radar_tensor_from_cell
from backend.data.data_source_manager import DataSourceManager
from backend.data.historical_cache import get_historical_grid_cell


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_monkey_patch_removed():
    """Verify ConvectNetInference.run does NOT point to _run_model in api/main.py."""
    assert ConvectNetInference.run != _run_model, (
        "Monkey patch detected! ConvectNetInference.run must not point to _run_model"
    )
    # Confirm run is an alias to the native run_inference method
    assert ConvectNetInference.run is ConvectNetInference.run_inference


def test_api_status(client):
    """Verify /api/status returns synthetic_data: False and model_loaded: True."""
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["synthetic_data"] is False
    assert data["model_loaded"] is True
    assert "ConvectNet" in data["model_name"]


def test_grid_endpoint_evaluates_pytorch_model(client):
    """Verify /api/grid/{lat}/{lon} evaluates PyTorch model with latency > 0 and synthetic_data == False."""
    t0 = time.perf_counter()
    res = client.get("/api/grid/25.2/91.7")
    wall_latency_ms = (time.perf_counter() - t0) * 1000.0

    assert res.status_code == 200
    data = res.json()

    # Synthetic data flag must remain False
    assert data["synthetic_data"] is False, "synthetic_data must be False"

    # PyTorch inference latency must be recorded and > 0
    assert "inference_latency_ms" in data, "inference_latency_ms missing from GridCellSchema"
    assert data["inference_latency_ms"] > 0.0, (
        f"Inference latency must be > 0 ms, got {data['inference_latency_ms']}"
    )
    assert wall_latency_ms > 0.0

    # Probabilities must be genuine and bounded in [0, 1]
    assert 0.0 <= data["ci_prob"] <= 1.0
    assert 0.0 <= data["hail_prob"] <= 1.0
    assert 0.0 <= data["cloudburst_prob"] <= 1.0
    assert 0.0 <= data["downburst_prob"] <= 1.0
    assert 0.0 <= data["lightning_risk"] <= 1.0
    assert data["downburst_vel"] >= 0.0

    # Data mode must be valid
    assert data["data_mode"] in ("historical_fallback", "live")


def test_forecast_endpoint_evaluates_pytorch_model(client):
    """Verify /api/forecast/{lead_time_min} executes PyTorch model with valid schema."""
    res = client.get("/api/forecast/15")
    assert res.status_code == 200
    data = res.json()

    assert data["synthetic_data"] is False
    assert data["inference_latency_ms"] > 0.0
    assert data["ai_model"] == "ConvectNet-ST-Nowcaster-v1.0"
    assert "ci" in data["hazard_probabilities"]
    assert 0.0 <= data["hazard_probabilities"]["ci"] <= 1.0
    assert 0.0 <= data["hazard_probabilities"]["hail"] <= 1.0
    assert 0.0 <= data["hazard_probabilities"]["cloudburst"] <= 1.0
    assert 0.0 <= data["hazard_probabilities"]["downburst"] <= 1.0
    assert 0.0 <= data["hazard_probabilities"]["lightning"] <= 1.0


@pytest.mark.asyncio
async def test_data_source_manager_fallback():
    """Verify DataSourceManager sets data_mode = 'historical_fallback' when live feed fails/times out."""
    dsm = DataSourceManager()
    obs = await dsm.get_observation(25.2, 91.7)
    assert obs is not None
    assert obs["data_mode"] == "historical_fallback"


def test_build_radar_tensor_and_run_inference():
    """Verify radar tensor builder creates (4, 12, 128, 128) float32 tensor and model evaluates it."""
    cell = get_historical_grid_cell(25.2702, 91.7323)
    tensor = build_radar_tensor_from_cell(cell, lead_time_min=30)
    assert tensor.shape == (4, 12, 128, 128)
    assert tensor.dtype == np.float32

    model = ConvectNetInference()
    pred = model.run_inference(cell=cell, lead_time_min=30)
    assert "cloudburst_prob" in pred
    assert "downburst_prob" in pred
    assert "ci_prob" in pred
    assert "hail_prob" in pred
    assert 0.0 <= pred["cloudburst_prob"] <= 1.0
    assert 0.0 <= pred["downburst_prob"] <= 1.0
    assert 0.0 <= pred["ci_prob"] <= 1.0
    assert 0.0 <= pred["hail_prob"] <= 1.0


def test_grid_endpoint_with_adapter_failure_fallback(client):
    """Verify that when live adapters fail, endpoint falls back to historical buffer and evaluates model."""
    from backend.api import main
    original_fetch = main._radar_adapter.fetch_latest

    async def mock_fail():
        raise ConnectionError("Simulated government server connection timeout")

    try:
        main._radar_adapter.fetch_latest = mock_fail
        res = client.get("/api/grid/25.2/91.7")
        assert res.status_code == 200
        data = res.json()
        assert data["data_mode"] == "historical_fallback"
        assert data["synthetic_data"] is False
        assert data["inference_latency_ms"] > 0.0
        assert 0.0 <= data["ci_prob"] <= 1.0
    finally:
        main._radar_adapter.fetch_latest = original_fetch
