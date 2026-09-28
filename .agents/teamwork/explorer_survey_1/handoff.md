# Survey Report: Map Architecture, Fake Circle Eradication & Visual Intelligence

**Explorer**: Explorer 1 (`teamwork_preview_explorer`)  
**Working Directory**: `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_1/`  
**Target Repository**: `/Users/gauravkumarnayak/Desktop/convect`  
**Date**: 2026-09-28  

---

## 1. Observation

### 1.1 Project Structure & Build Configuration
- **Application Root**: `/Users/gauravkumarnayak/Desktop/convect/frontend`
- **Build Command**: `npm run build` executes `tsc -b && vite build`.
- **Baseline Verification**: Executed `npm run build` synchronously:
  ```
  > convectnow-webgis@1.0.0 build
  > tsc -b && vite build

  vite v6.4.3 building for production...
  ✓ 1957 modules transformed.
  dist/index.html                   1.29 kB │ gzip:   0.71 kB
  dist/assets/index-NqArKUkx.css  111.16 kB │ gzip:  21.14 kB
  dist/assets/index-DBS4PNXV.js   696.11 kB │ gzip: 192.75 kB
  ✓ built in 2.13s
  ```
  Zero TypeScript errors, zero ESLint errors.
- **Dependencies (`frontend/package.json`)**:
  - `react`: `^19.0.0`
  - `react-dom`: `^19.0.0`
  - `leaflet`: `^1.9.4`
  - `react-leaflet`: `^5.0.0`
  - `@types/leaflet`: `^1.9.22`
  - `@types/react-leaflet`: `^2.8.3`
  - `lucide-react`: `^1.37.0`
  - `framer-motion`: `^13.4.4`
  - `tailwindcss`: `^3.4.17`
  - `typescript`: `~5.7.2`
  - `vite`: `^6.0.11`
- **Application Navigation & Routing (`frontend/src/App.tsx`)**:
  `App.tsx` controls view switching via `viewMode` state across the 7 platform pages:
  - `hazard`: `<HazardDashboard />` (`frontend/src/components/HazardDashboard.tsx`)
  - `tactical`: `<TacticalOperationsDashboard />` (`frontend/src/components/TacticalOperationsDashboard.tsx`)
  - `hyperlocal`: `<HyperlocalTwinMap />` (`frontend/src/components/HyperlocalTwinMap.tsx`)
  - `inference`: `<InferencePipelineView />` (`frontend/src/components/InferencePipelineView.tsx`)
  - `replay`: `<HistoricalReplayView />` (`frontend/src/components/HistoricalReplayView.tsx`)
  - `grid`: `<ExplainableGridTracker />` (`frontend/src/components/ExplainableGridTracker.tsx`)
  - `microburst`: `<MicroburstSimulationView />` (`frontend/src/components/MicroburstSimulationView.tsx`)
  - `public`: `<CitizenWarningInterface />` (`frontend/src/components/CitizenWarningInterface.tsx`)

---

### 1.2 Verification of Live Meteorological Feeds
Direct live network tests were executed via terminal:
1. **RainViewer Radar Mosaic API**:
   - Endpoint: `https://api.rainviewer.com/public/weather-maps.json`
   - Test result: HTTP 200 OK. Returns `host: "https://tilecache.rainviewer.com"` and latest radar timestamp paths (e.g. `/v2/radar/...`). Tile format: `https://tilecache.rainviewer.com/v2/radar/{path}/256/{z}/{x}/{y}/2/1_1.png`.
2. **IMD INSAT-3DR Geoserver WMS**:
   - Endpoint: `https://reactjs.imd.gov.in/geoserver/imd/wms?LAYERS=imd:insat_ir`
   - Test result: HTTP 200 OK. Returns WMS 1.1.1 capabilities and tile stream directly without authentication.
3. **Open-Meteo Live Atmospheric Fields**:
   - Endpoint: `https://api.open-meteo.com/v1/forecast?latitude=20.2444&longitude=85.8178&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m`
   - Test result: HTTP 200 OK. Returns real-time 2m temperature (°C), relative humidity (%), surface pressure (hPa), and wind vectors.

---

### 1.3 Identification of Artificial Geometric Concentric Circles & Bullseyes (MUST BE ERADICATED)

Across the repository, artificial geometric circles and bullseyes were located in 8 files:

