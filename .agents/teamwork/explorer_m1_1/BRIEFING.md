# BRIEFING — 2026-09-29T16:47:00Z

## Mission
Investigate `backend/api/main.py` and `backend/models/inference.py` to design the exact fix for removing monkey-patch `ConvectNetInference.run = _run_model` (R1) and re-wiring `_run_model` to invoke the loaded PyTorch model (`_model.run_inference(...)`) whenever `_model` is instantiated (R2).

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, analysis, synthesis
- Working directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1
- Original parent: bea71b89-c025-4ee6-92fd-0de890621cb7
- Milestone: M1 - Architecture & Pipeline Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write only to own folder /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_1/
- No source code edits

## Current Parent
- Conversation ID: a8920ff5-31ff-443c-a7a0-da6294e0163d
- Updated: 2026-09-29T16:47:00Z

## Investigation State
- **Explored paths**:
  - `backend/api/main.py`: Line 102 (`ConvectNetInference.run = _run_model`), lines 79–98 (`_run_model` bypass calling `synthetic_engine`), lines 260–282 (`/api/grid/{lat}/{lon}`), line 324 (`get_forecast`), line 342 (`get_hazards`), line 408 (`get_replay_sequence`), line 461 (`_push_live_update`).
  - `backend/models/inference.py`: `ConvectNetInference` class, model initialization, checkpoint candidates (`convectnet_st_nowcaster.pt` vs `convectnet_production.pth`), `predict(x: np.ndarray)` API, tensor dimensions `(4, 12, 128, 128)`.
  - `backend/models/convectnet.py`: Multi-task heads: `hail` (POSH, MESH), `cloudburst` (flag, rain_rate), `downburst` (gust), `ci` (probability), `latent` (128d), `spatial_nowcast`.
  - `backend/core/schemas.py`: `ForecastOutputSchema`, `GridCellSchema`, `CommonObservationSchema`.
  - `tests/`: Tested pytest suite (37 tests currently passing in adapters, grid, meteorology, schemas), verified test failure mechanism in `test_convectnet.py` due to module path prefix `convectnow`.
  - `frontend/`: Verified `npm run build` succeeds cleanly in 2.95s.
- **Key findings**:
  - Confirmed monkey-patch at `backend/api/main.py:102` (`ConvectNetInference.run = _run_model`) which hijacks the inference engine class.
  - Confirmed `_run_model` at lines 79-98 completely bypassed `_model`, generating static linear synthetic values via `synthetic_engine.generate_synthetic_forecast`.
  - Confirmed `ConvectNetInference` in `inference.py` currently lacks `run_inference` and `run` methods. Adding `run_inference(...) -> ForecastOutputSchema` and aliasing `run = run_inference` on `ConvectNetInference` gives the class native capability without monkey-patching.
  - Prioritizing `convectnet_st_nowcaster.pt` (11 MB checkpoint) in `default_candidates` ensures the required model checkpoint is loaded by default.
  - Tested tensor generation from `GridCellSchema` into `(4, 12, 128, 128)` and executed live PyTorch inference on MPS/CPU, measuring ~176ms warm latency (> 0 ms confirmed).
- **Unexplored areas**: None for M1 scope. Full evidence chain and exact proposed diffs established.

## Key Decisions Made
- Recommend removing `ConvectNetInference.run = _run_model` from `backend/api/main.py`.
- Recommend implementing `run_inference` directly on `ConvectNetInference` in `backend/models/inference.py` and setting `run = run_inference` as a class method/alias.
- Recommend re-writing `_run_model` in `backend/api/main.py` to invoke `_model.run_inference(cell=cell, lead_time_min=lt)`.
- Recommend lazy initialization `_get_or_init_model()` in `backend/api/main.py` so test clients outside ASGI lifespan can evaluate the PyTorch model without error.

## Artifact Index
- DISPATCH.md — Task instructions from orchestrator
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Comprehensive handoff report
