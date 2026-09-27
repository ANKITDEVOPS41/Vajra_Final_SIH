# Project: ConvectNow (SIH PS-26084)
Real-Time 0–6 Hour Convective Nowcasting System for Northeast India (Sohra/Cherrapunji-centered, 1–3 km resolution)

## Architecture
ConvectNow couples multi-source Indian government remote sensing feeds (MOSDAC DWR Radar, MOSDAC INSAT-3D/3DR Satellite, Bhuvan Lightning Network, IMD Automatic Weather Stations) with a physics-guided AI model (ConvectNet) and an operational WebGIS dashboard.

- **Backend**: Python 3.14 / FastAPI / Pydantic v2 / NumPy / SciPy / PyTorch
  - Core Schemas (`convectnow/backend/core/schemas.py`)
  - Spatial Grid Indexing (`convectnow/backend/data/grid.py`)
  - Physically Grounded Synthetic Generator (`convectnow/backend/data/synthetic.py`)
  - Adapters (`convectnow/backend/data/adapters/`)
  - ConvectNet Inference (`convectnow/backend/models/convectnet.py`)
  - FastAPI GIS REST API & WebSocket (`convectnow/backend/api/main.py`)
- **Frontend**: React 19 / TypeScript / Vite / OpenLayers 10 (`ol@10.10.0`) / Tailwind CSS / Lucide React
  - OpenLayers 10 Map with 6 OGC Government Layers (`convectnow/frontend/src/components/MapView.tsx`)
  - Top Operational Bar with dual UTC/IST clocks, live/synthetic indicator, and Replay Toggle (`TopOperationalBar.tsx`)
  - 5-Indicator Hazard Bar: CI, Lightning, Hail, Downburst, Cloudburst (`HazardBar.tsx`)
  - 0–6h Forecast Time Slider: NOW to +6h with playback controls (`ForecastTimeSlider.tsx`)
  - Click-to-Inspect 1 km Cell Sidebar (`ClickInspectPanel.tsx`)
  - Layer Control Drawer with individual opacity sliders (`LayerControlDrawer.tsx`)
  - Historical Event Replay Mode for June 16–17, 2022 Cherrapunji deluge (`replayState.ts`)
