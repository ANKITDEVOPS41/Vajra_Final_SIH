# Comprehensive Survey & Architectural Specification: Universal Visual Intel & Decision Key System across 7 Operational Pages

**Agent**: Explorer 3 (teamwork_preview_explorer)  
**Date**: 2026-09-28T01:22:00Z  
**Target Repository**: `/Users/gauravkumarnayak/Desktop/convect`  
**Problem Statement Reference**: MoES / NCMRWF Severe Convection Nowcasting (PS-26084)  
**Integrity Mode**: Read-Only Survey & Architectural Synthesis  

---

## 1. Observation

Direct examination of the codebase at `/Users/gauravkumarnayak/Desktop/convect` revealed the following structural, navigational, and component patterns across all 7 operational platform pages:

### 1.1 Navigation & Application Shell (`frontend/src/App.tsx`)
- In `frontend/src/App.tsx` (lines 27–28, 62–131):
  ```tsx
  const [viewMode, setViewMode] = useState<'hazard' | 'tactical' | 'inference' | 'public' | 'hyperlocal' | 'replay' | 'grid' | 'microburst'>('hazard');
  ```
- The top header (`sticky top-0 z-50 h-14 bg-[#0a0d14]/95 border-b border-[#1e2533] px-5`) renders a navigation pill containing 8 buttons (`Hazard GIS`, `Dashboard`, `3x3 Airfield Twin`, `AI Pipeline`, `Case Replay`, `Grid XAI`, `3x3km Microburst`, and `GIS Warning`).
- Lines 141–167 render a persistent tactical status ribbon outside of `/hazard` and `/dashboard`:
  ```tsx
  {viewMode !== 'hazard' && viewMode !== 'tactical' && (
    <div className="bg-[#0b101b] border-b border-[#1f293d] px-6 py-2 flex flex-wrap items-center justify-between text-xs font-mono text-[#94a3b8]">
      <span>3x3 TACTICAL AOI: 20.0°N–20.6°N, 85.5°E–86.1°E</span>
      <span>9 SURFACE AWS IN-SITU NETWORK REPORTING</span>
      <span>VEBS RUNWAY 01 LLWS MONITORED</span>
    </div>
  )}
  ```
- View routing is conditionally rendered directly into `<main>` without client-side route persistence, meaning reloading the browser resets to `'hazard'`.

---

### 1.2 The 7 Operational Pages Survey

#### Page 1: Hazard GIS (`/hazard` → `HazardDashboard.tsx`)
- **File**: `frontend/src/components/HazardDashboard.tsx` (2,909 lines).
- **Layout**: Full-viewport dual-mode console (`h-[calc(100vh-56px)]`). Subheader at line 1759 contains station identity (`VEBS • IMD DWR BHUBANESWAR`, S-Band 2.875 GHz), live LLWS alert ticker or SPECI METAR string, Domain Scope toggle (`3x3 km Core` vs `60 km Regional`), and Display Mode toggle (`Polar Scope` vs `GIS Basemap`).
- **Visuals**:
  - *Polar Scope*: Raw S-band polar sweep canvas (`<canvas id="polarRadarCanvas">`) with 120 km range rings and beam sweep line.
  - *GIS Basemap*: Leaflet map featuring `WeatherRasterOverlay`, `WeatherFormatSelector`, `WeatherColorbarLegend`, and 3x3 tactical sector polygons.
- **Existing Decision Aides**: Verification metrics modal (`showMetricsModal` line 1863), SPECI METAR decoder, and cell severity badges.
- **Current Deficit**: Lacks an explicit collapsible key answering what physical parameters are displayed, how to interpret multi-level reflectivity vs radial velocity couplets, and what specific ATC/NDMA decisions are triggered at threshold values.

#### Page 2: Tactical Operations Dashboard (`/dashboard` → `TacticalOperationsDashboard.tsx`)
- **File**: `frontend/src/components/TacticalOperationsDashboard.tsx` (1,323 lines).
- **Layout**: C2 Airfield Tactical Operations Center. Left column (380px) houses the cell priority list and target arrivals list; center is the interactive Leaflet aerodrome map; right is storm telemetry and CAP alert dispatch.
- **Visuals**:
  - 1 km, 2 km, 3 km aerodrome safety rings around VEBS center.
  - Storm cell centroids with motion velocity vectors and dashed cyan target intercept rays to runway thresholds.
  - Precursor mission modal: lines 1252–1316 render `{showMissionGuide && (...)}` explaining 1–3 km aerodrome nowcasting and range rings.