1. **`frontend/src/components/WeatherRasterOverlay.tsx` (Lines 70–330)**:
   - Contains **20 concentric `<Circle>` components** hardcoded across 4 format styles:
     - `insat_ir` (lines 77–119): 4 concentric circles representing anvil (2.6x), glaciated canopy (1.7x), updraft (1.0x), overshoot (0.45x).
     - `ir_rainbow` (lines 131–206): **7 concentric rainbow circles** (2.8x navy, 2.1x cyan, 1.5x green, 1.1x yellow, 0.75x orange, 0.45x red, 0.22x crimson).
     - `enhanced_cloud` (lines 217–259): 4 concentric cyan/blue/purple circles (2.5x, 1.6x, 0.95x, 0.4x).
     - `dwr_radar` (lines 271–326): 5 concentric dBZ circles (1.8x green, 1.3x yellow, 0.9x orange, 0.55x red, 0.28x purple).
   - Verbatim code pattern:
     ```tsx
     // WeatherRasterOverlay.tsx:131-206
     <Circle center={[cell.lat, cell.lon]} radius={baseRadiusM * 2.8} pathOptions={{ fillColor: '#1d4ed8', ... }} />
     <Circle center={[cell.lat, cell.lon]} radius={baseRadiusM * 2.1} pathOptions={{ fillColor: '#06b6d4', ... }} />
     <Circle center={[cell.lat, cell.lon]} radius={baseRadiusM * 1.5} pathOptions={{ fillColor: '#22c55e', ... }} />
     <Circle center={[cell.lat, cell.lon]} radius={baseRadiusM * 1.1} pathOptions={{ fillColor: '#eab308', ... }} />
     <Circle center={[cell.lat, cell.lon]} radius={baseRadiusM * 0.75} pathOptions={{ fillColor: '#f97316', ... }} />
     <Circle center={[cell.lat, cell.lon]} radius={baseRadiusM * 0.45} pathOptions={{ fillColor: '#ef4444', ... }} />
     <Circle center={[cell.lat, cell.lon]} radius={baseRadiusM * 0.22} pathOptions={{ fillColor: '#7f1d1d', ... }} />
     ```

2. **`frontend/src/components/TacticalOperationsDashboard.tsx` (Lines 831–856 & 250–258)**:
   - Lines 831–856: Two concentric `<Circle>` elements per storm cell:
     ```tsx
     {/* 1. Radar Reflectivity Core Footprint */}
     <Circle center={[cell.centroid_lat, cell.centroid_lon]} radius={radiusM} pathOptions={{ color: strokeColor, fillColor: strokeColor, fillOpacity: isSelected ? 0.45 : 0.28, ... }} />
     {/* Additional inner high-reflectivity core circle */}
     <Circle center={[cell.centroid_lat, cell.centroid_lon]} radius={radiusM * 0.45} pathOptions={{ color: '#ffffff', fillColor: strokeColor, fillOpacity: 0.65, weight: 1 }} />
     ```
   - Lines 250–258: Custom DOM marker pulse halo creating a glowing bullseye ring around each storm cell center (`animate-ping` circle).

3. **`frontend/src/components/HazardDashboard.tsx` (Lines 2222–2266)**:
   - Lines 2222–2237: Forecast uncertainty circle around storm cells:
     ```tsx
     <Circle center={[cell.lat, cell.lon]} radius={cell.uncertaintyRadiusKm * 1000} pathOptions={{ ... dashArray: '4, 4' }} />
     ```
   - Lines 2240–2251: Outer Outflow & Wind Shear Halo:
     ```tsx
     <CircleMarker center={[cell.lat, cell.lon]} radius={domainScope === 'aerodrome_3km' ? 36 : 24} pathOptions={{ dashArray: '3, 3' }} />
     ```
   - Lines 2253–2266: High-Reflectivity Precipitation Core:
     ```tsx
     <CircleMarker center={[cell.lat, cell.lon]} radius={domainScope === 'aerodrome_3km' ? 16 : 10} pathOptions={{ color: '#ffffff', weight: 2 }} />
     ```
   - These 3 overlapping elements form a concentric geometric bullseye around every forecasted cell.

4. **`frontend/src/components/HyperlocalTwinMap.tsx` (Lines 382–391)**:
   - Two concentric artificial red circles rendered directly over VEBS aerodrome:
     ```tsx
     {/* Active Severe Convective Cell Core (Simulated S-Band DWR Feed) */}
     <Circle center={[20.2444, 85.8178]} radius={2800} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.35, weight: 1.5 }} />
     <Circle center={[20.2444, 85.8178]} radius={1400} pathOptions={{ color: '#b91c1c', fillColor: '#b91c1c', fillOpacity: 0.60, weight: 2 }} />
     ```

