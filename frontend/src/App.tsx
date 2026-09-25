import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Radar, 
  Satellite, 
  CloudLightning, 
  BarChart3, 
  Play, 
  Pause, 
  RotateCcw, 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  Radio,
  ExternalLink,
  Sparkles,
  Server,
  Clock
} from 'lucide-react';
import { HazardMap } from './components/HazardMap';
import { ETACountdown } from './components/ETACountdown';
import { HazardMeters } from './components/HazardMeters';
import { EvaluationPanel } from './components/EvaluationPanel';
import { CapAlertModal } from './components/CapAlertModal';
import { StormAnatomyScrolly } from './components/scrollytelling/StormAnatomyScrolly';
// Import ArchitecturePage - Agent 2 is creating this
// @ts-ignore
import ArchitecturePage from './components/ArchitecturePage';

export default function App() {
  const [stormData, setStormData] = useState<any>(null);
  const [replayEvents, setReplayEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('0');
  const [evalData, setEvalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [activeLayer, setActiveLayer] = useState<string>('dbz');
  const [viewMode, setViewMode] = useState<'tactical' | 'anatomy' | 'public' | 'architecture'>('tactical');
  
  // 4D timeline scrubber (0 = T0, 60 = T+60m)
  const [leadTimeMin, setLeadTimeMin] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Modals
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [activeAlertCellId, setActiveAlertCellId] = useState<string | null>(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const fetchReplayEvents = async () => {
    try {
      const res = await fetch('http://localhost:8008/api/replay/events');
      if (res.ok) {
        const data = await res.json();
        setReplayEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to fetch replay events:', e);
    }
  };

  useEffect(() => {
    fetchReplayEvents();
  }, []);

  const fetchStorm = async (idx: number = 0) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8008/api/storm/${idx}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStormData(data);
      if (data.storm_cells && data.storm_cells.length > 0) {
        setSelectedCell(data.storm_cells[0]);
      }
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError("Backend not reachable. Ensure server.py is running on port 8008.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluation = async (idx: number = 0) => {
    try {
      const res = await fetch(`http://localhost:8008/api/storm/${idx}/eval`);
      if (res.ok) {
        const data = await res.json();
        setEvalData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStorm(0);
    fetchEvaluation(0);
  }, []);

  // Time scrubber animation loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setLeadTimeMin((prev) => (prev >= 60 ? 0 : prev + 5));
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const dbzGridToDisplay = leadTimeMin === 0 
    ? stormData?.radar_preview?.t0_dbz_grid ?? []
    : stormData?.radar_preview?.t60_dbz_grid ?? [];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0d15] text-slate-100 overflow-hidden font-sans">
      {/* Top Ministry / NCMRWF Header (Blizzard Styled) */}
      <header className="h-16 bg-[#0a0d15]/95 border-b border-white/10 px-6 flex items-center justify-between shrink-0 backdrop-blur-xl z-20">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1888ef] to-[#38a8ff] flex items-center justify-center shadow-[0_0_18px_rgba(56,168,255,0.45)]">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-5.5">
              <h1 className="text-base font-black tracking-wide text-white font-heading uppercase">
                ConvectNow
              </h1>
              <span className="text-[10px] bg-[#131928] text-[#38a8ff] px-2.5 py-0.5 rounded-full border border-[#38a8ff]/30 font-mono font-bold tracking-wider">
                1–2 km CONVECTIVE NOWCASTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight">
              Ministry of Earth Sciences (MoES) · NCMRWF · SIH PS-26084
            </p>
          </div>
        </div>

        {/* Live Multi-Source Ingestion Telemetry & Clock */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="flex items-center space-x-3.5 text-xs font-mono bg-[#131928]/80 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Radar className="w-3.5 h-3.5 text-emerald-400" />
              <span>DWR 250m: <strong className="text-emerald-400">SYNCED</strong></span>
            </div>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#38a8ff]" />
              <Satellite className="w-3.5 h-3.5 text-[#38a8ff]" />
              <span>INSAT-3DR: <strong className="text-[#38a8ff]">10.8µm ACTIVE</strong></span>
            </div>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <CloudLightning className="w-3.5 h-3.5 text-yellow-400" />
              <span>GLM/IITM: <strong className="text-yellow-400">STREAMING</strong></span>
            </div>
          </div>
          
          {/* Real-time Clock */}
          <div className="flex items-center space-x-2 text-xs font-mono bg-[#131928]/80 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md text-[#38a8ff]">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime.toISOString().split('T')[1].substring(0,8)} UTC</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Mode Switcher Pill */}
          <div className="bg-[#131928] border border-white/10 p-1 rounded-full flex items-center text-xs shadow-inner">
            <button
              onClick={() => setViewMode('tactical')}
              className={`px-4 py-1.5 rounded-full transition-all flex items-center space-x-1.5 ${
                viewMode === 'tactical'
                  ? 'bg-gradient-to-r from-[#1888ef] to-[#009fe9] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Tactical Command</span>
            </button>
            <button
              onClick={() => setViewMode('anatomy')}
              className={`px-4 py-1.5 rounded-full transition-all flex items-center space-x-1.5 ${
                viewMode === 'anatomy'
                  ? 'bg-gradient-to-r from-[#1888ef] to-[#009fe9] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>4D Anatomy</span>
            </button>
            <button
              onClick={() => setViewMode('architecture')}
              className={`px-4 py-1.5 rounded-full transition-all flex items-center space-x-1.5 ${
                viewMode === 'architecture'
                  ? 'bg-gradient-to-r from-[#1888ef] to-[#009fe9] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>System Arch</span>
            </button>
            <button
              onClick={() => setViewMode('public')}
              className={`px-4 py-1.5 rounded-full transition-all flex items-center space-x-1.5 ${
                viewMode === 'public'
                  ? 'bg-gradient-to-r from-[#1888ef] to-[#009fe9] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Public View</span>
            </button>
          </div>

          {/* Scientific Verification Modal Button */}
          <button
            onClick={() => setShowEvalModal(true)}
            className="btn-blizzard-secondary text-xs px-4 py-1.5 flex items-center space-x-2"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#38a8ff]" />
            <span>Skill Scores</span>
          </button>
        </div>
      </header>

      {/* Main App Body */}
      {viewMode === 'architecture' ? (
        <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#38a8ff]">Loading Architecture...</div>}>
          <ArchitecturePage />
        </React.Suspense>
      ) : viewMode === 'anatomy' ? (
        <StormAnatomyScrolly onBackToTactical={() => setViewMode('tactical')} />
      ) : viewMode === 'tactical' ? (
        <main className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* Left/Center Column: GIS Map & 4D Timeline Scrubber */}
          <section className="flex-1 flex flex-col gap-3 min-w-0">
            {/* GIS Map Box */}
            <div className="flex-1 min-h-0">
              <HazardMap
                cells={stormData?.storm_cells ?? []}
                dbzGrid={dbzGridToDisplay}
                selectedCell={selectedCell}
                onSelectCell={setSelectedCell}
                activeLayer={activeLayer}
                onLayerChange={(layer: string) => setActiveLayer(layer)}
                leadTimeMin={leadTimeMin}
              />
            </div>

            {/* 4D Timeline Scrubber Bar (Blizzard Card) */}
            <div className="h-20 card-blizzard rounded-3xl px-6 flex flex-col justify-center shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#131928]/90 via-transparent to-[#131928]/90 pointer-events-none"></div>
              
              <div className="flex items-center justify-between relative z-10">
                {/* VCR Controls */}
                <div className="flex items-center space-x-5">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setLeadTimeMin(prev => Math.max(0, prev - 5));
                    }}
                    className="p-2.5 rounded-full bg-[#131928] hover:bg-[#1a233a] text-slate-400 hover:text-white border border-white/10 transition-all active:scale-95 shadow-sm"
                    title="Step Backward"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-3 rounded-full bg-gradient-to-br from-[#38a8ff] to-[#0070f3] text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(56,168,255,0.4)]"
                    title={isPlaying ? "Pause Forecast Loop" : "Play Forecast Loop"}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setLeadTimeMin(0);
                    }}
                    className="p-2.5 rounded-full bg-[#131928] hover:bg-[#1a233a] text-slate-400 hover:text-white border border-white/10 transition-all active:scale-95 shadow-sm"
                    title="Reset to T0 Analysis"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrubber slider */}
                <div className="flex-1 max-w-2xl mx-6 flex items-center space-x-4">
                  <span className="text-[11px] font-mono font-semibold text-slate-300 whitespace-nowrap">
                    T0 (Live)
                  </span>
                  <div className="relative flex-1 group">
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={leadTimeMin}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setLeadTimeMin(parseInt(e.target.value));
                      }}
                      className="w-full accent-[#38a8ff] cursor-pointer h-2 bg-[#1a233a] rounded-full appearance-none outline-none group-hover:bg-[#222d4a] transition-colors"
                      style={{
                        background: `linear-gradient(to right, #38a8ff ${(leadTimeMin / 60) * 100}%, #1a233a ${(leadTimeMin / 60) * 100}%)`
                      }}
                    />
                    <div className="absolute -top-6 left-0 right-0 flex justify-between text-[9px] text-slate-500 font-mono px-1 pointer-events-none">
                      <span>0m</span>
                      <span>15m</span>
                      <span>30m</span>
                      <span>45m</span>
                      <span>60m</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-white font-bold whitespace-nowrap min-w-[75px] bg-[#1a233a] px-3 py-1.5 rounded-lg border border-[#38a8ff]/30 text-center shadow-inner">
                    +{leadTimeMin} min
                  </span>
                </div>

                {/* Historical Event Selector */}
                <div className="flex items-center space-x-3">
                  <div className="text-right text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Historical Replay
                  </div>
                  <select 
                    className="bg-[#0f1423] text-xs font-mono text-[#38a8ff] border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[#38a8ff]/50 shadow-inner cursor-pointer"
                    value={selectedEventId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedEventId(val);
                      fetchStorm(parseInt(val) || 0);
                      fetchEvaluation(parseInt(val) || 0);
                      setLeadTimeMin(0);
                      setIsPlaying(false);
                    }}
                  >
                    {replayEvents.length > 0 ? (
                      replayEvents.map((evt, i) => (
                        <option key={i} value={i}>{evt.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="0">SEVIR-2019-0612 (Oklahoma)</option>
                        <option value="1">IMD-2023-0814 (Uttarakhand)</option>
                        <option value="2">MOSDAC-2024-0511 (Mumbai)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Per-Storm ETA Clocks & Hazard Physics Engine */}
          <aside className="w-96 flex flex-col gap-3 shrink-0">
            {/* Top: ETA Countdown Clocks */}
            <div className="h-1/2">
              <ETACountdown
                stormCells={stormData?.storm_cells ?? []}
                onTriggerAlert={(cellId) => setActiveAlertCellId(cellId)}
              />
            </div>

            {/* Bottom: 4 Convective Hazard Meters */}
            <div className="h-1/2">
              <HazardMeters
                summary={stormData?.hazard_summary ?? {}}
                selectedCell={selectedCell}
                onLaunchAnatomy={() => setViewMode('anatomy')}
              />
            </div>
          </aside>
        </main>
      ) : (
        /* Public Simplified Alert Card View (Blizzard Styled) */
        <main className="flex-1 flex items-center justify-center p-6 bg-[#0a0d15] relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="max-w-lg w-full card-blizzard border-2 border-red-500/60 rounded-3xl p-7 shadow-[0_20px_60px_rgba(239,68,68,0.25)] text-center space-y-6 relative z-10 animate-in fade-in zoom-in duration-500">
            <div className="inline-flex p-4 rounded-full bg-red-950/80 border border-red-600/60 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
              <AlertTriangle className="w-12 h-12" />
            </div>

            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-red-300 bg-red-950/90 px-3.5 py-1.5 rounded-full border border-red-700/80 shadow-sm">
                🔴 IMMEDIATE SEVERE STORM ALERT
              </span>
              <h2 className="text-2xl font-black text-white mt-4 font-heading tracking-wide uppercase">
                {selectedCell ? `${selectedCell.severity} THUNDERSTORM` : "SEVERE WEATHER ALERT"}
              </h2>
              <p className="text-sm text-slate-300 mt-2 font-sans">
                ConvectNow radar fusion has detected an explosive convective thunderstorm cell approaching.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 py-3 border-y border-white/10 text-left">
              <div className="bg-[#131928]/80 p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Expected Arrival</span>
                <div className="text-xl font-bold font-mono text-[#38a8ff] mt-0.5">
                  {selectedCell ? `${selectedCell.eta_minutes} min` : "24 - 38 min"}
                </div>
              </div>
              <div className="bg-[#131928]/80 p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Max Intensity</span>
                <div className="text-xl font-bold font-mono text-red-400 mt-0.5">
                  {selectedCell ? `${selectedCell.max_dbz} dBZ` : "SEVERE"}
                </div>
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-600/50 p-4 rounded-2xl text-xs text-amber-200 text-left space-y-1.5 shadow-inner">
              <strong className="font-semibold text-amber-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Mandatory Safety Actions:
              </strong>
              <ul className="list-disc list-inside space-y-1 text-amber-300/90 text-[11px] leading-relaxed">
                <li>Move indoors immediately; avoid metal sheds and tin roofs.</li>
                <li>Stay clear of riverbeds and natural drainage channels (Cloudburst Risk).</li>
                <li>Disconnect electrical appliances and do not take shelter under trees.</li>
              </ul>
            </div>

            <button
              onClick={() => setViewMode('tactical')}
              className="btn-blizzard-secondary w-full py-3 rounded-full text-xs font-bold"
            >
              Switch Back to Meteorological Command Dashboard
            </button>
          </div>
        </main>
      )}

      {/* Scientific Evaluation Modal */}
      <EvaluationPanel
        isOpen={showEvalModal}
        onClose={() => setShowEvalModal(false)}
        evalData={evalData}
      />

      {/* NDMA CAP v1.2 XML Alert Modal */}
      {activeAlertCellId && (
        <CapAlertModal
          isOpen={true}
          onClose={() => setActiveAlertCellId(null)}
          cellId={activeAlertCellId}
        />
      )}
    </div>
  );
}