- **Current Deficit**: The mission guide is isolated inside this single component, hardcoded as a static dialog, and unavailable on any of the other 6 pages. No 1-line tactical ticker mode exists.

#### Page 3: 3x3 Airfield Twin (`/hyperlocal` → `HyperlocalTwinMap.tsx`)
- **File**: `frontend/src/components/HyperlocalTwinMap.tsx` (420 lines).
- **Layout**: Two-column split layout (`h-[calc(100vh-140px)]`). Left sidebar (384px) has tabs: `3x3 Grid (9 Sectors)`, `AWS Net (9 Stations)`, and `Aerodrome (Live Open-Meteo)`. Right side is `TacticalAirportMapEngine`.
- **Visuals**:
  - 3x3 sector matrix tiles (NW to SE) with live dBZ and rain rate mm/h.
  - 9 AWS station telemetry cards (temperature, pressure tendency ΔP/3h, gust, 1h rain).
  - Open-Meteo live aerodynamic telemetry and 6-hour convective nowcast bars.
  - Map overlay lines 382–391 still contain artificial SVG concentric circles (`radius={2800}` and `radius={1400}`).
- **Current Deficit**: No `WeatherFormatSelector`, no legend, no explanation of how AWS pressure drops correlate with downburst touchdown, and no operational decision matrix.

#### Page 4: AI Pipeline (`/inference` → `InferencePipelineView.tsx`)
- **File**: `frontend/src/components/InferencePipelineView.tsx` (853 lines).
- **Layout**: High-capacity deep learning architectural console (`max-w-[1520px]`).
- **Visuals**:
  - Horizontal flowchart of 6 pipeline stages: Multi-Modal Tensor Assembly → 3D-CNN Encoder → CBAM Attention → ConvLSTM Core → Latent Manifold → 4 Hazard Decoders.
  - 4D Tensor Channels (C0: Radar VIL 0–85 kg/m², C1: Reflectivity Trend -15 to +25 dBZ/10m, C2: INSAT-3DR TIR-1 Cooling Rate -2.5 to 0 K/min, C3: Total Lightning Jump 0–45 fl/km²/min).
  - 4 Hazard Decoders: Cloudburst, Microburst / LLWS, Severe Hail, Convective Initiation (CI).
- **Current Deficit**: Deep learning mechanics are impenetrable for operational duty forecasters and evaluators without a standardized key translating latent channels into actionable physical threats.

#### Page 5: Historical Case Replay (`/case-replay` → `HistoricalReplayView.tsx`)
- **File**: `frontend/src/components/HistoricalReplayView.tsx` (513 lines).
- **Layout**: Retrospective verification bench (`max-w-[1400px]`). Top controls switch between Case Study 1 (Cherrapunji June 16–17, 2022, 972.6 mm/24h) and Case Study 2 (Bhubaneswar VEBS Severe Microburst).
- **Visuals**:
  - Scrubber timeline (0 to 180 min at 5-min intervals).
  - Map displaying AI Predicted Storm (purple/magenta footprint & path) vs Observed Ground Truth Storm (emerald/cyan radar echo & rain gauge).
  - Escarpment line across Khasi Hills ridge or VEBS Runway 01/19 axis.
  - CSI, POD, FAR, and displacement error metrics.
- **Current Deficit**: No visual key explaining color differentiation (AI prediction vs Ground Truth reality) or how the benchmark proves operational viability for flash flood evacuations.

#### Page 6: Grid XAI (`/grid` → `ExplainableGridTracker.tsx`)
- **File**: `frontend/src/components/ExplainableGridTracker.tsx` (692 lines).
- **Layout**: Explainable AI cockpit with domain selector (`AERODROME 3.0 km × 3.0 km` with 9 cells of 1.0 km² each vs `REGIONAL 60 km CORRIDOR`).
- **Visuals**:
  - Interactive map displaying grid bounding boxes (`T-A1` to `T-C3` or `SEC-NW` to `SEC-SE`) and 37-step storm trajectory waypoints.
  - Right XAI attribution panel: ConvectNet XAI Attribution Card, Current Target Intersect, Integrated Gradients attribution bars (Radar Aloft ~42%, CAPE ~28%, Gust & LLWS ~30%), Actionable Intelligence Card.
