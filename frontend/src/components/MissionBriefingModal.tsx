import React, { useState, useEffect } from 'react';
import { 
  X, 
  Target, 
  Radar, 
  Activity, 
  Cpu, 
  History, 
  Grid, 
  Wind, 
  ShieldAlert, 
  FileText, 
  Eye, 
  BarChart3, 
  Zap, 
  CheckCircle2, 
  Radio, 
  ExternalLink 
} from 'lucide-react';
import { VisualIntelPageId } from '../types/visualIntel';
import { VISUAL_INTEL_CONFIG } from '../config/visualIntelConfig';

export interface MissionBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPage?: VisualIntelPageId;
}

const PAGE_TABS: Array<{ id: VisualIntelPageId; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'hazard', label: '1. Hazard GIS', icon: Radar },
  { id: 'tactical', label: '2. Tactical C2', icon: Target },
  { id: 'hyperlocal', label: '3. 3x3 Airfield Twin', icon: Radio },
  { id: 'inference', label: '4. AI Pipeline', icon: Cpu },
  { id: 'replay', label: '5. Case Replay', icon: History },
  { id: 'grid', label: '6. Grid XAI', icon: Grid },
  { id: 'microburst', label: '7. 3x3km Microburst', icon: Wind },
];

export const MissionBriefingModal: React.FC<MissionBriefingModalProps> = ({
  isOpen,
  onClose,
  initialPage = 'hazard',
}) => {
  const [selectedTab, setSelectedTab] = useState<VisualIntelPageId>(initialPage);
  const [activeSection, setActiveSection] = useState<'briefing' | 'sop' | 'problem_statement'>('briefing');

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen && initialPage) {
      setSelectedTab(initialPage);
    }
  }, [isOpen, initialPage]);

  // Keyboard navigation & dismissal ('Escape' key and 'm'/'M' toggle)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onClose();
      } else if (e.key >= '1' && e.key <= '7') {
        const index = parseInt(e.key, 10) - 1;
        if (PAGE_TABS[index]) {
          setSelectedTab(PAGE_TABS[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentIntel = VISUAL_INTEL_CONFIG[selectedTab] || VISUAL_INTEL_CONFIG.hazard;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0a0f1d] border border-sky-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-briefing-title"
      >
        {/* Modal Header */}
        <header className="px-6 py-4 bg-[#0d1424] border-b border-[#1e293d] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 id="mission-briefing-title" className="text-base font-bold text-white font-sans tracking-tight">
                  CONVECT-NOW // OPERATIONAL MISSION BRIEFING
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  MoES PS-26084
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Sub-Kilometer Severe Convective Nowcasting, Aerodrome Wind Shear & Civil Disaster Decision Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Press [Esc] or [M] to close
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#151c2e] hover:bg-[#222d48] border border-slate-700 text-slate-400 hover:text-white transition-colors"
              aria-label="Close Mission Briefing Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Section Navigation Ribbon */}
        <div className="bg-[#0b101b] border-b border-[#1b2537] px-6 py-2 flex items-center justify-between">
          {/* Subsystem Tabs (1-7) */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-thin">
            {PAGE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-sky-500/20 border border-sky-500/50 text-sky-300 font-bold shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section View Mode */}
          <div className="hidden lg:flex items-center space-x-1 bg-[#101726] p-1 rounded-lg border border-[#1e2a42]">
            <button
              onClick={() => setActiveSection('briefing')}
              className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-all ${
                activeSection === 'briefing' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              System Intel
            </button>
            <button
              onClick={() => setActiveSection('sop')}
              className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-all ${
                activeSection === 'sop' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              SOP Action Tree
            </button>
            <button
              onClick={() => setActiveSection('problem_statement')}
              className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-all ${
                activeSection === 'problem_statement' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              MoES PS-26084
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
          {activeSection === 'briefing' && (
            <>
              {/* Active Subsystem Title Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#1e293d] gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      {currentIntel.badge}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Subsystem #{PAGE_TABS.findIndex((t) => t.id === selectedTab) + 1} of 7
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white font-sans mt-1">
                    {currentIntel.pageTitle}
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    {currentIntel.subtitle}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-[#0f172a] border border-[#22314e] rounded-xl px-4 py-2 text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Lead Metric</span>
                    <span className="text-sm font-mono font-bold text-sky-300">{currentIntel.ticker.metric}</span>
                  </div>
                </div>
              </div>

              {/* The 3 Core Pillars in Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Pillar 1: What You Are Seeing */}
                <div className="rounded-xl bg-[#0e1628]/90 border border-[#1e2a42] p-4 flex flex-col">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs uppercase tracking-wider font-sans mb-3 pb-2 border-b border-[#1b263b]">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>👁️ What You Are Seeing</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans mb-3">
                    {currentIntel.whatYouSee.summary}
                  </p>

                  <div className="bg-[#090d18] rounded-lg p-3 border border-[#1b263b] text-[11px] space-y-1.5 mb-3 font-mono">
                    <div><span className="text-slate-400 font-semibold">Sensor:</span> <span className="text-sky-300">{currentIntel.whatYouSee.sensor.name}</span></div>
                    <div><span className="text-slate-400 font-semibold">Specs:</span> <span className="text-slate-300">{currentIntel.whatYouSee.sensor.specs}</span></div>
                    <div><span className="text-slate-400 font-semibold">Domain:</span> <span className="text-slate-300">{currentIntel.whatYouSee.sensor.spatialDomain}</span></div>
                    <div><span className="text-slate-400 font-semibold">Cadence:</span> <span className="text-slate-300">{currentIntel.whatYouSee.sensor.cadence}</span></div>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 font-sans flex-1">
                    {currentIntel.whatYouSee.points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>

                {/* Pillar 2: How to Decode Visuals */}
                <div className="rounded-xl bg-[#0e1628]/90 border border-[#1e2a42] p-4 flex flex-col">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-sans mb-3 pb-2 border-b border-[#1b263b]">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span>📊 How to Decode Visuals</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans mb-3">
                    {currentIntel.howToDecode.summary}
                  </p>

                  <div className="space-y-2 flex-1">
                    {currentIntel.howToDecode.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-2 rounded-lg bg-[#090d18] border border-[#1b263b] text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            ></span>
                            <span className="font-semibold text-white font-sans">{item.label}</span>
                          </div>
                          <span className="font-mono text-[11px] text-amber-300">{item.range}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-tight">
                          {item.meaning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pillar 3: Actionable Operational Decision */}
                <div className="rounded-xl bg-[#0e1628]/90 border border-[#1e2a42] p-4 flex flex-col">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-sans mb-3 pb-2 border-b border-[#1b263b]">
                    <Zap className="w-4 h-4 text-rose-400" />
                    <span>⚡ Actionable Operational Decision</span>
                  </div>

                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-rose-400 tracking-wider block mb-1">
                      MANDATORY DIRECTIVE
                    </span>
                    <h3 className="text-xs font-bold text-white font-sans">
                      {currentIntel.actionableDecision.primaryAction}
                    </h3>
                  </div>

                  <div className="text-xs text-slate-300 font-mono mb-3 bg-[#090d18] p-2.5 rounded-lg border border-[#1b263b]">
                    <span className="text-slate-400">Trigger:</span> {currentIntel.actionableDecision.triggerCondition}
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">Execution Checklist:</span>
                    {currentIntel.actionableDecision.actionChecklist.map((act, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs font-sans text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#1b263b]">
                    <span className="text-[10px] font-mono text-slate-500 block mb-1.5">Action Stakeholders:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentIntel.actionableDecision.stakeholders.map((sh, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-[#101726] border border-[#212f48] text-[10px] font-mono text-sky-300">
                          {sh}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'sop' && (
            <div className="space-y-6">
              <div className="border-b border-[#1e293d] pb-3">
                <h2 className="text-lg font-bold text-white font-sans">
                  Standard Operating Procedures (SOP) Action Matrix
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Verbatim operational protocols for ATC Tower, State Disaster Authorities (OSDMA), and Urban Emergency Teams
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(VISUAL_INTEL_CONFIG).map((cfg) => (
                  <div key={cfg.pageId} className="rounded-xl bg-[#0e1628] border border-[#1e2a42] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-sky-400">{cfg.pageTitle}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 border border-red-500/30 text-rose-300">
                        {cfg.actionableDecision.level}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white font-sans">
                      {cfg.actionableDecision.primaryAction}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Protocol: {cfg.actionableDecision.protocol}
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4 font-sans">
                      {cfg.actionableDecision.actionChecklist.slice(0, 2).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'problem_statement' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="border-b border-[#1e293d] pb-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    PROBLEM STATEMENT PS-26084
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Ministry of Earth Sciences (MoES) / NCMRWF
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white font-sans mt-2">
                  Sub-Kilometer Nowcasting of Severe Convective Events & Aviation Hazards
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs leading-relaxed font-sans text-slate-300">
                <div className="bg-[#0e1628] p-4 rounded-xl border border-[#1e2a42] space-y-3">
                  <h3 className="text-sm font-bold text-sky-400 flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-sky-400" />
                    <span>The Operational Challenge</span>
                  </h3>
                  <p>
                    Standard numerical weather prediction models (e.g. NCUM 12km, GFS 25km) operate at temporal and spatial resolutions inadequate for detecting micro-scale convective cloudbursts and aerodrome microbursts.
                  </p>
                  <p>
                    A severe downburst develops, plunges, and impacts runway operations in under <strong>15 minutes</strong> across a spatial footprint of less than <strong>3.0 km²</strong>. Without sub-kilometer nowcasting, pilots and civil authorities receive zero advance notice.
                  </p>
                </div>

                <div className="bg-[#0e1628] p-4 rounded-xl border border-[#1e2a42] space-y-3">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>The Convect Architecture Solution</span>
                  </h3>
                  <p>
                    <strong>Convect</strong> resolves PS-26084 by fusing real-time IMD S-Band Doppler Radar (0.95° beamwidth), INSAT-3DR Thermal IR, in-situ AWS mesonet telemetry, and total lightning jump metrics into a 4D multimodal spatiotemporal deep learning model (ConvectNet).
                  </p>
                  <p>
                    This delivers <strong>1.0 km² spatial precision</strong> with <strong>0–60 minute actionable lead times</strong>, exceeding WMO benchmarks (CSI &gt; 0.85, POD &gt; 0.92, FAR &lt; 0.08) and enabling zero-latency automated ATC go-arounds and NDMA CAP siren broadcasts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-3 bg-[#0d1424] border-t border-[#1e293d] flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-4">
            <span>VAJRA FUSI0NX • MoES PS-26084</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline text-sky-400">9 In-Situ AWS Mesonet Stations Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#2b3a54] text-white font-medium transition-all active:scale-95 border border-slate-600"
          >
            Close Briefing [Esc]
          </button>
        </footer>
      </div>
    </div>
  );
};