5. **`frontend/src/components/InferencePipelineView.tsx` (Lines 777–805)**:
   - Two concentric circles representing ConvectNet predicted hazard footprint:
     ```tsx
     {/* Predicted Hazard Footprint from ConvectNet Multi-Task Decoder */}
     <Circle center={[LAT + hazardMeta.centerOffset[0], LON + hazardMeta.centerOffset[1]]} radius={2400} pathOptions={{ ... dashArray: '6, 4' }} />
     <Circle center={[LAT + hazardMeta.centerOffset[0], LON + hazardMeta.centerOffset[1]]} radius={1100} pathOptions={{ color: '#ffffff', weight: 1.5 }} />
     ```

6. **`frontend/src/components/HistoricalReplayView.tsx` (Lines 340–349 & 444–453)**:
   - Dual split-screen map with 2 pairs of concentric circles:
     - AI Predicted Storm Outflow & Core (lines 340–349): `<Circle radius={predicted.outerRadius}>` (dashed) + `<Circle radius={predicted.coreRadius}>` (solid white border).
     - Actual Observed Radar Storm (lines 444–453): `<Circle radius={actual.outerRadius}>` + `<Circle radius={actual.coreRadius}>`.

7. **`frontend/src/components/ExplainableGridTracker.tsx` (Lines 504–532)**:
   - Concentric circle markers:
     - Outer halo: `<CircleMarker radius={22} pathOptions={{ color: '#ff0055', fillOpacity: 0.28 }} />`
     - Inner core: `<CircleMarker radius={10} pathOptions={{ color: '#ffffff', fillColor: '#dc2626', fillOpacity: 0.95 }} />`

8. **`frontend/src/components/MicroburstSimulationView.tsx` (Lines 144–174)**:
   - Concentric circle pair:
     - Divergent Outflow Ring (lines 144–158): `<Circle radius={storm.outerRadius} pathOptions={{ dashArray: '6, 6' }} />`
     - Severe Microburst Downdraft Core (lines 161–174): `<Circle radius={storm.coreRadius} pathOptions={{ fillColor: '#ef4444' }} />`

---

### 1.4 Identification of Operational Markings (MUST BE RETAINED & PROTECTED)

The following operational, physical, and regulatory markings are essential aeronautical GIS features and **must remain strictly intact**:

1. **1–3 km Runway Safety Perimeter Rings**:
   - Location: `frontend/src/components/TacticalOperationsDashboard.tsx` (Lines 626–681)
   - Code:
     ```tsx
     {/* 1 km Inner Touchdown Emergency Ring */}
     <Circle
       center={VEBS_AIRPORT_SPECS.runway01_19[1]}
       radius={1000}
       pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.05, weight: 2, dashArray: '5, 5' }}
     >
       <Tooltip permanent direction="top" offset={[0, -10]}>
         ⭕ 1 km TOUCHDOWN ZONE (<2 MIN IMPACT)
       </Tooltip>
     </Circle>

     {/* 2 km Final Approach Alert Ring */}
     <Circle
       center={VEBS_AIRPORT_SPECS.runway01_19[1]}
       radius={2000}
       pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.03, weight: 2, dashArray: '6, 6' }}
     >
       <Tooltip permanent direction="top" offset={[0, -10]}>
         ⭕ 2 km FINAL APPROACH ALERT (CELL-701 AT 1.8 KM)
       </Tooltip>
     </Circle>

     {/* 3 km Aerodrome Tactical Perimeter (PS-26084 Core Requirement) */}
     <Circle
       center={VEBS_AIRPORT_SPECS.runway01_19[1]}
       radius={3000}
       pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.02, weight: 1.8, dashArray: '8, 8' }}
     >
       <Tooltip permanent direction="top" offset={[0, -10]}>
         ⭕ 3 km AERODROME NOWCAST BOUNDARY (SIH PS-26084)
       </Tooltip>
     </Circle>
     ```
   - Airfield perimeter boundary: `VEBS_PERIMETER_BOUNDS` in `TacticalAirportMapEngine.tsx` (line 416).

