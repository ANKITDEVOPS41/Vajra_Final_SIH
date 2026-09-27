"""Unit tests for ConvectNow core Pydantic v2 schemas and SourceAdapter ABC."""

import math
from datetime import datetime, timezone
import numpy as np
import pytest
import torch

from backend.core.schemas import (
    CommonObservationSchema,
    FeatureTensorSchema,
    ForecastOutputSchema,
    GridCellSchema,
    QualityReport,
    SourceAdapter,
)


def test_quality_report():
    qr = QualityReport(
        source_id="TEST_SOURCE",
        status="GOOD",
        latency_seconds=0.45,
        data_mode="live",
        coverage_pct=98.5,
    )
    assert qr.source_id == "TEST_SOURCE"
    assert qr.status == "GOOD"
    assert qr.latency_seconds == 0.45
    d = qr.model_dump()
    assert d["data_mode"] == "live"


def test_common_observation_schema():
    obs = CommonObservationSchema(source="RADAR_TEST")
    assert obs.source == "RADAR_TEST"
    assert obs.data_mode == "historical_fallback"
    assert obs.bounding_box == (24.5, 91.0, 26.5, 93.0)

    # Test set_feature and get_feature
    obs.set_feature("reflectivity", 55.5, 1.0)
    assert obs.get_feature("reflectivity") == (55.5, 1.0)
    assert obs.mask == 1.0
    assert obs.value == 55.5

    # Test missing / None value forcing mask to 0
    obs.set_feature("missing_param", None)
    assert obs.get_feature("missing_param") == (0.0, 0.0)

    # Test NaN value forcing mask to 0
    obs_nan = CommonObservationSchema(source="TEST_NAN", value=float("nan"))
    assert obs_nan.mask == 0.0

    # Serialization
    dump = obs.model_dump()
    assert "observations" in dump
    assert dump["observations"]["reflectivity"] == [55.5, 1.0]


def test_grid_cell_schema():
    cell = GridCellSchema(
        lat=25.2702,
        lon=91.7323,
        i=38,
        j=36,
        elevation_m=1430.0,
        reflectivity=(58.2, 1.0),
        radial_velocity=(-16.4, 1.0),
        ir_bt=(202.0, 1.0),
        ctcr=(-0.65, 1.0),
        flash_count=(34.0, 1.0),
        temp_2m=(18.2, 1.0),
        surface_pressure=(858.0, 1.0),
        ci_prob=0.92,
        hail_prob=0.74,
        cloudburst_prob=0.88,
        downburst_prob=0.45,
        downburst_vel=28.5,
        lightning_risk=0.95,
    )
    assert cell.cell_id == "cell_25.270_91.732"
    assert cell.elevation_m == 1430.0
    assert cell.ci_prob == 0.92

    # Feature vector shape (20, 2)
    vec = cell.get_feature_vector()
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (20, 2)
    assert vec.dtype == np.float32
    assert vec[0, 0] == 58.2  # Reflectivity value
    assert vec[0, 1] == 1.0   # Reflectivity mask

    # Scalar values dictionary
    scalars = cell.scalar_values
    assert scalars["reflectivity"] == 58.2
    assert scalars["temp_2m"] == 18.2


def test_feature_tensor_schema():
    T, C, H, W = 4, 20, 100, 100
    arr = np.random.randn(T, C, H, W).astype(np.float32)
    names = [f"channel_{c}" for c in range(C)]

    tensor = FeatureTensorSchema.from_numpy(
        arr=arr,
        channel_names=names,
        bbox=(24.5, 91.0, 26.5, 93.0),
        grid_resolution_km=2.0,
        data_mode="historical_fallback",
        use_base64=True,
    )
    assert tensor.shape == (T, C, H, W)
    assert len(tensor.channel_names) == 20
    assert tensor.data_b64 is not None

    # Roundtrip conversion to NumPy
    arr_out = tensor.to_numpy()
    assert arr_out.shape == (T, C, H, W)
    np.testing.assert_allclose(arr, arr_out, rtol=1e-5, atol=1e-5)

    # Conversion to PyTorch
    torch_t = tensor.to_torch()
    assert isinstance(torch_t, torch.Tensor)
    assert torch_t.shape == (T, C, H, W)


def test_forecast_output_schema():
    fc = ForecastOutputSchema(
        lead_time_minutes=45,
        forecast_timestamp=datetime(2026, 9, 27, 16, 0, 0, tzinfo=timezone.utc),
        ci_prob=0.88,
        lightning_prob=0.92,
        hail_prob=0.65,
        downburst_prob=0.40,
        cloudburst_prob=0.78,
    )
    assert fc.lead_time_minutes == 45
    assert fc.hazard_probabilities["ci"] == 0.88
    assert fc.hazard_probabilities["cloudburst"] == 0.78
    assert fc.ci_prob == 0.88
    assert fc.storm_motion["direction"] == "NE"
    assert fc.ai_model == "ConvectNet v1 (HistoricalMode)"


def test_source_adapter_contract():
    class DummyAdapter(SourceAdapter):
        async def fetch_latest(self) -> CommonObservationSchema:
            obs = CommonObservationSchema(source=self.source_id, data_mode="historical_fallback")
            obs.set_feature("reflectivity", 42.0, 1.0)
            return obs

        async def health_check(self) -> dict:
            return {"source_id": self.source_id, "status": "HEALTHY"}

    adapter = DummyAdapter(source_id="DUMMY_SOURCE")
    assert adapter.source_id == "DUMMY_SOURCE"

    # Test synchronous fetch wrapper
    obs = adapter.fetch_latest_sync()
    assert obs.source == "DUMMY_SOURCE"
    assert obs.get_feature("reflectivity") == (42.0, 1.0)

    # Test quality check
    report = adapter.quality_check(obs)
    assert report.status == "GOOD"
    assert report.coverage_pct == 100.0
