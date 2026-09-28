# Dispatch for E2E Test Writer

You are Test Writer (teamwork_preview_test_writer).
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/test_writer_e2e/
You must read ORIGINAL_REQUEST.md: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md
Also read:
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_1/TEST_INFRA.md
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_1/PROJECT.md

## Scope & Write Ownership
You own:
- `frontend/scripts/verify-e2e.mjs` (or any testing scripts under `frontend/scripts/`)
- Adding an npm script `"test:e2e": "node scripts/verify-e2e.mjs"` to `frontend/package.json`
Do NOT modify core UI components (leave those to workers).

## Requirements
Implement an automated opaque-box test runner in `frontend/scripts/verify-e2e.mjs` validating all 4 Tiers:
1. **Tier 1: Feature Coverage (≥5 checks per feature)**:
   - Verify absence of 20 artificial concentric `<Circle>` elements in `WeatherRasterOverlay.tsx`.
   - Verify presence of live IMD INSAT-3DR WMS, RainViewer radar tile integration, live heat field, MSLP pressure isobars, and humidity.
   - Verify weather switcher formats and calibrated colorbars with physical units.
   - Verify preservation of 1–3 km runway safety perimeter rings around VEBS Runway 19.
   - Verify preservation of motion vectors and target intercept rays.
   - Verify Presence of Visual Intel & Decision Key on all 7 platform pages (`/hazard`, `/dashboard`, `/hyperlocal`, `/inference`, `/case-replay`, `/grid`, `/microburst`).
   - Verify Mission Briefing modal accessible across views.
2. **Tier 2: Boundary & Corner Cases**:
   - Network fallback handling for external WMS/API.
   - Format toggling edge cases.
   - Extreme meteorological thresholds (e.g. dBZ > 65, ΔV > 25 m/s).
3. **Tier 3: Cross-Feature Interactions**:
   - Switching weather layers while 1–3 km rings are displayed.
   - Opening Mission Briefing modal from every platform page without state collision.
4. **Tier 4: Real-World Scenarios**:
   - ATC Runway Go-Around action trigger when storm cell intercepts runway at <3 min.
   - NDMA CAP siren trigger for extreme rain rates.
   - Cherrapunji June 2022 cloudburst benchmark verification.

Run `node scripts/verify-e2e.mjs` and document commands, test results, and test architecture in:
`/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/test_writer_e2e/handoff.md`.

## 2026-09-28T01:30:49Z
You are Test Writer for E2E Testing. Your working directory is /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/test_writer_e2e/.
Read /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md and /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/test_writer_e2e/DISPATCH.md.
Also review /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_1/TEST_INFRA.md and PROJECT.md.

Implement the automated 4-tier E2E verification test suite in `frontend/scripts/verify-e2e.mjs`.
Add `"test:e2e": "node scripts/verify-e2e.mjs"` to `frontend/package.json`.
Implement tests covering:
- Tier 1: Feature coverage (No fake circles in codebase; live feeds configured; layer switcher options present; visual keys on all 7 pages; 1-3km rings protected; build check).
- Tier 2: Boundary & corner cases (WMS fallback, invalid coordinates handling, missing radar timestamp handling).
- Tier 3: Cross-feature combinations (Switching weather format while runway rings active, opening Mission Briefing modal from all views).
- Tier 4: Real-world operational scenarios (ATC Runway Go-Around action trigger, NDMA siren broadcast trigger, Cherrapunji case replay validation).

Run `node scripts/verify-e2e.mjs`, document output, and write handoff report to /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/test_writer_e2e/handoff.md. Notify orchestrator with send_message.
