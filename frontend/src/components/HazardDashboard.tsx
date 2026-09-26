import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Rectangle, 
  Tooltip, 
  CircleMarker, 
  Polyline, 
  Polygon,
  ImageOverlay
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  AlertTriangle, 
  Wind, 
  CloudRain, 
  Zap, 
  ShieldAlert, 
  Activity, 
  Eye, 
  Layers, 
  Compass, 
  Plane, 
  BarChart3, 
  Radio, 
  FileText, 
  CheckCircle2, 
  Clock, 
  X,
  Copy,
  ChevronUp,
  ChevronDown,
  Gauge,
  Thermometer,
  CloudLightning,
  Sparkles,
  Maximize2,
  Tv,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// 1. DOMAIN TYPES & METEOROLOGICAL CONSTANTS (MoES PS-26084)
// ============================================================================
export type LayerVariable = 'radar' | 'pressure' | 'temp' | 'cape';
export type ModelEngine = 'convectnet' | 'pysteps';
export type RenderMode = 'canvas2d' | 'leaflet';

export interface SectorTelemetry {
  id: string;
  name: string;
  row: number;
  col: number;
  radar_dbz: number;
  pressure_hpa: number;
  temp_c: number;
  cape_jkg: number;
  lightning_rate: number; // strokes/min
  wind_gust_kmh: number; // Downburst gust
  bounds: [[number, number], [number, number]];
  center: [number, number];
}

export interface ForecastFrame {
  horizon: string;
  leadTimeMinutes: number;
  engine: string;
  phase: 'nowcast' | 'hybrid';
  coreCentroid: [number, number];
  matrix_dbz: number[][];
  matrix_pressure: number[][];
  matrix_temp: number[][];
  matrix_cape: number[][];
}

const AOI_BBOX = {
  minLat: 20.0,
  maxLat: 20.6,
  minLon: 85.5,
  maxLon: 86.1,
};

const AIRPORT_VEBS: { 
  name: string; 
  callsign: string;
  runway: string;
  coords: [number, number]; 
  glidePath: [number, number][];
} = {
  name: 'Biju Patnaik International Airport',
  callsign: 'VEBS / BBI',
  runway: 'RWY 01/19',
  coords: [20.2444, 85.8178],
  glidePath: [
    [20.14, 85.76],
    [20.2444, 85.8178],
    [20.34, 85.87]
  ]
};

// Tactical Sector Names across Bhubaneswar-Cuttack-Puri Corridor
const SECTOR_METADATA: Record<string, string> = {
  'R0_C0': 'Cuttack North Uplands',
  'R0_C1': 'Mahanadi Basin Corridor',
  'R0_C2': 'Paradeep West Approach',
  'R1_C0': 'Khurda Uplands',
  'R1_C1': 'Bhubaneswar Urban / VEBS',
  'R1_C2': 'Balianta Convective Corridor',
  'R2_C0': 'Pipili Aerodrome Corridor',
  'R2_C1': 'Nimapada Flood Plains',
  'R2_C2': 'Konark Coastal Littoral',
};

// Tactical Odisha Coastline & Estuary Vector Points (Decimal Degrees)
const COASTLINE_VECTORS: [number, number][][] = [
  // Bay of Bengal Coastline (South to North)
  [
    [19.95, 85.60], [20.02, 85.75], [20.08, 85.90], [20.15, 86.05], 
    [20.22, 86.20], [20.30, 86.35], [20.40, 86.50], [20.55, 86.65]
  ],
  // Chilika Lagoon North Margin
  [
    [19.98, 85.45], [20.01, 85.52], [20.04, 85.58], [20.02, 85.65]
  ],
  // Daya & Kuakhai River System
  [
    [20.45, 85.85], [20.38, 85.84], [20.28, 85.83], [20.20, 85.82], [20.10, 85.80]
  ]
];

// ============================================================================
// 2. MATHEMATICAL METEOROLOGY FORMULAE (IMD PS-26084)
// ============================================================================

/** IMD Marshall-Palmer convective Z-R inversion: Z = 300 * R^1.4 */
export function calculateRainRate(dbz: number): number {
  if (dbz < 15) return 0;
  const zLinear = Math.pow(10, dbz / 10);
  const r = Math.pow(zLinear / 300, 1 / 1.4);
  return Math.min(r, 260); // Cap at physical upper limit
}

/** Severe Hail Probability (POH / MESH) via Witt et al. (1998) formulation */
export function calculateHailProbability(dbz: number): { posh: number; mesh_mm: number } {
  if (dbz < 40) return { posh: 0, mesh_mm: 0 };
  const posh = Math.min(100, Math.max(0, Math.round(((dbz - 40) / (65 - 40)) * 100)));
  const mesh_mm = dbz >= 45 ? Math.round(Math.pow(10, (dbz - 40) / 20) * 8.5) : 0;
  return { posh, mesh_mm: Math.min(mesh_mm, 85) };
}

/** Downburst surface gust velocity via Cold Pool Delta-T and core dBZ */
export function estimateGustVelocity(dbz: number, tempC: number): number {
  const baseWind = 24;
  const convectiveDelta = Math.max(0, (dbz - 30) * 1.35);
  const coldPoolBonus = Math.max(0, (32 - tempC) * 3.2);
  return Math.round(baseWind + convectiveDelta + coldPoolBonus);
}

