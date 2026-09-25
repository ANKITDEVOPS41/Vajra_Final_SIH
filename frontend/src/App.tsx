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
  Clock,
  Smartphone,
  Shield
} from 'lucide-react';
import { HazardMap } from './components/HazardMap';
import { ETACountdown } from './components/ETACountdown';
import { HazardMeters } from './components/HazardMeters';
import { EvaluationPanel } from './components/EvaluationPanel';
import { CapAlertModal } from './components/CapAlertModal';
import { StormAnatomyScrolly } from './components/scrollytelling/StormAnatomyScrolly';
import { AdminIntelligencePanel } from './components/AdminIntelligencePanel';
import { CitizenWarningInterface } from './components/CitizenWarningInterface';
import { 
  DispatchedAlert, 
  DEFAULT_FALLBACK_ALERT, 
  createDispatchedAlert, 
  FALLBACK_STORM_CELLS 
} from './types/dispatch';
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
  
  // Tactical Command right-sidebar tab: 'physics' vs 'intel'
  const [sidebarTab, setSidebarTab] = useState<'physics' | 'intel'>('physics');

  // Active Dispatched Alert State
  const [dispatchedAlert, setDispatchedAlert] = useState<DispatchedAlert | null>(DEFAULT_FALLBACK_ALERT);

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
        setDispatchedAlert(createDispatchedAlert(data.storm_cells[0]));
      }
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError("Backend not reachable. Ensure server.py is running on port 8008.");
      if (!selectedCell) {
        setSelectedCell(FALLBACK_STORM_CELLS[0]);
        setDispatchedAlert(createDispatchedAlert(FALLBACK_STORM_CELLS[0]));
      }
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
    <div className="flex flex-col h-screen w-screen bg-[#0a0e1a] text-slate-100 overflow-hidden font-sans">
      {/* Top Ministry / NCMRWF Header (Blizzard Styled) */}
      <header className="h-16 bg-[#0a0e1a]/95 border-b border-white/10 px-6 flex items-center justify-between shrink-0 backdrop-blur-xl z-20">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-md bg-gradient-to-tr from-[#1888ef] to-[#38a8ff] flex items-center justify-center shadow-[0_0_18px_rgba(56,168,255,0.45)]">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-base font-black tracking-wide text-white font-heading uppercase">
                ConvectNow
              </h1>
              <span className="text-[10px] bg-[#111729] text-[#1aaaff] px-2.5 py-0.5 rounded-md border border-[#1aaaff]/30 font-mono font-bold tracking-wider whitespace-nowrap">
                1–2 km CONVECTIVE NOWCASTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight whitespace-nowrap truncate">
              Ministry of Earth Sciences (MoES) · NCMRWF · SIH PS-26084
            </p>
          </div>
        </div>

        {/* Live Multi-Source Ingestion Telemetry & Clock */}
        <div className="hidden xl:flex items-center space-x-4">
          <div className="flex items-center space-x-3.5 text-xs font-mono bg-[#111729]/80 border border-white/10 px-4 py-1.5 rounded-md backdrop-blur-md">
            <div className="flex items-center space-x-1.5 text-slate-300 whitespace-nowrap">
              <span className="w-2 h-2 rounded-md bg-emerald-400 animate-pulse" />
              <Radar className="w-3.5 h-3.5 text-emerald-400" />
              <span>DWR 250m: <strong className="text-emerald-400">SYNCED</strong></span>
            </div>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center space-x-1.5 text-slate-300 whitespace-nowrap">
              <span className="w-2 h-2 rounded-md bg-[#38a8ff]" />
              <Satellite className="w-3.5 h-3.5 text-[#1aaaff]" />
              <span>INSAT-3DR: <strong className="text-[#1aaaff]">10.8µm ACTIVE</strong></span>
            </div>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center space-x-1.5 text-slate-300 whitespace-nowrap">
              <span className="w-2 h-2 rounded-md bg-yellow-400 animate-pulse" />
              <CloudLightning className="w-3.5 h-3.5 text-yellow-400" />
              <span>GLM/IITM: <strong className="text-yellow-400">STREAMING</strong></span>
            </div>
          </div>
          
          {/* Real-time Clock */}
          <div className="flex items-center space-x-2 text-xs font-mono bg-[#111729]/80 border border-white/10 px-3 py-1.5 rounded-md backdrop-blur-md text-[#1aaaff]">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime.toISOString().split('T')[1].substring(0,8)} UTC</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Mode Switcher Pill */}
          <div className="bg-[#111729] border border-white/10 p-1 rounded-md flex items-center text-xs shadow-inner">
            <button
              onClick={() => setViewMode('tactical')}
              className={`px-4 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
                viewMode === 'tactical'
                  ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Tactical Command</span>
            </button>
            <button
              onClick={() => setViewMode('anatomy')}
              className={`px-4 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
                viewMode === 'anatomy'
                  ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>4D Anatomy</span>
            </button>
            <button
              onClick={() => setViewMode('architecture')}
              className={`px-4 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
                viewMode === 'architecture'
                  ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>System Arch</span>
            </button>
            <button
              onClick={() => setViewMode('public')}
              className={`px-4 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
                viewMode === 'public'
                  ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold shadow-[0_2px_12px_rgba(56,168,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mausam App (Citizen)</span>
              {dispatchedAlert && (
                <span className="w-1.5 h-1.5 rounded-md bg-red-500 animate-ping ml-0.5" />
              )}
            </button>
          </div>

          {/* Scientific Verification Modal Button */}
          <button
            onClick={() => setShowEvalModal(true)}
            className="btn-blizzard-secondary text-xs px-4 py-1.5 flex items-center space-x-2"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#1aaaff]" />
            <span>Skill Scores</span>
          </button>
        </div>
      </header>

      {/* Main App Body */}
      {viewMode === 'architecture' ? (
        <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#1aaaff]">Loading Architecture...</div>}>
          <ArchitecturePage />
        </React.Suspense>
      ) : viewMode === 'anatomy' ? (
        <StormAnatomyScrolly onBackToTactical={() => setViewMode('tactical')} />
      ) : viewMode === 'tactical' ? (
        <main className="flex-1 flex flex-col overflow-hidden p-3 gap-2.5">
          {/* Active Broadcast Notification Banner */}
          {dispatchedAlert && (
            <div className="bg-gradient-to-r from-red-950/90 via-[#18233a]/90 to-ocean-950/90 border border-red-500/50 px-4 py-2 rounded-2xl flex items-center justify-between shrink-0 shadow-[0_4px_20px_rgba(239,68,68,0.2)] animate-in fade-in">
              <div className="flex items-center space-x-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-md bg-red-500 animate-ping shrink-0" />
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-red-300 bg-red-950 px-2.5 py-0.5 rounded-md border border-red-700/60 shrink-0">
                  {dispatchedAlert.threatLevel} BROADCAST ACTIVE
                </span>
                <span className="text-xs text-white font-heading truncate">
                  <strong>{dispatchedAlert.stormName}</strong> · Approaching {dispatchedAlert.targetLocation} (ETA: {dispatchedAlert.etaMinutes} min)
                </span>
                <span className="hidden xl:inline-block text-[11px] text-slate-300 font-mono shrink-0">
                  • {dispatchedAlert.affectedPopulation.toLocaleString()} citizens alerted across {dispatchedAlert.broadcastRadiusKm} km radius
                </span>
              </div>
              <button
                onClick={() => setViewMode('public')}
                className="btn-blizzard-primary text-xs px-3.5 py-1.5 flex items-center space-x-1.5 shrink-0 shadow-[0_0_15px_rgba(56,168,255,0.4)] ml-3"
              >
                <span>Preview Citizen View (Mausam App)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden gap-3 min-h-0">
            {/* Left/Center Column: GIS Map & 4D Timeline Scrubber */}
            <section className="flex-1 flex flex-col gap-3 min-w-0">
              {/* GIS Map Box */}
              <div className="flex-1 min-h-0">
                <HazardMap
                  cells={stormData?.storm_cells ?? FALLBACK_STORM_CELLS}
                  dbzGrid={dbzGridToDisplay}
                  selectedCell={selectedCell || FALLBACK_STORM_CELLS[0]}
                  onSelectCell={(cell) => {
                    setSelectedCell(cell);
                    setDispatchedAlert(createDispatchedAlert(cell));
                  }}
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
                      className="p-2.5 rounded-md bg-[#111729] hover:bg-[#1a233a] text-slate-400 hover:text-white border border-white/10 transition-all active:scale-95 shadow-sm"
                      title="Step Backward"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-3 rounded-md bg-gradient-to-br from-[#38a8ff] to-[#0070f3] text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(56,168,255,0.4)]"
                      title={isPlaying ? "Pause Forecast Loop" : "Play Forecast Loop"}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setLeadTimeMin(0);
                      }}
                      className="p-2.5 rounded-md bg-[#111729] hover:bg-[#1a233a] text-slate-400 hover:text-white border border-white/10 transition-all active:scale-95 shadow-sm"
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
                        className="w-full accent-[#38a8ff] cursor-pointer h-2 bg-[#1a233a] rounded-md appearance-none outline-none group-hover:bg-[#222d4a] transition-colors"
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
                    <span className="text-sm font-mono text-white font-bold whitespace-nowrap min-w-[75px] bg-[#1a233a] px-3 py-1.5 rounded-lg border border-[#1aaaff]/30 text-center shadow-inner">
                      +{leadTimeMin} min
                    </span>
                  </div>

                  {/* Historical Event Selector */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Historical Replay
                    </div>
                    <select 
                      className="bg-[#0f1423] text-xs font-mono text-[#1aaaff] border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[#38a8ff]/50 shadow-inner cursor-pointer"
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

            {/* Right Column: Per-Storm ETA Clocks & Hazard Physics / SDMA Intel */}
            <aside className="w-96 flex flex-col gap-2.5 shrink-0">
              {/* Top: ETA Countdown Clocks */}
              <div className="h-[36%] min-h-0">
                <ETACountdown
                  stormCells={stormData?.storm_cells ?? FALLBACK_STORM_CELLS}
                  onTriggerAlert={(cellId) => {
                    setActiveAlertCellId(cellId);
                    const cells = stormData?.storm_cells ?? FALLBACK_STORM_CELLS;
                    const matchingCell = cells.find((c: any) => c.cell_id === cellId) || cells[0];
                    setSelectedCell(matchingCell);
                    setDispatchedAlert(createDispatchedAlert(matchingCell));
                  }}
                />
              </div>

              {/* Segmented Tab Switcher between [ ⚡ Physics Hazards | 🛡️ SDMA Disaster Intel ] */}
              <div className="bg-[#111729] border border-white/10 p-1 rounded-2xl flex items-center text-xs shadow-inner shrink-0">
                <button
                  onClick={() => setSidebarTab('physics')}
                  className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 font-mono text-[11px] ${
                    sidebarTab === 'physics'
                      ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold shadow-[0_2px_10px_rgba(56,168,255,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>⚡ Physics Hazards</span>
                </button>
                <button
                  onClick={() => setSidebarTab('intel')}
                  className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 font-mono text-[11px] ${
                    sidebarTab === 'intel'
                      ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold shadow-[0_2px_10px_rgba(56,168,255,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🛡️ SDMA Disaster Intel</span>
                </button>
              </div>

              {/* Bottom: Tabbed Hazard Meters OR Admin Intelligence Panel */}
              <div className="flex-1 min-h-0">
                {sidebarTab === 'physics' ? (
                  <HazardMeters
                    summary={stormData?.hazard_summary ?? {}}
                    selectedCell={selectedCell || FALLBACK_STORM_CELLS[0]}
                    onLaunchAnatomy={() => setViewMode('anatomy')}
                  />
                ) : (
                  <AdminIntelligencePanel
                    selectedCell={selectedCell || FALLBACK_STORM_CELLS[0]}
                    availableCells={stormData?.storm_cells ?? FALLBACK_STORM_CELLS}
                    onSelectCell={(cell) => {
                      setSelectedCell(cell);
                      setDispatchedAlert(createDispatchedAlert(cell));
                    }}
                    activeDispatchedAlert={dispatchedAlert}
                    onDispatchAlert={(alert) => {
                      setDispatchedAlert(alert);
                    }}
                    onSwitchToCitizenView={() => setViewMode('public')}
                  />
                )}
              </div>
            </aside>
          </div>
        </main>
      ) : (
        /* Public Citizen Warning Interface (Mausam App POV) */
        <CitizenWarningInterface
          alert={dispatchedAlert}
          onBackToAdmin={() => setViewMode('tactical')}
          onSimulateDispatch={(cellId) => {
            const cells = stormData?.storm_cells ?? FALLBACK_STORM_CELLS;
            const matchingCell = cells.find((c: any) => c.cell_id === cellId) || cells[0];
            setSelectedCell(matchingCell);
            setDispatchedAlert(createDispatchedAlert(matchingCell));
          }}
          availableCells={stormData?.storm_cells ?? FALLBACK_STORM_CELLS}
        />
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
