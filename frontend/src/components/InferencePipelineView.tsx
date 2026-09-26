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
  BarChart2,
  Radio,
  Grid
} from 'lucide-react';
import { Marker, Popup, Circle, Rectangle } from 'react-leaflet';
import { 
  TacticalAirportMapEngine, 
  VEBS_AIRPORT_CENTER, 
  VEBS_DOMAIN_BOUNDS 
} from './TacticalAirportMapEngine';
import { 
  TACTICAL_3X3_GRID, 
  SURROUNDING_AWS_STATIONS 
} from '../types/tacticalGrid';

export const InferencePipelineView: React.FC = () => {
  const [timeStep, setTimeStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStep(prev => (prev + 1) % 6);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const LAT = VEBS_AIRPORT_CENTER[0];
  const LON = VEBS_AIRPORT_CENTER[1];

  return (
    <div className="w-full h-auto min-h-[750px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#23252a] bg-[#0f1011] flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none"></div>
        <div>
          <h2 className="text-[18px] font-bold text-[#f7f8f8] flex items-center tracking-tight">
            <Cpu className="w-5 h-5 mr-2 text-sky-400" />
            Live Multi-Source Ingestion &amp; ConvectNet Pipeline
          </h2>
          <p className="text-[12px] text-[#8a8f98] mt-0.5">
            4D Tensor Ingestion (DWR S-Band + INSAT-3DR + Lightning + 9 Surface AWS) → ConvectNet Spatiotemporal Engine (42 ms)
          </p>
        </div>
        <div className="flex space-x-2">
           <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center">
             <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></div> Live GPU Pipeline Active
           </div>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6 relative">
        
        {/* Column 1: Multi-Source Sensor Feeds */}
        <div className="w-[30%] flex flex-col gap-3 z-10">
          <h3 className="text-[12px] font-bold text-[#f7f8f8] uppercase tracking-wider mb-1 flex items-center font-mono">
            <Layers className="w-4 h-4 mr-2 text-slate-400" /> 1. Fused Input Streams
          </h3>
          
          {/* Feed 1: Radar */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <RadarIcon className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-white">IMD DWR Bhubaneswar</div>
                <div className="text-[10px] text-slate-400 font-mono">S-Band 2.875 GHz • Dual-Pol Z/Vr/VIL</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">5 MIN CAD</span>
          </div>

          {/* Feed 2: Satellite */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Satellite className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-bold text-white">MOSDAC INSAT-3DR</div>
                <div className="text-[10px] text-slate-400 font-mono">TIR1 (10.8µm) + WV (6.9µm) 1km</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE HDF5</span>
          </div>

          {/* Feed 3: Lightning */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CloudLightning className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs font-bold text-white">IITM Lightning Network</div>
                <div className="text-[10px] text-slate-400 font-mono">Total Lightning Strokes/km²/min</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">REALTIME</span>
          </div>

          {/* Feed 4: Surface AWS Ground Truth */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">9 In-Situ Surface AWS</div>
                <div className="text-[10px] text-slate-400 font-mono">VEBS, Cuttack, Khurda, Pipili...</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">9 STNS</span>
          </div>

          {/* 3x3 Domain Overview */}
          <div className="p-3.5 bg-slate-950 border border-sky-500/20 rounded-lg mt-auto text-xs font-mono space-y-1">
            <div className="text-sky-400 font-bold flex items-center">
              <Grid className="w-3.5 h-3.5 mr-1.5" /> 3x3km Tactical Raster Tensor
            </div>
            <div className="text-slate-400 text-[11px]">
              Input Tensor Shape: <span className="text-white font-bold">(B, 4, 12, 128, 128)</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Spatial Resolution: <span className="text-white font-bold">1.0 km EPSG:4326</span>
            </div>
          </div>
        </div>

        {/* Column 2: The ConvectNet Model Card */}
        <div className="w-[18%] flex flex-col justify-center items-center z-10">
           <div className="p-4 rounded-xl border border-sky-500/40 bg-sky-950/20 shadow-[0_0_30px_rgba(56,168,255,0.15)] flex flex-col items-center text-center relative w-full space-y-2">
               <div className="absolute -inset-1 rounded-xl border border-sky-500/20 animate-pulse pointer-events-none"></div>
               <Cpu className="w-10 h-10 text-sky-400" />
               <div className="text-[14px] font-bold text-[#f7f8f8]">ConvectNet</div>
               <div className="text-[10px] text-sky-400 font-mono uppercase">CBAM + ConvLSTM</div>
               
               <div className="text-[11px] text-slate-300 font-mono pt-2 border-t border-slate-800 w-full text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Latency:</span>
                    <span className="font-bold text-emerald-400">42 ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Params:</span>
                    <span className="font-bold text-white">4.8M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Device:</span>
                    <span className="font-bold text-white">Apple MPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SLA:</span>
                    <span className="font-bold text-emerald-400">&lt;50ms PASS</span>
                  </div>
               </div>
           </div>
        </div>

        {/* Column 3: The 3x3 Sector Prediction Map */}
        <div className="flex-1 flex flex-col z-10">
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-[12px] font-bold text-[#f7f8f8] uppercase tracking-wider flex items-center font-mono">
              <Activity className="w-4 h-4 mr-2 text-emerald-400" /> 2. 3x3 Sector Convective Hazard Projection
            </h3>
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
               Lead Time: T + {timeStep} Hour(s)
            </div>
          </div>
          
          <div className="flex-1 border border-emerald-500/30 rounded-xl bg-[#141516] flex flex-col overflow-hidden relative shadow-[0_0_20px_rgba(76,183,130,0.08)]">
             <div className="absolute top-4 left-4 z-[400] px-3 py-2 bg-[#08090a]/92 border border-emerald-500/40 rounded-lg shadow-lg backdrop-blur-md">
                 <div className="text-[13px] font-bold text-[#f7f8f8] mb-0.5">Target: VEBS Aerodrome &amp; 3x3 Corridor</div>
                 <div className="text-[11px] font-mono text-[#8a8f98]">
                    Valid: {new Date(Date.now() + timeStep * 3600000).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })} IST
                 </div>
             </div>
             
             <TacticalAirportMapEngine 
                center={[LAT, LON]} 
                zoom={13} 
                minZoom={10} 
                maxZoom={18} 
                scrollWheelZoom={true} 
                zoomControl={false} 
                dragging={true} 
                showTacticalGrid={true}
                showAwsStations={true}
                showProviderToggle={true}
                providerTogglePosition="top-right"
                className="w-full h-full bg-[#0a0d15]"
             >
                <Marker position={[LAT, LON]}>
                  <Popup className="dark-gis-popup">
                    <div className="p-2 text-xs font-mono bg-slate-950 text-slate-100 rounded">
                      <strong className="text-sky-400">VEBS Aerodrome Core</strong><br/>
                      <span>Runway 01/19 Microburst Protected</span>
                    </div>
                  </Popup>
                </Marker>

                {/* Animated Simulated Hazard Footprint */}
                <Circle 
                  center={[LAT + (timeStep * 0.03), LON + (timeStep * 0.04)]} 
                  radius={3500} 
                  pathOptions={{ 
                    color: '#ef4444', 
                    fillColor: '#ef4444', 
                    fillOpacity: 0.35, 
                    weight: 1.5 
                  }} 
                />
             </TacticalAirportMapEngine>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InferencePipelineView;
