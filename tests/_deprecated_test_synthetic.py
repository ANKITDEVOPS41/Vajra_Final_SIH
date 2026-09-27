"""Unit tests for the physically grounded synthetic convective field generator."""

import numpy as np
import pytest

from backend.data.synthetic import synthetic_engine


def test_synthetic_grid_shapes_and_masks():
    values, masks = synthetic_engine.generate_full_grid()
    assert values.shape == (20, 100, 100)
    assert masks.shape == (20, 100, 100)
    assert np.all(masks == 1.0)


def test_radar_reflectivity_physics():
    values, _ = synthetic_engine.generate_full_grid()
    refl = values[0]  # Channel 0: Reflectivity

    # Core peak should be between 55 and 68 dBZ (severe convective core)
    assert 55.0 <= refl.max() <= 68.0

    # Minimum should be 0 dBZ (clear air)
    assert refl.min() == 0.0

    # Mean reflectivity over domain should be positive
    assert refl.mean() > 2.0


def test_rotational_velocity_couplet():
    values, _ = synthetic_engine.generate_full_grid()
    vr = values[1]  # Channel 1: Radial Velocity

    # Must contain both strong inbound (< -10 m/s) and strong outbound (> 10 m/s)
    assert vr.min() < -10.0
    assert vr.max() > 10.0


def test_satellite_ir_overshooting_top():
    values, _ = synthetic_engine.generate_full_grid()
    ir_bt = values[8]  # Channel 8: IR Brightness Temp

    # Overshooting top must drop to 195-212 K
    assert 195.0 <= ir_bt.min() <= 212.0

    # Clear-sky background should be ambient warm (~285-295 K)
    assert ir_bt.max() >= 288.0

    # Cloud-top cooling rate (CTCR, Channel 10) should be negative in updrafts
    ctcr = values[10]
    assert ctcr.min() <= -0.40  # K/min


def test_cold_pool_and_orography():
    values, _ = synthetic_engine.generate_full_grid()
    temp_2m = values[14]  # Channel 14: Temp 2m
    pressure = values[18]  # Channel 18: Surface pressure

    # Temperature in rain-cooled core should be lower than plains ambient
    assert temp_2m.min() < 20.0
    assert temp_2m.max() > 24.0

    # Surface pressure range reflects topography and mesohigh
    assert 700.0 < pressure.min() < 900.0
    assert 980.0 < pressure.max() < 1020.0


def test_synthetic_cell_generation():
    cell = synthetic_engine.generate_synthetic_cell(25.2702, 91.7323)
    assert cell.data_mode == "historical_fallback"
    assert cell.reflectivity[0] > 50.0  # Intense core near Sohra
    assert cell.ci_prob > 0.70
    assert cell.cloudburst_prob > 0.60
    assert cell.cell_id == "cell_25.270_91.730"


def test_synthetic_observation_generation():
    for source in ["MOSDAC_RADAR", "MOSDAC_SATELLITE", "BHUVAN_LIGHTNING", "IMD_AWS"]:
        obs = synthetic_engine.generate_synthetic_observation(source)
        assert obs.source == source
        assert obs.data_mode == "historical_fallback"
        assert len(obs.observations) > 0


def test_synthetic_tensor_generation():
    tensor = synthetic_engine.generate_synthetic_tensor(T=4)
    assert tensor.shape == (4, 20, 100, 100)
    assert tensor.data_mode == "historical_fallback"
    arr = tensor.to_numpy()
    assert arr.shape == (4, 20, 100, 100)


def test_synthetic_forecast_generation():
    fc = synthetic_engine.generate_synthetic_forecast(lead_time_min=30)
    assert fc.lead_time_minutes == 30
    assert fc.data_mode == "historical_fallback"
    assert "ci" in fc.hazard_probabilities
    assert "cloudburst" in fc.hazard_probabilities
    assert fc.hazard_probabilities["ci"] > 0.5
    assert len(fc.storm_cells["features"]) >= 1
