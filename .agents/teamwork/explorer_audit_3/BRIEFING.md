# BRIEFING — 2026-09-29T10:58:00Z

## Mission
Conduct a granular, line-by-line audit across backend data adapters, API endpoints, models, data pipeline, and tests in ConvectNow. Identify all synthetic generation, fake weather simulation loops, ungrounded random numbers, verify real live integrations vs synthetic fallbacks, verify deterministic June 16-17, 2022 Cherrapunji historical replay, and inspect ConvectNet inference & test suite.

## 🔒 My Identity
- Archetype: explorer
- Roles: Backend API, Data Pipeline, Adapters, & Models Auditor
- Working directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_audit_3
- Original parent: a263ece1-cadb-42d0-a27d-0772c30d684e
- Milestone: Audit Context & Eradication Strategy

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Audit line-by-line using audit-context-building skill methodologies
- Deliver a comprehensive 5-component handoff report at `.agents/teamwork/explorer_audit_3/handoff.md`

## Current Parent
- Conversation ID: a263ece1-cadb-42d0-a27d-0772c30d684e
- Updated: 2026-09-29T10:58:00Z

## Investigation State
- **Explored paths**: Initial orientation started.
- **Key findings**: [TBD]
- **Unexplored areas**: `backend/data/`, `backend/api/`, `backend/models/`, `backend/core/`, `tests/`

## Key Decisions Made
- Systematic exploration plan:
  1. Inspect directory structure of backend and tests.
  2. Granular audit of `backend/data/` (adapters, synthetic.py, grid.py, DataSourceManager).
  3. Granular audit of `backend/api/` (main.py, WebSocket, REST endpoints, Replay).
  4. Granular audit of `backend/models/convectnet.py` (physics formulas, hazard thresholds, tensor pipelines).
  5. Granular audit of `tests/` and execution of pytest to understand current pass/fail state and test dependencies.
  6. Synthesize findings into `handoff.md` and report to parent.

## Artifact Index
- `.agents/teamwork/explorer_audit_3/DISPATCH.md` — Assignment context
- `.agents/teamwork/explorer_audit_3/progress.md` — Liveness heartbeat
- `.agents/teamwork/explorer_audit_3/handoff.md` — Final 5-component audit report
