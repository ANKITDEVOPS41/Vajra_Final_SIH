# Explorer 1 Dispatch: Main API Model Bypass Removal & Inference Engine Re-wiring

## Context
Working Directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1/
Project Root: /Users/gauravkumarnayak/Desktop/convect
Original Request: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md
Scope: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_4/SCOPE.md

## Mission
Investigate `backend/api/main.py` and `backend/models/inference.py` to design the exact fix for:
1. R1: Removing the monkey-patch (`ConvectNetInference.run = _run_model`).
2. R2: Re-writing `_run_model` to invoke the loaded PyTorch model (`_model.run_inference(...)` or genuine inference call) whenever `_model` is instantiated, rather than returning synthetic physical derivation.

## Required Investigation
- Inspect `backend/api/main.py` where `_model` is initialized and where `ConvectNetInference.run = _run_model` is executed.
- Inspect `backend/models/inference.py` to see the structure and API of `ConvectNetInference`:
  - What methods are available (`run`, `run_inference`, `predict`, etc.)?
  - What inputs does `_model` expect (shape, type, normalization, tensor device)?
  - What does it return?
- Detail the exact code changes needed in `backend/api/main.py` to eliminate the monkey patch and execute real PyTorch inference.

## Output
Write your findings and recommendation to `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1/handoff.md`.

## 2026-09-29T16:37:33Z
You are Explorer 1 on the team.
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1/
Project root: /Users/gauravkumarnayak/Desktop/convect
Original Request path: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md
Scope path: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_4/SCOPE.md
Your dispatch instructions: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1/DISPATCH.md

You MUST read ORIGINAL_REQUEST.md and DISPATCH.md before starting your investigation.
Focus on:
1. R1: In `backend/api/main.py`, remove the monkey-patch (`ConvectNetInference.run = _run_model`).
2. R2: Re-write `_run_model` to invoke the loaded PyTorch model (`_model.run_inference(...)`) whenever `_model` is instantiated, rather than returning synthetic physical derivation.
Inspect `backend/api/main.py` and `backend/models/inference.py` to examine the API of `ConvectNetInference`, required input shapes/tensors, and output formats.

Write your complete findings and implementation plan to /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1/handoff.md and report back when finished.
