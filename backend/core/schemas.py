"""Core Pydantic v2 schemas and abstract adapter contract for ConvectNow.

This module provides the five foundational data contracts for the 0–6 hour
convective nowcasting system:
1. SourceAdapter (ABC): Interface for radar, satellite, lightning, and AWS adapters.
2. CommonObservationSchema: Standardized observation container with [value, mask] pairs.
3. GridCellSchema: 1 km grid cell observation & forecast representation.
4. FeatureTensorSchema: Multi-channel [T, C, H, W] spatio-temporal tensor.
5. ForecastOutputSchema: Unified hazard probabilities and storm kinematics.
"""

from __future__ import annotations

import base64
import math
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Tuple, Union

import numpy as np
from pydantic import BaseModel, Field, field_validator, model_validator


def _utc_now() -> datetime:
    """Return current UTC datetime with timezone awareness."""
    return datetime.now(timezone.utc)


class QualityReport(BaseModel):
    """Quality and latency evaluation for a data source feed."""

    source_id: str
    status: Literal["GOOD", "MODERATE", "POOR", "OFFLINE"] = "GOOD"
    latency_seconds: float = 0.0
    data_mode: Literal["live", "historical_fallback"] = "historical_fallback"
    coverage_pct: float = Field(default=100.0, ge=0.0, le=100.0)
    error_message: Optional[str] = None
    evaluated_at: datetime = Field(default_factory=_utc_now)


class CommonObservationSchema(BaseModel):
    """Unified observation schema decoupling ingestion from gridding & modeling.

    Supports individual observations as well as gridded observation dictionaries
    where each variable maps to a [value, mask] pair or list of [value, mask] pairs.
    """

    source: str
    timestamp: datetime = Field(default_factory=_utc_now)
    data_mode: Literal["live", "historical_fallback"] = "historical_fallback"
    bounding_box: Tuple[float, float, float, float] = (24.5, 91.0, 26.5, 93.0)  # min_lat, min_lon, max_lat, max_lon
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Dictionary supporting all 20 meteorological features: key -> [value, mask] or nested points
    observations: Dict[str, Any] = Field(default_factory=dict)

    # Optional fields for point observations
    variable: Optional[str] = None
    value: Optional[float] = None
    mask: float = 1.0
    unit: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    elevation_m: Optional[float] = None
    quality: Literal["GOOD", "MODERATE", "POOR", "OFFLINE"] = "GOOD"

    @model_validator(mode="after")
    def validate_mask_and_bounds(self) -> "CommonObservationSchema":
        """Ensure missing or NaN values strictly force mask to 0.0."""
        if self.value is None or (isinstance(self.value, float) and math.isnan(self.value)):
            self.mask = 0.0
        elif self.mask not in (0.0, 1.0):
            self.mask = 1.0 if self.mask > 0.5 else 0.0
        return self

    def set_feature(self, feature_name: str, value: Optional[float], mask: Optional[float] = None) -> None:
        """Helper to record a feature as [value, mask] pair."""
        if value is None or (isinstance(value, float) and math.isnan(value)):
            val = 0.0
            m = 0.0
        else:
            val = float(value)
            m = 1.0 if mask is None else (1.0 if mask > 0.5 else 0.0)
        self.observations[feature_name] = [val, m]
        if m > 0.5:
            self.mask = 1.0
            if self.value is None:
                self.value = val
                self.variable = feature_name

    def get_feature(self, feature_name: str) -> Tuple[float, float]:
        """Retrieve [value, mask] pair for a given feature."""
        item = self.observations.get(feature_name)
        if item is None:
            return (0.0, 0.0)
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            return (float(item[0]), float(item[1]))
        return (float(item), 1.0)


