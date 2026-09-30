## 2026-09-30T00:31:29Z
You are the Project Orchestrator (teamwork_preview_orchestrator).
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_5/
The project root directory is: /Users/gauravkumarnayak/Desktop/convect
The authoritative original request is documented in: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md

Task details:
This is a single self-contained fix; keep it small and focused. Refactor the ConvectNow Python backend to bundle all real-time telemetry (Storms, AWS, Grid, Metrics) into a single WebSocket payload at `/ws/live`, and update the React frontend (`useConvectNowData.ts`) to consume this WebSocket stream instead of HTTP polling.

Requirements:
### R1. Unified Backend WebSocket Payload
Update `_push_live_update` in `backend/api/main.py` to aggregate data from all four domains (storm cells, AWS stations, grid hazards, evaluation metrics) into a single dictionary payload before broadcasting.

### R2. Frontend WebSocket Integration & Resilience
Rewrite the `useConvectNowData` hook in `frontend/src/hooks/useConvectNowData.ts` to establish a persistent WebSocket connection to `ws://localhost:8000/ws/live`. Remove the existing `setInterval` HTTP polling logic and update state reactively. Implement auto-reconnection with exponential backoff so the dashboard recovers automatically if the Python server restarts.

Acceptance Criteria:
### Compilation & Build
- Backend tests and server start without syntax errors.
- Frontend builds successfully (`npm run build`) with zero TypeScript errors.

### Verification
- Confirm WebSocket connection to `/ws/live` and absence of repetitive `GET` polling requests every 60 seconds.
- Confirm auto-reconnect behavior on server restart.

Maintain your `plan.md`, `progress.md`, and subagent coordination inside your working directory (`/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_5/`). When all work is completed and verified, deliver your final report and notify the sentinel.
