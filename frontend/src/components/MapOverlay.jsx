import React from 'react';
import { Clock, Activity, Target, Zap } from 'lucide-react';

/**
 * ETAClock Component
 * Displays the time-to-impact for a specific tracked cell against a user target.
 */
const ETAClock = ({ targetName, etaMinutes }) => {
  const isCritical = etaMinutes <= 15;
  
  return (
    <div className={`flex items-center justify-between p-3 mb-2 rounded-lg bg-black/40 border-l-4 ${isCritical ? 'border-red-500' : 'border-[#38a8ff]'}`}>
      <div className="flex items-center gap-3">
        <Target size={16} className={isCritical ? "text-red-500" : "text-[#38a8ff]"} />
        <span className="text-sm font-semibold text-gray-200">{targetName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-gray-400" />
        <span className={`font-mono font-bold ${isCritical ? 'text-red-400' : 'text-white'}`}>
          {etaMinutes} min
        </span>
      </div>
    </div>
  );
};

/**
 * ActiveCellCard Component
 * Represents a single severe convective cell tracked by the Hungarian matching algorithm.
 */
const ActiveCellCard = ({ cell }) => {
  const { id, intensity_dbz, trend, etas } = cell;
  
  // Visuals based on the M3 Evolution Engine trend
  const trendColor = trend === 'INTENSIFYING' ? 'text-red-400' : (trend === 'WEAKENING' ? 'text-green-400' : 'text-yellow-400');
  
  return (
    <div className="card-blizzard p-5 mb-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(56,168,255,0.2)] hover:border-white/20">
      <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-[#38a8ff] font-mono font-bold text-xl">{id}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Activity size={14} className={trendColor} />
            <span className={`text-xs font-semibold tracking-wider ${trendColor}`}>{trend}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="bg-gradient-to-r from-[#1888ef]/20 to-[#009fe9]/20 px-3 py-1.5 rounded-full border border-[#38a8ff]/40">
            <span className="text-sm font-mono font-bold text-white">{intensity_dbz} dBZ</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-bold">Time to Impact (ETA)</p>
        {etas && etas.length > 0 ? (
          etas.map((eta, idx) => (
            <ETAClock key={idx} targetName={eta.target} etaMinutes={eta.time} />
          ))
        ) : (
          <p className="text-xs text-gray-500 italic font-mono">No imminent targets in trajectory.</p>
        )}
      </div>
    </div>
  );
};

/**
 * MapOverlay Component (Milestone 6)
 * Sits absolutely positioned over Leaflet/Mapbox providing the Threat Ledger.
 */
const MapOverlay = ({ activeCells = [] }) => {
  // Using some mock data for development if none is passed via props
  const cellsToRender = activeCells.length > 0 ? activeCells : [
    {
      id: "CELL-A17",
      intensity_dbz: 55.4,
      trend: "INTENSIFYING",
      etas: [
        { target: "Bhubaneswar Airport", time: 14 },
        { target: "Cuttack Metro", time: 32 }
      ]
    },
    {
      id: "CELL-B04",
      intensity_dbz: 42.1,
      trend: "WEAKENING",
      etas: [
        { target: "Paradip Port", time: 45 }
      ]
    }
  ];

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50 p-6 flex justify-between">
      
      {/* LEFT PANEL: Threat Ledger & ETA Clocks */}
      <div className="w-[400px] pointer-events-auto flex flex-col h-full max-h-[95vh]">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6 card-blizzard p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#1888ef] to-[#009fe9] p-2.5 rounded-full shadow-[0_0_15px_rgba(0,159,233,0.5)]">
              <Zap size={22} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="font-semibold text-2xl text-white tracking-tight leading-none">ConvectNow</h1>
              <p className="text-[11px] font-mono text-[#38a8ff] tracking-widest mt-1">LIVE TELEMETRY</p>
            </div>
          </div>
        </div>

        {/* Scrollable Ledger */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Threats</h2>
            <span className="bg-red-500/20 text-red-400 text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/30">
              {cellsToRender.length} TRACKED
            </span>
          </div>
          
          {cellsToRender.map(cell => (
            <ActiveCellCard key={cell.id} cell={cell} />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Explainability / Confidence HUD (Milestone 7 Placeholder) */}
      <div className="w-[380px] pointer-events-auto flex flex-col justify-end">
         <div className="card-blizzard p-6 rounded-2xl flex flex-col items-center justify-center border-dashed border-2 border-[#38a8ff]/30 opacity-70">
            <Activity size={24} className="text-[#38a8ff] mb-2" />
            <p className="text-sm font-mono text-[#38a8ff]">HUD MODULE RESERVED</p>
            <p className="text-xs text-gray-400 mt-1 text-center">Milestone 7 (Explainability + Confidence) rendering area.</p>
         </div>
      </div>

    </div>
  );
};

export default MapOverlay;
