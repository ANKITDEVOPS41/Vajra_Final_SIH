# BRIEFING — 2026-09-30T00:29:57Z

## Mission
Refactor the ConvectNow Python backend to bundle all real-time telemetry (Storms, AWS, Grid, Metrics) into a single WebSocket payload at `/ws/live`, and update the React frontend (`useConvectNowData.ts`) to consume this WebSocket stream instead of HTTP polling with auto-reconnection and exponential backoff.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/
- Orchestrator: TBD
- Victory Auditor: to be spawned on victory claim
- Active Orchestrator ID: c60a6f7b-5ec2-495f-83dc-ceeda79e149c
- Active Victory Auditor ID: b26c0267-d144-4a63-a061-b5b50751a3cf
- Progress Cron Task: task-16
- Liveness Cron Task: task-18
- Route: General (teamwork_preview_orchestrator)
- Active Agent Type: teamwork_preview_swe
- Route Decision: SWE Light (teamwork_preview_swe)
- Active SWE Directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/swe_2/
- Active Orchestrator Directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_5/
- Fallback Route: General (teamwork_preview_orchestrator)
- Current Active Orchestrator ID: d03d3808-e9d4-4d21-a073-06c9bbb883a5
- Current Progress Cron Task: task-34
- Current Liveness Cron Task: task-36

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Must not write code, analyze problems, or make technical decisions
- Keep context ultra-light
- On victory claim: spawn teamwork_preview_victory_auditor (BLOCKING)

## User Context
- **Last user request**: Refactor ConvectNow backend to bundle all real-time telemetry into `/ws/live` WebSocket and update React frontend (`useConvectNowData.ts`) to consume WebSocket stream with auto-reconnect.
- **Pending clarifications**: none
- **Delivered results**: none yet

## Project Status
- **Phase**: in progress

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md — Authoritative record of user intent
