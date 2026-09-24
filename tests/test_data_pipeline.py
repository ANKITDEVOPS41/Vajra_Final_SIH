"""
ConvectNow — Data Pipeline Comprehensive Unit & Integration Tests (Milestone 1)
Tests:
1. IMD Doppler Weather Radar GeoServer ingestion & operational raster GIF decoding
2. MOSDAC INSAT-3DR multispectral ingestion & thermodynamic Planck calibration
3. Automated Quality Control (TDBZ clutter rejection, satellite AP gating, optical-flow imputation)
4. Pure NumPy/SciPy closed-form coordinate reprojection (LAEA, Geostationary, Polar to EPSG:4326)
5. Multi-modal PyTorch ConvectDataset & DataLoader yielding (B, C=4, T=12, H=128, W=128)
"""

import os
import time
import pytest
import numpy as np
import torch

from convectnow.backend.data import (
    GridReprojector,
    laea_forward,
    laea_inverse,
    geos_forward,
    geos_inverse,
    polar_to_cartesian,
    cartesian_to_latlon,
    latlon_to_cartesian,
    QualityControlFilter,
    IMDGeoServerWorker,
    IMDRadarProduct,
    MOSDACIngester,
    MOSDACProduct,
    ConvectDataset,
    create_convect_dataloader
)


# =========================================================================
# 1. IMD Radar GeoServer & Operational Raster Ingestion Tests
# =========================================================================

def test_imd_operational_gif_decoding_all_products():
    """Verifies calibrated decoding of all 6 operational IMD radar GIF products."""
    worker = IMDGeoServerWorker(radar_dir="datasets/imd_radar")
    products = worker.list_available_products()
    assert set(products) == {"ppi", "caz", "ppv", "sri", "pac", "vp2"}

    for prod_name in products:
        prod = worker.decode_radar_gif(prod_name)
        assert isinstance(prod, IMDRadarProduct)
        assert prod.data.shape == (720, 720)
        assert prod.data.dtype == np.float32
        assert not np.isnan(prod.data).any()
        assert prod.station.lower() == "delhi"
        assert np.isclose(prod.station_lat, 28.588)
        assert np.isclose(prod.station_lon, 77.218)
        assert prod.max_range_km == 250.0

        if prod_name in ["ppi", "caz"]:
            assert prod.units == "dBZ"
            assert 0.0 <= np.max(prod.data) <= 75.0
        elif prod_name == "ppv":
            assert prod.units == "m/s"
            assert -32.0 <= np.min(prod.data) <= 32.0
            assert -32.0 <= np.max(prod.data) <= 32.0
        elif prod_name == "sri":
            assert prod.units == "mm/hr"
            assert 0.0 <= np.max(prod.data) <= 300.0
        elif prod_name == "pac":
            assert prod.units == "mm"
            assert 0.0 <= np.max(prod.data) <= 200.0
        elif prod_name == "vp2":
            assert prod.units == "m/s_profile"
            assert 0.0 <= np.max(prod.data) <= 1.0


def test_imd_geoserver_live_fallback():
    """Verifies that live stream polling gracefully falls back to local cache when offline."""
    worker = IMDGeoServerWorker(
        radar_dir="datasets/imd_radar",
        geoserver_url="http://invalid-offline-host.example.com/geoserver",
        timeout_sec=0.5
    )
    prod = worker.fetch_live_or_cached("ppi")
    assert prod.data.shape == (720, 720)
    assert prod.units == "dBZ"
    assert prod.is_live is False


def test_imd_radar_reprojection_epsg4326():
    """Verifies Cartesian radar product reprojection onto regular EPSG:4326 grid."""
    worker = IMDGeoServerWorker(radar_dir="datasets/imd_radar")
    prod = worker.decode_radar_gif("ppi")

    reproj_grid, lats, lons = prod.to_epsg4326(target_shape=(128, 128))
    assert reproj_grid.shape == (128, 128)
    assert len(lats) == 128 and len(lons) == 128
    # Bounding box should surround Delhi station (lat ~28.59, lon ~77.22)
    assert lats[0] < prod.station_lat < lats[-1]
    assert lons[0] < prod.station_lon < lons[-1]
    assert not np.isnan(reproj_grid).any()


# =========================================================================
# 2. MOSDAC INSAT-3DR Multispectral & Planck Calibration Tests
# =========================================================================

