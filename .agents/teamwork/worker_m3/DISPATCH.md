# Dispatch for Worker M3: Universal Visual Intelligence & Decision Key & Mission Briefing Modal

You are Worker M3 (teamwork_preview_worker).
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_m3/
You must read ORIGINAL_REQUEST.md: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md
Also read:
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_3/handoff.md (contains complete content matrix and architectural specification)
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_1/PROJECT.md
- /Users/gauravkumarnayak/Desktop/convect/frontend/scripts/verify-e2e.mjs (contains exact test checks for Features 12 to 21)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You own and may create/edit:
- `frontend/src/types/visualIntel.ts`
- `frontend/src/config/visualIntelConfig.ts`
- `frontend/src/components/VisualIntelDecisionKey.tsx`
- `frontend/src/components/MissionBriefingModal.tsx`
- `frontend/src/App.tsx` (mount global Mission Briefing modal and header button)
- Mount `<VisualIntelDecisionKey page="<page_id>" />` in each of the 7 page components:
  1. `frontend/src/components/HazardDashboard.tsx` (`page="hazard"`)
  2. `frontend/src/components/TacticalOperationsDashboard.tsx` (`page="tactical"`)
  3. `frontend/src/components/HyperlocalTwinMap.tsx` (`page="hyperlocal"`)
  4. `frontend/src/components/InferencePipelineView.tsx` (`page="inference"`)
  5. `frontend/src/components/HistoricalReplayView.tsx` (`page="replay"`)
  6. `frontend/src/components/ExplainableGridTracker.tsx` (`page="grid"`)
  7. `frontend/src/components/MicroburstSimulationView.tsx` (`page="microburst"`)

## Requirements
1. **Types & Config (`types/visualIntel.ts` & `config/visualIntelConfig.ts`)**:
   - Define data model for the 3 pillars:
     - 👁️ What You Are Seeing (sensor, physical parameter, spatial domain)
     - 📊 How to Decode Visuals (colors, symbols, units, thresholds)
     - ⚡ Actionable Decision (runway go-around, ground stop, NDMA CAP siren dispatch, urban drainage pre-activation, etc.)
   - Populate comprehensive metadata for all 7 platform pages per the matrix in Explorer 3's handoff.
2. **VisualIntelDecisionKey Component (`components/VisualIntelDecisionKey.tsx`)**:
   - Provide 3 operational states:
     - **Minimized 1-Line Tactical Ticker**: Non-intrusive floating pill docked at bottom-right with live operational status, primary metric, and quick-expand button.
     - **Expanded Glass Card**: High-contrast, beautifully styled card detailing the 3 pillars with clear visual hierarchy and generous spacing.
     - Button to open the full **Mission Briefing Modal**.
   - Keyboard accessibility: Pressing `Escape` collapses; pressing `M` or `?` toggles the Mission Briefing modal.
3. **MissionBriefingModal Component (`components/MissionBriefingModal.tsx`)**:
   - Interactive dialog accessible from any view (and global navbar button in `App.tsx`).
   - Enables duty forecasters, ATC officers, and evaluators to browse briefings for all 7 subsystems, standard operating procedures (SOP checklists), and MoES PS-26084 context in one cohesive modal.
4. **Mounting across All 7 Pages & App Shell**:
   - Mount `<VisualIntelDecisionKey page="..." />` in each of the 7 page components.
   - Add a sleek "Mission Briefing" button in the global header in `App.tsx` with hotkey `M` listener.
5. **Verification**:
   - Run `cd /Users/gauravkumarnayak/Desktop/convect/frontend && npm run build` (0 TypeScript/ESLint errors).
   - Run `npm run test:e2e` and verify that ALL 195 assertions pass (100% across Tiers 1, 2, 3, and 4).
   - Deliver handoff report with passing build output to `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_m3/handoff.md`.

Send a message back to the orchestrator when complete.
