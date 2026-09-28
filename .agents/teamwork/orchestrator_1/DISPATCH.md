# Dispatch Log

## 2026-09-28T01:14:54Z

You are the Project Orchestrator for the project located at /Users/gauravkumarnayak/Desktop/convect.
Your working directory is /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/orchestrator_1/.
You must read and strictly satisfy all user requirements defined in /Users/gauravkumarnayak/Desktop/convect/.agents/teamwork/ORIGINAL_REQUEST.md:

1. R1. Live Multi-Layer Meteorological Raster Feeds:
- Live Thermal IR Satellite: IMD INSAT-3DR Thermal IR (10.8µm) WMS stream (https://reactjs.imd.gov.in/geoserver/imd/wms?LAYERS=imd:insat_ir).
- Live Doppler Radar Reflectivity: Real composite Doppler radar tiles (RainViewer Open Radar API /v2/radar/{ts}/256/{z}/{x}/{y}/2/1_1.png and IMD DWR WMS) displaying genuine precipitation echoes across Odisha/India rather than synthetic circles.
- Live Surface Heat / Temperature Field: Real 2m thermal raster field with smooth meteorological gradient and calibrated °C / Kelvin colorbar.
- Live Atmospheric Pressure (MSLP) & Isobars: Real mean sea level pressure field with dynamic isobar contour lines (hPa) identifying surface mesolows and gust front cold pools.
- Live Humidity & Water Vapor: Real relative humidity (%) and mid-tropospheric water vapor saturation contours.
- Multi-Format Weather Switcher: Sleek header selector allowing instantaneous toggling between Satellite IR, Doppler Radar, Heat Map, Pressure Isobars, and Humidity.

2. R2. De-cluttering & Eradication of "AI-looking" Fake Circles:
- Eliminate all artificial geometric SVG bullseyes and concentric circles that look fake or AI-generated.
- Replace them with continuous physical fields, realistic smoothed radar reflectivity contours, genuine convective cores, and calibrated meteorological color scales (Dvorak/BD-curve, IMD dBZ standard).
- Retain only functional operational markings: the 1–3 km runway safety perimeter rings, velocity motion arrows, and target intercept rays.

3. R3. Universal Visual Intelligence & Decision Key on Every Page:
- Implement a standardized, collapsible "Visual Intel & Decision Key" on all 7 platform pages (/hazard, /dashboard, /hyperlocal, /inference, /case-replay, /grid, /microburst).
- Decodes what is seen (sensor, physical parameter, spatial domain), how to decode visuals (colors, symbols, units), and actionable decisions (runway go-around, ground stop, NDMA CAP siren dispatch, urban drainage pre-activation, etc.).

4. R4. Cognitive Load & Visual Psychology Optimization:
- Minimize visual noise and cognitive overload.
- Provide generous negative space, clear visual hierarchy, high-contrast typography.
- Floating keys can be minimized to a 1-line tactical ticker or expanded to a full mission briefing modal.

5. Acceptance Criteria:
- No geometric concentric SVG circles or artificial bullseyes appear on the map canvas.
- Live INSAT-3DR satellite WMS and RainViewer live radar tiles stream into Leaflet without CORS errors or broken tile requests.
- Layer switcher toggles cleanly between Thermal IR, Doppler Radar, Heat, Pressure, and Humidity.
- Floating calibrated colorbars display for each layer with accurate physical units.
- Every one of the 7 operational pages features an accessible, non-intrusive Visual Intel & Decision Key.
- Any evaluator, judge, or duty forecaster can understand what the screen is doing and what action to take in under 5 seconds.
- The full interactive "Mission Briefing" modal is accessible from any view.
- `npm run build` passes with 0 TypeScript/ESLint errors.

Plan the work, decompose into milestones, dispatch specialized workers under .agents/teamwork/, review their changes, maintain progress in progress.md, and ensure complete end-to-end verification. Report back to the Sentinel when done.
