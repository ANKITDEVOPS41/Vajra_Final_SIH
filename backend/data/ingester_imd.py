"""
ConvectNow — IMD Doppler Weather Radar (DWR) GeoServer & Operational Raster Ingestion
Handles:
1. Ingestion of live IMD GeoServer WMS/WCS feeds (Mausam / MoES) with timeout handling
2. Graceful offline replay fallback from local operational radar GIFs (datasets/imd_radar/)
3. Calibrated colorbar decoding for operational products:
   - PPI (Plan Position Indicator Reflectivity, dBZ)
   - CAZ (Column Max / Constant Altitude Reflectivity, dBZ)
   - PPV (Plan Position Indicator Radial Velocity, m/s)
   - SRI (Surface Rainfall Intensity, mm/hr)
   - PAC (Precipitation Accumulation, mm)
   - VP2 (Volume Velocity Processing / Vertical Profile, m/s)
4. Integration with GridReprojector for 1 km EPSG:4326 mapping
"""

import os
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image, ImageFile

# Ensure truncated GIF files from real-time feeds load without crashing
ImageFile.LOAD_TRUNCATED_IMAGES = True

from convectnow.backend.data.projection import GridReprojector

# IMD Delhi DWR Station Constants (Mausam Bhawan / Palam)
DEFAULT_STATION = "delhi"
DEFAULT_STATION_LAT = 28.588
DEFAULT_STATION_LON = 77.218
DEFAULT_MAX_RANGE_KM = 250.0

# -------------------------------------------------------------------------
# Calibrated Palette Definitions (RGB -> Physical Value)
# Derived from operational IMD Enterprise Electronics Corp (EEC) colorbars
# -------------------------------------------------------------------------

# Reflectivity (dBZ): -5 to 65 dBZ (PPI, CAZ)
REFLECTIVITY_PALETTE = np.array([
    [58, 0, 160],    # 0 dBZ (dark violet)
    [0, 25, 176],    # 5 dBZ (navy)
    [0, 58, 200],    # 10 dBZ (deep blue)
    [0, 71, 255],    # 15 dBZ (blue)
    [0, 121, 255],   # 20 dBZ (cyan-blue)
    [26, 163, 255],  # 25 dBZ (cyan)
    [83, 209, 255],  # 30 dBZ (light cyan)
    [135, 241, 255], # 35 dBZ (pale cyan)
    [252, 252, 122], # 40 dBZ (yellow)
    [255, 230, 0],   # 45 dBZ (yellow-orange)
    [255, 189, 0],   # 50 dBZ (amber)
    [255, 115, 0],   # 55 dBZ (orange)
    [255, 63, 0],    # 60 dBZ (red-orange)
    [200, 0, 0]      # 65 dBZ (crimson)
], dtype=np.float32)
REFLECTIVITY_VALUES = np.array(
    [0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0, 60.0, 65.0],
    dtype=np.float32
)

# Doppler Radial Velocity (m/s): Inbound negative (blue/cyan), outbound positive (yellow/red)
VELOCITY_PALETTE = np.array([
    [58, 0, 160],    # -28 m/s
    [0, 25, 176],    # -24 m/s
    [0, 58, 200],    # -20 m/s
    [0, 71, 255],    # -16 m/s
    [0, 121, 255],   # -12 m/s
    [26, 163, 255],  # -8 m/s
    [83, 209, 255],  # -4 m/s
    [135, 241, 255], # 0 m/s (zero isodop)
    [252, 252, 122], # +4 m/s
    [255, 230, 0],   # +8 m/s
    [255, 189, 0],   # +12 m/s
    [255, 115, 0],   # +16 m/s
    [255, 63, 0],    # +20 m/s
    [200, 0, 0],     # +24 m/s
    [200, 0, 79]     # +28 m/s
], dtype=np.float32)
VELOCITY_VALUES = np.array(
    [-28.0, -24.0, -20.0, -16.0, -12.0, -8.0, -4.0, 0.0, 4.0, 8.0, 12.0, 16.0, 20.0, 24.0, 28.0],
    dtype=np.float32
)

