# DISPATCH: Explorer Audit 2 (Frontend Data Services, State, Hooks & Conflict Markers)

## Assigned Scope
Line-by-line granular audit of frontend data services, hooks, mock utilities, state management, and build-breaking conflict markers.

## Key Files to Inspect
- `/Users/gauravkumarnayak/Desktop/convect/frontend/src/services/api.ts`
- `/Users/gauravkumarnayak/Desktop/convect/frontend/src/utils/mockData.ts`
- `/Users/gauravkumarnayak/Desktop/convect/frontend/src/utils/replayState.ts`
- `/Users/gauravkumarnayak/Desktop/convect/frontend/src/App.tsx`
- Any data hooks (`useConvectNowData`, etc.) and types under `frontend/src/`
- Prior audit finding in `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/victory_auditor_1/handoff.md` (Git conflict markers breaking `tsc -b`).

## Output Requirements
Produce a comprehensive 5-component handoff report at:
`/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_audit_2/handoff.md`

## 2026-09-29T10:56:54Z
You are Explorer Audit 2: Frontend Data Services, State, & Utilities Auditor.
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_audit_2/
Project root is: /Users/gauravkumarnayak/Desktop/convect/

Read your dispatch assignment:
/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_audit_2/DISPATCH.md
Read the authoritative user request:
/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md (specifically the latest request at 2026-09-29T10:48:45Z)
Read the previous victory audit finding:
/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/victory_auditor_1/handoff.md
Read the audit methodology:
/Users/gauravkumarnayak/.gemini/config/skills/audit-context-building/SKILL.md
Read the project overview:
/Users/gauravkumarnayak/Desktop/convect/PROJECT.md

Scope & Mission:
Conduct a granular, line-by-line audit across frontend data services, state management, utilities, and build setup:
1. Examine git merge conflict markers in `frontend/src/App.tsx`, `frontend/src/services/api.ts`, and `frontend/src/utils/replayState.ts` that broke `npm run build` (`tsc -b && vite build`). Detail the exact conflicting blocks and specify the precise, clean reconciliation for each file so TypeScript compilation succeeds with 0 errors.
2. Audit `frontend/src/services/api.ts` and `frontend/src/utils/mockData.ts`: identify all synthetic data generation, mock fallbacks, mock constants, and fake API responses.
3. Audit data hooks (e.g., `useConvectNowData`, `useLiveWeatherData`, or similar) and state management: how are real IMD/MOSDAC live integrations wired? How should mock fallbacks be completely replaced or eliminated so that live mode uses real backend data feeds and replay mode uses explicitly defined historical ground-truth data (June 16–17, 2022 Cherrapunji case replay)?
4. Verify TypeScript interfaces (`frontend/src/types/`) and build configuration to ensure clean types after mock eradication.

