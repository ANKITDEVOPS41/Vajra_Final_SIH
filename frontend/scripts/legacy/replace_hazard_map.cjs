const fs = require('fs');

const path = '/Users/gauravkumarnayak/Desktop/new sih/convectnow/frontend/src/components/HazardMap.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add states
content = content.replace(
  "const tileLayerRef = useRef<L.TileLayer | null>(null);",
  "const tileLayerRef = useRef<L.TileLayer | null>(null);\n  const radarLayerRef = useRef<L.TileLayer | null>(null);\n\n  const [radarPath, setRadarPath] = useState<string | null>(null);\n  const [omData, setOmData] = useState<any>(null);"
);

// Add useEffect for fetching APIs
const fetchEffect = `
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

    fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${STORM_CENTER.lat}&longitude=\${STORM_CENTER.lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m\`)
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
`;

content = content.replace(
  "const STORM_CENTER = { lat: 17.8, lng: 83.2 };\n\n  useEffect(() => {",
  "const STORM_CENTER = { lat: 17.8, lng: 83.2 };\n\n" + fetchEffect + "\n  useEffect(() => {"
);

// Add radar layer
content = content.replace(
  "className: 'map-tiles-blue-tint'\n      }).addTo(map);",
  "className: 'map-tiles-blue-tint'\n      }).addTo(map);\n\n      radarLayerRef.current = L.tileLayer('', {\n        opacity: 0.65,\n        zIndex: 10\n      }).addTo(map);"
);

// Update active layer logic
content = content.replace(
  "tileLayerRef.current.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}');\n      }\n    }",
  "tileLayerRef.current.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}');\n      }\n    }\n\n    if (radarLayerRef.current) {\n      if (radarPath && (activeLayer === 'radar' || activeLayer === 'precipitation' || activeLayer === 'dbz')) {\n        radarLayerRef.current.setUrl(`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_1.png`);\n      } else {\n        radarLayerRef.current.setUrl('');\n      }\n    }"
);

// Add pressure and humidity gradients
const additionalCanvas = `
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
`;

content = content.replace(
  "ctx.fillRect(0, 0, canvas.width, canvas.height);\n      }\n\n      if (activeLayer === 'dbz'",
  "ctx.fillRect(0, 0, canvas.width, canvas.height);\n" + additionalCanvas + "\n      if (activeLayer === 'dbz'"
);

// Wind particle opacity fix for other layers, let's keep particles for wind
content = content.replace(
  "if (activeLayer === 'wind' || activeLayer === 'dbz' || activeLayer === 'precipitation' || activeLayer === 'radar') {",
  "if (activeLayer === 'wind') {"
);

// Update Legends
const legendJSX = `      {/* Color Legend (Bottom Left) */}
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
      </div>`;

content = content.replace(
  /\{\/\* Color Legend \(Bottom Left\) \*\/\}[\s\S]*?(?=<style>)/,
  legendJSX + '\n\n      '
);

fs.writeFileSync(path, content);
console.log('Done!');
