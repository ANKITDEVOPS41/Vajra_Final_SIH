# Project: Convect — Live Meteorological Raster Feeds & Universal Visual Intelligence

## Architecture
- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS + Leaflet / React-Leaflet
- **Core Engine**: WebGIS Convective Nowcasting Console (MoES PS-26084)
- **Navigation**: Persistent top header in `frontend/src/App.tsx` hosting 7 operational platform pages + public warning view.
- **Layers & Overlays**: `WeatherRasterOverlay.tsx`, `WeatherFormatSelector.tsx`, `WeatherColorbarLegend.tsx`.
- **Decision Intelligence**: Standardized `VisualIntelDecisionKey.tsx` + `visualIntelConfig.ts` + `visualIntel.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | IMD INSAT-3DR Live IR WMS | Live 10.8µm thermal infrared satellite stream from IMD Geoserver | M1 | Survey | DONE |
| 2 | RainViewer Live Radar Tiles | Composite Doppler radar reflectivity tiles across Odisha/India | M1 | Survey | DONE |
| 3 | Live Surface Heat / Temp Field | 2m thermal raster field with smooth gradient & calibrated °C/K colorbar | M1 | Survey | DONE |
| 4 | Live MSLP Pressure & Isobars | Mean sea level pressure field with dynamic isobar contour lines (hPa) | M1 | Survey | DONE |
| 5 | Live Humidity & Water Vapor | Relative humidity (%) and mid-tropospheric saturation contours | M1 | Survey | DONE |
| 6 | Multi-Format Weather Switcher | Header/control toggle between Satellite IR, Radar, Heat, Pressure, Humidity | M1 | Survey | DONE |
| 7 | Floating Calibrated Colorbars | Dynamic legends for each raster feed with accurate physical units | M1 | Survey | DONE |
| 8 | Eradication of 20 Weather Circles | Eliminate all hardcoded concentric geometric circles in WeatherRasterOverlay | M1 | Survey | DONE |
| 9 | Eradication of Storm Bullseyes | Eliminate artificial concentric circles across all 7 platform pages | M2 | Survey | DONE |
| 10 | Retain 1–3 km Runway Safety Rings | Preserve regulatory 1, 2, 3 km aerodrome rings around VEBS Runway 19 | M2 | Survey | DONE |
| 11 | Retain Motion Vectors & Rays | Preserve velocity arrows, uncertainty cones, and target intercept rays | M2 | Survey | DONE |
| 12 | Visual Intel Key on /hazard | What You See, How to Decode, Actionable Decision for Hazard GIS | M3 | Survey | DONE |
| 13 | Visual Intel Key on /dashboard | Key for Tactical Operations Dashboard with runway intercept ETAs | M3 | Survey | DONE |
| 14 | Visual Intel Key on /hyperlocal | Key for 3x3 Airfield Twin with in-situ AWS station measurements | M3 | Survey | DONE |
| 15 | Visual Intel Key on /inference | Key for 4D Multimodal AI Pipeline & ConvectNet neural heads | M3 | Survey | DONE |
| 16 | Visual Intel Key on /case-replay | Key for Historical Case Replay (Cherrapunji & VEBS microburst) | M3 | Survey | DONE |
| 17 | Visual Intel Key on /grid | Key for Grid XAI with Integrated Gradients attribution weights | M3 | Survey | DONE |
| 18 | Visual Intel Key on /microburst | Key for 3x3km Microburst with ICAO F-factor hazard thresholds | M3 | Survey | DONE |
| 19 | 1-Line Tactical Ticker Mode | Minimized, non-intrusive bottom-right floating pill for all views | M3 | Survey | DONE |
| 20 | Universal Mission Briefing Modal | Full interactive modal accessible from any page, hotkey M, or header button | M3 | Survey | DONE |
| 21 | Cognitive Load Optimization | Deep navy styling, high-contrast typography, <5s evaluator comprehension | M3 | Survey | DONE |
| 22 | E2E Verification & Build Integrity | 4-Tier verification suite + npm run build passes with 0 errors | M4 | Survey | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Live Meteo Raster Feeds & Switcher | WMS INSAT-3DR, RainViewer radar tiles, Heat/Pressure/Humidity fields, WeatherFormatSelector, calibrated colorbars | none | DONE |
| M2 | Eradication of Fake Circles | Eliminate 20+ concentric SVG circles in WeatherRasterOverlay and across 7 pages; protect 1-3km rings & operational markings | M1 | DONE |
| M3 | Universal Visual Intel & Decision Key | visualIntelConfig.ts, VisualIntelDecisionKey.tsx, mount across all 7 pages, Mission Briefing modal | none | DONE |
| M4 | E2E Testing & Final Verification | 4-Tier test suite execution (195/195 pass), build verification (`npm run build`), victory audit | M1, M2, M3 | DONE |

## Code Layout
- `frontend/src/components/WeatherRasterOverlay.tsx` — Live WMS, RainViewer tile layer, continuous meteorological fields
- `frontend/src/components/WeatherFormatSelector.tsx` — Multi-format switcher UI
- `frontend/src/components/WeatherColorbarLegend.tsx` — Calibrated physical colorbars
- `frontend/src/components/VisualIntelDecisionKey.tsx` — Standardized 3-tier visual intelligence key
- `frontend/src/components/MissionBriefingModal.tsx` — Universal interactive mission briefing modal
- `frontend/src/config/visualIntelConfig.ts` — Comprehensive page metadata registry
- `frontend/src/types/visualIntel.ts` — TypeScript types for visual intelligence keys
- `frontend/src/components/HazardDashboard.tsx` — Page 1 (/hazard)
- `frontend/src/components/TacticalOperationsDashboard.tsx` — Page 2 (/dashboard)
- `frontend/src/components/HyperlocalTwinMap.tsx` — Page 3 (/hyperlocal)
- `frontend/src/components/InferencePipelineView.tsx` — Page 4 (/inference)
- `frontend/src/components/HistoricalReplayView.tsx` — Page 5 (/case-replay)
- `frontend/src/components/ExplainableGridTracker.tsx` — Page 6 (/grid)
- `frontend/src/components/MicroburstSimulationView.tsx` — Page 7 (/microburst)
- `frontend/src/App.tsx` — Application shell, navbar, global modal triggers
- `frontend/scripts/verify-e2e.mjs` — Automated 4-tier E2E verification test suite (195 assertions)
