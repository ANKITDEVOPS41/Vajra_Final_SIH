"""
ConvectNow — Comprehensive Meteorological Derivations Test Suite
SIH Problem Statement: PS-26084 (Ministry of Earth Sciences / NCMRWF / IMD)

Validates the mathematical authenticity, physical clamping, and standard compliance of:
1. Precipitation Rate (compute_rain_rate_zr): Marshall-Palmer & Tropical Convective Z-R laws + 55 dBZ hail cap
2. Severe Hail Probability (compute_hail_probability): Witt et al. (1998) & Waldvogel (1979) + VIL density
3. Convective Lightning Flash Rate (compute_lightning_flash_rate): Price & Rind (1992) & Deierling et al. (2008)
4. Low-Level Wind Shear / Microburst Delta V (compute_shear_delta_v): ICAO Doc 9817 & Fujita (1985)
5. Unified Cell Hazard Evaluator (derive_cell_hazard_factors)
6. End-to-end integration into GeoJSON storm cell payloads
"""

import math
import pytest

from backend.meteorology import (
    compute_rain_rate_zr,
    compute_hail_probability,
    compute_lightning_flash_rate,
    compute_shear_delta_v,
    derive_cell_hazard_factors,
)
from backend.data.historical_engine import SyntheticConvectiveEngine


# =============================================================================
# 1. RAIN RATE (Z-R RELATIONSHIP) TESTS
# =============================================================================

class TestRainRateZR:
    """Tests for radar reflectivity to rain rate derivations."""

    def test_sub_precipitation_threshold(self):
        """Reflectivity below 10 dBZ indicates cloud droplets / virga with no measurable surface rain."""
        assert compute_rain_rate_zr(5.0) == 0.0
        assert compute_rain_rate_zr(9.9) == 0.0
        assert compute_rain_rate_zr(-5.0) == 0.0

    def test_tropical_convective_spectrum(self):
        """Verify Tropical Convective (Z = 300 * R^1.4) across the meteorological reflectivity spectrum."""
        # 25 dBZ: light stratiform rain (~1.0 mm/h)
        r25 = compute_rain_rate_zr(25.0, formula="tropical_convective")
        assert 0.8 <= r25 <= 1.2

        # 35 dBZ: moderate convective rain (~5.4 mm/h)
        r35 = compute_rain_rate_zr(35.0, formula="tropical_convective")
        assert 4.5 <= r35 <= 6.0

        # 45 dBZ: heavy convective shower (~27.9 mm/h)
        r45 = compute_rain_rate_zr(45.0, formula="tropical_convective")
        assert 25.0 <= r45 <= 31.0

        # 50 dBZ: torrential tropical convective core (~63.4 mm/h)
        r50 = compute_rain_rate_zr(50.0, formula="tropical_convective")
        assert 60.0 <= r50 <= 66.0

    def test_marshall_palmer_comparison(self):
        """Verify Marshall-Palmer (Z = 200 * R^1.6) produces appropriate stratiform rates."""
        r40_mp = compute_rain_rate_zr(40.0, formula="marshall_palmer")
        # Z = 10000, R = (10000 / 200)^(1 / 1.6) = 50^0.625 ≈ 11.5 mm/h
        assert 10.5 <= r40_mp <= 12.5

        r50_mp = compute_rain_rate_zr(50.0, formula="marshall_palmer")
        # Z = 100000, R = (100000 / 200)^0.625 ≈ 48.6 mm/h
        assert 45.0 <= r50_mp <= 52.0

    def test_hail_contamination_capping_at_55dbz(self):
        """Reflectivity above 55 dBZ must be capped to prevent unphysical hail scattering spikes (Fulton et al. 1998)."""
        r55 = compute_rain_rate_zr(55.0, formula="tropical_convective")
        r60 = compute_rain_rate_zr(60.0, formula="tropical_convective")
        r65 = compute_rain_rate_zr(65.0, formula="tropical_convective")
        r70 = compute_rain_rate_zr(70.0, formula="tropical_convective")

        assert r55 == r60 == r65 == r70 == 144.3
        # Must not exceed physical cap
        assert r70 <= 250.0

    def test_monotonic_growth_below_cap(self):
        """Rain rate must be strictly monotonically increasing below 55 dBZ."""
        rates = [compute_rain_rate_zr(dbz) for dbz in range(15, 56, 5)]
        for i in range(len(rates) - 1):
            assert rates[i] < rates[i + 1]


# =============================================================================
# 2. SEVERE HAIL PROBABILITY TESTS
# =============================================================================

