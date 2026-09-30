# Plan: Meteorological Hazard Derivation & Telemetry Wiring

## Objective
Implement meteorological formulas in Python backend (Z-R Marshall-Palmer rain rate, VIL hail probability, convective lightning probability, shear proxy) from IMD radar peak dBZ / area, expose via StormCell API payload, wire into frontend HazardDashboard, and verify build & syntax.

## Milestones & Verification Steps

### Milestone 1: Exploration & Codebase Mapping
- Dispatch 3 Explorers in parallel to inspect:
  1. Backend radar processing, StormCell models, `data_source_manager.py`, and where storm cells are constructed and serialized.
  2. Standard meteorological equations applicable (Marshall-Palmer $Z = 200 R^{1.6}$, VIL/dBZ hail probability Waldvogel/Witt proxy, lightning flash rate Price & Rind / convective index proxy, wind shear proxy) and exact variable definitions.
  3. Frontend `HazardDashboard.tsx`, types/interfaces, API response models, and current fallback logic.
- Output: Technical synthesis and implementation blueprint.

### Milestone 2: Backend Implementation & API Integration
- Dispatch Worker to:
  1. Implement derivation utility / methods (e.g. `meteorology.py` or within `data_source_manager.py`) with rich meteorological documentation comments for SIH presentation.
  2. Integrate derivations into StormCell payload returned by backend endpoints.
  3. Verify backend imports and syntax with clean verification tests.

### Milestone 3: Frontend Wiring & UI Integration
- Dispatch Worker to:
  1. Update frontend models/types if needed.
  2. Update `HazardDashboard.tsx` to read dynamic backend hazard factors (`hailProb`, `rainRateMmh`, `lightningFlashRate`, `shearDeltaV`).
  3. Ensure no active storm cells use hardcoded fallbacks like `hailProb: 60`.
  4. Verify frontend builds cleanly (`npm run build`).

### Milestone 4: Comprehensive Verification & Review
- Dispatch Reviewers to audit:
  1. Mathematical authenticity and code comments for SIH judges.
  2. API schema conformance and zero hardcoded fallbacks.
  3. Clean builds (frontend `npm run build` and backend test/import check).
- Final synthesis and completion report to Sentinel.
