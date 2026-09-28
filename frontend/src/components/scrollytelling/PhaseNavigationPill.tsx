import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface PhaseNavOption {
  id: number;
  timeLabel: string;
  name: string;
  subtitle: string;
}

interface PhaseNavigationPillProps {
  phases: PhaseNavOption[];
  activePhaseIndex: number;
  onSelectPhase: (index: number) => void;
  className?: string;
}

export const PhaseNavigationPill: React.FC<PhaseNavigationPillProps> = ({
  phases,
  activePhaseIndex,
  onSelectPhase,
  className = ''
}) => {
  return (
    <nav
      aria-label="Storm Lifecycle Phases"
      className={`glass-card-elevated p-2 rounded-2xl flex flex-col items-center space-y-2 border border-steel-800 shadow-2xl z-30 ${className}`}
    >
      {/* Up Button */}
      <button
        onClick={() => onSelectPhase(Math.max(0, activePhaseIndex - 1))}
        disabled={activePhaseIndex === 0}
        aria-label="Previous storm phase"
        className="p-1 rounded-lg text-steel-400 hover:text-ice-100 hover:bg-ocean-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      {/* Phase Dots / Buttons */}
      <div className="flex flex-col space-y-2">
        {phases.map((phase, idx) => {
          const isActive = idx === activePhaseIndex;
          return (
            <div key={phase.id} className="relative group flex items-center justify-center">
              <button
                onClick={() => onSelectPhase(idx)}
                aria-label={`Jump to Phase ${idx + 1}: ${phase.name}`}
                aria-current={isActive ? 'step' : undefined}
                className={`relative flex items-center justify-center transition-all duration-300 rounded-full font-mono text-xs ${
                  isActive
                    ? 'w-7 h-7 bg-ice-500 text-ocean-950 font-black shadow-[0_0_15px_rgba(0,229,255,0.7)] ring-2 ring-ice-400/50 scale-110'
                    : 'w-6 h-6 bg-ocean-900 border border-steel-800 text-steel-400 hover:text-ice-100 hover:border-ice-500/40 hover:bg-ocean-800'
                }`}
              >
                {idx + 1}
              </button>

              {/* Hover Tooltip */}
              <div className="absolute left-9 px-3 py-1.5 bg-ocean-900/95 border border-steel-700/80 rounded-lg text-xs whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 backdrop-blur-md">
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono text-[10px] text-ice-500 font-bold">{phase.timeLabel}</span>
                  <span className="text-steel-600">·</span>
                  <span className="font-sans font-semibold text-ice-100">{phase.name}</span>
                </div>
                <div className="text-[10px] text-steel-400 font-sans mt-0.5">{phase.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Down Button */}
      <button
        onClick={() => onSelectPhase(Math.min(phases.length - 1, activePhaseIndex + 1))}
        disabled={activePhaseIndex === phases.length - 1}
        aria-label="Next storm phase"
        className="p-1 rounded-lg text-steel-400 hover:text-ice-100 hover:bg-ocean-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </nav>
  );
};
