import React, { useState, useEffect } from 'react';
import { Circle, Polyline, Tooltip, Rectangle } from 'react-leaflet';
import { CloudLightning, Wind, Droplets, AlertOctagon, Play, Pause, Activity } from 'lucide-react';
import { TacticalAirportMapEngine, CCU_AIRPORT_CENTER, CCU_AIRPORT_BOUNDS } from './TacticalAirportMapEngine';

// CCU Airport Runways Center
const LAT = CCU_AIRPORT_CENTER[0];
const LON = CCU_AIRPORT_CENTER[1];

export const MicroburstSimulationView: React.FC = () => {
  const [timeStep, setTimeStep] = useState(0); // 0 to 60 mins
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep(prev => (prev < 60 ? prev + 1 : 0));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Simulate a microburst moving from SW to NE directly across the airport runways
  const getStormCore = (t: number) => {
    // Start SW within tactical domain, move NE across CCU runways
    const startLat = 22.6420;
    const startLon = 88.4340;
    const endLat = 22.6660;
    const endLon = 88.4580;
    
    // Total movement over 60 mins
    const progress = t / 60;
    const currentLat = startLat + progress * (endLat - startLat);
    const currentLon = startLon + progress * (endLon - startLon);
    
    // Intensity peaks at t=30 (directly over Runway 19L / Apron)
    const intensity = 1 - Math.abs(t - 30) / 30; // 0 to 1
    
    return {
      lat: currentLat,
      lon: currentLon,
      coreRadius: 250 + intensity * 250, // 250m to 500m tactical core
      outerRadius: 600 + intensity * 500, // 600m to 1100m outer shear band
      windGust: Math.round(45 + intensity * 65), // km/h
      rainRate: Math.round(25 + intensity * 95), // mm/hr
      isPeak: t >= 25 && t <= 35
    };
  };

  const storm = getStormCore(timeStep);

  return (
    <div className="w-full min-h-[800px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#eb5757]/10 to-transparent pointer-events-none"></div>
        <div>
          <h2 className="text-[20px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <CloudLightning className="w-5 h-5 mr-2 text-[#eb5757]" />
            Hyper-Local 3x3km Prediction
          </h2>
          <p className="text-[13px] text-[#8a8f98] mt-1">High-resolution microburst tracking over CCU Airport runways</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className={`px-3 py-1 border rounded text-[11px] font-mono font-bold uppercase transition-colors ${storm.isPeak ? 'bg-[#eb5757]/20 border-[#eb5757] text-[#eb5757] animate-pulse' : 'bg-[#f2c94c]/10 border-[#f2c94c]/30 text-[#f2c94c]'}`}>
             {storm.isPeak ? 'Microburst Impact' : 'Approaching Target'}
           </div>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6">
        
        {/* Left: The High-Res Map */}
        <div className="flex-1 border border-[#34343a] rounded-xl bg-[#141516] flex flex-col overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
           <div className="absolute top-4 left-4 z-[400] px-3 py-2 bg-[#08090a]/90 border border-[#34343a] rounded-lg shadow-lg backdrop-blur-md">
               <div className="text-[12px] font-bold text-[#f7f8f8] uppercase tracking-wider mb-1 flex items-center">
                   <Activity className="w-3.5 h-3.5 mr-1.5 text-[#38a8ff]" />
                   T+{timeStep} Minutes
               </div>
               <div className="text-[11px] font-mono text-[#8a8f98]">
                   1-Min Interval Interpolation
               </div>
           </div>
           
           <TacticalAirportMapEngine 
              center={[LAT, LON]} 
              zoom={16} 
              minZoom={15}
              maxZoom={18}
              scrollWheelZoom={true} 
              className="w-full h-full bg-[#0a0d15]"
              showProviderToggle={true}
              providerTogglePosition="top-right"
           >
              {/* 3x3 km bounding box reference */}
              <Rectangle bounds={CCU_AIRPORT_BOUNDS} pathOptions={{ color: '#00e5ff', weight: 1.5, dashArray: '8, 8', fill: false, opacity: 0.4 }} />

              {/* Storm Outer Band (Yellow/Orange) */}
              <Circle 
                center={[storm.lat, storm.lon]} 
                radius={storm.outerRadius} 
                pathOptions={{ color: '#f2c94c', weight: 0, fillColor: '#f2c94c', fillOpacity: 0.3 }}
              />
              
              {/* Storm Inner Core (Red/Magenta) */}
              <Circle 
                center={[storm.lat, storm.lon]} 
                radius={storm.coreRadius} 
                pathOptions={{ color: '#eb5757', weight: 2, fillColor: '#eb5757', fillOpacity: 0.65 }}
              >
                <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-[11px] font-mono text-white font-bold drop-shadow-md">
                  CORE
                </Tooltip>
              </Circle>

              {/* Trajectory Prediction Line across Runway 19L */}
              <Polyline 
                positions={[
                  [storm.lat, storm.lon],
                  [22.6660, 88.4580]
                ]} 
                pathOptions={{ color: '#f7f8f8', weight: 2.5, dashArray: '6, 6', opacity: 0.85 }} 
              />
           </TacticalAirportMapEngine>

           {/* Timeline Scrubber */}
           <div className="absolute bottom-0 left-0 w-full p-4 bg-[#08090a]/90 backdrop-blur-md border-t border-[#34343a] z-[400]">
              <div className="flex items-center space-x-4">
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full bg-[#38a8ff] flex items-center justify-center text-white hover:bg-[#5bb7ff] transition-colors"
                 >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
                 </button>
                 <div className="flex-1 relative pt-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="60" 
                      value={timeStep}
                      onChange={(e) => setTimeStep(parseInt(e.target.value))}
                      className="w-full accent-[#38a8ff] h-1.5 bg-[#34343a] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-mono text-[#8a8f98]">
                       <span>T+0m</span>
                       <span>T+15m</span>
                       <span>T+30m</span>
                       <span>T+45m</span>
                       <span>T+60m</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Telemetry Panel */}
        <div className="w-[35%] flex flex-col gap-4">
           
           <div className="p-5 border border-[#34343a] bg-[#141516] rounded-xl relative overflow-hidden">
              {storm.isPeak && <div className="absolute inset-0 bg-[#eb5757]/5 animate-pulse"></div>}
              
              <h3 className="text-[14px] font-bold text-[#f7f8f8] flex items-center mb-6 uppercase tracking-wider relative z-10">
                 <AlertOctagon className={`w-4 h-4 mr-2 ${storm.isPeak ? 'text-[#eb5757]' : 'text-[#8a8f98]'}`} /> 
                 Live Convective Telemetry
              </h3>
              
              <div className="space-y-6 relative z-10">
                 
                 <div>
                    <div className="flex justify-between text-[12px] mb-2">
                       <span className="text-[#8a8f98] flex items-center"><Wind className="w-4 h-4 mr-2 text-[#38a8ff]" /> Surface Wind Gust</span>
                       <span className="font-mono text-[16px] font-bold text-[#f7f8f8]">{storm.windGust} <span className="text-[12px] text-[#8a8f98]">km/h</span></span>
                    </div>
                    <div className="w-full bg-[#08090a] h-2 rounded-full overflow-hidden border border-[#23252a]">
                       <div className={`h-full transition-all duration-300 ${storm.windGust > 80 ? 'bg-[#eb5757]' : 'bg-[#38a8ff]'}`} style={{width: `${(storm.windGust / 120) * 100}%`}}></div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between text-[12px] mb-2">
                       <span className="text-[#8a8f98] flex items-center"><Droplets className="w-4 h-4 mr-2 text-[#4cb782]" /> Precipitation Rate</span>
                       <span className="font-mono text-[16px] font-bold text-[#f7f8f8]">{storm.rainRate} <span className="text-[12px] text-[#8a8f98]">mm/hr</span></span>
                    </div>
                    <div className="w-full bg-[#08090a] h-2 rounded-full overflow-hidden border border-[#23252a]">
                       <div className={`h-full transition-all duration-300 ${storm.rainRate > 80 ? 'bg-[#eb5757]' : 'bg-[#4cb782]'}`} style={{width: `${(storm.rainRate / 150) * 100}%`}}></div>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-[#23252a] grid grid-cols-2 gap-4">
                    <div>
                       <div className="text-[11px] font-mono text-[#8a8f98] uppercase">Core Diameter</div>
                       <div className="text-[18px] font-bold text-[#f7f8f8] mt-1">{(storm.coreRadius * 2 / 1000).toFixed(1)} km</div>
                    </div>
                    <div>
                       <div className="text-[11px] font-mono text-[#8a8f98] uppercase">Storm Heading</div>
                       <div className="text-[18px] font-bold text-[#f7f8f8] mt-1">NE (45°)</div>
                    </div>
                 </div>

              </div>
           </div>

           <div className={`flex-1 p-5 border rounded-xl flex flex-col justify-center transition-colors ${storm.isPeak ? 'border-[#eb5757] bg-[#eb5757]/10' : 'border-[#23252a] bg-[#0f1011]'}`}>
              <div className="text-center">
                 <div className={`text-[13px] font-bold uppercase tracking-wider mb-2 ${storm.isPeak ? 'text-[#eb5757]' : 'text-[#8a8f98]'}`}>
                    Aviation Status
                 </div>
                 <div className="text-[28px] font-black text-[#f7f8f8] tracking-tight">
                    {storm.isPeak ? 'GROUNDED' : 'MONITORING'}
                 </div>
                 <div className="text-[12px] text-[#8a8f98] mt-3">
                    {storm.isPeak 
                      ? 'Microburst impact detected on runway approach. All takeoffs and landings suspended.' 
                      : 'Storm cell approaching. Aviation operations proceeding under caution.'}
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};
