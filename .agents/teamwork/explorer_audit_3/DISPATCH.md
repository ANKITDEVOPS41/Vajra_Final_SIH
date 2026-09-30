# DISPATCH: Explorer Audit 3 (Backend API, Data Pipeline, Adapters, & Models)

## Assigned Scope
Line-by-line granular audit of backend data adapters, API endpoints, DataSourceManager, synthetic generators vs live IMD/MOSDAC feeds, and ground truth definitions.

## Key Files to Inspect
- `/Users/gauravkumarnayak/Desktop/convect/backend/data/` (adapters for MOSDAC radar, INSAT satellite, Bhuvan lightning, IMD AWS, synthetic.py, etc.)
- `/Users/gauravkumarnayak/Desktop/convect/backend/api/` (main.py, WebSocket `/ws/live`, REST endpoints)
- `/Users/gauravkumarnayak/Desktop/convect/backend/models/` (convectnet.py)
- Any `DataSourceManager` or live stream providers.
- Identify how real live data flows vs synthetic fallbacks, verify historical ground-truth replay (June 16–17, 2022 Cherrapunji) vs random simulation, and check backend test suite.

## Output Requirements
Produce a comprehensive 5-component handoff report at:
`/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_audit_3/handoff.md`