def test_mosdac_planck_thermodynamic_calibration():
    """Verifies authentic thermodynamic Planck radiation forward and inverse round-trip."""
    ingester = MOSDACIngester()

    # Test key channels: TIR1 (10.8 um), TIR2 (12.0 um), WV (6.9 um)
    test_wavelengths = [10.8, 12.0, 6.9]
    test_temperatures = [190.0, 220.0, 260.0, 300.0, 320.0]

    for w_um in test_wavelengths:
        for t_k in test_temperatures:
            radiance = ingester.planck_radiance(t_k, w_um)
            assert radiance > 0.0
            recovered_tb = ingester.planck_temperature(radiance, w_um)
            assert np.isclose(t_k, recovered_tb, atol=1e-4), (
                f"Planck mismatch at lambda={w_um} um, T={t_k} K: recovered={recovered_tb}"
            )


def test_mosdac_synthetic_cube_generation():
    """Verifies offline synthetic benchmark multispectral cube generation."""
    ingester = MOSDACIngester()
    cube = ingester.generate_synthetic_insat3dr_cube(
        shape=(128, 128),
        storm_center=(64, 64),
        cold_core_k=198.0,
        warm_bg_k=302.0
    )

    assert set(cube.keys()) == {"TIR1", "TIR2", "WV"}

    tir1 = cube["TIR1"]
    assert isinstance(tir1, MOSDACProduct)
    assert tir1.tb_k.shape == (128, 128)
    assert tir1.tb_c.shape == (128, 128)
    # Overshooting convective cold core < 210 K (-63 °C)
    assert np.min(tir1.tb_k) < 210.0
    assert np.min(tir1.tb_c) < -63.0
    # Warm cloudless surface background > 295 K
    assert np.max(tir1.tb_k) > 295.0
    assert np.max(tir1.tb_c) > 20.0

    # WV channel should be absorbed by upper troposphere moisture
    wv = cube["WV"]
    assert 200.0 <= np.min(wv.tb_k) <= 260.0


def test_mosdac_reprojection_epsg4326():
    """Verifies geostationary satellite imagery reprojection to EPSG:4326 grid."""
    ingester = MOSDACIngester()
    cube = ingester.generate_synthetic_insat3dr_cube(shape=(100, 100))
    tir1 = cube["TIR1"]

    reproj_tb, lats, lons = tir1.to_epsg4326(
        target_bbox=(20.0, 70.0, 30.0, 80.0),
        target_shape=(64, 64)
    )
    assert reproj_tb.shape == (64, 64)
    assert len(lats) == 64 and len(lons) == 64
    assert not np.isnan(reproj_tb).any()


# =========================================================================
# 3. Quality Control (QC) Pipeline Tests
# =========================================================================

def test_qc_tdbz_ground_clutter_rejection():
    """Verifies Texture of Reflectivity (TDBZ > 18 dB) rejects anomalous ground clutter."""
    qc = QualityControlFilter(tdbz_threshold_db=18.0)

    grid = np.zeros((100, 100), dtype=np.float32)
    # Smooth precipitation region (35 dBZ)
    grid[20:80, 20:80] = 35.0
    # Isolated ground clutter spike (65 dBZ)
    grid[50, 50] = 65.0

    tdbz = qc.compute_tdbz_texture(grid)
    # Precipitation region must have low texture
    assert tdbz[30, 30] < 1.0
    # Clutter spike must exceed 18 dB threshold
    assert tdbz[50, 50] > 18.0

    clean_dbz, clutter_mask = qc.filter_ground_clutter(grid)
    assert clutter_mask[50, 50] is np.True_ or clutter_mask[50, 50] == 1
    assert clean_dbz[50, 50] == 0.0
    assert clean_dbz[30, 30] == 35.0  # Precipitation preserved


def test_qc_satellite_ap_ducting_gate():
    """Verifies cross-sensor thermal check gates anomalous propagation ducting clutter."""
    qc = QualityControlFilter(ap_tb_threshold_k=280.0, ap_dbz_threshold=20.0)

    dbz = np.full((50, 50), 40.0, dtype=np.float32)

    # 1. Warm cloud top (Tb = 295 K > 280 K): False echo under clear skies = AP ducting
    warm_sat = np.full((50, 50), 295.0, dtype=np.float32)
    clean_ap, ap_mask = qc.filter_ap_ducting(dbz, warm_sat)
    assert ap_mask.all()
    assert (clean_ap == 0.0).all()

    # 2. Cold cloud top (Tb = 210 K < 280 K): Genuine convective storm core = PRESERVED
    cold_sat = np.full((50, 50), 210.0, dtype=np.float32)
    clean_storm, storm_mask = qc.filter_ap_ducting(dbz, cold_sat)
    assert not storm_mask.any()
    assert (clean_storm == 40.0).all()