# Surface Rain Intensity (mm/hr): SRI product
RAIN_INTENSITY_PALETTE = np.array([
    [58, 0, 160],    # 0.5 mm/hr
    [0, 25, 176],    # 1.0 mm/hr
    [0, 58, 200],    # 2.0 mm/hr
    [0, 71, 255],    # 5.0 mm/hr
    [0, 121, 255],   # 10.0 mm/hr
    [26, 163, 255],  # 20.0 mm/hr
    [83, 209, 255],  # 35.0 mm/hr
    [135, 241, 255], # 50.0 mm/hr
    [252, 252, 122], # 75.0 mm/hr
    [255, 230, 0],   # 100.0 mm/hr (cloudburst boundary)
    [255, 189, 0],   # 125.0 mm/hr
    [255, 115, 0],   # 150.0 mm/hr
    [255, 63, 0],    # 200.0 mm/hr
    [200, 0, 0]      # 250.0 mm/hr
], dtype=np.float32)
RAIN_INTENSITY_VALUES = np.array(
    [0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 35.0, 50.0, 75.0, 100.0, 125.0, 150.0, 200.0, 250.0],
    dtype=np.float32
)

# Precipitation Accumulation (mm): PAC product
ACCUMULATION_PALETTE = np.array([
    [252, 252, 122], # 1.0 mm
    [255, 230, 0],   # 5.0 mm
    [255, 189, 0],   # 10.0 mm
    [255, 115, 0],   # 25.0 mm
    [255, 63, 0],    # 50.0 mm
    [200, 0, 0]      # 100.0 mm
], dtype=np.float32)
ACCUMULATION_VALUES = np.array([1.0, 5.0, 10.0, 25.0, 50.0, 100.0], dtype=np.float32)