class GridCellSchema(BaseModel):
    """1 km × 1 km cell containing the full 20-feature [value, mask] vector,

    AI hazard forecasts, kinematics, and data provenance.
    """

    # Coordinates
    lat: float
    lon: float
    i: int = Field(..., description="Grid row index [0..H-1]")
    j: int = Field(..., description="Grid column index [0..W-1]")
    cell_id: str = ""
    elevation_m: float = 0.0
    timestamp: datetime = Field(default_factory=_utc_now)

    # The 20 Physical Meteorological Features (each as [value, mask] tuple)
    # Polarimetric Radar (1-6)
    reflectivity: Tuple[float, float] = (0.0, 0.0)       # Z (dBZ)
    radial_velocity: Tuple[float, float] = (0.0, 0.0)    # Vr (m/s)
    spectrum_width: Tuple[float, float] = (0.0, 0.0)     # W (m/s)
    zdr: Tuple[float, float] = (0.0, 0.0)                # Z_DR (dB)
    phidp: Tuple[float, float] = (0.0, 0.0)              # Phi_DP / K_DP (deg or deg/km)
    rhohv: Tuple[float, float] = (0.0, 0.0)              # Rho_HV (copolar correlation)

    # Volumetric Radar (7-8)
    echo_top: Tuple[float, float] = (0.0, 0.0)           # Echo top 18 dBZ (km)
    vil: Tuple[float, float] = (0.0, 0.0)                # Vertically Integrated Liquid (kg/m^2)

    # Satellite IR (9-11)
    ir_bt: Tuple[float, float] = (0.0, 0.0)              # TIR-1 Brightness Temp (K)
    ir_bt_change: Tuple[float, float] = (0.0, 0.0)       # Delta TIR / Delta t (K/min)
    ctcr: Tuple[float, float] = (0.0, 0.0)               # Cloud-Top Cooling Rate (K/min)

    # Lightning Electrification (12-14)
    flash_count: Tuple[float, float] = (0.0, 0.0)        # Flash count in cell
    flash_density: Tuple[float, float] = (0.0, 0.0)      # Flashes / km^2 / hr
    flash_rate_change: Tuple[float, float] = (0.0, 0.0)  # Delta FR / Delta t (flashes/min^2)

    # Surface In-Situ AWS (15-19)
    temp_2m: Tuple[float, float] = (0.0, 0.0)            # 2m Temperature (degC)
    rh_2m: Tuple[float, float] = (0.0, 0.0)              # 2m Relative Humidity (%)
    wind_speed_10m: Tuple[float, float] = (0.0, 0.0)     # 10m Wind Speed (m/s)
    wind_dir_10m: Tuple[float, float] = (0.0, 0.0)       # 10m Wind Direction (degrees)
    surface_pressure: Tuple[float, float] = (0.0, 0.0)   # Surface MSLP (hPa)

    # Environmental Thermodynamics (20, plus auxiliary)
    cape: Tuple[float, float] = (0.0, 0.0)               # CAPE (J/kg)
    cin: Tuple[float, float] = (0.0, 0.0)                # CIN (J/kg)
    precipitable_water: Tuple[float, float] = (0.0, 0.0) # Total Precipitable Water (mm)
    rain_rate: Tuple[float, float] = (0.0, 0.0)          # Surface rain rate (mm/h)

    # ConvectNet AI Hazard Forecasts
    ci_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    hail_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    cloudburst_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    downburst_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    downburst_vel: float = 0.0                           # Peak gust velocity (m/s)
    lightning_risk: float = Field(default=0.0, ge=0.0, le=1.0)

    # Kinematic Storm Motion
    storm_direction: str = "NE"
    storm_speed_kmh: float = 0.0
    eta_minutes: float = 0.0

    # Data Quality & Provenance
    radar_quality: str = "GOOD"
    satellite_quality: str = "GOOD"
    lightning_quality: str = "GOOD"
    aws_quality: str = "GOOD"
    data_mode: Literal["live", "historical_fallback"] = "historical_fallback"

    @model_validator(mode="after")
    def populate_cell_id(self) -> "GridCellSchema":
        """Auto-populate cell_id if empty."""
        if not self.cell_id:
            self.cell_id = f"cell_{self.lat:.3f}_{self.lon:.3f}"
        return self

    def get_feature_vector(self) -> np.ndarray:
        """Return 20x2 array representing [value, mask] for all 20 standard channels."""
        channels = [
            self.reflectivity,
            self.radial_velocity,
            self.spectrum_width,
            self.zdr,
            self.phidp,
            self.rhohv,
            self.echo_top,
            self.vil,
            self.ir_bt,
            self.ir_bt_change,
            self.ctcr,
            self.flash_count,
            self.flash_density,
            self.flash_rate_change,
            self.temp_2m,
            self.rh_2m,
            self.wind_speed_10m,
            self.wind_dir_10m,
            self.surface_pressure,
            self.cape,
        ]
        return np.array(channels, dtype=np.float32)

    @property
    def scalar_values(self) -> Dict[str, float]:
        """Convenience property extracting pure scalar values ignoring masks."""
        return {
            "reflectivity": self.reflectivity[0],
            "radial_velocity": self.radial_velocity[0],
            "spectrum_width": self.spectrum_width[0],
            "zdr": self.zdr[0],
            "phidp": self.phidp[0],
            "rhohv": self.rhohv[0],
            "echo_top": self.echo_top[0],
            "vil": self.vil[0],
            "ir_bt": self.ir_bt[0],
            "ir_bt_change": self.ir_bt_change[0],
            "ctcr": self.ctcr[0],
            "flash_count": self.flash_count[0],
            "flash_density": self.flash_density[0],
            "flash_rate_change": self.flash_rate_change[0],
            "temp_2m": self.temp_2m[0],
            "rh_2m": self.rh_2m[0],
            "wind_speed_10m": self.wind_speed_10m[0],
            "wind_dir_10m": self.wind_dir_10m[0],
            "surface_pressure": self.surface_pressure[0],
            "cape": self.cape[0],
            "rain_rate": self.rain_rate[0],
        }