2. **Velocity Motion Arrows, Forecast Vectors & Uncertainty Cones**:
   - `TacticalOperationsDashboard.tsx`:
     - Lines 858–874: `Polygon` for 30-minute Uncertainty Projection Cone (`positions={[cell.centroid_lat, cell.centroid_lon], coneLeft, proj30, coneRight}`).
     - Lines 877–892: `Polyline` for 0–30m Motion Vector Ray (`positions={[cell.centroid_lat, cell.centroid_lon], proj15, proj30}`).
   - `HazardDashboard.tsx`:
     - Lines 2197–2206: Past Track Trail (`Polyline`, dashed line, color `#94a3b8`).
     - Lines 2209–2218: Future Forecasted Motion Vector (`Polyline`, color `#38bdf8`, weight 2.5).
   - `ExplainableGridTracker.tsx`:
     - Lines 492–501: Past completed path (`Polyline`, weight 3.5) and future projected path (`Polyline`, dashed, weight 2).
   - `HistoricalReplayView.tsx`:
     - Line 350 (`predictedPath` polyline) and line 454 (`actualPath` polyline).

3. **Target Intercept Rays & Dynamic Arrival Badges**:
   - `TacticalOperationsDashboard.tsx` (Lines 893–928):
     - `Polyline` from `[cell.centroid_lat, cell.centroid_lon]` directly to `targetCoord` (Runway 19 Threshold, Runway 01 Touchdown, Terminal Apron, Cuttack Badambadi, Pipili Junction).
     - Midpoint `Marker` with `createInterceptTagIcon` displaying target name, distance in km, and ETA in minutes.

4. **Physical Aeronautical Geometries & Station Infrastructure**:
   - Primary Instrument Runway 01/19 geometry (`VEBS_AIRPORT_SPECS.runway01_19`, length 2,743m x 45m) with centerline and threshold pins (`RWY 01 TDZ`, `RWY 19 TH`).
   - Extended ILS glidepath approach corridor (`AIRPORT_RUNWAYS.ilsCorridor` in `HazardDashboard.tsx:2356`).
   - 9 In-Situ Surface AWS Network Stations (`SURROUNDING_AWS_STATIONS` in `types/tacticalGrid.ts`) with live temperature, pressure, dew point, wind gust, and tendency popups.
   - 3x3 Tactical Sector Grid (`TACTICAL_3X3_GRID`: T-NW to T-SE) across 20.0°N–20.6°N, 85.5°E–86.1°E.
   - Cherrapunji Escarpment Line (`CHERRAPUNJI_SPECS.escarpmentLine` in `HistoricalReplayView.tsx:416`).

---

## 2. Logic Chain

```
[Observation: 20 concentric <Circle> components in WeatherRasterOverlay + 12 concentric circle pairs across all 7 pages]
      │
      ▼
[Inference 1: Users perceive these stepped geometric SVG rings as "fake AI generated art" rather than authentic meteorology]
      │
      ▼
[Observation: IMD INSAT-3DR WMS, RainViewer Doppler radar tiles, and Open-Meteo REST APIs respond HTTP 200 with genuine live data]
      │
      ▼
[Inference 2: WeatherRasterOverlay can be completely converted from synthetic circle rendering to real tile/raster streaming]
      │
      ▼
[Observation: Operational markings (1–3 km runway rings, velocity vectors, target intercept rays) serve regulatory ATC and pilot decision roles]
      │
      ▼
[Inference 3: Eradication must strictly target storm-centered concentric bullseyes while preserving all airport runway rings and navigation rays]
      │
      ▼
[Observation: TacticalOperationsDashboard had a prototype guide modal (lines 1252-1316), but the other 6 pages have no visual decode keys]
      │
      ▼
[Inference 4: A universal, collapsible "Visual Intelligence & Decision Key" component can be mounted on all 7 pages, providing What You See, How to Decode, and Actionable Decisions with zero layout collisions]
```

### Detailed Logical Deductions:
1. **Separation of Storm Geometry vs. Operational Coordinate Frames**:
   - A circle centered on a *storm cell* (`[cell.lat, cell.lon]`) with arbitrary discrete colored shells is synthetic and unmeteorological. In genuine radar displays, precipitation reflectivity is an interpolated continuous field (dBZ) or composite raster mosaic from Doppler radar networks.
   - A ring centered on a *runway threshold* (`[VEBS_RUNWAY_19_TH]`) with exact radius 1000m, 2000m, or 3000m represents a fixed aerodrome obstacle evaluation boundary and ICAO Annex 3 / DGCA approach safety zone. These rings must remain prominent, crisp, and high-contrast.