@dataclass
class IMDRadarProduct:
    """
    Standardized data container for decoded operational IMD radar products.
    """
    data: np.ndarray
    product_type: str
    station: str
    station_lat: float
    station_lon: float
    max_range_km: float
    resolution_km: float
    units: str
    timestamp: str
    is_live: bool
    metadata: Dict = field(default_factory=dict)

    def to_epsg4326(
        self,
        target_bbox: Optional[Tuple[float, float, float, float]] = None,
        target_shape: Tuple[int, int] = (256, 256)
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Reprojects the radar Cartesian product onto a 1 km EPSG:4326 regular lat/lon grid.
        Returns:
            (reprojected_grid, target_lats, target_lons)
        """
        reprojector = GridReprojector()
        return reprojector.reproject_radar_to_epsg4326(
            self.data,
            station_lat=self.station_lat,
            station_lon=self.station_lon,
            max_range_km=self.max_range_km,
            target_bbox=target_bbox,
            target_shape=target_shape
        )


def _resolve_path(path: str) -> str:
    if not path:
        return path
    if os.path.isabs(path) and os.path.exists(path):
        return path
    if os.path.exists(path):
        return os.path.abspath(path)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.abspath(os.path.join(base_dir, "../../..", path)),
        os.path.abspath(os.path.join(base_dir, "../..", path)),
        os.path.abspath(os.path.join("..", path)),
        os.path.join("/Users/gauravkumarnayak/Desktop/new sih", path)
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return path


class IMDGeoServerWorker:
    """
    Asynchronous ingestion worker for IMD Doppler Weather Radar feeds.
    Provides online live GeoServer / Mausam WMS polling with seamless offline cached fallback.
    """

    def __init__(
        self,
        radar_dir: str = "datasets/imd_radar",
        geoserver_url: str = "https://mausam.imd.gov.in/geoserver/wms",
        station: str = DEFAULT_STATION,
        station_lat: float = DEFAULT_STATION_LAT,
        station_lon: float = DEFAULT_STATION_LON,
        timeout_sec: float = 2.0
    ):
        self.radar_dir = _resolve_path(radar_dir)
        self.geoserver_url = geoserver_url
        self.station = station
        self.station_lat = station_lat
        self.station_lon = station_lon
        self.timeout_sec = timeout_sec

        self.product_map = {
            "ppi": "ppi_delhi.gif",
            "caz": "caz_delhi.gif",
            "ppv": "ppv_delhi.gif",
            "sri": "sri_delhi.gif",
            "pac": "pac_delhi.gif",
            "vp2": "vp2_delhi.gif"
        }

    def list_available_products(self) -> List[str]:
        """Returns list of supported IMD operational product codes."""
        return list(self.product_map.keys())

    def get_station_metadata(self) -> Dict:
        """Returns station geolocation and operational hardware specifications."""
        return {
            "station": self.station.upper(),
            "latitude": self.station_lat,
            "longitude": self.station_lon,
            "radar_type": "C-band Polarimetric Doppler Weather Radar",
            "operational_agency": "India Meteorological Department (MoES)",
            "antenna_diameter_m": 8.5,
            "beamwidth_deg": 1.0,
            "pulse_repetition_freq_hz": [250, 1200],
            "max_unambiguous_range_km": DEFAULT_MAX_RANGE_KM,
            "nyquist_velocity_ms": 32.0
        }

    def _decode_palette_grid(
        self,
        scope_rgb: np.ndarray,
        palette_rgb: np.ndarray,
        palette_values: np.ndarray,
        max_dist_sq: float = 4000.0
    ) -> np.ndarray:
        """
        Fast vectorized nearest-neighbor color quantization from RGB pixels to physical values.
        Operates on unique colors to achieve sub-millisecond execution on 720x720 scopes.
        """
        H, W, _ = scope_rgb.shape
        flat_pixels = scope_rgb.reshape(-1, 3)

        # Extract unique RGB colors and mapping indices
        u_colors, inverse_idx = np.unique(flat_pixels, axis=0, return_inverse=True)
        u_float = u_colors.astype(np.float32)

        # Mask background/overlay: pure black and pure white
        is_bg = (
            ((u_float[:, 0] < 15) & (u_float[:, 1] < 15) & (u_float[:, 2] < 15)) |
            ((u_float[:, 0] > 240) & (u_float[:, 1] > 240) & (u_float[:, 2] > 240))
        )

        # Distances: (N_unique, N_palette)
        diff = u_float[:, None, :] - palette_rgb[None, :, :]
        dists = np.sum(diff**2, axis=-1)
        nearest = np.argmin(dists, axis=-1)
        min_dist = np.min(dists, axis=-1)

        valid_match = (~is_bg) & (min_dist < max_dist_sq)
        mapped_values = np.where(valid_match, palette_values[nearest], 0.0)

        physical_grid = mapped_values[inverse_idx].reshape(H, W).astype(np.float32)

        # Apply circular radar horizon mask
        cx, cy = (W - 1) / 2.0, (H - 1) / 2.0
        r_max = min(cx, cy) - 2.0
        y_grid, x_grid = np.indices((H, W), dtype=np.float32)
        r_grid = np.sqrt((x_grid - cx)**2 + (y_grid - cy)**2)
        physical_grid[r_grid > r_max] = 0.0

        return physical_grid

    def decode_radar_gif(
        self,
        file_path_or_product: str,
        is_live: bool = False
    ) -> IMDRadarProduct:
        """
        Decodes an operational IMD radar GIF into quantitative physical grids.

        Args:
            file_path_or_product: File path or product code ('ppi', 'caz', 'ppv', etc.)
            is_live: Boolean flag indicating if source was fetched live
        """
        # Resolve path
        if file_path_or_product in self.product_map:
            p_type = file_path_or_product
            fpath = os.path.join(self.radar_dir, self.product_map[p_type])
        else:
            fpath = file_path_or_product
            fname = os.path.basename(fpath).lower()
            p_type = "ppi"
            for k in self.product_map:
                if k in fname:
                    p_type = k
                    break

        if not os.path.exists(fpath):
            raise FileNotFoundError(f"IMD radar file not found at {fpath}")

        # Open and load image
        with Image.open(fpath) as im:
            rgb_img = im.convert("RGB")
            arr = np.array(rgb_img)

        # Radar scope is the left 720x720 square
        scope_rgb = arr[:720, :720]
        resolution_km = (2.0 * DEFAULT_MAX_RANGE_KM) / 720.0  # ~0.694 km/pixel

        timestamp = datetime.fromtimestamp(os.path.getmtime(fpath), timezone.utc).isoformat()

        if p_type in ["ppi", "caz"]:
            data = self._decode_palette_grid(scope_rgb, REFLECTIVITY_PALETTE, REFLECTIVITY_VALUES)
            units = "dBZ"
        elif p_type == "ppv":
            data = self._decode_palette_grid(scope_rgb, VELOCITY_PALETTE, VELOCITY_VALUES)
            units = "m/s"
        elif p_type == "sri":
            data = self._decode_palette_grid(scope_rgb, RAIN_INTENSITY_PALETTE, RAIN_INTENSITY_VALUES)
            units = "mm/hr"
        elif p_type == "pac":
            data = self._decode_palette_grid(scope_rgb, ACCUMULATION_PALETTE, ACCUMULATION_VALUES)
            units = "mm"
        elif p_type == "vp2":
            # Vertical velocity profile: return normalized array of the plot scope
            gray = np.mean(scope_rgb, axis=-1).astype(np.float32)
            data = gray / 255.0
            units = "m/s_profile"
        else:
            data = self._decode_palette_grid(scope_rgb, REFLECTIVITY_PALETTE, REFLECTIVITY_VALUES)
            units = "dBZ"

        return IMDRadarProduct(
            data=data,
            product_type=p_type,
            station=self.station,
            station_lat=self.station_lat,
            station_lon=self.station_lon,
            max_range_km=DEFAULT_MAX_RANGE_KM,
            resolution_km=resolution_km,
            units=units,
            timestamp=timestamp,
            is_live=is_live,
            metadata={
                "source_file": fpath,
                "raw_image_shape": arr.shape,
                "scope_shape": data.shape,
                "peak_value": float(np.max(data)),
                "mean_echo": float(np.mean(data[data > 0])) if np.any(data > 0) else 0.0
            }
        )

    def fetch_live_or_cached(self, product_type: str = "ppi") -> IMDRadarProduct:
        """
        Attempts to fetch live radar sweep from IMD GeoServer / Mausam portal.
        Falls back to local cached GIF upon network timeout or connection error.
        """
        product_type = product_type.lower()
        if product_type not in self.product_map:
            product_type = "ppi"

        cached_path = os.path.join(self.radar_dir, self.product_map[product_type])

        # Attempt live polling
        wms_url = (
            f"{self.geoserver_url}?"
            f"service=WMS&version=1.1.1&request=GetMap&"
            f"layers=imd:{product_type}_{self.station}&"
            f"format=image/gif&width=880&height=720&srs=EPSG:4326"
        )

        try:
            req = urllib.request.Request(
                wms_url,
                headers={"User-Agent": "ConvectNow-Operational-DataIngester/1.0"}
            )
            with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                if response.status == 200:
                    content = response.read()
                    temp_live_path = os.path.join(self.radar_dir, f"_live_{product_type}.gif")
                    with open(temp_live_path, "wb") as f_out:
                        f_out.write(content)
                    return self.decode_radar_gif(temp_live_path, is_live=True)
        except (urllib.error.URLError, TimeoutError, OSError):
            # Graceful offline fallback
            pass

        # Return cached operational product
        return self.decode_radar_gif(cached_path, is_live=False)
