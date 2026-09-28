# Original User Request

## 2026-09-28T01:14:17Z

Replace all synthetic geometric "AI-looking" circles with genuine live meteorological satellite and radar raster feeds (IMD INSAT-3DR Thermal IR, RainViewer live Doppler radar mosaic, Open-Meteo live Heat/Temperature, Pressure isobars, and Humidity), and equip every page with a universal, non-intrusive Visual Intelligence & Decision Key so viewers instantly understand what each visual represents and what operational actions to retrieve.

Working directory: /Users/gauravkumarnayak/Desktop/convect
Integrity mode: development

## Requirements

### R1. Live Multi-Layer Meteorological Raster Feeds
Integrate authentic, live meteorological data feeds and raster tile providers:
1. **Live Thermal IR Satellite**: Direct official IMD INSAT-3DR Thermal Infrared (10.8µm) WMS stream (`https://reactjs.imd.gov.in/geoserver/imd/wms?LAYERS=imd:insat_ir`) showing real cloud tops and overshooting convection.
2. **Live Doppler Radar Reflectivity**: Real composite Doppler radar tiles (RainViewer Open Radar API `/v2/radar/{ts}/256/{z}/{x}/{y}/2/1_1.png` and IMD DWR WMS) displaying genuine precipitation echoes across Odisha/India rather than synthetic circles.
3. **Live Surface Heat / Temperature Field**: Real 2m thermal raster field with smooth meteorological gradient and calibrated °C / Kelvin colorbar.
4. **Live Atmospheric Pressure (MSLP) & Isobars**: Real mean sea level pressure field with dynamic isobar contour lines (hPa) identifying surface mesolows and gust front cold pools.
5. **Live Humidity & Water Vapor**: Real relative humidity (%) and mid-tropospheric water vapor saturation contours.
6. **Multi-Format Weather Switcher**: Sleek header selector allowing instantaneous toggling between Satellite IR, Doppler Radar, Heat Map, Pressure Isobars, and Humidity.

### R2. De-cluttering & Eradication of "AI-looking" Fake Circles
Eliminate all artificial geometric SVG bullseyes and concentric circles that look fake or AI-generated.
- Replace them with continuous physical fields, realistic smoothed radar reflectivity contours, genuine convective cores, and calibrated meteorological color scales (Dvorak/BD-curve, IMD dBZ standard).
- Retain only functional operational markings: the 1–3 km runway safety perimeter rings, velocity motion arrows, and target intercept rays.

### R3. Universal Visual Intelligence & Decision Key on Every Page
Implement a standardized, collapsible **"Visual Intel & Decision Key"** on all 7 platform pages:
1. **Hazard GIS (`/hazard`)**: Decodes 0–6h nowcasting horizons, 1 km² grid cells, and radar reflectivity thresholds.
2. **Tactical Operations Dashboard (`/dashboard`)**: Decodes 1–3 km aerodrome safety rings, storm cell cores, and runway intercept ETAs.
3. **3x3 Airfield Twin (`/hyperlocal`)**: Decodes local runway micro-climate, in-situ AWS station measurements, and runway wind shear.
4. **AI Pipeline (`/inference`)**: Decodes the 4D multimodal tensor channels (VIL, reflectivity trend, cooling rate, lightning jump) and ConvectNet neural heads.
5. **Historical Case Replay (`/case-replay`)**: Decodes comparative validation against the June 2022 Cherrapunji extreme cloudburst benchmark.
6. **Grid XAI (`/grid`)**: Decodes spatial explainability attribution weights (radar core vs CAPE vs LLWS).
7. **3x3km Microburst (`/microburst`)**: Decodes 3D runway glidepath headwind/tailwind shear and ICAO F-factor hazard thresholds.

Each key must explicitly and cleanly provide:
- **👁️ What You Are Seeing**: Exact sensor, physical parameter, and spatial domain.
- **📊 How to Decode Visuals**: Clear explanation of colors, symbols, vectors, and units.
- **⚡ Actionable Decision**: The exact operational action (e.g. "Runway Go-Around", "Ground Stop", "NDMA CAP Siren Dispatch", "Urban Drainage Pre-activation").

### R4. Cognitive Load & Visual Psychology Optimization
Following the `visual-emotion-engineer` framework:
- Minimize visual noise and cognitive overload.
- Provide generous negative space, clear visual hierarchy, and high-contrast typography.
- Ensure all floating keys can be minimized to a 1-line tactical ticker or expanded to a full mission briefing modal.

## Acceptance Criteria

### Live Feeds & Visual Authenticity
- [ ] No geometric concentric SVG circles or artificial bullseyes appear on the map canvas.
- [ ] Live INSAT-3DR satellite WMS and RainViewer live radar tiles stream into Leaflet without CORS errors or broken tile requests.
- [ ] Layer switcher toggles cleanly between Thermal IR, Doppler Radar, Heat, Pressure, and Humidity.
- [ ] Floating calibrated colorbars display for each layer with accurate physical units.

### Universal Page Clarity
- [ ] Every one of the 7 operational pages features an accessible, non-intrusive Visual Intel & Decision Key.
- [ ] Any evaluator, judge, or duty forecaster can understand what the screen is doing and what action to take in under 5 seconds.
- [ ] The full interactive "Mission Briefing" modal is accessible from any view.
- [ ] `npm run build` passes with 0 TypeScript/ESLint errors.
