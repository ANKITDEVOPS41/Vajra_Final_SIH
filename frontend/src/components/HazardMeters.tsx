import React from 'react';
import { CloudLightning, CloudRain, Wind, AlertTriangle, Info, Zap, Sparkles } from 'lucide-react';
import { DataProvenanceBadge } from './DataProvenanceBadge';

interface HazardMetersProps {
  summary: {
    cloudburst?: {
      is_cloudburst_active: boolean;
      peak_rain_rate_mmh: number;
      affected_area_km2: number;
      threat_tier: string;
    };
    hail?: {
      max_posh_percent: number;
      max_hail_size_mm: number;
      risk_tier: string;
    };
    downburst?: {
      peak_gust_kmh: number;
      peak_gust_ms: number;
      risk_tier: string;
    };
    lightning?: {
      peak_density_flashes_km2_hr: number;
      risk_tier: string;
    };
  };
  selectedCell: any;
  onLaunchAnatomy?: () => void;
}

export const HazardMeters: React.FC<HazardMetersProps> = ({ summary, selectedCell, onLaunchAnatomy }) => {
  const rainRate = selectedCell?.hazards?.rain_rate_mmh ?? summary.cloudburst?.peak_rain_rate_mmh ?? 0;
  const posh = selectedCell?.hazards?.posh_percent ?? summary.hail?.max_posh_percent ?? 0;
  const mesh = selectedCell?.hazards?.mesh_hail_mm ?? summary.hail?.max_hail_size_mm ?? 0;
  const downburst = selectedCell?.hazards?.downburst_gust_kmh ?? summary.downburst?.peak_gust_kmh ?? 0;
  const lightning = selectedCell?.hazards?.lightning_density ?? summary.lightning?.peak_density_flashes_km2_hr ?? 0;

  return (
    <div className="card-blizzard p-4 flex flex-col h-full shadow-blizzard-card border border-white/[0.12]">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.12]">
        <div className="flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-[#f0b44d]" />
          <h3 className="text-xs font-display font-bold uppercase tracking-wider text-white">
            Convective Hazard Physics (4 Parameters)
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <DataProvenanceBadge source="DATASET" />
          <span className="text-xs font-mono text-[#1aaaff] font-bold bg-[#38a8ff]/10 px-2.5 py-0.5 rounded-full border border-[#1aaaff]/30">
            {selectedCell ? selectedCell.cell_id : 'BASIN PEAK'}
          </span>
        </div>
      </div>

      {/* 4 Hazard Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 my-3">
        {/* 1. Cloudburst Exceedance */}
        <div className="bg-[#111729]/90 border border-white/[0.1] p-3 rounded-2xl flex flex-col justify-between hover:border-[#38a8ff]/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-white/60 font-body">
            <span className="flex items-center space-x-1.5 font-semibold">
              <CloudRain className="w-3.5 h-3.5 text-[#1aaaff]" />
              <span>RAIN RATE</span>
            </span>
            {rainRate >= 100 ? (
              <span className="text-[10px] bg-red-950 text-[#ef5a67] px-2 py-0.5 rounded-full font-bold border border-red-800 animate-pulse">
                CLOUDBURST
              </span>
            ) : (
              <span className="text-[10px] text-white/50 font-mono">NORMAL</span>
            )}
          </div>
          <div className="my-2">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {rainRate.toFixed(1)}
              </span>
              <span className="text-xs text-white/60 font-mono">mm/h</span>
            </div>
            <p className="text-[10px] text-white/50 font-mono mt-1">
              Tropical Z-R: Z=300R^1.5 (Threshold: 100mm/h)
            </p>
          </div>
        </div>

        {/* 2. Severe Hail Probability (POSH / MESH) */}
        <div className="bg-[#111729]/90 border border-white/[0.1] p-3 rounded-2xl flex flex-col justify-between hover:border-[#38a8ff]/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-white/60 font-body">
            <span className="flex items-center space-x-1.5 font-semibold">
              <Zap className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>HAIL RISK (POSH)</span>
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              posh >= 50
                ? 'bg-purple-950 text-purple-400 border-purple-800'
                : 'bg-white/5 text-white/60 border-white/10'
            }`}>
              {posh >= 50 ? 'SEVERE' : 'MODERATE'}
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {posh.toFixed(0)}%
              </span>
              <span className="text-xs text-white/60 font-mono">
                ({mesh.toFixed(1)} mm)
              </span>
            </div>
            <p className="text-[10px] text-white/50 font-mono mt-1">
              Witt SHI (0°C isotherm column)
            </p>
          </div>
        </div>

        {/* 3. Downburst Peak Gusts */}
        <div className="bg-[#111729]/90 border border-white/[0.1] p-3 rounded-2xl flex flex-col justify-between hover:border-[#38a8ff]/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-white/60 font-body">
            <span className="flex items-center space-x-1.5 font-semibold">
              <Wind className="w-3.5 h-3.5 text-[#1aaaff]" />
              <span>DOWNBURST GUST</span>
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              downburst >= 60
                ? 'bg-amber-950 text-[#f0b44d] border-amber-800'
                : 'bg-white/5 text-white/60 border-white/10'
            }`}>
              {downburst >= 60 ? 'HIGH' : 'NORMAL'}
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {downburst.toFixed(1)}
              </span>
              <span className="text-xs text-white/60 font-mono">km/h</span>
            </div>
            <p className="text-[10px] text-white/50 font-mono mt-1">
              VIL Density &amp; Wet-Bulb Zero
            </p>
          </div>
        </div>

        {/* 4. Lightning Density */}
        <div className="bg-[#111729]/90 border border-white/[0.1] p-3 rounded-2xl flex flex-col justify-between hover:border-[#38a8ff]/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-white/60 font-body">
            <span className="flex items-center space-x-1.5 font-semibold">
              <CloudLightning className="w-3.5 h-3.5 text-[#f0b44d]" />
              <span>LIGHTNING DENSITY</span>
            </span>
            <span className="text-[10px] bg-white/5 text-[#d0e9ff] px-2 py-0.5 rounded-full font-mono border border-white/10">
              GLM PROXY
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {lightning.toFixed(2)}
              </span>
              <span className="text-[10px] text-white/60 font-mono">fl/km²/h</span>
            </div>
            <p className="text-[10px] text-white/50 font-mono mt-1">
              IITM / GLM Convective Core
            </p>
          </div>
        </div>
      </div>

      {/* Physics Explainability Card */}
      <div className="bg-[#0a0e1a]/90 border border-white/[0.1] rounded-2xl p-3.5 text-xs shadow-inner">
        <div className="flex items-center space-x-1.5 text-[#1aaaff] font-display font-semibold mb-1 text-xs">
          <Info className="w-3.5 h-3.5" />
          <span>Physics Explainability (Feature Attribution)</span>
        </div>
        <p className="text-xs text-white/80 leading-relaxed font-body">
          {selectedCell?.hazards?.explainability ? (
            <>
              • {selectedCell.hazards.explainability.radar_core_driver}<br />
              • {selectedCell.hazards.explainability.vil_liquid_driver}<br />
              • {selectedCell.hazards.explainability.convective_severity}
            </>
          ) : (
            'Multi-source radar and geostationary soundings indicate intense vertical updraft velocity with high supercooled water suspension, elevating cloudburst and severe hail probabilities.'
          )}
        </p>
      </div>

      {/* Blizzard High-Confidence Primary Action Button */}
      {onLaunchAnatomy && (
        <button
          onClick={onLaunchAnatomy}
          className="mt-3 w-full py-3 px-4 btn-blizzard-primary rounded-full flex items-center justify-center space-x-2 shadow-blizzard-btn hover:shadow-blizzard-btn-hover group"
        >
          <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-display tracking-wider uppercase font-bold text-white">
            Launch 4D Storm Anatomy
          </span>
        </button>
      )}
    </div>
  );
};