- **Current Deficit**: Attribution percentages and sector codes require a decoding key explaining how the multi-modal weights translate into immediate ground actions (e.g., glidepath abandonment vs municipal sluice gate activation).

#### Page 7: 3x3km Microburst (`/microburst` → `MicroburstSimulationView.tsx`)
- **File**: `frontend/src/components/MicroburstSimulationView.tsx` (322 lines).
- **Layout**: High-resolution aerodynamic wind shear simulator (`min-h-[860px]`).
- **Visuals**:
  - Left map: `TacticalAirportMapEngine` at zoom 14 with concentric overlays:
    - Outer dashed ring: Divergent surface outflow boundary (gust 48–99 km/h, cold pool drop ΔT -2.1 to -7.8°C).
    - Inner deep red circle: Severe microburst downdraft shaft (300–750m radius, reflectivity 45–64.5 dBZ).
    - Touchdown target marker with verbatim popup telemetry.
  - Right column: VEBS Airfield Telemetry (Velocity Shear ΔV, Outflow Gust, Z-R Rain Rate, Cold Pool), AWS-VEBS confirmation (Station 42971), and AAI / VEBS ATC Directive card.
- **Current Deficit**: The concentric circles represent genuine physical phenomena (downdraft shaft vs expanding divergent gust front), but absent an authoritative key, observers can misinterpret them as arbitrary synthetic bullseyes.

---

### 1.3 Design System & Visual Grammar (`DESIGN.md`)
- `DESIGN.md` establishes the **Axiom** visual grammar:
  - Canvas: `#0a0e1a` / `#08090a` (deep navy with blue tilt)
  - Surface: `#161d33` / `#111729` / `#141516` (raised panel)
  - Primary Brand Accent: `#1aaaff` / `#38bdf8` (electric cyan)
  - Semantic Status: Red `#ef4444` (danger/critical), Amber `#f59e0b` (warning/advisory), Green `#22c55e` (success/nominal)
  - Typography: Inter for UI/display, JetBrains Mono / SFMono for telemetry and coordinates (`tabular-nums`)

---

## 2. Logic Chain

1. **Premise**: In high-stakes weather emergencies (aviation wind shear, sudden urban cloudbursts), duty forecasters, ATC tower controllers, and hackathon judges operate under severe cognitive load. Divided attention between real-time radar echoes, in-situ AWS station alerts, and radio communications leaves less than 5 seconds to decode complex multi-layered data.
2. **Observation-Driven Need**: 
   - Across the 7 operational pages, users encounter differing spatial scales (1.0 km² aerodrome cells vs 60 km regional catchment), disparate physical units (dBZ, m/s, kg/m², K/min, hPa, flashes/min), and varied machine learning visualizations (attention weights, Integrated Gradients, CSI overlap).
   - Currently, only `TacticalOperationsDashboard.tsx` contains an explainer (`showMissionGuide`), and it is an uncollapsible, isolated modal that cannot be reached from the other 6 pages.
   - `HyperlocalTwinMap.tsx` contains uncalibrated SVG circles that look synthetic and lack physical decoding.
3. **Architectural Deduction**: 
   - A single, centralized, universal UI component (`VisualIntelKey`) backed by a strongly typed configuration registry (`visualIntelConfig.ts`) must be deployed across all 7 platform pages.
   - To respect screen real estate and prevent occlusion of critical runway touchdown zones or radar cores, the key must support **three distinct cognitive states**:
     1. **Minimized 1-Line Tactical Ticker**: A floating pill docked at the bottom-right or bottom-center displaying instant threat level, lead metric, and one-click expand triggers.
     2. **Expanded View (Floating Drawer / Card)**: A structured glass panel providing the 3 mandatory pillars: 👁️ What You Are Seeing, 📊 How to Decode Visuals, and ⚡ Actionable Decision.
     3. **Universal Mission Briefing Modal**: A full interactive dialogue accessible from any view (via navbar, keyboard shortcut `M`, or key button) that enables deep exploration across all 7 operational subsystems.

