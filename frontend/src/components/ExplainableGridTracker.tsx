import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, CircleMarker, Polyline } from 'react-leaflet';
import { Brain, Wind, Thermometer, CloudLightning, Activity, AlertTriangle, ArrowRight, Crosshair, Radar } from 'lucide-react';

// Grid Configuration
const GRID_START_LAT = 22.45;
const GRID_START_LON = 88.20;
const GRID_STEP = 0.05; // approx 5km
const GRID_COLS = 8;
const GRID_ROWS = 6;

// Generate Grid Cells
const gridCells = [];
for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    const lat = GRID_START_LAT + (GRID_ROWS - r - 1) * GRID_STEP;
    const lon = GRID_START_LON + c * GRID_STEP;
    gridCells.push({
      id: `${String.fromCharCode(65 + r)}${c + 1}`, // A1, A2...
      bounds: [
        [lat, lon],
        [lat + GRID_STEP, lon + GRID_STEP]
      ],
      center: [lat + GRID_STEP/2, lon + GRID_STEP/2]
    });
  }
}

// Mock Storm Track (10-min intervals for 6 hours = 36 steps, but we'll simulate a few key ones)
const stormTrack = Array.from({length: 37}).map((_, i) => {
  // Storm moving North-East
  const progress = i / 36;
  const lat = 22.50 + progress * 0.25;
  const lon = 88.30 + progress * 0.35;
  
  // Evolving parameters
  const cape = 1500 + Math.sin(progress * Math.PI) * 1500;
  const vil = 10 + Math.sin(progress * Math.PI) * 45;
  const tempAnomaly = 2 + progress * 3;
  
  return {
    timeOffset: i * 10, // minutes
    lat, lon,
    cape: Math.round(cape),
    vil: Math.round(vil),
    tempAnomaly: tempAnomaly.toFixed(1),
    intensity: progress < 0.2 ? 'Initiation' : (progress < 0.7 ? 'Severe' : 'Dissipating'),
    probability: Math.min(99, Math.round(20 + progress * 150))
  };
});

