import React from 'react';

export type ProvenanceSource = 'LIVE' | 'DATASET' | 'PLANNED';

interface DataProvenanceBadgeProps {
  source: ProvenanceSource;
  className?: string;
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({
  source,
  className = ''
}) => {
  switch (source) {
    case 'LIVE':
      return (
        <span
          className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-cyan-500/10 text-ice-500 border border-ice-500/40 shadow-[0_0_10px_rgba(0,229,255,0.2)] ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-ice-500 animate-pulse" />
          <span>LIVE</span>
        </span>
      );
    case 'DATASET':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-400/40 ${className}`}
        >
          <span>DATASET</span>
        </span>
      );
    case 'PLANNED':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-orange-500/10 text-orange-400 border border-orange-400/40 ${className}`}
        >
          <span>PLANNED</span>
        </span>
      );
    default:
      return null;
  }
};
