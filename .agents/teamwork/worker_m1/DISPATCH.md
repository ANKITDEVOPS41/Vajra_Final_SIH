# Dispatch for Worker M1: Live Multi-Layer Meteorological Raster Feeds & Switcher

You are Worker M1 (teamwork_preview_worker).
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_m1/
You must read ORIGINAL_REQUEST.md: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md
Also read the survey reports:
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_1/handoff.md
- /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_1/PROJECT.md

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You exclusively own and may edit:
- `frontend/src/components/WeatherRasterOverlay.tsx`
- `frontend/src/components/WeatherFormatSelector.tsx`
- `frontend/src/components/WeatherColorbarLegend.tsx`
- `frontend/src/hooks/useRainViewerRadar.ts` (if creating a custom hook)
- Any new utility or type files under `frontend/src/types/` or `frontend/src/utils/` related to weather raster feeds.
Do NOT edit other components without orchestrator approval.

## Requirements
1. **Live Thermal IR Satellite**:
   - Stream official IMD INSAT-3DR Thermal IR (10.8µm) WMS stream (`https://reactjs.imd.gov.in/geoserver/imd/wms?LAYERS=imd:insat_ir`).
   - Use Leaflet `WMSTileLayer` with proper transparent PNG format, CRS EPSG:4326/EPSG:3857, and graceful fallback if government servers experience latency.
2. **Live Doppler Radar Reflectivity**:
   - Stream genuine RainViewer Open Radar API tiles (`https://tilecache.rainviewer.com/v2/radar/{path}/256/{z}/{x}/{y}/2/1_1.png`) by fetching the latest timestamp path from `https://api.rainviewer.com/public/weather-maps.json` on mount and refreshing periodically.
   - Smooth composite Doppler radar tiles over Odisha/India, displaying genuine precipitation echoes.
3. **Live Surface Heat / Temperature Field**:
   - Real 2m thermal raster field with smooth meteorological gradient and calibrated °C / Kelvin colorbar. Use Open-Meteo live API / in-situ AWS station data.
4. **Live Atmospheric Pressure (MSLP) & Isobars**:
   - Real mean sea level pressure field with dynamic isobar contour lines (hPa) identifying surface mesolows and gust front cold pools.
5. **Live Humidity & Water Vapor**:
   - Real relative humidity (%) and mid-tropospheric water vapor saturation contours.
6. **Multi-Format Weather Switcher**:
   - Sleek header selector allowing instantaneous toggling between Satellite IR, Doppler Radar, Heat Map, Pressure Isobars, and Humidity (plus Satellite HD and Dark Canvas).
7. **Floating Calibrated Colorbars**:
   - Display accurate physical units for each layer (dBZ for Radar, °C / K for Heat, hPa for Pressure, % for Humidity, Kelvin / °C for INSAT IR).
8. **Eradicate Fake Circles**:
   - Completely eliminate all 20 hardcoded concentric `<Circle>` elements in `WeatherRasterOverlay.tsx`.
9. **Verification**:
   - Run `cd /Users/gauravkumarnayak/Desktop/convect/frontend && npm run build` and ensure 0 TypeScript and ESLint errors.
   - Document build command and result in `handoff.md`.

Write your completion report to `/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_m1/handoff.md` and send a message back when done.

## 2026-09-28T01:31:00Z
Implement Milestone 1 (R1. Live Multi-Layer Meteorological Raster Feeds):
- Overhaul WeatherRasterOverlay.tsx, WeatherFormatSelector.tsx, WeatherColorbarLegend.tsx.
- Stream live IMD INSAT-3DR Thermal IR WMS, RainViewer live Doppler radar tiles with timestamp fetching, live 2m Heat/Temp field, live MSLP Pressure isobars, and live Humidity.
- Eradicate the 20 fake concentric <Circle> elements in WeatherRasterOverlay.tsx.
- Ensure floating calibrated colorbars display for each layer with accurate physical units.
- Run `npm run build` in `frontend` and ensure 0 TypeScript/ESLint errors.
Deliver handoff report with passing build command and result to /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/worker_m1/handoff.md and notify orchestrator with send_message.

