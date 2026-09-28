import React, { useState, useEffect } from 'react';
import { 
  Radar, CloudLightning, MapPin, Activity, Info, ExternalLink, Cpu, ShieldCheck, Grid, Radio, Target, Compass
} from 'lucide-react';
import { ETACountdown } from './components/ETACountdown';
import { CitizenWarningInterface } from './components/CitizenWarningInterface';
import { InferencePipelineView } from './components/InferencePipelineView';
import { HyperlocalTwinMap } from './components/HyperlocalTwinMap';
import { HistoricalReplayView } from './components/HistoricalReplayView';
import { ExplainableGridTracker } from './components/ExplainableGridTracker';
import { MicroburstSimulationView } from './components/MicroburstSimulationView';
import { TacticalAirportMapEngine, VEBS_AIRPORT_CENTER } from './components/TacticalAirportMapEngine';
import HazardDashboard from './components/HazardDashboard';
import TacticalOperationsDashboard from './components/TacticalOperationsDashboard';
import ConvectNowDashboard from './components/convectnow/ConvectNowDashboard';
import { MissionBriefingModal } from './components/MissionBriefingModal';
import { 
  DispatchedAlert, 
  createDispatchedAlert, 
  FALLBACK_STORM_CELLS 
} from './types/dispatch';
import { ApiService } from './services/api';
import { TACTICAL_3X3_GRID, SURROUNDING_AWS_STATIONS } from './types/tacticalGrid';

