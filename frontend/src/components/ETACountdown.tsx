import React from 'react';
import { Clock, Navigation, ShieldAlert, MapPin, AlertTriangle } from 'lucide-react';
import { DataProvenanceBadge } from './DataProvenanceBadge';

interface ETACountdownProps {
  stormCells: any[];
  onTriggerAlert: (cellId: string) => void;
}

export const ETACountdown: React.FC<ETACountdownProps> = ({
  stormCells,
  onTriggerAlert
}) => {
  const allETAs: any[] = [];
  stormCells.forEach((c) => {
    if (c.target_etas && c.target_etas.length > 0) {
      c.target_etas.forEach((eta: any) => {
        allETAs.push({
          ...eta,
          cell_id: c.cell_id,
          peak_dbz: c.peak_dbz,
          velocity_kmh: c.velocity_kmh,
          heading_deg: c.heading_deg,
          hazards: c.hazards
        });
      });
    }
  });

  allETAs.sort((a, b) => a.eta_minutes - b.eta_minutes);

  return (
    <div className="card-blizzard p-4 flex flex-col h-full shadow-blizzard-card border border-white/[0.12]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.12]">
        <div className="flex items-center space-x-2.5">
          <Clock className="w-4 h-4 text-[#1aaaff] animate-pulse" />
          <h3 className="text-xs font-display font-bold uppercase tracking-wider text-white">
            Per-Storm Arrival Countdown (ETA)
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <DataProvenanceBadge source="LIVE" />
          <span className="text-[10px] bg-red-950/80 text-[#ef5a67] font-mono px-2.5 py-0.5 rounded-full border border-red-800/60 font-bold shadow-[0_0_10px_rgba(239,90,103,0.3)]">
            {allETAs.length} CORRIDOR THREATS
          </span>
        </div>
      </div>

      {/* Target ETA List */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1">
        {allETAs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-white/50 text-center px-4">
            <Navigation className="w-8 h-8 mb-2 opacity-30 text-[#1aaaff]" />
            <p className="text-xs font-medium text-white/80 font-body">No monitored assets currently in direct storm trajectory path.</p>
            <p className="text-[11px] text-white/40 mt-1 font-mono">Convective core heading ENE (73°) towards non-urban sector.</p>
          </div>
        ) : (
          allETAs.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition-all ${
                item.eta_minutes <= 30
                  ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : 'bg-[#111729]/80 border-white/[0.1] hover:border-[#38a8ff]/40 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[#f0b44d] shrink-0" />
                    <span className="text-xs font-display font-semibold text-white truncate" title={item.target_name}>{item.target_name}</span>
                  </div>
                  <div className="text-[11px] text-white/60 font-mono mt-0.5 truncate">
                    Target Threat: <span className="text-[#ef5a67] font-bold">{item.cell_id}</span> ({item.peak_dbz.toFixed(0)} dBZ)
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-[#1aaaff]">
                    {Math.floor(item.eta_minutes)}m {Math.floor((item.eta_minutes % 1) * 60)}s
                  </div>
                  <div className="text-[10px] text-white/50 font-mono">
                    Window: {item.eta_window_min}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3 text-white/60 font-mono text-[11px]">
                  <span>Dist: {item.distance_km} km</span>
                  <span>Speed: {item.velocity_kmh} km/h</span>
                </div>

                {/* Blizzard Pill Emergency Action Button */}
                <button
                  onClick={() => onTriggerAlert(item.cell_id)}
                  className="px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-full font-display font-semibold text-[11px] transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-white/20 hover:scale-105 active:scale-95"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>CAP Alert</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
