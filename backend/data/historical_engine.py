"""Physically grounded synthetic convective field generator for ConvectNow.

This module models coupled convective storms over Northeast India
(centered on Sohra/Cherrapunji, 25.27°N, 91.73°E), producing all 20 meteorological
features governed by real atmospheric physics:
- Dual-Doppler radar reflectivity (30–65 dBZ) with northeastward anvil blow-off
- Rotational cyclonic couplet (mesocyclonic shear dipole: -18 m/s to +16 m/s)
- Polarimetric hail signatures (ZDR ~ 0.1 dB, RhoHV ~ 0.85 in core; ZDR 2.5 dB in rain)
- Cloudburst polarimetric rain rates up to 140 mm/h (KDP 3.5 deg/km)
- Satellite overshooting cloud tops down to 198–210 K with CTCR < -0.5 K/min
- Cold pool surface mesohigh with +2 to +4 hPa pressure jump and -6°C temperature drop
- Orographic southerly moisture inflow (CAPE > 2500 J/kg, TPW > 65 mm) against Khasi scarp
- Schultz 2-sigma lightning jump rates (>10 flashes/min and DFR >= 2*sigma)

All generated artifacts are explicitly tagged with `data_mode="historical_fallback"`.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from ..core.schemas import (
    CommonObservationSchema,
    FeatureTensorSchema,
    ForecastOutputSchema,
    GridCellSchema,
)
from ..meteorology import derive_cell_hazard_factors
from .grid import CoordinateGrid, default_grid


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SyntheticConvectiveEngine:
    """Atmospheric physics generator for Northeast India severe convective events."""

    def __init__(self, grid: Optional[CoordinateGrid] = None):
        self.grid = grid or default_grid
        self.H = self.grid.H
        self.W = self.grid.W

        # Cell centers (Sohra primary cell, Mawsynram feeder cell)
        self.sohra_lat = 25.2702
        self.sohra_lon = 91.7323
        self.mawsynram_lat = 25.3000
        self.mawsynram_lon = 91.5800

        # Feature channel names (20 standard channels)
        self.channel_names = [
            "reflectivity",
            "radial_velocity",
            "spectrum_width",
            "zdr",
            "phidp",
            "rhohv",
            "echo_top",
            "vil",
            "ir_bt",
            "ir_bt_change",
            "ctcr",
            "flash_count",
            "flash_density",
            "flash_rate_change",
            "temp_2m",
            "rh_2m",
            "wind_speed_10m",
            "wind_dir_10m",
            "surface_pressure",
            "cape",
        ]

    def _compute_core_distances(
        self, lat_grid: np.ndarray, lon_grid: np.ndarray, center_lat: float, center_lon: float
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Compute dx (km), dy (km), and radial distance r (km) from a convective center."""
        # dx along longitude (1 deg lon ~ 100.5 km at 25.5N)
        dx_km = (lon_grid - center_lon) * 100.5
        # dy along latitude (1 deg lat ~ 111.13 km)
        dy_km = (lat_grid - center_lat) * 111.13
        r_km = np.sqrt(dx_km**2 + dy_km**2)
        return dx_km, dy_km, r_km

    def generate_full_grid(
        self,
        timestamp: Optional[datetime] = None,
        lead_time_min: int = 0,
        replay_progress: float = 0.5,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Generate 20-channel gridded field values and validity masks.

        Returns:
            values: np.ndarray of shape (20, H, W)
            masks:  np.ndarray of shape (20, H, W)
        """
        ts = timestamp or _utc_now()
        H, W = self.H, self.W
        lat_grid = self.grid.lat_grid
        lon_grid = self.grid.lon_grid

        # Cell progression with lead time / replay
        # Storm approaches from south-southwest, passes directly over Sohra at t=0 (progression=0.5),
        # and moves northeast toward Shillong at ~35 km/h.
        elapsed_min = float(lead_time_min) + (replay_progress - 0.5) * 60.0
        shift_x_km = (elapsed_min / 60.0) * 24.0  # eastward motion
        shift_y_km = (elapsed_min / 60.0) * 24.0  # northward motion

        c_lat1 = self.sohra_lat + shift_y_km / 111.13
        c_lon1 = self.sohra_lon + shift_x_km / 100.5

        c_lat2 = self.mawsynram_lat + (shift_y_km * 0.8) / 111.13
        c_lon2 = self.mawsynram_lon + (shift_x_km * 0.8) / 100.5

        dx1, dy1, r1 = self._compute_core_distances(lat_grid, lon_grid, c_lat1, c_lon1)
        dx2, dy2, r2 = self._compute_core_distances(lat_grid, lon_grid, c_lat2, c_lon2)

        # Intensity modulation (0.0: nascent, 0.5: peak cloudburst, 1.0: decaying)
        intensity1 = 1.0 - 0.2 * abs(replay_progress - 0.5)
        intensity2 = 0.8 - 0.2 * abs(replay_progress - 0.6)

        # ----------------------------------------------------
        # 1. Reflectivity Z (dBZ)
        # ----------------------------------------------------
        # Core 1: Intense Gaussian core (peak 62 dBZ) with northeastward elongated anvil
        # Anvil elongation: stretch in direction of (dx + dy)
        anvil_proj1 = (dx1 + dy1) / math.sqrt(2.0)
        cross_proj1 = (-dx1 + dy1) / math.sqrt(2.0)
        # Core radius ~ 6 km, anvil extends northeast for ~35 km
        core_gaussian1 = np.exp(-(r1**2) / (2.0 * 6.5**2))
        anvil_gaussian1 = np.exp(
            -(np.maximum(0.0, anvil_proj1 - 4.0)**2) / (2.0 * 18.0**2)
            - (cross_proj1**2) / (2.0 * 8.0**2)
        )
        z1 = 62.0 * intensity1 * core_gaussian1 + 35.0 * anvil_gaussian1

        # Core 2: Mawsynram feeder cell (peak 53 dBZ)
        core_gaussian2 = np.exp(-(r2**2) / (2.0 * 5.0**2))
        z2 = 53.0 * intensity2 * core_gaussian2

        reflectivity = np.clip(np.maximum(z1, z2), 0.0, 68.0)

        # ----------------------------------------------------
        # 2. Radial Velocity Vr (m/s)
        # ----------------------------------------------------
        # S-band radar located at Sohra (25.27, 91.73).
        # Background environmental southerly inflow (+10 m/s toward radar from South)
        # Cyclonic rotational couplet around cell 1 center:
        # Inbound velocity (-18 m/s) on the west/southwest flank,
        # Outbound velocity (+16 m/s) on the east/northeast flank.
        # Vortex tangential velocity field: v_theta = V_max * (r / R_core) * exp(0.5*(1 - (r/R_core)^2))
        v_tangential = 24.0 * (r1 / 6.0) * np.exp(0.5 * (1.0 - (r1 / 6.0)**2))
        # Tangential vector (-dy1/r, dx1/r)
        theta = np.arctan2(dy1, dx1)
        v_rot_x = -v_tangential * np.sin(theta)
        v_rot_y = v_tangential * np.cos(theta)
        # Radial projection relative to Sohra radar
        dx_radar, dy_radar, r_radar = self._compute_core_distances(
            lat_grid, lon_grid, self.sohra_lat, self.sohra_lon
        )
        r_radar_safe = np.maximum(r_radar, 0.5)
        # Background southerly flow u=4 m/s, v=12 m/s
        u_total = 4.0 + v_rot_x
        v_total = 12.0 + v_rot_y
        radial_velocity = (u_total * dx_radar + v_total * dy_radar) / r_radar_safe
        radial_velocity = np.clip(radial_velocity, -35.0, 35.0)

        # ----------------------------------------------------
        # 3. Spectrum Width W (m/s)
        # ----------------------------------------------------
        # High turbulence in updraft shear zone and core collapse (6-9 m/s)
        spectrum_width = 1.8 + 6.2 * core_gaussian1 + 4.0 * core_gaussian2
        spectrum_width = np.clip(spectrum_width, 0.5, 12.0)

        # ----------------------------------------------------
        # 4. Differential Reflectivity ZDR (dB)
        # ----------------------------------------------------
        # Hail signature in 55+ dBZ core: tumbling hailstones yield ZDR ~ 0.1 dB
        # Rain fringe (35-50 dBZ): oblate raindrops yield ZDR ~ 2.2 to 3.2 dB
        zdr = np.zeros_like(reflectivity)
        rain_mask = (reflectivity >= 20.0) & (reflectivity < 52.0)
        hail_mask = reflectivity >= 52.0
        zdr[rain_mask] = 0.5 + 2.5 * ((reflectivity[rain_mask] - 20.0) / 32.0)
        zdr[hail_mask] = np.maximum(0.05, 3.0 - 2.8 * ((reflectivity[hail_mask] - 52.0) / 10.0))

        # ----------------------------------------------------
        # 5. Differential Phase Derivative KDP (deg/km)
        # ----------------------------------------------------
        # Immense rain rates in cloudburst core yield KDP up to 4.5 deg/km
        phidp = 0.05 + 4.2 * (np.maximum(0.0, reflectivity - 30.0) / 35.0)**1.6

        # ----------------------------------------------------
        # 6. Copolar Correlation RhoHV
        # ----------------------------------------------------
        # High in pure rain (0.985), drops in mixed-phase hail core (0.85 - 0.90)
        rhohv = 0.985 * np.ones_like(reflectivity)
        rhohv[hail_mask] = 0.985 - 0.12 * core_gaussian1[hail_mask]
        rhohv = np.clip(rhohv, 0.82, 0.995)

        # ----------------------------------------------------
        # 7. Echo Top ET (km)
        # ----------------------------------------------------
        # Deep tropical cumulonimbus towers up to 16.5 km AMSL over the Khasi scarp
        echo_top = 2.0 + 14.5 * core_gaussian1 + 10.0 * core_gaussian2 + 6.0 * anvil_gaussian1
        echo_top = np.clip(echo_top, 1.5, 17.5)

        # ----------------------------------------------------
        # 8. Vertically Integrated Liquid VIL (kg/m^2)
        # ----------------------------------------------------
        # High mass concentration in cloudburst/hail core: 50-65 kg/m^2
        vil = 58.0 * (core_gaussian1**1.4) + 32.0 * (core_gaussian2**1.4) + 12.0 * anvil_gaussian1
        vil = np.clip(vil, 0.0, 75.0)

        # ----------------------------------------------------
        # 9. Satellite IR Brightness Temperature TIR-1 (K)
        # ----------------------------------------------------
        # Deep convective overshooting top: down to 202 K (-71 degC)
        # Ambient clear-sky temperature: 292 K (+19 degC)
        ir_bt = 292.0 - 90.0 * core_gaussian1 - 65.0 * core_gaussian2 - 55.0 * anvil_gaussian1
        ir_bt = np.clip(ir_bt, 196.0, 298.0)

        # ----------------------------------------------------
        # 10. IR BT Temporal Change (K/min) & 11. CTCR (K/min)
        # ----------------------------------------------------
        # Explosive updrafts loft cloud tops rapidly: CTCR reaches -0.65 K/min (-9.7 K / 15 min)
        ctcr = -0.68 * core_gaussian1 - 0.42 * core_gaussian2
        ir_bt_change = ctcr  # Consistent cooling rate

        # ----------------------------------------------------
        # 12. Lightning Flash Count & 13. Flash Density
        # ----------------------------------------------------
        # Non-inductive graupel-ice collision charging in mixed-phase zone
        # Flash rate reaches 35 flashes/min in core
        flash_count = np.round(38.0 * core_gaussian1 + 18.0 * core_gaussian2)
        # Density in flashes/km^2/hr
        flash_density = (flash_count * 60.0) / (math.pi * 5.0**2)

        # ----------------------------------------------------
        # 14. Flash Rate Change (Schultz 2-sigma jump)
        # ----------------------------------------------------
        # Flash jump trigger: DFR >= 2 * sigma and FR >= 10 flashes/min
        flash_rate_change = 14.5 * core_gaussian1 + 7.0 * core_gaussian2

        # ----------------------------------------------------
        # 15. Surface 2m Temperature (degC)
        # ----------------------------------------------------
        # Ambient warm tropical air: 25.5 degC in Bangladesh/Sylhet plains
        # Cold pool under thunderstorm downdraft: drops by 6.5 degC down to 18.5 degC
        elev_grid = self.grid.get_elevation_grid()
        # Lapse rate cooling (-6.0 degC / 1000m)
        temp_ambient = 26.5 - (elev_grid / 1000.0) * 5.5
        cold_pool = 7.0 * core_gaussian1 + 4.5 * core_gaussian2
        temp_2m = np.clip(temp_ambient - cold_pool, 14.0, 34.0)

        # ----------------------------------------------------
        # 16. Surface 2m Relative Humidity (%)
        # ----------------------------------------------------
        # Saturated air in precipitation core and Khasi cloud layer (95-99%)
        rh_2m = 84.0 + 14.5 * core_gaussian1 + 10.0 * core_gaussian2
        rh_2m = np.clip(rh_2m, 60.0, 100.0)

        # ----------------------------------------------------
        # 17. 10m Wind Speed (m/s) & 18. Wind Direction (deg)
        # ----------------------------------------------------
        # Ambient orographic southerly wind (180 deg) at 12 m/s
        # Downburst outflow gust front radiates outward at up to 26 m/s
        outflow_speed = 18.0 * core_gaussian1 * (r1 / 6.0)
        u_outflow = outflow_speed * (dx1 / (r1 + 0.1))
        v_outflow = outflow_speed * (dy1 / (r1 + 0.1))
        u_wind = 4.0 + u_outflow
        v_wind = 12.0 + v_outflow
        wind_speed_10m = np.clip(np.sqrt(u_wind**2 + v_wind**2), 1.0, 32.0)
        wind_dir_10m = (np.degrees(np.arctan2(-u_wind, -v_wind)) + 360.0) % 360.0

        # ----------------------------------------------------
        # 19. Surface Barometric Pressure (hPa)
        # ----------------------------------------------------
        # Base pressure adjusted for elevation (hypsometric formula)
        # Standard sea-level MSLP = 1005.0 hPa
        p_base = 1005.0 * (1.0 - (0.0065 * elev_grid) / 288.15)**5.255
        # Cold pool mesohigh jump: +2.8 to +3.8 hPa directly under the dense downdraft
        meso_high_jump = 3.6 * core_gaussian1 + 2.2 * core_gaussian2
        surface_pressure = p_base + meso_high_jump

        # ----------------------------------------------------
        # 20. CAPE (J/kg)
        # ----------------------------------------------------
        # High convective available potential energy in southerly inflow: 2600 J/kg
        # Consumed in the rain-cooled cold pool (< 400 J/kg)
        cape_inflow = 2600.0 - 600.0 * (elev_grid / 1500.0)
        cape = np.clip(cape_inflow * (1.0 - 0.85 * core_gaussian1), 200.0, 3500.0)

        # Assemble the 20 channels
        values = np.stack(
            [
                reflectivity,
                radial_velocity,
                spectrum_width,
                zdr,
                phidp,
                rhohv,
                echo_top,
                vil,
                ir_bt,
                ir_bt_change,
                ctcr,
                flash_count,
                flash_density,
                flash_rate_change,
                temp_2m,
                rh_2m,
                wind_speed_10m,
                wind_dir_10m,
                surface_pressure,
                cape,
            ],
            axis=0,
        ).astype(np.float32)

        # All synthetic data has valid masks (1.0)
        masks = np.ones_like(values, dtype=np.float32)

        return values, masks

    def generate_synthetic_cell(
        self,
        lat: float,
        lon: float,
        timestamp: Optional[datetime] = None,
        lead_time_min: int = 0,
        replay_progress: float = 0.5,
    ) -> GridCellSchema:
        """Extract a single 1km GridCellSchema at clicked (lat, lon)."""
        ts = timestamp or _utc_now()
        i, j = self.grid.latlon_to_indices(lat, lon)
        cell_lat, cell_lon = self.grid.indices_to_latlon(i, j)
        elev = self.grid.get_elevation_m(lat, lon)

        values, masks = self.generate_full_grid(
            timestamp=ts, lead_time_min=lead_time_min, replay_progress=replay_progress
        )

        cell_values = values[:, i, j]
        cell_masks = masks[:, i, j]

        # Compute physically coupled hazard probabilities for this cell
        z = float(cell_values[0])
        ir = float(cell_values[8])
        ctcr_val = float(cell_values[10])
        flashes = float(cell_values[11])
        jump = float(cell_values[13])
        wind_gust = float(cell_values[16])

        # Convective Initiation probability (rapid cooling + high cloud top)
        ci_prob = float(np.clip((273.0 - ir) / 60.0 + abs(ctcr_val) * 1.2, 0.05, 0.98))
        # Hail probability (high Z, near-zero ZDR, flash jump)
        hail_prob = float(np.clip((z - 45.0) / 18.0 + (jump / 15.0) * 0.4, 0.0, 0.95))
        # Cloudburst probability (Z > 50, KDP high, moisture saturated)
        cloudburst_prob = float(np.clip((z - 42.0) / 20.0, 0.0, 0.96))
        # Downburst probability (strong wind gust + cold pool pressure jump)
        downburst_prob = float(np.clip((wind_gust - 15.0) / 15.0, 0.0, 0.92))
        lightning_risk = float(np.clip(flashes / 30.0, 0.05, 0.98))

        # Rain rate from polarimetric Z-R & KDP approximation
        rain_rate_val = float(np.clip(0.036 * (10.0**(z / 16.0)), 0.0, 160.0))

        return GridCellSchema(
            lat=cell_lat,
            lon=cell_lon,
            i=i,
            j=j,
            cell_id=f"cell_{cell_lat:.3f}_{cell_lon:.3f}",
            elevation_m=round(elev, 1),
            timestamp=ts,
            reflectivity=(float(cell_values[0]), float(cell_masks[0])),
            radial_velocity=(float(cell_values[1]), float(cell_masks[1])),
            spectrum_width=(float(cell_values[2]), float(cell_masks[2])),
            zdr=(float(cell_values[3]), float(cell_masks[3])),
            phidp=(float(cell_values[4]), float(cell_masks[4])),
            rhohv=(float(cell_values[5]), float(cell_masks[5])),
            echo_top=(float(cell_values[6]), float(cell_masks[6])),
            vil=(float(cell_values[7]), float(cell_masks[7])),
            ir_bt=(float(cell_values[8]), float(cell_masks[8])),
            ir_bt_change=(float(cell_values[9]), float(cell_masks[9])),
            ctcr=(float(cell_values[10]), float(cell_masks[10])),
            flash_count=(float(cell_values[11]), float(cell_masks[11])),
            flash_density=(float(cell_values[12]), float(cell_masks[12])),
            flash_rate_change=(float(cell_values[13]), float(cell_masks[13])),
            temp_2m=(float(cell_values[14]), float(cell_masks[14])),
            rh_2m=(float(cell_values[15]), float(cell_masks[15])),
            wind_speed_10m=(float(cell_values[16]), float(cell_masks[16])),
            wind_dir_10m=(float(cell_values[17]), float(cell_masks[17])),
            surface_pressure=(float(cell_values[18]), float(cell_masks[18])),
            cape=(float(cell_values[19]), float(cell_masks[19])),
            cin=(15.0, 1.0),
            precipitable_water=(68.5, 1.0),
            rain_rate=(rain_rate_val, 1.0),
            ci_prob=round(ci_prob, 2),
            hail_prob=round(hail_prob, 2),
            cloudburst_prob=round(cloudburst_prob, 2),
            downburst_prob=round(downburst_prob, 2),
            downburst_vel=round(wind_gust * 1.15, 1),
            lightning_risk=round(lightning_risk, 2),
            storm_direction="NE",
            storm_speed_kmh=42.0,
            eta_minutes=27.0,
            radar_quality="GOOD (1m14s lag)",
            satellite_quality="GOOD (3m lag)",
            lightning_quality="GOOD",
            aws_quality="MODERATE",
            data_mode="historical_fallback",
        )

    def generate_synthetic_observation(
        self, source_id: str, timestamp: Optional[datetime] = None
    ) -> CommonObservationSchema:
        """Create a CommonObservationSchema payload for any adapter in fallback mode."""
        ts = timestamp or _utc_now()
        obs = CommonObservationSchema(
            source=source_id,
            timestamp=ts,
            data_mode="historical_fallback",
            bounding_box=(self.grid.min_lat, self.grid.min_lon, self.grid.max_lat, self.grid.max_lon),
            metadata={
                "instrument_target": "Sohra_Cherrapunji_Domain",
                "center_coords": [self.sohra_lat, self.sohra_lon],
                "generator": "SyntheticConvectiveEngine",
            },
        )

        if "RADAR" in source_id.upper():
            obs.set_feature("reflectivity", 56.4, 1.0)
            obs.set_feature("radial_velocity", -14.2, 1.0)
            obs.set_feature("spectrum_width", 6.8, 1.0)
            obs.set_feature("zdr", 0.25, 1.0)
            obs.set_feature("phidp", 3.4, 1.0)
            obs.set_feature("rhohv", 0.88, 1.0)
            obs.set_feature("echo_top", 16.2, 1.0)
            obs.set_feature("vil", 54.0, 1.0)
            obs.variable = "reflectivity"
            obs.value = 56.4
            obs.unit = "dBZ"

        elif "SATELLITE" in source_id.upper() or "INSAT" in source_id.upper():
            obs.set_feature("ir_bt", 204.5, 1.0)
            obs.set_feature("ir_bt_change", -0.58, 1.0)
            obs.set_feature("ctcr", -0.58, 1.0)
            obs.variable = "ir_bt"
            obs.value = 204.5
            obs.unit = "K"

        elif "LIGHTNING" in source_id.upper():
            obs.set_feature("flash_count", 28.0, 1.0)
            obs.set_feature("flash_density", 12.4, 1.0)
            obs.set_feature("flash_rate_change", 14.0, 1.0)
            obs.variable = "flash_count"
            obs.value = 28.0
            obs.unit = "count"

        elif "AWS" in source_id.upper():
            obs.set_feature("temp_2m", 18.4, 1.0)
            obs.set_feature("rh_2m", 96.0, 1.0)
            obs.set_feature("wind_speed_10m", 16.5, 1.0)
            obs.set_feature("wind_dir_10m", 195.0, 1.0)
            obs.set_feature("surface_pressure", 858.2, 1.0)
            obs.set_feature("rain_rate", 94.0, 1.0)
            obs.variable = "temp_2m"
            obs.value = 18.4
            obs.unit = "degC"

        return obs

    def generate_synthetic_tensor(
        self,
        T: int = 4,
        H: Optional[int] = None,
        W: Optional[int] = None,
        timestamp: Optional[datetime] = None,
    ) -> FeatureTensorSchema:
        """Generate spatio-temporal tensor of shape [T, C, H, W] for AI model inference."""
        ts = timestamp or _utc_now()
        H = H or self.H
        W = W or self.W
        C = len(self.channel_names)

        tensor_arr = np.zeros((T, C, H, W), dtype=np.float32)
        timestamps = []

        for t_idx in range(T):
            step_ts = ts
            # Previous frames at 15-min backward steps
            progress = max(0.1, 0.5 - (T - 1 - t_idx) * 0.1)
            vals, _ = self.generate_full_grid(timestamp=step_ts, replay_progress=progress)
            tensor_arr[t_idx] = vals
            timestamps.append(step_ts)

        return FeatureTensorSchema.from_numpy(
            arr=tensor_arr,
            channel_names=self.channel_names,
            bbox=(self.grid.min_lat, self.grid.min_lon, self.grid.max_lat, self.grid.max_lon),
            timestamps=timestamps,
            grid_resolution_km=self.grid.dx_km,
            data_mode="historical_fallback",
        )

    def generate_active_storm_cells_geojson(
        self, timestamp: Optional[datetime] = None, lead_time_min: int = 0
    ) -> Dict[str, Any]:
        """Generate GeoJSON FeatureCollection of detected convective storm cells."""
        ts = timestamp or _utc_now()
        elapsed_min = float(lead_time_min)
        shift_x = (elapsed_min / 60.0) * 0.28
        shift_y = (elapsed_min / 60.0) * 0.25

        c1_lat = self.sohra_lat + shift_y
        c1_lon = self.sohra_lon + shift_x

        c2_lat = self.mawsynram_lat + shift_y * 0.8
        c2_lon = self.mawsynram_lon + shift_x * 0.8

        # Approximate polygon coordinates around cell cores (~10-15 km radius)
        poly1 = [
            [c1_lon - 0.08, c1_lat - 0.06],
            [c1_lon + 0.06, c1_lat - 0.05],
            [c1_lon + 0.12, c1_lat + 0.08],
            [c1_lon + 0.02, c1_lat + 0.11],
            [c1_lon - 0.09, c1_lat + 0.04],
            [c1_lon - 0.08, c1_lat - 0.06],
        ]

        poly2 = [
            [c2_lon - 0.05, c2_lat - 0.04],
            [c2_lon + 0.05, c2_lat - 0.03],
            [c2_lon + 0.07, c2_lat + 0.05],
            [c2_lon - 0.02, c2_lat + 0.06],
            [c2_lon - 0.05, c2_lat - 0.04],
        ]

        props1 = {
            "cell_id": "CELL_01_SOHRA",
            "name": "Sohra Severe Convective Core",
            "peak_dbz": 62.4,
            "max_reflectivity_dbz": 62.4,
            "centroid_lat": round(c1_lat, 4),
            "centroid_lon": round(c1_lon, 4),
            "area_km2": 24.5,
            "echo_top_km": 16.5,
            "vil_kg_m2": 58.2,
            "min_ir_bt_k": 202.1,
            "flash_rate_per_min": 35,
            "schultz_jump_detected": True,
            "motion_vector": {"speed_kmh": 42.0, "heading_deg": 45.0},
            "velocity_kmh": 42.0,
            "heading_deg": 45.0,
            "eta_cherrapunji_min": max(0, 15 - lead_time_min),
            "eta_minutes": max(0, 15 - lead_time_min),
            "severity": "CRITICAL",
        }
        props1.update(derive_cell_hazard_factors(
            peak_dbz=props1["peak_dbz"],
            area_km2=props1["area_km2"],
            vil_kg_m2=props1["vil_kg_m2"],
            echo_top_km=props1["echo_top_km"],
        ))

        props2 = {
            "cell_id": "CELL_02_MAWSYNRAM",
            "name": "Mawsynram Orographic Feeder Cell",
            "peak_dbz": 53.1,
            "max_reflectivity_dbz": 53.1,
            "centroid_lat": round(c2_lat, 4),
            "centroid_lon": round(c2_lon, 4),
            "area_km2": 16.8,
            "echo_top_km": 13.8,
            "vil_kg_m2": 38.0,
            "min_ir_bt_k": 218.4,
            "flash_rate_per_min": 18,
            "schultz_jump_detected": False,
            "motion_vector": {"speed_kmh": 36.0, "heading_deg": 48.0},
            "velocity_kmh": 36.0,
            "heading_deg": 48.0,
            "eta_cherrapunji_min": max(0, 32 - lead_time_min),
            "eta_minutes": max(0, 32 - lead_time_min),
            "severity": "HIGH",
        }
        props2.update(derive_cell_hazard_factors(
            peak_dbz=props2["peak_dbz"],
            area_km2=props2["area_km2"],
            vil_kg_m2=props2["vil_kg_m2"],
            echo_top_km=props2["echo_top_km"],
        ))

        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": "CELL_01_SOHRA",
                    "geometry": {"type": "Polygon", "coordinates": [poly1]},
                    "properties": props1,
                },
                {
                    "type": "Feature",
                    "id": "CELL_02_MAWSYNRAM",
                    "geometry": {"type": "Polygon", "coordinates": [poly2]},
                    "properties": props2,
                },
            ],
        }

    def generate_synthetic_forecast(
        self,
        lead_time_min: int,
        timestamp: Optional[datetime] = None,
        replay_progress: float = 0.5,
    ) -> ForecastOutputSchema:
        """Create ForecastOutputSchema for a given lead time (10, 20, 30, 45, 60...360 min)."""
        ts = timestamp or _utc_now()
        # Escalate hazard for event replay progression
        ci = float(np.clip(0.85 - (lead_time_min / 360.0) * 0.35 + replay_progress * 0.15, 0.20, 0.95))
        lightning = float(np.clip(0.91 - (lead_time_min / 360.0) * 0.30 + replay_progress * 0.10, 0.25, 0.96))
        hail = float(np.clip(0.64 - (lead_time_min / 360.0) * 0.40 + replay_progress * 0.20, 0.10, 0.88))
        downburst = float(np.clip(0.42 - (lead_time_min / 360.0) * 0.25 + replay_progress * 0.15, 0.10, 0.78))
        cloudburst = float(np.clip(0.73 - (lead_time_min / 360.0) * 0.30 + replay_progress * 0.25, 0.20, 0.98))

        storm_cells = self.generate_active_storm_cells_geojson(ts, lead_time_min)

        return ForecastOutputSchema(
            lead_time_minutes=lead_time_min,
            forecast_timestamp=ts,
            hazard_probabilities={
                "ci": round(ci, 2),
                "lightning": round(lightning, 2),
                "hail": round(hail, 2),
                "downburst": round(downburst, 2),
                "cloudburst": round(cloudburst, 2),
            },
            ci_prob=round(ci, 2),
            lightning_prob=round(lightning, 2),
            hail_prob=round(hail, 2),
            downburst_prob=round(downburst, 2),
            cloudburst_prob=round(cloudburst, 2),
            lightning_density=round(float(np.clip(16.5 - (lead_time_min / 60.0) * 2.0, 2.0, 24.0)), 1),
            hail_size_cm=round(float(np.clip(3.5 - (lead_time_min / 60.0) * 0.4, 0.5, 4.5)), 1),
            downburst_vel=round(float(np.clip(26.0 - (lead_time_min / 60.0) * 2.5, 12.0, 32.0)), 1),
            storm_cells=storm_cells,
            uncertainty_cone={
                "angle_deg": round(25.0 + (lead_time_min / 60.0) * 6.0, 1),
                "radius_km": round(15.0 + (lead_time_min / 60.0) * 12.0, 1),
                "confidence_pct": round(max(40.0, 92.0 - (lead_time_min / 60.0) * 8.0), 1),
            },
            storm_motion={"direction": "NE", "degrees": 45.0, "speed_kmh": 42.0, "eta_minutes": max(0.0, 27.0 - lead_time_min)},
            data_quality={
                "radar": "GOOD (1m14s lag)",
                "satellite": "GOOD (3m lag)",
                "lightning": "GOOD",
                "aws": "MODERATE",
            },
            ai_model="ConvectNet v1 (SyntheticMode)",
            data_mode="historical_fallback",
        )


# Global default synthetic engine
synthetic_engine = SyntheticConvectiveEngine()
HistoricalCherrapunjiEngine = SyntheticConvectiveEngine