class TestHailProbability:
    """Tests for Witt et al. (1998) & Waldvogel (1979) hail probability."""

    def test_below_threshold_zero_probability(self):
        """Pure liquid phase below 38 dBZ returns exactly 0.0% hail probability."""
        assert compute_hail_probability(20.0) == 0.0
        assert compute_hail_probability(30.0) == 0.0
        assert compute_hail_probability(37.9) == 0.0

    def test_waldvogel_and_sigmoidal_transition(self):
        """Verify realistic probabilities across transition zone (38 to 65 dBZ)."""
        # 40 dBZ: onset of graupel aloft (~9.6%)
        p40 = compute_hail_probability(40.0)
        assert 8.0 <= p40 <= 12.0

        # 45 dBZ: Waldvogel hail detection threshold (~30.2%)
        p45 = compute_hail_probability(45.0)
        assert 28.0 <= p45 <= 33.0

        # 48 dBZ: Sigmoidal inflection point (exactly 50.0%)
        p48 = compute_hail_probability(48.0)
        assert p48 == 50.0

        # 50 dBZ: Confirmed hail aloft (~63.6%)
        p50 = compute_hail_probability(50.0)
        assert 61.0 <= p50 <= 66.0

        # 55 dBZ: Severe hail probable (~87.7%)
        p55 = compute_hail_probability(55.0)
        assert 85.0 <= p55 <= 90.0

        # 62 dBZ: Destructive hail core (>= 97%)
        p62 = compute_hail_probability(62.0)
        assert p62 >= 97.0
        assert p62 <= 100.0

    def test_amburn_wolf_vil_density_boost(self):
        """High VIL density (>= 3.5 g/m^3) guarantees severe hail probability >= 85%."""
        # 45 dBZ normally gives ~30.2%, but with VIL=45 kg/m^2 and EchoTop=10 km -> VIL density = 4.5 g/m^3
        p_boosted = compute_hail_probability(45.0, vil_kg_m2=45.0, echo_top_km=10.0)
        assert p_boosted >= 85.0

    def test_physical_bounds(self):
        """Probability must strictly reside in [0.0, 100.0]%."""
        for dbz in [-10.0, 0.0, 35.0, 50.0, 75.0, 95.0]:
            p = compute_hail_probability(dbz)
            assert 0.0 <= p <= 100.0


# =============================================================================
# 3. LIGHTNING FLASH RATE TESTS
# =============================================================================

class TestLightningFlashRate:
    """Tests for Price & Rind (1992) & Deierling (2008) lightning flash rate."""

    def test_electrification_threshold(self):
        """No significant charge separation occurs in cells with peak dBZ < 35."""
        assert compute_lightning_flash_rate(25.0) == 0.0
        assert compute_lightning_flash_rate(34.9) == 0.0

    def test_convective_scaling(self):
        """Flash rate scales power-law style with reflectivity excess above 35 dBZ."""
        # 40 dBZ: onset of electrification (~1.8 fl/min at 20 km^2)
        f40 = compute_lightning_flash_rate(40.0, area_km2=20.0)
        assert 1.5 <= f40 <= 2.2

        # 45 dBZ: moderate thunderstorm (~9.5 fl/min)
        f45 = compute_lightning_flash_rate(45.0, area_km2=20.0)
        assert 8.5 <= f45 <= 10.5

        # 50 dBZ: active thunderstorm (~25.1 fl/min)
        f50 = compute_lightning_flash_rate(50.0, area_km2=20.0)
        assert 23.0 <= f50 <= 27.0

        # 55 dBZ: severe thunderstorm (~50.1 fl/min)
        f55 = compute_lightning_flash_rate(55.0, area_km2=20.0)
        assert 47.0 <= f55 <= 53.0

        # 62 dBZ: intense supercell / lightning jump (> 95 fl/min)
        f62 = compute_lightning_flash_rate(62.0, area_km2=20.0)
        assert f62 >= 95.0

    def test_area_scaling(self):
        """Larger storm anvil / core footprint yields higher total flash rate."""
        f_small = compute_lightning_flash_rate(50.0, area_km2=10.0)
        f_large = compute_lightning_flash_rate(50.0, area_km2=40.0)
        assert f_small < f_large
        # Area factor scales as sqrt(A2 / A1) = sqrt(4) = 2
        assert abs((f_large / f_small) - math.sqrt(40.0 / 10.0)) < 0.1

    def test_max_rate_clamping(self):
        """Flash rate must not exceed physical cap (default 150 fl/min)."""
        f_extreme = compute_lightning_flash_rate(80.0, area_km2=200.0)
        assert f_extreme <= 150.0


# =============================================================================
# 4. WIND SHEAR DELTA V TESTS
# =============================================================================

