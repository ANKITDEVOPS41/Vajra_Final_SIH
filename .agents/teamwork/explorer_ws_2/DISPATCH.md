# Dispatch: Explorer 2 (Frontend Hook & Reconnection Architecture)

Working directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_ws_2/
Project root: /Users/gauravkumarnayak/Desktop/convect

Authoritative original request:
/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md

Milestone plan:
/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_5/plan.md

Objective:
Investigate frontend/src/hooks/useConvectNowData.ts and related frontend files.
- Understand the existing HTTP polling logic (setInterval), what state variables are managed, and how components consume them.
- Map the state fields to the 4 domains (storm cells, AWS stations, grid hazards, evaluation metrics).
- Detail the rewrite of useConvectNowData.ts to establish a persistent WebSocket connection to ws://localhost:8000/ws/live.
- Propose robust auto-reconnection logic using exponential backoff (e.g. initial delay 1s, doubling up to max delay, jitter/resets on successful open).
- Ensure state updates reactively without any residual interval-based HTTP polling.


## 2026-09-30T00:32:38Z
You are Explorer 2. Your working directory is /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_ws_2/.
You MUST read the authoritative original request at /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read your task dispatch at /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_ws_2/DISPATCH.md and the milestone plan at /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_5/plan.md.

Task:
Investigate frontend/src/hooks/useConvectNowData.ts and related frontend files in /Users/gauravkumarnayak/Desktop/convect/frontend.
- Understand the existing HTTP polling logic (setInterval), what state variables are managed, and how components consume them.
- Map the state fields to the 4 domains (storm cells, AWS stations, grid hazards, evaluation metrics).
- Detail the rewrite of useConvectNowData.ts to establish a persistent WebSocket connection to ws://localhost:8000/ws/live.
- Propose robust auto-reconnection logic using exponential backoff (e.g. initial delay 1s, doubling up to max delay, jitter/resets on successful open).
- Ensure state updates reactively without any residual interval-based HTTP polling.
- Document your findings in /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_ws_2/handoff.md.

When finished, send a message to parent notifying that you have written handoff.md.