- **E2E Testing & Verification**:
  - Backend pytest suite in `convectnow/tests/` covering schemas, adapters, ConvectNet, API routes, and WebSocket
  - Frontend TypeScript build validation (`npm run build` exits 0)
  - Visual verification via Playwright headless Chromium capturing operational screenshots

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Pydantic Schema Contracts | 5 contracts: SourceAdapter, CommonObservationSchema, GridCellSchema, FeatureTensorSchema, ForecastOutputSchema | M1 | ORIGINAL_REQUEST §R1 |
| F2 | MOSDAC Radar Adapter | Cherrapunji/Sohra DWR, Guwahati, Agartala; dBZ, velocity, width; synthetic fallback | M1 | ORIGINAL_REQUEST §R1 |
| F3 | MOSDAC Satellite Adapter | INSAT-3D/3DR/3DS TIR1, TIR2, MIR, WV, VIS; brightness temps; synthetic fallback | M1 | ORIGINAL_REQUEST §R1 |
| F4 | Bhuvan Lightning Adapter | ISRO Bhuvan ground strike density, flash rate, polarity; synthetic fallback | M1 | ORIGINAL_REQUEST §R1 |
| F5 | IMD AWS Adapter | Cherrapunji, Shillong, Mawsynram, Guwahati AWS (temp, rh, pressure, wind, rain rate) | M1 | ORIGINAL_REQUEST §R1 |
| F6 | Spatial Coordinate Grid | 1-3 km grid over 24.5°N–26.5°N, 91.0°E–93.0°E centered on Sohra (25.27°N, 91.73°E) with O(1) lookup | M1 | ARCHITECTURE & FEATURE_MATRIX |
| F7 | Synthetic Fallback Engine | Physically realistic convective fields (Gaussian cores, cyclonic couplets, 2-sigma jump) labeled "data_mode": "synthetic" | M1 | ORIGINAL_REQUEST §R1 |
| F8 | ConvectNet Inference Engine | ConvectNetInference class supporting 20-channel [value, mask] tensor and dual-mode execution (Torch / Physics SyntheticMode) | M2 | ORIGINAL_REQUEST §R3 |
| F9 | Hazard Probability Computation | Physics-based formulas for Convective Initiation (CI), Lightning, Hail, Downburst, and Cloudburst | M2 | RESEARCH_PAPERS & FEATURE_MATRIX |
| F10 | 0–6h Lead Time Projection | Forecast projection across 10 lead times (0, 15, 30, 45, 60, 120, 180, 240, 300, 360 min) with uncertainty cone expansion | M2 | ORIGINAL_REQUEST §R1 |
| F11 | FastAPI GIS Endpoints | GET /api/grid/{lat}/{lon}, /api/grid/block/{lat}/{lon}, /api/storm/cells, /api/forecast/{lead_time_min}, /api/hazards, /api/data_quality | M2 | ORIGINAL_REQUEST §R1 |
| F12 | Live WebSocket Stream | WebSocket /ws/live pushing immediate state (<5s) and periodic updates | M2 | ORIGINAL_REQUEST §R1 |
| F13 | Replay Mode Backend API | Support for June 16–17, 2022 Cherrapunji event with cloudburst hazard escalation (40% to 95%) | M2 | ORIGINAL_REQUEST §R4 |
| F14 | React + OpenLayers Map | OpenLayers 10 map view centered on Sohra (25.27, 91.73) with smooth navigation | M3 | ORIGINAL_REQUEST §R2 |
| F15 | 6 Government OGC Layers | MOSDAC Radar, INSAT Satellite, Bhuvan Lightning, Bhuvan DEM, IMD AWS, Admin/River boundaries with toggles & opacity sliders | M3 | MAP_SERVICES & ORIGINAL_REQUEST §R2 |
| F16 | Top Operational Bar | Status indicators, live/synthetic mode, dual UTC/IST clock, Replay toggle button | M3 | ORIGINAL_REQUEST §R2 |
| F17 | 5-Indicator Hazard Bar | Color-coded CI, Lightning, Hail, Downburst, Cloudburst indicators | M3 | ORIGINAL_REQUEST §R2 |
| F18 | Forecast Time Slider | Time steps (NOW, +15m, +30m, +45m, +1h, +2h, +3h, +4h, +5h, +6h) with play/pause loop | M3 | ORIGINAL_REQUEST §R2 |
| F19 | Click-to-Inspect Panel | Sliding card displaying coordinates, 20 features, AI hazards, storm motion, and data quality | M3 | ORIGINAL_REQUEST §R2 |
| F20 | Historical Event Replay Mode UI | Top bar "REPLAY: Active" button switching to June 16–17, 2022 timestamps and animating cloudburst escalation | M3 | ORIGINAL_REQUEST §R4 |
| F21 | Dark Ops-Room Design System | Professional dark UI (#0a0d15 / #131928, Inter/JetBrains Mono, glass cards, radar colorbar) | M3 | ORIGINAL_REQUEST §R2 |
| F22 | Pytest Backend Test Suite | Comprehensive tests in convectnow/tests/ covering all schemas, adapters, ConvectNet, API, and WebSocket | M4 | ORIGINAL_REQUEST Acceptance Criteria |
| F23 | Frontend Build Verification | npm run build in convectnow/frontend/ exiting with 0 TypeScript errors | M4 | ORIGINAL_REQUEST Acceptance Criteria |
| F24 | Visual Screenshot Verification | Playwright headless Chromium capturing operational screenshots of the dark ops-room dashboard and replay mode | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Schemas & Data Pipeline | F1, F2, F3, F4, F5, F6, F7 | none | REFACTORING |
| M2 | ConvectNet Inference & FastAPI GIS API | F8, F9, F10, F11, F12, F13 | M1 | IN_PROGRESS |
| M3 | Frontend Operational Dashboard & Replay | F14, F15, F16, F17, F18, F19, F20, F21 | none | DONE |
| M4 | Integration, Test Suite & Visual Proof | F22, F23, F24 | M1, M2, M3 | PLANNED |

## Code Layout
```
convectnow/
├── backend/
│   ├── core/
│   │   ├── __init__.py
│   │   └── schemas.py             # 5 Pydantic schema contracts & SourceAdapter ABC
│   ├── data/
│   │   ├── __init__.py
│   │   ├── grid.py                # Coordinate grid, bounding box, O(1) cell lookup
│   │   ├── synthetic.py           # Physically realistic convective field generator
│   │   └── adapters/
│   │       ├── __init__.py
│   │       ├── mosdac_radar.py    # MOSDACRadarAdapter
│   │       ├── mosdac_satellite.py# MOSDACSatelliteAdapter
│   │       ├── bhuvan_lightning.py# BhuvanLightningAdapter
│   │       └── imd_aws.py         # IMDAWSAdapter
│   ├── models/
│   │   ├── __init__.py
│   │   └── convectnet.py          # ConvectNetInference (Torch / SyntheticMode)
│   └── api/
│       ├── __init__.py
│       └── main.py                # FastAPI routes, WebSocket /ws/live, Replay API
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── index.css              # Ops-room styling, dark background, radar colorbars
│       ├── main.tsx
│       ├── App.tsx
│       ├── types/
│       │   └── index.ts           # Frontend TypeScript interfaces matching backend schemas
│       ├── services/
│       │   └── api.ts             # API client & WebSocket manager with synthetic fallback
│       ├── utils/
│       │   └── mockData.ts        # Built-in synthetic fallback data
│       └── components/
│           ├── MapView.tsx        # OpenLayers 10 map & 6 OGC layers
│           ├── TopOperationalBar.tsx
│           ├── HazardBar.tsx
│           ├── ForecastTimeSlider.tsx
│           ├── ClickInspectPanel.tsx
│           └── LayerControlDrawer.tsx
├── tests/
│   ├── __init__.py
│   ├── test_schemas.py            # Unit tests for 5 schema contracts
│   ├── test_adapters.py           # Tests for 4 data adapters & synthetic fallbacks
│   ├── test_convectnet.py         # Tests for ConvectNet inference & hazard calculations
│   └── test_api.py                # Tests for all 6 FastAPI routes and WebSocket
└── verify_visual.py               # Playwright headless browser script capturing UI screenshots
```

## Interface Contracts
### Data Adapters -> Schemas
- `SourceAdapter.fetch_latest() -> CommonObservationSchema`
- If network error: catch exception, set `data_mode = "synthetic"`, generate synthetic observations, return valid `CommonObservationSchema`

### ConvectNet -> API
- `ConvectNetInference.predict(tensor: FeatureTensorSchema, lead_time_min: int, replay_step: Optional[int]) -> ForecastOutputSchema`
- Returns: `lead_time_min`, `timestamp`, `hazard_probabilities` (dict of 5 hazards), `storm_cells` (GeoJSON FeatureCollection), `uncertainty_cone`

### Backend API -> Frontend
- Point inspection: `GET /api/grid/{lat}/{lon}` -> `GridCellSchema`
- Block inspection: `GET /api/grid/block/{lat}/{lon}` -> `{ "center": ..., "cells": 9, "composite_risk": ... }`
- Forecast query: `GET /api/forecast/{lead_time_min}` -> `ForecastOutputSchema`
- Storm cells: `GET /api/storm/cells` -> GeoJSON `FeatureCollection`
- Hazards: `GET /api/hazards` -> GeoJSON `FeatureCollection`
- Quality: `GET /api/data_quality` -> `{ "ai_model": "ConvectNet v1 (SyntheticMode)", "sources": { ... } }`
- WebSocket: `/ws/live` -> JSON frames with current forecast, storm cells, and hazard summary within 5s
