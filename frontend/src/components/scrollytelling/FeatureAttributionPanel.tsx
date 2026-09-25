import React from 'react';
import { Cpu, TrendingUp } from 'lucide-react';
import { DataProvenanceBadge } from '../DataProvenanceBadge';

export interface AttributionItem {
  name: string;
  score: number;      // 0 - 100 percentage contribution
  detail: string;     // physical quantified detail
}

interface FeatureAttributionPanelProps {
  attribution: AttributionItem[];
  phaseName: string;
  className?: string;
}

export const FeatureAttributionPanel: React.FC<FeatureAttributionPanelProps> = ({
  attribution,
  phaseName,
  className = ''
}) => {
  // Sort or preserve atmospheric drivers
  return (
    <div className={`glass-card p-3 rounded-xl border border-steel-800 shrink-0 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-steel-800/80">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-ice-500" />
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-ice-100 flex items-center space-x-2">
            <span>ConvectNet Physics Attribution</span>
            <span className="text-steel-600">·</span>
            <span className="text-steel-400 font-mono text-[10px] lowercase font-normal">
              shapley drivers for {phaseName}
            </span>
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <DataProvenanceBadge source="DATASET" />
        </div>
      </div>

      {/* Proportional Driver Bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2.5">
        {attribution.map((item, idx) => {
          // Color coding depending on rank/score
          const barColor =
            item.score >= 35
              ? 'bg-gradient-to-r from-cyan-500 to-ice-400 shadow-[0_0_10px_rgba(0,229,255,0.6)]'
              : item.score >= 25
              ? 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
              : 'bg-gradient-to-r from-slate-600 to-steel-400';

          return (
            <div
              key={idx}
              className="bg-ocean-900/60 border border-steel-800 p-2.5 rounded-lg flex flex-col justify-between hover:border-ice-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-semibold text-ice-200 truncate pr-1">
                    {item.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-ice-500 shrink-0">
                    +{item.score.toFixed(0)}%
                  </span>
                </div>
                <p className="text-[10px] text-steel-400 font-mono mt-1 leading-tight line-clamp-1">
                  {item.detail}
                </p>
              </div>

              {/* Progress bar container */}
              <div className="w-full bg-ocean-950 h-1.5 rounded-full overflow-hidden mt-2 border border-steel-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