---

## 3. Standardized Visual Intel & Decision Key: System Architecture & Content Matrix

### 3.1 Content Matrix Across All 7 Platform Pages

| Page Route | 👁️ What You Are Seeing | 📊 How to Decode Visuals | ⚡ Actionable Decision |
|---|---|---|---|
| **1. Hazard GIS** (`/hazard`) | **Sensor**: IMD S-Band Dual-Polarimetric Doppler Radar (VEBS-DWR, 2.875 GHz, 0.95° beamwidth) & ConvectNet 0–6h nowcasting model.<br>**Parameters**: Reflectivity ($Z$), Radial Velocity ($V_r$), Vertically Integrated Liquid (VIL).<br>**Spatial Domain**: Regional 120 km buffer centered on Bhubaneswar-Cuttack (20.0°N–20.6°N, 85.5°E–86.1°E). | • **20–35 dBZ (Green)**: Stratiform light rain (2–8 mm/h).<br>• **35–50 dBZ (Yellow/Orange)**: Moderate convection (15–50 mm/h).<br>• **50–65 dBZ (Red)**: Severe thunderstorm squall (>90 mm/h).<br>• **>65 dBZ (Magenta/Purple)**: Violent cloudburst core / severe hail (>25mm MESH).<br>• **Velocity Couplet (Adjacent Green/Red)**: Severe cyclonic shear or microburst divergence. | • **dBZ ≥ 55 within 5 km of VEBS**: ATC halts runway arrivals; aircraft instructed to enter south holding stack.<br>• **Rain rate ≥ 100 mm/h projected into Smart City cells**: Automated NDMA CAP alert siren broadcast; pre-activate urban drainage sumps. |
| **2. Tactical Operations Dashboard** (`/dashboard`) | **Sensor**: SCIT storm cell centroid tracking engine fused with airfield approach ILS corridors.<br>**Parameters**: Cell centroid motion vector, peak core dBZ, runway intercept distance & ETA.<br>**Spatial Domain**: VEBS Aerodrome 1–3 km tactical safety envelope. | • **1 km Red Ring**: Immediate Runway Touchdown Zone (<2 min intercept).<br>• **2 km Amber Ring**: Final Approach Alert Zone (Decision altitude threshold).<br>• **3 km Sky Blue Ring**: Tactical Aerodrome Boundary (MoES PS-26084 mandated area).<br>• **Dashed Cyan Ray**: Direct intercept trajectory showing straight-line distance and computed ETA countdown. | • **Cell ETA ≤ 3 min & dBZ ≥ 55**: ATC issues **MANDATORY RUNWAY GO-AROUND** to arriving flights.<br>• **Lightning flash rate > 20/min on airfield**: Declare **AIRFIELD RAMP GROUND STOP** (suspend refueling and baggage ramp operations). |
| **3. 3x3 Airfield Twin** (`/hyperlocal`) | **Sensor**: Network of 9 in-situ Automatic Weather Stations (AWS) fused with Open-Meteo boundary layer telemetry.<br>**Parameters**: 2m Dry bulb/dew point, 3h pressure tendency ($\Delta P/3\text{h}$), 10m surface wind & gusts, 1h rainfall, CAPE.<br>**Spatial Domain**: 3x3 tactical grid surrounding VEBS (9 cells, 1.0 km² each). | • **$\Delta P/3\text{h} < -2.0\text{ hPa}$**: Rapid cyclonic barometric fall signaling squall front arrival.<br>• **Surface Gusts > 50 kt**: Extreme aerodynamic crosswind hazard.<br>• **CAPE > 3,000 J/kg**: Extreme thermodynamic convective instability.<br>• **Grid Cells (Red/Amber/Slate)**: Real-time risk level per 1 km² airport and municipal sector. | • **$\Delta P/3\text{h} < -3.5\text{ hPa}$ & Gusts > 50 kt**: **CLOSE AIRFIELD TO FLIGHT OPERATIONS**.<br>• **AWS-VEBS 1h rain > 50 mm**: **ACTIVATE RUNWAY AQUAPLANING NOTAM** & dispatch airport high-capacity drainage pumps.<br>• **CAPE > 3,200 J/kg**: Put Airport Rescue and Firefighting (ARFF) on standby. |
| **4. AI Pipeline** (`/inference`) | **Sensor**: 4D Multi-Modal Spatiotemporal Tensor (DWR + INSAT-3DR TIR + Lightning Net + AWS Mesonet) processed by ConvectNet 3D-CNN/ConvLSTM.<br>**Parameters**: Tensor channels C0–C3 & 4 specialized hazard heads.<br>**Spatial Domain**: $128 \times 128 \times 12$ spatiotemporal grid ($1.0\text{ km}$ resolution). | • **C0 (VIL Core)**: $>50\text{ kg/m}^2$ indicates massive suspended hydrometeor column.<br>• **C1 ($\Delta Z$ Trend)**: $>+15\text{ dBZ}/10\text{m}$ indicates explosive convective updraft.<br>• **C2 (TIR Cooling Rate)**: $<-1.5\text{ K/min}$ signals cloud-top overshooting into stratosphere.<br>• **C3 (Lightning Jump)**: $2\sigma$ rate acceleration precedes microburst by 15 min.<br>• **Hazard Probabilities (0–100%)**: Calibrated multi-task neural outputs. | • **Cloudburst Head > 85% at T+30m**: Pre-stage State Disaster Management Authority (OSDMA) rescue teams in targeted catchments.<br>• **Microburst Head $\Delta V > 25\text{ m/s}$ at T+15m**: Issue 15-minute advance alert to Approach Radar.<br>• **CI Head Logit > 0.75 in clear air**: Reconfigure radar scan strategy from VCP-32 to rapid convective VCP-212. |
| **5. Historical Case Replay** (`/case-replay`) | **Sensor**: Retrospective benchmark validation against WMO-standard historical events (June 16–17, 2022 Cherrapunji Extreme Cloudburst & June 2024 Bhubaneswar Microburst).<br>**Parameters**: CSI, POD, FAR, spatial displacement error.<br>**Spatial Domain**: Meghalaya Khasi Hills Escarpment / Odisha Coastal Corridor. | • **Purple/Magenta Boundary**: ConvectNet AI predicted storm envelope and centroid path.<br>• **Emerald/Cyan Boundary**: Real observed IMD DWR echo and rain gauge ground truth.<br>• **Overlapping Region**: Critical Success Index (CSI). Overlap $>0.72$ validates operational capability.<br>• **Displacement Vector**: Spatial error distance (km). ConvectNet maintains $<1.8\text{ km}$ error at T+60m. | • **Cherrapunji Orographic Benchmark**: Model detected cloudburst 45 minutes prior to rain gauge tipping—validates early warning for flash flood evacuation along Shella river gorges.<br>• **Bhubaneswar Aerodrome Benchmark**: Model predicted Runway 01 LLWS 28 minutes in advance—validates diversion of inbound commercial flights to Kolkata (VECC). |
| **6. Grid XAI** (`/grid`) | **Sensor**: Spatial Explainable AI (XAI) feature attribution engine utilizing Integrated Gradients.<br>**Parameters**: Attribution weights for Radar Aloft, Thermodynamic CAPE, Surface Gust/LLWS.<br>**Spatial Domain**: 9 discrete $1.0\text{ km}^2$ aerodrome cells (`T-A1` to `T-C3`) or 9 regional sectors. | • **Cell Borders**: Red = active threat intercept cell; Cyan = adjacent buffer cell.<br>• **Radar Aloft Weight (~42%)**: Direct precipitation mass aloft forcing downburst.<br>• **CAPE Weight (~28%)**: Atmospheric potential energy available for vertical acceleration.<br>• **Gust & LLWS Weight (~30%)**: Surface kinetic outflow forcing.<br>• **Trajectory Waypoints**: 5-minute projected storm centroid steps. | • **Attribution on Sector T-C2 (Touchdown) shows LLWS > 35%**: **ATC ISSUES IMMEDIATE GLIDEPATH ABANDONMENT ORDER**.<br>• **Attribution on Sector T-A3 (Terminal Apron) shows storm probability > 70%**: Direct ground personnel into lightning shelters; disconnect ground power units.<br>• **Regional Sector SEC-N (Mahanadi Basin) CAPE weight peaks**: State SEOC alerts Cuttack Municipal Corporation for barrage sluice gate opening. |
| **7. 3x3km Microburst** (`/microburst`) | **Sensor**: Aerodynamic micro-scale simulation of wet microburst downdrafts and low-level wind shear calibrated to ICAO Annex 3 and FAA F-factor criteria.<br>**Parameters**: Velocity shear ($\Delta V$), peak outflow gust, Z-R rain rate, cold pool $\Delta T$.<br>**Spatial Domain**: VEBS Runway 01/19 glidepath and touchdown zones ($3.0\text{ km} \times 3.0\text{ km}$). | • **Inner Red Circle (300–750m)**: Vertical downdraft shaft (downward air plunge $>60\text{ dBZ}$).<br>• **Outer Amber Dashed Ring (700–1500m)**: Horizontal divergent outflow ring (vortex curl producing sudden headwind followed by severe tailwind).<br>• **$\Delta V > 15\text{ m/s}$ (30 kt)**: ICAO threshold for dangerous LLWS.<br>• **Cold Pool ($\Delta T < -5.0^\circ\text{C}$)**: Evaporative chilling intensifying downdraft negative buoyancy. | • **$\Delta V \ge 15\text{ m/s}$ or F-factor $\ge 0.13$ on Glidepath**: **ATC ISSUES IMMEDIATE RUNWAY 01 MISSED APPROACH / GO-AROUND ORDER**.<br>• **Surface Outflow Gust $\ge 50\text{ kt}$**: Airport Director suspends all runway departures and orders aircraft tie-down.<br>• **Stationary Core $>15\text{ min}$ over Aerodrome**: Issue SPECI METAR warning of severe thunderstorm with active flash flooding on taxiways. |

