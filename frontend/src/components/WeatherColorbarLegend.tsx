import React from 'react';
import { WeatherMapFormat } from './WeatherRasterOverlay';
import { useRainViewerRadar } from '../hooks/useRainViewerRadar';
import { useLiveAtmosphericData } from '../hooks/useLiveAtmosphericData';

export interface WeatherColorbarLegendProps {
  format: WeatherMapFormat;
  radarTimestamp?: string | null;
  className?: string;
}

/**
 * Floating Calibrated Colorbars for Multi-Layer Meteorological Raster Feeds
 * Accurately displays calibrated physical units for:
 * - Doppler Radar Reflectivity (dBZ)
 * - INSAT-3DR Thermal IR (10.8µm TIR-1 Grayscale / Kelvin)
 * - Thermal IR Brightness Temperature (Kelvin [K], Dvorak BD-curve)
 * - Live Surface 2m Temperature (°C / Kelvin)
 * - Live Atmospheric Pressure (MSLP hPa & Isobars)
 * - Live Relative Humidity (% RH & Saturation)
 * - Enhanced Convective Cloud Canopy
 */
export const WeatherColorbarLegend: React.FC<WeatherColorbarLegendProps> = ({
  format,
  radarTimestamp,
  className = '',
}) => {
  // Pull live telemetry from hooks to display real-time physical readings in legend
  const rainViewer = useRainViewerRadar(300000);
  const liveMeteo = useLiveAtmosphericData(300000);

  if (format === 'satellite' || format === 'dark') {
    return null;
  }

  const effectiveRadarTime = radarTimestamp || rainViewer.timeFormatted;

  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[450] bg-[#0a0e1a]/95 backdrop-blur-md border border-[#1f293d] rounded-xl px-4 py-2.5 shadow-2xl flex flex-col items-center pointer-events-auto transition-all ${className}`}
    >
      {/* 1. DOPPLER RADAR REFLECTIVITY (dBZ) - Live RainViewer / IMD DWR */}
      {(format === 'radar' || format === 'dwr_radar') && (
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center justify-between w-80 text-[10px] font-mono text-slate-300">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Doppler Radar (dBZ)
            </span>
            <span className="text-purple-400 font-bold">&gt; 65 dBZ (Hail / Core)</span>
          </div>
          <div className="w-80 h-3 rounded-full overflow-hidden border border-white/20 shadow-inner bg-gradient-to-r from-[#0284c7] via-[#22c55e] via-[#eab308] via-[#f97316] via-[#ef4444] to-[#9333ea]" />
          <div className="flex justify-between w-80 text-[9px] font-mono text-slate-400 px-0.5">
            <span>15</span>
            <span>25</span>
            <span>35</span>
            <span>45</span>
            <span>55</span>
            <span>60</span>
            <span>65+ dBZ</span>
          </div>
          <div className="text-[9px] font-mono text-emerald-400/90 pt-0.5 flex items-center gap-2">
            <span>📡 RainViewer Live Mosaic</span>
            {effectiveRadarTime && <span>• Scan: {effectiveRadarTime}</span>}
          </div>
        </div>
      )}

      {/* 2. INSAT-3DR THERMAL IR (10.8µm Grayscale) */}
      {format === 'insat_ir' && (
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center justify-between w-72 text-[10px] font-mono text-slate-300">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
              INSAT-3DR 10.8µm TIR-1
            </span>
            <span className="text-white font-bold">&lt; 190 K (Overshoot)</span>
          </div>
          <div className="w-72 h-3 rounded-full overflow-hidden border border-white/20 shadow-inner bg-gradient-to-r from-[#000000] via-[#475569] via-[#94a3b8] via-[#cbd5e1] to-[#ffffff]" />
          <div className="flex justify-between w-72 text-[9px] font-mono text-slate-400 px-0.5">
            <span>+30°C (303K)</span>
            <span>0°C (273K)</span>
            <span>-40°C (233K)</span>
            <span>-65°C</span>
            <span>&lt;-85°C</span>
          </div>
          <div className="text-[9px] font-mono text-sky-400/80 pt-0.5">
            🛰️ Official IMD Geoserver WMS Stream
          </div>
        </div>
      )}

      {/* 3. THERMAL IR BRIGHTNESS TEMPERATURE [K] (Dvorak BD-Curve Rainbow) */}
      {format === 'ir_rainbow' && (
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center justify-between w-80 text-[10px] font-mono text-slate-300">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
              Brightness Temp [K]
            </span>
            <span className="text-rose-400 font-bold">&lt; 185 K (Overshooting)</span>
          </div>
          <div className="w-80 h-3.5 rounded-full overflow-hidden border border-white/20 shadow-inner bg-gradient-to-r from-[#1d4ed8] via-[#06b6d4] via-[#22c55e] via-[#eab308] via-[#f97316] via-[#ef4444] to-[#7f1d1d]" />
          <div className="flex justify-between w-80 text-[9px] font-mono text-slate-400 px-0.5">
            <span>240 K</span>
            <span>230 K</span>
            <span>220 K</span>
            <span>210 K</span>
            <span>200 K</span>
            <span>190 K</span>
            <span>&lt;185 K</span>
          </div>
          <div className="text-[9px] font-mono text-sky-400/80 pt-0.5">
            🌈 Dvorak BD-Curve Convective Cloud Top Calibration
          </div>
        </div>
      )}

      {/* 4. LIVE 2M SURFACE HEAT / TEMPERATURE FIELD */}
      {format === 'temperature' && (
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center justify-between w-80 text-[10px] font-mono text-slate-300">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Surface 2m Temperature (°C / K)
            </span>
            <span className="text-rose-400 font-bold">&gt; 40°C (313 K)</span>
          </div>
          <div className="w-80 h-3 rounded-full overflow-hidden border border-white/20 shadow-inner bg-gradient-to-r from-[#0d9488] via-[#0284c7] via-[#84cc16] via-[#eab308] via-[#f97316] via-[#ef4444] to-[#991b1b]" />
          <div className="flex justify-between w-80 text-[9px] font-mono text-slate-400 px-0.5">
            <span>20°C (293K)</span>
            <span>24°C</span>
            <span>28°C</span>
            <span>32°C</span>
            <span>36°C</span>
            <span>40°C+</span>
          </div>
          <div className="text-[9px] font-mono text-amber-400/90 pt-0.5 flex items-center gap-2">
            <span>🌡️ Live Open-Meteo &amp; AWS Grid</span>
            <span>• VEBS Ground: {liveMeteo.currentTempC.toFixed(1)}°C ({Math.round(liveMeteo.currentTempC + 273.15)}K)</span>
          </div>
        </div>
      )}

      {/* 5. LIVE ATMOSPHERIC PRESSURE (MSLP) & ISOBARS */}
      {format === 'pressure' && (
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center justify-between w-80 text-[10px] font-mono text-slate-300">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              MSLP Barometric Isobars (hPa)
            </span>
            <span className="text-amber-400 font-bold">&gt; 1016 hPa (Ridge)</span>
          </div>
          <div className="w-80 h-3 rounded-full overflow-hidden border border-white/20 shadow-inner bg-gradient-to-r from-[#4f46e5] via-[#0284c7] via-[#06b6d4] via-[#10b981] via-[#eab308] to-[#d97706]" />
          <div className="flex justify-between w-80 text-[9px] font-mono text-slate-400 px-0.5">
            <span>&lt;1004 (L)</span>
            <span>1007</span>
            <span>1010</span>
            <span>1013</span>
            <span>1016+ hPa</span>
          </div>
          <div className="text-[9px] font-mono text-indigo-400/90 pt-0.5 flex items-center gap-2">
            <span>🧭 Dynamic Isobars &amp; Mesolows</span>
            <span>• VEBS Station: {liveMeteo.currentPressureHpa.toFixed(1)} hPa</span>
          </div>
        </div>
      )}

      {/* 6. LIVE RELATIVE HUMIDITY (%) & WATER VAPOR */}
      {format === 'humidity' && (
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center justify-between w-80 text-[10px] font-mono text-slate-300">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Relative Humidity (% RH)
            </span>
            <span className="text-fuchsia-400 font-bold">100% Saturation</span>
          </div>
          <div className="w-80 h-3 rounded-full overflow-hidden border border-white/20 shadow-inner bg-gradient-to-r from-[#b45309] via-[#65a30d] via-[#10b981] via-[#0284c7] via-[#6366f1] to-[#c026d3]" />
          <div className="flex justify-between w-80 text-[9px] font-mono text-slate-400 px-0.5">
            <span>40% (Dry)</span>
            <span>60%</span>
            <span>75%</span>
            <span>85%</span>
            <span>95%</span>
            <span>100% (Updraft)</span>
          </div>
          <div className="text-[9px] font-mono text-cyan-400/90 pt-0.5 flex items-center gap-2">
            <span>💧 Boundary Layer Saturation</span>
            <span>• VEBS Current: {liveMeteo.currentHumidityPct.toFixed(0)}% RH</span>
          </div>
        </div>
      )}

      {/* 7. ENHANCED CLOUD CANOPY */}
      {format === 'enhanced_cloud' && (
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center justify-between w-72 text-[10px] font-mono text-slate-300">
            <span className="font-bold text-sky-400">Cloud Moisture Canopy</span>
            <span className="text-purple-400 font-bold">Storm Core</span>
          </div>
          <div className="w-72 h-3 rounded-full overflow-hidden border border-white/20 shadow-inner bg-gradient-to-r from-transparent via-[#38bdf8] via-[#0284c7] via-[#2563eb] to-[#7c3aed]" />
          <div className="flex justify-between w-72 text-[9px] font-mono text-slate-400 px-0.5">
            <span>Clear Sky</span>
            <span>Cirrus Haze</span>
            <span>High Canopy</span>
            <span>Convective Core</span>
          </div>
          <div className="text-[9px] font-mono text-sky-400/80 pt-0.5">
            ☁️ Windy / RainViewer Convective Infrared Style
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherColorbarLegend;
