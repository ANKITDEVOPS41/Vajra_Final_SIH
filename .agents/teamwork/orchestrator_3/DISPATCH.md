## 2026-09-29T14:12:29Z
You are the Project Orchestrator for the task defined in /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md under header '## 2026-09-29T14:11:18Z'.

Project root: /Users/gauravkumarnayak/Desktop/convect
Your working directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_3/

Goal:
Implement meteorological derivation functions (Z-R relationship, VIL-based hail estimation, convective lightning probability, and wind shear proxy) in the Python backend to dynamically calculate the 4 critical aviation hazard factors (Rain, Hail, Lightning, Shear) from live IMD radar reflectivity (dBZ) data. Deliver these factors through the API payload so the frontend 3x3 grid telemetry is 100% mathematically authentic for the SIH presentation.

Requirements:
- R1. Backend Hazard Derivation: Implement standard meteorological formulas in the Python backend (e.g., inside data_source_manager.py or a dedicated meteorology.py utility) that take raw IMD telemetry (peak_dbz, area_km2, etc.) and calculate realistic values for hailProb, rainRateMmh, lightningFlashRate, and shearDeltaV. Document derivations explicitly in code comments for SIH judges.
- R2. API Payload Integration: Ensure backend API returns these 4 derived factors inside the StormCell payload sent to the frontend.
- R3. Frontend Wiring: Update the data mapping layer in the frontend (HazardDashboard.tsx) to ingest these backend-provided factors rather than using static fallbacks.
- Acceptance criteria:
  * Backend calculates & serves 4 hazard factors dynamically based on live dBZ.
  * No hazard factors in active storm cell mappings use static hardcoded fallbacks (e.g., hailProb: 60).
  * Frontend builds cleanly (npm run build).
  * Backend API starts without syntax or import errors.

Maintain plan.md, progress.md, and context.md in your working directory. Orchestrate specialist subagents to execute and verify this work. When all work is verified complete, report completion to the sentinel.
