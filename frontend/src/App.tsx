import { Circle } from "react-leaflet";
import React, { useState, useEffect } from 'react';
import { 
  Radar, CloudLightning, MapPin, Activity, Info, ExternalLink, Cpu, ShieldCheck, Grid, Radio
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
import { 
  DispatchedAlert, 
  createDispatchedAlert, 
  FALLBACK_STORM_CELLS 
} from './types/dispatch';
import { TACTICAL_3X3_GRID, SURROUNDING_AWS_STATIONS } from './types/tacticalGrid';

export default function App() {
  const [stormData, setStormData] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [dispatchedAlert, setDispatchedAlert] = useState<DispatchedAlert | null>(null);
  const [viewMode, setViewMode] = useState<'hazard' | 'tactical' | 'inference' | 'public' | 'hyperlocal' | 'replay' | 'grid' | 'microburst'>('hazard');

  useEffect(() => {
    setStormData({
      storm_cells: FALLBACK_STORM_CELLS,
      hazard_summary: {}
    });
    setSelectedCell(FALLBACK_STORM_CELLS[0]);
    setDispatchedAlert(createDispatchedAlert(FALLBACK_STORM_CELLS[0]));
  }, []);

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] font-sans selection:bg-[#5e6ad2]/30 selection:text-white flex flex-col">
      
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
          
          <span className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#101522] border border-[#212b3e] text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Stream</span>
          </span>
        </div>
      </header>

      {/* Persistent 3x3 Domain & AWS Ground Truth Status Ribbon (Only shown outside Hazard view) */}
      {viewMode !== 'hazard' && (
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
        <main className="max-w-[1400px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
          
          {/* Main Workspace */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header Section & Metrics */}
            <div className="mb-6">
              <h2 className="text-[20px] font-bold text-[#f7f8f8] mb-1 tracking-tight">
                Convective Cell Digital Twins • 3x3 Corridor (Bhubaneswar-Cuttack-Puri)
              </h2>
              <p className="text-[13px] text-[#8a8f98] mb-6">
                DETECT → TRACK → PREDICT → WARN. 0–6h dual-horizon nowcasting telemetry over 9 tactical sectors.
              </p>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#8a8f98] uppercase">3x3 Active Sectors</div>
                  <div className="text-[26px] font-bold text-sky-400 mt-2 font-mono">9 / 9</div>
                </div>
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#8a8f98] uppercase">Max System dBZ</div>
                  <div className="text-[26px] font-bold text-amber-400 mt-2 font-mono">68.2 <span className="text-[13px] text-[#8a8f98] font-normal">dBZ</span></div>
                </div>
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#8a8f98] uppercase">Cloudburst Alerts</div>
                  <div className="text-[26px] font-bold text-[#eb5757] mt-2 font-mono">1 <span className="text-[11px] ml-1.5 px-2 py-0.5 bg-[#eb5757]/20 text-[#eb5757] rounded border border-[#eb5757]/30 uppercase">Extreme</span></div>
                </div>
                <div className="bg-[#141516] border border-red-500/40 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-red-400 uppercase">Aviation Status (VEBS)</div>
                  <div className="text-[22px] font-black text-rose-500 mt-2 tracking-tight">GROUNDED</div>
                </div>
              </div>
            </div>

            {/* Storm Telemetry Matrix */}
            <div className="bg-[#0f1011] border border-[#23252a] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141516] border-b border-[#23252a] text-[12px] font-medium text-[#8a8f98]">
                      <th className="px-4 py-3">Threat ID</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Max Z</th>
                      <th className="px-4 py-3">Rain Rate</th>
                      <th className="px-4 py-3">Movement</th>
                      <th className="px-4 py-3">Target ETA</th>
                      <th className="px-4 py-3">Sector</th>
                    </tr>
                  </thead>
                  <tbody className="text-[14px] font-medium">
                    {stormData?.storm_cells?.map((cell: any) => {
                      const isSelected = selectedCell?.cell_id === cell.cell_id;
                      const isExtreme = cell.hazards?.cloudburst_flag || cell.peak_dbz >= 64;
                      return (
                        <tr 
                          key={cell.cell_id}
                          onClick={() => {
                            setSelectedCell(cell);
                            setDispatchedAlert(createDispatchedAlert(cell));
                          }}
                          className={`cursor-pointer transition-colors border-b border-[#23252a] last:border-0 ${isSelected ? 'bg-[#141516]' : 'bg-[#0f1011] hover:bg-[#141516]'}`}
                        >
                          <td className="px-4 py-4 font-mono text-[#f7f8f8]">{cell.cell_id}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-medium ${isExtreme ? 'bg-[rgba(235,87,87,0.12)] text-[#eb5757]' : 'bg-[#1a1b1d] border border-[#34343a] text-[#d0d6e0]'}`}>
                              {isExtreme ? 'Extreme' : cell.severity}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-[#d0d6e0] font-mono">{cell.peak_dbz.toFixed(1)} dBZ</td>
                          <td className="px-4 py-4 text-[#d0d6e0] font-mono">{cell.hazards?.rain_rate_mmh?.toFixed(0) || 0} mm/h</td>
                          <td className="px-4 py-4 text-[#d0d6e0] font-mono">{cell.velocity_kmh.toFixed(0)} km/h</td>
                          <td className="px-4 py-4 font-mono text-[#d0d6e0]">{cell.eta_minutes ?? '--'}m</td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center space-x-1.5 font-mono text-xs text-sky-400">
                              <Activity className="w-3.5 h-3.5" />
                              <span>{cell.cell_id === 'CELL-805' ? 'SEC-C [R1_C1]' : cell.cell_id === 'CELL-912' ? 'SEC-N [R0_C1]' : 'SEC-S [R2_C1]'}</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expanded Analytics for Selected Cell */}
            {selectedCell && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tactical Mini-Map */}
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl overflow-hidden relative h-[240px]">
                  <div className="absolute top-3 left-3 z-[400] flex items-center space-x-2 bg-[rgba(8,9,10,0.85)] px-2.5 py-1.5 rounded-lg border border-[#34343a] backdrop-blur-md">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[11px] font-bold text-[#f7f8f8] uppercase tracking-wider font-mono">Live Tactical View • VEBS</span>
                  </div>
                  <TacticalAirportMapEngine 
                    key={selectedCell.cell_id} 
                    center={[selectedCell.centroid_lat || 20.2444, selectedCell.centroid_lon || 85.8178]} 
                    zoom={14} 
                    scrollWheelZoom={false} 
                    dragging={false}
                    zoomControl={false}
                    showTacticalGrid={true}
                    showAwsStations={true}
                    showProviderToggle={false}
                  >
                    <Circle 
                      center={[selectedCell.centroid_lat || 20.2444, selectedCell.centroid_lon || 85.8178]} 
                      radius={1200} 
                      pathOptions={{ color: '#eb5757', fillColor: '#eb5757', fillOpacity: 0.45, weight: 2, dashArray: '4' }}
                    />
                  </TacticalAirportMapEngine>
                </div>

                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-5 space-y-3">
                  <div className="flex items-center space-x-2 border-b border-[#23252a] pb-2">
                    <Info className="w-4 h-4 text-sky-400" />
                    <h3 className="text-[14px] font-bold text-[#f7f8f8]">ConvectNet Physical Attribution</h3>
                  </div>
                  <div className="text-[13px] text-[#d0d6e0] leading-relaxed space-y-2">
                    <p><span className="text-white font-medium">Trajectory:</span> {selectedCell.evolution?.trend_summary || 'Cell is maintaining severe convective intensity.'}</p>
                    <p><span className="text-white font-medium">Driver:</span> {selectedCell.hazards?.explainability?.radar_core_driver || 'Radar core intensity dominates severity classification.'}</p>
                    <p><span className="text-white font-medium">Liquid Water:</span> {selectedCell.hazards?.explainability?.vil_liquid_driver || 'Extreme VIL density detected aloft.'}</p>
                  </div>
                </div>
              </div>
            )}
            
          </div>

          {/* Right Sidebar (ETA & Dispatch) */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <ETACountdown
              stormCells={stormData?.storm_cells ?? FALLBACK_STORM_CELLS}
              onTriggerAlert={(cellId) => {
                const cells = stormData?.storm_cells ?? FALLBACK_STORM_CELLS;
                const matchingCell = cells.find((c: any) => c.cell_id === cellId) || cells[0];
                setSelectedCell(matchingCell);
                setDispatchedAlert(createDispatchedAlert(matchingCell));
              }}
            />

            {/* NDMA Dispatch Log */}
            <div className="bg-[#0f1011] border border-[#23252a] rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[#23252a] bg-[#141516] flex justify-between items-center">
                <h3 className="text-[13px] font-bold text-[#f7f8f8] uppercase tracking-wider flex items-center font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mr-2" /> NDMA / SDMA Dispatch Log
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">LIVE SYNC</span>
              </div>
              <div className="p-4 space-y-3 font-mono text-xs">
                <div className="flex space-x-3 bg-red-950/20 p-2.5 rounded-lg border border-red-500/30">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0 animate-pulse"></div>
                  <div>
                    <div className="font-bold text-white">CAP Alert Dispatched: CELL-805</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      EMERGENCY: Microburst over VEBS Runway 01. Aviation grounded. Sent to AAI ATC, Odisha SDMA.
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-1">2 Min Ago • TRANSMITTED</div>
                  </div>
                </div>
                <div className="flex space-x-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-bold text-white">CAP Alert Dispatched: CELL-912</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      WARNING: Severe convection approaching Cuttack Badambadi Bus Terminal.
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-1">12 Mins Ago • DELIVERED</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion & Hardware Status */}
            <div className="bg-[#0f1011] border border-[#23252a] rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[#23252a] bg-[#141516]">
                <h3 className="text-[12px] font-bold text-[#f7f8f8] uppercase tracking-wider flex items-center font-mono">
                  <Activity className="w-4 h-4 text-sky-400 mr-2" /> Multi-Source Fusion Status
                </h3>
              </div>
              <div className="p-4 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">IMD DWR Bhubaneswar (VEBS)</span>
                  <span className="text-[10px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 font-bold">ONLINE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">MOSDAC INSAT-3DR (Sat)</span>
                  <span className="text-[10px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 font-bold">ONLINE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">IITM Lightning Network</span>
                  <span className="text-[10px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 font-bold">REALTIME</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">9 In-Situ Surface AWS Network</span>
                  <span className="text-[10px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 font-bold">9/9 ONLINE</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-[#23252a] mt-2 text-[11px]">
                  <span className="text-slate-400">ConvectNet Inference SLA</span>
                  <span className="text-emerald-400 font-bold">42ms (&lt;50ms PASS)</span>
                </div>
              </div>
            </div>

          </div>
        </main>
      )}

      {viewMode === 'hyperlocal' && (
        <main className="max-w-[1400px] w-full mx-auto p-6 pb-24 flex-1">
           <HyperlocalTwinMap />
        </main>
      )}

      {viewMode === 'inference' && (
        <main className="max-w-[1280px] w-full mx-auto p-6 pb-24 flex-1">
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
    </div>
  );
}
