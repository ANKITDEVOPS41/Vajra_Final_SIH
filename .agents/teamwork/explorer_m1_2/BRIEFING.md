# BRIEFING — 2026-09-29T16:50:00Z

## Mission
Investigate IMD data adapters and fallback handling in `backend/data/data_source_manager.py` and `backend/api/main.py` for R3: Robust IMD Fallback - ensure `historical_fallback` radar data is passed into PyTorch model for inference, hazard probabilities are mathematically derived by the PyTorch model, and `synthetic_data` remains `False`.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_m1_2
- Original parent: a8920ff5-31ff-443c-a7a0-da6294e0163d
- Milestone: M1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Produce structured report in handoff.md
- Verify all observations directly in code
- Focus on R3: Robust IMD Fallback, PyTorch model feeding, and `synthetic_data: False`

## Current Parent
- Conversation ID: a8920ff5-31ff-443c-a7a0-da6294e0163d
- Updated: 2026-09-29T16:37:33Z

## Investigation State
- **Explored paths**:
  - `backend/data/data_source_manager.py`: Identified `IMDLiveAdapter` timeouts, fallback to `get_historical_grid_cell`, and data mode tagging.
  - `backend/api/main.py`: Traced `_radar_adapter.fetch_latest()`, `_get_grid_cell()`, `_run_model()`, monkey-patch `ConvectNetInference.run = _run_model`, and API endpoints `/api/grid/{lat}/{lon}`, `/api/status`, `/api/evaluation_report`.
  - `backend/models/inference.py`: Verified `ConvectNetInference`, checkpoint discovery (`convectnet_st_nowcaster.pt`), and `predict()` tensor requirements `(4, 12, 128, 128)`.
  - `backend/models/convectnet.py`: Inspected architecture, CBAM, ConvLSTM, hazard heads (`hail`, `cloudburst`, `downburst`, `ci`).
  - `backend/data/historical_cache.py`: Inspected `HISTORICAL_EVENTS` radar moments and `get_historical_grid_cell` physical formulas.
  - `backend/data/historical_engine.py`: Examined spatial grid generation and storm cell GeoJSON feature creation.
- **Key findings**:
  - `data_source_manager.py` defines IMD adapter timeout (5.0s) and falls back to `historical_cache`. When IMD fails (as confirmed via direct test failing DNS/network), `data_mode()` in `data_source_manager.py` still returned `"imd_live"` because `IMD_API_KEY` was in `.env`. Must tag fallback mode correctly as `"historical_fallback"`.
  - The PyTorch model `convectnet_st_nowcaster.pt` (10 MB) is completely bypassed because `_run_model` only called `synthetic_engine.generate_synthetic_forecast`.
  - Input tensor shape `(4, 12, 128, 128)` can be directly constructed from `cell` radar attributes (`vil`, `reflectivity`, `flash_density`, `ir_bt`) using Gaussian spatial core and temporal progression.
  - `synthetic_data` flag is consistently maintained as `False` in `/api/status`, `/api/evaluation_report`, and schemas.
- **Unexplored areas**: None within the scope of R3 and backend inference fallback.

## Key Decisions Made
- Confirmed `convectnet_st_nowcaster.pt` evaluates in ~177ms on CPU/MPS and successfully produces `posh`, `mesh_mm`, `ci_prob`, `rain_rate_mmh`, `gust_kmh`.
- Designed `build_radar_tensor()` and `run_inference()` contract for `ConvectNetInference` and `_run_model`.
- Documented full implementation specification and verification steps in `handoff.md`.

## Artifact Index
- DISPATCH.md — Task instructions and updates
- BRIEFING.md — Situational awareness and working memory
- progress.md — Liveness heartbeat
- handoff.md — Final investigation report
