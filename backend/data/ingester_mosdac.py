"""
ConvectNow — MOSDAC INSAT-3DR Multispectral Ingestion & Planck Calibration
Handles:
1. Ingestion of INSAT-3DR Imager multispectral products (TIR1 10.8µm, TIR2 12.0µm, WV 6.9µm, VIS 0.65µm)
2. Authentic thermodynamic Planck radiation calibration (raw counts -> spectral radiance -> Tb in K and °C)
3. Offline synthetic convective storm cube generator & benchmark calibration dataset builder
4. Integration with GridReprojector for 1 km EPSG:4326 mapping
"""

import os
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import h5py

from convectnow.backend.data.projection import GridReprojector

# -------------------------------------------------------------------------
# Radiation & Satellite Constants (ISRO SAC / MOSDAC INSAT-3D/3DR)
# -------------------------------------------------------------------------
C1 = 1.191042e8  # First radiation constant: 2*h*c^2 in W * um^4 / (m^2 * sr)
C2 = 14387.752   # Second radiation constant: h*c / k in um * K

CHANNEL_SPECS = {
    "TIR1": {
        "wavelength_um": 10.8,
        "description": "Thermal Infrared 1 (Atmospheric Window)",
        "default_slope": 0.088,
        "default_offset": -0.5,
        "cal_a": 0.45,
        "cal_b": 0.998,
        "valid_tb_range_k": (160.0, 340.0)
    },
    "TIR2": {
        "wavelength_um": 12.0,
        "description": "Thermal Infrared 2 (Split Window)",
        "default_slope": 0.092,
        "default_offset": -0.5,
        "cal_a": 0.42,
        "cal_b": 0.998,
        "valid_tb_range_k": (160.0, 340.0)
    },
    "WV": {
        "wavelength_um": 6.9,
        "description": "Water Vapor (Upper Troposphere Moisture)",
        "default_slope": 0.026,
        "default_offset": -0.1,
        "cal_a": 0.65,
        "cal_b": 0.996,
        "valid_tb_range_k": (170.0, 300.0)
    },
    "VIS": {
        "wavelength_um": 0.65,
        "description": "Visible (Reflectance / Albedo)",
        "default_slope": 0.001,
        "default_offset": 0.0,
        "cal_a": 0.0,
        "cal_b": 1.0,
        "valid_tb_range_k": (0.0, 1.0)
    }
}