class FeatureTensorSchema(BaseModel):
    """Multi-channel spatio-temporal tensor representing [T, C, H, W] grid.

    Used by deep learning models (ConvLSTM, ConvectNet) with high-performance
    NumPy and PyTorch conversion utilities.
    """

    shape: Tuple[int, int, int, int] = Field(..., description="[T, C, H, W]")
    channel_names: List[str]
    timestamps: List[datetime] = Field(default_factory=list)
    bbox: Tuple[float, float, float, float] = (24.5, 91.0, 26.5, 93.0)
    grid_resolution_km: float = 2.0
    data: Optional[List[List[List[List[float]]]]] = None
    data_b64: Optional[str] = Field(default=None, description="Base64-encoded float32 raw bytes")
    dtype: str = "float32"
    data_mode: Literal["live", "historical_fallback"] = "historical_fallback"

    def to_numpy(self) -> np.ndarray:
        """Convert tensor data to a NumPy array of shape (T, C, H, W)."""
        T, C, H, W = self.shape
        if self.data_b64 is not None:
            raw = base64.b64decode(self.data_b64)
            arr = np.frombuffer(raw, dtype=np.dtype(self.dtype))
            return arr.reshape((T, C, H, W)).astype(np.float32)
        if self.data is not None:
            return np.array(self.data, dtype=np.float32)
        return np.zeros((T, C, H, W), dtype=np.float32)

    def to_torch(self, device: str = "cpu") -> Any:
        """Convert tensor data to PyTorch Tensor."""
        import torch
        arr = self.to_numpy()
        tensor = torch.from_numpy(arr)
        if device != "cpu" and torch.cuda.is_available():
            return tensor.to(device)
        return tensor

    @classmethod
    def from_numpy(
        cls,
        arr: np.ndarray,
        channel_names: List[str],
        bbox: Tuple[float, float, float, float] = (24.5, 91.0, 26.5, 93.0),
        timestamps: Optional[List[datetime]] = None,
        grid_resolution_km: float = 2.0,
        data_mode: Literal["live", "historical_fallback"] = "historical_fallback",
        use_base64: bool = True,
    ) -> "FeatureTensorSchema":
        """Instantiate FeatureTensorSchema directly from a NumPy array."""
        arr_f32 = arr.astype(np.float32)
        if arr_f32.ndim != 4:
            raise ValueError(f"Array must have 4 dimensions [T, C, H, W], got shape {arr.shape}")
        T, C, H, W = arr_f32.shape
        if len(channel_names) != C:
            raise ValueError(f"Channel names count {len(channel_names)} does not match C={C}")

        if timestamps is None:
            timestamps = [_utc_now() for _ in range(T)]

        if use_base64:
            b64_str = base64.b64encode(arr_f32.tobytes()).decode("ascii")
            return cls(
                shape=(T, C, H, W),
                channel_names=channel_names,
                timestamps=timestamps,
                bbox=bbox,
                grid_resolution_km=grid_resolution_km,
                data_b64=b64_str,
                dtype="float32",
                data_mode=data_mode,
            )
        return cls(
            shape=(T, C, H, W),
            channel_names=channel_names,
            timestamps=timestamps,
            bbox=bbox,
            grid_resolution_km=grid_resolution_km,
            data=arr_f32.tolist(),
            dtype="float32",
            data_mode=data_mode,
        )


