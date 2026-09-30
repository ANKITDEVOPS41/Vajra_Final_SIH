import React from 'react';
import { CloudLightning, Zap, CloudHail, Wind, CloudRain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HazardData } from '../../types/convectnow';
import { getHazardSeverityBadge } from '../../utils/colorScales';

interface HazardBarProps {
  hazards: HazardData[];
  onHazardClick?: (hazard: HazardData) => void;
}

export const HazardBar: React.FC<HazardBarProps> = ({ hazards, onHazardClick }) => {
  const getIcon = (type: HazardData['type']) => {
    switch (type) {
      case 'ci':
        return <CloudLightning className="w-4 h-4" />;
      case 'lightning':
        return <Zap className="w-4 h-4" />;
      case 'hail':
        return <CloudHail className="w-4 h-4" />;
      case 'downburst':
        return <Wind className="w-4 h-4" />;
      case 'cloudburst':
        return <CloudRain className="w-4 h-4" />;
      default:
        return <CloudLightning className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: HazardData['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3.5 h-3.5 text-rose-400" />;
      case 'down':
        return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
      case 'stable':
      default:
        return <Minus className="w-3.5 h-3.5 text-[#d0d6e0]" />;
    }
  };

  return (
    <div className="w-full bg-[#08090a]/90 border-t border-[#1e293b] backdrop-blur-md px-3 py-2 z-20 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-[#d0d6e0] border-r border-[#1e293b] pr-3 mr-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="font-semibold text-[#f7f8f8]">HAZARD SUMMARY</span>
        </div>

        {/* 5 Hazard Indicator Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full">
          {hazards.map((hazard) => {
            const severity = getHazardSeverityBadge(hazard.value);
            return (
              <div
                key={hazard.type}
                onClick={() => onHazardClick?.(hazard)}
                className={`flex items-center justify-between p-2 rounded-xl border backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] ${severity.bgClass} ${severity.borderClass}`}
                title={hazard.description}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl ${severity.colorClass} bg-black/40`}>
                    {getIcon(hazard.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#f7f8f8] font-mono">
                        {hazard.shortCode}
                      </span>
                      <span className="text-[10px] text-[#d0d6e0] truncate max-w-[80px] lg:max-w-none">
                        {hazard.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#d0d6e0]">
                      <span>Status:</span>
                      <span className={`font-semibold ${severity.colorClass}`}>
                        {severity.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right pl-2">
                  <div className="flex items-center justify-end gap-1">
                    <span className={`text-base font-bold font-mono tracking-tight ${severity.colorClass}`}>
                      {hazard.value}%
                    </span>
                    {getTrendIcon(hazard.trend)}
                  </div>
                  <div className="w-14 h-1.5 bg-black/50 rounded-full overflow-hidden mt-0.5">
                    <div
                      className={`h-full transition-all duration-500 ${
                        hazard.value < 30
                          ? 'bg-emerald-500'
                          : hazard.value < 50
                          ? 'bg-amber-400'
                          : hazard.value < 70
                          ? 'bg-orange-500'
                          : hazard.value < 85
                          ? 'bg-rose-500'
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, hazard.value))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
