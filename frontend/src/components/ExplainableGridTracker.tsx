import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, CircleMarker, Polyline, Popup, Marker, ScaleControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Brain, Wind, Thermometer, CloudLightning, Activity, AlertTriangle, 
  Crosshair, Radar, Maximize2, Minimize2, RotateCcw, ShieldAlert,
  ChevronRight, Info
} from 'lucide-react';
import { 
  TACTICAL_3X3_GRID, 
  AERODROME_3X3_KM_GRID,
  SURROUNDING_AWS_STATIONS, 
  TacticalSector, 
  VEBS_AIRPORT_SPECS,
  VEBS_DOMAIN_BOUNDS
} from '../types/tacticalGrid';
import { VisualIntelDecisionKey } from './VisualIntelDecisionKey';

// Component to handle map view updates dynamically
function ChangeView({ center, zoom, isExpanded }: { center: [number, number]; zoom: number; isExpanded?: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isExpanded, map]);

  return null;
}

// Map zoom tracker for dynamic LOD (Level of Detail) decluttering
function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

// ----------------------------------------------------------------------------
// 1. TACTICAL 3.0 km × 3.0 km AERODROME NOWCAST TRAJECTORY (VEBS Airfield Core)
// 37 steps (0 to 60 mins): Tracks storm core directly across the 9 airport cells!
// Path: SW Khandagiri Ridge (T-C1) -> RWY 01 Touchdown (T-C2) -> ATC Midfield (T-B2) -> RWY 19 Threshold (T-A2) -> NE Exit (T-A3)
// ----------------------------------------------------------------------------
const AERODROME_STORM_TRACK = Array.from({ length: 37 }).map((_, i) => {
  const progress = i / 36; // 0.0 to 1.0
  const timeOffset = Math.round(progress * 60); // 0 to 60 mins

  // Trajectory: Starts at SW approach [20.2330, 85.8060] (Sector C1)
  // Crosses Runway 01 touchdown [20.2370, 85.8140] (Sector C2) at ~T+15m
  // Direct hit on Midfield ATC & Radar [20.2444, 85.8178] (Sector B2) at T+30m
  // Crosses Runway 19 threshold [20.2545, 85.8210] (Sector A2) at ~T+45m
  // Exits towards Rasulgarh / NH-16 [20.2575, 85.8285] (Sector A3) at T+60m
  const lat = 20.2330 + progress * (20.2575 - 20.2330);
  const lon = 85.8060 + progress * (20.2575 - 20.2330) * 0.93; // 85.8060 to ~85.8288

  // Convective intensity peaks directly over Runway 01 / ATC Midfield (T+20m to T+35m)
  const peakFactor = Math.exp(-Math.pow((progress - 0.5) / 0.18, 2));

  const cape = Math.round(2400 + peakFactor * 1350); // 2400 to 3750 J/kg
  const vil = Math.round(22 + peakFactor * 46); // 22 to 68 kg/m²
  const dbz = +(44 + peakFactor * 22.5).toFixed(1); // 44.0 to 66.5 dBZ
  const rainRate = +(28 + peakFactor * 146.5).toFixed(1); // 28 to 174.5 mm/h
  const tempAnomaly = -(2.2 + peakFactor * 5.6).toFixed(1); // -2.2 to -7.8°C cold pool
  const windGust = Math.round(48 + peakFactor * 51); // 48 to 99 km/h (54 kt)
  const shearVelocity = Math.round(20 + peakFactor * 28); // 20 to 48 m/s (LLWS)

  const isPeak = progress >= 0.35 && progress <= 0.65;

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
    shearVelocity,
    intensity: isPeak 
      ? 'Severe Microburst / Cloudburst (LLWS Warning)' 
      : progress < 0.35 
      ? 'Intensifying Inflow Multicell' 
      : 'Decaying Cold-Pool Outflow',
    probability: Math.min(99, Math.round(52 + peakFactor * 47)),
  };
});

