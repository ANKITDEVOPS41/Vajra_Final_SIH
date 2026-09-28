"""
ConvectNow — Four-Parameter Convective Hazard Physics Engine
Implements:
1. Severe Hail Probability (SHI, POSH, MESH) - Witt et al. (1998)
2. Downburst & Microburst Wind Velocity (MDAP & Wet-Bulb Zero)
3. Cloudburst & Extreme Rain Rate Detection (Tropical Z-R: Marshall-Palmer Variant)
4. Lightning Strike Density Estimation (Flashes/km^2/hr)
"""


import numpy as np
from scipy.ndimage import binary_opening


class ConvectiveHazardEngine:
    def __init__(self, grid_res_km: float = 1.0):
        self.grid_res_km = grid_res_km

    def compute_rain_rate_tropical_zr(self, dbz: np.ndarray) -> np.ndarray:
        """
        Computes rain rate R (mm/hr) using Tropical Convective Z-R relationship (Rosenfeld 2000):
        Z = 300 * R^1.5  -->  R = (Z / 300)^(1 / 1.5)
        Standard Marshall-Palmer comparison: Z = 200 * R^1.6
        """
        Z_linear = 10.0 ** (np.clip(dbz, 0, 75.0) / 10.0)
        # Tropical convective rain rate
        rain_rate = (np.maximum(0, Z_linear) / 300.0) ** (1.0 / 1.5)
        return np.nan_to_num(rain_rate, nan=0.0)

    def detect_cloudburst(self, rain_rate: np.ndarray, threshold_mmh: float = 100.0) -> dict:
        """
        Flags localized cloudburst regions exceeding WMO/IMD operational threshold (>= 100 mm/hr).
        Applies morphological opening (3x3 footprint) to prevent isolated noise triggers.
        """
        raw_cloudburst_mask = (rain_rate >= threshold_mmh).astype(np.uint8)
        # 3x3 structuring element requiring multi-cell spatial continuity
        confirmed_mask = binary_opening(raw_cloudburst_mask, structure=np.ones((3, 3)))
        
        peak_rate = float(np.max(rain_rate))
        cloudburst_area_km2 = float(np.sum(confirmed_mask) * (self.grid_res_km ** 2))
        
        return {
            "is_cloudburst_active": bool(np.any(confirmed_mask)),
            "peak_rain_rate_mmh": round(peak_rate, 1),
            "affected_area_km2": round(cloudburst_area_km2, 1),
            "threat_tier": "EXTREME" if peak_rate >= 150.0 else ("WARNING" if peak_rate >= 100.0 else "ADVISORY")
        }

    def compute_hail_parameters(self, dbz: np.ndarray, freezing_level_km: float = 4.2) -> dict:
        """
        Computes 2D Proxy Severe Hail Index (SHI), Probability of Severe Hail (POSH), and
        Maximum Expected Size of Hail (MESH) adapted from Witt et al. (1998) / Waldvogel (1979).

        NOTE ON OPERATIONAL FORMULATION (NCMRWF / IMD Context):
        Witt et al. (1998) strictly requires a full 3D polar radar volume scan integrated
        vertically across environmental temperature profiles (0°C to -20°C isotherms).
        In operational composite / single-tilt MAX-Z mode without an active 3D thermodynamic
        sounding cube, we compute an empirical 2D proxy: column-integrated hail energy E(Z)
        weighted by effective convective core depth above the 0°C freezing level (0.45 empirical
        attenuation factor). This provides immediate operational guidance prior to full Level-II
        3D polar volume reconstruction.
        """
        # Linear reflectivity energy term E(Z)
        Z_lin = 10.0 ** (np.clip(dbz, 0, 75.0) / 10.0)
        E_z = np.where(dbz < 40.0, 0.0, (Z_lin - 10000.0) / 46000.0)
        E_z = np.maximum(0.0, E_z)

        # 2D empirical vertical integration proxy above freezing level H0
        effective_depth_km = np.clip((dbz - 40.0) / 4.0, 0.0, 8.0)
        SHI = 0.1 * E_z * effective_depth_km * 0.45

        # Probability of Severe Hail (%)
        POSH = np.clip(29.0 * np.log(np.maximum(1e-4, SHI)) - 2.84, 0.0, 100.0)
        # Maximum Expected Size of Hail (mm)
        MESH = 2.54 * np.sqrt(np.maximum(0.0, SHI))

        max_posh = float(np.max(POSH))
        max_mesh = float(np.max(MESH))

        return {
            "posh_map": POSH,
            "mesh_map": MESH,
            "max_posh_percent": round(max_posh, 1),
            "max_hail_size_mm": round(max_mesh, 1),
            "hail_risk_level": "SEVERE" if max_posh >= 60.0 else ("MODERATE" if max_posh >= 30.0 else "LOW")
        }

    def compute_downburst_velocity(self, dbz: np.ndarray, vil: np.ndarray, cape: float = 1800.0) -> dict:
        """
        Computes Downburst / Microburst peak wind velocity based on VIL Density and MDAP.
        VIL Density = VIL / EchoTopHeight
        Downburst Velocity V_db = k * sqrt(CAPE * lapse_factor)
        """
        # VIL density approximation
        vil_density = vil / 12.0 # assuming average echo top 12 km
        
        # Empirical downburst gust velocity model (m/s)
        # Reflectivity gradient + CAPE potential
        dbz_factor = np.clip((dbz - 35.0) / 30.0, 0.0, 1.0)
        v_db_ms = 0.72 * np.sqrt(cape * 0.12) * dbz_factor + (vil_density * 3.5)
        v_db_kmh = v_db_ms * 3.6

        peak_gust_kmh = float(np.max(v_db_kmh))

        return {
            "velocity_map_kmh": v_db_kmh,
            "peak_gust_kmh": round(peak_gust_kmh, 1),
            "peak_gust_ms": round(peak_gust_kmh / 3.6, 1),
            "downburst_risk": "EXTREME" if peak_gust_kmh >= 90.0 else ("SEVERE" if peak_gust_kmh >= 60.0 else "MODERATE")
        }

    def compute_lightning_density(self, dbz: np.ndarray, vil: np.ndarray) -> dict:
        """
        Estimates total lightning strike flash density (flashes/km^2/hr)
        correlating VIL supercooled water with maximum column reflectivity.
        """
        # Empirical power-law proxy for lightning flash density
        # Flash density increases non-linearly when dBZ > 40 and VIL > 15 kg/m^2
        convective_core = np.clip((dbz - 38.0) / 20.0, 0.0, 2.0)
        flash_density = (vil * 0.18) * (convective_core ** 2.2)
        flash_density = np.clip(flash_density, 0.0, 45.0)

        peak_density = float(np.max(flash_density))

        return {
            "density_map": flash_density,
            "peak_density_flashes_km2_hr": round(peak_density, 2),
            "threat_level": "HIGH" if peak_density >= 5.0 else ("MEDIUM" if peak_density >= 1.5 else "LOW")
        }

    def evaluate_cell_hazards(self, cell_dbz: float, cell_vil: float) -> dict:
        """
        Evaluates point hazard indices for an isolated storm cell object.
        """
        dbz_arr = np.array([[cell_dbz]], dtype=np.float32)
        vil_arr = np.array([[cell_vil]], dtype=np.float32)

        rain = self.compute_rain_rate_tropical_zr(dbz_arr)[0, 0]
        hail = self.compute_hail_parameters(dbz_arr)
        wind = self.compute_downburst_velocity(dbz_arr, vil_arr)
        lght = self.compute_lightning_density(dbz_arr, vil_arr)

        return {
            "rain_rate_mmh": round(float(rain), 1),
            "cloudburst_flag": bool(rain >= 100.0),
            "posh_percent": hail["max_posh_percent"],
            "mesh_hail_mm": hail["max_hail_size_mm"],
            "downburst_gust_kmh": wind["peak_gust_kmh"],
            "lightning_density": lght["peak_density_flashes_km2_hr"],
            "explainability": {
                "radar_core_driver": f"Column reflectivity reached {cell_dbz:.1f} dBZ",
                "vil_liquid_driver": f"Vertically Integrated Liquid at {cell_vil:.1f} kg/m²",
                "convective_severity": "High charge separation potential & supercooled droplet suspension"
            }
        }
