# BRIEFING — 2026-09-29T10:51:00Z

## Mission
Conduct a comprehensive, line-by-line audit of the entire ConvectNow codebase to identify and replace any remaining instances of mock data, synthetic generation, simulation loops, or hardcoded fallbacks with real IMD/MOSDAC live integrations or explicitly defined historical ground-truth data, producing a final "Proper Report" of all findings and replacements.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_2
- Original parent: parent
- Original parent conversation ID: 05bedcb5-608a-4ccc-9f37-c1e5ab5be784

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: /Users/gauravkumarnayak/Desktop/convect/PROJECT.md
1. **Decompose**: Decompose the codebase audit, mock eradication/replacement, unsupported simulation handling, build verification, and final report generation into milestone tracks.
2. **Dispatch & Execute**: Direct/Delegated iteration loop with Explorers, Workers, Reviewers, Challengers, Auditors.
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Threshold at 16 spawns.
- **Work items**:
  1. Deep Codebase Audit across Frontend & Backend [in-progress]
  2. Synthesize Findings & Plan Replacements [pending]
  3. Implement Replacements, Disabling Unsupported Sims, Clean Build [pending]
  4. Multi-agent Review, Adversarial Challenge & Forensic Audit [pending]
  5. Produce Final Audit Report in Root & Deliver to Sentinel [pending]
- **Current phase**: 0 (Exploration / Audit)
- **Current focus**: Granular Codebase Audit across 3 parallel Explorers

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/teamwork/ folder.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Always include path to ORIGINAL_REQUEST.md in every dispatch.
- Audit verdict is a binary veto.

## Current Parent
- Conversation ID: 05bedcb5-608a-4ccc-9f37-c1e5ab5be784
- Updated: not yet

## Key Decisions Made
- Dispatched 3 parallel Explorers using audit-context-building methodology:
  1. Frontend UI & Visual Simulations (components, canvas, SVG, Math.random)
  2. Frontend Services, State, & Utilities (api.ts, mockData.ts, hooks, conflict markers)
  3. Backend API, Adapters, & Data Pipeline (FastAPI, synthetic generator vs live DataSourceManager, schemas)

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_audit_1 | teamwork_preview_explorer | Frontend UI & Visual Simulations Audit | in-progress | 01b4a164-126e-4398-a185-e4d39ef340f8 |
| explorer_audit_2 | teamwork_preview_explorer | Frontend Data Hooks & State Audit | in-progress | 678ff611-1922-46c2-88ba-7cf6d507eae1 |
| explorer_audit_3 | teamwork_preview_explorer | Backend Pipeline & Live DataSource Audit | in-progress | e606c7b8-e658-49ce-a42a-623042b7c758 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 01b4a164-126e-4398-a185-e4d39ef340f8, 678ff611-1922-46c2-88ba-7cf6d507eae1, e606c7b8-e658-49ce-a42a-623042b7c758
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-32
- Safety timer: none

## Artifact Index
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md — Authoritative record of user intent
- /Users/gauravkumarnayak/Desktop/convect/PROJECT.md — Global architecture & feature inventory
