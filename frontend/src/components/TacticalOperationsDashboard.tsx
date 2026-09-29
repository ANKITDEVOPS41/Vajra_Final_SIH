import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Circle, 
  Polyline, 
  Polygon,
  Marker, 
  Popup, 
  Tooltip, 
  Rectangle,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Radar, 
  ShieldAlert, 
  Clock, 
  Navigation, 
  Layers, 
  Compass, 
  Eye, 
  AlertTriangle, 
  Activity, 
  MapPin, 
  Maximize2, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Grid, 
  Radio, 
  Info,
  ChevronDown,
  ChevronUp,
  Table,
  Plane,
  HelpCircle,
  X,
  Target
} from 'lucide-react';
import { 
  StormCell, 
  DispatchedAlert, 
  createDispatchedAlert, 
  FALLBACK_STORM_CELLS 
} from '../types/dispatch';
import { 
  TACTICAL_3X3_GRID, 
  SURROUNDING_AWS_STATIONS, 
  TacticalSector, 
  SurfaceAwsStation, 
  VEBS_AIRPORT_SPECS,
  VEBS_DOMAIN_BOUNDS
} from '../types/tacticalGrid';
import { CapAlertModal } from './CapAlertModal';
import { WeatherRasterOverlay, WeatherColorbarLegend, WeatherMapFormat } from './WeatherRasterOverlay';
import WeatherFormatSelector from './WeatherFormatSelector';
import { VisualIntelDecisionKey } from './VisualIntelDecisionKey';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper: Target Coordinates Lookup
export function getTargetCoordinates(targetName: string): [number, number] {
  const normalized = targetName.toLowerCase();
  if (normalized.includes('01') || normalized.includes('touchdown')) return [20.2338, 85.8150];
  if (normalized.includes('19') || normalized.includes('threshold')) return [20.2550, 85.8206];
  if (normalized.includes('terminal') || normalized.includes('apron')) return [20.2520, 85.8160];
  if (normalized.includes('control') || normalized.includes('tower')) return [20.2465, 85.8200];
  if (normalized.includes('mancheswar') || normalized.includes('holding') || normalized.includes('north approach')) return [20.2950, 85.8550];
  if (normalized.includes('lingaraj') || normalized.includes('old town')) return [20.2050, 85.8450];
  if (normalized.includes('cuttack') || normalized.includes('badambadi')) return [20.4620, 85.8830];
  if (normalized.includes('pipili')) return [20.1200, 85.8350];
  if (normalized.includes('vebs') || normalized.includes('airport') || normalized.includes('biju patnaik')) return [20.2444, 85.8178];
  return [20.2444, 85.8178];
}

// Compute projected coordinate after timeMinutes
export function computeProjectedCoord(
  lat: number, 
  lon: number, 
  headingDeg: number, 
  velocityKmh: number, 
  minutes: number
): [number, number] {
  const dKm = velocityKmh * (minutes / 60);
  const headingRad = (headingDeg * Math.PI) / 180;
  const dLat = (dKm * Math.cos(headingRad)) / 111.0;
  const dLon = (dKm * Math.sin(headingRad)) / (111.0 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lon + dLon];
}

// Map Controller for programmatic movement
interface MapControllerProps {
  targetCenter: [number, number] | null;
  targetZoom: number | null;
  onMovementComplete?: () => void;
}

const MapController: React.FC<MapControllerProps> = ({ targetCenter, targetZoom, onMovementComplete }) => {
  const map = useMap();

  useEffect(() => {
    if (targetCenter && targetZoom) {
      map.flyTo(targetCenter, targetZoom, {
        animate: true,
        duration: 1.0,
      });
      if (onMovementComplete) {
        const timer = setTimeout(onMovementComplete, 1100);
        return () => clearTimeout(timer);
      }
    }
  }, [targetCenter, targetZoom, map, onMovementComplete]);

  return null;
};

// Map Resizer component to ensure correct canvas sizing
const MapResizer: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
};

export interface TacticalOperationsDashboardProps {
  stormCells?: StormCell[];
  onTriggerCitizenWarning?: (alert: DispatchedAlert) => void;
}

