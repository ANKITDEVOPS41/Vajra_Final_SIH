# Synthesis: Milestone 1 — Model Bypass Removal & PyTorch Fallback Re-wiring

## 1. Consensus Findings
1. **Monkey-Patch Elimination**:
   - `backend/api/main.py:102` contains `ConvectNetInference.run = _run_model`.
   - Zero tests and zero external modules depend on this monkey patch. It can be safely removed.
2. **Model Loading & Checkpoint Prioritization**:
   - `backend/models/convectnet_st_nowcaster.pt` (11 MB) is present and verified functional.
   - In `backend/models/inference.py`, `convectnet_st_nowcaster.pt` must be placed first in `default_candidates` so that `ConvectNetInference()` loads it by default.
3. **Native Inference & Radar Tensor Preprocessing**:
   - `ConvectNetInference` requires an input tensor of shape `(4, 12, 128, 128)` (C0=VIL, C1=reflectivity temporal trend, C2=core dBZ, C3=lightning density).
   - Implement `build_radar_tensor_from_cell(cell, lead_time_min)` to convert radar observations (from live IMD or historical cache) into the normalized 4-channel tensor.
   - Add `run_inference` method to `ConvectNetInference` (and alias `run = run_inference`).
   - Enhance `predict` output with sigmoid probabilities: `cloudburst_prob`, `downburst_prob`, `ci_prob`, `posh`, `mesh_mm`, `gust_kmh`.
4. **Re-wiring `_run_model` in `backend/api/main.py`**:
   - In `backend/api/main.py`, remove line 102.
   - Rewrite `_run_model` so that when `_model` is present, it constructs the radar tensor, calls `_model.run_inference(...)`, measures inference latency (`latency > 0`), and populates `ForecastOutputSchema` with genuine model hazard outputs.
   - In `get_grid_cell(lat, lon)`, map the PyTorch forecast back into `GridCellSchema`, preserving `synthetic_data = False`.
5. **Robust IMD Fallback in `data_source_manager.py`**:
   - Ensure that when IMD live adapters timeout, `data_mode` is set to `"historical_fallback"` and historical radar buffer data is returned and passed into the PyTorch model.
6. **Verification Requirements**:
   - `pytest` passes without monkey-patch.
   - Verification test for `/api/grid/25.2/91.7` confirms `latency > 0`, `synthetic_data == False`, and genuine model predictions.
   - `npm run build` succeeds with 0 errors.

## 2. File Ownership for Worker
- `backend/models/inference.py`
- `backend/api/main.py`
- `backend/data/data_source_manager.py`
- `backend/core/schemas.py` (if adding `synthetic_data: bool = False` and `inference_latency_ms: float = 0.0`)
- `tests/test_api_endpoints.py` (new test file to verify API endpoints, monkey-patch absence, and PyTorch latency)
- `tests/conftest.py` (if needed for package resolution)
