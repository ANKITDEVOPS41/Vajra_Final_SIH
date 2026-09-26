import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, CircleMarker, Polyline, Marker, Popup } from 'react-leaflet';
import { Brain, Wind, Thermometer, CloudLightning, Activity, AlertTriangle, ArrowRight, Crosshair, Radar, Radio } from 'lucide-react';
import L from 'leaflet';
import { 
  TACTICAL_3X3_GRID, 
  SURROUNDING_AWS_STATIONS, 
  TacticalSector, 
  SurfaceAwsStation,
  VEBS_AIRPORT_SPECS,
  VEBS_DOMAIN_BOUNDS
} from '../types/tacticalGrid';

// 10-min intervals for 6 hours = 37 steps tracking across the 3x3 domain
// Corridor: Khurda (SW/W) -> VEBS Aerodrome (Center) -> Cuttack/Mahanadi (N) -> Paradeep (NE)
const stormTrack = Array.from({ length: 37 }).map((_, i) => {
  const progress = i / 36;
  const timeOffset = i * 10; // minutes (0 to 360)
  
  // Trajectory: Start at Khurda [20.22, 85.60], pass VEBS Runway 01 [20.244, 85.818] at T+30m, exit towards Cuttack/Paradeep [20.52, 86.05]
  const lat = 20.20 + progress * 0.32;
  const lon = 85.58 + progress * 0.48;
  
  // Physics parameters along the trajectory
  // Peak convective severity occurs between T+20 and T+40 (directly over VEBS Aerodrome)
  const isPeak = progress >= 0.05 && progress <= 0.25;
  const peakFactor = Math.exp(-Math.pow((progress - 0.15) / 0.08, 2));
  
  const cape = Math.round(2200 + peakFactor * 1400); // 2200 to 3600 J/kg
  const vil = Math.round(18 + peakFactor * 48); // 18 to 66 kg/m2
  const dbz = +(42 + peakFactor * 24.5).toFixed(1); // 42 to 66.5 dBZ
  const rainRate = +(25 + peakFactor * 150).toFixed(1); // 25 to 175 mm/h
  const tempAnomaly = -(2.0 + peakFactor * 5.8).toFixed(1); // -2.0 to -7.8°C cold pool
  const windGust = Math.round(45 + peakFactor * 55); // 45 to 100 km/h
  
  return {
    timeOffset,
    lat,
    lon,
    cape,
    vil,
    dbz,
    rainRate,
    tempAnomaly,
    windGust,
    intensity: isPeak ? 'Severe Microburst / Cloudburst' : progress < 0.5 ? 'Intensifying Multicell' : 'Decaying Anvil Rain',
    probability: Math.min(99, Math.round(45 + peakFactor * 54)),
    shearVelocity: Math.round(20 + peakFactor * 28), // m/s
  };
});

