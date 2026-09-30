# Plan — ConvectNow Live Telemetry WebSocket Refactor

## Objective
Refactor the ConvectNow Python backend to bundle all real-time telemetry (Storms, AWS, Grid, Metrics) into a single WebSocket payload at `/ws/live`, and update the React frontend (`useConvectNowData.ts`) to consume this WebSocket stream instead of HTTP polling, with exponential backoff auto-reconnect.

## Requirements
1. **R1. Unified Backend WebSocket Payload**:
   - Update `_push_live_update` in `backend/api/main.py` to aggregate data from all four domains:
     - storm cells
     - AWS stations
     - grid hazards
     - evaluation metrics
   - Bundle into a single dictionary payload before broadcasting over `/ws/live`.
2. **R2. Frontend WebSocket Integration & Resilience**:
   - Rewrite `useConvectNowData` hook in `frontend/src/hooks/useConvectNowData.ts` to establish persistent WebSocket connection to `ws://localhost:8000/ws/live`.
   - Remove existing `setInterval` HTTP polling logic and update state reactively.
   - Implement auto-reconnection with exponential backoff so the dashboard recovers automatically if Python server restarts.
3. **Acceptance Criteria**:
   - Backend tests and server start without syntax errors.
   - Frontend builds successfully (`npm run build`) with zero TypeScript errors.
   - Browser network confirms WebSocket connection to `/ws/live` and no repetitive `GET` polling requests every 60 seconds.
   - Auto-reconnect behavior works on server restart.

## Execution Pattern: Iteration Loop 2B
- **Phase A: Exploration (3 Explorers in parallel)**:
  - Explorer 1: Backend WebSocket architecture & payload format (`backend/api/main.py`, models, existing `/ws/live`, telemetry push logic).
  - Explorer 2: Frontend hook architecture (`frontend/src/hooks/useConvectNowData.ts`, state consumers, types, reconnection logic).
  - Explorer 3: Test suite & verification procedures (backend pytest/unit tests, frontend build/test commands, verification script).
- **Phase B: Implementation (1 Worker)**:
  - Implement backend unified dictionary broadcasting in `backend/api/main.py`.
  - Refactor `useConvectNowData.ts` to connect to `ws://localhost:8000/ws/live` with exponential backoff and no HTTP polling.
  - Run backend tests and frontend `npm run build`.
- **Phase C: Review & Adversarial Verification**:
  - Reviewer 1 & Reviewer 2: Code quality, typing, correctness, and edge-case handling.
  - Test verification: Verify WebSocket payload handling, connection resilience, reconnect with exponential backoff, zero polling GETs.
- **Phase D: Gate Assessment**:
  - Collect reports, check criteria, record in `GATE_STATUS.md`.
