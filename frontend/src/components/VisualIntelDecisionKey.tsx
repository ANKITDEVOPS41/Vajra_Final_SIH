import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  BarChart3, 
  Zap, 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  Target, 
  Radio, 
  ShieldAlert,
  Info,
  Layers,
  Compass,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { VisualIntelPageId, AlertLevel } from '../types/visualIntel';
import { VISUAL_INTEL_CONFIG } from '../config/visualIntelConfig';

export interface VisualIntelDecisionKeyProps {
  page: VisualIntelPageId;
  onOpenMissionBriefing?: () => void;
  customTelemetry?: {
    metric?: string;
    status?: string;
    action?: string;
    level?: AlertLevel;
  };
  className?: string;
}

export const VisualIntelDecisionKey: React.FC<VisualIntelDecisionKeyProps> = ({
  page,
  onOpenMissionBriefing,
  customTelemetry,
  className = '',
}) => {
  const [viewState, setViewState] = useState<'ticker' | 'expanded' | 'collapsed'>('ticker');
  const data = VISUAL_INTEL_CONFIG[page] || VISUAL_INTEL_CONFIG.hazard;

  const currentLevel: AlertLevel = customTelemetry?.level || data.actionableDecision.level;
  const currentMetric = customTelemetry?.metric || data.ticker.metric;
  const currentStatus = customTelemetry?.status || data.ticker.status;
  const currentAction = customTelemetry?.action || data.ticker.action;

  const handleOpenModal = () => {
    if (onOpenMissionBriefing) {
      onOpenMissionBriefing();
    } else {
      window.dispatchEvent(new CustomEvent('open-mission-briefing', { detail: { page } }));
    }
  };

  // Keyboard shortcut listener ('k' or 'K' toggles expand/ticker, 'm' or 'M' triggers mission briefing, 'Escape' collapses)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setViewState((prev) => (prev === 'expanded' ? 'ticker' : 'expanded'));
      } else if (e.key === 'Escape') {
        if (viewState === 'expanded') {
          e.preventDefault();
          setViewState('ticker');
        }
      } else if (e.key === 'm' || e.key === 'M' || e.key === '?') {
        e.preventDefault();
        handleOpenModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewState, page, onOpenMissionBriefing]);

  const levelColor = 
    currentLevel === 'CRITICAL' ? '#ef4444' :
    currentLevel === 'WARNING' ? '#f59e0b' :
    currentLevel === 'ADVISORY' ? '#38bdf8' : '#22c55e';

  const levelBg = 
    currentLevel === 'CRITICAL' ? 'bg-red-500/15 border-red-500/40 text-red-300' :
    currentLevel === 'WARNING' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' :
    currentLevel === 'ADVISORY' ? 'bg-[#5e6ad2]/15 border-sky-500/30 text-sky-300' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';

  return (
    <div className={`pointer-events-auto select-none font-sans transition-all duration-300 ${className}`}>
      {/* 1-Line Tactical Ticker Mode (Docked Floating Pill at bottom-right) */}
      {viewState === 'ticker' && (
        <aside
          role="region"
          aria-label="Tactical Visual Intelligence Ticker"
          className="fixed bottom-4 right-4 z-[450] flex items-center space-x-3 px-3.5 py-2 rounded bg-[#0a0e1a]/95 backdrop-blur-xl border border-[#5e6ad2]/30  text-xs transition-all duration-300 hover:border-[#5e6ad2]"
        >
          {/* Live Pulsing Dot */}
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span 
                className="animate-ping absolute inline-flex h-full w-full rounded opacity-75"
                style={{ backgroundColor: levelColor }}
              ></span>
              <span 
                className="relative inline-flex rounded h-2.5 w-2.5"
                style={{ backgroundColor: levelColor }}
              ></span>
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f7f8f8] hidden sm:inline">
              INTEL // {data.badge}
            </span>
          </div>

          <span className="text-slate-600 hidden md:inline">|</span>

          {/* Tactical Telemetry Metric Summary */}
          <div className="font-mono text-[11px] text-sky-300 font-semibold truncate max-w-[240px] sm:max-w-[340px]">
            {currentMetric}
          </div>

          <span className="text-slate-600 hidden lg:inline">|</span>

          {/* Action Callout Badge */}
          <div className={`hidden lg:flex items-center space-x-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-bold tracking-tight ${levelBg}`}>
            <ShieldAlert className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[280px]">{currentAction}</span>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center space-x-1.5 pl-1 border-l border-[#23252a]">
            <button
              onClick={() => setViewState('expanded')}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#5e6ad2]/15 hover:bg-[#5e6ad2]/25 border border-[#5e6ad2]/30 text-sky-300 font-mono text-[10px] font-semibold transition-all active:scale-95"
              title="Expand Visual Intel & Decision Key (K)"
            >
              <ChevronUp className="w-3 h-3 text-sky-400" />
              <span>Expand Key [K]</span>
            </button>
            <button
              onClick={handleOpenModal}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#162035] hover:bg-[#1f2e4d] border border-[#23252a] text-[#f7f8f8] font-mono text-[10px] font-medium transition-all active:scale-95"
              title="Launch Mission Briefing Modal (M)"
            >
              <Target className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Briefing [M]</span>
            </button>
          </div>
        </aside>
      )}

      {/* Expanded Glass Card View (Floating Drawer / Panel) */}
      {viewState === 'expanded' && (
        <aside
          role="region"
          aria-label="Expanded Visual Intelligence and Decision Key"
          className="fixed bottom-16 right-4 z-[460] w-[500px] max-w-[95vw] max-h-[85vh] overflow-y-auto rounded bg-[#0a0f1d]/98 backdrop-blur-2xl border border-sky-500/30  p-4 text-xs font-mono text-[#f7f8f8] transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
        >
          {/* Card Header */}
          <div className="flex items-start justify-between pb-3 border-b border-[#1e293d]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-[#5e6ad2]/30">
                  {data.badge}
                </span>
                <span 
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                  style={{ color: levelColor, borderColor: `${levelColor}60`, backgroundColor: `${levelColor}15` }}
                >
                  {currentLevel}
                </span>
              </div>
              <h2 className="text-sm font-bold text-[#f7f8f8] font-sans mt-1">
                {data.pageTitle}
              </h2>
              <p className="text-[11px] text-[#d0d6e0] font-sans">
                {data.subtitle}
              </p>
            </div>

            <div className="flex items-center space-x-1 ml-2">
              <button
                onClick={() => setViewState('ticker')}
                className="p-1.5 rounded bg-[#1b2333] hover:bg-[#2b3a55] border border-[#2b3a55] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
                title="Collapse to 1-Line Ticker (K or Esc)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3.5 space-y-4">
            {/* PILLAR 1: 👁️ WHAT YOU ARE SEEING */}
            <div className="rounded bg-[#101726] border border-[#1e2533] p-3 space-y-2">
              <div className="flex items-center space-x-2 text-sky-400 font-bold text-[11px] uppercase tracking-wider font-sans">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>👁️ What You Are Seeing</span>
              </div>
              <p className="text-[#f7f8f8] text-[11px] leading-relaxed font-sans">
                {data.whatYouSee.summary}
              </p>

              {/* Sensor Specification Box */}
              <div className="bg-[#0a0d15] rounded p-2.5 border border-[#1e2533] text-[10px] space-y-1">
                <div className="text-[#d0d6e0]">
                  <strong className="text-sky-300">Sensor:</strong> {data.whatYouSee.sensor.name}
                </div>
                <div className="text-[#d0d6e0]">
                  <strong className="text-sky-300">Spatial Domain:</strong> {data.whatYouSee.sensor.spatialDomain}
                </div>
                <div className="text-[#d0d6e0]">
                  <strong className="text-sky-300">Resolution & Cadence:</strong> {data.whatYouSee.sensor.resolution} • {data.whatYouSee.sensor.cadence}
                </div>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-1 text-[10.5px] text-[#f7f8f8] list-disc pl-4 font-sans">
                {data.whatYouSee.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* PILLAR 2: 📊 HOW TO DECODE VISUALS */}
            <div className="rounded bg-[#101726] border border-[#1e2533] p-3 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-[11px] uppercase tracking-wider font-sans">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>📊 How to Decode Visuals</span>
              </div>
              <p className="text-[#f7f8f8] text-[11px] font-sans">
                {data.howToDecode.summary}
              </p>

              {/* Decoded Items Matrix */}
              <div className="space-y-1.5 pt-1">
                {data.howToDecode.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start space-x-2 p-1.5 rounded bg-[#0a0d15] border border-[#1e2533] text-[10.5px]"
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#f7f8f8] font-sans">{item.label}</span>
                        <span className="font-mono text-[10px] text-amber-300/90">{item.range}</span>
                      </div>
                      <p className="text-[10px] text-[#d0d6e0] font-sans mt-0.5 leading-tight">
                        {item.meaning}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PILLAR 3: ⚡ ACTIONABLE DECISION */}
            <div 
              className="rounded border p-3 space-y-2 relative overflow-hidden"
              style={{
                backgroundColor: `${levelColor}0a`,
                borderColor: `${levelColor}50`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[11px] uppercase tracking-wider font-sans" style={{ color: levelColor }}>
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Actionable Operational Decision</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: `${levelColor}60`, color: levelColor }}>
                  {data.actionableDecision.level}
                </span>
              </div>

              <div className="text-[#f7f8f8] font-bold text-xs font-sans tracking-tight">
                {data.actionableDecision.primaryAction}
              </div>

              <div className="text-[10px] text-[#f7f8f8] font-mono">
                <span className="text-[#d0d6e0]">Trigger:</span> {data.actionableDecision.triggerCondition}
              </div>

              {/* Action Checklist */}
              <div className="space-y-1 pt-1">
                {data.actionableDecision.actionChecklist.map((act, i) => (
                  <div key={i} className="flex items-start space-x-1.5 text-[10.5px] font-sans text-[#f7f8f8]">
                    <ArrowRight className="w-3 h-3 text-sky-400 mt-0.5 flex-shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>

              {/* Stakeholders */}
              <div className="pt-2 border-t border-[#23252a]/60 flex flex-wrap gap-1">
                {data.actionableDecision.stakeholders.map((sh, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-black/40 border border-[#23252a] text-[9.5px] font-mono text-[#f7f8f8]">
                    {sh}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer with Mission Briefing Modal Trigger */}
          <div className="mt-4 pt-3 border-t border-[#1e293d] flex items-center justify-between">
            <span className="text-[10px] text-[#d0d6e0] font-mono">
              Hotkeys: [K] Ticker • [M] Briefing • [Esc] Close
            </span>
            <button
              onClick={handleOpenModal}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-[11px] font-bold transition-all active:scale-95 "
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Mission Briefing (M) ↗</span>
            </button>
          </div>
        </aside>
      )}

      {/* Minimized Collapsed State Button (if user fully collapses) */}
      {viewState === 'collapsed' && (
        <button
          onClick={() => setViewState('ticker')}
          className="fixed bottom-4 right-4 z-[450] p-2.5 rounded bg-[#101726] border border-sky-500/30  text-sky-400 hover:text-[#f7f8f8] transition-all active:scale-95"
          title="Open Visual Intelligence Key (K)"
        >
          <Layers className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
