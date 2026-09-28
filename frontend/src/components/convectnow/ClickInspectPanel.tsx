import React from 'react';
import { X, MapPin, Gauge, Cpu, Navigation, Activity, CheckCircle2, AlertCircle, Mountain, ShieldAlert, Send } from 'lucide-react';
import { GridCellData } from '../../types/convectnow';
import { getHazardSeverityBadge } from '../../utils/colorScales';

interface ClickInspectPanelProps {
  data: GridCellData | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCapModal?: () => void;
}

export const ClickInspectPanel: React.FC<ClickInspectPanelProps> = ({ data, isOpen, onClose, onOpenCapModal }) => {
  if (!isOpen || !data) return null;

  const { coordinates, observations, ai_hazards, storm_motion, data_quality } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'GOOD':
        return (
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" /> GOOD
          </span>
        );
      case 'MODERATE':
        return (
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <AlertCircle className="w-3 h-3" /> MODERATE
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-slate-400 font-medium">
            <Activity className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  const compositeBadge = getHazardSeverityBadge(
    ai_hazards.composite_risk === 'CRITICAL' ? 95 :
    ai_hazards.composite_risk === 'HIGH' ? 75 :
    ai_hazards.composite_risk === 'ELEVATED' ? 55 : 30
  );

  return (
    <div
      className={`fixed top-14 right-0 bottom-0 w-80 md:w-96 bg-[#0a0d15]/95 border-l border-[#1e293b] backdrop-blur-2xl shadow-2xl z-30 flex flex-col transform transition-transform duration-300 ease-in-out font-mono select-none overflow-hidden ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-[#1e293b] bg-[#131928]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wider">1 km × 1 km CELL</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${compositeBadge.badgeBg}`}>
                {ai_hazards.composite_risk}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {coordinates.lat.toFixed(3)}°N, {coordinates.lon.toFixed(3)}°E · Elev: {coordinates.elevation}m
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs divide-y divide-[#1e293b]/70">
        {/* Section 1: Multi-Source Remote Sensing Observations */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold uppercase tracking-wider text-[11px]">
              <Gauge className="w-3.5 h-3.5" />
              <span>SENSOR OBSERVATIONS</span>
            </div>
            <span className="text-[10px] text-slate-500">MOSDAC / INSAT / AWS</span>
          </div>

          <div className="space-y-1.5 bg-[#131928]/40 p-2.5 rounded-lg border border-[#1e293b]">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Radar Reflectivity:</span>
              <span className="font-bold text-white">
                {observations.radar_dbz} dBZ
                {observations.radar_dbz >= 50 && (
                  <span className="ml-1.5 text-[10px] text-rose-400 font-semibold">[SEVERE CORE]</span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Radial Velocity:</span>
              <span className="font-medium text-slate-200">
                {observations.radial_velocity} m/s
                <span className="ml-1 text-[10px] text-slate-400">
                  {observations.radial_velocity < 0 ? '(Inflow)' : '(Outflow)'}
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">VIL / Echo Top:</span>
              <span className="font-medium text-slate-200">
                {observations.vil} kg/m² | {observations.echo_top} km
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">IR Brightness Temp:</span>
              <span className="font-medium text-slate-200">{observations.ir_bt} K ({Math.round(observations.ir_bt - 273.15)}°C)</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Cloud Cooling Rate:</span>
              <span className={`font-medium ${observations.cooling_rate <= -0.27 ? 'text-rose-400' : 'text-white'}`}>{observations.cooling_rate} K/min</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Lightning Count:</span>
              <span className={`font-medium ${observations.lightning_count >= 10 ? 'text-amber-300' : 'text-white'}`}>{observations.lightning_count} flashes/hr</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Surface Temp & RH:</span>
              <span className="font-medium text-white">{observations.surface_temp}°C | {observations.rh}%</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Surface Pressure:</span>
              <span className="font-medium text-white">{observations.pressure} hPa</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Rainfall Rate:</span>
              <span className={`font-bold ${observations.rainfall_rate >= 50 ? 'text-rose-400' : 'text-white'}`}>{observations.rainfall_rate} mm/h</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Surface CAPE:</span>
              <span className={`font-bold ${observations.cape >= 2000 ? 'text-amber-400' : 'text-white'}`}>{observations.cape} J/kg</span>
            </div>
          </div>
        </div>

        {/* Section 2: AI ConvectNet Hazards */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold uppercase tracking-wider text-[11px]">
              <Cpu className="w-3.5 h-3.5" />
              <span>AI CONVECTNET HAZARDS</span>
            </div>
            <span className="text-[10px] text-slate-500">v1.0 (Hybrid)</span>
          </div>

          <div className="space-y-1.5 bg-[#131928]/40 p-2.5 rounded-lg border border-[#1e293b]">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">CI Probability:</span>
              <span className={`font-bold ${ai_hazards.ci_prob > 80 ? 'text-rose-400' : 'text-white'}`}>
                {ai_hazards.ci_prob}%
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Hail Probability:</span>
              <span className={`font-bold ${ai_hazards.hail_prob > 60 ? 'text-rose-400' : 'text-white'}`}>
                {ai_hazards.hail_prob}%
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Cloudburst Risk:</span>
              <span className={`font-bold ${ai_hazards.cloudburst_prob > 70 ? 'text-rose-400' : 'text-white'}`}>
                {ai_hazards.cloudburst_prob}%
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Downburst Velocity:</span>
              <span className="font-medium text-white">
                {ai_hazards.downburst_vel} kt ({ai_hazards.downburst_prob}% prob)
              </span>
            </div>

            {/* Physical Attribution (XAI) */}
            <div className="pt-2 mt-1 border-t border-[#1e293b]">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex justify-between">
                <span>PHYSICAL ATTRIBUTION (XAI)</span>
                <span className="text-blue-400">Physics Weights</span>
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>Radar Echo Core (Z / VIL)</span>
                    <span className="font-bold text-white">35%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1">
                    <div className="bg-blue-500 h-1 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>Schultz 2σ Lightning Jump</span>
                    <span className="font-bold text-white">28%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1">
                    <div className="bg-amber-400 h-1 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>Mecikalski IR Cooling Rate</span>
                    <span className="font-bold text-white">22%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1">
                    <div className="bg-rose-400 h-1 rounded-full" style={{ width: '22%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>Khasi Escarpment Lift Factor</span>
                    <span className="font-bold text-white">15%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1">
                    <div className="bg-emerald-400 h-1 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Storm Motion & Kinematics */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
              <Navigation className="w-3.5 h-3.5" />
              <span>STORM MOTION & VECTOR</span>
            </div>
            <span className="text-[10px] text-slate-500">Kalman tracker</span>
          </div>

          <div className="space-y-1.5 bg-[#131928]/40 p-2.5 rounded-lg border border-[#1e293b]">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Direction & Speed:</span>
              <span className="font-bold text-white">
                {storm_motion.direction_cardinal} ({storm_motion.direction_deg}°) @ {storm_motion.speed_kmh} km/h
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">ETA to Sohra Core:</span>
              <span className={`font-bold ${storm_motion.eta_min <= 30 ? 'text-amber-300' : 'text-white'}`}>{storm_motion.eta_min} min</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Kinematic State:</span>
              <span className="text-slate-300 text-[11px] truncate">{storm_motion.kinematic_state}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Data Quality & Latency Ticker */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>DATA QUALITY & TELEMETRY</span>
            </div>
            <span className="text-[10px] text-slate-500">per source</span>
          </div>

          <div className="space-y-1.5 bg-[#131928]/40 p-2.5 rounded-lg border border-[#1e293b]">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Radar (DWR Cherra):</span>
              <div className="flex items-center gap-1.5">
                {getStatusBadge(data_quality.radar.status)}
                <span className="text-[10px] text-slate-400">({data_quality.radar.lag})</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Satellite (INSAT-3DR):</span>
              <div className="flex items-center gap-1.5">
                {getStatusBadge(data_quality.satellite.status)}
                <span className="text-[10px] text-slate-400">({data_quality.satellite.lag})</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Lightning (Bhuvan/ILDN):</span>
              <div className="flex items-center gap-1.5">
                {getStatusBadge(data_quality.lightning.status)}
                <span className="text-[10px] text-slate-400">({data_quality.lightning.lag})</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">IMD AWS Surface:</span>
              <div className="flex items-center gap-1.5">
                {getStatusBadge(data_quality.aws.status)}
                <span className="text-[10px] text-slate-400">({data_quality.aws.lag})</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-0.5 pt-1 border-t border-[#1e293b]">
              <span className="text-slate-400">Model Engine:</span>
              <span className="text-blue-300 font-medium text-[11px]">{data_quality.ai_model}</span>
            </div>
          </div>
        </div>

        {/* Action Button: Dispatch CAP v1.2 Warning */}
        {onOpenCapModal && (
          <div className="pt-2">
            <button
              onClick={onOpenCapModal}
              className="w-full py-2.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/40 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-rose-400" />
              <span>DISPATCH CAP v1.2 WARNING</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#131928]/60 border-t border-[#1e293b] text-[10px] text-slate-400 flex items-center justify-between">
        <span>Coordinate Datum: EPSG:4326 / WGS 84</span>
        <span className="text-blue-400">Resolution: 1 km</span>
      </div>
    </div>
  );
};