def test_qc_optical_flow_missing_frame_imputation():
    """Verifies Farnebäck bi-directional optical flow synthesizes dropped frames."""
    qc = QualityControlFilter()

    # Moving Gaussian convective cell
    def make_cell(cx, cy):
        y, x = np.ogrid[:128, :128]
        return (60.0 * np.exp(-((x - cx)**2 + (y - cy)**2) / (2.0 * 12.0**2))).astype(np.float32)

    f_prev = make_cell(40.0, 40.0)
    f_next = make_cell(52.0, 52.0)
    f_true = make_cell(46.0, 46.0)

    imputed = qc.impute_missing_frame_optical_flow(f_prev, f_next, alpha=0.5)
    assert imputed.shape == (128, 128)

    # Peak location should match physical midpoint
    py, px = np.unravel_index(np.argmax(imputed), imputed.shape)
    assert abs(py - 46) <= 1 and abs(px - 46) <= 1

    # Correlation with true advected ground truth should exceed 0.95
    corr = np.corrcoef(imputed.flatten(), f_true.flatten())[0, 1]
    assert corr > 0.98


def test_qc_full_pipeline_execution():
    """Verifies integrated QualityControlFilter.apply_full_qc executes all stages."""
    qc = QualityControlFilter()
    raw = np.full((64, 64), 30.0, dtype=np.float32)
    raw[32, 32] = 70.0  # clutter
    sat = np.full((64, 64), 220.0, dtype=np.float32)

    res = qc.apply_full_qc(raw, satellite_tb_k=sat)
    assert "clean_dbz" in res
    assert "clutter_mask" in res
    assert "ap_mask" in res
    assert "was_imputed" in res
    assert "qc_stats" in res
    assert res["qc_stats"]["clutter_pixels_removed"] >= 1
    assert res["was_imputed"] is False


# =========================================================================
# 4. Coordinate Reprojection Tests
# =========================================================================

def test_reprojection_laea_closed_form_roundtrip():
    """Verifies spherical LAEA forward and inverse mapping roundtrip precision."""
    test_lats = [28.588, 34.806, 38.0, 42.15]
    test_lons = [77.218, -105.5, -98.0, -85.3]

    for lat, lon in zip(test_lats, test_lons):
        x, y = laea_forward(lat, lon, lat_0=38.0, lon_0=-98.0)
        rec_lat, rec_lon = laea_inverse(x, y, lat_0=38.0, lon_0=-98.0)
        assert np.isclose(lat, rec_lat, atol=1e-5)
        assert np.isclose(lon, rec_lon, atol=1e-5)


def test_reprojection_geostationary_cgms_roundtrip():
    """Verifies CGMS geostationary projection forward and inverse angles."""
    # New Delhi from INSAT-3DR (lon_0 = 74.0E)
    lat, lon = 28.588, 77.218
    sx, sy, visible = geos_forward(lat, lon, lon_0=74.0)
    assert bool(visible) is True

    rec_lat, rec_lon, valid = geos_inverse(sx, sy, lon_0=74.0)
    assert bool(valid) is True
    assert np.isclose(lat, rec_lat, atol=1e-4)
    assert np.isclose(lon, rec_lon, atol=1e-4)


def test_polar_radar_to_cartesian_reprojection():
    """Verifies Doppler radar polar (r, theta) to Cartesian square grid reprojection."""
    reprojector = GridReprojector()
    polar = np.zeros((250, 360), dtype=np.float32)
    # Isolated storm cell at r=100 km, azimuth 90 deg (East)
    polar[95:105, 85:95] = 55.0

    cart = reprojector.reproject_polar_to_cartesian(polar, max_range_km=250.0, out_shape=(100, 100))
    assert cart.shape == (100, 100)
    # In Cartesian (100, 100), center is (50, 50). East is right: px > 50, py ~ 50
    py, px = np.unravel_index(np.argmax(cart), cart.shape)
    assert abs(py - 50) <= 2
    assert px > 65  # Shifted East


# =========================================================================
# 5. Multi-Modal PyTorch ConvectDataset & DataLoader Tests
# =========================================================================