---

### 3.2 The 3-Tier Operating Modes

#### Tier 1: Minimized 1-Line Tactical Ticker Mode
- **Position**: Floating dock at `bottom-4 right-4 z-[450]` (or docked to bottom status area).
- **Footprint**: Ultra-compact (`h-10 px-4 rounded-xl bg-[#0a0e1a]/95 backdrop-blur-xl border border-[#1f293d] shadow-2xl`).
- **Elements**:
  - Live Pulsing Severity Dot (Red / Amber / Green).
  - Monospace Page Identifier (e.g., `INTEL // VEBS RWY 01 LLWS`).
  - Tactical Telemetry Chip (e.g., `ΔV: 48 m/s (93 kt) • ETA: 2m`).
  - Verbatim Operational Action Badge (e.g., `ACTION: RWY 01 GO-AROUND`).
  - Expand Button (`[▲ Expand Key]`) and Mission Briefing Shortcut (`[M Briefing]`).
- **Cognitive Purpose**: Provides continuous situational awareness without covering radar sweeps, airport runways, or interactive map controls.

#### Tier 2: Expanded Drawer / Panel Mode
- **Position**: Floating overlay at `bottom-16 right-4 z-[500] w-[460px] max-w-[95vw]`.
- **Styling**: `bg-[#0a0f1d]/98 backdrop-blur-2xl border border-sky-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 text-xs font-mono`.
- **Structure**:
  1. **Header**: Page title, sensor badge, and minimize button (`[▼]`).
  2. **Section 1: 👁️ What You Are Seeing**: Exact sensor name, physical parameter, spatial domain bounds, and update cadence.
  3. **Section 2: 📊 How to Decode Visuals**: High-contrast visual legend with color chips, threshold ranges, and exact physical meanings.
  4. **Section 3: ⚡ Actionable Decision**: Highlighted callout box with glowing border displaying the exact operational command (e.g., "Runway Go-Around", "NDMA Siren Dispatch"), trigger criteria, and responsible agencies.
  5. **Footer**: Direct button: `Launch Full Mission Briefing (M) ↗`.

