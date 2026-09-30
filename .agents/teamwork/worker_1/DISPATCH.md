# Dispatch for Worker 1: Implementation of Meteorological Hazard Derivations, API Payload, & Frontend Wiring

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Input Files
- Original Request: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md`
- Backend Explorer Report: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1/handoff.md`
- Frontend Explorer Report: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_2/handoff.md`
- Meteorology Explorer Report: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_3/handoff.md`

## File Ownership
You exclusively own and may edit/create:
- `backend/meteorology.py` (New file)
- `backend/hazard_engine.py`
- `backend/data/historical_engine.py`
- `backend/data/data_source_manager.py`
- `backend/api/main.py`
- `backend/server.py`
- `frontend/src/hooks/useConvectNowData.ts`
- `frontend/src/components/HazardDashboard.tsx`
- `tests/test_meteorology.py` (New test file)

## Tasks & Detailed Requirements

### Task 1: Create `backend/meteorology.py`
Implement standard, mathematically authentic meteorological formulas with comprehensive docstrings, formula derivations, citations (Marshall & Palmer 1948, Rosenfeld 2000, Witt et al. 1998, Waldvogel et al. 1979, Price & Rind 1992, ICAO Doc 9817, Fujita 1985), and physical clamping (per explorer_m1_3 report):
1. `compute_rain_rate_zr(peak_dbz: float, formula: str = "tropical_convective", hail_cap_dbz: float = 55.0, max_rate_mmh: float = 250.0) -> float`:
   - $Z = 10^{\text{dBZ}/10}$
   - Tropical convective: $Z = 300 R^{1.4} \implies R = (Z / 300)^{1/1.4}$
   - Marshall-Palmer: $Z = 200 R^{1.6} \implies R = (Z / 200)^{1/1.6}$
   - Cap effective dBZ at 55.0 dBZ to prevent hail-contamination spikes.
   - Clamp return value to $[0.0, 250.0]\text{ mm/h}$, round to 1 decimal place.
2. `compute_hail_probability(peak_dbz: float, vil_kg_m2: Optional[float] = None, echo_top_km: Optional[float] = 12.0) -> float`:
   - Below 38.0 dBZ: return 0.0%
   - Sigmoidal Witt / Waldvogel proxy: $P = 100 / (1 + \exp(-0.28 \cdot (\text{peak\_dbz} - 48.0)))$
   - Amburn & Wolf VIL density check: if VIL / echo_top $\ge 3.5\text{ g/m}^3$, ensure $P \ge 85.0\%$.
   - Clamp to $[0.0, 100.0]\%$, round to 1 decimal place.
3. `compute_lightning_flash_rate(peak_dbz: float, area_km2: float = 20.0, max_rate: float = 150.0) -> float`:
   - Below 35.0 dBZ: return 0.0 fl/min
   - Price & Rind / Deierling proxy: $F = 1.8 \cdot ((\text{peak\_dbz} - 35.0) / 5.0)^{2.4} \cdot \sqrt{\max(1.0, \text{area\_km2}) / 20.0}$
   - Clamp to $[0.0, 150.0]\text{ fl/min}$, round to 1 decimal place.
4. `compute_shear_delta_v(peak_dbz: float, vil_kg_m2: Optional[float] = None, max_delta_v_kt: float = 85.0) -> float`:
   - Below 32.0 dBZ: return 8.0 kt (ambient boundary layer)
   - ICAO / Fujita downburst proxy: $\Delta V = 8.0 + 14.0 \cdot ((\text{peak\_dbz} - 32.0) / 10.0)^{1.5} \cdot (1.0 + 0.15 \cdot \min(2.0, \text{VIL} / 30.0))$
   - Clamp to $[5.0, 85.0]\text{ kt}$, round to 1 decimal place.
5. `derive_cell_hazard_factors(peak_dbz: float, area_km2: float = 20.0, vil_kg_m2: Optional[float] = None, echo_top_km: Optional[float] = 12.0) -> Dict[str, Any]`:
   - Returns dictionary with both camelCase (`rainRateMmh`, `hailProb`, `lightningFlashRate`, `shearDeltaV`) and snake_case (`rain_rate_mmh`, `hail_prob`, `lightning_flash_rate`, `shear_delta_v`), plus `poh`, `mesh_mm`, and `citations`.

### Task 2: Backend API Payload Integration
1. In `backend/data/historical_engine.py`:
   - In `generate_active_storm_cells_geojson()`: for each storm cell, calculate `hazards = derive_cell_hazard_factors(...)` and add `rainRateMmh`, `hailProb`, `lightningFlashRate`, `shearDeltaV`, `meshMm`, `poh` to `feature["properties"]`.
