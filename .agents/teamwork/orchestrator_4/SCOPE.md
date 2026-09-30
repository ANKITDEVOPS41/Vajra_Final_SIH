# Scope: Fix PyTorch Model Bypass & IMD Fallback Re-wiring

## Architecture
- `backend/api/main.py`: FastAPI application hosting endpoints including `/api/grid/{lat}/{lon}`, managing `_model` lifecycle, `_run_model`, and fallback execution.
- `backend/models/inference.py`: `ConvectNetInference` class encapsulating the PyTorch model (`convectnet_st_nowcaster.pt`) and tensor preprocessing/inference routines.
- `backend/services/data_source_manager.py`: Manages data feeds, IMD adapter timeouts, and `historical_fallback` radar buffers.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Remove Model Bypass | Remove monkey-patch `ConvectNetInference.run = _run_model` in `backend/api/main.py` | M1 | ORIGINAL_REQUEST.md §R1 |
| 2 | Re-wire Inference Engine | Rewrite `_run_model` in `backend/api/main.py` to invoke loaded PyTorch model `_model.run_inference(...)` (or corresponding method) when `_model` is instantiated | M1 | ORIGINAL_REQUEST.md §R2 |
| 3 | Robust IMD Fallback | Pass `historical_fallback` radar buffer into PyTorch model so probabilities are mathematically derived by the model when IMD times out | M1 | ORIGINAL_REQUEST.md §R3 |
| 4 | Verification | Ensure `npm run build` succeeds, `pytest` succeeds without monkey-patch, `/api/grid/25.2/91.7` evaluates PyTorch model with latency > 0, `synthetic_data` remains `False` | M1 | ORIGINAL_REQUEST.md §Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Model Bypass Removal & PyTorch Fallback | R1, R2, R3, Verification | none | IN_PROGRESS |

## Interface Contracts
### `backend/api/main.py` ↔ `backend/models/inference.py`
- Calls to `_model` must use the genuine `ConvectNetInference` inference API without monkey-patching `run`.
- Radar tensor data (live or `historical_fallback`) must be converted to the tensor format expected by `ConvectNetInference`.
- Response format for `/api/grid/{lat}/{lon}` must maintain `synthetic_data: False` and contain genuine model hazard probabilities.