class ForecastOutputSchema(BaseModel):
    """Operational hazard output schema for lead time projections (0–6 hours).

    Feeds the 5-indicator Hazard Bar, Time Slider, and GeoJSON GIS layers.
    """

    lead_time_minutes: int = Field(..., description="Lead time in minutes (0, 15, 30, 45, 60..360)")
    forecast_timestamp: datetime
    issue_timestamp: datetime = Field(default_factory=_utc_now)

    # 5 Key Convective Hazards
    hazard_probabilities: Dict[str, float] = Field(
        default_factory=lambda: {
            "ci": 0.0,
            "lightning": 0.0,
            "hail": 0.0,
            "downburst": 0.0,
            "cloudburst": 0.0,
        }
    )

    # Direct top-level hazard fields for client convenience
    ci_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    lightning_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    hail_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    downburst_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    cloudburst_prob: float = Field(default=0.0, ge=0.0, le=1.0)

    # Specific Physical Severity Metrics
    lightning_density: float = 0.0   # Flashes / km^2 / hr
    hail_size_cm: float = 0.0        # Expected max hail diameter (cm)
    downburst_vel: float = 0.0       # Expected peak outflow gust (m/s)

    # Active Storm Cell Polygons (GeoJSON FeatureCollection)
    storm_cells: Dict[str, Any] = Field(
        default_factory=lambda: {
            "type": "FeatureCollection",
            "features": [],
        }
    )

    # Uncertainty cone parameters
    uncertainty_cone: Dict[str, Any] = Field(
        default_factory=lambda: {
            "angle_deg": 25.0,
            "radius_km": 15.0,
            "confidence_pct": 85.0,
        }
    )

    # Kinematic Storm Motion
    storm_motion: Dict[str, Any] = Field(
        default_factory=lambda: {
            "direction": "NE",
            "degrees": 45.0,
            "speed_kmh": 42.0,
            "eta_minutes": 27.0,
        }
    )

    # Data Quality & Provenance
    data_quality: Dict[str, Any] = Field(
        default_factory=lambda: {
            "radar": "GOOD",
            "satellite": "GOOD",
            "lightning": "GOOD",
            "aws": "GOOD",
        }
    )
    ai_model: str = "ConvectNet v1 (HistoricalMode)"
    data_mode: Literal["live", "historical_fallback"] = "historical_fallback"

    @model_validator(mode="after")
    def sync_hazard_dict_and_fields(self) -> "ForecastOutputSchema":
        """Synchronize top-level hazard values with the hazard_probabilities dict."""
        for key in ["ci", "lightning", "hail", "downburst", "cloudburst"]:
            field_val = getattr(self, f"{key}_prob")
            dict_val = self.hazard_probabilities.get(key)
            if dict_val is None:
                self.hazard_probabilities[key] = field_val
            elif field_val > 0.0 and dict_val == 0.0:
                self.hazard_probabilities[key] = field_val
            elif dict_val > 0.0 and field_val == 0.0:
                setattr(self, f"{key}_prob", dict_val)
            else:
                # If both are set, sync field to dict
                setattr(self, f"{key}_prob", self.hazard_probabilities[key])
        return self


class SourceAdapter(ABC):
    """Abstract Base Class for all ConvectNow meteorological data adapters."""

    def __init__(self, source_id: str):
        self.source_id = source_id
        self.data_mode: Literal["live", "historical_fallback"] = "historical_fallback"
        self.last_fetch_time: Optional[datetime] = None
        self.last_latency_sec: float = 0.0

    @abstractmethod
    async def fetch_latest(self) -> CommonObservationSchema:
        """Fetch latest observations asynchronously, returning CommonObservationSchema.

        Must never raise unhandled network exceptions; on failure, automatically fall
        back to historical data tagged with data_mode="historical_fallback".
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Perform asynchronous health check against live endpoints."""
        pass

    def fetch(self, **kwargs) -> Any:
        """Synchronous fetch hook (optional raw data ingestion)."""
        raise NotImplementedError("Subclasses may implement synchronous fetch if needed.")

    def normalize(self, raw_data: Any) -> CommonObservationSchema:
        """Normalize raw ingested data into CommonObservationSchema."""
        raise NotImplementedError("Subclasses must implement normalize.")

    def quality_check(self, observation: CommonObservationSchema) -> QualityReport:
        """Evaluate observation quality and latency."""
        has_valid_data = False
        if observation.mask > 0.5 or (observation.value is not None and not math.isnan(observation.value)):
            has_valid_data = True
        elif observation.observations:
            for item in observation.observations.values():
                if isinstance(item, (list, tuple)) and len(item) >= 2 and item[1] > 0.5:
                    has_valid_data = True
                    break
        return QualityReport(
            source_id=self.source_id,
            status="GOOD" if has_valid_data else "POOR",
            latency_seconds=self.last_latency_sec,
            data_mode=observation.data_mode,
            coverage_pct=100.0 if has_valid_data else 0.0,
        )

    def fetch_latest_sync(self) -> CommonObservationSchema:
        """Synchronous execution wrapper for fetch_latest."""
        import asyncio
        import concurrent.futures

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is not None and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, self.fetch_latest())
                return future.result()
        return asyncio.run(self.fetch_latest())
