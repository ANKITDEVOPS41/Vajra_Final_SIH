import React from 'react';
import { RADAR_DBZ_STOPS } from '../utils/colorScales';

export const RadarColorbar: React.FC = () => {
  return (
    <div className="bg-[#0a0d15]/85 border border-[#1e293b] backdrop-blur-md rounded-lg p-2.5 font-mono text-[10px] shadow-xl z-10 select-none max-w-xs">
      <div className="flex items-center justify-between mb-1.5 text-slate-300">
        <span className="font-bold text-white tracking-wider">RADAR REFLECTIVITY (dBZ)</span>
        <span className="text-slate-500">IMD / MOSDAC</span>
      </div>

      {/* Horizontal colored spectrum bar */}
      <div className="h-3 w-full rounded overflow-hidden flex border border-[#334155]/60 mb-1.5 shadow-inner">
        {RADAR_DBZ_STOPS.map((stop, idx) => (
          <div
            key={idx}
            className="flex-1 h-full"
            style={{ backgroundColor: stop.color }}
            title={stop.label}
          />
        ))}
      </div>

      {/* Ticks and values */}
      <div className="flex justify-between text-slate-400 text-[9px] px-0.5 font-semibold">
        <span>10</span>
        <span>20</span>
        <span>30</span>
        <span>40</span>
        <span>50</span>
        <span>60</span>
        <span>65+</span>
      </div>

      <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 pt-1 border-t border-[#1e293b]/60">
        <span>Light Rain</span>
        <span>CI (45 dBZ)</span>
        <span className="text-purple-400 font-medium">Cloudburst (&gt;60)</span>
      </div>
    </div>
  );
};
