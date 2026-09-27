"""Unit tests for spatial coordinate grid and O(1) index mappings."""

import pytest
import numpy as np

from backend.data.grid import CoordinateGrid, default_grid


def test_grid_initialization():
    grid = CoordinateGrid(min_lat=24.5, max_lat=26.5, min_lon=91.0, max_lon=93.0, height=100, width=100)
    assert grid.H == 100
    assert grid.W == 100
    assert abs(grid.lat_res - 0.02) < 1e-5
    assert abs(grid.lon_res - 0.02) < 1e-5
    assert grid.lat_grid.shape == (100, 100)
    assert grid.lon_grid.shape == (100, 100)


def test_o1_coordinate_indexing():
    grid = default_grid
    # Sohra / Cherrapunji coords
    lat, lon = 25.2702, 91.7323
    i, j = grid.latlon_to_indices(lat, lon)
    assert 0 <= i < grid.H
    assert 0 <= j < grid.W

    # Reverse lookup
    center_lat, center_lon = grid.indices_to_latlon(i, j)
    assert abs(center_lat - lat) <= grid.lat_res
    assert abs(center_lon - lon) <= grid.lon_res


def test_boundary_clamping():
    grid = default_grid
    # Out of bounds coordinates should clamp safely to edges without crashing
    i_low, j_low = grid.latlon_to_indices(20.0, 85.0)
    assert i_low == 0
    assert j_low == 0

    i_high, j_high = grid.latlon_to_indices(30.0, 99.0)
    assert i_high == grid.H - 1
    assert j_high == grid.W - 1


def test_elevation_profile():
    grid = default_grid
    # Sohra plateau should be ~1430m
    elev_sohra = grid.get_elevation_m(25.2702, 91.7323)
    assert 1300 <= elev_sohra <= 1600

    # Shillong Peak should be higher (~1700-2000m)
    elev_shillong = grid.get_elevation_m(25.5689, 91.8831)
    assert elev_shillong > elev_sohra

    # Bangladesh Sylhet plains (lat < 25.10) should be low (~10-30m)
    elev_plains = grid.get_elevation_m(24.6, 91.5)
    assert elev_plains < 50.0

    # Brahmaputra valley (Guwahati area) should be lower (~50-150m)
    elev_gau = grid.get_elevation_m(26.1158, 91.5859)
    assert elev_gau < 250.0


def test_block_indices():
    grid = default_grid
    cells = grid.get_block_indices(25.2702, 91.7323, block_radius=1)
    assert len(cells) == 9
    for i, j in cells:
        assert 0 <= i < grid.H
        assert 0 <= j < grid.W


def test_cell_metadata():
    grid = default_grid
    meta = grid.get_cell_metadata(25.2702, 91.7323)
    assert meta["query_lat"] == 25.2702
    assert meta["query_lon"] == 91.7323
    assert "elevation_m" in meta
    assert meta["distance_to_sohra_km"] < 1.0
