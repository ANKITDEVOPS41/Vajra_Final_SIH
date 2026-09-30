# Execution Plan: ConvectNow Codebase Mock & Synthetic Data Eradication Audit

## Objective
Conduct a comprehensive, line-by-line audit of the entire ConvectNow codebase to identify and replace any remaining instances of mock data, synthetic generation, simulation loops, or hardcoded fallbacks with real IMD/MOSDAC live integrations or explicitly defined historical ground-truth data, producing a final "Proper Report" of all findings and replacements.

## Requirements Traceability
- **R1: Deep Codebase Audit**: Line-by-line audit using `audit-context-building` methodology across frontend components, backend endpoints, and utility scripts for simulated physics, `Math.random()`, mock constants, and hardcoded metrics.
- **R2: Replacement with Real Data**: Replace identified synthetic/mock logic with real data hooks (`useConvectNowData`) or pass-through variables from the backend's live `DataSourceManager`.
- **R3: Handling Unsupported Simulations**: Simplify or disable unsupported visual simulations (e.g. vertical radar cross-section hail simulation) so 100% of active UI relies on real data.
- **R4: Audit Report Generation**: Produce a final objective markdown report detailing findings, removals/simplifications, and real data mechanisms in the root directory.

## Phased Execution Roadmap

### Phase 0: Granular Codebase Audit (Exploration)
- **Explorer 1 (Frontend UI & Visual Simulations)**:
  - Scope: `frontend/src/components/`, pages, vertical radar cross-section, hail simulation, canvas/SVG rendering, `Math.random()`.
- **Explorer 2 (Frontend Data Services, State, & Utilities)**:
  - Scope: `frontend/src/services/api.ts`, `frontend/src/utils/mockData.ts`, `frontend/src/utils/replayState.ts`, hooks (`useConvectNowData`), types, and resolving git merge conflict markers.
- **Explorer 3 (Backend API, Data Pipeline, Adapters, & Models)**:
  - Scope: `backend/api/`, `backend/data/`, `backend/models/`, `backend/core/`, synthetic generators vs live `DataSourceManager`, IMD/MOSDAC feeds, and endpoints.

### Phase 1: Implementation & Replacement
- Synthesize audit findings from Explorers.
- Dispatch Worker(s) to:
  1. Fix git merge conflict markers in `App.tsx`, `api.ts`, `replayState.ts` to ensure clean compilation.
  2. Eradicate all `Math.random()` simulation loops, mock constants, and fake AWS sensor readings across frontend components.
  3. Wire active components to live data feeds/hooks (`useConvectNowData`, real IMD/MOSDAC variables).
  4. Simplify or disable unsupported visual simulations (e.g., vertical hail cross-section).
  5. Ensure backend data sources cleanly pass real data or clearly labeled ground-truth replay.
  6. Run `npm run build` (`tsc -b && vite build`) and backend tests.

### Phase 2: Independent Review, Adversarial Challenge, & Forensic Audit
- Dispatch Reviewers to check code compliance, build cleanliness, and acceptance criteria.
- Dispatch Challengers to grep and stress-test for residual mock patterns (`Math.random`, `mock`, `fake`, `dummy`, `synthetic`).
- Dispatch Forensic Auditor for integrity check (no hardcoded test hacks, no facade logic).

### Phase 3: Final Report & Completion
- Worker generates the final objective markdown report (`MOCK_DATA_AUDIT_REPORT.md`) in project root.
- Verify all acceptance criteria are met.
- Notify the parent Sentinel with detailed findings and completion handoff.
