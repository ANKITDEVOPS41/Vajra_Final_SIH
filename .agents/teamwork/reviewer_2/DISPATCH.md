# Dispatch for Reviewer 2: Frontend Telemetry Wiring, Fallback Audit & Build Review

## Objective
Conduct an independent review of the frontend changes made by Worker 1 in `/Users/gauravkumarnayak/Desktop/convect`:
1. Inspect `frontend/src/components/HazardDashboard.tsx`:
   - Verify line 844: Ensure ALL hardcoded static fallbacks (`hailProb: 60`, `rainRateMmh: 10`, `shearDeltaV: 15`, `lightningFlashRate: 5`, `poh: 0.5`, `meshMm: 10`) have been eliminated and replaced with dynamic values from `stormCells` or meteorological formulas.
   - Verify `computeForecastedCells()` (lines 723-777): Confirm the previous static overwrites at `leadMinutes === 0` have been removed and dynamic baseline values (`cell.maxDbz`, `cell.rainRateMmh`, `cell.shearDeltaV`) are preserved.
   - Verify line 1727: Confirm static `(93 kt)` is replaced with dynamic knot calculation.
   - Verify 3x3 sector grid (`dynamicGrid`): Confirm sector hazard fields (`rainRateMmh`, `lightningStrokesMin`, `hailRisk`) are dynamically derived.
2. Inspect `frontend/src/hooks/useConvectNowData.ts`:
   - Verify `StormCell` interface contains the 4 aviation hazard factors.
   - Verify `mapBackendCells` properly normalizes backend properties (supporting camelCase and snake_case).
3. Run verification commands:
   - `cd frontend && npm run build` (tsc -b && vite build)
   - `cd frontend && npm run test:e2e` (node scripts/verify-e2e.mjs)
4. Conclude with a clear verdict: **APPROVE** or **REQUEST_CHANGES**.

## References
- Original Request: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md`
- Worker Handoff: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_1/handoff.md`

## Output
Write your review report to `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/reviewer_2/handoff.md`.
## 2026-09-29T14:42:00Z
You are reviewer_2.
Your working directory is /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/reviewer_2/.
Read /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md, /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_1/handoff.md, and /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/reviewer_2/DISPATCH.md.
Conduct an independent review of the frontend changes:
1. Verify HazardDashboard.tsx: line 844 elimination of static fallbacks (hailProb: 60, etc.), computeForecastedCells dynamic preservation, banner knot conversion, 3x3 grid derivation.
2. Verify useConvectNowData.ts: StormCell interface and mapBackendCells normalization.
3. Run cd frontend && npm run build and cd frontend && npm run test:e2e.
Write your review report to /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/reviewer_2/handoff.md with a clear verdict: APPROVE or REQUEST_CHANGES.
Send your verdict to the parent orchestrator via send_message.
