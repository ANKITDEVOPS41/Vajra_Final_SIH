## 2026-09-29T16:36:22Z

You are the Project Orchestrator for this milestone.
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_4/
Project root: /Users/gauravkumarnayak/Desktop/convect
Original Request: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md

Please read the latest section of ORIGINAL_REQUEST.md (under ## 2026-09-29T16:34:52Z):

Goal: Fix a critical routing bypass in `backend/api/main.py` where the PyTorch deep learning model (`convectnet_st_nowcaster.pt`) is loaded but never executed due to a monkey-patch, and to ensure the IMD API timeout gracefully falls back to processing historical data through the *real* PyTorch model.

Requirements:
### R1. Remove the Model Bypass
In `backend/api/main.py`, remove the monkey-patch (`ConvectNetInference.run = _run_model`) that currently hijacks the inference engine.

### R2. Re-wire the Inference Engine
Rewrite the `_run_model` function in `api/main.py` to correctly invoke the loaded PyTorch model (`_model.run_inference(...)`) whenever `_model` is instantiated, instead of returning the synthetic physical derivation.

### R3. Robust IMD Fallback
When the IMD API adapters fail or timeout (which they currently are), ensure the `historical_fallback` radar data is passed *into* the PyTorch model for inference. The model must still generate the hazard probabilities mathematically, preserving the authenticity of the AI, even when using the offline radar buffer.

## Acceptance Criteria
### Verification
- The codebase builds successfully (`npm run build`) with no TypeScript errors.
- Backend tests (`pytest`) pass successfully without the monkey-patch.
- A manual or automated test of the `/api/grid/25.2/91.7` endpoint confirms that the PyTorch `.pt` file is actively evaluated (inference latency > 0) rather than instantly bypassed.
- The `synthetic_data` flag in the API response remains `False`.
