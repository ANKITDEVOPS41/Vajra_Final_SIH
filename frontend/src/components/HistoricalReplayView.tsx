import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import { Play, Pause, RotateCcw, ShieldCheck, History, Activity } from 'lucide-react';

export const HistoricalReplayView: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeStep, setTimeStep] = useState(0); // 0 to 180 mins

  const LAT = 22.6520;
  const LON = 88.4463; // CCU Airport

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep(prev => {
          if (prev >= 180) {
            setIsPlaying(false);
            return 180;
          }
          return prev + 5; // 5 min increments
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Simulated AI Prediction Path (Smooth curve)
  const getPredictedStorm = (t: number) => {
    const progress = t / 180;
    const currentLat = 22.5000 + progress * 0.2500;
    const currentLon = 88.3000 + progress * 0.3500;
    
    // Intensity peaks in the middle
    const intensity = Math.sin(progress * Math.PI); 
    
    return {
      lat: currentLat,
      lon: currentLon,
      coreRadius: 1000 + intensity * 800,
      outerRadius: 3000 + intensity * 2000
    };
  };

  // Simulated Ground Truth Path (Slightly erratic, true to life)
  const getActualStorm = (t: number) => {
    const progress = t / 180;
    // Add some noise to make it look like "ground truth" vs "smooth prediction"
    const noiseLat = Math.sin(t * 0.1) * 0.005;
    const noiseLon = Math.cos(t * 0.15) * 0.005;
    
    const currentLat = 22.5000 + progress * 0.2600 + noiseLat;
    const currentLon = 88.3000 + progress * 0.3400 + noiseLon;
    
    const intensity = Math.sin(progress * Math.PI) * (0.8 + Math.random() * 0.4); 
    
    return {
      lat: currentLat,
      lon: currentLon,
      coreRadius: 1000 + intensity * 900,
      outerRadius: 3000 + intensity * 2200
    };
  };

  const predicted = getPredictedStorm(timeStep);
  const actual = getActualStorm(timeStep);

  // Generate full path arrays for polylines
  const predictedPath = Array.from({length: Math.floor(timeStep/5) + 1}).map((_, i) => {
    const s = getPredictedStorm(i * 5);
    return [s.lat, s.lon];
  });
  
  const actualPath = Array.from({length: Math.floor(timeStep/5) + 1}).map((_, i) => {
    const s = getActualStorm(i * 5);
    return [s.lat, s.lon];
  });

  return (
    <div className="w-full h-auto min-h-[750px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg relative">
        <div>
          <h2 className="text-[20px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <ShieldCheck className="w-5 h-5 mr-2 text-[#4cb782]" />
            Verification & Replay Engine
          </h2>
          <p className="text-[13px] text-[#8a8f98] mt-1">Event: Kalbaisakhi Severe Downburst (Kolkata CCU) • Simulated High-Res Evaluation</p>
        </div>
        
        <div className="flex space-x-6 text-right">
          <div>
            <div className="text-[10px] text-[#8a8f98] font-mono uppercase tracking-wider">Critical Success Index</div>
            <div className="text-[18px] font-bold text-[#f7f8f8]">0.84 <span className="text-[12px] text-[#4cb782] font-normal ml-1">Excellent</span></div>
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] font-mono uppercase tracking-wider">Prob of Detection</div>
            <div className="text-[18px] font-bold text-[#f7f8f8]">92%</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8a8f98] font-mono uppercase tracking-wider">False Alarm Ratio</div>
            <div className="text-[18px] font-bold text-[#f7f8f8]">0.12</div>
          </div>
        </div>
      </div>

      {/* Split Screen Container */}
      <div className="flex-1 flex relative">
        
        {/* Left Side: VAJRA AI PREDICTION */}
        <div className="w-1/2 border-r border-[#23252a] relative">
          <div className="absolute top-4 left-4 z-[400] bg-[#08090a]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#38a8ff]/30 flex items-center shadow-lg">
            <Activity className="w-3.5 h-3.5 text-[#38a8ff] mr-2" />
            <span className="text-[12px] font-bold text-[#38a8ff] uppercase tracking-wider">VAJRA 0-6H Prediction</span>
          </div>

          <MapContainer center={[LAT, LON]} zoom={10} scrollWheelZoom={false} zoomControl={false} dragging={false} className="w-full h-full bg-[#0a0d15]">
            <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" opacity={0.6} />
            
            <Marker position={[LAT, LON]}>
              <Popup>CCU Airport Target</Popup>
            </Marker>

            {/* AI Predicted Storm */}
            <Circle center={[predicted.lat, predicted.lon]} radius={predicted.outerRadius} pathOptions={{ color: '#38a8ff', weight: 0, fillColor: '#38a8ff', fillOpacity: 0.2 }} />
            <Circle center={[predicted.lat, predicted.lon]} radius={predicted.coreRadius} pathOptions={{ color: '#eb5757', weight: 2, fillColor: '#eb5757', fillOpacity: 0.7 }} />
            <Polyline positions={predictedPath as any} pathOptions={{ color: '#38a8ff', weight: 3, dashArray: '5, 5' }} />
          </MapContainer>
        </div>

        {/* Right Side: GROUND TRUTH */}
        <div className="w-1/2 relative">
          <div className="absolute top-4 left-4 z-[400] bg-[#08090a]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#eb5757]/30 flex items-center shadow-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-[#eb5757] mr-2" />
            <span className="text-[12px] font-bold text-[#eb5757] uppercase tracking-wider">Ground Truth Observation</span>
          </div>

          <MapContainer center={[LAT, LON]} zoom={10} scrollWheelZoom={false} zoomControl={false} dragging={false} className="w-full h-full bg-[#0a0d15]">
            <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" opacity={0.6} />
            
            <Marker position={[LAT, LON]}>
              <Popup>CCU Airport Target</Popup>
            </Marker>

            {/* Actual Ground Truth Storm */}
            <Circle center={[actual.lat, actual.lon]} radius={actual.outerRadius} pathOptions={{ color: '#f2c94c', weight: 0, fillColor: '#f2c94c', fillOpacity: 0.2 }} />
            <Circle center={[actual.lat, actual.lon]} radius={actual.coreRadius} pathOptions={{ color: '#eb5757', weight: 2, fillColor: '#eb5757', fillOpacity: 0.8 }} />
            <Polyline positions={actualPath as any} pathOptions={{ color: '#f2c94c', weight: 3, dashArray: '2, 4' }} />
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
          className="w-12 h-12 rounded-full bg-[#f7f8f8] text-[#08090a] flex items-center justify-center hover:bg-white transition-colors mr-6 shadow-lg"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : (timeStep >= 180 ? <RotateCcw className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />)}
        </button>

        <div className="text-[15px] font-mono font-bold text-[#f7f8f8] mr-6 w-24">
          T+{timeStep}m
        </div>

        <div className="flex-1 relative flex flex-col justify-center pt-4 pb-2">
          <input 
            type="range" 
            min="0" 
            max="180" 
            value={timeStep}
            onChange={(e) => {
              setTimeStep(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-[#38a8ff] h-1.5 bg-[#23252a] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between mt-2 text-[11px] font-mono text-[#8a8f98]">
            <span>T+0 (Initiation)</span>
            <span>T+60m</span>
            <span>T+120m</span>
            <span>T+180m (Impact)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
