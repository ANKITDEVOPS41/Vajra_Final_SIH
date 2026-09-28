# ConvectNow: Master Architecture & Implementation Plan (SIH PS-26084)

## 1. Core Objective & Operational Envelope
*   **Target:** Real-time convective-scale nowcasting (0–6 hour horizon) for Thunderstorms, Hail, and Cloudbursts.
*   **Resolution:** 1–3 km spatial resolution (internal 1 km analysis grid, 3 km operational blocks).
*   **Domain:** Northeast India (Sohra/Cherrapunji-centered).
*   **Multi-Source Fusion:** DWR Radar + INSAT-3D/3DR + Lightning + AWS/NWP.

## 2. Grid Architecture
*   **Grid A (AI Analysis):** 1 km × 1 km.
*   **Grid B (Operational View):** 3 km × 3 km (comprising nine 1-km cells).
*   **Cell Schema:** Handles unpredictable data availability using `null` values and `[value, mask]` tensors to prevent pipeline failure when a specific feed drops.

## 3. Data Ingestion & Future-Proofing
**Strict Rule:** No hardcoded source logic (e.g., `if source == "MOSDAC"`).
*   **DataSourceAdapter Pattern:**
    *   `RadarAdapter` (IMD, MOSDAC, NEXRAD)
    *   `SatelliteAdapter` (INSAT TIR, RapidScan)
    *   `LightningAdapter` (NRSC, ILDN, IMD)
    *   `SurfaceAdapter` / `NWPAdapter`
*   **Separation of Data vs. Labels:** Input streams (Radar, Sat, etc.) are strictly separated from Ground-Truth observations (Hail reports, rain gauges) to prevent target leakage. IMD nowcasts are used as benchmarks, not model inputs.

## 4. The 5-Stage Hybrid AI Pipeline
Do not use a single "giant LSTM" for a 6-hour forecast. Use a physics-guided hybrid pipeline:
1.  **Storm Detection:** Radar reflectivity thresholding & morphology -> Connected storm cells.
2.  **Storm Tracking:** Optical flow + Kalman association -> Motion, growth, merging.
3.  **Early Convective Initiation (CI):** Fuses radar growth, IR cooling, lightning trends, and CAPE/CIN -> CI probability field.
4.  **0–60 Minute Radar Nowcast:** ConvLSTM / U-Net -> +10m, +20m, ... +60m reflectivity fields.
5.  **1–6 Hour Evolution Fusion:** Fuses storm state, trajectory, satellite, lightning, and NWP fields -> Evolves the storm probabilities up to 6 hours.

## 5. Hazard Prediction Output
Discrete probabilistic outputs + uncertainty bands for:
*   Lightning strike density
*   Hail probability & size
*   Downburst velocity / severe gust
*   Cloudburst probability / threshold exceedance

## 6. Frontend / WebGIS (React + OpenLayers)
*   **Tech Stack:** React + OpenLayers (OGC compliant). Do not use iframes of government sites.
*   **Layers:** Bhuvan WMS (Base), Raster tiles (Radar/Sat/AI fields), Vector GeoJSON (Cells, Tracks, ETA polygons).
*   **Time Slider:** Displays `NOW` -> `+15m` ... -> `+6h` with expanding uncertainty cones.
*   **Click-to-Inspect:** Clicking a 3x3 km block reveals the 9-cell local analysis, exposing the raw observations, AI hazard probabilities, ETA, and Data Quality/Latency metrics.

## 7. Immediate Backend Implementation (The 5 Core Contracts)
Before training any AI, implement these 5 Python contracts to cement the adapter pattern:
1.  `SourceAdapter`
2.  `CommonObservationSchema`
3.  `GridCellSchema`
4.  `FeatureTensorSchema`
5.  `ForecastOutputSchema`

## 8. Current Research Hurdle: The "One Real Event" Test
**Mandatory Checkpoint:** Find and verify one real historical Northeast India convective event with synchronized overlapping data:
*   DWR Radar sequence (Cherrapunji)
*   INSAT-3DR time series
*   Lightning strikes
*   AWS / NWP data

*Candidates:*
*   Event 1: June 16–17, 2022 (Cherrapunji record cloudburst, 972mm/24h)
*   Event 2: May 5, 2024 (Meghalaya severe cyclonic/hail storm)
*   Event 3: March 31–April 1, 2024 (Assam pre-monsoon Nor'wester)

**Status:** Research ~85% complete. Awaiting validation of data availability for Event 1/2 before locking the 20-input feature matrix and proceeding to codebase implementation.
