import React from 'react';
import { Clock, Navigation, ShieldAlert, MapPin } from 'lucide-react';

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
    <div className="bg-[#0f1011] border border-[#23252a] rounded-xl flex flex-col overflow-hidden max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#23252a] bg-[#0f1011]">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#8a8f98]" />
          <h3 className="text-[13px] font-medium text-[#f7f8f8]">Target Arrivals (ETA)</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] bg-[#1a1b1d] text-[#d0d6e0] font-mono px-2 py-0.5 rounded-[4px] border border-[#34343a] uppercase">
            {allETAs.length} Threats
          </span>
        </div>
      </div>

      {/* Target ETA List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allETAs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#62666d] text-center">
            <Navigation className="w-6 h-6 mb-2 opacity-50" />
            <p className="text-[13px] font-medium">No tracked assets in trajectory.</p>
          </div>
        ) : (
          allETAs.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-[#23252a] bg-[#0f1011] hover:bg-[#141516] hover:border-[#34343a] transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[#8a8f98] shrink-0" />
                    <span className="text-[14px] font-medium text-[#f7f8f8] truncate" title={item.target_name}>{item.target_name}</span>
                  </div>
                  <div className="text-[12px] text-[#8a8f98] mt-1 truncate">
                    Threat: <span className="text-[#d0d6e0] font-mono">{item.cell_id}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[15px] font-medium font-mono text-[#f7f8f8]">
                    {Math.floor(item.eta_minutes)}m {Math.floor((item.eta_minutes % 1) * 60)}s
                  </div>
                  <div className="text-[11px] text-[#8a8f98] mt-0.5">
                    Window: {item.eta_window_min}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-3 text-[#8a8f98] text-[12px]">
                  <span>{item.distance_km} km away</span>
                  <span>•</span>
                  <span>{item.velocity_kmh} km/h</span>
                </div>

                <button
                  onClick={() => onTriggerAlert(item.cell_id)}
                  className="px-3 py-1.5 bg-[#e5e5e6] hover:bg-[#f3f3f4] active:bg-[#cfcfd1] text-[#08090a] rounded-full font-medium text-[12px] transition-colors focus:ring-[3px] focus:ring-[rgba(94,106,210,0.32)] focus:outline-none flex items-center space-x-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
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
