# Context — Meteorological Derivations & Frontend Wiring

## Task Overview
Implement meteorological derivation functions in the Python backend to dynamically calculate the 4 critical aviation hazard factors (Rain, Hail, Lightning, Shear) from live IMD radar reflectivity (dBZ) data.
Deliver these factors through the API payload so the frontend 3x3 grid telemetry is 100% mathematically authentic for the SIH presentation.

## Target Requirements
- R1. Backend Hazard Derivation: Implement standard meteorological formulas (Z-R relationship, VIL-based hail estimation, convective lightning probability, and wind shear proxy) in the Python backend (e.g. data_source_manager.py or meteorology.py). Document derivations explicitly in code comments.
- R2. API Payload Integration: Return these 4 derived factors inside the StormCell payload sent to frontend.
- R3. Frontend Wiring: Update data mapping layer in HazardDashboard.tsx to ingest these backend-provided factors rather than using static fallbacks.
- Acceptance criteria:
  * Backend calculates & serves 4 hazard factors dynamically based on live dBZ.
  * No hazard factors in active storm cell mappings use static hardcoded fallbacks (e.g., hailProb: 60).
  * Frontend builds cleanly (npm run build).
  * Backend API starts without syntax or import errors.

## Key Files to Investigate
- Backend data source manager / storm cell generation: `data_source_manager.py`, radar pipeline or similar backend files.
- Backend API endpoints / schemas: storm cell model/schema.
- Frontend: `HazardDashboard.tsx`, storm cell types, API client services.
- ORIGINAL_REQUEST.md: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md`
