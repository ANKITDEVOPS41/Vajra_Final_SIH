import React from 'react';
import { Activity, Wind, CloudRain, Zap, ShieldAlert, Thermometer, Layers } from 'lucide-react';
import { DataProvenanceBadge } from '../DataProvenanceBadge';

export interface TelemetryMetrics {
  zMax: number;             // dBZ
  coreHeightKm: number;     // km AGL
  updraftVelocity: number;  // m/s (+ up, - down)
  vil: number;              // kg/m2
  vilDensity: number;       // g/m3
  posh: number;             // %
  meshMm: number;           // mm
  rainRateMmh: number;      // mm/h
  cloudTopTempC: number;    // deg C
  lightningRate: number;    // flashes/min
  hazardState: string;
}

interface AITelemetryHUDProps {
  metrics: TelemetryMetrics;
  timeLabel: string;
  className?: string;
}

export const AITelemetryHUD: React.FC<AITelemetryHUDProps> = ({
  metrics,
  timeLabel,
  className = ''
}) => {
  const isUpdraft = metrics.updraftVelocity >= 0;
  const isCloudburst = metrics.rainRateMmh >= 100;
  const isSevereHail = metrics.posh >= 75 || metrics.meshMm >= 30;

  const getHazardStateBadge = (state: string) => {
    switch (state) {
      case 'CLOUDBURST ACTIVE':
        return 'bg-red-950/90 text-red-400 border-red-500/80 animate-pulse';
      case 'SEVERE ALOFT':
        return 'bg-purple-950/90 text-purple-300 border-purple-500/80';
      case 'UPDRAFT SURGE':
        return 'bg-amber-950/90 text-amber-300 border-amber-500/80';
      case 'FLASH FLOOD SURGE':
        return 'bg-blue-950/90 text-blue-300 border-blue-500/80';
      default:
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';
    }
  };

  return (
    <div className={`glass-card-elevated p-3 rounded-xl border border-steel-800 shrink-0 select-none ${className}`}>
      {/* Top Status Header */}
      <div className="flex items-center justify-between pb-2 border-b border-steel-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center">
            <Activity className="w-4 h-4 text-ice-500 animate-pulse" />
            <span className="absolute w-2 h-2 rounded-full bg-ice-500/40 animate-ping" />
          </div>
          <div>
            <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-ice-100 flex items-center space-x-2">
              <span>ConvectNet AI 4D Telemetry HUD</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Hazard State Badge */}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm ${getHazardStateBadge(
              metrics.hazardState
            )}`}
          >
            {metrics.hazardState}
          </span>
          <DataProvenanceBadge source="LIVE" />
          <span className="text-xs font-mono font-bold text-ice-500 bg-ocean-950 px-2 py-0.5 rounded border border-steel-800">
            {timeLabel}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid in JetBrains Mono */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2 mt-2">
        {/* 1. Peak Z Max */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider">
            Peak Z_max
          </span>
          <div className="text-base font-bold font-mono text-ice-100 mt-0.5">
            {metrics.zMax.toFixed(1)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">dBZ</span>
          </div>
        </div>

        {/* 2. Core Altitude */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider">
            Core Alt
          </span>
          <div className="text-base font-bold font-mono text-ice-500 mt-0.5">
            {metrics.coreHeightKm.toFixed(1)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">km</span>
          </div>
        </div>

        {/* 3. Vertical Velocity w */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider flex items-center space-x-1">
            <Wind className="w-2.5 h-2.5" />
            <span>Velocity w</span>
          </span>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              isUpdraft ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {metrics.updraftVelocity > 0
              ? `+${metrics.updraftVelocity.toFixed(1)}`
              : metrics.updraftVelocity.toFixed(1)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">m/s</span>
          </div>
        </div>

        {/* 4. VIL (Vertically Integrated Liquid) */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider flex items-center space-x-1">
            <Layers className="w-2.5 h-2.5 text-blue-400" />
            <span>VIL Mass</span>
          </span>
          <div className="text-base font-bold font-mono text-ice-200 mt-0.5">
            {metrics.vil.toFixed(1)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">kg/m²</span>
          </div>
        </div>

        {/* 5. VIL Density */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider">
            VIL Density
          </span>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              metrics.vilDensity >= 3.5 ? 'text-purple-400' : 'text-ice-100'
            }`}
          >
            {metrics.vilDensity.toFixed(2)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">g/m³</span>
          </div>
        </div>

        {/* 6. Hail POSH & MESH */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider flex items-center space-x-1">
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span>Hail POSH</span>
          </span>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              isSevereHail ? 'text-amber-400' : 'text-ice-100'
            }`}
          >
            {metrics.posh.toFixed(0)}%{' '}
            <span className="text-[10px] text-steel-400 font-normal">
              ({metrics.meshMm.toFixed(0)}mm)
            </span>
          </div>
        </div>

        {/* 7. Rain Rate (Z-R) */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider flex items-center space-x-1">
            <CloudRain className="w-2.5 h-2.5 text-cyan-400" />
            <span>Rain Rate</span>
          </span>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              isCloudburst ? 'text-red-400 animate-pulse font-black' : 'text-ice-100'
            }`}
          >
            {metrics.rainRateMmh.toFixed(0)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">mm/h</span>
          </div>
        </div>

        {/* 8. Cloud-Top Temp (INSAT-3DR) */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider flex items-center space-x-1">
            <Thermometer className="w-2.5 h-2.5 text-blue-300" />
            <span>Cloud Top</span>
          </span>
          <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
            {metrics.cloudTopTempC.toFixed(0)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">°C</span>
          </div>
        </div>

        {/* 9. Lightning Rate */}
        <div className="bg-ocean-900/70 border border-steel-800/80 p-2 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold tracking-wider flex items-center space-x-1">
            <Zap className="w-2.5 h-2.5 text-yellow-400" />
            <span>Lightning</span>
          </span>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              metrics.lightningRate >= 60 ? 'text-yellow-400' : 'text-ice-100'
            }`}
          >
            {metrics.lightningRate.toFixed(0)}{' '}
            <span className="text-[10px] text-steel-400 font-normal">fl/min</span>
          </div>
        </div>
      </div>
    </div>
  );
};
