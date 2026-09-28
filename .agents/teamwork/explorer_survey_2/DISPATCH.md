# Dispatch for Explorer 2: Live Multi-Layer Meteorological Raster Feeds & Switcher

You are Explorer 2 (teamwork_preview_explorer).
Your working directory is: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_2/
You must read ORIGINAL_REQUEST.md: /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md

## Scope & Objective
Survey the repository at /Users/gauravkumarnayak/Desktop/convect with focus on Live Raster Feeds and Switcher:
1. Live Thermal IR Satellite: IMD INSAT-3DR Thermal IR (10.8µm) WMS stream (`https://reactjs.imd.gov.in/geoserver/imd/wms?LAYERS=imd:insat_ir`).
2. Live Doppler Radar Reflectivity: RainViewer Open Radar API (`/v2/radar/{ts}/256/{z}/{x}/{y}/2/1_1.png` fetched via RainViewer API timestamps) and IMD DWR WMS. Verify tile fetching, Leaflet integration, CORS handling, fallback mechanisms.
3. Live Surface Heat / Temperature Field: 2m thermal raster field with smooth meteorological gradient and calibrated °C / Kelvin colorbar (Open-Meteo or raster overlay).
4. Live Atmospheric Pressure (MSLP) & Isobars: MSLP field with dynamic isobar contour lines (hPa) identifying surface mesolows and gust front cold pools.
5. Live Humidity & Water Vapor: Relative humidity (%) and mid-tropospheric water vapor saturation contours.
6. Multi-Format Weather Switcher: Sleek header selector allowing instantaneous toggling between Satellite IR, Doppler Radar, Heat Map, Pressure Isobars, and Humidity, plus calibrated floating colorbars with physical units.

Examine existing data services, API clients, mock data, and Leaflet layer integration in the codebase.
Write your findings and comprehensive survey report to:
/Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_2/handoff.md
Update your progress.md periodically.
Send a message back to the orchestrator when complete.

## 2026-09-28T01:16:09Z
User Request received:
You are Explorer 2. Your working directory is /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_2/.
Read /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md and /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_2/DISPATCH.md.
Investigate how to integrate live meteorological raster feeds into /Users/gauravkumarnayak/Desktop/convect:
1. Live Thermal IR Satellite: IMD INSAT-3DR Thermal IR (10.8µm) WMS stream (https://reactjs.imd.gov.in/geoserver/imd/wms?LAYERS=imd:insat_ir).
2. Live Doppler Radar Reflectivity: RainViewer Open Radar API (/v2/radar/{ts}/256/{z}/{x}/{y}/2/1_1.png via API timestamps) and IMD DWR WMS. Verify tile fetching, Leaflet integration, CORS, and fallback.
3. Live Surface Heat / Temperature Field (2m thermal raster field, °C / Kelvin colorbar).
4. Live MSLP Atmospheric Pressure & dynamic isobars (hPa).
5. Live Relative Humidity (%) & mid-tropospheric water vapor saturation.
6. Multi-Format Weather Switcher & floating calibrated colorbars with physical units.
Inspect current weather services, API clients, and map layers.
Write your complete survey report to /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/explorer_survey_2/handoff.md and notify the orchestrator with send_message.
