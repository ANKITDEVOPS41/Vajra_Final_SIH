import React from 'react';
import { AlertOctagon, History, X, Send } from 'lucide-react';
import { ReplayStep } from '../../types/convectnow';

interface ReplayBannerProps {
  currentStep: ReplayStep;
  onExitReplay: () => void;
  onOpenCapModal?: () => void;
}

export const ReplayBanner: React.FC<ReplayBannerProps> = ({ currentStep, onExitReplay, onOpenCapModal }) => {
  return (
    <div className=" from-rose-950/90 via-red-900/80 to-purple-950/90 border-b border-rose-500/50 backdrop-blur-md px-4 py-2 flex items-center justify-between text-xs font-mono z-20  shadow-rose-950/30">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
          <AlertOctagon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-rose-200 tracking-wider">HISTORICAL REPLAY MODE ACTIVE:</span>
            <span className="text-[#f7f8f8] font-semibold">June 16–17, 2022 Cherrapunji Extreme Cloudburst (972.6 mm / 24h)</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-600/40 border border-rose-400/40 text-rose-100 font-bold">
              STEP {currentStep.stepIndex + 1} / 6 ({currentStep.relativeTime})
            </span>
          </div>
          <p className="text-[11px] text-rose-200/90 tracking-tight mt-0.5">
            {currentStep.utcTime} ({currentStep.istTime}) — <span className="font-semibold text-[#f7f8f8]">{currentStep.title}:</span> {currentStep.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-rose-300 uppercase tracking-widest block">Peak Cloudburst Threat</span>
          <span className="text-sm font-bold text-rose-100">{currentStep.cloudburstProb}% (Rain: {currentStep.rainRateMmH} mm/h)</span>
        </div>
        {onOpenCapModal && (
          <button
            onClick={onOpenCapModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full.5 rounded-full rounded bg-rose-600 hover:bg-rose-500 text-[#f7f8f8] font-bold text-xs  transition-all border border-rose-400/40"
            title="Generate CAP v1.2 Advisory for this Replay Step"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CAP ADVISORY</span>
          </button>
        )}
        <button
          onClick={onExitReplay}
          className="p-1.5 rounded hover:bg-rose-800/40 text-rose-300 hover:text-[#f7f8f8] transition-colors border border-rose-500/30"
          title="Exit Historical Replay Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