// ----------------------------------------------------------------------------
// 2. REGIONAL 60 km CORRIDOR NOWCAST TRAJECTORY (Khurda -> Bhubaneswar -> Cuttack)
// 37 steps (0 to 360 mins / 6 hours, 10-min intervals)
// ----------------------------------------------------------------------------
const REGIONAL_STORM_TRACK = Array.from({ length: 37 }).map((_, i) => {
  const progress = i / 36;
  const timeOffset = i * 10; // 0 to 360 mins

  // Khurda [20.20, 85.58] -> VEBS [20.244, 85.818] at T+90m -> Cuttack [20.46, 85.90] -> Paradeep [20.55, 86.06]
  const lat = 20.20 + progress * 0.35;
  const lon = 85.58 + progress * 0.48;

  const peakFactor = Math.exp(-Math.pow((progress - 0.25) / 0.12, 2));
  const cape = Math.round(2200 + peakFactor * 1400);
  const vil = Math.round(18 + peakFactor * 48);
  const dbz = +(42 + peakFactor * 24.5).toFixed(1);
  const rainRate = +(25 + peakFactor * 150).toFixed(1);
  const tempAnomaly = -(2.0 + peakFactor * 5.8).toFixed(1);
  const windGust = Math.round(45 + peakFactor * 55);
  const shearVelocity = Math.round(20 + peakFactor * 28);

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
    shearVelocity,
    intensity: peakFactor > 0.6 ? 'Severe Microburst Corridor' : 'Active Multicell Convection',
    probability: Math.min(99, Math.round(45 + peakFactor * 54)),
  };
});

