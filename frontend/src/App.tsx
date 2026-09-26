import { Circle } from "react-leaflet";
import React, { useState, useEffect } from 'react';
import { 
  Radar, CloudLightning, MapPin, Activity, Info, ExternalLink, Cpu, ShieldCheck
} from 'lucide-react';
import { ETACountdown } from './components/ETACountdown';
import { CitizenWarningInterface } from './components/CitizenWarningInterface';
import { InferencePipelineView } from './components/InferencePipelineView';
import { HyperlocalTwinMap } from './components/HyperlocalTwinMap';
import { HistoricalReplayView } from './components/HistoricalReplayView';
import { ExplainableGridTracker } from './components/ExplainableGridTracker';
import { MicroburstSimulationView } from './components/MicroburstSimulationView';
import { TacticalAirportMapEngine } from './components/TacticalAirportMapEngine';
import { 
  DispatchedAlert, 
  createDispatchedAlert, 
  FALLBACK_STORM_CELLS 
} from './types/dispatch';

export default function App() {
  const [stormData, setStormData] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [dispatchedAlert, setDispatchedAlert] = useState<DispatchedAlert | null>(null);
  const [viewMode, setViewMode] = useState<'tactical' | 'inference' | 'public' | 'hyperlocal' | 'replay' | 'grid' | 'microburst'>('microburst');

  useEffect(() => {
    setStormData({
      storm_cells: FALLBACK_STORM_CELLS,
      hazard_summary: {}
    });
    setSelectedCell(FALLBACK_STORM_CELLS[0]);
    setDispatchedAlert(createDispatchedAlert(FALLBACK_STORM_CELLS[0]));
  }, []);

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] font-sans selection:bg-[#5e6ad2]/30 selection:text-white">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 h-[72px] bg-[rgba(8,9,10,0.72)] backdrop-blur-[12px] border-b border-[#23252a] px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 rounded-md bg-[#1a1b1d] border border-[#34343a] flex items-center justify-center">
            <Radar className="w-4 h-4 text-[#d0d6e0]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-[#f7f8f8]">VAJRA</h1>
            <p className="text-[12px] font-mono text-[#8a8f98] uppercase tracking-wider">Fusi0nX • PS-26084</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          
          <div className="flex p-1 bg-[#141516] border border-[#23252a] rounded-full">
             <button 
                onClick={() => setViewMode('tactical')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${viewMode === 'tactical' ? 'bg-[#23252a] text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'}`}
             >
                Dashboard
             </button>
             <button 
                onClick={() => setViewMode('hyperlocal')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${viewMode === 'hyperlocal' ? 'bg-[#23252a] text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'}`}
             >
                Live Map
             </button>
             <button 
                onClick={() => setViewMode('inference')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors flex items-center space-x-1.5 ${viewMode === 'inference' ? 'bg-[#23252a] text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'}`}
             >
                <Cpu className="w-3.5 h-3.5" />
                <span>AI Pipeline</span>
             </button>
             <button 
                onClick={() => setViewMode('replay')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${viewMode === 'replay' ? 'bg-[#23252a] text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'}`}
             >
                Replay
             </button>
             <button 
                onClick={() => setViewMode('grid')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${viewMode === 'grid' ? 'bg-[#23252a] text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'}`}
             >
                Grid XAI
             </button>
             <button 
                onClick={() => setViewMode('microburst')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${viewMode === 'microburst' ? 'bg-[#23252a] text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'}`}
             >
                3x3km Microburst
             </button>
             <button 
                onClick={() => setViewMode('public')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors flex items-center space-x-1.5 ${viewMode === 'public' ? 'bg-[#23252a] text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'}`}
             >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>GIS Warning</span>
             </button>
          </div>
          
          <span className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#141516] border border-[#23252a] ml-2">
            <span className="w-2 h-2 rounded-full bg-[#4cb782]"></span>
            <span className="text-[12px] font-medium text-[#d0d6e0]">Live Tracking</span>
          </span>
        </div>
      </header>

      {viewMode === 'tactical' && (
        <main className="max-w-[1280px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
          
          {/* Main Workspace */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header Section & Metrics */}
            <div className="mb-6">
              <h2 className="text-[22px] font-medium text-[#f7f8f8] mb-1 tracking-tight">Convective Cell Digital Twins</h2>
              <p className="text-[14px] text-[#8a8f98] mb-6">DETECT → TRACK → PREDICT → WARN. 0–6h dual-horizon nowcasting telemetry.</p>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#8a8f98] uppercase">Active Threat Cells</div>
                  <div className="text-[28px] font-bold text-[#f7f8f8] mt-2">5</div>
                </div>
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#8a8f98] uppercase">Max System dBZ</div>
                  <div className="text-[28px] font-bold text-[#eb5757] mt-2">68.2 <span className="text-[14px] text-[#8a8f98] font-normal">dBZ</span></div>
                </div>
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#8a8f98] uppercase">Cloudburst Alerts</div>
                  <div className="text-[28px] font-bold text-[#f7f8f8] mt-2">1 <span className="text-[12px] ml-2 px-2 py-0.5 bg-[#eb5757]/20 text-[#eb5757] rounded border border-[#eb5757]/30 uppercase">Extreme</span></div>
                </div>
                <div className="bg-[#141516] border border-[#38a8ff]/30 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#38a8ff] uppercase">Aviation Status (CCU)</div>
                  <div className="text-[24px] font-black text-[#eb5757] mt-2 tracking-tight">GROUNDED</div>
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
                      <th className="px-4 py-3">Growth</th>
                      <th className="px-4 py-3">Movement</th>
                      <th className="px-4 py-3">Target ETA</th>
                      <th className="px-4 py-3">Status</th>
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
                          <td className="px-4 py-4 text-[#d0d6e0]">{cell.peak_dbz.toFixed(1)} dBZ</td>
                          <td className="px-4 py-4 text-[#d0d6e0]">{cell.hazards?.rain_rate_mmh?.toFixed(0) || 0} mm/h</td>
                          <td className="px-4 py-4 text-[#d0d6e0]">{cell.velocity_kmh.toFixed(0)} km/h</td>
                          <td className="px-4 py-4 font-mono text-[#d0d6e0]">{cell.eta_minutes ?? '--'}m</td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center space-x-1.5">
                              <Activity className="w-3.5 h-3.5 text-[#8a8f98]" />
                              <span className="text-[13px] text-[#8a8f98]">{cell.evolution?.state || 'TRACKING'}</span>
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
                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl overflow-hidden relative h-[220px]">
                  <div className="absolute top-3 left-3 z-[400] flex items-center space-x-2 bg-[rgba(8,9,10,0.85)] px-2.5 py-1.5 rounded-lg border border-[#34343a] backdrop-blur-md">
                    <MapPin className="w-3.5 h-3.5 text-[#38a8ff]" />
                    <span className="text-[11px] font-bold text-[#f7f8f8] uppercase tracking-wider">Live Tactical View • CCU</span>
                  </div>
                  <TacticalAirportMapEngine 
                    key={selectedCell.cell_id} 
                    center={[selectedCell.centroid_lat || selectedCell.location_lat || 22.6540, selectedCell.centroid_lon || selectedCell.location_lon || 88.4460]} 
                    zoom={16} 
                    scrollWheelZoom={false} 
                    dragging={false}
                    zoomControl={false}
                    showProviderToggle={true}
                    providerTogglePosition="top-right"
                  >
                    <Circle 
                      center={[selectedCell.centroid_lat || selectedCell.location_lat || 22.6540, selectedCell.centroid_lon || selectedCell.location_lon || 88.4460]} 
                      radius={450} 
                      pathOptions={{ color: '#eb5757', fillColor: '#eb5757', fillOpacity: 0.45, weight: 2, dashArray: '4' }}
                    />
                  </TacticalAirportMapEngine>
                </div>

                <div className="bg-[#0f1011] border border-[#23252a] rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-5">
                    <Info className="w-4 h-4 text-[#8a8f98]" />
                    <h3 className="text-[15px] font-medium text-[#f7f8f8]">Evolution & Prediction</h3>
                  </div>
                  <div className="text-[14px] text-[#d0d6e0] leading-relaxed space-y-3">
                    <p><span className="text-[#f7f8f8] font-medium">Trajectory:</span> {selectedCell.evolution?.trend_summary || 'Cell is maintaining structural intensity.'}</p>
                    <p><span className="text-[#f7f8f8] font-medium">Feature Fusion:</span> {selectedCell.hazards?.explainability?.radar_core_driver || 'Radar core intensity dominates severity classification.'}</p>
                  </div>
                </div>
              </div>
            )}
            
          </div>

          {/* Right Sidebar (ETA) */}
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
                <h3 className="text-[13px] font-bold text-[#f7f8f8] uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-4 h-4 text-[#4cb782] mr-2" /> NDMA Dispatch Log
                </h3>
                <span className="text-[10px] text-[#8a8f98] font-mono">LIVE SYNC</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex space-x-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#eb5757] mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="text-[12px] font-medium text-[#f7f8f8]">CAP Alert Dispatched: CELL-805</div>
                    <div className="text-[11px] text-[#8a8f98] mt-0.5">EMERGENCY: Microburst over CCU Airport. Aviation grounded. Sent to AAI, SDMA.</div>
                    <div className="text-[10px] font-mono text-[#4cb782] mt-1">1 Min Ago • SUCCESS</div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f2c94c] mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="text-[12px] font-medium text-[#f7f8f8]">CAP Alert Dispatched: CELL-909</div>
                    <div className="text-[11px] text-[#8a8f98] mt-0.5">WARNING: Severe thunderstorms approaching Howrah. Sent to Municipal Corp.</div>
                    <div className="text-[10px] font-mono text-[#4cb782] mt-1">12 Mins Ago • SUCCESS</div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#38a8ff] mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="text-[12px] font-medium text-[#f7f8f8]">Daily Flash Flood Advisory</div>
                    <div className="text-[11px] text-[#8a8f98] mt-0.5">Automated morning brief generated and transmitted.</div>
                    <div className="text-[10px] font-mono text-[#4cb782] mt-1">4 Hours Ago • SUCCESS</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware Status */}
            <div className="bg-[#0f1011] border border-[#23252a] rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[#23252a] bg-[#141516]">
                <h3 className="text-[13px] font-bold text-[#f7f8f8] uppercase tracking-wider flex items-center">
                  <Activity className="w-4 h-4 text-[#38a8ff] mr-2" /> Data Fusion Status
                </h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#d0d6e0]">IMD DWR Kolkata (Radar)</span>
                  <span className="text-[11px] font-mono text-[#4cb782] px-2 py-0.5 bg-[#4cb782]/10 rounded border border-[#4cb782]/20">ONLINE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#d0d6e0]">MOSDAC INSAT-3DR (Sat)</span>
                  <span className="text-[11px] font-mono text-[#4cb782] px-2 py-0.5 bg-[#4cb782]/10 rounded border border-[#4cb782]/20">ONLINE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#d0d6e0]">SEVIR GLM (Lightning)</span>
                  <span className="text-[11px] font-mono text-[#4cb782] px-2 py-0.5 bg-[#4cb782]/10 rounded border border-[#4cb782]/20">ONLINE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#d0d6e0]">HRRR / NWP Background</span>
                  <span className="text-[11px] font-mono text-[#4cb782] px-2 py-0.5 bg-[#4cb782]/10 rounded border border-[#4cb782]/20">SYNCED</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-[#23252a] mt-3">
                  <span className="text-[12px] text-[#8a8f98]">ConvectNet Latency</span>
                  <span className="text-[12px] font-mono text-[#f7f8f8]">42ms</span>
                </div>
              </div>
            </div>

          </div>
        </main>
      )}

      {viewMode === 'hyperlocal' && (
        <main className="max-w-[1400px] mx-auto p-6 pb-24">
           <HyperlocalTwinMap />
        </main>
      )}

      {viewMode === 'inference' && (
        <main className="max-w-[1024px] mx-auto p-6 pb-24">
           <InferencePipelineView />
        </main>
      )}

      {viewMode === 'replay' && (
        <main className="max-w-[1400px] mx-auto p-6 pb-24">
           <HistoricalReplayView />
        </main>
      )}

      {viewMode === 'grid' && (
        <main className="max-w-[1400px] mx-auto p-6 pb-24">
           <ExplainableGridTracker />
        </main>
      )}

      {viewMode === 'microburst' && (
        <main className="max-w-[1400px] mx-auto p-6 pb-24">
           <MicroburstSimulationView />
        </main>
      )}

      {viewMode === 'public' && (
        <CitizenWarningInterface
          alert={dispatchedAlert}
          onBackToAdmin={() => setViewMode('tactical')}
          onSimulateDispatch={() => {}}
          availableCells={[]}
        />
      )}
    </div>
  );
}
