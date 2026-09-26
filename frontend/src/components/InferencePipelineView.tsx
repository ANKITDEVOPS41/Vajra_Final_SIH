import React, { useState, useEffect } from 'react';
import { 
  Radar as RadarIcon, 
  Satellite, 
  Wind, 
  CloudLightning,
  Activity,
  Layers,
  Box,
  Cpu,
  ArrowRight,
  ShieldAlert,
  BarChart2
} from 'lucide-react';
import { Marker, Popup, Circle } from 'react-leaflet';
import { TacticalAirportMapEngine, CCU_AIRPORT_CENTER } from './TacticalAirportMapEngine';

export const InferencePipelineView: React.FC = () => {
  const [timeStep, setTimeStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStep(prev => (prev + 1) % 6);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const LAT = CCU_AIRPORT_CENTER[0];
  const LON = CCU_AIRPORT_CENTER[1]; // CCU Airport

  return (
    <div className="w-full h-auto min-h-[750px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans">
      
      <div className="px-6 py-5 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#38a8ff]/10 to-transparent pointer-events-none"></div>
        <div>
          <h2 className="text-[20px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <Cpu className="w-5 h-5 mr-2 text-[#38a8ff]" />
            Live Inference & Data Fusion Pipeline
          </h2>
          <p className="text-[13px] text-[#8a8f98] mt-1">Real-time deep learning architecture targeting Netaji Subhas Chandra Bose Int'l Airport</p>
        </div>
        <div className="flex space-x-2">
           <div className="px-3 py-1 bg-[#4cb782]/10 border border-[#4cb782]/30 rounded text-[#4cb782] text-[11px] font-mono font-bold uppercase tracking-wider flex items-center">
             <div className="w-2 h-2 rounded-full bg-[#4cb782] mr-2 animate-pulse"></div> Live Pipeline Active
           </div>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6 relative">
        {/* Animated flow lines background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <path d="M 33% 50% L 50% 50%" stroke="#38a8ff" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_1s_linear_infinite]" />
                <path d="M 50% 50% L 66% 50%" stroke="#4cb782" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_1s_linear_infinite]" />
            </svg>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash {
                to { stroke-dashoffset: -10; }
            }
        `}} />

        {/* Column 1: Live Inputs (Maps) */}
        <div className="w-[30%] flex flex-col gap-4 z-10">
          <h3 className="text-[13px] font-bold text-[#f7f8f8] uppercase tracking-wider mb-2 flex items-center">
            <Layers className="w-4 h-4 mr-2 text-[#8a8f98]" /> 1. Real-Time Inputs
          </h3>
          
          {/* Input 1: Radar */}
          <div className="flex-1 border border-[#34343a] rounded-xl bg-[#141516] flex flex-col overflow-hidden relative group">
             <div className="absolute top-2 left-2 z-[400] px-2 py-1 bg-[#08090a]/80 border border-[#34343a] rounded text-[10px] font-bold text-[#f7f8f8] uppercase backdrop-blur-md">
                 IMD DWR Radar
             </div>
             <TacticalAirportMapEngine 
                center={[LAT, LON]} 
                zoom={15} 
                minZoom={15} 
                maxZoom={18} 
                scrollWheelZoom={false} 
                zoomControl={false} 
                dragging={false} 
                showProviderToggle={false}
                showInfrastructure={false}
                className="w-full h-full bg-[#0a0d15]"
             >
                {/* Tactical Airfield Reflectivity Plumes */}
                <Circle center={[LAT + 0.005, LON + 0.002]} radius={800} pathOptions={{ color: '#38a8ff', fillColor: '#38a8ff', fillOpacity: 0.3, weight: 1 }} />
                <Circle center={[LAT + 0.005, LON + 0.002]} radius={400} pathOptions={{ color: '#0055ff', fillColor: '#0055ff', fillOpacity: 0.5, weight: 1 }} />
             </TacticalAirportMapEngine>
          </div>
        </div>

        {/* Column 2: The Model */}
        <div className="w-[15%] flex flex-col justify-center items-center z-10">
           <div className="p-4 rounded-xl border border-[#38a8ff]/40 bg-[#38a8ff]/10 shadow-[0_0_30px_rgba(56,168,255,0.15)] flex flex-col items-center text-center relative w-full">
               <div className="absolute -inset-2 rounded-xl border border-[#38a8ff]/20 animate-pulse"></div>
               <Cpu className="w-12 h-12 text-[#38a8ff] mb-3" />
               <div className="text-[14px] font-bold text-[#f7f8f8]">ConvectNet</div>
               <div className="text-[10px] text-[#38a8ff] font-mono mt-1 uppercase">Spatiotemporal LSTM</div>
               <div className="mt-4 pt-4 border-t border-[#38a8ff]/20 w-full">
                  <div className="text-[10px] text-[#8a8f98] font-mono">Inference Time</div>
                  <div className="text-[14px] font-bold text-[#f7f8f8]">42 ms</div>
               </div>
           </div>
        </div>

        {/* Column 3: The Prediction (Large Map) */}
        <div className="w-[55%] flex flex-col z-10">
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-[13px] font-bold text-[#f7f8f8] uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-[#4cb782]" /> 2. Real-Time 0-6h Prediction
            </h3>
            <div className="text-[11px] font-mono text-[#4cb782] bg-[#4cb782]/10 px-2 py-0.5 rounded border border-[#4cb782]/20 shadow-[0_0_10px_rgba(76,183,130,0.2)]">
               T + {timeStep} Hour(s)
            </div>
          </div>
          
          <div className="flex-1 border border-[#4cb782]/40 rounded-xl bg-[#141516] flex flex-col overflow-hidden relative shadow-[0_0_20px_rgba(76,183,130,0.05)]">
             <div className="absolute top-4 left-4 z-[400] px-3 py-2 bg-[#08090a]/90 border border-[#4cb782]/50 rounded-lg shadow-lg backdrop-blur-md">
                 <div className="text-[14px] font-bold text-[#f7f8f8] mb-1">Target: CCU Airport</div>
                 <div className="text-[11px] font-mono text-[#8a8f98]">Forecast: {new Date(Date.now() + timeStep * 3600000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
             </div>
             
             <TacticalAirportMapEngine 
                center={[LAT, LON]} 
                zoom={16} 
                minZoom={15}
                maxZoom={18}
                scrollWheelZoom={true} 
                zoomControl={false} 
                dragging={true} 
                showProviderToggle={true}
                providerTogglePosition="top-right"
                className="w-full h-full bg-[#0a0d15]"
             >
                <Marker position={[LAT, LON]}>
                  <Popup>Netaji Subhas Chandra Bose International Airport</Popup>
                </Marker>

                {/* Threat Radius Indicator (Tactical Scale) */}
                <Circle 
                  center={[LAT + 0.003 * (timeStep % 3), LON + 0.002 * (timeStep % 3)]} 
                  radius={timeStep > 0 ? 550 + timeStep * 60 : 400} 
                  pathOptions={{ 
                      color: timeStep > 0 ? '#eb5757' : '#f2c94c', 
                      fillColor: timeStep > 0 ? '#eb5757' : '#f2c94c', 
                      fillOpacity: 0.35, 
                      weight: 2, 
                      dashArray: '5, 5' 
                  }}
                />
             </TacticalAirportMapEngine>
          </div>
        </div>
      </div>
    </div>
  );
};
