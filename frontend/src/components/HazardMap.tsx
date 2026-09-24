import React, { useEffect, useRef, useState } from 'react';
import { Layers, Compass, Wind, Radio, Eye, AlertOctagon } from 'lucide-react';
import { DataProvenanceBadge } from './DataProvenanceBadge';

interface StormCell {
  cell_id: string;
  centroid_x: number;
  centroid_y: number;
  area_km2: number;
  peak_dbz: number;
  velocity_kmh: number;
  heading_deg: number;
  trajectory?: Array<{ lead_time_min: number; x: number; y: number }>;
  hazards?: {
    rain_rate_mmh: number;
    cloudburst_flag: boolean;
    posh_percent: number;
    downburst_gust_kmh: number;
    lightning_density: number;
  };
}

interface HazardMapProps {
  cells: StormCell[];
  dbzGrid: number[][];
  selectedCell: StormCell | null;
  onSelectCell: (cell: StormCell) => void;
  activeLayer: 'dbz' | 'wind' | 'ir' | 'hail' | 'cloudburst' | 'downburst' | 'lightning';
  onLayerChange: (layer: any) => void;
  leadTimeMin: number;
}

// Particle interface for ZoomEarth-style wind streamlines
interface WindParticle {
  x: number;
  y: number;
  speed: number;
  age: number;
  maxAge: number;
}