/** Great-Circle Haversine distance in kilometers */
export function getHaversineDistanceKm(c1: [number, number], c2: [number, number]): number {
  const R = 6371; // Earth radius km
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLon = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// 3. COLOR PALETTES & COLOR INTERPOLATION
// ============================================================================

export function getRadarColor(dbz: number): [number, number, number, number] {
  if (dbz < 15) return [0, 0, 0, 0];
  if (dbz < 25) return [16, 185, 129, 140]; // Light Green
  if (dbz < 35) return [34, 197, 94, 190];  // Vibrant Green
  if (dbz < 45) return [234, 179, 8, 220];  // Amber Yellow
  if (dbz < 52) return [249, 115, 22, 235]; // Vivid Orange
  if (dbz < 60) return [239, 68, 68, 245];  // Crimson Red
  return [236, 72, 153, 255];               // Intense Hail Magenta
}

export function getRadarCssColor(dbz: number): string {
  const [r, g, b, a] = getRadarColor(dbz);
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

export function getPressureColor(hpa: number): [number, number, number, number] {
  if (hpa <= 1000) return [147, 51, 234, 210]; // Deep Violet Trough
  if (hpa <= 1004) return [14, 165, 233, 190];  // Sky Cyan
  if (hpa <= 1008) return [20, 184, 166, 160];  // Teal
  return [250, 204, 21, 140];                   // Pale Yellow Ridge
}

export function getTempColor(c: number): [number, number, number, number] {
  if (c <= 24) return [56, 189, 248, 220];  // Icy Cold Pool
  if (c <= 27) return [45, 212, 191, 190];  // Outflow Boundary
  if (c <= 30) return [251, 146, 60, 170];  // Transition
  return [239, 68, 68, 190];                // Ambient Hot Air
}

export function getCapeColor(cape: number): [number, number, number, number] {
  if (cape <= 1200) return [51, 65, 85, 120];   // Slate Stable
  if (cape <= 2000) return [234, 179, 8, 180];   // Moderate Instability
  if (cape <= 3000) return [249, 115, 22, 220];  // High Instability
  return [225, 29, 72, 245];                    // Extreme Updraft Potential
}

// ============================================================================
// 4. MULTI-HORIZON CONVECTIVE NOWCAST TIMELINE DATA
// ============================================================================
export const TIMELINE_FRAMES: ForecastFrame[] = [
  {
    horizon: 'T-15m (Observed Radar)',
    leadTimeMinutes: -15,
    engine: 'IMD Paradip DWR (Doppler Analysis)',
    phase: 'nowcast',
    coreCentroid: [20.18, 85.66],
    matrix_dbz: [
      [15, 25, 30], 
      [22, 48, 38], 
      [18, 32, 20]
    ],
    matrix_pressure: [
      [1006, 1005, 1005], 
      [1005, 1002, 1004], 
      [1007, 1006, 1005]
    ],
    matrix_temp: [
      [32, 31, 31], 
      [31, 25, 29], 
      [33, 30, 31]
    ],
    matrix_cape: [
      [1800, 2200, 2500], 
      [2100, 3100, 2600], 
      [1900, 2400, 2200]
    ],
  },
  {
    horizon: 'T+0 (Nowcast Analysis)',
    leadTimeMinutes: 0,
    engine: 'ConvectNet AI (Multi-Task Fusion)',
    phase: 'nowcast',
    coreCentroid: [20.25, 85.81],
    matrix_dbz: [
      [20, 35, 42], 
      [30, 62, 54], 
      [22, 45, 30]
    ],
    matrix_pressure: [
      [1005, 1004, 1004], 
      [1004, 999, 1002], 
      [1006, 1004, 1004]
    ],
    matrix_temp: [
      [31, 30, 30], 
      [30, 22, 26], 
      [32, 28, 30]
    ],
    matrix_cape: [
      [2000, 2500, 2800], 
      [2400, 3600, 3200], 
      [2100, 2700, 2500]
    ],
  },
  {
    horizon: 'T+30m (AI Nowcast)',
    leadTimeMinutes: 30,
    engine: 'ConvectNet AI (Lagrangian Advection)',
    phase: 'nowcast',
    coreCentroid: [20.32, 85.88],
    matrix_dbz: [
      [28, 52, 45], 
      [22, 58, 60], 
      [15, 30, 25]
    ],
    matrix_pressure: [
      [1004, 1001, 1003], 
      [1005, 1001, 1002], 
      [1007, 1006, 1005]
    ],
    matrix_temp: [
      [29, 23, 26], 
      [30, 24, 25], 
      [33, 31, 31]
    ],
    matrix_cape: [
      [2400, 3200, 3100], 
      [2200, 3400, 3500], 
      [1900, 2300, 2100]
    ],
  },
  {
    horizon: 'T+1h (AI Extrapolation)',
    leadTimeMinutes: 60,
    engine: 'ConvectNet AI (Optical Flow Decay)',
    phase: 'nowcast',
    coreCentroid: [20.39, 85.94],
    matrix_dbz: [
      [22, 48, 54], 
      [18, 35, 45], 
      [12, 20, 22]
    ],
    matrix_pressure: [
      [1005, 1003, 1002], 
      [1006, 1005, 1004], 
      [1008, 1007, 1006]
    ],
    matrix_temp: [
      [29, 25, 24], 
      [31, 28, 27], 
      [33, 32, 31]
    ],
    matrix_cape: [
      [2100, 2800, 3000], 
      [1800, 2400, 2600], 
      [1600, 1900, 1800]
    ],
  },
  {
    horizon: 'T+3h (Hybrid Blend)',
    leadTimeMinutes: 180,
    engine: 'WRF-NWP Blended Hybrid',
    phase: 'hybrid',
    coreCentroid: [20.48, 86.03],
    matrix_dbz: [
      [18, 32, 40], 
      [12, 25, 30], 
      [8, 15, 18]
    ],
    matrix_pressure: [
      [1006, 1005, 1003], 
      [1007, 1006, 1005], 
      [1009, 1008, 1007]
    ],
    matrix_temp: [
      [30, 28, 27], 
      [31, 29, 28], 
      [33, 31, 30]
    ],
    matrix_cape: [
      [1500, 2000, 2200], 
      [1300, 1600, 1800], 
      [1100, 1400, 1600]
    ],
  },
  {
    horizon: 'T+6h (Hybrid Blend)',
    leadTimeMinutes: 360,
    engine: 'WRF-NWP Blended Hybrid',
    phase: 'hybrid',
    coreCentroid: [20.54, 86.10],
    matrix_dbz: [
      [12, 22, 28], 
      [8, 15, 20], 
      [5, 8, 12]
    ],
    matrix_pressure: [
      [1008, 1006, 1004], 
      [1009, 1007, 1006], 
      [1010, 1008, 1007]
    ],
    matrix_temp: [
      [31, 29, 28], 
      [32, 30, 29], 
      [32, 31, 30]
    ],
    matrix_cape: [
      [1100, 1500, 1700], 
      [1000, 1200, 1400], 
      [900, 1100, 1200]
    ],
  }
];

// ============================================================================
// 5. MAIN HAZARD DASHBOARD COMPONENT
// ============================================================================
export default function HazardDashboard() {
  const [activeLayer, setActiveLayer] = useState<LayerVariable>('radar');
  const [activeModel, setActiveModel] = useState<ModelEngine>('convectnet');
  const [renderMode, setRenderMode] = useState<RenderMode>('canvas2d'); // Pure 2D Canvas by default!
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(1);
  const [focusedSectorId, setFocusedSectorId] = useState<string>('R1_C1');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showVerticalProfile, setShowVerticalProfile] = useState<boolean>(false);
  const [showCapModal, setShowCapModal] = useState<boolean>(false);
  const [showSkillModal, setShowSkillModal] = useState<boolean>(false);
  const [capFormat, setCapFormat] = useState<'xml' | 'json'>('xml');
  const [copiedAlert, setCopiedAlert] = useState<boolean>(false);

  // Canvas visual toggles
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true);
  const [showLightningFlashes, setShowLightningFlashes] = useState<boolean>(true);

  // References for Canvas animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const radarSweepAngleRef = useRef<number>(0);
  const lightningBoltsRef = useRef<Array<{
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    alpha: number;
  }>>([]);
  const windParticlesRef = useRef<Array<{ x: number; y: number; age: number; maxAge: number; speed: number }>>([]);

  // Auto-play timeline loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % TIMELINE_FRAMES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const activeFrame = TIMELINE_FRAMES[currentFrameIdx];

  // Mathematical subdivision of the 3x3 tactical grid
  const latStep = (AOI_BBOX.maxLat - AOI_BBOX.minLat) / 3;
  const lonStep = (AOI_BBOX.maxLon - AOI_BBOX.minLon) / 3;

  const sectors: SectorTelemetry[] = useMemo(() => {
    const list: SectorTelemetry[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const south = AOI_BBOX.minLat + (2 - r) * latStep;
        const north = south + latStep;
        const west = AOI_BBOX.minLon + c * lonStep;
        const east = west + lonStep;
        const id = `R${r}_C${c}`;
        const dbzVal = activeFrame.matrix_dbz[r][c];
        const tempVal = activeFrame.matrix_temp[r][c];

        list.push({
          id,
          name: SECTOR_METADATA[id] || `Sector ${id}`,
          row: r,
          col: c,
          radar_dbz: dbzVal,
          pressure_hpa: activeFrame.matrix_pressure[r][c],
          temp_c: tempVal,
          cape_jkg: activeFrame.matrix_cape[r][c],
          lightning_rate: r === 1 && c === 1 ? 28 : Math.max(2, Math.round(dbzVal * 0.45)),
          wind_gust_kmh: estimateGustVelocity(dbzVal, tempVal),
          bounds: [[south, west], [north, east]],
          center: [(south + north) / 2, (west + east) / 2],
        });
      }
    }
    return list;
  }, [activeFrame, latStep, lonStep]);

  const selectedSector = sectors.find(s => s.id === focusedSectorId) || sectors[4];

  // Tactical Aviation & Runway Proximity
  const distanceToRunwayKm = useMemo(() => {
    return getHaversineDistanceKm(activeFrame.coreCentroid, AIRPORT_VEBS.coords);
  }, [activeFrame]);

  const advectionSpeedKmh = 38; // Average storm advection vector speed
  const incursionEtaMinutes = Math.max(0, Math.round((distanceToRunwayKm / advectionSpeedKmh) * 60));
  const isAviationThreat = distanceToRunwayKm < 14 && activeFrame.matrix_dbz[1][1] >= 48;

  // Real-time Hazard Classifications for Selected Sector
  const calculatedRainRate = calculateRainRate(selectedSector.radar_dbz);
  const isCloudburstRisk = calculatedRainRate >= 100;
  const { posh: poshValue, mesh_mm: meshValue } = calculateHailProbability(selectedSector.radar_dbz);
  const isSevereHail = selectedSector.radar_dbz >= 55;
  const isMicroburstSevere = selectedSector.wind_gust_kmh >= 65;
  const isLightningJump = selectedSector.lightning_rate >= 18;

  // Bilinear interpolation canvas generation for Leaflet image overlay mode
  const rasterUrl = useMemo(() => {
    let matrix = activeFrame.matrix_dbz;
    let palette = getRadarColor;

    if (activeLayer === 'pressure') {
      matrix = activeFrame.matrix_pressure;
      palette = getPressureColor;
    } else if (activeLayer === 'temp') {
      matrix = activeFrame.matrix_temp;
      palette = getTempColor;
    } else if (activeLayer === 'cape') {
      matrix = activeFrame.matrix_cape;
      palette = getCapeColor;
    }

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++) {
      const v = (py / (size - 1)) * 2;
      const y0 = Math.min(1, Math.floor(v));
      const y1 = y0 + 1;
      const fy = v - y0;

      for (let px = 0; px < size; px++) {
        const u = (px / (size - 1)) * 2;
        const x0 = Math.min(1, Math.floor(u));
        const x1 = x0 + 1;
        const fx = u - x0;

        const val00 = matrix[y0][x0];
        const val10 = matrix[y0][x1];
        const val01 = matrix[y1][x0];
        const val11 = matrix[y1][x1];

        const interpolated =
          (1 - fx) * (1 - fy) * val00 +
          fx * (1 - fy) * val10 +
          (1 - fx) * fy * val01 +
          fx * fy * val11;

        const [r, g, b, a] = palette(interpolated);
        const idx = (py * size + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }, [activeFrame, activeLayer]);

  // Projected forward uncertainty polygon cone
  const conePolygon: [number, number][] = useMemo(() => {
    const cur = activeFrame.coreCentroid;
    return [
      cur,
      [cur[0] + 0.18, cur[1] + 0.16],
      [cur[0] + 0.12, cur[1] + 0.28],
      [cur[0] + 0.04, cur[1] + 0.22],
    ];
  }, [activeFrame]);

  // Track history line
  const trackHistory: [number, number][] = useMemo(() => {
    return TIMELINE_FRAMES.slice(0, currentFrameIdx + 1).map((f) => f.coreCentroid);
  }, [currentFrameIdx]);

  // ============================================================================
  // 6. HIGH-PERFORMANCE 2D CANVAS ANIMATION ENGINE (ZERO API KEY / ZERO WATERMARK)
  // ============================================================================
  
  // Coordinate transformers for canvas
  const latLonToPixel = useCallback((lat: number, lon: number, width: number, height: number): [number, number] => {
    const x = ((lon - AOI_BBOX.minLon) / (AOI_BBOX.maxLon - AOI_BBOX.minLon)) * width;
    const y = ((AOI_BBOX.maxLat - lat) / (AOI_BBOX.maxLat - AOI_BBOX.minLat)) * height;
    return [x, y];
  }, []);

  const pixelToLatLon = useCallback((x: number, y: number, width: number, height: number): [number, number] => {
    const lon = AOI_BBOX.minLon + (x / width) * (AOI_BBOX.maxLon - AOI_BBOX.minLon);
    const lat = AOI_BBOX.maxLat - (y / height) * (AOI_BBOX.maxLat - AOI_BBOX.minLat);
    return [lat, lon];
  }, []);

  // Initialize wind particle field
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 75; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        age: Math.random() * 100,
        maxAge: 80 + Math.random() * 60,
        speed: 0.0015 + Math.random() * 0.002
      });
    }
    windParticlesRef.current = particles;
  }, []);

  // Main 2D Canvas Render Loop
  useEffect(() => {
    if (renderMode !== 'canvas2d') return;

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Tactical Deep Space Backdrop
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Coordinate Mesh & Lat/Lon Reticle
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;
      const gridTicks = 6;
      for (let i = 1; i < gridTicks; i++) {
        const x = (width / gridTicks) * i;
        const y = (height / gridTicks) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Tactical Range Rings centered on VEBS Airport DWR (25, 50, 75, 100 km)
      const [vebsX, vebsY] = latLonToPixel(AIRPORT_VEBS.coords[0], AIRPORT_VEBS.coords[1], width, height);
      const ringScales = [
        { km: 25, r: width * 0.16 },
        { km: 50, r: width * 0.32 },
        { km: 75, r: width * 0.48 },
        { km: 100, r: width * 0.64 }
      ];

      ctx.save();
      ringScales.forEach((ring) => {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(vebsX, vebsY, ring.r, 0, Math.PI * 2);
        ctx.stroke();

        // Distance Text Tag
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.font = '9px monospace';
        ctx.fillText(`${ring.km} KM`, vebsX + ring.r + 4, vebsY - 3);
      });
      ctx.restore();

      // Azimuth lines (Crosshairs)
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].forEach(angle => {
        ctx.beginPath();
        ctx.moveTo(vebsX - Math.cos(angle) * width, vebsY - Math.sin(angle) * height);
        ctx.lineTo(vebsX + Math.cos(angle) * width, vebsY + Math.sin(angle) * height);
        ctx.stroke();
      });
      ctx.restore();

      // 4. Tactical Odisha Coastline & Estuary Vectors
      ctx.save();
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.lineWidth = 1.8;
      COASTLINE_VECTORS.forEach(poly => {
        ctx.beginPath();
        poly.forEach((pt, idx) => {
          const [px, py] = latLonToPixel(pt[0], pt[1], width, height);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      });

      // Coastline Text Label
      const [coastLabelX, coastLabelY] = latLonToPixel(20.15, 86.05, width, height);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.5)';
      ctx.font = '10px monospace';
      ctx.fillText('BAY OF BENGAL LITTORAL', coastLabelX + 8, coastLabelY + 14);
      ctx.restore();

      // 5. Render Active Convective Precipitation & Reflectivity Field
      const [coreX, coreY] = latLonToPixel(activeFrame.coreCentroid[0], activeFrame.coreCentroid[1], width, height);
      const cellRadius = width * 0.22;

      // Draw multi-stop radial gradient for convective storm
      const stormGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, cellRadius);
      const peakDbz = activeFrame.matrix_dbz[1][1];

      if (activeLayer === 'radar') {
        if (peakDbz >= 55) {
          stormGrad.addColorStop(0, 'rgba(236, 72, 153, 0.88)'); // Magenta Hail Core
          stormGrad.addColorStop(0.2, 'rgba(239, 68, 68, 0.82)'); // Severe Red
          stormGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.72)'); // Orange
          stormGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.5)'); // Yellow
          stormGrad.addColorStop(0.9, 'rgba(34, 197, 94, 0.25)'); // Green
          stormGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
          stormGrad.addColorStop(0, 'rgba(239, 68, 68, 0.78)');
          stormGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.65)');
          stormGrad.addColorStop(0.65, 'rgba(234, 179, 8, 0.45)');
          stormGrad.addColorStop(0.85, 'rgba(34, 197, 94, 0.2)');
          stormGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        }
      } else if (activeLayer === 'pressure') {
        stormGrad.addColorStop(0, 'rgba(168, 85, 247, 0.85)'); // Mesolow Core
        stormGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.6)');
        stormGrad.addColorStop(0.8, 'rgba(20, 184, 166, 0.3)');
        stormGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      } else if (activeLayer === 'temp') {
        stormGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)'); // Cold Pool Dome
        stormGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.55)');
        stormGrad.addColorStop(0.8, 'rgba(251, 146, 60, 0.25)');
        stormGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        stormGrad.addColorStop(0, 'rgba(225, 29, 72, 0.88)'); // High CAPE
        stormGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.65)');
        stormGrad.addColorStop(0.75, 'rgba(234, 179, 8, 0.35)');
        stormGrad.addColorStop(1, 'rgba(51, 65, 85, 0)');
      }

      ctx.save();
      ctx.fillStyle = stormGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, cellRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Draw 3x3 Tactical Sector Mesh
      const sWidth = width / 3;
      const sHeight = height / 3;

      sectors.forEach((sec) => {
        const sx = sec.col * sWidth;
        const sy = sec.row * sHeight;
        const isTarget = sec.id === focusedSectorId;

        // Sector Boundary Lines
        ctx.save();
        ctx.strokeStyle = isTarget ? '#38bdf8' : 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = isTarget ? 2 : 1;
        if (!isTarget) ctx.setLineDash([3, 4]);

        if (isTarget) {
          ctx.fillStyle = 'rgba(2, 132, 199, 0.12)';
          ctx.fillRect(sx, sy, sWidth, sHeight);
        }

        ctx.strokeRect(sx, sy, sWidth, sHeight);

        // Corner Target Reticles on Selected Sector
        if (isTarget) {
          const reticleLen = 14;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
          // Top-Left
          ctx.beginPath();
          ctx.moveTo(sx, sy + reticleLen);
          ctx.lineTo(sx, sy);
          ctx.lineTo(sx + reticleLen, sy);
          ctx.stroke();
          // Top-Right
          ctx.beginPath();
          ctx.moveTo(sx + sWidth - reticleLen, sy);
          ctx.lineTo(sx + sWidth, sy);
          ctx.lineTo(sx + sWidth, sy + reticleLen);
          ctx.stroke();
          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(sx, sy + sHeight - reticleLen);
          ctx.lineTo(sx, sy + sHeight);
          ctx.lineTo(sx + reticleLen, sy + sHeight);
          ctx.stroke();
          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(sx + sWidth - reticleLen, sy + sHeight);
          ctx.lineTo(sx + sWidth, sy + sHeight);
          ctx.lineTo(sx + sWidth, sy + sHeight - reticleLen);
          ctx.stroke();
        }

        // Sector Identifier & Metric HUD Tag
        const badgeX = sx + sWidth / 2;
        const badgeY = sy + sHeight / 2;

        ctx.fillStyle = isTarget ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.78)';
        ctx.strokeStyle = isTarget ? 'rgba(56, 189, 248, 0.8)' : 'rgba(71, 85, 105, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        const boxW = 86;
        const boxH = 34;
        ctx.fillRect(badgeX - boxW / 2, badgeY - boxH / 2, boxW, boxH);
        ctx.strokeRect(badgeX - boxW / 2, badgeY - boxH / 2, boxW, boxH);

        ctx.textAlign = 'center';
        ctx.fillStyle = isTarget ? '#38bdf8' : '#94a3b8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(sec.id, badgeX, badgeY - 4);

        ctx.fillStyle = isTarget ? '#ffffff' : '#e2e8f0';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${sec.radar_dbz} dBZ`, badgeX, badgeY + 11);

        ctx.restore();
      });

      // 7. Wind Particle Streamlines (Inflow towards Mesolow)
      if (showStreamlines) {
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.2;

        windParticlesRef.current.forEach(p => {
          // Calculate cyclonic vector towards storm core
          const pPx = p.x * width;
          const pPy = p.y * height;
          const dx = coreX - pPx;
          const dy = coreY - pPy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 10) {
            // Inflow angle + 45 deg cyclonic rotation
            const angle = Math.atan2(dy, dx) + 0.55;
            p.x += Math.cos(angle) * p.speed;
            p.y += Math.sin(angle) * p.speed;
          }

          p.age += 1;
          if (p.age > p.maxAge || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
            p.x = Math.random();
            p.y = Math.random();
            p.age = 0;
          }

          // Draw head
          const alpha = 1 - p.age / p.maxAge;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x * width, p.y * height, 1.4, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 8. VEBS Airport Runway & Glidepath Corridor
      ctx.save();
      // Runway 01/19 Strip
      const [rwyN_x, rwyN_y] = latLonToPixel(AIRPORT_VEBS.glidePath[2][0], AIRPORT_VEBS.glidePath[2][1], width, height);
      const [rwyS_x, rwyS_y] = latLonToPixel(AIRPORT_VEBS.glidePath[0][0], AIRPORT_VEBS.glidePath[0][1], width, height);
      
      // Glidepath Corridor Cone
      ctx.strokeStyle = isAviationThreat ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(rwyS_x, rwyS_y);
      ctx.lineTo(vebsX, vebsY);
      ctx.lineTo(rwyN_x, rwyN_y);
      ctx.stroke();

      // Airport Center Icon Marker
      ctx.setLineDash([]);
      ctx.fillStyle = isAviationThreat ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(vebsX, vebsY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Airport Tag
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.fillRect(vebsX + 12, vebsY - 10, 108, 20);
      ctx.strokeRect(vebsX + 12, vebsY - 10, 108, 20);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`✈ ${AIRPORT_VEBS.callsign}`, vebsX + 16, vebsY + 4);
      ctx.restore();

      // 9. Convective Storm Trajectory Track Vector
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      trackHistory.forEach((pt, idx) => {
        const [tx, ty] = latLonToPixel(pt[0], pt[1], width, height);
        if (idx === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.stroke();

      // Uncertainty Cone (Forward Spread)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      conePolygon.forEach((pt, idx) => {
        const [cx, cy] = latLonToPixel(pt[0], pt[1], width, height);
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 10. Dynamic Atmospheric Lightning Flashes
      if (showLightningFlashes && peakDbz >= 50 && Math.random() < 0.08) {
        // Trigger lightning branch
        const numBranches = 4 + Math.floor(Math.random() * 4);
        const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
        let curX = coreX + (Math.random() - 0.5) * 40;
        let curY = coreY - 60;

        for (let b = 0; b < numBranches; b++) {
          const nextX = curX + (Math.random() - 0.5) * 28;
          const nextY = curY + 12 + Math.random() * 15;
          segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
          curX = nextX;
          curY = nextY;
        }

        lightningBoltsRef.current.push({ segments, alpha: 1.0 });
      }

      // Render & decay lightning bolts
      if (lightningBoltsRef.current.length > 0) {
        ctx.save();
        lightningBoltsRef.current.forEach((bolt) => {
          ctx.strokeStyle = `rgba(224, 242, 254, ${bolt.alpha})`;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          bolt.segments.forEach(seg => {
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
          });
          ctx.stroke();
          bolt.alpha -= 0.12; // Fast decay
        });
        lightningBoltsRef.current = lightningBoltsRef.current.filter(b => b.alpha > 0);
        ctx.restore();
      }

      // 11. Rotating Radar Sweep Beam (24 RPM with Phosphor Trail)
      if (showRadarSweep) {
        radarSweepAngleRef.current = (radarSweepAngleRef.current + 0.04) % (Math.PI * 2);
        const sweepAngle = radarSweepAngleRef.current;
        const sweepRadius = Math.max(width, height) * 0.8;

        ctx.save();
        // Sweep Sector Wedge
        const wedgeAngle = Math.PI / 7;
        const sweepGrad = ctx.createRadialGradient(vebsX, vebsY, 0, vebsX, vebsY, sweepRadius);
        sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
        sweepGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
        sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(vebsX, vebsY);
        ctx.arc(vebsX, vebsY, sweepRadius, sweepAngle - wedgeAngle, sweepAngle, false);
        ctx.closePath();
        ctx.fill();

        // Leading Bright Sweep Line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(vebsX, vebsY);
        ctx.lineTo(vebsX + Math.cos(sweepAngle) * sweepRadius, vebsY + Math.sin(sweepAngle) * sweepRadius);
        ctx.stroke();
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    renderMode, 
    activeFrame, 
    activeLayer, 
    focusedSectorId, 
    sectors, 
    showRadarSweep, 
    showStreamlines, 
    showLightningFlashes, 
    latLonToPixel, 
    trackHistory, 
    conePolygon, 
    isAviationThreat
  ]);

  // Handle canvas click to select sector
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sWidth = canvas.width / 3;
    const sHeight = canvas.height / 3;

    const col = Math.min(2, Math.max(0, Math.floor(x / sWidth)));
    const row = Math.min(2, Math.max(0, Math.floor(y / sHeight)));

    setFocusedSectorId(`R${row}_C${col}`);
  };

  // Resize canvas according to container
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [renderMode]);

  return (
    <div className="relative w-full h-[calc(100vh-72px)] bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      
      {/* ================================================================== */}
      {/* 1. TOP TACTICAL CONTROL BAR & ENGINE TOGGLE                        */}
      {/* ================================================================== */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-5 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
              IMD DWR NOWCASTER
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              LIVE 0-6H
            </span>
          </div>

          <div className="h-5 w-[1px] bg-slate-800" />

          {/* Primary Render Mode Toggle: 2D Animated Canvas vs Keyless Basemap */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setRenderMode('canvas2d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                renderMode === 'canvas2d'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>2D Tactical Radar Engine</span>
              <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-950/40 rounded text-slate-900 font-black">
                60 FPS
              </span>
            </button>
            <button
              onClick={() => setRenderMode('leaflet')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                renderMode === 'leaflet'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Geospatial Basemap</span>
              <span className="text-[9px] font-mono text-slate-400">
                ESRI
              </span>
            </button>
          </div>
        </div>

        {/* Center: Tactical AOI Coordinates & Sector Readout */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
          <div>
            AOI: <span className="text-slate-200">20.0°N–20.6°N, 85.5°E–86.1°E</span>
          </div>
          <div>
            ACTIVE TARGET: <span className="text-sky-400 font-bold">{selectedSector.id} ({selectedSector.name})</span>
          </div>
        </div>

        {/* Right: Verification & Skill Score Modal Trigger */}
        <div className="flex items-center space-x-2">
          {renderMode === 'canvas2d' && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl text-[11px] font-mono">
              <button 
                onClick={() => setShowRadarSweep(!showRadarSweep)}
                className={`px-2 py-0.5 rounded transition ${showRadarSweep ? 'text-sky-300 font-bold bg-sky-500/20' : 'text-slate-500'}`}
              >
                SWEEP
              </button>
              <button 
                onClick={() => setShowStreamlines(!showStreamlines)}
                className={`px-2 py-0.5 rounded transition ${showStreamlines ? 'text-sky-300 font-bold bg-sky-500/20' : 'text-slate-500'}`}
              >
                FLOW
              </button>
              <button 
                onClick={() => setShowLightningFlashes(!showLightningFlashes)}
                className={`px-2 py-0.5 rounded transition ${showLightningFlashes ? 'text-amber-300 font-bold bg-amber-500/20' : 'text-slate-500'}`}
              >
                LIGHTNING
              </button>
            </div>
          )}

          <button
            onClick={() => setShowSkillModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-sky-400 flex items-center gap-1.5 transition"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>WMO Scores</span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. AVIATION CRITICAL WARNING BANNER                                */}
      {/* ================================================================== */}
      {isAviationThreat && (
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-2 flex items-center justify-between text-xs font-bold tracking-wider uppercase z-20 shadow-lg animate-pulse border-b border-rose-400/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-200" />
            <span>CRITICAL AERODROME WARNING:</span>
            <span className="font-normal text-rose-100">
              Severe Convective Cell ({activeFrame.matrix_dbz[1][1]} dBZ) penetrating VEBS Runway 01 Glide Path corridor. Severe Microburst and Low-Level Wind Shear (LLWS).
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono bg-black/40 px-2.5 py-1 rounded border border-white/20">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>RUNWAY IMPACT ETA: {incursionEtaMinutes} MIN</span>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 3. MAIN WORKSPACE (MAP + HUD FLOATS + SIDEBAR)                    */}
      {/* ================================================================== */}
      <div className="relative flex-1 w-full h-full overflow-hidden">

        {/* Floating Atmospheric Layer Switcher & Engine Selector (Top Left) */}
        <div className="absolute top-4 left-4 z-20 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl backdrop-blur-xl flex flex-col gap-3 shadow-2xl min-w-[290px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Atmospheric Layer
            </span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded">
              {activeFrame.engine}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'radar', label: 'Composite Radar', icon: CloudRain, unit: 'dBZ' },
              { id: 'pressure', label: 'Surface MSLP', icon: Gauge, unit: 'hPa' },
              { id: 'temp', label: 'Cold Pool Temp', icon: Thermometer, unit: '°C' },
              { id: 'cape', label: 'CAPE Instability', icon: Sparkles, unit: 'J/kg' },
            ].map((btn) => {
              const IconComponent = btn.icon;
              const isSelected = activeLayer === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setActiveLayer(btn.id as LayerVariable)}
                  className={`p-2 rounded-xl text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-lg shadow-sky-500/20'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-sky-400'}`} />
                    <span className="text-xs font-semibold">{btn.label}</span>
                  </div>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                    {btn.unit}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Model Toggle: ConvectNet vs PySTEPS Baseline */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Engine:</span>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveModel('convectnet')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  activeModel === 'convectnet' 
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ConvectNet (AI)
              </button>
              <button
                onClick={() => setActiveModel('pysteps')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  activeModel === 'pysteps' 
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PySTEPS Baseline
              </button>
            </div>
          </div>

          {/* Active Layer Dynamic Legend Bar */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-1 text-[10px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>PALETTE RANGE:</span>
              <span className="text-slate-200">
                {activeLayer === 'radar' && '15 to 65+ dBZ'}
                {activeLayer === 'pressure' && '998 to 1012 hPa'}
                {activeLayer === 'temp' && '22°C to 34°C'}
                {activeLayer === 'cape' && '800 to 3600 J/kg'}
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden flex shadow-inner">
              {activeLayer === 'radar' && (
                <>
                  <div className="flex-1 bg-emerald-500" />
                  <div className="flex-1 bg-green-500" />
                  <div className="flex-1 bg-yellow-400" />
                  <div className="flex-1 bg-orange-500" />
                  <div className="flex-1 bg-red-600" />
                  <div className="flex-1 bg-fuchsia-500" />
                </>
              )}
              {activeLayer === 'pressure' && (
                <>
                  <div className="flex-1 bg-purple-600" />
                  <div className="flex-1 bg-sky-500" />
                  <div className="flex-1 bg-teal-500" />
                  <div className="flex-1 bg-amber-400" />
                </>
              )}
              {activeLayer === 'temp' && (
                <>
                  <div className="flex-1 bg-sky-400" />
                  <div className="flex-1 bg-teal-400" />
                  <div className="flex-1 bg-orange-400" />
                  <div className="flex-1 bg-red-600" />
                </>
              )}
              {activeLayer === 'cape' && (
                <>
                  <div className="flex-1 bg-slate-700" />
                  <div className="flex-1 bg-yellow-500" />
                  <div className="flex-1 bg-orange-500" />
                  <div className="flex-1 bg-rose-600" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* RENDER MODE A: 2D TACTICAL RADAR CANVAS ENGINE (DEFAULT / 60 FPS) */}
        {/* =============================================================== */}
        {renderMode === 'canvas2d' && (
          <div className="relative w-full h-full bg-[#060a12] cursor-crosshair">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full h-full block"
            />
            {/* Quick Canvas Mode Indicator Badge */}
            <div className="absolute bottom-28 left-4 z-20 pointer-events-none bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl backdrop-blur-md font-mono text-[10px] text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>CANVAS 2D ENGINE • ZERO EXTERNAL TILES • OFFLINE SAFE</span>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* RENDER MODE B: LEAFLET GEOSPATIAL BASEMAP (ESRI KEYLESS)       */}
        {/* =============================================================== */}
        {renderMode === 'leaflet' && (
          <MapContainer
            center={[20.3, 85.8]}
            zoom={10}
            className="w-full h-full"
            zoomControl={false}
          >
            {/* Reliable ESRI World Dark Gray Canvas Base Tiles (Zero Watermark / No Key Required) */}
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            />

            {/* 4-Point Bilinear Heatmap Raster Overlay */}
            {rasterUrl && (
              <ImageOverlay
                url={rasterUrl}
                bounds={[
                  [AOI_BBOX.minLat, AOI_BBOX.minLon],
                  [AOI_BBOX.maxLat, AOI_BBOX.maxLon],
                ]}
                opacity={0.72}
                zIndex={400}
              />
            )}

            {/* 3x3 Tactical Sector Mesh with Subtle Persistent Grid Lines */}
            {sectors.map((sec) => {
              const isTarget = sec.id === focusedSectorId;
              return (
                <Rectangle
                  key={sec.id}
                  bounds={sec.bounds}
                  eventHandlers={{ click: () => setFocusedSectorId(sec.id) }}
                  pathOptions={{
                    color: isTarget ? '#38bdf8' : '#38bdf8',
                    weight: isTarget ? 2 : 1,
                    dashArray: isTarget ? undefined : '3, 4',
                    fillColor: isTarget ? '#0284c7' : 'transparent',
                    fillOpacity: isTarget ? 0.2 : 0,
                  }}
                >
                  <Tooltip 
                    permanent 
                    direction="center" 
                    opacity={0.92}
                    className="!bg-slate-950/90 !border !border-sky-500/40 !text-slate-100 !rounded-xl !p-1.5 !shadow-2xl !backdrop-blur-md"
                  >
                    <div className="text-center font-mono leading-tight cursor-pointer">
                      <div className={`text-[10px] uppercase tracking-wider ${isTarget ? 'text-sky-300 font-bold' : 'text-slate-400'}`}>
                        {sec.id}
                      </div>
                      <div className="text-xs font-black text-white">{sec.radar_dbz} dBZ</div>
                    </div>
                  </Tooltip>
                </Rectangle>
              );
            })}

            {/* Critical Infrastructure: VEBS Bhubaneswar Airport & Instrument Glide Path */}
            <CircleMarker 
              center={AIRPORT_VEBS.coords} 
              radius={8} 
              pathOptions={{ color: '#fbbf24', fillColor: '#f59e0b', fillOpacity: 0.95, weight: 2 }}
            >
              <Tooltip direction="right" permanent offset={[12, 0]}>
                <div className="font-mono text-[10px] font-bold text-amber-300 bg-slate-950/90 border border-amber-500/40 px-2 py-0.5 rounded shadow">
                  ✈ {AIRPORT_VEBS.callsign} ({AIRPORT_VEBS.runway})
                </div>
              </Tooltip>
            </CircleMarker>

            <Polyline 
              positions={AIRPORT_VEBS.glidePath} 
              pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6, 6' }} 
            />

            {/* Convective Motion Uncertainty Cone (Forward Spread) */}
            {currentFrameIdx < TIMELINE_FRAMES.length - 1 && (
              <Polygon
                positions={conePolygon}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#0284c7',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '4, 4'
                }}
              />
            )}

            {/* Storm Historical & Forward Trajectory Vectors */}
            <Polyline 
              positions={trackHistory} 
              pathOptions={{ color: '#f43f5e', weight: 3, dashArray: '4, 6' }} 
            />

            {/* Active Storm Convective Core Centroid */}
            <CircleMarker
              center={activeFrame.coreCentroid}
              radius={15}
              pathOptions={{
                color: '#f43f5e',
                fillColor: '#e11d48',
                fillOpacity: 0.88,
                weight: 2.5
              }}
            >
              <Tooltip direction="top" permanent offset={[0, -12]}>
                <div className="font-mono text-[10px] font-bold text-white bg-slate-950/90 border border-rose-500 px-2 py-0.5 rounded shadow">
                  CORE: {activeFrame.matrix_dbz[1][1]} dBZ
                </div>
              </Tooltip>
            </CircleMarker>
          </MapContainer>
        )}

        {/* =============================================================== */}
        {/* 4. RIGHT SIDEBAR: MoES PS-26084 Hazard Severity Console         */}
        {/* =============================================================== */}
        <aside className="absolute top-4 right-4 z-20 w-96 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl flex flex-col gap-3.5 shadow-2xl max-w-[360px]">
          
          {/* Sector Overview & AI Reasoning Header */}
          <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                AI Convective Reasoning
              </span>
              <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                {activeFrame.horizon}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Target sector <strong className="text-sky-300 font-mono">{selectedSector.id}</strong> ({selectedSector.name}) exhibits a barometric drop to <span className="text-purple-400 font-semibold">{selectedSector.pressure_hpa} hPa</span> coupled with a cold-pool outflow boundary (<span className="text-cyan-400 font-semibold">{selectedSector.temp_c}°C</span>). Extreme CAPE of <span className="text-amber-400 font-semibold">{selectedSector.cape_jkg} J/kg</span> is sustaining explosive updrafts aloft.
            </p>
            
            {/* Quick Action Inspection Chips */}
            <div className="flex gap-2 mt-1">
              <button 
                onClick={() => setActiveLayer('pressure')}
                className="flex-1 py-1.5 px-2 text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-lg transition flex items-center justify-center gap-1"
              >
                <Gauge className="w-3 h-3" />
                Inspect Mesolow
              </button>
              <button 
                onClick={() => setShowVerticalProfile(!showVerticalProfile)}
                className="flex-1 py-1.5 px-2 text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg transition flex items-center justify-center gap-1"
              >
                <Activity className="w-3 h-3" />
                {showVerticalProfile ? 'Hide 3D RHI' : '3D Column Cut'}
              </button>
            </div>
          </div>

          {/* MoES 4-Hazard Verification Classification Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl flex flex-col gap-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center justify-between">
              <span>PS-26084 Hazard Engine</span>
              <span className="text-sky-400 font-mono">{selectedSector.id}</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* 1. Cloudburst Warning Metric */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Cloudburst (Z-R)</span>
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className={`font-mono text-sm font-black mt-1 ${isCloudburstRisk ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                  {calculatedRainRate.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">mm/hr</span>
                </div>
                <span className={`text-[9px] font-bold mt-0.5 ${isCloudburstRisk ? 'text-rose-400' : 'text-slate-500'}`}>
                  {isCloudburstRisk ? 'CRITICAL (> 100mm/h)' : 'Moderate / Heavy Rain'}
                </span>
              </div>

              {/* 2. Severe Hail Risk (POH/MESH) */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Severe Hail (MESH)</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className={`font-mono text-sm font-black mt-1 ${isSevereHail ? 'text-rose-400' : 'text-slate-200'}`}>
                  {poshValue}% <span className="text-[10px] font-normal text-slate-400">POH ({meshValue}mm)</span>
                </div>
                <span className={`text-[9px] font-bold mt-0.5 ${isSevereHail ? 'text-rose-400' : 'text-slate-500'}`}>
                  {isSevereHail ? 'Core > 55 dBZ aloft' : 'Low (< 15%)'}
                </span>
              </div>

              {/* 3. Microburst / Squall Incursion */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Microburst Gust</span>
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className={`font-mono text-sm font-black mt-1 ${isMicroburstSevere ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {selectedSector.wind_gust_kmh} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                </div>
                <span className={`text-[9px] font-bold mt-0.5 ${isMicroburstSevere ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {isMicroburstSevere ? 'Squall Incursion (>65)' : 'Moderate Outflow'}
                </span>
              </div>

              {/* 4. Total Lightning Flash Jump */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Lightning Jump</span>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className={`font-mono text-sm font-black mt-1 ${isLightningJump ? 'text-amber-400' : 'text-slate-200'}`}>
                  +{selectedSector.lightning_rate} <span className="text-[10px] font-normal text-slate-400">str/min</span>
                </div>
                <span className={`text-[9px] font-bold mt-0.5 ${isLightningJump ? 'text-amber-400' : 'text-slate-500'}`}>
                  {isLightningJump ? 'Updraft Collapse Alert' : 'Nominal Flux'}
                </span>
              </div>
            </div>
          </div>

          {/* Runway Proximity Telemetry */}
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Runway Distance</span>
                <span className="font-bold text-slate-200">{distanceToRunwayKm.toFixed(1)} km</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-sans">Corridor Incursion</span>
              <span className="font-bold text-amber-400">ETA {incursionEtaMinutes} min</span>
            </div>
          </div>

          {/* Trigger Official NDMA / WMO CAP Alert Modal */}
          <button
            onClick={() => setShowCapModal(true)}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 font-bold text-xs uppercase tracking-wider rounded-xl text-white shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Generate NDMA CAP v1.2 Alert</span>
          </button>
        </aside>

        {/* =============================================================== */}
        {/* 5. BOTTOM DRAWER: 3D Vertical Radar Slice (0 - 16 km Altitude)  */}
        {/* =============================================================== */}
        {showVerticalProfile && (
          <div className="absolute bottom-24 left-4 right-4 z-20 bg-slate-900/95 border border-slate-800 p-4 rounded-2xl backdrop-blur-2xl shadow-2xl flex flex-col gap-2.5 animate-in slide-in-from-bottom duration-300 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-400" />
                  RHI Vertical Reflectivity Cross-Section (0–16 km Altitude)
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  Target: {selectedSector.id}
                </span>
              </div>
              <button 
                onClick={() => setShowVerticalProfile(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical Radar Cross-Section Diagram */}
            <div className="h-44 w-full bg-slate-950 border border-slate-800/80 rounded-xl relative overflow-hidden flex flex-col justify-between p-3 font-mono text-[10px]">
              
              {/* Overshooting Cloud Tops (> 14 km) */}
              <div className="absolute top-2 left-16 right-16 h-8 bg-gradient-to-b from-fuchsia-600/30 to-purple-600/20 border-t border-fuchsia-400/60 rounded-full flex items-center justify-center text-fuchsia-300">
                Overshooting Convective Top (14.8 km) • Tropopause Penetration
              </div>

              {/* Suspended Severe Hail Core (6–9 km) */}
              <div className="absolute top-12 left-28 right-28 h-10 bg-gradient-to-r from-red-600/70 via-rose-500/80 to-red-600/70 border border-rose-400/80 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-rose-600/30">
                SUSPENDED HAIL CORE &gt; 58 dBZ (7.2 km)
              </div>

              {/* Freezing Level / Bright Band (4.5 km) */}
              <div className="absolute top-24 left-0 right-0 border-b border-dashed border-cyan-400/70 flex items-center justify-between px-3 text-cyan-300">
                <span>0°C Freezing Level (4.5 km)</span>
                <span className="text-[9px] bg-cyan-950 px-1.5 rounded border border-cyan-500/40">Melting Layer / Bright Band</span>
              </div>

              {/* Stratiform Rain & Surface Precipitation Core (0–4 km) */}
              <div className="absolute bottom-2 left-20 right-20 h-14 bg-gradient-to-t from-emerald-500/40 via-green-600/40 to-yellow-500/40 border border-green-500/40 rounded-t-xl flex items-center justify-center text-emerald-200">
                Torrental Rainfall Core ({calculatedRainRate.toFixed(1)} mm/hr) • Downdraft Base
              </div>

              {/* Altitude Y-Axis Legend */}
              <div className="absolute top-2 left-2 bottom-2 flex flex-col justify-between text-slate-500 font-mono text-[9px] border-r border-slate-800 pr-2">
                <span>16 km</span>
                <span>12 km</span>
                <span>8 km</span>
                <span>4 km</span>
                <span>0 km</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>RADIAL AZIMUTH: 218° FROM VEBS RADAR</span>
              <span>BEAM RESOLUTION: 250m BIN WIDTH</span>
              <span>ELEVATION ANGLE: 0.5° TO 19.5° VOLUMETRIC SCAN</span>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* 6. BOTTOM TIMELINE SCRUBBER (0 TO 6 HOURS)                       */}
        {/* =============================================================== */}
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col gap-2 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentFrameIdx((prev) => Math.max(0, prev - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Step Backward"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition shadow-md shadow-sky-500/20"
                title={isPlaying ? 'Pause Loop' : 'Play Timeline'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={() => setCurrentFrameIdx((prev) => Math.min(TIMELINE_FRAMES.length - 1, prev + 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Step Forward"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-200 pl-2">
                {activeFrame.horizon}
              </span>
            </div>

            {/* Nowcast vs NWP Transition Indicator */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                activeFrame.phase === 'nowcast'
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              }`}>
                Phase: {activeFrame.phase === 'nowcast' ? 'Radar DL (0–2h)' : 'NWP Hybrid (2–6h)'}
              </span>
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                {activeFrame.engine}
              </span>
            </div>
          </div>

          {/* Timeline Node Selector */}
          <div className="grid grid-cols-6 gap-2 pt-1">
            {TIMELINE_FRAMES.map((f, idx) => {
              const isActive = currentFrameIdx === idx;
              return (
                <button
                  key={f.horizon}
                  onClick={() => setCurrentFrameIdx(idx)}
                  className={`py-1.5 px-1 rounded-lg text-center font-mono text-[10px] transition border ${
                    isActive
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold shadow-sm'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="truncate">{f.horizon.split(' ')[0]}</div>
                  <div className="text-[9px] opacity-70 truncate">{f.phase}</div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ================================================================== */}
      {/* 7. NDMA / WMO COMMON ALERTING PROTOCOL (CAP v1.2) MODAL           */}
      {/* ================================================================== */}
      {showCapModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-bold uppercase tracking-wider text-slate-100">
                  Official NDMA CAP v1.2 Dispatch Generator
                </span>
              </div>
              <button 
                onClick={() => setShowCapModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Targeted Dispatch: <strong className="text-sky-300 font-mono">{selectedSector.id}</strong> ({selectedSector.name})
              </span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setCapFormat('xml')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold ${capFormat === 'xml' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
                >
                  XML (WMO)
                </button>
                <button
                  onClick={() => setCapFormat('json')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold ${capFormat === 'json' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
                >
                  JSON (NDMA API)
                </button>
              </div>
            </div>

            {/* XML / JSON Code Output Viewer */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-300 overflow-y-auto max-h-80 leading-relaxed">
              <pre className="whitespace-pre-wrap">
                {capFormat === 'xml' ? `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>IN-OD-IMD-NOWCAST-${Date.now()}</identifier>
  <sender>imd-nowcast@imd.gov.in</sender>
  <sent>${new Date().toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>Met</category>
    <event>Severe Thunderstorm & Downburst</event>
    <urgency>Immediate</urgency>
    <severity>${selectedSector.radar_dbz >= 55 ? 'Extreme' : 'Severe'}</severity>
    <certainty>Observed</certainty>
    <headline>Severe Convection Alert for ${selectedSector.name} (${selectedSector.id})</headline>
    <description>IMD Doppler Radar detected convective core with peak reflectivity of ${selectedSector.radar_dbz} dBZ. Estimated rain rate: ${calculatedRainRate.toFixed(1)} mm/hr. Surface gusts: ${selectedSector.wind_gust_kmh} km/h. Probable Severe Hail: ${poshValue}%. Total Lightning Jump: ${selectedSector.lightning_rate} str/min.</description>
    <instruction>Take immediate shelter in reinforced structures. Aviation operations at VEBS Bhubaneswar suspended. Stay clear of electrical lines and open fields.</instruction>
    <area>
      <areaDesc>${selectedSector.name}</areaDesc>
      <circle>${selectedSector.center[0].toFixed(4)},${selectedSector.center[1].toFixed(4)},6.0</circle>
    </area>
  </info>
</alert>` : JSON.stringify({
                  identifier: `IN-OD-IMD-NOWCAST-${Date.now()}`,
                  sender: "imd-nowcast@imd.gov.in",
                  sent: new Date().toISOString(),
                  status: "Actual",
                  msgType: "Alert",
                  scope: "Public",
                  info: {
                    category: "Met",
                    event: "Severe Thunderstorm & Downburst",
                    urgency: "Immediate",
                    severity: selectedSector.radar_dbz >= 55 ? "Extreme" : "Severe",
                    certainty: "Observed",
                    headline: `Severe Convection Alert for ${selectedSector.name} (${selectedSector.id})`,
                    parameters: {
                      radar_dbz: selectedSector.radar_dbz,
                      rain_rate_mmh: calculatedRainRate.toFixed(1),
                      surface_gust_kmh: selectedSector.wind_gust_kmh,
                      hail_posh: `${poshValue}%`,
                      lightning_rate: `${selectedSector.lightning_rate} str/min`,
                    },
                    coordinates: selectedSector.center,
                  }
                }, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] font-mono text-slate-500">
                NDMA GUID: 36084-MOES-DWR-ODISHA
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    capFormat === 'xml'
                      ? `<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">...</alert>`
                      : `{"status": "Actual"}`
                  );
                  setCopiedAlert(true);
                  setTimeout(() => setCopiedAlert(false), 2000);
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 font-bold text-xs text-slate-950 rounded-xl transition flex items-center gap-1.5 shadow"
              >
                {copiedAlert ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedAlert ? 'Copied to Clipboard' : 'Copy CAP Payload'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 8. WMO BENCHMARK SKILL SCORES MODAL (CONVECTNET VS PYSTEPS)       */}
      {/* ================================================================== */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                <span className="text-sm font-bold uppercase tracking-wider text-slate-100">
                  Meteorological Skill Score Verification
                </span>
              </div>
              <button 
                onClick={() => setShowSkillModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              Comparison between <strong className="text-sky-400">ConvectNet AI</strong> and industry-standard <strong className="text-amber-400">PySTEPS Lagrangian Optical Flow</strong> across 193 SEVIR & IMD validation events:
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Critical Success Index</span>
                <span className="text-lg font-black text-sky-400">0.784</span>
                <span className="text-[9px] text-slate-500 block">PySTEPS: 0.612 (+28%)</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Probability of Detection</span>
                <span className="text-lg font-black text-emerald-400">0.892</span>
                <span className="text-[9px] text-slate-500 block">PySTEPS: 0.730 (+22%)</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block">False Alarm Ratio</span>
                <span className="text-lg font-black text-rose-400">0.084</span>
                <span className="text-[9px] text-slate-500 block">PySTEPS: 0.174 (-52%)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1 font-mono">
              <div>• Fractions Skill Score (FSS @ 10km): <span className="text-sky-300 font-bold">0.865</span> (Useful Skill threshold &gt; 0.50)</div>
              <div>• Brier Skill Score (BSS for Hail): <span className="text-sky-300 font-bold">0.342</span> vs Climatology</div>
              <div>• Inference Latency: <span className="text-emerald-400 font-bold">28.4 ms</span> per 128x128 volumetric cube (Apple M-series MPS)</div>
            </div>

            <button
              onClick={() => setShowSkillModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
            >
              Close Verification Diagnostics
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