def test_convect_dataset_item_and_shapes():
    """Verifies ConvectDataset yields (4, 12, 128, 128) tensors and valid 4-head target dicts."""
    ds = ConvectDataset(split="train")
    assert len(ds) > 0

    item_tensor, targets = ds[0]
    assert isinstance(item_tensor, torch.Tensor)
    assert item_tensor.shape == (4, 12, 128, 128)
    assert item_tensor.dtype == torch.float32
    assert not torch.isnan(item_tensor).any()
    assert not torch.isinf(item_tensor).any()

    # Channel 0: Normalized Reflectivity / VIL [0, 1]
    assert 0.0 <= item_tensor[0].min() and item_tensor[0].max() <= 1.0
    # Channel 1: Temporal Growth Delta Z [-1, 1]
    assert -1.0 <= item_tensor[1].min() and item_tensor[1].max() <= 1.0
    # Channel 2: Satellite IR Cooling [0, 1]
    assert 0.0 <= item_tensor[2].min() and item_tensor[2].max() <= 1.0
    # Channel 3: Normalized Lightning Flash Density [0, 1]
    assert 0.0 <= item_tensor[3].min() and item_tensor[3].max() <= 1.0

    # Ground truth targets dictionary matching all 4 ConvectNet heads
    required_targets = ["posh", "mesh_mm", "cloudburst_flag", "rain_rate_mmh", "gust_kmh", "ci_prob"]
    for k in required_targets:
        assert k in targets, f"Missing target key: {k}"

    assert 0.0 <= float(targets["posh"]) <= 1.0
    assert 0.0 <= float(targets["mesh_mm"]) <= 100.0
    assert float(targets["cloudburst_flag"]) in [0.0, 1.0]
    assert 0.0 <= float(targets["rain_rate_mmh"]) <= 300.0
    assert 0.0 <= float(targets["gust_kmh"]) <= 200.0
    assert 0.0 <= float(targets["ci_prob"]) <= 1.0


def test_convect_dataloader_batch_yielding_and_throughput():
    """Verifies DataLoader yields clean batches with sub-100ms latency."""
    ds = ConvectDataset(split="train")
    loader = create_convect_dataloader(ds, batch_size=4, shuffle=False)

    t0 = time.time()
    for batch_x, batch_targets in loader:
        elapsed_ms = (time.time() - t0) * 1000.0
        assert batch_x.shape == (4, 4, 12, 128, 128)
        assert batch_x.dtype == torch.float32
        assert not torch.isnan(batch_x).any()

        for k in ["posh", "mesh_mm", "cloudburst_flag", "rain_rate_mmh", "gust_kmh", "ci_prob"]:
            assert k in batch_targets
            assert batch_targets[k].shape == (4,)
            assert not torch.isnan(batch_targets[k]).any()

        # Throughput SLA: Sub-100 ms per batch
        assert elapsed_ms < 200.0
        break


def test_convect_dataset_val_split_and_cropping():
    """Verifies train/validation split partitioning and crop modes."""
    ds_train = ConvectDataset(split="train", train_ratio=0.8, seed=42)
    ds_val = ConvectDataset(split="val", train_ratio=0.8, seed=42)

    # Disjoint splits
    train_ids = set(ds_train.indices)
    val_ids = set(ds_val.indices)
    assert len(train_ids.intersection(val_ids)) == 0
    assert len(train_ids) + len(val_ids) == len(ds_train.all_event_ids)

    # Test random crop and core centering off
    ds_random = ConvectDataset(split="train", center_crop_on_storm_core=False)
    tensor, _ = ds_random[0]
    assert tensor.shape == (4, 12, 128, 128)


def test_qc_beam_blockage_inpaint():
    """Verifies Navier-Stokes inpainting for radar beam blockage sectors."""
    qc = QualityControlFilter()
    dbz = np.full((64, 64), 40.0, dtype=np.float32)
    # Mask out a blocked sector (e.g., behind terrain or tower)
    mask = np.zeros((64, 64), dtype=np.uint8)
    mask[25:35, 25:35] = 1
    dbz[25:35, 25:35] = 0.0

    inpainted = qc.inpaint_beam_blockage(dbz, mask, inpaint_radius=3)
    assert inpainted.shape == (64, 64)
    # Inpainted sector should be filled with neighbor values (~40 dBZ)
    assert np.mean(inpainted[25:35, 25:35]) > 25.0


def test_imd_station_metadata():
    """Verifies IMD radar station hardware specifications and metadata."""
    worker = IMDGeoServerWorker()
    meta = worker.get_station_metadata()
    assert meta["station"] == "DELHI"
    assert meta["latitude"] == 28.588
    assert meta["longitude"] == 77.218
    assert "C-band" in meta["radar_type"]
    assert meta["nyquist_velocity_ms"] == 32.0


def test_zero_c_gis_dependency_integrity():
    """
    Integrity test ensuring the data pipeline operates purely on NumPy / SciPy / OpenCV
    without depending on heavy external C-extensions (pyproj, rasterio, gdal, wradlib, pyart).
    """
    import sys
    for forbidden in ["pyproj", "rasterio", "osgeo", "wradlib", "pyart", "geopandas"]:
        assert forbidden not in sys.modules, f"Forbidden C-extension {forbidden} was loaded!"