export default function App() {
  const [stormData, setStormData] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [dispatchedAlert, setDispatchedAlert] = useState<DispatchedAlert | null>(null);
  const [viewMode, setViewMode] = useState<'hazard' | 'tactical' | 'convectnow' | 'inference' | 'public' | 'hyperlocal' | 'replay' | 'grid' | 'microburst'>('hazard');
  const [showMissionBriefing, setShowMissionBriefing] = useState<boolean>(false);

  const [backendLive, setBackendLive] = useState<boolean | null>(null);

  useEffect(() => {
    // Try to load live storm cell data from the trained ConvectNet backend.
    // Falls back to FALLBACK_STORM_CELLS silently if backend is not running.
    const loadLiveData = async () => {
      const cells = await ApiService.getLiveStormCells();
      if (cells && cells.length > 0) {
        setStormData({ storm_cells: cells, hazard_summary: {}, data_mode: 'live' });
        setSelectedCell(cells[0]);
        setDispatchedAlert(createDispatchedAlert(cells[0]));
        setBackendLive(true);
      } else {
        // Backend unavailable or returned empty — use rich fallback storm cells
        setStormData({ storm_cells: FALLBACK_STORM_CELLS, hazard_summary: {}, data_mode: 'historical_fallback' });
        setSelectedCell(FALLBACK_STORM_CELLS[0]);
        setDispatchedAlert(createDispatchedAlert(FALLBACK_STORM_CELLS[0]));
        setBackendLive(false);
      }
    };
    loadLiveData();
    // Poll every 60s for fresh predictions
    const interval = setInterval(loadLiveData, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setShowMissionBriefing((prev) => !prev);
      }
    };
    const handleCustomOpen = () => {
      setShowMissionBriefing(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-mission-briefing', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-mission-briefing', handleCustomOpen);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-[#f7f8f8] font-sans selection:bg-[#5e6ad2]/30 selection:text-white flex flex-col">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 h-14 bg-[#0a0d14]/95 backdrop-blur-md border-b border-[#1e2533] px-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#131b28] border border-sky-500/30 flex items-center justify-center">
            <Radar className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight text-white font-mono">VAJRA</h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                FUSI0NX
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#8a8f98] uppercase tracking-wider">
              MoES / NCMRWF • 0–6h Severe Convection (PS-26084)
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex p-0.5 bg-[#101522] border border-[#212b3e] rounded-lg">
             <button 
                onClick={() => setViewMode('hazard')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1.5 active:scale-[0.98] ${
                  viewMode === 'hazard' 
                    ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                <Radar className="w-3.5 h-3.5 text-sky-400" />
                <span>Hazard GIS</span>
             </button>
             <button 
                onClick={() => setViewMode('tactical')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-[0.98] ${
                  viewMode === 'tactical' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                Dashboard
             </button>
             <button 
                onClick={() => setViewMode('convectnow')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1.5 active:scale-[0.98] ${
                  viewMode === 'convectnow' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
                title="ConvectNow National 0–6h Operations Console (Sohra/Cherrapunji Escarpment)"
             >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>NE India Nowcast</span>
             </button>
             <button 
                onClick={() => setViewMode('hyperlocal')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-[0.98] ${
                  viewMode === 'hyperlocal' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                3x3 Airfield Twin
             </button>
             <button 
                onClick={() => setViewMode('inference')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1.5 active:scale-[0.98] ${
                  viewMode === 'inference' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                <Cpu className="w-3.5 h-3.5" />
                <span>AI Pipeline</span>
             </button>
             <button 
                onClick={() => setViewMode('replay')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-[0.98] ${
                  viewMode === 'replay' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                Case Replay
             </button>
             <button 
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-[0.98] ${
                  viewMode === 'grid' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                Grid XAI
             </button>
             <button 
                onClick={() => setViewMode('microburst')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-[0.98] ${
                  viewMode === 'microburst' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                3x3km Microburst
             </button>
             <button 
                onClick={() => setViewMode('public')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1.5 active:scale-[0.98] ${
                  viewMode === 'public' ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600 font-semibold' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
             >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>GIS Warning</span>
             </button>
          </div>
          
          <button 
            onClick={() => setShowMissionBriefing(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-mono text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            title="Operational Mission Briefing (M)"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Mission Briefing [M]</span>
          </button>

          <span className={`flex items-center space-x-2 px-2.5 py-1 rounded-md border text-xs font-mono ${
            backendLive === true
              ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
              : backendLive === false
              ? 'bg-amber-900/20 border-amber-500/30 text-amber-300'
              : 'bg-[#101522] border-[#212b3e] text-slate-300'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              backendLive === true ? 'bg-emerald-400' : backendLive === false ? 'bg-amber-400' : 'bg-slate-500'
            }`}></span>
            <span>{backendLive === true ? 'AI Live' : backendLive === false ? 'Fallback Mode' : 'Connecting…'}</span>
          </span>
        </div>
      </header>

      {/* Persistent 3x3 Domain & AWS Ground Truth Status Ribbon (Only shown outside Hazard & Tactical & ConvectNow views) */}
      {viewMode !== 'hazard' && viewMode !== 'tactical' && viewMode !== 'convectnow' && (
        <div className="bg-[#0b101b] border-b border-[#1f293d] px-6 py-2 flex flex-wrap items-center justify-between text-xs font-mono text-[#94a3b8]">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-sky-400 font-bold">
            <Grid className="w-3.5 h-3.5" />
            <span>3x3 TACTICAL AOI: 20.0°N–20.6°N, 85.5°E–86.1°E</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center space-x-1.5 text-amber-400">
            <Radio className="w-3.5 h-3.5" />
            <span>9 SURFACE AWS IN-SITU NETWORK REPORTING</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>VEBS RUNWAY 01 LLWS MONITORED</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1 sm:mt-0">
          <span>MAX CORE: <strong className="text-amber-400">68.2 dBZ</strong></span>
          <span>•</span>
          <span>Z-R: <strong className="text-sky-300">174.5 mm/h</strong></span>
          <span>•</span>
          <span className="text-rose-400 font-bold">LLWS: ΔV 48 m/s (93 kt)</span>
        </div>
      </div>
      )}

      {viewMode === 'hazard' && (
        <main className="w-full flex-1 overflow-hidden">
          <HazardDashboard />
        </main>
      )}

      {viewMode === 'tactical' && (
        <main className="w-full flex-1 overflow-hidden relative">
          <TacticalOperationsDashboard
            stormCells={stormData?.storm_cells ?? FALLBACK_STORM_CELLS}
            onTriggerCitizenWarning={(alert) => {
              setDispatchedAlert(alert);
              setViewMode('public');
            }}
          />
        </main>
      )}

      {viewMode === 'convectnow' && (
        <main className="w-full flex-1 overflow-hidden relative">
          <ConvectNowDashboard />
        </main>
      )}

      {viewMode === 'hyperlocal' && (
        <main className="max-w-[1400px] w-full mx-auto p-6 pb-24 flex-1">
           <HyperlocalTwinMap />
        </main>
      )}

      {viewMode === 'inference' && (
        <main className="max-w-[1520px] w-full mx-auto px-6 py-4 pb-24 flex-1">
           <InferencePipelineView />
        </main>
      )}

      {viewMode === 'replay' && (
        <main className="max-w-[1400px] w-full mx-auto p-6 pb-24 flex-1">
           <HistoricalReplayView />
        </main>
      )}

      {viewMode === 'grid' && (
        <main className="max-w-[1400px] w-full mx-auto p-6 pb-24 flex-1">
           <ExplainableGridTracker />
        </main>
      )}

      {viewMode === 'microburst' && (
        <main className="max-w-[1400px] w-full mx-auto p-6 pb-24 flex-1">
           <MicroburstSimulationView />
        </main>
      )}

      {viewMode === 'public' && (
        <main className="w-full flex-1">
          <CitizenWarningInterface
            alert={dispatchedAlert}
            onBackToAdmin={() => setViewMode('tactical')}
            onSimulateDispatch={() => {}}
            availableCells={[]}
          />
        </main>
      )}

      {/* Global Mission Briefing Modal (Accessible from any view via [M] or header button) */}
      <MissionBriefingModal
        isOpen={showMissionBriefing}
        onClose={() => setShowMissionBriefing(false)}
        initialPage={viewMode === 'public' ? 'hazard' : viewMode}
      />
    </div>
  );
}