class TestShearDeltaV:
    """Tests for ICAO Doc 9817 / Fujita microburst divergent radial shear."""

    def test_boundary_layer_baseline(self):
        """Below 32 dBZ, returns ambient boundary layer shear baseline (8.0 kt)."""
        assert compute_shear_delta_v(20.0) == 8.0
        assert compute_shear_delta_v(31.9) == 8.0

    def test_icao_and_faa_hazard_thresholds(self):
        """Verify critical aviation regulatory shear thresholds."""
        # FAA LLWS caution threshold (>= 15 kt) triggered by ~40 dBZ
        s40 = compute_shear_delta_v(40.0)
        assert s40 >= 15.0
        assert 16.5 <= s40 <= 19.5

        # Borderline microburst at 45 dBZ (~28.8 kt)
        s45 = compute_shear_delta_v(45.0)
        assert 27.0 <= s45 <= 30.5

        # ICAO Mandatory Go-Around Microburst Warning (>= 30 kt) triggered at >= 46 dBZ
        s46 = compute_shear_delta_v(46.0)
        assert s46 >= 30.0, f"Expected ICAO microburst trigger (>=30 kt) at 46 dBZ, got {s46}"

        # 50 dBZ: Confirmed Microburst Warning (~41.8 kt)
        s50 = compute_shear_delta_v(50.0)
        assert 39.0 <= s50 <= 44.0

        # 55 dBZ: Severe Microburst (~56.8 kt)
        s55 = compute_shear_delta_v(55.0)
        assert 54.0 <= s55 <= 60.0

        # 62 dBZ: Violent downburst (~80.7 kt)
        s62 = compute_shear_delta_v(62.0)
        assert 75.0 <= s62 <= 85.0

    def test_hydrometeor_loading_boost(self):
        """High VIL increases downdraft velocity via water loading."""
        s_dry = compute_shear_delta_v(50.0, vil_kg_m2=0.0)
        s_loaded = compute_shear_delta_v(50.0, vil_kg_m2=45.0)
        assert s_loaded > s_dry

    def test_physical_limits(self):
        """Shear delta V clamped to [5.0, 85.0] kt."""
        assert compute_shear_delta_v(-10.0) >= 5.0
        assert compute_shear_delta_v(90.0, vil_kg_m2=100.0) <= 85.0


# =============================================================================
# 5. UNIFIED CELL HAZARD EVALUATOR TESTS
# =============================================================================

class TestUnifiedHazardEvaluator:
    """Tests for derive_cell_hazard_factors and citations."""

    def test_keys_and_citations_present(self):
        """Output dictionary must contain camelCase, snake_case, MESH, and academic citations."""
        res = derive_cell_hazard_factors(peak_dbz=52.0, area_km2=25.0, vil_kg_m2=40.0)

        # camelCase keys for frontend
        assert "rainRateMmh" in res
        assert "hailProb" in res
        assert "lightningFlashRate" in res
        assert "shearDeltaV" in res
        assert "poh" in res
        assert "meshMm" in res

        # snake_case keys for backend
        assert "rain_rate_mmh" in res
        assert "hail_prob" in res
        assert "lightning_flash_rate" in res
        assert "shear_delta_v" in res
        assert "mesh_mm" in res

        # Academic citations
        assert "citations" in res
        cits = res["citations"]
        assert "Rosenfeld" in cits["rainRateMmh"] or "Marshall" in cits["rainRateMmh"]
        assert "Witt" in cits["hailProb"] or "Waldvogel" in cits["hailProb"]
        assert "Price" in cits["lightningFlashRate"] or "Deierling" in cits["lightningFlashRate"]
        assert "ICAO" in cits["shearDeltaV"] or "Fujita" in cits["shearDeltaV"]

    def test_extreme_supercell_evaluator(self):
        """62.4 dBZ extreme supercell core evaluation."""
        res = derive_cell_hazard_factors(peak_dbz=62.4, area_km2=24.5, vil_kg_m2=58.2, echo_top_km=16.5)
        # Rain rate capped at 55 dBZ
        assert res["rainRateMmh"] == 144.3
        # Hail probability very high
        assert res["hailProb"] >= 95.0
        # Lightning jump flash rate
        assert res["lightningFlashRate"] >= 100.0
        # Extreme shear delta V
        assert res["shearDeltaV"] >= 80.0
        # Severe hail diameter MESH based on Witt et al. (1998)
        assert res["meshMm"] >= 7.0


# =============================================================================
# 6. INTEGRATION WITH HISTORICAL ENGINE
# =============================================================================

class TestHistoricalEngineIntegration:
    """Verify that GeoJSON features produced by historical engine contain all hazard factors."""

    def test_storm_cells_geojson_contains_dynamic_hazards(self):
        engine = SyntheticConvectiveEngine()
        fc = engine.generate_active_storm_cells_geojson(lead_time_min=0)
        assert fc["type"] == "FeatureCollection"
        assert len(fc["features"]) >= 2

        for feature in fc["features"]:
            props = feature["properties"]
            assert "rainRateMmh" in props
            assert "hailProb" in props
            assert "lightningFlashRate" in props
            assert "shearDeltaV" in props
            assert "meshMm" in props
            assert "poh" in props
            assert props["rainRateMmh"] > 0
            assert props["hailProb"] > 0
            assert props["shearDeltaV"] >= 15.0
            assert props["lightningFlashRate"] > 0