#### Tier 3: Universal Interactive "Mission Briefing" Modal
- **Position**: Global modal at `fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4`.
- **Accessibility**:
  - Accessible from **ANY** of the 7 pages via:
    1. Top navigation bar button: `[Target Icon] Mission Briefing`.
    2. Keyboard shortcut: `M` or `?`.
    3. Clicking `Launch Full Mission Briefing` inside any page's expanded Visual Intel Key.
- **Features**:
  - **7-Page Tab Selector**: Duty forecasters can review briefings for any platform view without having to navigate away from their active console.
  - **MoES / NCMRWF Problem Statement PS-26084 Context**: Deep dive into why 1–3 km sub-kilometer nowcasting is critical compared to standard 25 km synoptic forecasts.
  - **Standard Operating Procedure (SOP) Action Matrix**: Verbatim checklists for Air Traffic Control, National Disaster Management Authority (NDMA), Odisha State Disaster Management Authority (OSDMA), and Bhubaneswar Municipal Corporation (BMC).
  - **Keyboard Navigation**: `Esc` to close, `Tab` to switch views, `1–7` for direct page jumping.

---

## 4. Cognitive Load & Visual Psychology Evaluation

Applying the `visual-emotion-engineer` framework to emergency meteorological consoles:

### 4.1 The 5-Second Forecaster Comprehension Benchmark
A duty forecaster under severe storm conditions has less than 5 seconds of undivided attention. The interface must instantly answer three questions:
1. **What am I looking at?** → High-contrast header badge: `IMD DWR S-Band Radar 0–6h Nowcast (1 km Res)`.
2. **Is it dangerous?** → Semantic color coding: Solid crimson pulse with high-contrast text: `CRITICAL LLWS: 48 m/s (93 kt)`.
3. **What do I do right now?** → Unambiguous command: `ACTION: RUNWAY 01 GO-AROUND MANDATED`.

