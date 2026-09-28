import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { Layers, Compass, Wind, Radio, Eye, AlertOctagon, CloudRain, Thermometer, Droplets, Gauge, Settings, Share2, Target, Map } from 'lucide-react';
import { DataProvenanceBadge } from './DataProvenanceBadge';

interface StormCell {
  cell_id: string;
  centroid_x: number;
  centroid_y: number;
  area_km2: number;
  peak_dbz: number;
  velocity_kmh: number;
  heading_deg: number;
}

interface HazardMapProps {
  cells: StormCell[];
  dbzGrid: number[][];
  selectedCell: StormCell | null;
  onSelectCell: (cell: StormCell) => void;
  activeLayer: string;
  onLayerChange: (layer: string) => void;
  leadTimeMin: number;
}

export const HazardMap: React.FC<HazardMapProps> = ({
  activeLayer,
  onLayerChange,
  leadTimeMin
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);

  const [radarPath, setRadarPath] = useState<string | null>(null);
  const [omData, setOmData] = useState<any>(null);

  // Storm Center (Padmapur / Visakhapatnam area based on screenshots)
  const STORM_CENTER = { lat: 17.8, lng: 83.2 };


  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        const past = data.radar?.past;
        if (past && past.length > 0) {
           setRadarPath(past[past.length - 1].path);
        }
      })
      .catch(console.error);

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${STORM_CENTER.lat}&longitude=${STORM_CENTER.lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m`)
      .then(r => r.json())
      .then(d => {
        setOmData({
           temperature: d.current_weather?.temperature || '--',
           wind: d.current_weather?.windspeed || '--',
           humidity: d.hourly?.relative_humidity_2m?.[0] || '--',
           pressure: d.hourly?.surface_pressure?.[0] || '--'
        });
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('leaflet-map-root', { 
        zoomControl: false,
        attributionControl: false 
      }).setView([19.5, 82.0], 6);
      
      mapRef.current = map;

      // Base Tile Layer (CartoDB Dark Matter default)
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        subdomains: 'abcd',
        maxZoom: 19,
        className: 'map-tiles-blue-tint'
      }).addTo(map);

      radarLayerRef.current = L.tileLayer('', {
        opacity: 0.65,
        zIndex: 10
      }).addTo(map);

      // Uncertainty Cone (Grey Polygon)
      L.polygon([
        [STORM_CENTER.lat, STORM_CENTER.lng],
        [15.0, 82.5],
        [16.0, 85.5]
      ], { color: 'transparent', fillColor: '#ffffff', fillOpacity: 0.15 }).addTo(map);

      // Past Track (Purple)
      L.polyline([
        [22.5, 79.0],
        [20.5, 81.0],
        [STORM_CENTER.lat, STORM_CENTER.lng]
      ], { color: '#8b5cf6', weight: 3 }).addTo(map);

      // Future Track (Green)
      L.polyline([
        [STORM_CENTER.lat, STORM_CENTER.lng],
        [16.8, 84.0],
        [16.2, 84.8]
      ], { color: '#10b981', weight: 3, dashArray: '5, 7' }).addTo(map);

      // Storm Core Node
      L.circleMarker([STORM_CENTER.lat, STORM_CENTER.lng], {
        radius: 7,
        fillColor: '#8b5cf6',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).addTo(map).bindTooltip("Padmapur", { 
        permanent: true, 
        direction: 'right', 
        className: 'bg-transparent border-0 text-white font-bold drop-shadow-md shadow-none text-sm' 
      });

      // Future Nodes
      L.circleMarker([16.8, 84.0], { radius: 4, fillColor: '#10b981', color: 'transparent' }).addTo(map);
      L.circleMarker([16.2, 84.8], { radius: 4, fillColor: '#10b981', color: 'transparent' }).addTo(map);
    }

    const map = mapRef.current;

    // --- Dynamic Base Map Switching ---
    // If Satellite/IR is chosen, use Esri World Imagery (No API Key needed)
    // Otherwise use CartoDB Dark Matter (No API Key needed)
    if (tileLayerRef.current) {
      if (activeLayer === 'ir' || activeLayer === 'satellite') {
        tileLayerRef.current.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
      } else {
        tileLayerRef.current.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}');
      }
    }

    if (radarLayerRef.current) {
      if (radarPath && (activeLayer === 'radar' || activeLayer === 'precipitation' || activeLayer === 'dbz')) {
        radarLayerRef.current.setUrl(`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_1.png`);
      } else {
        radarLayerRef.current.setUrl('');
      }
    }

    // --- Weather Overlays Animation (Canvas) ---
    let particles: any[] = [];
    
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 600; i++) {
        particles.push({
          lat: 12 + Math.random() * 15,
          lng: 75 + Math.random() * 15,
          life: Math.random() * 100,
          maxLife: 40 + Math.random() * 60
        });
      }
    };
    initParticles();

    const renderOverlay = () => {
      const canvas = canvasRef.current;
      if (!canvas || !map) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bounds = map.getSize();
      canvas.width = bounds.x;
      canvas.height = bounds.y;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (activeLayer === 'temperature') {
        const centerPt = map.latLngToContainerPoint([20.0, 80.0]);
        const grad = ctx.createRadialGradient(centerPt.x, centerPt.y, 0, centerPt.x, centerPt.y, 1000);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.45)'); // Red
        grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)'); // Orange
        grad.addColorStop(0.8, 'rgba(59, 130, 246, 0.15)'); // Blue
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

      } else if (activeLayer === 'humidity') {
        const centerPt = map.latLngToContainerPoint([20.0, 80.0]);
        const grad = ctx.createRadialGradient(centerPt.x, centerPt.y, 0, centerPt.x, centerPt.y, 1000);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.3)'); // Emerald
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (activeLayer === 'pressure') {
        const centerPt = map.latLngToContainerPoint([20.0, 80.0]);
        const grad = ctx.createRadialGradient(centerPt.x, centerPt.y, 0, centerPt.x, centerPt.y, 1000);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.3)'); // Purple
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (activeLayer === 'dbz' || activeLayer === 'precipitation' || activeLayer === 'hail' || activeLayer === 'radar') {
        // Interpolate storm position based on leadTimeMin
        const progress = leadTimeMin / 60; // 0 to 1
        const currentLat = STORM_CENTER.lat + (16.2 - STORM_CENTER.lat) * progress;
        const currentLng = STORM_CENTER.lng + (84.8 - STORM_CENTER.lng) * progress;
        const stormPt = map.latLngToContainerPoint([currentLat, currentLng]);
        
        const coreGrad = ctx.createRadialGradient(stormPt.x, stormPt.y, 0, stormPt.x, stormPt.y, 150);
        coreGrad.addColorStop(0, activeLayer === 'hail' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(168, 85, 247, 0.85)');
        coreGrad.addColorStop(0.2, 'rgba(239, 68, 68, 0.7)');
        coreGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.5)');
        coreGrad.addColorStop(0.8, 'rgba(59, 130, 246, 0.3)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(stormPt.x, stormPt.y, 150, 0, Math.PI * 2);
        ctx.fill();
      }

      if (activeLayer === 'wind') {
        ctx.lineWidth = 1.8;
        particles.forEach(p => {
          const pt = map.latLngToContainerPoint([p.lat, p.lng]);
          
          const progress = leadTimeMin / 60;
          const currentLat = STORM_CENTER.lat + (16.2 - STORM_CENTER.lat) * progress;
          const currentLng = STORM_CENTER.lng + (84.8 - STORM_CENTER.lng) * progress;

          const dx = currentLng - p.lng;
          const dy = currentLat - p.lat;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          const angle = Math.atan2(dy, dx) + (Math.PI / 2.3); 
          const speed = Math.max(0.08, 1.2 - (dist * 0.08)); 
          
          const newLng = p.lng + Math.cos(angle) * speed;
          const newLat = p.lat + Math.sin(angle) * speed;
          
          const newPt = map.latLngToContainerPoint([newLat, newLng]);
          
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(newPt.x, newPt.y);
          
          if (activeLayer === 'wind') {
             ctx.strokeStyle = `rgba(167, 243, 208, ${p.life / p.maxLife})`; 
          } else {
             ctx.strokeStyle = `rgba(255, 255, 255, ${(p.life / p.maxLife) * 0.3})`;
          }
          ctx.stroke();

          p.lat = newLat;
          p.lng = newLng;
          p.life--;
          if (p.life <= 0) {
            p.lat = 12 + Math.random() * 15;
            p.lng = 75 + Math.random() * 15;
            p.life = p.maxLife;
          }
        });
      }

      animFrameRef.current = requestAnimationFrame(renderOverlay);
    };

    renderOverlay();
    
    map.on('move', renderOverlay);
    map.on('zoom', renderOverlay);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off('move', renderOverlay);
      map.off('zoom', renderOverlay);
    };
  }, [activeLayer, leadTimeMin]);

  const menuItems = [
    { section: 'LIVE MAPS', items: [
      { id: 'satellite', label: 'Satellite', icon: Map },
      { id: 'radar', label: 'Radar', icon: Radio },
    ]},
    { section: 'FORECAST MAPS', items: [
      { id: 'precipitation', label: 'Precipitation', icon: CloudRain },
      { id: 'wind', label: 'Wind', icon: Wind },
      { id: 'temperature', label: 'Temperature', icon: Thermometer },
      { id: 'humidity', label: 'Humidity', icon: Droplets },
      { id: 'pressure', label: 'Pressure', icon: Gauge },
    ]}
  ];

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden rounded-2xl border border-white/10 font-sans text-white shadow-xl">
      <div id="leaflet-map-root" className="absolute inset-0 z-0" />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-10 pointer-events-none opacity-90 mix-blend-screen"
      />

      {/* Left Sidebar (Zoom Earth Style) */}
      <div className="absolute top-4 left-4 z-20 w-56 max-h-[calc(100%-2rem)] bg-[#1a1c23]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-y-auto flex flex-col">
        <div className="p-4 flex items-center space-x-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
             <Eye size={16} className="text-white" />
          </div>
          <span className="font-bold text-base tracking-wide">MoES Earth</span>
        </div>
        
        <div className="py-2">
          {menuItems.map((group, idx) => (
            <div key={idx} className="mb-2">
              <div className="px-5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {group.section}
              </div>
              {group.items.map(item => {
                const isActive = activeLayer === item.id || 
                               (activeLayer === 'dbz' && item.id === 'radar') || 
                               (activeLayer === 'ir' && item.id === 'satellite');
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onLayerChange(item.id === 'radar' ? 'dbz' : item.id)}
                    className={`w-full flex items-center px-5 py-2.5 text-sm transition-all active:scale-[0.98] ${
                      isActive 
                        ? 'text-white border-l-2 border-blue-500 bg-white/5' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border-l-2 border-transparent'
                    }`}
                  >
                    <item.icon size={18} className={`mr-3 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Right Tool Controls & Model Info */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end space-y-3">
        <div className="flex flex-col space-y-2 bg-[#1a1c23]/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-xl">
           <button className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-transform"><Settings size={18}/></button>
           <button className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-transform"><Share2 size={18}/></button>
           <button className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-transform"><Target size={18}/></button>
        </div>
        <div className="flex bg-[#1a1c23]/90 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden text-xs font-bold shadow-xl">
           <div className="px-4 py-2 bg-white/10 text-white">ICON <span className="font-normal text-gray-400 ml-1">13 km</span></div>
           <div className="px-4 py-2 text-gray-500 hover:text-white cursor-pointer transition-colors">GFS <span className="font-normal opacity-50 ml-1">22 km</span></div>
        </div>
      </div>

            {/* Color Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col space-y-2 pointer-events-none">
        {activeLayer === 'temperature' && (
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-[#1a1c23]/80 px-2 py-1 rounded backdrop-blur inline-block w-max">Open-Meteo Temp: {omData?.temperature}°C</span>
            <div className="flex h-6 rounded-md overflow-hidden text-[10px] font-bold text-white shadow-xl border border-white/10">
              <div className="px-3 bg-red-600 flex items-center justify-center">50°</div>
              <div className="px-3 bg-red-500 flex items-center justify-center">40°</div>
              <div className="px-3 bg-orange-500 flex items-center justify-center">30°</div>
              <div className="px-3 bg-yellow-400 flex items-center justify-center text-black">20°</div>
            </div>
          </div>
        )}
        
        {activeLayer === 'humidity' && (
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-[#1a1c23]/80 px-2 py-1 rounded backdrop-blur inline-block w-max">Open-Meteo Humidity: {omData?.humidity}%</span>
            <div className="flex h-6 rounded-md overflow-hidden text-[10px] font-bold text-white shadow-xl border border-white/10">
              <div className="px-3 bg-emerald-600 flex items-center justify-center">100%</div>
              <div className="px-3 bg-emerald-400 flex items-center justify-center">75%</div>
              <div className="px-3 bg-green-300 flex items-center justify-center text-black">50%</div>
            </div>
          </div>
        )}

        {activeLayer === 'pressure' && (
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-[#1a1c23]/80 px-2 py-1 rounded backdrop-blur inline-block w-max">Open-Meteo Pressure: {omData?.pressure} hPa</span>
            <div className="flex h-6 rounded-md overflow-hidden text-[10px] font-bold text-white shadow-xl border border-white/10">
              <div className="px-3 bg-purple-600 flex items-center justify-center">High</div>
              <div className="px-3 bg-purple-400 flex items-center justify-center">Normal</div>
              <div className="px-3 bg-indigo-300 flex items-center justify-center text-black">Low</div>
            </div>
          </div>
        )}

        {activeLayer === 'wind' && (
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-[#1a1c23]/80 px-2 py-1 rounded backdrop-blur inline-block w-max">Open-Meteo Wind: {omData?.wind} km/h</span>
            <div className="flex h-6 rounded-md overflow-hidden text-[10px] font-bold text-white shadow-xl border border-white/10">
              <div className="px-3 bg-cyan-600 flex items-center justify-center">&gt;100</div>
              <div className="px-3 bg-cyan-400 flex items-center justify-center">50</div>
              <div className="px-3 bg-blue-300 flex items-center justify-center text-black">Calm</div>
            </div>
          </div>
        )}

        {(activeLayer === 'radar' || activeLayer === 'precipitation' || activeLayer === 'dbz' || activeLayer === 'hail') && (
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-[#1a1c23]/80 px-2 py-1 rounded backdrop-blur inline-block w-max">RainViewer Radar</span>
            <div className="flex h-6 rounded-md overflow-hidden text-[10px] font-bold text-white shadow-xl border border-white/10">
               <div className="px-3 bg-[#ff00ff] flex items-center justify-center">Severe</div>
               <div className="px-3 bg-[#ff0000] flex items-center justify-center">Heavy</div>
               <div className="px-3 bg-[#ffff00] flex items-center justify-center text-black">Mod</div>
               <div className="px-3 bg-[#00ff00] flex items-center justify-center text-black">Light</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .leaflet-control-container { display: none !important; }
        .leaflet-tooltip { background: transparent; border: none; box-shadow: none; font-family: sans-serif; }
      `}</style>
    </div>
  );
};