export const TacticalOperationsDashboard: React.FC<TacticalOperationsDashboardProps> = ({
  stormCells = FALLBACK_STORM_CELLS,
  onTriggerCitizenWarning
}) => {
  // Active State
  const [selectedCellId, setSelectedCellId] = useState<string>(stormCells[0]?.cell_id || 'CELL-805');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EXTREME' | 'SEVERE' | 'MODERATE'>('ALL');
  const [weatherFormat, setWeatherFormat] = useState<WeatherMapFormat>('dwr_radar');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showInterceptRays, setShowInterceptRays] = useState<boolean>(true);
  const [showAws, setShowAws] = useState<boolean>(true);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [showMissionGuide, setShowMissionGuide] = useState<boolean>(false);
  const [showTableView, setShowTableView] = useState<boolean>(false);
  const [activeCapCellId, setActiveCapCellId] = useState<string | null>(null);

  // Map Camera Control
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState<number | null>(null);

  // Active Selected Cell Object
  const selectedCell = useMemo(() => {
    return stormCells.find(c => c.cell_id === selectedCellId) || stormCells[0];
  }, [stormCells, selectedCellId]);

  // Filtered cells
  const filteredCells = useMemo(() => {
    return stormCells.filter(cell => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'EXTREME') return cell.severity?.toUpperCase() === 'EXTREME' || (cell.hazards?.cloudburst_flag || cell.peak_dbz >= 64);
      if (activeFilter === 'SEVERE') return cell.severity?.toUpperCase() === 'SEVERE' || (cell.peak_dbz >= 50 && cell.peak_dbz < 64);
      if (activeFilter === 'MODERATE') return cell.severity?.toUpperCase() === 'MODERATE' || cell.peak_dbz < 50;
      return true;
    });
  }, [stormCells, activeFilter]);

  // All target arrivals aggregated and sorted by ETA
  const allTargetArrivals = useMemo(() => {
    const list: Array<{
      cell: StormCell;
      target_name: string;
      distance_km: number;
      eta_minutes: number;
      eta_window_min: string;
      threat_level: string;
      targetCoord: [number, number];
    }> = [];

    stormCells.forEach(cell => {
      if (cell.target_etas && cell.target_etas.length > 0) {
        cell.target_etas.forEach(t => {
          list.push({
            cell,
            target_name: t.target_name,
            distance_km: t.distance_km,
            eta_minutes: t.eta_minutes,
            eta_window_min: t.eta_window_min,
            threat_level: t.threat_level,
            targetCoord: getTargetCoordinates(t.target_name)
          });
        });
      }
    });

    return list.sort((a, b) => a.eta_minutes - b.eta_minutes);
  }, [stormCells]);

  // Handler to focus on cell
  const handleSelectCell = (cellId: string, zoom: number = 14) => {
    setSelectedCellId(cellId);
    const cell = stormCells.find(c => c.cell_id === cellId);
    if (cell) {
      setFlyTarget([cell.centroid_lat, cell.centroid_lon]);
      setFlyZoom(zoom);
    }
  };

  // Reset to full corridor
  const handleResetToCorridor = () => {
    setFlyTarget([20.2600, 85.8200]);
    setFlyZoom(11);
  };

  // Focus directly on VEBS Airport
  const handleFocusAirport = () => {
    setFlyTarget(VEBS_AIRPORT_SPECS.center);
    setFlyZoom(14);
  };

  // Dispatch CAP alert
  const handleDispatchCap = (cellId: string) => {
    setActiveCapCellId(cellId);
  };

  // Custom DivIcons
  const createStormIcon = (cell: StormCell, isSelected: boolean) => {
    const isExtreme = cell.severity === 'EXTREME' || cell.peak_dbz >= 64;
    const isSevere = cell.severity === 'SEVERE' || (cell.peak_dbz >= 52 && cell.peak_dbz < 64);
    const color = isExtreme ? '#ef4444' : isSevere ? '#f59e0b' : '#38bdf8';

    return L.divIcon({
      className: 'storm-cell-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
          <!-- Tactical Centroid Beacon (Clean Diamond) -->
          <div style="
            width: ${isSelected ? '16px' : '13px'};
            height: ${isSelected ? '16px' : '13px'};
            transform: rotate(45deg);
            background: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px rgba(0,0,0,0.85);
            z-index: 10;
          "></div>

          <!-- Monospace Callout Badge -->
          <div style="
            margin-top: 6px;
            background: rgba(8, 12, 20, 0.94);
            border: 1px solid ${isSelected ? '#ffffff' : color};
            border-radius: 5px;
            padding: 2px 7px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.8);
            backdrop-filter: blur(6px);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
            z-index: 20;
          ">
            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 800; color: #ffffff;">
              ${cell.cell_id}
            </span>
            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 700; color: ${color};">
              ${cell.peak_dbz.toFixed(0)} dBZ
            </span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  };

  const createTargetIcon = (name: string, threatLevel: string) => {
    const isEmerg = threatLevel === 'EMERGENCY';
    const color = isEmerg ? '#ef4444' : '#38bdf8';

    return L.divIcon({
      className: 'target-asset-marker',
      html: `
        <div style="
          display: inline-flex;
          align-items: center;
          background: rgba(10, 15, 26, 0.95);
          border: 1.5px solid ${color};
          border-radius: 4px;
          padding: 2px 6px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.8);
          transform: translate(-50%, -50%);
          white-space: nowrap;
          pointer-events: none;
        ">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; margin-right: 5px; ${isEmerg ? 'animation: pulse 1s infinite;' : ''}"></span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; font-weight: 700; color: #f8fafc; letter-spacing: 0.5px;">
            ${name}
          </span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  };

  const createInterceptTagIcon = (targetName: string, distanceKm: number, etaMin: number, isSelected: boolean) => {
    const isImminent = etaMin < 6;
    const color = isImminent ? '#ef4444' : isSelected ? '#38bdf8' : '#e2e8f0';

    return L.divIcon({
      className: 'intercept-ray-tag',
      html: `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(10, 14, 24, 0.92);
          border: 1px solid ${color};
          border-radius: 5px;
          padding: 2px 7px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.85);
          transform: translate(-50%, -50%);
          white-space: nowrap;
          cursor: pointer;
        ">
          <span style="color: ${color}; font-size: 9px; font-weight: 800;">⚡ INTERCEPT</span>
          <span style="font-family: monospace; font-size: 9px; color: #ffffff; font-weight: 700;">${distanceKm}km</span>
          <span style="font-family: monospace; font-size: 9px; color: ${color}; font-weight: 800; background: ${color}20; padding: 1px 4px; border-radius: 3px;">
            ETA ${Math.floor(etaMin)}m
          </span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-105px)] bg-[#07090e] overflow-hidden flex flex-col font-sans select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP FLOATING COMMAND CONTROLS & HUD */}
      {/* ========================================================================= */}
      <div className="absolute top-3 left-4 right-4 z-[500] pointer-events-none flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Corridor Identity & Domain Breadcrumb */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-[#0a0f1d]/90 backdrop-blur-md border border-[#1f293d] rounded-lg px-3.5 py-2 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-white tracking-wide">VEBS CORRIDOR C2</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                0–6H NOWCAST
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              3x3 AOI: 20.0°N–20.6°N, 85.5°E–86.1°E • 9 Surface AWS Ground Truth
            </div>
          </div>
        </div>

        {/* Center: Severity Filter Chips */}
        <div className="pointer-events-auto flex items-center bg-[#0a0f1d]/90 backdrop-blur-md border border-[#1f293d] rounded-lg p-1 shadow-xl space-x-1">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
              activeFilter === 'ALL' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Cells ({stormCells.length})
          </button>
          <button
            onClick={() => setActiveFilter('EXTREME')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center space-x-1 ${
              activeFilter === 'EXTREME' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Extreme</span>
          </button>
          <button
            onClick={() => setActiveFilter('SEVERE')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center space-x-1 ${
              activeFilter === 'SEVERE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Severe</span>
          </button>
          <button
            onClick={() => setActiveFilter('MODERATE')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center space-x-1 ${
              activeFilter === 'MODERATE' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-sky-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>Moderate</span>
          </button>
        </div>

        {/* Right: Map Layer Toggles & View Controls */}
        <div className="pointer-events-auto flex items-center space-x-2">
          
          {/* Layer toggles pill */}
          <div className="flex items-center bg-[#0a0f1d]/90 backdrop-blur-md border border-[#1f293d] rounded-lg px-2 py-1 space-x-2 text-xs font-mono">
            <button
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle 3x3 Tactical Grid"
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                showGrid ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>3x3</span>
            </button>
            <button
              onClick={() => setShowVectors(!showVectors)}
              title="Toggle Velocity Motion Vectors"
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                showVectors ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3 h-3" />
              <span>Vectors</span>
            </button>
            <button
              onClick={() => setShowInterceptRays(!showInterceptRays)}
              title="Toggle Intercept Rays & Live ETAs"
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                showInterceptRays ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Intercepts</span>
            </button>
            <button
              onClick={() => setShowAws(!showAws)}
              title="Toggle 9 AWS In-Situ Surface Stations"
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                showAws ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>AWS</span>
            </button>
            <button
              onClick={() => setShowRangeRings(!showRangeRings)}
              title="Toggle 1km, 2km, 3km Aerodrome Safety Range Rings around Runway 19"
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                showRangeRings ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>1–3km Rings</span>
            </button>
          </div>

          {/* Weather Map Format Selector */}
          <WeatherFormatSelector
            currentFormat={weatherFormat}
            onSelectFormat={setWeatherFormat}
          />

          {/* Mission & Scale Guide Button */}
          <button
            onClick={() => setShowMissionGuide(true)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Why 1-3km matters & How to read this tactical nowcasting map"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">1–3km Mission Guide</span>
            <span className="sm:hidden">Guide</span>
          </button>

          {/* Camera Quick Buttons */}
          <div className="flex bg-[#0a0f1d]/90 backdrop-blur-md border border-[#1f293d] rounded-lg p-1 space-x-1">
            <button
              onClick={handleFocusAirport}
              title="Focus VEBS Biju Patnaik Airport"
              className="px-2 py-1 rounded bg-[#162032] hover:bg-sky-500/20 text-sky-300 border border-[#2b3a55] text-xs font-mono font-semibold flex items-center space-x-1"
            >
              <Plane className="w-3 h-3" />
              <span>VEBS Airfield</span>
            </button>
            <button
              onClick={handleResetToCorridor}
              title="Reset to Full 3x3 Corridor"
              className="px-2 py-1 rounded bg-[#162032] hover:bg-sky-500/20 text-slate-300 hover:text-white border border-[#2b3a55] text-xs font-mono font-semibold flex items-center space-x-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Corridor</span>
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN EXPANSIVE GIS MAP CANVAS */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer
          center={VEBS_AIRPORT_SPECS.center}
          zoom={13}
          minZoom={9}
          maxZoom={18}
          scrollWheelZoom={true}
          dragging={true}
          zoomControl={false}
          className="w-full h-full"
          style={{ width: '100%', height: '100%', backgroundColor: '#07090e' }}
        >
          <MapResizer />
          <MapController 
            targetCenter={flyTarget} 
            targetZoom={flyZoom} 
            onMovementComplete={() => {
              setFlyTarget(null);
              setFlyZoom(null);
            }} 
          />

          {/* Dynamic Base Tile Layer */}
          {(weatherFormat === 'satellite' || weatherFormat === 'enhanced_cloud') && (
            <>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                maxNativeZoom={16}
                attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics"
              />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                maxZoom={19} maxNativeZoom={16}
                opacity={0.85}
              />
            </>
          )}
          {(weatherFormat === 'dark' || weatherFormat === 'insat_ir' || weatherFormat === 'ir_rainbow' || weatherFormat === 'dwr_radar') && (
            <>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                maxZoom={19}
                maxNativeZoom={16}
                opacity={0.92}
                attribution="&copy; Esri"
              />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                maxZoom={19} maxNativeZoom={16}
                opacity={0.85}
              />
            </>
          )}

          {/* Meteorological / Base Weather Raster Imagery Layer (Live IMD WMS & Convective Cloud Top Fields) */}
          <WeatherRasterOverlay
            format={weatherFormat}
            cells={stormCells.map(c => ({
              cell_id: c.cell_id,
              lat: c.centroid_lat,
              lon: c.centroid_lon,
              peak_dbz: c.peak_dbz,
              area_km2: c.area_km2,
              heading_deg: c.heading_deg,
              velocity_kmh: c.velocity_kmh,
            }))}
          />

          {/* VEBS Runway 01/19 Geometry & Thresholds */}
          <Polyline
            positions={VEBS_AIRPORT_SPECS.runway01_19}
            pathOptions={{
              color: '#ffffff',
              weight: 5,
              opacity: 0.95,
              dashArray: '12, 6',
            }}
          />
          <Marker
            position={VEBS_AIRPORT_SPECS.runway01_19[0]}
            icon={createTargetIcon('RWY 01 TDZ', 'EMERGENCY')}
          />
          <Marker
            position={VEBS_AIRPORT_SPECS.runway01_19[1]}
            icon={createTargetIcon('RWY 19 TH', 'WARNING')}
          />
          <Marker
            position={VEBS_AIRPORT_SPECS.terminal1_2}
            icon={createTargetIcon('T2 APRON', 'WARNING')}
          />
          <Marker
            position={VEBS_AIRPORT_SPECS.atcTower}
            icon={createTargetIcon('ATC TOWER', 'WARNING')}
          />

          {/* Concentric 1km, 2km, 3km Aerodrome Safety Range Rings around Runway 19 Threshold */}
          {showRangeRings && (
            <>
              {/* 1 km Inner Touchdown Emergency Ring */}
              <Circle
                center={VEBS_AIRPORT_SPECS.runway01_19[1]}
                radius={1000}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.05,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <div className="font-mono text-[9px] font-bold text-red-400 bg-[#0a0f1d]/95 px-2 py-0.5 rounded border border-red-500/60 shadow-lg">
                    ⭕ 1 km TOUCHDOWN ZONE (&lt;2 MIN IMPACT)
                  </div>
                </Tooltip>
              </Circle>

              {/* 2 km Final Approach Alert Ring */}
              <Circle
                center={VEBS_AIRPORT_SPECS.runway01_19[1]}
                radius={2000}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.03,
                  weight: 2,
                  dashArray: '6, 6',
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <div className="font-mono text-[9px] font-bold text-amber-400 bg-[#0a0f1d]/95 px-2 py-0.5 rounded border border-amber-500/60 shadow-lg">
                    ⭕ 2 km FINAL APPROACH ALERT (CELL-701 AT 1.8 KM)
                  </div>
                </Tooltip>
              </Circle>

              {/* 3 km Aerodrome Tactical Perimeter (PS-26084 Core Requirement) */}
              <Circle
                center={VEBS_AIRPORT_SPECS.runway01_19[1]}
                radius={3000}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.02,
                  weight: 1.8,
                  dashArray: '8, 8',
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <div className="font-mono text-[9px] font-bold text-sky-400 bg-[#0a0f1d]/95 px-2 py-0.5 rounded border border-sky-500/60 shadow-lg">
                    ⭕ 3 km AERODROME NOWCAST BOUNDARY (SIH PS-26084)
                  </div>
                </Tooltip>
              </Circle>
            </>
          )}

          {/* Regional Critical Ground Targets */}
          <Marker
            position={[20.4620, 85.8830]}
            icon={createTargetIcon('CUTTACK BADAMBADI', 'EMERGENCY')}
          />
          <Marker
            position={[20.1200, 85.8350]}
            icon={createTargetIcon('PIPILI JUNCTION', 'WARNING')}
          />

          {/* 3x3 Tactical Sector Grid */}
          {showGrid && TACTICAL_3X3_GRID.map((sector) => {
            const isSelected = selectedCell && (
              selectedCell.centroid_lat >= sector.latMin &&
              selectedCell.centroid_lat <= sector.latMax &&
              selectedCell.centroid_lon >= sector.lonMin &&
              selectedCell.centroid_lon <= sector.lonMax
            );
            const isSevereSector = sector.radarDbz >= 55;
            const sectorColor = isSevereSector ? '#ef4444' : isSelected ? '#38bdf8' : '#334155';

            return (
              <React.Fragment key={sector.id}>
                <Rectangle
                  bounds={[
                    [sector.latMin, sector.lonMin],
                    [sector.latMax, sector.lonMax],
                  ]}
                  pathOptions={{
                    color: sectorColor,
                    weight: isSelected ? 2 : 1,
                    dashArray: '5, 5',
                    fillColor: isSevereSector ? '#ef4444' : '#0284c7',
                    fillOpacity: isSevereSector ? 0.12 : isSelected ? 0.08 : 0.02,
                  }}
                />
                {/* Sector Center Monospace Label Marker */}
                <Marker
                  position={sector.center}
                  icon={L.divIcon({
                    className: 'tactical-sector-chip',
                    html: `
                      <div style="
                        background: rgba(8, 12, 22, 0.85);
                        border: 1px solid ${sectorColor};
                        border-radius: 4px;
                        padding: 1px 5px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
                        transform: translate(-50%, -50%);
                        pointer-events: none;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                      ">
                        <span style="font-family: monospace; font-size: 8px; font-weight: 700; color: #94a3b8;">${sector.code}</span>
                        <span style="font-family: monospace; font-size: 8px; font-weight: 800; color: ${sectorColor};">${sector.radarDbz.toFixed(0)} dBZ</span>
                      </div>
                    `,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                  })}
                />
              </React.Fragment>
            );
          })}

          {/* 9 Surface AWS In-Situ Stations */}
          {showAws && SURROUNDING_AWS_STATIONS.map((station) => {
            const isSevere = station.status === 'SEVERE_ALERT';
            const awsColor = isSevere ? '#ef4444' : '#38bdf8';

            return (
              <Marker
                key={station.id}
                position={[station.lat, station.lon]}
                icon={L.divIcon({
                  className: 'aws-station-pin',
                  html: `
                    <div style="
                      background: rgba(9, 14, 26, 0.92);
                      border: 1px solid ${awsColor};
                      border-radius: 4px;
                      padding: 2px 5px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.8);
                      transform: translate(-50%, -50%);
                      white-space: nowrap;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      gap: 4px;
                    ">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: ${awsColor}; ${isSevere ? 'animation: pulse 1s infinite;' : ''}"></span>
                      <span style="font-family: monospace; font-size: 8px; font-weight: 700; color: #ffffff;">${station.id}</span>
                      <span style="font-family: monospace; font-size: 8px; color: ${awsColor}; font-weight: 800;">${station.tempC}°C</span>
                    </div>
                  `,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0]
                })}
              >
                <Popup className="tactical-aws-popup">
                  <div className="bg-[#0b101b] text-white p-2 rounded text-xs font-mono min-w-[200px]">
                    <div className="font-bold text-sky-400 border-b border-slate-700 pb-1 mb-1 flex justify-between">
                      <span>{station.name}</span>
                      <span className="text-[10px] text-slate-400">ID: {station.code}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                      <div>Temp: <strong className="text-white">{station.tempC}°C</strong></div>
                      <div>DewPt: <strong className="text-white">{station.dewPointC}°C</strong></div>
                      <div>Pressure: <strong className="text-white">{station.pressureHpa} hPa</strong></div>
                      <div>Tendency: <strong className={station.tendency3h < 0 ? 'text-rose-400' : 'text-emerald-400'}>{station.tendency3h} hPa/3h</strong></div>
                      <div>Wind: <strong className="text-white">{station.windSpeedKt} kt @ {station.windDirDeg}°</strong></div>
                      <div>Gust: <strong className="text-amber-400">{station.windGustKt} kt</strong></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ACTIVE STORM CELLS (Footprint + Centroid Marker + Vectors + Intercepts) */}
          {filteredCells.map((cell) => {
            const isSelected = cell.cell_id === selectedCellId;
            const isExtreme = cell.severity === 'EXTREME' || cell.peak_dbz >= 64;
            const isSevere = cell.severity === 'SEVERE' || (cell.peak_dbz >= 52 && cell.peak_dbz < 64);
            const strokeColor = isExtreme ? '#ef4444' : isSevere ? '#f59e0b' : '#38bdf8';
            const radiusM = Math.min(Math.max(Math.sqrt(cell.area_km2 || 10) * 450, 900), 2800);

            // Vector projection endpoints (15m and 30m)
            const proj15 = computeProjectedCoord(cell.centroid_lat, cell.centroid_lon, cell.heading_deg, cell.velocity_kmh, 15);
            const proj30 = computeProjectedCoord(cell.centroid_lat, cell.centroid_lon, cell.heading_deg, cell.velocity_kmh, 30);

            // Uncertainty cone points
            const coneLeft = computeProjectedCoord(cell.centroid_lat, cell.centroid_lon, cell.heading_deg - 22, cell.velocity_kmh, 30);
            const coneRight = computeProjectedCoord(cell.centroid_lat, cell.centroid_lon, cell.heading_deg + 22, cell.velocity_kmh, 30);

            // Primary target for this cell
            const primaryTarget = cell.target_etas && cell.target_etas[0];
            const targetCoord = primaryTarget ? getTargetCoordinates(primaryTarget.target_name) : null;
            const midRayCoord: [number, number] | null = targetCoord ? [
              (cell.centroid_lat + targetCoord[0]) / 2,
              (cell.centroid_lon + targetCoord[1]) / 2
            ] : null;

            // Authentic continuous radar reflectivity echo contour
            const footprintPoints: [number, number][] = [];
            const rLat = radiusM / 111320;
            const rLon = radiusM / (111320 * Math.cos(cell.centroid_lat * (Math.PI / 180)));
            const headingRad = (cell.heading_deg * Math.PI) / 180;
            for (let i = 0; i < 16; i++) {
              const angle = (i / 16) * 2 * Math.PI;
              const perturb = 1 + 0.12 * Math.sin(3 * angle + cell.centroid_lat * 10) + 0.08 * Math.cos(5 * angle);
              const alongHeading = Math.cos(angle - headingRad);
              const elongation = 1 + 0.25 * alongHeading * alongHeading;
              footprintPoints.push([
                cell.centroid_lat + rLat * perturb * elongation * Math.sin(angle),
                cell.centroid_lon + rLon * perturb * elongation * Math.cos(angle)
              ]);
            }

            return (
              <React.Fragment key={cell.cell_id}>
                {/* 1. Authentic Smoothed Radar Reflectivity Core Footprint (Continuous dBZ Contour) */}
                <Polygon
                  positions={footprintPoints}
                  pathOptions={{
                    color: strokeColor,
                    fillColor: strokeColor,
                    fillOpacity: isSelected ? 0.45 : 0.26,
                    weight: isSelected ? 2.5 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => handleSelectCell(cell.cell_id, 14)
                  }}
                />

                {/* 2. Uncertainty Projection Cone */}
                {showVectors && (
                  <Polygon
                    positions={[
                      [cell.centroid_lat, cell.centroid_lon],
                      coneLeft,
                      proj30,
                      coneRight
                    ]}
                    pathOptions={{
                      color: strokeColor,
                      weight: 1,
                      dashArray: '3, 4',
                      fillColor: strokeColor,
                      fillOpacity: isSelected ? 0.15 : 0.05,
                    }}
                  />
                )}

                {/* 3. 0–30m Motion Vector Ray */}
                {showVectors && (
                  <Polyline
                    positions={[
                      [cell.centroid_lat, cell.centroid_lon],
                      proj15,
                      proj30
                    ]}
                    pathOptions={{
                      color: strokeColor,
                      weight: isSelected ? 3 : 2,
                      dashArray: '6, 4',
                      opacity: 0.9,
                    }}
                  />
                )}

                {/* 4. Dynamic Intercept Ray directly to Target Asset */}
                {showInterceptRays && targetCoord && primaryTarget && (
                  <>
                    <Polyline
                      positions={[
                        [cell.centroid_lat, cell.centroid_lon],
                        targetCoord
                      ]}
                      pathOptions={{
                        color: isExtreme ? '#ef4444' : isSelected ? '#38bdf8' : '#f59e0b',
                        weight: isSelected ? 3 : 1.5,
                        dashArray: '8, 6',
                        opacity: isSelected ? 0.95 : 0.7,
                      }}
                      eventHandlers={{
                        click: () => handleSelectCell(cell.cell_id, 14)
                      }}
                    />

                    {/* On-Map Intercept Floating Badge at Midpoint */}
                    {midRayCoord && (
                      <Marker
                        position={midRayCoord}
                        icon={createInterceptTagIcon(
                          primaryTarget.target_name,
                          primaryTarget.distance_km,
                          primaryTarget.eta_minutes,
                          isSelected
                        )}
                        eventHandlers={{
                          click: () => handleSelectCell(cell.cell_id, 14)
                        }}
                      />
                    )}
                  </>
                )}

                {/* 5. Storm Cell Centroid Marker */}
                <Marker
                  position={[cell.centroid_lat, cell.centroid_lon]}
                  icon={createStormIcon(cell, isSelected)}
                  eventHandlers={{
                    click: () => handleSelectCell(cell.cell_id, 14)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                    <div className="text-xs font-mono p-1">
                      <strong className="text-white">{cell.cell_id}</strong>: {cell.peak_dbz} dBZ • {cell.velocity_kmh} km/h
                    </div>
                  </Tooltip>
                </Marker>
              </React.Fragment>
            );
          })}

        </MapContainer>

        {/* Floating Colorbar Legend for Thermal IR Brightness Temperature / Doppler Radar dBZ */}
        <WeatherColorbarLegend format={weatherFormat} />

        {/* Floating On-Screen 1–3km Scale & Instruction HUD (Bottom-Left) */}
        <div className="absolute bottom-6 left-4 z-[400] bg-[#0a0f1d]/95 backdrop-blur-xl border border-[#1f293d] rounded-xl p-3 shadow-2xl max-w-xs pointer-events-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f293d]">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                1–3 km Aerodrome Radar
              </span>
            </div>
            <button
              onClick={() => setShowMissionGuide(true)}
              className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 underline"
            >
              Full Briefing &rarr;
            </button>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full border border-red-500 bg-red-500/30 shrink-0" />
              <span className="text-slate-300">
                <strong className="text-red-400">1 km Ring</strong>: Touchdown Zone
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full border border-amber-500 bg-amber-500/30 shrink-0" />
              <span className="text-slate-300">
                <strong className="text-amber-400">2 km Ring</strong>: Final Approach Alert
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full border border-sky-500 bg-sky-500/30 shrink-0" />
              <span className="text-slate-300">
                <strong className="text-sky-400">3 km Ring</strong>: Tactical Boundary
              </span>
            </div>
            <div className="pt-1.5 text-[10px] text-slate-400 border-t border-slate-800">
              ⚡ Intercept Ray: CELL-701 in <strong className="text-amber-300">1.8 km</strong> (3 min)
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RIGHT FLOATING HUD: LIVE SPATIAL INTERCEPT QUEUE */}
      {/* ========================================================================= */}
      <div className="absolute top-20 right-4 bottom-24 w-84 z-[400] pointer-events-none flex flex-col justify-start">
        <div className="pointer-events-auto bg-[#0a0f1d]/92 backdrop-blur-xl border border-[#1f293d] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-full">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#1f293d] bg-[#101728]/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Target Intercepts (ETA)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded">
              {allTargetArrivals.length} THREATS
            </span>
          </div>

          {/* List of Target Intercept Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {allTargetArrivals.map((item, idx) => {
              const isSelected = selectedCellId === item.cell.cell_id;
              const isImminent = item.eta_minutes < 6;
              const threatColor = isImminent ? 'border-rose-500/60 bg-rose-950/20' : isSelected ? 'border-sky-500/60 bg-sky-950/20' : 'border-[#1f293d] bg-[#0c1222]/70';

              return (
                <div
                  key={`${item.cell.cell_id}-${idx}`}
                  onClick={() => handleSelectCell(item.cell.cell_id, 14)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-sky-400/50 hover:bg-[#121c32] ${threatColor}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-white truncate">
                        <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">{item.target_name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center space-x-2">
                        <span>Threat: <strong className="text-sky-300">{item.cell.cell_id}</strong></span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{item.cell.peak_dbz} dBZ</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-mono font-black ${isImminent ? 'text-rose-400 animate-pulse' : 'text-sky-300'}`}>
                        {Math.floor(item.eta_minutes)}m {Math.floor((item.eta_minutes % 1) * 60)}s
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">
                        {item.eta_window_min}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5">
                    <div className="text-[10px] font-mono text-slate-400">
                      <span>{item.distance_km} km away</span>
                      <span className="mx-1">•</span>
                      <span>{item.cell.velocity_kmh} km/h</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDispatchCap(item.cell.cell_id);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-[10px] font-mono font-bold flex items-center space-x-1 transition-colors shadow-sm"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      <span>CAP Alert</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Airfield Aviation Status Pill at Bottom of Queue */}
          <div className="p-3 border-t border-[#1f293d] bg-[#0c1222] flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] uppercase">VEBS Runway 01</span>
              <div className="text-rose-400 font-black">GROUNDED (LLWS ΔV 48 m/s)</div>
            </div>
            <button
              onClick={() => setShowTableView(!showTableView)}
              className="px-2.5 py-1 rounded bg-[#172238] hover:bg-sky-500/20 text-sky-300 border border-[#2b3a55] text-[11px] font-mono font-semibold flex items-center space-x-1"
            >
              <Table className="w-3 h-3" />
              <span>{showTableView ? 'Hide Matrix' : 'Data Matrix'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM FLOATING DOCK: SPATIAL DIGITAL TWIN & PHYSICAL ATTRIBUTION */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 left-4 right-4 sm:right-92 z-[450] pointer-events-none">
        <div className="pointer-events-auto bg-[#0a0f1d]/95 backdrop-blur-xl border border-[#1f293d] rounded-xl p-3.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Selected Cell Identity & Live Coordinates */}
          <div className="flex items-center space-x-3.5 min-w-[240px]">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border font-mono font-black text-sm ${
              selectedCell.peak_dbz >= 64 
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' 
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            }`}>
              {selectedCell.peak_dbz.toFixed(0)}Z
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white font-mono">{selectedCell.cell_id}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                  selectedCell.peak_dbz >= 64 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {selectedCell.severity}
                </span>
                <span className="text-xs font-mono text-sky-400 font-semibold">
                  {selectedCell.cell_id === 'CELL-805' ? 'SEC-C [R1_C1]' : selectedCell.cell_id === 'CELL-912' ? 'SEC-N [R0_C1]' : 'SEC-S [R2_C1]'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Coord: {selectedCell.centroid_lat.toFixed(4)}°N, {selectedCell.centroid_lon.toFixed(4)}°E • Area: {selectedCell.area_km2} km²
              </div>
            </div>
          </div>

          {/* ConvectNet AI Physical Attribution (Spatial Diagnostics) */}
          <div className="flex-1 border-y md:border-y-0 md:border-x border-slate-800 py-2 md:py-0 md:px-4 text-xs font-mono space-y-1">
            <div className="flex items-center space-x-1.5 text-sky-400 font-bold text-[11px]">
              <Info className="w-3.5 h-3.5" />
              <span>SPATIAL CONVECTNET ATTRIBUTION & PHYSICAL DRIVER</span>
            </div>
            <div className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
              <strong className="text-white">Driver:</strong> {selectedCell.hazards?.explainability?.radar_core_driver || 'Core reflectivity aloft drives convective classification.'}
              {' '}<strong className="text-white">Trend:</strong> {selectedCell.evolution?.trend_summary || 'Maintaining extreme convective intensity.'}
            </div>
          </div>

          {/* Quick Metrics & Dispatch Button */}
          <div className="flex items-center space-x-4 shrink-0">
            <div className="text-right font-mono">
              <div className="text-xs text-slate-400">Rain Rate: <strong className="text-sky-300">{selectedCell.hazards?.rain_rate_mmh || 0} mm/h</strong></div>
              <div className="text-xs text-slate-400">Speed: <strong className="text-amber-300">{selectedCell.velocity_kmh} km/h @ {selectedCell.heading_deg}°</strong></div>
            </div>

            <button
              onClick={() => handleDispatchCap(selectedCell.cell_id)}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-mono font-bold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-rose-900/30"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>DISPATCH CAP</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SLIDE-UP DATA MATRIX DRAWER (When Toggled) */}
      {/* ========================================================================= */}
      {showTableView && (
        <div className="absolute inset-x-4 bottom-24 z-[550] bg-[#0a0f1d]/98 backdrop-blur-2xl border border-[#1f293d] rounded-xl p-4 shadow-2xl max-h-[380px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1f293d]">
            <div className="flex items-center space-x-2">
              <Table className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Full Convective Digital Twins Telemetry (Corridor 3x3)
              </h3>
            </div>
            <button
              onClick={() => setShowTableView(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#12192a] text-slate-400 border-b border-[#1f293d]">
                <th className="px-3 py-2">Threat ID</th>
                <th className="px-3 py-2">Coordinates</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Max Z</th>
                <th className="px-3 py-2">Rain Rate</th>
                <th className="px-3 py-2">Motion</th>
                <th className="px-3 py-2">Primary Target & ETA</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stormCells.map((cell) => {
                const isSelected = cell.cell_id === selectedCellId;
                const primaryTarget = cell.target_etas && cell.target_etas[0];

                return (
                  <tr
                    key={cell.cell_id}
                    onClick={() => {
                      handleSelectCell(cell.cell_id, 14);
                      setShowTableView(false);
                    }}
                    className={`cursor-pointer border-b border-[#1f293d]/50 hover:bg-[#152035] transition-colors ${
                      isSelected ? 'bg-sky-500/10' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-bold text-white">{cell.cell_id}</td>
                    <td className="px-3 py-2 text-slate-400">{cell.centroid_lat.toFixed(3)}°N, {cell.centroid_lon.toFixed(3)}°E</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cell.peak_dbz >= 64 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {cell.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-amber-400">{cell.peak_dbz} dBZ</td>
                    <td className="px-3 py-2 text-sky-300">{cell.hazards?.rain_rate_mmh || 0} mm/h</td>
                    <td className="px-3 py-2 text-slate-300">{cell.velocity_kmh} km/h @ {cell.heading_deg}°</td>
                    <td className="px-3 py-2 text-slate-300">
                      {primaryTarget ? (
                        <span>{primaryTarget.target_name} ({primaryTarget.distance_km}km, <strong>{primaryTarget.eta_minutes}m</strong>)</span>
                      ) : '--'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDispatchCap(cell.cell_id);
                        }}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                      >
                        CAP Alert
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CAP ALERT MODAL (Integrated) */}
      {/* ========================================================================= */}
      <CapAlertModal
        isOpen={activeCapCellId !== null}
        onClose={() => setActiveCapCellId(null)}
        cellId={activeCapCellId || 'CELL-805'}
      />

      {/* ========================================================================= */}
      {/* 7. MISSION & 1–3 KM SCALE EXPLAINER MODAL (Full Interactive Guide)       */}
      {/* ========================================================================= */}
      {showMissionGuide && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-sky-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
                  Operational Guide: Why 1–3 km Aerodrome Nowcasting?
                </h2>
              </div>
              <button 
                onClick={() => setShowMissionGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono leading-relaxed">
              {/* Point 1 */}
              <div className="p-3.5 bg-[#101726] border border-sky-500/30 rounded-xl space-y-1.5">
                <div className="text-sky-400 font-bold text-sm flex items-center gap-1.5">
                  <span>🎯</span> 1. The Core Purpose (SIH PS-26084)
                </div>
                <p className="text-slate-300">
                  Standard weather apps (Windy, Google Weather) forecast broad <strong>20–50 km</strong> regions ("Rain in Bhubaneswar today"). 
                  However, an aircraft landing at Biju Patnaik Airport (VEBS) cannot use a 25 km forecast. Air Traffic Control and pilots require <strong>1–3 km sub-kilometer precision</strong> to detect deadly microburst wind shear and sudden cloudbursts before touchdown.
                </p>
              </div>

              {/* Point 2 */}
              <div className="p-3.5 bg-[#101726] border border-amber-500/30 rounded-xl space-y-2">
                <div className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                  <span>⭕</span> 2. What the Map Circles & Rings Mean
                </div>
                <div className="space-y-1.5 text-slate-300">
                  <div>• <strong className="text-red-400">1 km Range Ring</strong>: Critical Runway Touchdown Zone (&lt;2 min to touchdown). Any severe storm here mandates an immediate go-around.</div>
                  <div>• <strong className="text-amber-400">2 km Range Ring</strong>: Final Approach Alert. <strong>CELL-701 is currently at 1.8 km</strong>, advancing at 46 km/h (ETA: 3 min).</div>
                  <div>• <strong className="text-sky-400">3 km Range Ring</strong>: Tactical Aerodrome Boundary mandated by MoES/NCMRWF.</div>
                  <div>• <strong className="text-white">Colored Solid Circles (e.g. CELL-701 red circle)</strong>: The actual convective storm core (3–4 km across) with intense reflectivity (&gt;60 dBZ) and microburst downdrafts.</div>
                </div>
              </div>

              {/* Point 3 */}
              <div className="p-3.5 bg-[#101726] border border-rose-500/30 rounded-xl space-y-1.5">
                <div className="text-rose-400 font-bold text-sm flex items-center gap-1.5">
                  <span>⚡</span> 3. Intercept Rays & Travel Time
                </div>
                <p className="text-slate-300">
                  The dashed line from a cell directly to Runway 19 shows the exact straight-line distance (<strong>1.8 km</strong>) and computed <strong>ETA (3 min)</strong> based on Doppler radial velocity.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                onClick={() => setShowMissionGuide(false)}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs shadow-lg transition active:scale-95"
              >
                Understood &bull; Return to Radar Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Intel & Decision Key */}
      <VisualIntelDecisionKey page="tactical" />
    </div>
  );
};

export default TacticalOperationsDashboard;
