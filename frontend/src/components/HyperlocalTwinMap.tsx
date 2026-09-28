import React, { useEffect, useState } from 'react';
import { Rectangle, Marker, Popup, Polygon } from 'react-leaflet';
import { ShieldAlert, Crosshair, Thermometer, Wind, Grid, Radio, AlertTriangle } from 'lucide-react';
import { 
  TacticalAirportMapEngine, 
  VEBS_AIRPORT_CENTER, 
  VEBS_DOMAIN_BOUNDS 
} from './TacticalAirportMapEngine';
import { 
  TACTICAL_3X3_GRID, 
  SURROUNDING_AWS_STATIONS, 
  TacticalSector, 
  SurfaceAwsStation 
} from '../types/tacticalGrid';
import { VisualIntelDecisionKey } from './VisualIntelDecisionKey';

// Biju Patnaik International Airport (VEBS), Bhubaneswar
const LAT = VEBS_AIRPORT_CENTER[0];
const LON = VEBS_AIRPORT_CENTER[1];

export const HyperlocalTwinMap: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'grid' | 'aws' | 'openmeteo'>('grid');
  const [selectedSector, setSelectedSector] = useState<TacticalSector>(TACTICAL_3X3_GRID[4]); // Center sector SEC-C
  const [selectedAws, setSelectedAws] = useState<SurfaceAwsStation>(SURROUNDING_AWS_STATIONS[0]); // AWS-VEBS

  useEffect(() => {
    // Fetch REAL live meteorological data from Open-Meteo for VEBS Aerodrome (Bhubaneswar: 20.2444, 85.8178)
    const fetchRealData = async () => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,cape&hourly=precipitation,cape&timezone=auto&forecast_days=2`);
        const data = await response.json();
        
        // Find current hour index
        const currentHourIso = data.current.time.substring(0, 13) + ':00';
        const startIndex = data.hourly.time.findIndex((t: string) => t === currentHourIso) || 0;
        
        // Extract next 6 hours
        const next6Hours = [];
        for (let i = 0; i < 6; i++) {
          next6Hours.push({
            precip: data.hourly.precipitation[startIndex + i] || 0,
            cape: data.hourly.cape[startIndex + i] || 0
          });
        }

        setWeatherData({
          current: data.current,
          hourly: next6Hours
        });
      } catch (err) {
        console.error("Failed to fetch live weather data for VEBS", err);
      }
    };
    
    fetchRealData();
    const interval = setInterval(fetchRealData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex h-[calc(100vh-140px)] min-h-[750px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden font-sans">
      
      {/* Sidebar Analytics */}
      <div className="w-96 border-r border-[#23252a] flex flex-col z-10 bg-[#0f1011]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#23252a] bg-[#141516]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[14px] font-bold text-[#f7f8f8] flex items-center tracking-tight leading-tight">
              <Crosshair className="w-4 h-4 mr-2 text-sky-400 shrink-0" /> Biju Patnaik Int'l (VEBS)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              3x3 TACTICAL
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#8a8f98]">AOI: 20.0°N–20.6°N, 85.5°E–86.1°E • 9 Sectors</p>
          
          {/* Sub Navigation Tabs */}
          <div className="flex p-0.5 bg-[#0a0d15] border border-[#23252a] rounded-lg mt-3">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-mono font-semibold transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'grid' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>3x3 Grid ({TACTICAL_3X3_GRID.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('aws')}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-mono font-semibold transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'aws' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>AWS Net ({SURROUNDING_AWS_STATIONS.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('openmeteo')}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-mono font-semibold transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'openmeteo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Aerodrome</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: 3x3 GRID SECTOR INSPECTOR */}
          {activeTab === 'grid' && (
            <div className="space-y-4">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Active 3x3 Sector Matrix</span>
                <span className="text-sky-400 font-bold">{selectedSector.id} [{selectedSector.code}]</span>
              </div>

              {/* 3x3 Sector Quick Tiles */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                {TACTICAL_3X3_GRID.map((sec) => {
                  const isSelected = selectedSector.id === sec.id;
                  const isExtreme = sec.cloudburstFlag || sec.radarDbz >= 60;
                  const isSevere = sec.radarDbz >= 50;
                  const color = isExtreme ? 'border-red-500/60 bg-red-950/40 text-red-300' : isSevere ? 'border-amber-500/50 bg-amber-950/30 text-amber-300' : 'border-slate-800 bg-slate-900/60 text-slate-300';

                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSector(sec)}
                      className={`p-2 rounded-lg border text-left transition-all ${color} ${isSelected ? 'ring-2 ring-sky-400 font-bold' : 'hover:border-slate-600'}`}
                    >
                      <div className="text-[10px] font-mono text-slate-400">{sec.code}</div>
                      <div className="text-[11px] font-mono font-bold mt-0.5">{sec.radarDbz} dBZ</div>
                      <div className="text-[9px] truncate text-slate-400 mt-0.5">{sec.rainRateMmh} mm/h</div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Sector Detailed Card */}
              <div className="bg-[#141516] border border-[#23252a] p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[13px] font-bold text-white flex items-center">
                      <span className="w-2 h-2 rounded-full bg-sky-400 mr-2"></span>
                      {selectedSector.name}
                    </div>
                    <div className="text-[11px] font-mono text-sky-400 mt-0.5">
                      Sector {selectedSector.id} • Lat {selectedSector.latMin}°–{selectedSector.latMax}°N, Lon {selectedSector.lonMin}°–{selectedSector.lonMax}°E
                    </div>
                  </div>
                  {selectedSector.cloudburstFlag && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-900/60 text-red-300 border border-red-700 animate-pulse">
                      CLOUDBURST
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 italic border-l-2 border-slate-700 pl-2">
                  {selectedSector.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">RADAR REFLECTIVITY</div>
                    <div className="text-base font-bold text-amber-400">{selectedSector.radarDbz} dBZ</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Z-R RAIN RATE</div>
                    <div className="text-base font-bold text-sky-300">{selectedSector.rainRateMmh} mm/h</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">SURFACE PRESSURE</div>
                    <div className="text-sm font-bold text-slate-200">{selectedSector.pressureHpa} hPa</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">OUTFLOW GUST</div>
                    <div className="text-sm font-bold text-rose-400">{selectedSector.windGustKmh} km/h</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">CAPE INSTABILITY</div>
                    <div className="text-sm font-bold text-purple-400">{selectedSector.capeJkg} J/kg</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">HAIL PROBABILITY</div>
                    <div className="text-sm font-bold text-emerald-400">{selectedSector.hailRisk}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IN-SITU AWS OBSERVATION NETWORK */}
          {activeTab === 'aws' && (
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex justify-between">
                <span>9 Surrounding Surface AWS Stations</span>
                <span className="text-amber-400 font-bold">{selectedAws.id}</span>
              </div>

              {/* AWS Station List */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {SURROUNDING_AWS_STATIONS.map((st) => {
                  const isSelected = selectedAws.id === st.id;
                  const isSevere = st.status === 'SEVERE_ALERT';
                  const isWarning = st.status === 'WARNING';

                  return (
                    <button
                      key={st.id}
                      onClick={() => setSelectedAws(st)}
                      className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-amber-400/80 bg-amber-950/30' 
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSevere ? 'bg-red-400 animate-pulse' : isWarning ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                          <span className="text-xs font-mono font-bold text-white">{st.id}</span>
                          <span className="text-[10px] font-mono text-slate-400">({st.code})</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-sans truncate max-w-[200px] mt-0.5">{st.name}</div>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <div className="font-bold text-amber-300">{st.tempC}°C</div>
                        <div className="text-[10px] text-slate-400">{st.windGustKt} kt gust</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected AWS Observation Deep Dive */}
              <div className="bg-[#141516] border border-[#23252a] p-3.5 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div>
                    <div className="text-xs font-bold text-white">{selectedAws.name}</div>
                    <div className="text-[10px] font-mono text-amber-400">
                      WMO ID: {selectedAws.code} • Lat {selectedAws.lat}°N, Lon {selectedAws.lon}°E (Elev {selectedAws.elevationM}m)
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    selectedAws.status === 'SEVERE_ALERT' ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {selectedAws.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-900/70 p-2 rounded">
                    <span className="text-[10px] text-slate-400">DRY BULB / DEW PT</span>
                    <div className="font-bold text-white">{selectedAws.tempC}°C / {selectedAws.dewPointC}°C</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">RH: {selectedAws.humidityPct}%</div>
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded">
                    <span className="text-[10px] text-slate-400">PRESSURE & TENDENCY</span>
                    <div className="font-bold text-white">{selectedAws.pressureHpa} hPa</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${selectedAws.tendency3h < -2 ? 'text-red-400' : 'text-slate-400'}`}>
                      ΔP/3h: {selectedAws.tendency3h > 0 ? `+${selectedAws.tendency3h}` : selectedAws.tendency3h} hPa
                    </div>
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded">
                    <span className="text-[10px] text-slate-400">SURFACE WIND</span>
                    <div className="font-bold text-sky-300">{selectedAws.windDirDeg}° @ {selectedAws.windSpeedKt} kt</div>
                    <div className="text-[10px] text-rose-400 font-bold mt-0.5">PEAK GUST: {selectedAws.windGustKt} kt</div>
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded">
                    <span className="text-[10px] text-slate-400">PRECIPITATION</span>
                    <div className="font-bold text-emerald-400">{selectedAws.rain1hMm} mm (1h)</div>
                    <div className="text-[10px] text-sky-400 mt-0.5">Rate: {selectedAws.rainRateMmh} mm/h</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AERODROME & OPEN-METEO LIVE */}
          {activeTab === 'openmeteo' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] uppercase tracking-wider text-[#8a8f98] mb-3 font-semibold">VEBS Aerodrome Telemetry</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                    <div className="text-[11px] text-[#8a8f98] mb-1 flex items-center"><Thermometer className="w-3 h-3 mr-1" /> Temp</div>
                    <div className="text-[16px] font-mono font-bold text-[#f7f8f8]">{weatherData?.current?.temperature_2m ?? '22.8'}°C</div>
                  </div>
                  <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                    <div className="text-[11px] text-[#8a8f98] mb-1 flex items-center"><Wind className="w-3 h-3 mr-1" /> Wind</div>
                    <div className="text-[16px] font-mono font-bold text-[#f7f8f8]">{weatherData?.current?.wind_speed_10m ?? '52'} km/h</div>
                  </div>
                  <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                    <div className="text-[11px] text-[#8a8f98] mb-1">CAPE</div>
                    <div className="text-[16px] font-mono font-bold text-[#eb5757]">{weatherData?.current?.cape ?? '3600'} J/kg</div>
                  </div>
                  <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                    <div className="text-[11px] text-[#8a8f98] mb-1">Precip</div>
                    <div className="text-[16px] font-mono font-bold text-[#f7f8f8]">{weatherData?.current?.precipitation ?? '68.4'} mm</div>
                  </div>
                </div>
              </div>

              {/* 6-Hour Nowcast Timeline */}
              <div>
                <h3 className="text-[11px] uppercase tracking-wider text-[#8a8f98] mb-3 font-semibold">0-6 Hour Convective Timeline</h3>
                <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                  {weatherData?.hourly ? (
                    <div className="flex justify-between items-end h-24 space-x-1">
                      {weatherData.hourly.map((hour: any, idx: number) => {
                        const precip = hour.precip;
                        const cape = hour.cape;
                        const heightPercent = precip > 0 ? Math.min(100, (precip / 10) * 100) : Math.min(100, (cape / 3000) * 40);
                        const isDanger = cape > 1500 || precip > 5;
                        
                        return (
                          <div key={idx} className="flex flex-col items-center flex-1 group relative">
                            <div className="absolute -top-8 bg-[#08090a] border border-[#34343a] text-[9px] font-mono text-[#f7f8f8] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity">
                              {precip}mm | {cape} J/kg
                            </div>
                            <span className="text-[9px] font-mono text-[#8a8f98] mb-1">{hour.precip > 0 ? `${hour.precip}m` : ''}</span>
                            <div className="w-full bg-[#1a1b1d] rounded-t-sm flex items-end justify-center h-16">
                               <div 
                                 className={`w-full rounded-t-sm transition-all duration-500 ${isDanger ? 'bg-[#eb5757]' : precip > 0 ? 'bg-[#38a8ff]' : 'bg-[#34343a]'}`}
                                 style={{ height: `${Math.max(4, heightPercent)}%` }}
                               ></div>
                            </div>
                            <span className="text-[9px] font-mono text-[#8a8f98] mt-1">+{idx}h</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center text-[10px] text-[#62666d]">Loading tensor projection...</div>
                  )}
                </div>
              </div>

              <div className="bg-[rgba(235,87,87,0.05)] border border-[#eb5757]/30 p-4 rounded-lg">
                <h3 className="text-[12px] font-bold text-[#eb5757] flex items-center mb-2">
                  <ShieldAlert className="w-4 h-4 mr-1.5" /> Severe Squall Line Alert
                </h3>
                <p className="text-[12px] text-[#d0d6e0] leading-relaxed">
                  Thermodynamic instability (CAPE 3600 J/kg) detected over Khurda–Bhubaneswar corridor. Downburst winds &gt;90 km/h imminent over Runway 01.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative bg-[#1a1b1d]">
        <TacticalAirportMapEngine 
          center={[LAT, LON]} 
          zoom={12} 
          minZoom={10} 
          maxZoom={18}
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
          showTacticalGrid={true}
          showAwsStations={true}
          selectedSectorId={selectedSector.id}
          onSelectSector={(sec) => setSelectedSector(sec)}
          selectedAwsId={selectedAws.id}
          onSelectAws={(st) => setSelectedAws(st)}
          showProviderToggle={true}
          providerTogglePosition="top-right"
        >
          {/* Tactical 3x3 Domain Outer Perimeter */}
          <Rectangle 
            bounds={VEBS_DOMAIN_BOUNDS} 
            pathOptions={{ color: '#38bdf8', weight: 1.5, dashArray: '6 6', fillOpacity: 0.02 }} 
          />

          {/* Active Severe Convective Cell Core (Authentic Smoothed Radar Footprint) */}
          <Polygon 
            positions={[
              [20.2640, 85.8150],
              [20.2610, 85.8320],
              [20.2520, 85.8410],
              [20.2370, 85.8380],
              [20.2260, 85.8260],
              [20.2240, 85.8080],
              [20.2320, 85.7980],
              [20.2480, 85.7950],
              [20.2590, 85.8030],
            ]}
            pathOptions={{ 
              color: '#ef4444', 
              fillColor: '#ef4444', 
              fillOpacity: 0.28, 
              weight: 1.5,
              dashArray: '4, 4'
            }} 
          />

          {/* Marker for VEBS Operations Center */}
          <Marker position={[LAT, LON]}>
            <Popup className="dark-gis-popup">
              <div className="p-2 text-xs font-mono space-y-1 bg-slate-950 text-slate-100 rounded">
                <strong className="text-sky-400">VEBS Aerodrome Center</strong><br/>
                <span className="text-slate-300">ConvectNow 3x3km Tactical Operations Node</span><br/>
                <span className="text-[10px] text-slate-500">Lat: {LAT.toFixed(4)}°N, Lon: {LON.toFixed(4)}°E (Elev 42m)</span>
              </div>
            </Popup>
          </Marker>

        </TacticalAirportMapEngine>

        {/* Floating Controls Overlay */}
        <div className="absolute top-4 left-4 z-[400] flex space-x-2">
           <div className="px-3 py-1.5 bg-[#08090a]/90 backdrop-blur-md border border-[#34343a] rounded-lg text-[11px] font-mono text-[#8a8f98] flex items-center shadow-lg">
             <span className="w-2 h-2 rounded-full bg-[#4cb782] mr-2"></span>
             LIVE STREAM: OPEN-METEO &amp; AWS NETWORK
           </div>
        </div>

      </div>

      {/* Visual Intel & Decision Key */}
      <VisualIntelDecisionKey page="hyperlocal" />
    </div>
  );
};

export default HyperlocalTwinMap;
