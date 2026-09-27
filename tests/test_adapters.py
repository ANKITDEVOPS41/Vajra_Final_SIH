"""Unit and integration tests for ConvectNow data source adapters."""

import asyncio
import pytest

from backend.core.schemas import CommonObservationSchema
from backend.data.adapters import (
    BhuvanLightningAdapter,
    IMDAWSAdapter,
    MOSDACRadarAdapter,
    MOSDACSatelliteAdapter,
)


def test_mosdac_radar_adapter():
    adapter = MOSDACRadarAdapter(timeout_sec=2.5)
    assert adapter.source_id == "MOSDAC_RADAR_SOHRA"

    # Health check
    hc = asyncio.run(adapter.health_check())
    assert isinstance(hc, dict)
    assert "status" in hc

    # Fetch latest returns valid CommonObservationSchema
    obs = asyncio.run(adapter.fetch_latest())
    assert isinstance(obs, CommonObservationSchema)
    assert obs.data_mode in ("live", "historical_fallback")
    assert "reflectivity" in obs.observations

    # Quality check
    qr = adapter.quality_check(obs)
    assert qr.status == "GOOD"

    # Sync fetch
    sync_obs = adapter.fetch_latest_sync()
    assert isinstance(sync_obs, CommonObservationSchema)


def test_mosdac_satellite_adapter():
    adapter = MOSDACSatelliteAdapter(timeout_sec=2.5)
    assert adapter.source_id == "MOSDAC_INSAT_3DR"

    hc = asyncio.run(adapter.health_check())
    assert isinstance(hc, dict)
    assert "status" in hc

    obs = asyncio.run(adapter.fetch_latest())
    assert isinstance(obs, CommonObservationSchema)
    assert obs.data_mode in ("live", "historical_fallback")
    assert "ir_bt" in obs.observations

    qr = adapter.quality_check(obs)
    assert qr.status == "GOOD"

    sync_obs = adapter.fetch_latest_sync()
    assert isinstance(sync_obs, CommonObservationSchema)


def test_bhuvan_lightning_adapter():
    adapter = BhuvanLightningAdapter(timeout_sec=2.5)
    assert adapter.source_id == "BHUVAN_LIGHTNING"

    hc = asyncio.run(adapter.health_check())
    assert isinstance(hc, dict)

    obs = asyncio.run(adapter.fetch_latest())
    assert isinstance(obs, CommonObservationSchema)
    assert obs.data_mode in ("live", "historical_fallback")
    assert "flash_count" in obs.observations

    qr = adapter.quality_check(obs)
    assert qr.status == "GOOD"

    sync_obs = adapter.fetch_latest_sync()
    assert isinstance(sync_obs, CommonObservationSchema)


def test_imd_aws_adapter():
    adapter = IMDAWSAdapter(timeout_sec=2.5)
    assert adapter.source_id == "IMD_AWS_STATIONS"

    hc = asyncio.run(adapter.health_check())
    assert isinstance(hc, dict)

    obs = asyncio.run(adapter.fetch_latest())
    assert isinstance(obs, CommonObservationSchema)
    assert obs.data_mode in ("live", "historical_fallback")
    assert "temp_2m" in obs.observations

    qr = adapter.quality_check(obs)
    assert qr.status == "GOOD"

    sync_obs = adapter.fetch_latest_sync()
    assert isinstance(sync_obs, CommonObservationSchema)


def test_adapter_forced_network_fallback():
    """Verify that when live URLs are completely broken, all adapters fall back seamlessly."""
    radar = MOSDACRadarAdapter(timeout_sec=0.1)
    radar.OPEN_SEARCH_URL = "https://invalid.unreachable.gov.in/test"
    obs_radar = asyncio.run(radar.fetch_latest())
    assert obs_radar.data_mode == "historical_fallback"
    assert "reflectivity" in obs_radar.observations

    sat = MOSDACSatelliteAdapter(timeout_sec=0.1)
    sat.OPEN_SEARCH_URL = "https://invalid.unreachable.gov.in/test"
    obs_sat = asyncio.run(sat.fetch_latest())
    assert obs_sat.data_mode == "historical_fallback"
    assert "ir_bt" in obs_sat.observations

    light = BhuvanLightningAdapter(timeout_sec=0.1)
    light.WMS_CAPABILITIES_URL = "https://invalid.unreachable.gov.in/test"
    obs_light = asyncio.run(light.fetch_latest())
    assert obs_light.data_mode == "historical_fallback"
    assert "flash_count" in obs_light.observations

    aws = IMDAWSAdapter(timeout_sec=0.1)
    aws.WFS_URL = "https://invalid.unreachable.gov.in/test"
    obs_aws = asyncio.run(aws.fetch_latest())
    assert obs_aws.data_mode == "historical_fallback"
    assert "temp_2m" in obs_aws.observations