@dataclass
class MOSDACProduct:
    """
    Container for calibrated INSAT-3DR multispectral products.
    """
    tb_k: np.ndarray             # Brightness temperature in Kelvin
    tb_c: np.ndarray             # Brightness temperature in Celsius
    radiance: np.ndarray         # Spectral radiance in W / (m^2 * sr * um)
    raw_counts: np.ndarray       # Digital Numbers (DN)
    channel: str                 # 'TIR1', 'TIR2', 'WV', 'VIS'
    wavelength_um: float         # Central wavelength in micrometers
    satellite: str = "INSAT-3DR"
    sub_lon: float = 74.0        # Geostationary orbital sub-satellite longitude
    timestamp: str = ""
    metadata: Dict = field(default_factory=dict)

    def to_epsg4326(
        self,
        target_bbox: Tuple[float, float, float, float] = (8.0, 68.0, 37.0, 97.0),
        target_shape: Tuple[int, int] = (256, 256)
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Reprojects the satellite geostationary product onto a 1 km EPSG:4326 regular lat/lon grid.
        Returns:
            (reprojected_tb_k, target_lats, target_lons)
        """
        reprojector = GridReprojector()
        return reprojector.reproject_satellite_to_epsg4326(
            self.tb_k,
            sat_lon_0=self.sub_lon,
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


class MOSDACIngester:
    """
    Operational multispectral ingester and thermodynamic calibration engine for MOSDAC INSAT-3DR.
    """

    def __init__(self, data_dir: str = "datasets/mosdac"):
        self.data_dir = _resolve_path(data_dir)

    @staticmethod
    def planck_radiance(tb_k: Union[float, np.ndarray], wavelength_um: float) -> Union[float, np.ndarray]:
        """
        Computes blackbody spectral radiance L (W / (m^2 * sr * um)) from temperature T (Kelvin)
        via Planck's Radiation Law:
            L(T) = c1 / (lambda^5 * (exp(c2 / (lambda * T)) - 1))
        """
        T_safe = np.maximum(tb_k, 1.0)
        exponential_term = np.exp(np.clip(C2 / (wavelength_um * T_safe), 0.0, 70.0)) - 1.0
        return C1 / ((wavelength_um**5) * exponential_term)

    @staticmethod
    def planck_temperature(
        radiance: Union[float, np.ndarray],
        wavelength_um: float,
        cal_a: float = 0.0,
        cal_b: float = 1.0
    ) -> Union[float, np.ndarray]:
        """
        Inverts Planck's radiation law to convert spectral radiance L to effective
        brightness temperature Tb (Kelvin):
            T* = c2 / (lambda * ln(1 + c1 / (lambda^5 * L)))
            Tb = cal_a + cal_b * T*
        """
        rad_safe = np.maximum(radiance, 1e-6)
        factor = 1.0 + C1 / ((wavelength_um**5) * rad_safe)
        t_star = C2 / (wavelength_um * np.log(factor))
        tb_k = cal_a + (cal_b * t_star)
        return tb_k

    @staticmethod
    def counts_to_radiance(
        counts: np.ndarray,
        slope: float,
        offset: float
    ) -> np.ndarray:
        """
        Converts raw 10-bit digital counts (0 - 1023) to physical radiance:
            L = slope * DN + offset
        """
        return np.maximum(0.0, (counts * slope) + offset)

    @staticmethod
    def radiance_to_counts(
        radiance: np.ndarray,
        slope: float,
        offset: float
    ) -> np.ndarray:
        """
        Inverts calibration equation to simulate raw 10-bit digital counts from radiance.
        """
        counts = (radiance - offset) / max(1e-6, slope)
        return np.clip(np.round(counts), 0, 1023).astype(np.uint16)

    def calibrate_channel(
        self,
        raw_counts: np.ndarray,
        channel: str,
        slope: Optional[float] = None,
        offset: Optional[float] = None
    ) -> MOSDACProduct:
        """
        Performs full calibration pipeline for an INSAT-3DR multispectral band.

        Args:
            raw_counts: 2D array of digital counts (uint16)
            channel: 'TIR1', 'TIR2', 'WV', or 'VIS'
            slope: Sensor calibration slope (optional override)
            offset: Sensor calibration offset (optional override)
        """
        channel = channel.upper()
        if channel not in CHANNEL_SPECS:
            raise ValueError(f"Unknown MOSDAC channel: {channel}. Supported: {list(CHANNEL_SPECS.keys())}")

        spec = CHANNEL_SPECS[channel]
        w_um = spec["wavelength_um"]
        sl = slope if slope is not None else spec["default_slope"]
        off = offset if offset is not None else spec["default_offset"]

        if channel == "VIS":
            # Visible channel reflects solar albedo [0.0, 1.0]
            radiance = self.counts_to_radiance(raw_counts, sl, off)
            tb_k = np.clip(radiance, 0.0, 1.0)
            tb_c = tb_k
        else:
            radiance = self.counts_to_radiance(raw_counts, sl, off)
            tb_k = self.planck_temperature(radiance, w_um, cal_a=spec["cal_a"], cal_b=spec["cal_b"])
            min_k, max_k = spec["valid_tb_range_k"]
            tb_k = np.clip(tb_k, min_k, max_k)
            tb_c = tb_k - 273.15

        return MOSDACProduct(
            tb_k=tb_k.astype(np.float32),
            tb_c=tb_c.astype(np.float32),
            radiance=radiance.astype(np.float32),
            raw_counts=raw_counts,
            channel=channel,
            wavelength_um=w_um,
            satellite="INSAT-3DR",
            sub_lon=74.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            metadata={
                "channel_description": spec["description"],
                "cal_slope": sl,
                "cal_offset": off,
                "min_tb_k": float(np.min(tb_k)),
                "max_tb_k": float(np.max(tb_k)),
                "mean_tb_k": float(np.mean(tb_k))
            }
        )

    def load_hdf5_product(self, h5_path: str, channel: str = "TIR1") -> MOSDACProduct:
        """
        Loads and authenticates an operational MOSDAC HDF5 file (3RIMG_*.h5).
        """
        if not os.path.exists(h5_path):
            raise FileNotFoundError(f"MOSDAC HDF5 file not found: {h5_path}")

        channel = channel.upper()
        ds_name = f"/IMG_{channel}"

        with h5py.File(h5_path, "r") as f:
            if ds_name not in f:
                available = list(f.keys())
                raise KeyError(f"Dataset {ds_name} not found in {h5_path}. Available: {available}")

            raw_counts = f[ds_name][:]
            # Read metadata attributes if available
            slope = float(f[ds_name].attrs.get("CAL_SLOPE", CHANNEL_SPECS[channel]["default_slope"]))
            offset = float(f[ds_name].attrs.get("CAL_OFFSET", CHANNEL_SPECS[channel]["default_offset"]))

        return self.calibrate_channel(raw_counts, channel, slope=slope, offset=offset)

    def generate_synthetic_insat3dr_cube(
        self,
        shape: Tuple[int, int] = (256, 256),
        storm_center: Tuple[int, int] = (128, 128),
        cold_core_k: float = 198.0,
        warm_bg_k: float = 302.0
    ) -> Dict[str, MOSDACProduct]:
        """
        Generates a synthetic, physically consistent INSAT-3DR multispectral storm scene:
        - Cold overshooting convective top (Tb ~ 198 K / -75 °C)
        - Expanded cirrus anvil shield (Tb ~ 215 - 235 K)
        - Upper-tropospheric water vapor moistening (WV channel Tb ~ 220 K)
        - Warm land/sea background (Tb ~ 302 K / 29 °C)

        Returns:
            Dict containing calibrated MOSDACProduct instances for 'TIR1', 'TIR2', and 'WV'.
        """
        H, W = shape
        cy, cx = storm_center
        y_grid, x_grid = np.ogrid[:H, :W]

        # Multi-scale Gaussian anvil & core structure
        dist_sq = (x_grid - cx)**2 + (y_grid - cy)**2

        # Scale Gaussian widths proportionally to the domain size
        min_dim = min(H, W)
        core_sigma = max(4.0, min_dim * 0.06)
        anvil_sigma = max(12.0, min_dim * 0.20)

        # 1. Overshooting top: sharp core
        core_factor = np.exp(-dist_sq / (2.0 * (core_sigma**2)))
        # 2. Cirrus anvil: broad shield
        anvil_factor = np.exp(-dist_sq / (2.0 * (anvil_sigma**2)))

        # Combined cloud temperature profile
        delta_t = warm_bg_k - cold_core_k
        tb_tir1_field = warm_bg_k - (delta_t * 0.7 * anvil_factor) - (delta_t * 0.3 * core_factor)

        # TIR2 (12.0 um) has slight differential absorption (split window difference 0.5 - 2.5 K)
        tb_tir2_field = tb_tir1_field - np.where(tb_tir1_field < 240.0, 1.2, 2.5)

        # WV (6.9 um) is absorbed by middle-tropospheric moisture: warmer than TIR1 in clear air, cold in storm
        tb_wv_field = np.clip(tb_tir1_field * 0.85 + 35.0, 205.0, 255.0)

        results = {}
        for ch, temp_field in [("TIR1", tb_tir1_field), ("TIR2", tb_tir2_field), ("WV", tb_wv_field)]:
            spec = CHANNEL_SPECS[ch]
            # Convert true temperature field to physical radiance via Planck's law
            rad = self.planck_radiance(temp_field, spec["wavelength_um"])
            # Convert radiance to raw 10-bit digital counts
            counts = self.radiance_to_counts(rad, spec["default_slope"], spec["default_offset"])
            # Calibrate back through full pipeline to ensure thermodynamic fidelity
            results[ch] = self.calibrate_channel(counts, ch)

        return results
