"""
ConvectNow — Milestone 4: Multimodal Fusion Engine
Fuses multi-sensor meteorological evidence for each individual storm cell:
1. Radar (DWR reflectivity, cell envelope, echo top, VIL)
2. Lightning (GLM / Blitzortung strike counts, spatial density, strike trend)
3. Satellite (INSAT-3DR / Himawari / GOES IR cloud-top brightness temperature & cooling rate)
4. NWP Environmental Background (HRRR / NCMRWF CAPE, CIN, 0°C freezing level)
5. Graceful handling of missing modalities with dynamic confidence attenuation
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np

try:
    from .cell_evolution import CellEvolutionRecord, EvolutionState
except ImportError:
    from cell_evolution import CellEvolutionRecord, EvolutionState


@dataclass
class ModalityFreshness:
    source_name: str
    is_available: bool
    latency_seconds: float
    timestamp_utc: str
    status: str       # "REALTIME", "SLIGHTLY_STALE", "OFFLINE"


@dataclass
class UnifiedCellState:
    cell_id: str
    timestamp_utc: str
    # Kinematics
    centroid_lat: float
    centroid_lon: float
    centroid_x_px: float
    centroid_y_px: float
    velocity_kmh: float
    heading_deg: float
    area_km2: float
    # Evolution (Milestone 3)
    evolution_state: EvolutionState
    evolution_probabilities: dict[str, float]
    trend_summary: str
    footprint_expansion_factor: float
    # Multimodal fused evidence (Milestone 4)
    radar_evidence: dict[str, Any]
    lightning_evidence: dict[str, Any]
    satellite_evidence: dict[str, Any]
    environment_evidence: dict[str, Any]
    # Data provenance & confidence
    modalities_present: list[str]
    data_freshness: dict[str, ModalityFreshness]
    fusion_confidence: float         # 0.0 to 1.0
    confidence_tier: str            # "HIGH", "MEDIUM", "LOW"


class MultimodalFusionEngine:
    """
    Spatially and temporally associates multi-source meteorological observations
    with individual storm cells to produce a single authoritative UnifiedCellState.
    """

    def __init__(self, radar_origin_lat: float = 28.58, radar_origin_lon: float = 77.21, km_per_deg: float = 111.0):
        # Default origin: Delhi DWR radar; customizable for Odisha (e.g. Paradip / Bhubaneswar)
        self.radar_origin_lat = radar_origin_lat
        self.radar_origin_lon = radar_origin_lon
        self.km_per_deg = km_per_deg

    def pixel_to_latlon(self, x_px: float, y_px: float, grid_res_km: float = 1.0, grid_dim: int = 128) -> tuple[float, float]:
        """
        Converts local Cartesian radar grid coordinates to geographical Lat/Lon.
        Center of grid (grid_dim/2, grid_dim/2) is mapped to radar origin.
        """
        half = grid_dim / 2.0
        d_east_km = (x_px - half) * grid_res_km
        d_north_km = (half - y_px) * grid_res_km

        lat = self.radar_origin_lat + (d_north_km / self.km_per_deg)
        lon = self.radar_origin_lon + (d_east_km / (self.km_per_deg * np.cos(np.radians(self.radar_origin_lat))))
        return round(float(lat), 4), round(float(lon), 4)

    def extract_cell_lightning(
        self,
        cell_bbox: list[int],
        lightning_grid: np.ndarray | None = None,
        lightning_points: list[dict[str, float]] | None = None
    ) -> dict[str, Any]:
        """
        Extracts lightning strikes occurring inside or within a 5 km buffer of the storm cell.
        """
        if lightning_grid is not None:
            min_x, min_y, max_x, max_y = cell_bbox
            pad = 5
            H, W = lightning_grid.shape
            x0 = max(0, min_x - pad)
            x1 = min(W, max_x + pad)
            y0 = max(0, min_y - pad)
            y1 = min(H, max_y + pad)

            cell_patch = lightning_grid[y0:y1, x0:x1]
            total_flashes = float(np.sum(cell_patch))
            peak_density = float(np.max(cell_patch)) if cell_patch.size > 0 else 0.0

            return {
                "available": True,
                "strikes_detected": int(total_flashes),
                "peak_density_flashes_km2_hr": round(peak_density, 2),
                "activity_level": "EXTREME" if peak_density >= 10.0 else ("HIGH" if peak_density >= 3.0 else ("MODERATE" if peak_density > 0 else "ZERO")),
            }

        elif lightning_points:
            # Point strike list [{lat, lon, epoch_sec}]
            return {
                "available": True,
                "strikes_detected": len(lightning_points),
                "peak_density_flashes_km2_hr": round(len(lightning_points) * 0.5, 2),
                "activity_level": "MODERATE" if len(lightning_points) > 5 else "LOW",
            }
        else:
            return {
                "available": False,
                "strikes_detected": 0,
                "peak_density_flashes_km2_hr": 0.0,
                "activity_level": "NO_DATA",
            }

    def extract_cell_satellite(
        self,
        cell_bbox: list[int],
        ir_grid: np.ndarray | None = None,
    ) -> dict[str, Any]:
        """
        Extracts cloud-top thermal information from geostationary satellite IR channels.
        Cold brightness temperatures (< 215 K / -58°C) indicate high-reaching convective overshooting tops.
        """
        if ir_grid is not None:
            min_x, min_y, max_x, max_y = cell_bbox
            H, W = ir_grid.shape
            x0 = max(0, min_x)
            x1 = min(W, max_x)
            y0 = max(0, min_y)
            y1 = min(H, max_y)

            patch = ir_grid[y0:y1, x0:x1]
            if patch.size > 0:
                # If IR is normalized 0-1, convert to Kelvins (approx 190K - 300K)
                if np.max(patch) <= 1.0:
                    temp_k = 190.0 + (patch * 110.0)
                else:
                    temp_k = patch

                min_tb_k = float(np.min(temp_k))
                mean_tb_k = float(np.mean(temp_k))
                overshooting_top = bool(min_tb_k <= 215.0)

                return {
                    "available": True,
                    "min_cloud_top_temp_k": round(min_tb_k, 1),
                    "min_cloud_top_temp_c": round(min_tb_k - 273.15, 1),
                    "mean_cloud_top_temp_c": round(mean_tb_k - 273.15, 1),
                    "overshooting_top_detected": overshooting_top,
                    "thermal_signature": "DEEP_CONVECTIVE_CORE" if overshooting_top else ("COLD_ANVIL" if min_tb_k < 235 else "MID_TROPOSPHERIC"),
                }

        return {
            "available": False,
            "min_cloud_top_temp_k": None,
            "min_cloud_top_temp_c": None,
            "overshooting_top_detected": False,
            "thermal_signature": "NO_SATELLITE_FEED",
        }

    def extract_cell_environment(self, nwp_fields: dict[str, float] | None = None) -> dict[str, Any]:
        """
        Extracts environmental background thermodynamic stability (CAPE, CIN, 0°C Isotherm).
        """
        if nwp_fields:
            cape = float(nwp_fields.get("cape_jkg", 1850.0))
            cin = float(nwp_fields.get("cin_jkg", 25.0))
            freezing_km = float(nwp_fields.get("freezing_level_km", 4.5))

            return {
                "available": True,
                "surface_cape_jkg": round(cape, 0),
                "convective_inhibition_cin": round(cin, 0),
                "freezing_level_isotherm_km": round(freezing_km, 1),
                "atmospheric_instability": "EXTREME" if cape >= 2500 else ("HIGH" if cape >= 1500 else "MODERATE"),
            }

        # Default climatological values for Indian pre-monsoon / monsoon convection
        return {
            "available": False,
            "surface_cape_jkg": 1800.0,
            "convective_inhibition_cin": 30.0,
            "freezing_level_isotherm_km": 4.5,
            "atmospheric_instability": "CLIMATOLOGICAL_DEFAULT",
        }

    def fuse_cell(
        self,
        cell_dict: dict[str, Any],
        evolution_record: CellEvolutionRecord,
        lightning_grid: np.ndarray | None = None,
        satellite_ir_grid: np.ndarray | None = None,
        nwp_fields: dict[str, float] | None = None,
        radar_latency_sec: float = 120.0,
        lightning_latency_sec: float = 45.0,
        satellite_latency_sec: float = 480.0,
        nwp_latency_sec: float = 1800.0,
    ) -> UnifiedCellState:
        """
        Produces the authoritative UnifiedCellState for a storm cell.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        cell_id = cell_dict.get("cell_id", "CELL-UNKNOWN")
        cx = float(cell_dict.get("centroid_x", 64.0))
        cy = float(cell_dict.get("centroid_y", 64.0))
        bbox = cell_dict.get("bbox", [int(cx - 5), int(cy - 5), int(cx + 5), int(cy + 5)])

        lat, lon = self.pixel_to_latlon(cx, cy)

        # 1. Radar evidence
        radar_evidence = {
            "peak_dbz": round(float(cell_dict.get("peak_dbz", 45.0)), 1),
            "mean_dbz": round(float(cell_dict.get("mean_dbz", 38.0)), 1),
            "area_km2": round(float(cell_dict.get("area_km2", 100.0)), 1),
            "rate_dbz_per_10min": evolution_record.rate_dbz_per_10min,
            "area_growth_rate_pct": evolution_record.rate_area_percent_per_10min,
        }

        # 2. Lightning evidence
        lightning_evidence = self.extract_cell_lightning(bbox, lightning_grid=lightning_grid)
        lightning_evidence["rate_per_min"] = evolution_record.history[-1]["lightning_rate"] if evolution_record.history else 0.0

        # 3. Satellite evidence
        satellite_evidence = self.extract_cell_satellite(bbox, ir_grid=satellite_ir_grid)
        satellite_evidence["cooling_rate_k_per_10min"] = evolution_record.cooling_rate_k_per_10min

        # 4. Environment evidence
        env_evidence = self.extract_cell_environment(nwp_fields)

        # 5. Freshness ledger
        freshness_ledger = {
            "radar": ModalityFreshness(
                source_name="DWR Reflectivity",
                is_available=True,
                latency_seconds=radar_latency_sec,
                timestamp_utc=now_str,
                status="REALTIME" if radar_latency_sec < 300 else "SLIGHTLY_STALE",
            ),
            "lightning": ModalityFreshness(
                source_name="Lightning Network",
                is_available=lightning_evidence["available"],
                latency_seconds=lightning_latency_sec if lightning_evidence["available"] else 9999.0,
                timestamp_utc=now_str,
                status="REALTIME" if lightning_latency_sec < 120 and lightning_evidence["available"] else "OFFLINE",
            ),
            "satellite": ModalityFreshness(
                source_name="Geostationary IR",
                is_available=satellite_evidence["available"],
                latency_seconds=satellite_latency_sec if satellite_evidence["available"] else 9999.0,
                timestamp_utc=now_str,
                status="REALTIME" if satellite_latency_sec < 900 and satellite_evidence["available"] else "OFFLINE",
            ),
            "nwp": ModalityFreshness(
                source_name="NWP Convective Field",
                is_available=env_evidence["available"],
                latency_seconds=nwp_latency_sec if env_evidence["available"] else 9999.0,
                timestamp_utc=now_str,
                status="REALTIME" if nwp_latency_sec < 3600 and env_evidence["available"] else "OFFLINE",
            ),
        }

        # 6. Dynamic Confidence Calculation
        # Base weight: Radar (0.40) + Lightning (0.25) + Satellite (0.20) + NWP (0.15)
        conf = 0.0
        present = []

        # Radar contributes up to 0.40
        if freshness_ledger["radar"].status == "REALTIME":
            conf += 0.40
            present.append("RADAR")
        elif freshness_ledger["radar"].status == "SLIGHTLY_STALE":
            conf += 0.25
            present.append("RADAR (STALE)")

        # Lightning contributes up to 0.25
        if lightning_evidence["available"]:
            conf += 0.25
            present.append("LIGHTNING")

        # Satellite contributes up to 0.20
        if satellite_evidence["available"]:
            conf += 0.20
            present.append("SATELLITE")

        # NWP contributes up to 0.15
        if env_evidence["available"]:
            conf += 0.15
            present.append("NWP")

        # Evolution stability boost: if 3+ historical scans match trend, boost confidence by 0.05
        if len(evolution_record.history) >= 3:
            conf = min(1.0, conf + 0.05)

        conf = round(float(np.clip(conf, 0.10, 0.98)), 2)
        tier = "HIGH" if conf >= 0.75 else ("MEDIUM" if conf >= 0.50 else "LOW")

        return UnifiedCellState(
            cell_id=cell_id,
            timestamp_utc=now_str,
            centroid_lat=lat,
            centroid_lon=lon,
            centroid_x_px=round(cx, 1),
            centroid_y_px=round(cy, 1),
            velocity_kmh=round(float(cell_dict.get("velocity_kmh", 0.0)), 1),
            heading_deg=round(float(cell_dict.get("heading_deg", 0.0)), 1),
            area_km2=round(float(cell_dict.get("area_km2", 100.0)), 1),
            evolution_state=evolution_record.current_state,
            evolution_probabilities=evolution_record.state_probabilities,
            trend_summary=evolution_record.trend_summary,
            footprint_expansion_factor=evolution_record.footprint_expansion_factor,
            radar_evidence=radar_evidence,
            lightning_evidence=lightning_evidence,
            satellite_evidence=satellite_evidence,
            environment_evidence=env_evidence,
            modalities_present=present,
            data_freshness=freshness_ledger,
            fusion_confidence=conf,
            confidence_tier=tier,
        )