export const ExplainableGridTracker: React.FC = () => {
  const [timeStep, setTimeStep] = useState(18); // Default at T+30m (direct impact over VEBS midfield)
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'streets' | 'dark'>('satellite');
  const [gridDomain, setGridDomain] = useState<'3km_aerodrome' | '60km_corridor'>('3km_aerodrome');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(14.3);

  // Select active track based on domain
  const activeTrackList = gridDomain === '3km_aerodrome' ? AERODROME_STORM_TRACK : REGIONAL_STORM_TRACK;
  const currentTrack = activeTrackList[Math.min(timeStep, activeTrackList.length - 1)];

  const activeGridList = gridDomain === '3km_aerodrome' ? AERODROME_3X3_KM_GRID : TACTICAL_3X3_GRID;

  // Find which 3x3 sector currently contains the storm core
  const activeSector = activeGridList.find(sec => 
    currentTrack.lat >= sec.latMin && currentTrack.lat <= sec.latMax &&
    currentTrack.lon >= sec.lonMin && currentTrack.lon <= sec.lonMax
  ) || activeGridList[4]; // fallback to center cell

  const mapCenter: [number, number] = gridDomain === '3km_aerodrome' ? [20.2444, 85.8178] : [20.30, 85.80];
  const mapZoom = gridDomain === '3km_aerodrome' ? 14.3 : 10.4;

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep(prev => (prev < 36 ? prev + 1 : 0));
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden flex flex-col font-sans shadow-2xl">
      
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-[#23252a] bg-[#0c0d0f] flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-[17px] font-bold text-white tracking-tight">
                3×3 Tactical Grid Tracking &amp; ConvectNet XAI
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {gridDomain === '3km_aerodrome' ? 'AERODROME 3.0 km × 3.0 km' : 'REGIONAL 60 km CORRIDOR'}
              </span>
            </div>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">
              {gridDomain === '3km_aerodrome'
                ? 'Biju Patnaik Airport (VEBS) · 9 Tactical Cells (1.0 km² each) · Lat 20.2309°N–20.2579°N, Lon 85.8034°E–85.8322°E'
                : 'Bhubaneswar-Cuttack-Puri Severe Convection Corridor (Lat 20.0°N–20.6°N, Lon 85.5°E–86.1°E) · Regional Track'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMapExpanded(!isMapExpanded)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141518] hover:bg-[#1f2127] border border-[#34343a] text-slate-200 hover:text-white transition-all flex items-center space-x-1.5 shadow"
          >
            {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5 text-sky-400" /> : <Maximize2 className="w-3.5 h-3.5 text-sky-400" />}
            <span className="font-semibold">{isMapExpanded ? 'Standard Split' : 'Maximize Map'}</span>
          </button>

          <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[11px] font-mono font-bold uppercase flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>CELL {activeSector.id} ({currentTrack.dbz} dBZ)</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className={`flex p-5 gap-5 ${isMapExpanded ? 'flex-col' : 'flex-row'}`}>
        
        {/* Left: Map Container (Expanded to 74% in split mode or 100% in full mode) */}
        <div 
          className={`border border-[#34343a] rounded-xl bg-[#101113] flex flex-col overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.6)] transition-all duration-300 ${
            isMapExpanded ? 'w-full h-[820px]' : 'w-[74%] h-[740px]'
          }`}
        >
          {/* Top-Left Telemetry Overlay Badge */}
          <div className="absolute top-4 left-4 z-[400] px-4 py-2.5 bg-[#08090a]/92 border border-[#34343a] rounded-lg shadow-xl backdrop-blur-md">
            <div className="text-[12px] font-bold text-white uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-sky-400" />
              <span>Nowcast: T+{currentTrack.timeOffset} Mins</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                {currentTrack.dbz} dBZ Core
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <span>Active Cell: <strong className="text-white">{activeSector.id}</strong> [{activeSector.code}]</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">{currentTrack.intensity.split(' (')[0]}</span>
            </div>
          </div>
          
          {/* Top-Right Domain, Basemap & Reset Controls */}
          <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2">
            {/* Domain Switcher */}
            <div className="flex bg-[#08090a]/92 border border-[#34343a] rounded-lg p-1 shadow-xl backdrop-blur-md gap-1">
              <button
                onClick={() => {
                  setGridDomain('3km_aerodrome');
                  setTimeStep(18); // Reset to midfield impact
                }}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  gridDomain === '3km_aerodrome'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎯 3×3 km Aerodrome
              </button>
              <button
                onClick={() => {
                  setGridDomain('60km_corridor');
                  setTimeStep(12); // Reset to corridor progression
                }}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  gridDomain === '60km_corridor'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗺️ 60 km Corridor
              </button>
            </div>

            {/* Basemap Switcher */}
            <div className="flex bg-[#08090a]/92 border border-[#34343a] rounded-lg p-1 shadow-xl backdrop-blur-md gap-1">
              <button
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-0.5 text-[11px] rounded font-medium transition-all ${
                  mapType === 'satellite'
                    ? 'bg-sky-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🛰️ Satellite HD
              </button>
              <button
                onClick={() => setMapType('streets')}
                className={`px-2.5 py-0.5 text-[11px] rounded font-medium transition-all ${
                  mapType === 'streets'
                    ? 'bg-sky-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗺️ Streets
              </button>
              <button
                onClick={() => setMapType('dark')}
                className={`px-2.5 py-0.5 text-[11px] rounded font-medium transition-all ${
                  mapType === 'dark'
                    ? 'bg-sky-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌑 Dark
              </button>
            </div>

            {/* Recenter Button */}
            <button
              onClick={() => {
                setCurrentZoom(gridDomain === '3km_aerodrome' ? 14.3 : 10.4);
              }}
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-[#08090a]/92 border border-[#34343a] text-slate-300 hover:text-white transition-all shadow flex items-center gap-1 backdrop-blur-md"
              title="Reset View to VEBS Center"
            >
              <RotateCcw className="w-3 h-3 text-sky-400" />
              <span>Center VEBS</span>
            </button>
          </div>

          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            scrollWheelZoom={true} 
            className="w-full h-full bg-[#0a0d15]"
          >
            <ChangeView center={mapCenter} zoom={mapZoom} isExpanded={isMapExpanded} />
            <ZoomWatcher onZoomChange={setCurrentZoom} />
            <ScaleControl position="bottomleft" metric={true} imperial={false} />

            {/* Basemap Tiles */}
            {mapType === 'satellite' && (
              <>
                <TileLayer 
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                  maxZoom={19} 
                  attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics" 
                />
                <TileLayer 
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" 
                  maxZoom={19} 
                  opacity={0.85} 
                />
                <TileLayer 
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}" 
                  maxZoom={19} 
                  opacity={0.8} 
                />
              </>
            )}
            {mapType === 'streets' && (
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                maxZoom={19} 
                attribution="&copy; OpenStreetMap contributors" 
              />
            )}
            {mapType === 'dark' && (
              <>
                <TileLayer 
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" 
                  maxZoom={19} 
                  opacity={0.9} 
                  attribution="&copy; Esri" 
                />
                <TileLayer 
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" 
                  maxZoom={19} 
                  opacity={0.85} 
                />
              </>
            )}

            {/* Runway 01/19 Highlight (2,743m × 45m) */}
            {gridDomain === '3km_aerodrome' && (
              <Polyline
                positions={[
                  [20.2338, 85.8155], // Runway 01 Threshold
                  [20.2550, 85.8202], // Runway 19 Threshold
                ]}
                pathOptions={{
                  color: '#00e5ff',
                  weight: 4,
                  opacity: 0.9,
                }}
              >
                <Popup>
                  <div className="p-1 font-mono text-xs">
                    <strong className="text-cyan-600">✈️ Runway 01/19 (2,743 m × 45 m)</strong>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Asphalt · Heading 010° / 190° · VEBS Main Instrument Runway
                    </div>
                  </div>
                </Popup>
              </Polyline>
            )}

            {/* 3x3 Sector Grid Overlays - Decluttered Minimalist Design */}
            {activeGridList.map((sec) => {
              const isActive = sec.id === activeSector.id;
              const isExtreme = sec.cloudburstFlag || sec.radarDbz >= 60;
              const color = isExtreme ? '#ef4444' : isActive ? '#f59e0b' : '#38bdf8';

              // Clean Sector short tag (e.g. "B2", "C1")
              const shortId = sec.id.replace('T-', '').replace('SEC-', '');

              return (
                <Rectangle 
                  key={sec.id} 
                  bounds={[
                    [sec.latMin, sec.lonMin],
                    [sec.latMax, sec.lonMax]
                  ]} 
                  pathOptions={{
                    color: isActive ? '#ffffff' : color,
                    weight: isActive ? 2.5 : 1.2,
                    fillColor: color,
                    fillOpacity: isActive ? 0.22 : 0.06,
                    dashArray: isActive ? undefined : '4, 4'
                  }}
                >
                  {/* Subtle, non-intrusive badge showing Sector ID & dBZ (hides when zoomed out < 12) */}
                  {currentZoom >= 12 && (
                    <Tooltip 
                      permanent 
                      direction="center" 
                      className="bg-black/70 backdrop-blur-sm border border-white/20 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow pointer-events-none"
                    >
                      <span className={isActive ? 'text-amber-300 font-extrabold' : 'text-sky-200'}>
                        [{shortId}] {sec.radarDbz} dBZ {isExtreme ? '⚠️' : ''}
                      </span>
                    </Tooltip>
                  )}

                  {/* Rich Detailed Popup on Click */}
                  <Popup>
                    <div className="p-2 font-sans bg-[#0c1017] text-white rounded max-w-[260px]">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                        <span className="font-bold text-xs text-sky-400">{sec.id} [{sec.code}]</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                          {sec.radarDbz} dBZ
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-slate-100">{sec.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-tight">{sec.description}</div>
                      
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[10px] font-mono bg-black/40 p-2 rounded border border-white/10">
                        <div>Rain: <span className="text-white font-bold">{sec.rainRateMmh} mm/h</span></div>
                        <div>Wind: <span className="text-white font-bold">{sec.windGustKmh} km/h</span></div>
                        <div>CAPE: <span className="text-purple-300 font-bold">{sec.capeJkg} J/kg</span></div>
                        <div>Hail: <span className="text-amber-300 font-bold">{sec.hailRisk}</span></div>
                      </div>

                      {sec.cloudburstFlag && (
                        <div className="mt-2 px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold rounded text-center">
                          ⚠️ ACTIVE MICROBURST / CLOUDBURST CELL
                        </div>
                      )}
                    </div>
                  </Popup>
                </Rectangle>
              );
            })}

            {/* When zoomed out (< 12) in 3km mode: show a single clear aerodrome boundary box without clutter */}
            {gridDomain === '3km_aerodrome' && currentZoom < 12 && (
              <Rectangle
                bounds={[[20.2309, 85.8034], [20.2579, 85.8322]]}
                pathOptions={{ color: '#00e5ff', weight: 2.5, fillColor: '#00e5ff', fillOpacity: 0.15 }}
              >
                <Tooltip permanent direction="top" className="bg-black/90 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40">
                  ✈️ VEBS Aerodrome (3.0 km × 3.0 km Tactical Grid)
                </Tooltip>
              </Rectangle>
            )}

            {/* 9 Surrounding Surface AWS Stations */}
            {SURROUNDING_AWS_STATIONS.map((st) => (
              <CircleMarker
                key={st.id}
                center={[st.lat, st.lon]}
                radius={4.5}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: st.status === 'SEVERE_ALERT' ? '#ef4444' : '#f59e0b',
                  fillOpacity: 0.95,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="p-1 font-mono text-xs">
                    <strong className="text-amber-500">{st.id} ({st.code})</strong>
                    <div>{st.name}</div>
                    <div className="mt-1 text-[11px] text-slate-700">
                      Temp: {st.tempC}°C | Pres: {st.pressureHpa} hPa | Rain: {st.rainRateMmh} mm/h
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Storm Track Polyline (Past Completed Path) */}
            <Polyline 
              positions={activeTrackList.slice(0, timeStep + 1).map(t => [t.lat, t.lon])} 
              pathOptions={{ color: '#ef4444', weight: 3.5, opacity: 0.9 }} 
            />
            
            {/* Storm Track Polyline (Future Projected Path) */}
            <Polyline 
              positions={activeTrackList.slice(timeStep).map(t => [t.lat, t.lon])} 
              pathOptions={{ color: '#ef4444', weight: 2, dashArray: '5, 5', opacity: 0.6 }} 
            />

            {/* XAI Attribution Spatial Bounding Box & Feature Activation Envelope */}
            <Rectangle
              bounds={[
                [currentTrack.lat - 0.015, currentTrack.lon - 0.018],
                [currentTrack.lat + 0.015, currentTrack.lon + 0.018]
              ]}
              pathOptions={{
                color: '#ef4444',
                weight: 1.5,
                dashArray: '4, 4',
                fillColor: '#ef4444',
                fillOpacity: 0.16
              }}
            />

            {/* Clean Tactical Storm Centroid Marker */}
            <Marker
              position={[currentTrack.lat, currentTrack.lon]}
              icon={L.divIcon({
                className: 'xai-storm-centroid',
                html: `
                  <div style="transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center;">
                    <div style="width: 14px; height: 14px; transform: rotate(45deg); background: #dc2626; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(220,38,38,0.9);"></div>
                  </div>
                `
              })}
            >
              <Tooltip 
                permanent 
                direction="top" 
                offset={[0, -12]} 
                className="bg-red-600/90 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow border border-white/40 pointer-events-none"
              >
                🔴 Storm Core: {currentTrack.dbz} dBZ (T+{currentTrack.timeOffset}m)
              </Tooltip>
            </Marker>
          </MapContainer>

          {/* Timeline Scrubber */}
          <div className="absolute bottom-0 left-0 w-full p-4 bg-[#08090a]/94 backdrop-blur-md border-t border-[#34343a] z-[400]">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg flex-shrink-0"
                title={isPlaying ? 'Pause Simulation' : 'Play Timeline'}
              >
                {isPlaying ? (
                  <span className="block w-3 h-3 bg-white"></span>
                ) : (
                  <span className="block w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white border-b-[5px] border-b-transparent ml-0.5"></span>
                )}
              </button>
              
              <div className="flex-1 relative pt-1">
                <input 
                  type="range" 
                  min="0" 
                  max="36" 
                  value={timeStep}
                  onChange={(e) => setTimeStep(parseInt(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-[#34343a] rounded-lg appearance-none cursor-pointer"
                />
                
                {/* Timeline Axis Labels adapted to Domain */}
                {gridDomain === '3km_aerodrome' ? (
                  <div className="flex justify-between mt-1 text-[10px] font-mono text-[#8a8f98]">
                    <span>T+0m (SW Inflow T-C1)</span>
                    <span>T+15m (RWY 01 Approach)</span>
                    <span className="text-amber-400 font-bold">T+30m (ATC Midfield Impact)</span>
                    <span>T+45m (RWY 19 Localizer)</span>
                    <span>T+60m (NE Exit)</span>
                  </div>
                ) : (
                  <div className="flex justify-between mt-1 text-[10px] font-mono text-[#8a8f98]">
                    <span>T+0m (Khurda Initiation)</span>
                    <span>T+60m (Jatni)</span>
                    <span className="text-amber-400 font-bold">T+120m (VEBS Impact)</span>
                    <span>T+240m (Cuttack Core)</span>
                    <span>T+360m (Paradeep Decay)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Explainable AI Panel (Compact in split mode, or 2-column analytics grid in expanded mode) */}
        <div className={isMapExpanded ? 'grid grid-cols-1 lg:grid-cols-2 gap-5 w-full' : 'flex flex-col gap-4 w-[26%]'}>
          
          {/* ConvectNet Attribution Card */}
          <div className="p-4 border border-sky-500/30 bg-sky-950/10 rounded-xl space-y-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-[12px] font-bold text-sky-400 flex items-center uppercase tracking-wider font-mono">
                <Brain className="w-4 h-4 mr-1.5" /> ConvectNet XAI Attribution
              </h3>
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                PROB: {currentTrack.probability}%
              </span>
            </div>
            
            {/* Target Sector Card */}
            <div className="p-3 bg-[#0a0d15] border border-[#34343a] rounded-lg">
              <div className="text-[10px] font-mono text-[#8a8f98] mb-0.5">CURRENT TARGET INTERSECT</div>
              <div className="text-[16px] font-bold text-white flex items-center justify-between">
                <span>{activeSector.id} [{activeSector.code}]</span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                {activeSector.name}
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-rose-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>{currentTrack.intensity}</span>
              </div>
            </div>

            {/* Physical Attribution Description */}
            <div className="text-[11px] text-slate-300 leading-relaxed border-l-2 border-sky-500 pl-2.5">
              <span className="font-bold text-white">Physics Attribution:</span> ConvectNet cross-correlates radar reflectivity (
              <strong className="text-amber-300">{currentTrack.dbz} dBZ</strong>), high liquid content (
              <strong className="text-sky-300">{currentTrack.vil} kg/m²</strong>), and cold pool anomaly (
              <strong className="text-rose-400">{currentTrack.tempAnomaly}°C</strong>). Low-level wind shear of{' '}
              <strong className="text-white">{currentTrack.shearVelocity} m/s</strong> active over glidepath.
            </div>

            {/* SHAP Weights */}
            <h4 className="text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider border-b border-[#34343a] pb-1">
              Multi-Modal Integrated Gradients
            </h4>
            
            <div className="space-y-2.5 font-mono text-[11px]">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 flex items-center"><Activity className="w-3 h-3 mr-1 text-amber-400" /> Radar Aloft</span>
                  <span className="text-amber-400 font-bold">{currentTrack.dbz} dBZ (42%)</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${(currentTrack.dbz / 70) * 100}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 flex items-center"><Thermometer className="w-3 h-3 mr-1 text-purple-400" /> CAPE</span>
                  <span className="text-purple-400 font-bold">{currentTrack.cape} J/kg (28%)</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full" style={{ width: `${(currentTrack.cape / 3800) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 flex items-center"><Wind className="w-3 h-3 mr-1 text-rose-400" /> Gust &amp; LLWS</span>
                  <span className="text-rose-400 font-bold">{currentTrack.windGust} km/h</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full" style={{ width: `${(currentTrack.windGust / 120) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Intelligence Card */}
          <div className="p-4 border border-[#23252a] bg-[#0c0d0f] rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-[12px] font-bold text-white flex items-center uppercase tracking-wider mb-2 font-mono">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-400" /> Aviation &amp; SDMA Action
              </h3>
              
              <div className="p-3 bg-[#141516] border border-[#34343a] rounded-lg border-l-4 border-l-red-500 text-xs">
                <div className="font-bold text-white mb-0.5">VEBS RUNWAY 01 INTERCEPT</div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  Microburst core touches Sector <strong>{activeSector.id}</strong> at T+{currentTrack.timeOffset}m.
                  AAI/ATC Advisory: <strong className="text-rose-400">IMMEDIATE RUNWAY 01 HOLD &amp; DIVERT INBOUND TRAFFIC</strong>.
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => alert(`Transmitted NDMA CAP v1.2 Protocol Alert for Sector ${activeSector.id} [${activeSector.code}] to VEBS Tower and Odisha SDMA.`)}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg transition-colors font-mono uppercase tracking-wider shadow-lg flex items-center justify-center space-x-1"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              <span>Transmit CAP Alert</span>
            </button>
          </div>

        </div>
      </div>

      {/* Visual Intel & Decision Key */}
      <VisualIntelDecisionKey page="grid" />
    </div>
  );
};

export default ExplainableGridTracker;