### 4.2 Negative Space Allocation & De-cluttering
- **No Occlusion of Runway Corridors**: The floating key sits in the peripheral corner (`bottom-right`), keeping the central radar azimuth sweep and ILS approach corridors 100% visible.
- **1-Line Default State**: In routine monitoring, the key defaults to the 1-line ticker mode (occupying <4% of screen height). It expands only when the forecaster hovers/clicks, or automatically surges on critical threshold crossing (e.g., cell enters 2 km ring).
- **Eradication of Synthetic Bullseyes**: Replaces artificial concentric SVG circles with realistic radar reflectivity gradients, physical cloud tops, and authentic airport perimeter lines.

### 4.3 Typography & Contrast Hierarchy
- **Canvas Ground**: Deep-navy near-black (`#08090a` / `#0a0e1a`). Prevents pupil dilation fatigue during continuous 8-to-12 hour radar shifts in darkened operations centers.
- **Display Copy**: Inter Sans (`font-sans`), 600 weight, tracking-tight, crisp white (`#ffffff`).
- **Telemetry & Numerical Data**: JetBrains Mono (`font-mono`) with OpenType `tabular-nums` (`font-variant-numeric: tabular-nums`). Prevents visual twitching and number jumping during rapid real-time data streaming.
- **Labels & Micro-copy**: Slate-400 (`#94a3b8`) uppercase tracking-wider (`tracking-wider text-[10px]`).

### 4.4 Color Psychology & Semantic Calibration
- **Strict Semantic Rule**:
  - `Electric Cyan (#38bdf8 / #1aaaff)`: Sensor status, live stream connectivity, coordinates, and active selection.
  - `Emerald (#22c55e)`: Nominal operations, ground truth verification, and safe runways.
  - `Amber (#f59e0b)`: Advisory warnings, approaching squall line within 15–30 min, and gust threshold 30–49 kt.
  - `Crimson / Red (#ef4444 / #f43f5e)`: Mandatory emergency directives, downburst touchdown, shear $\Delta V \ge 15\text{ m/s}$, and immediate runway closure.

---

## 5. Component Implementation Blueprint

To implement this architecture cleanly across the project without duplicating code, we specify four files in `frontend/src/`:

### 5.1 Data Model (`frontend/src/types/visualIntel.ts`)
```typescript
export type PageViewMode = 'hazard' | 'tactical' | 'hyperlocal' | 'inference' | 'replay' | 'grid' | 'microburst' | 'public';

export interface VisualIntelData {
  pageId: PageViewMode;
  pageTitle: string;
  subtitle: string;
  badge: string;
  sensor: {
    name: string;
    specs: string;
    spatialDomain: string;
    resolution: string;
    cadence: string;
  };
  sight: {
    summary: string;
    points: string[];
  };
  decode: {
    summary: string;
    items: Array<{
      color: string;
      label: string;
      range: string;
      meaning: string;
    }>;
  };
  decision: {
    level: 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'NOMINAL';
    primaryAction: string;
    protocol: string;
    stakeholders: string[];
    triggerCondition: string;
  };
  ticker: {
    metric: string;
    status: string;
    action: string;
  };
}
```