2. **Seamless Multi-Format Switcher Architecture**:
   - `WeatherFormatSelector.tsx` should support:
     1. `insat_ir`: Live Thermal IR Satellite (Official IMD INSAT-3DR 10.8µm TIR WMS).
     2. `radar`: Live Doppler Radar Reflectivity (RainViewer Composite `/v2/radar/...` & IMD DWR mosaic).
     3. `temperature`: Live Surface Heat / Temperature Field (2m thermal raster from Open-Meteo & AWS network).
     4. `pressure`: Live Atmospheric Pressure (MSLP hPa) & dynamic isobar contours.
     5. `humidity`: Live Relative Humidity (%) & saturation contours.
     6. `satellite`: True-color Optical High-Res (Runways & Streets).
     7. `dark`: C2 Tactical Dark Vector Canvas.
3. **Decoupled Visual Intelligence Key**:
   - By creating a standardized `<VisualIntelDecisionKey page="hazard" | "tactical" | "hyperlocal" | "inference" | "replay" | "grid" | "microburst" />`, all 7 pages receive:
     - 1-line tactical ticker bar (docked unobtrusively, collapsible).
     - Expanded quick-decode card (3 core pillars: 👁️ What You Are Seeing, 📊 How to Decode Visuals, ⚡ Actionable Decision).
     - Full Mission Briefing modal with comprehensive SIH PS-26084 context.

---

## 3. Caveats

1. **IMD Geoserver Network Latency**:
   - While `https://reactjs.imd.gov.in/geoserver/imd/wms` is the official MoES/IMD WMS stream and returned HTTP 200 during testing, government servers in India can experience intermittent network throttling outside South Asia.
   - *Mitigation*: Implement graceful loading error handling and smooth fallback to RainViewer Satellite IR or calibrated local convective thermal gradient if the WMS tile request times out.
2. **RainViewer Timestamp Polling**:
   - RainViewer updates radar composites every 10 minutes. A lightweight hook (`useRainViewerRadar`) should fetch the latest timestamp from `https://api.rainviewer.com/public/weather-maps.json` on mount and refresh every 5 minutes.
3. **Open-Meteo & In-Situ AWS Fusion**:
   - The surface temperature, pressure isobars, and humidity can fuse Open-Meteo hourly grid points with the 9 actual Bhubaneswar AWS station readings (`SURROUNDING_AWS_STATIONS`) to create mathematically sound spatial gradients across the 3x3 domain.
4. **React 19 Typings**:
   - `@types/react-leaflet` is at version 2.8.3 while `react-leaflet` is at 5.0.0. All components must ensure proper React 19 JSX typing to keep `npm run build` passing with 0 errors.

---

## 4. Conclusion & Actionable Implementation Plan

The repository is in a clean baseline state with working dependencies and fast build times (2.13s). The 7 platform pages are cleanly partitioned in `App.tsx`.

### Recommended Concrete Steps for Implementer:
1. **Create `src/components/VisualIntelDecisionKey.tsx`**:
   - Standardized collapsible component tailored with specific metadata for all 7 pages:
     - `hazard`: 0–6h nowcasting horizons, 1 km² grid cells, IMD radar dBZ thresholds (20–65+ dBZ), Urban Pre-activation / Siren dispatch.
     - `tactical`: 1–3 km aerodrome safety rings, storm cell cores, runway intercept ETAs, ATC Runway Go-Around / Ground Stop.
     - `hyperlocal`: Runway 01 micro-climate, in-situ AWS station measurements, Runway Wind Shear LLWS alerts.
     - `inference`: 4D multimodal tensor channels (VIL, cooling rate, lightning jump), ConvectNet neural heads.
     - `replay`: June 2022 Cherrapunji extreme cloudburst benchmark, AI vs Ground Truth validation.
     - `grid`: Spatial explainability attribution weights (radar core vs CAPE vs LLWS).
     - `microburst`: 3D runway glidepath shear, ICAO F-factor hazard thresholds (F > 0.13), Windshear Warning.
   - Provides 1-line tactical ticker, expanded card, and full mission modal accessible from any page.