2. In `backend/api/main.py`:
   - Fix `/api/storm/cells`: Explorer 1 noted that `_model.run()` raises `AttributeError`. Fix it to return `generate_active_storm_cells_geojson()`, ensuring each feature contains the 4 dynamic hazard factors in `properties`.
   - In `/api/forecast/{lead_time_min}`: also ensure any storm cells in `forecast.storm_cells` are enriched with `derive_cell_hazard_factors`.
3. In `backend/server.py`:
   - In `/api/storm/{event_idx}`, ensure `rainRateMmh`, `hailProb`, `lightningFlashRate`, `shearDeltaV` are also present in cell payloads.

### Task 3: Frontend Wiring (`useConvectNowData.ts` & `HazardDashboard.tsx`)
1. In `frontend/src/hooks/useConvectNowData.ts`:
   - Update `StormCell` interface to add optional fields: `hailProb?: number; rainRateMmh?: number; lightningFlashRate?: number; shearDeltaV?: number; meshMm?: number;`.
   - Update `mapBackendCells` to extract `hailProb`, `rainRateMmh`, `lightningFlashRate`, `shearDeltaV`, `meshMm` from properties (handling camelCase, snake_case, and dynamic fallback based on `peak_dbz` if property is absent, NEVER hardcoded static 60/15/10/5).
   - Update `REAL_HISTORICAL_STORM_CELLS` with realistic derived values.
2. In `frontend/src/components/HazardDashboard.tsx`:
   - Line 844: Eliminate all static hardcoded values (`hailProb: 60`, `rainRateMmh: 10`, `shearDeltaV: 15`, `lightningFlashRate: 5`, `poh: 0.5`, `meshMm: 10`). Wire them to dynamic properties from `c.hailProb`, `c.rainRateMmh`, `c.shearDeltaV`, `c.lightningFlashRate`, `c.meshMm`, or dynamically calculated via meteorological formulas from `c.peak_dbz`.
   - Lines 723–777 (`computeForecastedCells`): Remove hardcoded overwrites at `leadMinutes === 0` (which previously forced `fDbz`, `fRain`, and `fShear` to fixed values). Preserve `cell.maxDbz`, `cell.rainRateMmh`, and `cell.shearDeltaV`.
   - Line 1727: Remove static `(93 kt)` string and calculate dynamically: `${Math.round(activeCell.shearDeltaV * 1.94)} kt`.
   - Lines 936–942 (`dynamicGrid`): Dynamically compute sector `rainRateMmh`, `lightningStrokesMin`, and `hailRisk` based on sector `maxDbz`.

### Task 4: Verification & Testing
1. Create `tests/test_meteorology.py`:
   - Test all 4 functions across reflectivity range (25 dBZ, 35 dBZ, 45 dBZ, 50 dBZ, 55 dBZ, 62 dBZ).
   - Verify hail cap at 55 dBZ for rain rate.
   - Verify ICAO microburst trigger ($\Delta V \ge 30\text{ kt}$) at $\ge 46\text{ dBZ}$.
   - Verify zero unphysical values ($R \le 250\text{ mm/h}$, $P_{\text{hail}} \le 100\%$, etc.).
2. Run tests:
   ```bash
   python3 -m py_compile backend/meteorology.py backend/hazard_engine.py backend/api/main.py backend/data/historical_engine.py
   PYTHONPATH=. python3 -m pytest tests/test_meteorology.py -v
   ```
3. Test API endpoint:
   Verify `/api/storm/cells` returns valid JSON with all 4 hazard factors present in `properties`.
4. Test frontend:
   ```bash
   cd frontend && npm run build
   cd frontend && npm run test:e2e
   ```
   Both commands must pass with 0 errors.

## Output
Write your handoff report to `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_1/handoff.md`.
Document all changes, verification commands, and pass results.
Report completion back to parent orchestrator via send_message.

## 2026-09-29T14:24:37Z
You are worker_1.
Your working directory is /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_1/.
Read /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md and /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_1/DISPATCH.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. backend/meteorology.py with authentic derivations (Marshall-Palmer & Tropical Z-R, Witt hail POH, Price & Rind lightning flash rate, ICAO wind shear delta V) and comprehensive docstrings with citations for SIH judges.
2. Integrate hazard factors into storm cell payloads in backend/data/historical_engine.py, backend/api/main.py, backend/server.py. Fix the _model.run AttributeError in backend/api/main.py.
3. Update frontend/src/hooks/useConvectNowData.ts and frontend/src/components/HazardDashboard.tsx: wire dynamic hazard factors, eliminate hardcoded static fallbacks (hailProb: 60, etc.), remove leadMinutes=0 overwrites in computeForecastedCells.
4. Create tests/test_meteorology.py, verify backend imports and py_compile, run pytest, run frontend npm run build and npm run test:e2e.
Write your full report and verification output to /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_1/handoff.md.
Then send a completion message to the parent orchestrator.