export const ExplainableGridTracker: React.FC = () => {
  const [timeStep, setTimeStep] = useState(0); // 0 to 36 (0 to 360 mins)
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTrack = stormTrack[timeStep];
  
  // Find which grid cell the storm is currently in
  const activeCell = gridCells.find(cell => 
    currentTrack.lat >= cell.bounds[0][0] && currentTrack.lat <= cell.bounds[1][0] &&
    currentTrack.lon >= cell.bounds[0][1] && currentTrack.lon <= cell.bounds[1][1]
  );

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep(prev => (prev < 36 ? prev + 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="w-full min-h-[800px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-[20px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <Crosshair className="w-5 h-5 mr-2 text-[#eb5757]" />
            Grid-Based Cell Tracking & Explainable AI
          </h2>
          <p className="text-[13px] text-[#8a8f98] mt-1">10-minute interval predictive routing with live parameter evaluation</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="px-3 py-1 bg-[#eb5757]/10 border border-[#eb5757]/30 rounded text-[#eb5757] text-[11px] font-mono font-bold uppercase">
             Storm ID: CELL-909
           </div>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6">
        
        {/* Left: The Grid Map */}
        <div className="w-[60%] border border-[#34343a] rounded-xl bg-[#141516] flex flex-col overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
           <div className="absolute top-4 left-4 z-[400] px-3 py-2 bg-[#08090a]/90 border border-[#34343a] rounded-lg shadow-lg backdrop-blur-md">
               <div className="text-[12px] font-bold text-[#f7f8f8] uppercase tracking-wider mb-1 flex items-center">
                   <Radar className="w-3.5 h-3.5 mr-1.5 text-[#38a8ff]" />
                   Nowcast Window: T+{currentTrack.timeOffset} Mins
               </div>
               <div className="text-[11px] font-mono text-[#8a8f98]">
                   Lead Time: {Math.floor(currentTrack.timeOffset / 60)}h {currentTrack.timeOffset % 60}m
               </div>
           </div>
           
           <MapContainer center={[22.6, 88.35]} zoom={10.5} scrollWheelZoom={true} className="w-full h-full bg-[#0a0d15]">
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" opacity={0.6} attribution="&copy; Google" />
              
              {/* Draw Grid */}
              {gridCells.map((cell, idx) => (
                <Rectangle 
                  key={idx} 
                  bounds={cell.bounds as any} 
                  pathOptions={{
                    color: cell.id === activeCell?.id ? '#eb5757' : '#38a8ff',
                    weight: cell.id === activeCell?.id ? 2 : 1,
                    fillColor: cell.id === activeCell?.id ? '#eb5757' : 'transparent',
                    fillOpacity: cell.id === activeCell?.id ? 0.2 : 0,
                    dashArray: '3, 3'
                  }}
                >
                  <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-[10px] font-mono text-white/50 font-bold">
                    {cell.id}
                  </Tooltip>
                </Rectangle>
              ))}

              {/* Storm Track Polyline (Past) */}
              <Polyline 
                positions={stormTrack.slice(0, timeStep + 1).map(t => [t.lat, t.lon])} 
                pathOptions={{ color: '#eb5757', weight: 3 }} 
              />
              
              {/* Storm Track Polyline (Future) */}
              <Polyline 
                positions={stormTrack.slice(timeStep).map(t => [t.lat, t.lon])} 
                pathOptions={{ color: '#eb5757', weight: 2, dashArray: '5, 5', opacity: 0.5 }} 
              />

              {/* Current Storm Position */}
              <CircleMarker 
                center={[currentTrack.lat, currentTrack.lon]}
                radius={12}
                pathOptions={{ color: '#fff', weight: 2, fillColor: '#eb5757', fillOpacity: 0.8 }}
              />
           </MapContainer>

           {/* Timeline Scrubber */}
           <div className="absolute bottom-0 left-0 w-full p-4 bg-[#08090a]/90 backdrop-blur-md border-t border-[#34343a] z-[400]">
              <div className="flex items-center space-x-4">
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full bg-[#eb5757] flex items-center justify-center text-white hover:bg-[#ff6b6b] transition-colors"
                 >
                    {isPlaying ? (
                      <span className="block w-3 h-3 bg-white"></span>
                    ) : (
                      <span className="block w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></span>
                    )}
                 </button>
                 <div className="flex-1 relative pt-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="36" 
                      value={timeStep}
                      onChange={(e) => setTimeStep(parseInt(e.target.value))}
                      className="w-full accent-[#eb5757] h-1.5 bg-[#34343a] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-mono text-[#8a8f98]">
                       <span>T+0m</span>
                       <span>T+60m</span>
                       <span>T+120m</span>
                       <span>T+180m</span>
                       <span>T+240m</span>
                       <span>T+300m</span>
                       <span>T+360m</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Explainable AI Panel */}
        <div className="w-[40%] flex flex-col gap-4">
           
           <div className="p-5 border border-[#38a8ff]/30 bg-[#38a8ff]/5 rounded-xl">
              <h3 className="text-[14px] font-bold text-[#38a8ff] flex items-center mb-4 uppercase tracking-wider">
                 <Brain className="w-4 h-4 mr-2" /> ConvectNet AI Reasoning
              </h3>
              
              <div className="p-4 bg-[#0a0d15] border border-[#34343a] rounded-lg mb-4">
                 <div className="text-[11px] font-mono text-[#8a8f98] mb-1">Active Grid Sector</div>
                 <div className="text-[24px] font-bold text-[#f7f8f8] flex items-center">
                    {activeCell?.id || '--'}
                    <ArrowRight className="w-4 h-4 mx-3 text-[#34343a]" />
                    <span className="text-[14px] text-[#eb5757]">{currentTrack.intensity}</span>
                 </div>
              </div>

              <div className="text-[12px] text-[#d0d6e0] leading-relaxed mb-6">
                 <span className="font-bold text-white">AI Evaluation:</span> The model is assigning a <span className="text-[#eb5757] font-bold">{currentTrack.probability}% probability</span> of severe convective activity in sector {activeCell?.id}. 
                 This decision is driven by a rapid convergence of high atmospheric instability (CAPE) and intense thermal anomalies detected in the boundary layer.
              </div>

              <h4 className="text-[11px] font-bold text-[#8a8f98] uppercase tracking-wider mb-3 border-b border-[#34343a] pb-2">Evaluated Parameters</h4>
              
              <div className="space-y-4">
                 <div>
                    <div className="flex justify-between text-[12px] mb-1">
                       <span className="text-[#f7f8f8] flex items-center"><Thermometer className="w-3.5 h-3.5 mr-1.5 text-[#f2c94c]" /> CAPE (Instability)</span>
                       <span className="font-mono text-[#f2c94c]">{currentTrack.cape} J/kg</span>
                    </div>
                    <div className="w-full bg-[#141516] h-1.5 rounded-full overflow-hidden">
                       <div className="bg-[#f2c94c] h-full" style={{width: `${(currentTrack.cape / 3000) * 100}%`}}></div>
                    </div>
                 </div>
                 
                 <div>
                    <div className="flex justify-between text-[12px] mb-1">
                       <span className="text-[#f7f8f8] flex items-center"><Activity className="w-3.5 h-3.5 mr-1.5 text-[#38a8ff]" /> VIL (Water Content)</span>
                       <span className="font-mono text-[#38a8ff]">{currentTrack.vil} kg/m²</span>
                    </div>
                    <div className="w-full bg-[#141516] h-1.5 rounded-full overflow-hidden">
                       <div className="bg-[#38a8ff] h-full" style={{width: `${(currentTrack.vil / 60) * 100}%`}}></div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between text-[12px] mb-1">
                       <span className="text-[#f7f8f8] flex items-center"><Wind className="w-3.5 h-3.5 mr-1.5 text-[#eb5757]" /> Local Temp Anomaly</span>
                       <span className="font-mono text-[#eb5757]">+{currentTrack.tempAnomaly}°C</span>
                    </div>
                    <div className="w-full bg-[#141516] h-1.5 rounded-full overflow-hidden">
                       <div className="bg-[#eb5757] h-full" style={{width: `${(parseFloat(currentTrack.tempAnomaly) / 6) * 100}%`}}></div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex-1 p-5 border border-[#23252a] bg-[#0f1011] rounded-xl flex flex-col">
              <h3 className="text-[14px] font-bold text-[#f7f8f8] flex items-center mb-4 uppercase tracking-wider">
                 <AlertTriangle className="w-4 h-4 mr-2 text-[#f2c94c]" /> Actionable Intelligence
              </h3>
              
              <div className="flex-1 flex flex-col justify-center">
                 <div className="text-[12px] font-mono text-[#8a8f98] mb-2">TARGET AUTHORITIES: NDMA / SDMA</div>
                 <div className="p-3 bg-[#141516] border border-[#34343a] rounded-lg border-l-4 border-l-[#eb5757]">
                    <div className="text-[13px] font-bold text-white mb-1">CAP Alert Dispatch</div>
                    <div className="text-[11px] text-[#8a8f98]">
                       Storm CELL-909 will intersect Grid {activeCell?.id} at T+{currentTrack.timeOffset}m.
                       Predicted intensity warrants immediate Level-3 Flash Flood warning protocols.
                    </div>
                 </div>
                 
                 <button className="mt-4 w-full py-2.5 bg-[#f7f8f8] text-[#08090a] text-[12px] font-bold rounded-lg hover:bg-white transition-colors">
                    Transmit Warning to Authority Dashboard
                 </button>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};