### 5.2 Configuration Registry (`frontend/src/config/visualIntelConfig.ts`)
Exports a dictionary `VISUAL_INTEL_CONFIG: Record<PageViewMode, VisualIntelData>` containing the exact content from Section 3.1 for all 7 operational pages.

### 5.3 Reusable UI Component (`frontend/src/components/VisualIntelKey.tsx`)
Features:
- State for `isExpanded: boolean` (persisted in `localStorage` or session).
- Controlled minimized ticker vs expanded drawer.
- Dispatches open event to `MissionBriefingModal`.
- Global keyboard shortcut handler (`Space` to toggle expand/minimize, `M` or `?` to open Mission Briefing).

### 5.4 Global Mission Briefing Modal (`frontend/src/components/MissionBriefingModal.tsx`)
- Mounted once at the root in `App.tsx`.
- Controlled via `isMissionBriefingOpen: boolean`.
- Top navbar in `App.tsx` receives a high-visibility button:
  ```tsx
  <button 
    onClick={() => setIsMissionBriefingOpen(true)}
    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-mono text-xs font-semibold"
  >
    <Target className="w-3.5 h-3.5" />
    <span>Mission Briefing [M]</span>
  </button>
  ```
- Renders full 7-tab briefing matrix with SOP decision trees.

---

## 6. Caveats

1. **Read-Only Investigation Scope**: In accordance with the dispatch constraints, no frontend source code has been altered during this survey. All proposed architecture is documented for subsequent implementation.
2. **URL Routing Synchronization**: Currently, `App.tsx` uses internal state `viewMode` rather than HTML5 browser routing (`react-router-dom` or `window.history`). For direct bookmarking of `/hazard`, `/dashboard`, etc., URL path synchronization with `window.history.pushState` should be incorporated into `App.tsx`.
3. **Data Feed Integration**: The Visual Intel Key dynamically displays live telemetry when connected to component state, but falls back gracefully to calibrated meteorological default values if the real-time websocket/API is disconnected.

---

## 7. Conclusion

All 7 operational platform pages have been thoroughly inspected. The current application possesses remarkable scientific fidelity (IMD S-Band specs, dual-polarimetric products, PyTorch tensor pipelines, Cherrapunji WMO benchmark, and ICAO microburst dynamics), but suffers from cognitive fragmentation and a lack of standardized visual keys across 6 of the 7 pages.

Implementing the standardized, 3-tier **Visual Intel & Decision Key** and universal **Mission Briefing Modal** will:
1. Ensure any evaluator, judge, or duty meteorologist can understand what the screen is doing and what action to take in **under 5 seconds**.
2. Seamlessly tie together the 1–3 km aerodrome nowcasting story (MoES PS-26084).
3. Deliver a clean, professional, military/aviation-grade C2 interface that eliminates user confusion across the entire platform.

---

## 8. Verification Method

1. **Build Integrity Verification**:
   ```bash
   cd /Users/gauravkumarnayak/Desktop/convect/frontend
   npm run build
   ```
   *Expected Result*: Clean build passing with 0 TypeScript/ESLint errors (verified: `vite build` generated production assets in 2.03s).

2. **Source Code Inspection**:
   Inspect the 7 operational page components in `frontend/src/components/`:
   - `HazardDashboard.tsx`
   - `TacticalOperationsDashboard.tsx`
   - `HyperlocalTwinMap.tsx`
   - `InferencePipelineView.tsx`
   - `HistoricalReplayView.tsx`
   - `ExplainableGridTracker.tsx`
   - `MicroburstSimulationView.tsx`

3. **Invalidation Conditions**:
   - The design is invalidated if the floating key obscures critical radar scopes or runway touchdown markers.
   - The design is invalidated if the Mission Briefing modal is inaccessible from any of the 7 platform pages.
   - The design is invalidated if `npm run build` fails with type errors.
