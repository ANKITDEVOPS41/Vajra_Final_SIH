import React, { useState, useEffect } from 'react';
import { Polygon, Polyline, Tooltip, Rectangle, CircleMarker, Popup } from 'react-leaflet';
import { CloudLightning, Wind, Droplets, AlertOctagon, Play, Pause, Activity, ShieldAlert, Crosshair, Radio, Info } from 'lucide-react';
import { 
  TacticalAirportMapEngine, 
  VEBS_AIRPORT_CENTER, 
  VEBS_DOMAIN_BOUNDS, 
  RUNWAY_01_19 
} from './TacticalAirportMapEngine';
import { 
  TACTICAL_3X3_GRID, 
  SURROUNDING_AWS_STATIONS, 
  VEBS_AIRPORT_SPECS 
} from '../types/tacticalGrid';
import { VisualIntelDecisionKey } from './VisualIntelDecisionKey';

// Biju Patnaik International Airport (VEBS) Runway 01/19 Coordinates
const LAT = VEBS_AIRPORT_CENTER[0]; // 20.2444
const LON = VEBS_AIRPORT_CENTER[1]; // 85.8178

export const MicroburstSimulationView: React.FC = () => {
  const [timeStep, setTimeStep] = useState(25); // 0 to 60 mins (default to peak impact)
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep(prev => (prev < 60 ? prev + 1 : 0));
      }, 180);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Simulate severe microburst moving from SW approach directly across VEBS Runway 01
  const getStormCore = (t: number) => {
    // Start South-West of Runway 01 approach (over Jatni/Khurda), move North-East across Runway 01 touchdown zone
    const startLat = 20.2180;
    const startLon = 85.7980;
    const endLat = 20.2680;
    const endLon = 85.8360;
    
    // Progress over 60 mins
    const progress = t / 60;
    const currentLat = startLat + progress * (endLat - startLat);
    const currentLon = startLon + progress * (endLon - startLon);
    
    // Intensity peaks at t=28 (directly over Runway 01 Threshold: 20.2338, 85.8150)
    const intensity = Math.max(0, 1 - Math.abs(t - 28) / 24);
    const isPeak = t >= 22 && t <= 34;
    
    return {
      lat: currentLat,
      lon: currentLon,
      coreRadius: Math.round(300 + intensity * 450), // 300m to 750m high-shear core
      outerRadius: Math.round(700 + intensity * 800), // 700m to 1500m divergent gust ring
      windGust: Math.round(48 + intensity * 51), // 48 to 99 km/h (54 kt)
      velocityShear: Math.round(18 + intensity * 30), // 18 to 48 m/s (LLWS threshold > 15 m/s)
      rainRate: Math.round(20 + intensity * 154), // 20 to 174 mm/h
      coreDbz: +(45 + intensity * 19.5).toFixed(1), // 45 to 64.5 dBZ
      coldPoolDelta: -(2.1 + intensity * 5.7).toFixed(1), // -2.1 to -7.8°C
      isPeak
    };
  };

  const storm = getStormCore(timeStep);

  return (
    <div className="w-full min-h-[860px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans shadow-2xl">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none"></div>
        <div>
          <h2 className="text-[18px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <CloudLightning className="w-5 h-5 mr-2 text-rose-500" />
            Hyper-Local 3x3km Microburst Simulation &amp; LLWS Intercept
          </h2>
          <p className="text-[12px] text-[#8a8f98] mt-0.5">
            Biju Patnaik International Airport (VEBS) • Runway 01/19 Low-Level Wind Shear (LLWS) Detection Model
          </p>
        </div>
        <div className="flex items-center space-x-3">
           <div className={`px-3 py-1 border rounded text-[11px] font-mono font-bold uppercase transition-colors flex items-center space-x-1.5 ${
             storm.isPeak 
               ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
               : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
           }`}>
             <AlertOctagon className="w-3.5 h-3.5" />
             <span>{storm.isPeak ? 'CRITICAL LLWS: RWY 01 GO-AROUND' : 'OUTFLOW FRONT MONITORING'}</span>
           </div>
        </div>
      </div>

      {/* Clear Purpose & Operational Intent Explainer Bar */}
      <div className="px-6 py-2.5 bg-[#0e131d] border-b border-[#1e2533] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2 text-slate-200">
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold text-[11px]">
            WHAT THIS VIEW REVEALS
          </span>
          <span className="text-slate-300">
            Real-time simulation of a severe convective downdraft impacting Runway 01 touchdown zone.
          </span>
        </div>
        <div className="flex items-center space-x-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-red-400 font-semibold">LLWS Shear &gt;15 m/s: Mandatory Go-Around</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-amber-300 font-semibold">Surface Gust &gt;50 kt: Airfield Closed</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6">
        
        {/* Left: The High-Res Map */}
        <div className="flex-1 border border-[#34343a] rounded-xl bg-[#141516] flex flex-col overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
           <div className="absolute top-4 left-4 z-[400] px-3.5 py-2.5 bg-[#08090a]/92 border border-[#34343a] rounded-lg shadow-lg backdrop-blur-md">
               <div className="text-[12px] font-bold text-[#f7f8f8] uppercase tracking-wider mb-1 flex items-center">
                   <Activity className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                   T+{timeStep} Minutes Interpolation
               </div>
               <div className="text-[11px] font-mono text-[#8a8f98]">
                   VEBS Runway 01 Touchdown Intercept Window
               </div>
           </div>
           
           <TacticalAirportMapEngine 
              center={[LAT, LON]} 
              zoom={14} 
              minZoom={12} 
              maxZoom={18}
              scrollWheelZoom={true} 
              className="w-full h-full bg-[#0a0d15]"
              showTacticalGrid={false}
              showAwsStations={true}
              showProviderToggle={true}
              providerTogglePosition="top-right"
           >
              {/* Aerodynamic Divergent Outflow Boundary (Expanding Cold Pool Front) */}
              {(() => {
                const rOutLat = storm.outerRadius / 111320;
                const rOutLon = storm.outerRadius / (111320 * Math.cos(storm.lat * (Math.PI / 180)));
                const outflowPoints: [number, number][] = [];
                for (let i = 0; i < 20; i++) {
                  const angle = (i / 20) * 2 * Math.PI;
                  const perturb = 1 + 0.16 * Math.sin(5 * angle) + 0.08 * Math.cos(3 * angle);
                  outflowPoints.push([
                    storm.lat + rOutLat * perturb * Math.sin(angle),
                    storm.lon + rOutLon * perturb * Math.cos(angle)
                  ]);
                }
                return (
                  <Polygon 
                    positions={outflowPoints} 
                    pathOptions={{ 
                      color: '#f59e0b', 
                      fillColor: '#f59e0b', 
                      fillOpacity: 0.18, 
                      weight: 1.5,
                      dashArray: '6, 6'
                    }} 
                  >
                    <Tooltip direction="top" className="bg-slate-900 text-amber-300 font-mono text-[10px]">
                      Outflow Boundary: Gust {storm.windGust} km/h (ΔT {storm.coldPoolDelta}°C)
                    </Tooltip>
                  </Polygon>
                );
              })()}

              {/* Severe Microburst Downdraft Shaft Footprint */}
              {(() => {
                const rCoreLat = storm.coreRadius / 111320;
                const rCoreLon = storm.coreRadius / (111320 * Math.cos(storm.lat * (Math.PI / 180)));
                const corePoints: [number, number][] = [];
                for (let i = 0; i < 16; i++) {
                  const angle = (i / 16) * 2 * Math.PI;
                  const perturb = 1 + 0.10 * Math.sin(3 * angle);
                  corePoints.push([
                    storm.lat + rCoreLat * perturb * Math.sin(angle),
                    storm.lon + rCoreLon * perturb * Math.cos(angle)
                  ]);
                }
                return (
                  <Polygon 
                    positions={corePoints} 
                    pathOptions={{ 
                      color: '#ef4444', 
                      fillColor: '#ef4444', 
                      fillOpacity: storm.isPeak ? 0.65 : 0.40, 
                      weight: 2 
                    }} 
                  >
                    <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-[11px] font-mono font-bold text-white drop-shadow">
                      {storm.coreDbz} dBZ
                    </Tooltip>
                  </Polygon>
                );
              })()}

              {/* Center Touchdown Point - Sleek Pulsing Target */}
              <CircleMarker 
                center={[storm.lat, storm.lon]}
                radius={5}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#ef4444',
                  fillOpacity: 1.0,
                  weight: 2
                }}
              >
                <Popup className="dark-gis-popup">
                  <div className="p-2 text-xs font-mono bg-slate-950 text-slate-100 rounded space-y-1">
                    <strong className="text-red-400">Microburst Downdraft Footprint</strong><br/>
                    <div>Reflectivity: <span className="font-bold text-amber-300">{storm.coreDbz} dBZ</span></div>
                    <div>Rain Rate: <span className="font-bold text-sky-300">{storm.rainRate} mm/h</span></div>
                    <div>Velocity Shear ΔV: <span className="font-bold text-rose-400">{storm.velocityShear} m/s</span></div>
                    <div>Peak Surface Gust: <span className="text-white font-bold">{storm.windGust} km/h</span></div>
                  </div>
                </Popup>
              </CircleMarker>
           </TacticalAirportMapEngine>

           {/* Timeline Controls */}
           <div className="absolute bottom-0 left-0 w-full p-4 bg-[#08090a]/92 backdrop-blur-md border-t border-[#34343a] z-[400]">
              <div className="flex items-center space-x-4">
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg"
                 >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    )}
                 </button>
                 <div className="flex-1 relative pt-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="60" 
                      value={timeStep}
                      onChange={(e) => setTimeStep(parseInt(e.target.value))}
                      className="w-full accent-red-500 h-1.5 bg-[#34343a] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-1 text-[10px] font-mono text-[#8a8f98]">
                       <span>T+0m (Approach)</span>
                       <span>T+15m</span>
                       <span className="text-rose-400 font-bold">T+28m (RWY 01 Impact)</span>
                       <span>T+45m</span>
                       <span>T+60m (Departure)</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Operational Telemetry & ATC Advisory */}
        <div className="w-80 flex flex-col gap-4">
           
           <div className="p-4 border border-[#23252a] bg-[#0f1011] rounded-xl space-y-3">
              <h3 className="text-[12px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center">
                 <Crosshair className="w-3.5 h-3.5 mr-1.5 text-sky-400" /> VEBS Airfield Telemetry
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                 <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400">VELOCITY SHEAR (ΔV)</span>
                    <div className="text-lg font-bold text-rose-400">{storm.velocityShear} m/s</div>
                    <div className="text-[9px] text-slate-400">ICAO Alert &gt;15 m/s</div>
                 </div>
                 <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400">PEAK OUTFLOW GUST</span>
                    <div className="text-lg font-bold text-amber-400">{storm.windGust} km/h</div>
                    <div className="text-[9px] text-slate-400">54 kt Squall</div>
                 </div>
                 <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400">Z-R RAIN RATE</span>
                    <div className="text-base font-bold text-sky-300">{storm.rainRate} mm/h</div>
                    <div className="text-[9px] text-slate-400">Cloudburst Level</div>
                 </div>
                 <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400">COLD POOL DROP</span>
                    <div className="text-base font-bold text-purple-400">{storm.coldPoolDelta}°C</div>
                    <div className="text-[9px] text-slate-400">Dense Outflow</div>
                 </div>
              </div>
           </div>

           {/* In-Situ AWS Ground Truth Matching */}
           <div className="p-4 border border-[#23252a] bg-[#0f1011] rounded-xl space-y-2.5 font-mono text-xs">
              <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                <span className="flex items-center"><Radio className="w-3.5 h-3.5 mr-1" /> AWS-VEBS Confirmation</span>
                <span className="text-[10px] text-slate-400">42971</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Surface Pressure:</span>
                  <span className="text-white font-bold">999.2 hPa (-4.8/3h)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aerodrome Wind:</span>
                  <span className="text-rose-400 font-bold">210° @ 28G54 kt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Air Temperature:</span>
                  <span className="text-amber-300 font-bold">22.8°C (Td 22.1°C)</span>
                </div>
              </div>
           </div>

           {/* Air Traffic Control Direct Order */}
           <div className="flex-1 p-4 border border-red-500/30 bg-red-950/20 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="text-[12px] font-bold text-red-400 uppercase tracking-wider mb-2 font-mono flex items-center">
                   <ShieldAlert className="w-4 h-4 mr-1.5" /> AAI / VEBS ATC Directive
                </h3>
                <div className="p-3 bg-slate-950/90 border border-red-500/40 rounded-lg text-xs space-y-1">
                   <div className="font-bold text-white uppercase text-[11px]">RUNWAY 01 LLWS EMERGENCY</div>
                   <div className="text-slate-300 text-[11px] leading-relaxed">
                     {storm.isPeak ? (
                       <span className="text-red-300 font-semibold">
                         Microburst touchdown in progress over Runway 01 threshold. Headwind loss exceeds 30 knots on final approach. 
                         All arriving aircraft ordered into holding pattern; Runway 01 departures suspended.
                       </span>
                     ) : (
                       <span>
                         Approaching convective cell. Wind shear sensor alert active. Standby for immediate Runway 01 closure upon core touchdown.
                       </span>
                     )}
                   </div>
                </div>
              </div>

              <div className="mt-3 text-[10px] font-mono text-slate-400 text-center">
                Automated NDMA CAP / AAI NOTAM broadcast ready
              </div>
           </div>

        </div>
      </div>

      {/* Visual Intel & Decision Key */}
      <VisualIntelDecisionKey page="microburst" />
    </div>
  );
};

export default MicroburstSimulationView;