export const ExplainableGridTracker: React.FC = () => {
  const [timeStep, setTimeStep] = useState(3); // Default at T+30m (over VEBS)
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTrack = stormTrack[timeStep];
  
  // Find which 3x3 grid sector the storm is currently inside
  const activeSector = TACTICAL_3X3_GRID.find(sec => 
    currentTrack.lat >= sec.latMin && currentTrack.lat <= sec.latMax &&
    currentTrack.lon >= sec.lonMin && currentTrack.lon <= sec.lonMax
  ) || TACTICAL_3X3_GRID[4]; // fallback to center SEC-C

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
    <div className="w-full min-h-[820px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-[18px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <Crosshair className="w-5 h-5 mr-2 text-rose-500" />
            3x3 Tactical Grid Tracking &amp; ConvectNet XAI Reasoning
          </h2>
          <p className="text-[12px] text-[#8a8f98] mt-0.5">
            Bhubaneswar-Cuttack-Puri Severe Convection Corridor (Lat 20.0°N–20.6°N, Lon 85.5°E–86.1°E) • 10-Min Step Predictive AI
          </p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[11px] font-mono font-bold uppercase flex items-center space-x-1.5">
             <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
             <span>CELL-VEBS-01 (SUPERCELL)</span>
           </div>
           <div className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 rounded text-sky-400 text-[11px] font-mono font-bold uppercase">
             9 AWS GROUND TRUTH SYNC
           </div>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6">
        
        {/* Left: The 3x3 Grid Map */}
        <div className="w-[60%] border border-[#34343a] rounded-xl bg-[#141516] flex flex-col overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
           <div className="absolute top-4 left-4 z-[400] px-3.5 py-2.5 bg-[#08090a]/92 border border-[#34343a] rounded-lg shadow-lg backdrop-blur-md">
               <div className="text-[12px] font-bold text-[#f7f8f8] uppercase tracking-wider mb-1 flex items-center">
                   <Radar className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                   Nowcast Horizon: T+{currentTrack.timeOffset} Mins
               </div>
               <div className="text-[11px] font-mono text-[#8a8f98]">
                   Lead Time: {Math.floor(currentTrack.timeOffset / 60)}h {currentTrack.timeOffset % 60}m • Target: VEBS Aerodrome
               </div>
           </div>
           
           <MapContainer 
             center={[20.30, 85.80]} 
             zoom={10.5} 
             scrollWheelZoom={true} 
             className="w-full h-full bg-[#0a0d15]"
           >
              <TileLayer 
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" 
                opacity={0.85} 
                attribution="&copy; Esri" 
              />
              
              {/* 3x3 Sector Grid Overlays */}
              {TACTICAL_3X3_GRID.map((sec) => {
                const isActive = sec.id === activeSector.id;
                const isExtreme = sec.cloudburstFlag || sec.radarDbz >= 60;
                const color = isExtreme ? '#ef4444' : isActive ? '#f59e0b' : '#38bdf8';

                return (
                  <Rectangle 
                    key={sec.id} 
                    bounds={[
                      [sec.latMin, sec.lonMin],
                      [sec.latMax, sec.lonMax]
                    ]} 
                    pathOptions={{
                      color: isActive ? '#ffffff' : color,
                      weight: isActive ? 2.5 : 1.0,
                      fillColor: color,
                      fillOpacity: isActive ? 0.25 : 0.06,
                      dashArray: isActive ? undefined : '4, 4'
                    }}
                  >
                    <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-[11px] font-mono font-bold text-white/80">
                      <div>{sec.id}</div>
                      <div className="text-[9px] text-slate-400 font-normal">{sec.code}</div>
                    </Tooltip>
                  </Rectangle>
                );
              })}

              {/* 9 Surrounding Surface AWS Stations */}
              {SURROUNDING_AWS_STATIONS.map((st) => (
                <CircleMarker
                  key={st.id}
                  center={[st.lat, st.lon]}
                  radius={4}
                  pathOptions={{
                    color: '#f59e0b',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.9,
                    weight: 1
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]} className="bg-slate-900 text-slate-200 text-[10px] font-mono border-slate-700">
                    {st.id} ({st.tempC}°C | {st.pressureHpa}hPa)
                  </Tooltip>
                </CircleMarker>
              ))}

              {/* VEBS Runway Alignment Reference */}
              <Polyline 
                positions={VEBS_AIRPORT_SPECS.runway01_19} 
                pathOptions={{ color: '#00e5ff', weight: 4, opacity: 0.9 }} 
              />

              {/* Storm Track Polyline (Past) */}
              <Polyline 
                positions={stormTrack.slice(0, timeStep + 1).map(t => [t.lat, t.lon])} 
                pathOptions={{ color: '#ef4444', weight: 3 }} 
              />
              
              {/* Storm Track Polyline (Future) */}
              <Polyline 
                positions={stormTrack.slice(timeStep).map(t => [t.lat, t.lon])} 
                pathOptions={{ color: '#ef4444', weight: 2, dashArray: '5, 5', opacity: 0.5 }} 
              />

              {/* Current Storm Footprint & Core */}
              <CircleMarker 
                center={[currentTrack.lat, currentTrack.lon]}
                radius={24}
                pathOptions={{ color: '#ff0055', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.25 }}
              />
              <CircleMarker 
                center={[currentTrack.lat, currentTrack.lon]}
                radius={12}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#b91c1c', fillOpacity: 0.85 }}
              />
           </MapContainer>

           {/* Timeline Scrubber */}
           <div className="absolute bottom-0 left-0 w-full p-4 bg-[#08090a]/92 backdrop-blur-md border-t border-[#34343a] z-[400]">
              <div className="flex items-center space-x-4">
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg"
                 >
                    {isPlaying ? (
                      <span className="block w-3 h-3 bg-white"></span>
                    ) : (
                      <span className="block w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white border-b-[5px] border-b-transparent ml-0.5"></span>
                    )}
                 </button>
                 <div className="flex-1 relative pt-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="36" 
                      value={timeStep}
                      onChange={(e) => setTimeStep(parseInt(e.target.value))}
                      className="w-full accent-red-500 h-1.5 bg-[#34343a] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-1 text-[10px] font-mono text-[#8a8f98]">
                       <span>T+0m (Initiation)</span>
                       <span>T+30m (VEBS Impact)</span>
                       <span>T+60m</span>
                       <span>T+120m</span>
                       <span>T+180m</span>
                       <span>T+240m</span>
                       <span>T+360m (Decay)</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Explainable AI Panel */}
        <div className="w-[40%] flex flex-col gap-4">
           
           <div className="p-5 border border-sky-500/30 bg-sky-950/10 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[13px] font-bold text-sky-400 flex items-center uppercase tracking-wider font-mono">
                   <Brain className="w-4 h-4 mr-2" /> ConvectNet Attention &amp; Attribution
                </h3>
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                   PROB: {currentTrack.probability}%
                </span>
              </div>
              
              <div className="p-3.5 bg-[#0a0d15] border border-[#34343a] rounded-lg">
                 <div className="text-[10px] font-mono text-[#8a8f98] mb-0.5">TARGET 3x3 SECTOR INTERSECT</div>
                 <div className="text-[18px] font-bold text-[#f7f8f8] flex items-center justify-between">
                    <div>
                      <span>{activeSector.id} [{activeSector.code}]</span>
                      <span className="text-xs text-slate-400 font-normal ml-2">{activeSector.name}</span>
                    </div>
                 </div>
                 <div className="mt-1 text-[11px] font-mono text-rose-400 font-semibold">
                    {currentTrack.intensity}
                 </div>
              </div>

              <div className="text-[12px] text-slate-300 leading-relaxed border-l-2 border-sky-500 pl-3">
                 <span className="font-bold text-white">Physical Causality Attribution:</span> ConvectNet identifies strong cross-attention between 
                 aloft S-Band radar core (<span className="text-amber-300 font-bold">{currentTrack.dbz} dBZ</span>), high liquid content (<span className="text-sky-300 font-bold">{currentTrack.vil} kg/m²</span>), and 
                 cold pool density current (<span className="text-rose-400 font-bold">{currentTrack.tempAnomaly}°C</span>). Surface squall gust of <span className="text-white font-bold">{currentTrack.windGust} km/h</span> is actively propagating along the Mahanadi–Khurda boundary.
              </div>

              <h4 className="text-[11px] font-bold text-[#8a8f98] uppercase tracking-wider border-b border-[#34343a] pb-1.5">
                Multi-Modal Physics Attribution (SHAP / Integrated Gradients)
              </h4>
              
              <div className="space-y-3 font-mono text-xs">
                 <div>
                    <div className="flex justify-between mb-1">
                       <span className="text-slate-300 flex items-center"><Activity className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Max Reflectivity Aloft</span>
                       <span className="text-amber-400 font-bold">{currentTrack.dbz} dBZ (42% wt)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                       <div className="bg-amber-400 h-full" style={{ width: `${(currentTrack.dbz / 70) * 100}%` }}></div>
                    </div>
                 </div>
                 
                 <div>
                    <div className="flex justify-between mb-1">
                       <span className="text-slate-300 flex items-center"><Thermometer className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> CAPE Instability</span>
                       <span className="text-purple-400 font-bold">{currentTrack.cape} J/kg (28% wt)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                       <div className="bg-purple-400 h-full" style={{ width: `${(currentTrack.cape / 3800) * 100}%` }}></div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between mb-1">
                       <span className="text-slate-300 flex items-center"><Wind className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> Outflow Gust &amp; Shear</span>
                       <span className="text-rose-400 font-bold">{currentTrack.windGust} km/h (ΔV {currentTrack.shearVelocity} m/s)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                       <div className="bg-rose-500 h-full" style={{ width: `${(currentTrack.windGust / 120) * 100}%` }}></div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Actionable Intelligence Card */}
           <div className="flex-1 p-5 border border-[#23252a] bg-[#0f1011] rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-[#f7f8f8] flex items-center uppercase tracking-wider mb-2 font-mono">
                   <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" /> Closed-Loop Aviation &amp; SDMA Action
                </h3>
                
                <div className="p-3 bg-[#141516] border border-[#34343a] rounded-lg border-l-4 border-l-red-500 text-xs">
                   <div className="font-bold text-white mb-0.5">VEBS RUNWAY 01 INTERCEPT ALERT</div>
                   <div className="text-slate-300 text-[11px] leading-relaxed">
                      Microburst shear corridor intersects VEBS Runway 01 glidepath at T+{currentTrack.timeOffset}m. 
                      AAI/ATC recommendation: <strong>ISSUE IMMEDIATE RUNWAY 01 GROUND STOP &amp; DIVERT INBOUND APPROACHES</strong>.
                   </div>
                </div>
              </div>
              
              <button 
                onClick={() => alert(`Transmitted NDMA CAP v1.2 Alert: Severe Microburst Warning for Sector ${activeSector.id} [${activeSector.code}] to VEBS Tower and Odisha SDMA.`)}
                className="mt-4 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-[12px] font-bold rounded-lg transition-colors font-mono uppercase tracking-wider shadow-lg"
              >
                 Transmit CAP Alert to VEBS ATC &amp; SDMA
              </button>
           </div>

        </div>
      </div>
    </div>
  );
};

export default ExplainableGridTracker;
