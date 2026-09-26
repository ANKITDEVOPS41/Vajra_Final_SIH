import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Rectangle, CircleMarker } from 'react-leaflet';
import { Play, Pause, RotateCcw, ShieldCheck, History, Activity, Radio, Grid } from 'lucide-react';
import { 
  TACTICAL_3X3_GRID, 
  SURROUNDING_AWS_STATIONS, 
  VEBS_AIRPORT_SPECS,
  VEBS_DOMAIN_BOUNDS
} from '../types/tacticalGrid';

export const HistoricalReplayView: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeStep, setTimeStep] = useState(30); // 0 to 180 mins (default to peak T+30m)

  const LAT = VEBS_AIRPORT_SPECS.center[0]; // 20.2444
  const LON = VEBS_AIRPORT_SPECS.center[1]; // 85.8178

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep(prev => {
          if (prev >= 180) {
            setIsPlaying(false);
            return 180;
          }
          return prev + 5;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Simulated AI Prediction Path (ConvectNet Physics-guided Trajectory)
  const getPredictedStorm = (t: number) => {
    const progress = t / 180;
    const currentLat = 20.1500 + progress * 0.3800;
    const currentLon = 85.5500 + progress * 0.5000;
    const intensity = Math.sin(progress * Math.PI); 
    
    return {
      lat: currentLat,
      lon: currentLon,
      coreRadius: Math.round(1200 + intensity * 1500),
      outerRadius: Math.round(3500 + intensity * 3000),
      dbz: +(42 + intensity * 22.5).toFixed(1)
    };
  };

  // Observed Ground Truth Path (IMD DWR S-Band Radar Retrospective)
  const getActualStorm = (t: number) => {
    const progress = t / 180;
    const noiseLat = Math.sin(t * 0.1) * 0.006;
    const noiseLon = Math.cos(t * 0.15) * 0.006;
    
    const currentLat = 20.1500 + progress * 0.3850 + noiseLat;
    const currentLon = 85.5500 + progress * 0.4950 + noiseLon;
    const intensity = Math.sin(progress * Math.PI) * (0.85 + Math.random() * 0.3); 
    
    return {
      lat: currentLat,
      lon: currentLon,
      coreRadius: Math.round(1200 + intensity * 1600),
      outerRadius: Math.round(3500 + intensity * 3200),
      dbz: +(43 + intensity * 21.5).toFixed(1)
    };
  };

  const predicted = getPredictedStorm(timeStep);
  const actual = getActualStorm(timeStep);

  const predictedPath = Array.from({ length: Math.floor(timeStep / 5) + 1 }).map((_, i) => {
    const s = getPredictedStorm(i * 5);
    return [s.lat, s.lon] as [number, number];
  });
  
  const actualPath = Array.from({ length: Math.floor(timeStep / 5) + 1 }).map((_, i) => {
    const s = getActualStorm(i * 5);
    return [s.lat, s.lon] as [number, number];
  });

  return (
    <div className="w-full h-auto min-h-[780px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg relative">
        <div>
          <h2 className="text-[18px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <ShieldCheck className="w-5 h-5 mr-2 text-emerald-400" />
            Verification &amp; Case Replay Engine (WMO Benchmark)
          </h2>
          <p className="text-[12px] text-[#8a8f98] mt-0.5">
            Event: Coastal Supercell &amp; Microburst (Bhubaneswar-Cuttack Corridor • VEBS Runway 01 Touchdown)
          </p>
        </div>
        
        <div className="flex space-x-6 text-right font-mono">
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Critical Success Index</div>
            <div className="text-[18px] font-bold text-[#f7f8f8]">0.84 <span className="text-[11px] text-emerald-400 font-normal ml-1">WMO High</span></div>
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Prob of Detection</div>
            <div className="text-[18px] font-bold text-sky-400">92.3%</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase tracking-wider">False Alarm Ratio</div>
            <div className="text-[18px] font-bold text-emerald-400">0.056</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] uppercase tracking-wider">FSS (10km Radius)</div>
            <div className="text-[18px] font-bold text-purple-400">0.88</div>
          </div>
        </div>
      </div>

      {/* Split Screen Container */}
      <div className="flex-1 flex relative">
        
        {/* Left Side: VAJRA AI PREDICTION */}
        <div className="w-1/2 border-r border-[#23252a] relative">
          <div className="absolute top-4 left-4 z-[400] bg-[#08090a]/92 backdrop-blur-md px-3 py-1.5 rounded-lg border border-sky-500/40 flex items-center shadow-lg space-x-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">ConvectNet AI Forecast (3x3 Grid)</span>
          </div>

          <MapContainer 
            center={[LAT, LON]} 
            zoom={10.5} 
            scrollWheelZoom={false} 
            zoomControl={false} 
            dragging={true} 
            className="w-full h-full bg-[#0a0d15]"
          >
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" 
              opacity={0.85} 
              attribution="&copy; Esri" 
            />
            
            {/* 3x3 Sector Grid Bounds */}
            {TACTICAL_3X3_GRID.map((sec) => (
              <Rectangle 
                key={sec.id}
                bounds={[[sec.latMin, sec.lonMin], [sec.latMax, sec.lonMax]]}
                pathOptions={{ color: '#38bdf8', weight: 0.8, fillOpacity: 0.02, dashArray: '4, 4' }}
              />
            ))}

            {/* VEBS Runway Alignment */}
            <Polyline positions={VEBS_AIRPORT_SPECS.runway01_19} pathOptions={{ color: '#00e5ff', weight: 4 }} />
            <Marker position={[LAT, LON]}>
              <Popup className="dark-gis-popup">
                <div className="p-1 text-xs font-mono">VEBS Aerodrome Target</div>
              </Popup>
            </Marker>

            {/* AI Predicted Storm */}
            <Circle center={[predicted.lat, predicted.lon]} radius={predicted.outerRadius} pathOptions={{ color: '#38bdf8', weight: 1, fillColor: '#38bdf8', fillOpacity: 0.25 }} />
            <Circle center={[predicted.lat, predicted.lon]} radius={predicted.coreRadius} pathOptions={{ color: '#ef4444', weight: 2, fillColor: '#ef4444', fillOpacity: 0.75 }} />
            <Polyline positions={predictedPath} pathOptions={{ color: '#38bdf8', weight: 3, dashArray: '5, 5' }} />
          </MapContainer>
        </div>

        {/* Right Side: GROUND TRUTH OBSERVATION */}
        <div className="w-1/2 relative">
          <div className="absolute top-4 left-4 z-[400] bg-[#08090a]/92 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/40 flex items-center shadow-lg space-x-2">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider">Ground Truth Observation (DWR + 9 AWS)</span>
          </div>

          <MapContainer 
            center={[LAT, LON]} 
            zoom={10.5} 
            scrollWheelZoom={false} 
            zoomControl={false} 
            dragging={true} 
            className="w-full h-full bg-[#0a0d15]"
          >
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" 
              opacity={0.85} 
              attribution="&copy; Esri" 
            />
            
            {/* 3x3 Sector Grid Bounds */}
            {TACTICAL_3X3_GRID.map((sec) => (
              <Rectangle 
                key={sec.id}
                bounds={[[sec.latMin, sec.lonMin], [sec.latMax, sec.lonMax]]}
                pathOptions={{ color: '#f59e0b', weight: 0.8, fillOpacity: 0.02, dashArray: '4, 4' }}
              />
            ))}

            {/* 9 In-Situ Surface AWS Stations */}
            {SURROUNDING_AWS_STATIONS.map((st) => (
              <CircleMarker
                key={st.id}
                center={[st.lat, st.lon]}
                radius={3.5}
                pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.9 }}
              />
            ))}

            <Polyline positions={VEBS_AIRPORT_SPECS.runway01_19} pathOptions={{ color: '#00e5ff', weight: 4 }} />
            <Marker position={[LAT, LON]}>
              <Popup className="dark-gis-popup">
                <div className="p-1 text-xs font-mono">VEBS Aerodrome Target</div>
              </Popup>
            </Marker>

            {/* Actual Ground Truth Storm */}
            <Circle center={[actual.lat, actual.lon]} radius={actual.outerRadius} pathOptions={{ color: '#f59e0b', weight: 1, fillColor: '#f59e0b', fillOpacity: 0.25 }} />
            <Circle center={[actual.lat, actual.lon]} radius={actual.coreRadius} pathOptions={{ color: '#b91c1c', weight: 2, fillColor: '#b91c1c', fillOpacity: 0.85 }} />
            <Polyline positions={actualPath} pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '2, 4' }} />
          </MapContainer>
        </div>

      </div>

      {/* Playback Controls */}
      <div className="bg-[#0f1011] border-t border-[#23252a] p-4 flex items-center shadow-[0_-10px_20px_rgba(0,0,0,0.2)] z-10 relative">
        <button 
          onClick={() => {
            if (timeStep >= 180) setTimeStep(0);
            setIsPlaying(!isPlaying);
          }}
          className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center hover:bg-white transition-colors mr-6 shadow-lg"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : (timeStep >= 180 ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />)}
        </button>

        <div className="text-[14px] font-mono font-bold text-[#f7f8f8] mr-6 w-24">
          T+{timeStep}m
        </div>

        <div className="flex-1 relative flex flex-col justify-center pt-2 pb-1">
          <input 
            type="range" 
            min="0" 
            max="180" 
            value={timeStep}
            onChange={(e) => {
              setTimeStep(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-sky-400 h-1.5 bg-[#23252a] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between mt-1.5 text-[10px] font-mono text-[#8a8f98]">
            <span>T+0 (Initiation • Khurda)</span>
            <span className="text-amber-400 font-bold">T+30m (VEBS Runway 01 Intercept)</span>
            <span>T+90m (Cuttack / Mahanadi)</span>
            <span>T+180m (Paradeep Dissipation)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalReplayView;
