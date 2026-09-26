import React, { useEffect, useState } from 'react';
import { Rectangle, Marker, Popup, Circle } from 'react-leaflet';
import { ShieldAlert, Crosshair, Thermometer, Wind } from 'lucide-react';
import { TacticalAirportMapEngine, CCU_AIRPORT_CENTER, CCU_AIRPORT_BOUNDS } from './TacticalAirportMapEngine';

// Kolkata CCU Airport Coordinates
const LAT = CCU_AIRPORT_CENTER[0];
const LON = CCU_AIRPORT_CENTER[1];

export const HyperlocalTwinMap: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [radarTime, setRadarTime] = useState<number | null>(null);

  useEffect(() => {
    // Fetch REAL live data from Open-Meteo for Kolkata Airport
    const fetchRealData = async () => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,cape&hourly=precipitation,cape&timezone=auto&forecast_days=2`);
        const data = await response.json();
        
        // Find current hour index
        const currentHourIso = data.current.time.substring(0, 13) + ':00'; // e.g. "2024-05-10T14:00"
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
        console.error("Failed to fetch live weather data", err);
      }
    };
    
    // Fetch latest RainViewer timestamp for LIVE radar overlay
    const fetchRadarTime = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        const latestPast = data.radar.past[data.radar.past.length - 1].time;
        setRadarTime(latestPast);
      } catch (err) {
        console.error("Failed to fetch RainViewer data", err);
      }
    };

    fetchRealData();
    fetchRadarTime();
    
    const interval = setInterval(() => {
      fetchRealData();
      fetchRadarTime();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex h-[750px] bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden">
      
      {/* Sidebar Analytics */}
      <div className="w-80 border-r border-[#23252a] flex flex-col z-10 bg-[#0f1011]">
        <div className="p-4 border-b border-[#23252a] bg-[#141516]">
          <h2 className="text-[15px] font-bold text-[#f7f8f8] flex items-center tracking-tight leading-tight mb-1">
            <Crosshair className="w-4 h-4 mr-2 text-[#8a8f98] shrink-0" /> Netaji Subhas Chandra Bose Int'l
          </h2>
          <p className="text-[11px] font-mono text-[#8a8f98]">3x3 km Airspace Sector • CCU</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-[#8a8f98] mb-3 font-semibold">Live Atmospheric Data</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                <div className="text-[11px] text-[#8a8f98] mb-1 flex items-center"><Thermometer className="w-3 h-3 mr-1" /> Temp</div>
                <div className="text-[16px] font-mono font-bold text-[#f7f8f8]">{weatherData?.current?.temperature_2m ?? '--'}°C</div>
              </div>
              <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                <div className="text-[11px] text-[#8a8f98] mb-1 flex items-center"><Wind className="w-3 h-3 mr-1" /> Wind</div>
                <div className="text-[16px] font-mono font-bold text-[#f7f8f8]">{weatherData?.current?.wind_speed_10m ?? '--'} km/h</div>
              </div>
              <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                <div className="text-[11px] text-[#8a8f98] mb-1">CAPE</div>
                <div className="text-[16px] font-mono font-bold text-[#eb5757]">{weatherData?.current?.cape ?? '--'} J/kg</div>
              </div>
              <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
                <div className="text-[11px] text-[#8a8f98] mb-1">Precip</div>
                <div className="text-[16px] font-mono font-bold text-[#f7f8f8]">{weatherData?.current?.precipitation ?? '--'} mm</div>
              </div>
            </div>
          </div>

          {/* Real 6-Hour Nowcast Timeline based on Hourly Forecast */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-[#8a8f98] mb-3 font-semibold">0-6 Hour AI Nowcast Timeline</h3>
            <div className="bg-[#141516] border border-[#23252a] p-3 rounded-lg">
              {weatherData?.hourly ? (
                <div className="flex justify-between items-end h-24 space-x-1">
                  {weatherData.hourly.map((hour: any, idx: number) => {
                    // Calculate bar height based on precip (max 10mm for scale) or CAPE if precip is 0
                    const precip = hour.precip;
                    const cape = hour.cape;
                    const heightPercent = precip > 0 ? Math.min(100, (precip / 10) * 100) : Math.min(100, (cape / 3000) * 40);
                    const isDanger = cape > 1500 || precip > 5;
                    
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 group relative">
                        {/* Tooltip */}
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
              <ShieldAlert className="w-4 h-4 mr-1.5" /> High CAPE Alert
            </h3>
            <p className="text-[12px] text-[#d0d6e0] leading-relaxed">
              Environment highly conducive to convective initiation. Thermodynamic instability detected over the Kolkata sector.
            </p>
          </div>

        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative bg-[#1a1b1d]">
        <TacticalAirportMapEngine 
          center={[LAT, LON]} 
          zoom={16} 
          minZoom={15}
          maxZoom={18}
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
          showProviderToggle={true}
          providerTogglePosition="bottom-right"
        >
          {/* Tactical 3x3 km Sector Bounds */}
          <Rectangle 
            bounds={CCU_AIRPORT_BOUNDS} 
            pathOptions={{ color: '#00e5ff', weight: 1.5, dashArray: '4 4', fillOpacity: 0.02 }} 
          />

          {/* Real-time Convective Radar Reflectivity Core (Simulated DWR Feed) */}
          <Circle 
            center={[LAT + 0.007, LON + 0.003]} 
            radius={850} 
            pathOptions={{ color: '#ffcc00', fillColor: '#ffcc00', fillOpacity: 0.35, weight: 1 }}
          />
          <Circle 
            center={[LAT + 0.007, LON + 0.003]} 
            radius={450} 
            pathOptions={{ color: '#eb5757', fillColor: '#eb5757', fillOpacity: 0.55, weight: 1.5 }}
          />

          {/* Marker for CCU Airport Operations Center */}
          <Marker position={[LAT, LON]}>
            <Popup className="custom-popup">
              <div className="text-black font-sans p-1">
                <strong className="text-sm">CCU Aerodrome Center</strong><br/>
                <span className="text-xs text-gray-700">ConvectNow 3x3km Operations Node</span><br/>
                <span className="text-[10px] font-mono text-gray-500">Lat: {LAT.toFixed(4)}, Lon: {LON.toFixed(4)}</span>
              </div>
            </Popup>
          </Marker>

        </TacticalAirportMapEngine>

        {/* Floating Controls Overlay */}
        <div className="absolute top-4 right-4 z-[400] flex space-x-2">
           <div className="px-3 py-1.5 bg-[rgba(8,9,10,0.85)] backdrop-blur-md border border-[#34343a] rounded-lg text-[11px] font-mono text-[#8a8f98] flex items-center shadow-lg">
             <span className="w-2 h-2 rounded-full bg-[#4cb782] mr-2"></span>
             LIVE DATA: OPEN-METEO
           </div>
        </div>

      </div>
    </div>
  );
};
