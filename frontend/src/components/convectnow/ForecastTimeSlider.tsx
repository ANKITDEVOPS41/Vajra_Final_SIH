import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ShieldAlert, FastForward, Clock } from 'lucide-react';
import { LeadTimeStep, ReplayStep } from '../../types/convectnow';

interface ForecastTimeSliderProps {
  steps: LeadTimeStep[];
  activeStepIndex: number;
  onSelectStep: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isReplayMode?: boolean;
  replaySteps?: ReplayStep[];
}

export const ForecastTimeSlider: React.FC<ForecastTimeSliderProps> = ({
  steps,
  activeStepIndex,
  onSelectStep,
  isPlaying,
  onTogglePlay,
  isReplayMode = false,
  replaySteps = [],
}) => {
  const currentStep = steps[activeStepIndex] || steps[0];
  const currentReplayStep = isReplayMode && replaySteps[activeStepIndex] ? replaySteps[activeStepIndex] : null;

  // Uncertainty cone: width expands with index
  const uncertainty = currentStep?.uncertaintyPercent || 5;

  const handleReset = () => {
    onSelectStep(0);
  };

  const handleStepForward = () => {
    const total = isReplayMode ? replaySteps.length : steps.length;
    onSelectStep((activeStepIndex + 1) % total);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2 select-none">
      <div className="bg-[#131928]/90 border border-[#1e293b] backdrop-blur-xl rounded-xl p-3 shadow-2xl shadow-black/60">
        {/* Top Header inside Slider: Mode, Active Lead Time, Kalman Uncertainty Indicator */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{isReplayMode ? 'HISTORICAL TIMELINE' : '0–6h FORECAST HORIZON'}</span>
            </div>

            <span className="text-xs font-mono font-bold text-white tracking-wide">
              {isReplayMode && currentReplayStep
                ? `${currentReplayStep.relativeTime} · ${currentReplayStep.title}`
                : `Lead Time: ${currentStep.label} (${currentStep.minutes} min)`}
            </span>
          </div>

          {/* Kalman Uncertainty Cone Indicator */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300 bg-[#0a0d15]/80 px-2.5 py-0.5 rounded-full border border-[#1e293b]">
            <span className="text-slate-400">Kalman Uncertainty:</span>
            <span
              className={`font-semibold ${
                uncertainty < 10
                  ? 'text-emerald-400'
                  : uncertainty < 20
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              ±{uncertainty}%
            </span>
            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
              <div
                className={`h-full ${
                  uncertainty < 10 ? 'bg-emerald-400' : uncertainty < 20 ? 'bg-amber-400' : 'bg-rose-400'
                }`}
                style={{ width: `${Math.min(100, (uncertainty / 30) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Playback Controls & Slider Track */}
        <div className="flex items-center gap-3">
          {/* Controls: Play/Pause, Step Forward, Reset */}
          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePlay}
              className={`p-2 rounded-lg border font-mono transition-all ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-blue-600 text-white border-blue-400/50 hover:bg-blue-500 shadow-md shadow-blue-500/30'
              }`}
              title={isPlaying ? 'Pause forecast simulation' : 'Play automated forecast loop'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={handleStepForward}
              className="p-2 rounded-lg bg-[#0a0d15] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-white transition-colors"
              title="Next lead time step"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-[#0a0d15] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-white transition-colors"
              title="Reset to NOW (0 min)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepped Buttons / Interactive Track */}
          <div className="flex-1 grid grid-cols-6 sm:grid-cols-10 gap-1">
            {(isReplayMode ? replaySteps : steps).map((step, idx) => {
              const isSelected = idx === activeStepIndex;
              const label = isReplayMode ? (step as ReplayStep).relativeTime : (step as LeadTimeStep).label;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectStep(idx)}
                  className={`py-1.5 px-1 rounded-md text-center transition-all font-mono text-xs border relative overflow-hidden ${
                    isSelected
                      ? isReplayMode
                        ? 'bg-rose-600/30 border-rose-500 text-rose-100 font-bold shadow-md shadow-rose-900/50 ring-1 ring-rose-400'
                        : 'bg-blue-600/30 border-blue-500 text-blue-100 font-bold shadow-md shadow-blue-900/50 ring-1 ring-blue-400'
                      : 'bg-[#0a0d15]/80 hover:bg-slate-800/80 border-[#1e293b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block truncate">{label}</span>
                  {isSelected && (
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                        isReplayMode ? 'bg-rose-400' : 'bg-blue-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Expanding Uncertainty Wedge Graphic */}
        <div className="mt-2 pt-1 border-t border-[#1e293b]/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>0 min (direct observation)</span>
          <span className="text-slate-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Advection + ConvectNet multi-stage fusion
          </span>
          <span>+6h (NWP-guided)</span>
        </div>
      </div>
    </div>
  );
};