export const HazardMap: React.FC<HazardMapProps> = ({
  cells,
  dbzGrid,
  selectedCell,
  onSelectCell,
  activeLayer,
  onLayerChange,
  leadTimeMin
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<WindParticle[]>([]);
  const [showIsobars, setShowIsobars] = useState(true);

  // Initialize wind particles
  useEffect(() => {
    const particles: WindParticle[] = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * 800,
        y: Math.random() * 650,
        speed: 1.5 + Math.random() * 2.5,
        age: Math.random() * 100,
        maxAge: 80 + Math.random() * 60
      });
    }
    particlesRef.current = particles;
  }, []);

  const getDbzColor = (val: number): [number, number, number, number] => {
    if (activeLayer === 'cloudburst') {
      if (val >= 52.0) return [239, 68, 68, 240]; // Deep Red
      if (val >= 45.0) return [245, 158, 11, 180]; // Orange
      if (val >= 35.0) return [253, 224, 71, 110]; // Yellow
      return [0, 0, 0, 0];
    }
    if (activeLayer === 'hail') {
      if (val >= 55.0) return [168, 85, 247, 240]; // Extreme Purple
      if (val >= 48.0) return [236, 72, 153, 200]; // Pink
      if (val >= 40.0) return [56, 168, 255, 130]; // Blizzard Blue
      return [0, 0, 0, 0];
    }
    if (activeLayer === 'ir') {
      // Satellite 10.8µm Thermal Brightness Temp Colormap (Cold tops = bright cyan/white, warm = deep blue)
      if (val >= 55.0) return [255, 255, 255, 240]; // -70°C Overshooting Top
      if (val >= 45.0) return [56, 168, 255, 210];  // -55°C High Cirrus/Anvil
      if (val >= 35.0) return [24, 136, 239, 160];  // -40°C Freezing Core
      if (val >= 25.0) return [32, 39, 60, 110];    // Low clouds
      return [0, 0, 0, 0];
    }

    // Blizzard Weather Climate Radar Palette
    if (val < 15.0) return [0, 0, 0, 0];
    if (val < 25.0) return [56, 168, 255, 150];  // Blizzard Cyan-Blue
    if (val < 35.0) return [67, 197, 158, 180];  // Emerald Green
    if (val < 45.0) return [240, 180, 77, 210];  // Amber Yellow
    if (val < 55.0) return [249, 115, 22, 230];  // Vivid Orange
    if (val < 62.0) return [239, 90, 103, 250];  // Severe Danger Red
    return [168, 85, 247, 255];                  // Extreme Hail Core Purple
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dbzGrid || dbzGrid.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = dbzGrid.length;
    const cols = dbzGrid[0].length;
    const width = canvas.width;
    const height = canvas.height;

    // Create radar background raster bitmap
    const imgData = ctx.createImageData(cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = dbzGrid[r][c];
        const [red, green, blue, alpha] = getDbzColor(val);
        const idx = (r * cols + c) * 4;
        imgData.data[idx] = red;
        imgData.data[idx + 1] = green;
        imgData.data[idx + 2] = blue;
        imgData.data[idx + 3] = alpha;
      }
    }

    let radarBmp: ImageBitmap | null = null;
    createImageBitmap(imgData).then((bmp) => {
      radarBmp = bmp;
    });

    let running = true;

    // Render loop for 60 FPS wind streamlines & meteorological weather overlays
    const render = () => {
      if (!running) return;

      // 1. Blizzard Deep Midnight Navy base (#0a0d15)
      ctx.fillStyle = '#0a0d15';
      ctx.fillRect(0, 0, width, height);

      // 2. Weather Climate Map Gridlines (Blizzard style subtle borders)
      ctx.strokeStyle = 'rgba(208, 233, 255, 0.05)';
      ctx.lineWidth = 1;
      const step = width / 10;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Render Radar Reflectivity Bitmap
      if (radarBmp) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(radarBmp, 0, 0, width, height);
      }

      // 4. Meteorological Isobar Pressure Contours (Climate Map Style)
      if (showIsobars) {
        const centerX = width * 0.52;
        const centerY = height * 0.58;
        
        ctx.strokeStyle = 'rgba(56, 168, 255, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 6]);

        const isobars = [
          { r: width * 0.16, p: '1000 hPa [L]' },
          { r: width * 0.28, p: '1004 hPa' },
          { r: width * 0.42, p: '1008 hPa' },
          { r: width * 0.56, p: '1012 hPa' }
        ];

        isobars.forEach((iso) => {
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, iso.r, iso.r * 0.78, Math.PI / 8, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.fillStyle = 'rgba(208, 233, 255, 0.55)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(iso.p, centerX + iso.r * 0.85, centerY - 10);
        });
        ctx.setLineDash([]);
      }

      // 5. ZoomEarth-Style Animated Wind Streamlines
      if (activeLayer === 'wind' || activeLayer === 'dbz') {
        const primaryHeading = cells.length > 0 ? cells[0].heading_deg : 45;
        const rad = ((primaryHeading - 90) * Math.PI) / 180;
        const vx = Math.cos(rad);
        const vy = Math.sin(rad);

        ctx.lineWidth = 1.4;

        particlesRef.current.forEach((p) => {
          // Add cyclonic deflection near center
          const dx = p.x - width * 0.5;
          const dy = p.y - height * 0.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const curl = Math.max(0, 1 - dist / (width * 0.6)) * 0.8;

          const curVx = vx - dy * curl * 0.003;
          const curVy = vy + dx * curl * 0.003;

          const oldX = p.x;
          const oldY = p.y;

          p.x += curVx * p.speed;
          p.y += curVy * p.speed;
          p.age += 1;

          if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.age > p.maxAge) {
            p.x = Math.random() * width;
            p.y = Math.random() * height;
            p.age = 0;
          }

          const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.65;
          ctx.strokeStyle = `rgba(208, 233, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(oldX, oldY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
      }

      // 6. Range Rings in Blizzard Brand Blue (#38a8ff)
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.strokeStyle = 'rgba(56, 168, 255, 0.25)';
      ctx.lineWidth = 1.2;
      [width * 0.2, width * 0.35, width * 0.48].forEach((radius, i) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 168, 255, 0.8)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${(i + 1) * 50} km`, centerX + radius - 26, centerY - 6);
      });

      // 7. Storm Cells and Velocity Vectors
      cells.forEach((cell) => {
        const scaleX = width / 384;
        const scaleY = height / 384;
        const cx = cell.centroid_x * scaleX;
        const cy = cell.centroid_y * scaleY;
        const isSelected = selectedCell?.cell_id === cell.cell_id;

        // Trajectory Cone
        if (cell.trajectory && cell.trajectory.length > 0) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          cell.trajectory.forEach((pt) => {
            ctx.lineTo(pt.x * scaleX, pt.y * scaleY);
          });
          ctx.strokeStyle = isSelected ? '#38a8ff' : 'rgba(208, 233, 255, 0.35)';
          ctx.lineWidth = isSelected ? 2.5 : 1.2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Velocity Vector Arrow
        const rad = ((cell.heading_deg - 90) * Math.PI) / 180;
        const arrowLen = Math.min(65, cell.velocity_kmh * 0.9);
        const endX = cx + Math.cos(rad) * arrowLen;
        const endY = cy + Math.sin(rad) * arrowLen;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = isSelected ? '#38a8ff' : '#f0b44d';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Cell Core Marker with Blizzard Glow
        ctx.beginPath();
        ctx.arc(cx, cy, isSelected ? 9 : 6, 0, 2 * Math.PI);
        ctx.fillStyle = cell.peak_dbz >= 55 ? '#ef5a67' : '#f0b44d';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(cx, cy, 15, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(56, 168, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Cell Label with Badge Background
        ctx.fillStyle = isSelected ? '#38a8ff' : '#ffffff';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(cell.cell_id, cx + 12, cy - 6);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [dbzGrid, cells, selectedCell, activeLayer, leadTimeMin, showIsobars]);

  return (
    <div className="relative w-full h-full bg-[#131928] border border-white/[0.12] rounded-2xl overflow-hidden flex flex-col shadow-blizzard-card">
      {/* Top Station & Meteorological Header Pill */}
      <div className="absolute top-3 left-4 z-20 flex items-center space-x-2 bg-[#20273c]/90 backdrop-blur-md border border-white/[0.15] px-3.5 py-1.5 rounded-full shadow-lg">
        <Radio className="w-3.5 h-3.5 text-[#38a8ff] animate-pulse" />
        <span className="text-[11px] font-mono text-[#d0e9ff] font-semibold tracking-wide">
          DWR COMPOSITE · LAT 28.59°N LON 77.22°E · RANGE 250 KM · 1.0 km²
        </span>
        <div className="w-px h-3 bg-white/20" />
        <DataProvenanceBadge source={leadTimeMin === 0 ? 'LIVE' : 'PLANNED'} />
      </div>

      {/* Top-Right Meteorological Controls */}
      <div className="absolute top-3 right-4 z-20 flex items-center space-x-2">
        <button
          onClick={() => setShowIsobars(!showIsobars)}
          className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center space-x-1.5 border ${
            showIsobars
              ? 'bg-[#38a8ff]/20 text-[#38a8ff] border-[#38a8ff]/50 shadow-[0_0_12px_rgba(56,168,255,0.3)]'
              : 'bg-[#20273c]/80 text-white/60 border-white/10 hover:text-white'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Isobars (hPa)</span>
        </button>

        <div className="bg-[#20273c]/90 backdrop-blur-md border border-white/[0.15] px-3 py-1.5 rounded-full text-xs font-mono text-[#d0e9ff] flex items-center space-x-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#43c59e] animate-ping" />
          <span>{leadTimeMin === 0 ? 'T0 ANALYSIS' : `+${leadTimeMin}m NOWCAST`}</span>
        </div>
      </div>

      {/* Layer Switcher Bar (Blizzard Pill Buttons) */}
      <div className="absolute bottom-16 left-4 z-20 flex items-center space-x-2 bg-[#20273c]/90 backdrop-blur-md border border-white/[0.15] p-1.5 rounded-full shadow-2xl">
        <span className="text-[11px] font-sans font-bold text-white/60 uppercase tracking-wider pl-2.5 pr-1 flex items-center space-x-1">
          <Layers className="w-3.5 h-3.5 text-[#38a8ff]" />
          <span>Layer:</span>
        </span>

        {[
          { id: 'dbz', label: 'Radar (dBZ)' },
          { id: 'wind', label: 'Wind Flow', icon: Wind },
          { id: 'ir', label: 'Satellite IR', icon: Eye },
          { id: 'hail', label: 'Hail (POSH)' },
          { id: 'cloudburst', label: 'Cloudburst >100mm/h' },
          { id: 'downburst', label: 'Downburst' },
          { id: 'lightning', label: 'Lightning' }
        ].map((layer) => (
          <button
            key={layer.id}
            onClick={() => onLayerChange(layer.id)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-display font-medium transition-all ${
              activeLayer === layer.id
                ? 'pill-blizzard-active'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 w-full h-full relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={800}
          height={650}
          className="w-full h-full object-contain"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 384;
            const clickY = ((e.clientY - rect.top) / rect.height) * 384;
            
            let closest = null;
            let minDist = 30;
            cells.forEach((c) => {
              const d = Math.hypot(c.centroid_x - clickX, c.centroid_y - clickY);
              if (d < minDist) {
                minDist = d;
                closest = c;
              }
            });
            if (closest) onSelectCell(closest);
          }}
        />
      </div>

      {/* Bottom Meteorological Climate Ramp & Legend */}
      <div className="bg-[#0a0d15]/90 border-t border-white/[0.12] px-5 py-2.5 flex items-center justify-between text-xs z-20 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-white/70 text-[11px]">
            {activeLayer === 'ir' ? 'Cloud Top Temp (°C):' : 'Precipitation Intensity (dBZ):'}
          </span>
          <div className="flex items-center h-3 rounded-full overflow-hidden border border-white/20 shadow-inner">
            <span className="w-8 h-full bg-[#38a8ff]" title="15-25 dBZ (Light rain)" />
            <span className="w-8 h-full bg-[#43c59e]" title="25-35 dBZ (Moderate)" />
            <span className="w-8 h-full bg-[#f0b44d]" title="35-45 dBZ (Heavy)" />
            <span className="w-8 h-full bg-[#f97316]" title="45-55 dBZ (Intense)" />
            <span className="w-8 h-full bg-[#ef5a67]" title="55-62 dBZ (Severe hail)" />
            <span className="w-8 h-full bg-[#a855f7]" title="62+ dBZ (Cloudburst core)" />
          </div>
          <span className="text-[10px] text-[#d0e9ff] font-mono">15 dBZ (5 mm/h) → 70+ dBZ (120+ mm/h)</span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-white/70">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef5a67] inline-block shadow-[0_0_8px_#ef5a67]" />
            <span>Severe Core (≥55 dBZ)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 bg-[#f0b44d] inline-block" />
            <span>Storm Advection Track</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-[#38a8ff] inline-block" />
            <span>Isobar Gradient (hPa)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
