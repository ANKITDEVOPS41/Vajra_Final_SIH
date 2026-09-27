"""Spatial coordinate grid and O(1) index projection for ConvectNow.

Covers Northeast India bounding box 24.5°N–26.5°N, 91.0°E–93.0°E centered on
Sohra / Cherrapunji (25.2702°N, 91.7323°E, 1430m AMSL).

Features:
- Dual-grid indexing (100x100 AI Analysis Grid A / 3x3 Operational Blocks Grid B)
- Fast O(1) lat/lon to grid cell index mapping
- Khasi Hills orographic topography elevation function
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


class CoordinateGrid:
    """Spatio-temporal coordinate grid over the Northeast India ConvectNow domain."""

    def __init__(
        self,
        min_lat: float = 24.5,
        max_lat: float = 26.5,
        min_lon: float = 91.0,
        max_lon: float = 93.0,
        height: int = 100,
        width: int = 100,
    ):
        self.min_lat = float(min_lat)
        self.max_lat = float(max_lat)
        self.min_lon = float(min_lon)
        self.max_lon = float(max_lon)
        self.H = int(height)
        self.W = int(width)

        self.lat_span = self.max_lat - self.min_lat
        self.lon_span = self.max_lon - self.min_lon

        self.lat_res = self.lat_span / self.H
        self.lon_res = self.lon_span / self.W

        # Cell center coordinates
        self.lat_vec = np.linspace(
            self.min_lat + self.lat_res / 2.0,
            self.max_lat - self.lat_res / 2.0,
            self.H,
            dtype=np.float32,
        )
        self.lon_vec = np.linspace(
            self.min_lon + self.lon_res / 2.0,
            self.max_lon - self.lon_res / 2.0,
            self.W,
            dtype=np.float32,
        )

        # 2D Meshgrids
        self.lon_grid, self.lat_grid = np.meshgrid(self.lon_vec, self.lat_vec)

        # Key geographic anchors
        self.sohra_lat = 25.2702
        self.sohra_lon = 91.7323
        self.shillong_lat = 25.5689
        self.shillong_lon = 91.8831
        self.guwahati_lat = 26.1158
        self.guwahati_lon = 91.5859
        self.mawsynram_lat = 25.3000
        self.mawsynram_lon = 91.5800

        # Physical spacing in kilometers (1 deg lat = 111.13 km, 1 deg lon at 25.5N = ~100.5 km)
        self.dy_km = self.lat_res * 111.13
        self.dx_km = self.lon_res * 111.13 * math.cos(math.radians(25.5))

    def is_within_bounds(self, lat: float, lon: float) -> bool:
        """Check if coordinates fall strictly within bounding box."""
        return (
            self.min_lat <= lat <= self.max_lat
            and self.min_lon <= lon <= self.max_lon
        )

    def latlon_to_indices(self, lat: float, lon: float) -> Tuple[int, int]:
        """Convert latitude and longitude to grid cell indices (i, j) in O(1) time.

        Row i increases from south (min_lat) to north (max_lat).
        Column j increases from west (min_lon) to east (max_lon).
        """
        # Clamp to domain limits
        lat_clamped = max(self.min_lat, min(self.max_lat, lat))
        lon_clamped = max(self.min_lon, min(self.max_lon, lon))

        # Float position
        fi = (lat_clamped - self.min_lat) / self.lat_res
        fj = (lon_clamped - self.min_lon) / self.lon_res

        # Integer cell index [0..H-1], [0..W-1]
        i = int(math.floor(fi))
        j = int(math.floor(fj))

        i = max(0, min(self.H - 1, i))
        j = max(0, min(self.W - 1, j))

        return i, j

    def indices_to_latlon(self, i: int, j: int) -> Tuple[float, float]:
        """Convert grid cell indices (i, j) to center latitude and longitude."""
        i_clamped = max(0, min(self.H - 1, i))
        j_clamped = max(0, min(self.W - 1, j))

        lat = float(self.lat_vec[i_clamped])
        lon = float(self.lon_vec[j_clamped])
        return lat, lon

    def get_elevation_m(self, lat: float, lon: float) -> float:
        """Compute physically realistic elevation (m AMSL) over the Khasi-Jaintia plateau.

        Topography profile:
        - South of 25.10°N: Bangladesh Sylhet floodplains (~15 m)
        - 25.10°N to 25.35°N: Steep Khasi escarpment rising 1400m over 25 km
        - 25.27°N, 91.73°E: Sohra plateau (~1,430 m)
        - 25.57°N, 91.88°E: Shillong Peak / central highland (~1,960 m)
        - North of 26.00°N: Brahmaputra River valley (~50 m)
        """
        # Base elevation from latitude cross-section (Southern wall rising to plateau, then dropping north)
        if lat < 25.10:
            elev = 15.0 + max(0.0, (lat - 24.5) / 0.6) * 10.0
        elif lat <= 25.35:
            # Steep escarpment: 25 m to 1430 m
            progress = (lat - 25.10) / 0.25
            # Sigmoid transition
            elev = 25.0 + 1400.0 / (1.0 + math.exp(-12.0 * (progress - 0.45)))
        elif lat <= 25.65:
            # High Meghalaya plateau
            elev = 1430.0 + 400.0 * math.sin((lat - 25.35) / 0.30 * math.pi)
        else:
            # Northern descent to Brahmaputra
            progress = min(1.0, (lat - 25.65) / 0.85)
            elev = 1430.0 * math.exp(-4.2 * progress) + 55.0

        # Local peaks around Shillong Peak (25.57, 91.88)
        dist_shillong_sq = (lat - self.shillong_lat) ** 2 + (lon - self.shillong_lon) ** 2
        elev += 350.0 * math.exp(-dist_shillong_sq / 0.02)

        # Cherrapunji gorge variation
        dist_sohra_sq = (lat - self.sohra_lat) ** 2 + (lon - self.sohra_lon) ** 2
        elev += 80.0 * math.exp(-dist_sohra_sq / 0.01)

        return float(np.clip(elev, 10.0, 2100.0))

    def get_elevation_grid(self) -> np.ndarray:
        """Compute full 2D elevation grid [H, W] in meters."""
        elev_grid = np.zeros((self.H, self.W), dtype=np.float32)
        for i in range(self.H):
            for j in range(self.W):
                lat = float(self.lat_vec[i])
                lon = float(self.lon_vec[j])
                elev_grid[i, j] = self.get_elevation_m(lat, lon)
        return elev_grid

    def get_block_indices(
        self, lat: float, lon: float, block_radius: int = 1
    ) -> List[Tuple[int, int]]:
        """Return list of (i, j) cell indices forming a (2*r + 1) x (2*r + 1) block.

        For block_radius=1, returns the 9 cells of the 3x3 km operational block.
        """
        center_i, center_j = self.latlon_to_indices(lat, lon)
        cells = []
        for di in range(-block_radius, block_radius + 1):
            for dj in range(-block_radius, block_radius + 1):
                ni = max(0, min(self.H - 1, center_i + di))
                nj = max(0, min(self.W - 1, center_j + dj))
                cells.append((ni, nj))
        return cells

    def get_cell_metadata(self, lat: float, lon: float) -> Dict[str, Any]:
        """Return coordinate and elevation metadata for a clicked point."""
        i, j = self.latlon_to_indices(lat, lon)
        cell_lat, cell_lon = self.indices_to_latlon(i, j)
        elevation = self.get_elevation_m(lat, lon)

        # Distance to key landmarks in km
        d_sohra = math.sqrt(
            ((lat - self.sohra_lat) * 111.13) ** 2
            + ((lon - self.sohra_lon) * 100.5) ** 2
        )
        d_shillong = math.sqrt(
            ((lat - self.shillong_lat) * 111.13) ** 2
            + ((lon - self.shillong_lon) * 100.5) ** 2
        )

        return {
            "query_lat": lat,
            "query_lon": lon,
            "cell_lat": cell_lat,
            "cell_lon": cell_lon,
            "i": i,
            "j": j,
            "cell_id": f"cell_{cell_lat:.3f}_{cell_lon:.3f}",
            "elevation_m": round(elevation, 1),
            "distance_to_sohra_km": round(d_sohra, 1),
            "distance_to_shillong_km": round(d_shillong, 1),
            "grid_resolution_km": round(self.dx_km, 2),
        }


# Global default instance
default_grid = CoordinateGrid()