2. **Overhaul `src/components/WeatherRasterOverlay.tsx`**:
   - Remove all 20 concentric `<Circle>` components.
   - Implement real live layers:
     - IMD INSAT-3DR Thermal IR `<WMSTileLayer>` (`layers="imd:insat_ir"`).
     - RainViewer Live Doppler Radar `<TileLayer>` (`tilecache.rainviewer.com/v2/radar/...`).
     - Live Surface Heat / Temperature field (smooth continuous gradient canvas/SVG + calibrated °C/K colorbar).
     - Live MSLP Pressure field with dynamic isobar lines (hPa) & mesolow flags.
     - Live Relative Humidity (%) field & saturation contours.
   - Calibrated floating colorbars for each selected format.
3. **Update `src/components/WeatherFormatSelector.tsx`**:
   - Include the 5 meteorological formats (Satellite IR, Doppler Radar, Heat, Pressure Isobars, Humidity) + Satellite HD & Dark Canvas.
4. **Cleanse Storm Circles on All 7 Pages**:
   - `HazardDashboard.tsx`: Replace lines 2240–2266 fake CircleMarker bullseyes with realistic radar core footprint / RainViewer layer. Add 1–3km runway safety rings to aerodrome mode.
   - `TacticalOperationsDashboard.tsx`: Replace lines 831–856 concentric storm circle with realistic convective core. Preserve lines 626–681 (1–3km runway safety rings) and lines 858–928 (vectors, cones, intercept rays).
   - `HyperlocalTwinMap.tsx`: Replace lines 382–391 red concentric circles with authentic radar tile feed or smooth convective core.
   - `InferencePipelineView.tsx`: Replace lines 777–805 concentric circles with continuous AI tensor footprint.
   - `HistoricalReplayView.tsx`: Replace lines 340–349 and 444–453 concentric circles with genuine radar reflectivity fields.
   - `ExplainableGridTracker.tsx`: Replace lines 504–532 concentric circle markers with realistic convective core and clean centroid marker.
   - `MicroburstSimulationView.tsx`: Replace lines 144–174 concentric circles with realistic divergent wind shear field.
5. **Mount VisualIntelDecisionKey across all 7 views in `App.tsx` or respective components**.
6. **Execute `npm run build` to verify 0 errors**.

---

## 5. Verification Method

To independently verify the survey findings and subsequent implementation:

1. **Verify Baseline Build**:
   ```bash
   cd /Users/gauravkumarnayak/Desktop/convect/frontend
   npm run build
   ```
   Must compile with 0 TypeScript/ESLint errors.

2. **Verify Live Meteorological Data Streams via cURL**:
   ```bash
   # RainViewer live radar API
   curl -s https://api.rainviewer.com/public/weather-maps.json | head -c 200

   # IMD INSAT-3DR Geoserver WMS
   curl -s -I "https://reactjs.imd.gov.in/geoserver/imd/wms?service=WMS&version=1.1.1&request=GetCapabilities"

   # Open-Meteo live weather API for Bhubaneswar (VEBS)
   curl -s "https://api.open-meteo.com/v1/forecast?latitude=20.2444&longitude=85.8178&current=temperature_2m,surface_pressure,relative_humidity_2m"
   ```

3. **Verify Absence of Artificial Concentric Storm Circles**:
   - Inspect `WeatherRasterOverlay.tsx`: no hardcoded multi-level concentric `<Circle>` loops.
   - Inspect `TacticalOperationsDashboard.tsx`: lines 831–856 no longer contain concentric storm circles, but lines 626–681 (1–3km runway safety perimeter rings around VEBS Runway 19) are strictly present.
   - Inspect `HyperlocalTwinMap.tsx`: lines 382–391 no longer contain concentric red circles.
   - Inspect `InferencePipelineView.tsx`: lines 777–805 no longer contain concentric hazard circles.
   - Inspect `HistoricalReplayView.tsx`: lines 340–349 & 444–453 no longer contain concentric storm rings.
   - Inspect `MicroburstSimulationView.tsx`: lines 144–174 no longer contain concentric bullseyes.
   - Inspect `ExplainableGridTracker.tsx`: lines 504–532 no longer contain concentric circle markers.

4. **Verify Universal Visual Intelligence & Decision Key**:
   - Toggle each of the 7 views in `App.tsx` (`hazard`, `tactical`, `hyperlocal`, `inference`, `replay`, `grid`, `microburst`).
   - Confirm each view renders the standardized collapsible Visual Intel & Decision Key.
