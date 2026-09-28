import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Rectangle, Popup, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Grid, Radio } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { 
  TACTICAL_3X3_GRID, 
  SURROUNDING_AWS_STATIONS, 
  TacticalSector, 
  SurfaceAwsStation,
  VEBS_AIRPORT_SPECS 
} from '../types/tacticalGrid';

// Fix Leaflet default icon resolution
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============================================================================
// GEOGRAPHIC CONSTANTS: BIJU PATNAIK INTERNATIONAL AIRPORT (VEBS / BBI)
// ============================================================================

/** Airport aerodrome reference point */
export const VEBS_AIRPORT_CENTER: [number, number] = VEBS_AIRPORT_SPECS.center;

/** Tactical corridor domain outer clamp (Lat 20.00–20.60, Lon 85.50–86.10) */
export const VEBS_DOMAIN_BOUNDS: [[number, number], [number, number]] = [
  [20.00, 85.50], // SW corner
  [20.60, 86.10], // NE corner
];

/** Airfield operational security perimeter */
export const VEBS_PERIMETER_BOUNDS: [[number, number], [number, number]] = VEBS_AIRPORT_SPECS.perimeter;

/** Runway 01 / 19: Primary Instrument Runway (011° / 191° heading, 2743m x 45m) */
export const RUNWAY_01_19: [[number, number], [number, number]] = VEBS_AIRPORT_SPECS.runway01_19;

// Key aerodrome facility coordinates
export const VEBS_TERMINAL_1_2: [number, number] = VEBS_AIRPORT_SPECS.terminal1_2;
export const VEBS_ATC_TOWER: [number, number] = VEBS_AIRPORT_SPECS.atcTower;
export const VEBS_MAIN_APRON: [number, number] = VEBS_AIRPORT_SPECS.apronMain;

// BACKWARD-COMPATIBILITY ALIASES FOR CCU
export const CCU_AIRPORT_CENTER = VEBS_AIRPORT_CENTER;
export const CCU_AIRPORT_BOUNDS = VEBS_DOMAIN_BOUNDS;
export const CCU_PERIMETER_BOUNDS = VEBS_PERIMETER_BOUNDS;
export const RUNWAY_19L_01R = RUNWAY_01_19;
export const RUNWAY_19R_01L = RUNWAY_01_19;
export const CCU_TERMINAL_2 = VEBS_TERMINAL_1_2;
export const CCU_ATC_TOWER = VEBS_ATC_TOWER;
export const CCU_MAIN_APRON = VEBS_MAIN_APRON;

// ============================================================================
// RESILIENT TRI-PROVIDER TILE CONFIGURATION (KEYLESS)
// ============================================================================

export type TileProviderId = 'cartoDark' | 'esriSatellite' | 'osmStandard';

export interface TileProviderConfig {
  id: TileProviderId;
  name: string;
  url: string;
  subdomains?: string;
  maxZoom: number;
  maxNativeZoom: number;
  attribution: string;
}

export const TILE_PROVIDERS: Record<TileProviderId, TileProviderConfig> = {
  esriSatellite: {
    id: 'esriSatellite',
    name: 'Satellite HD',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    maxNativeZoom: 19,
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
  },
  cartoDark: {
    id: 'cartoDark',
    name: 'Dark Canvas',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abc',
    maxZoom: 19,
    maxNativeZoom: 19,
    attribution: 'Tiles &copy; Esri',
  },
  osmStandard: {
    id: 'osmStandard',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    maxNativeZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
};

// ============================================================================
// HELPER: BUILT-IN MAP RESIZER HOOK
// ============================================================================

export const MapResizer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const t1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const t2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};

// ============================================================================
// HELPER: BADGE DIVICON BUILDER
// ============================================================================

function createTacticalBadge(label: string, sublabel?: string, color: string = '#00e5ff', bg: string = 'rgba(8,9,10,0.88)') {
  return L.divIcon({
    className: 'tactical-airport-badge',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        background: ${bg};
        border: 1px solid ${color};
        border-radius: 4px;
        padding: 2px 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.7);
        backdrop-filter: blur(4px);
        transform: translate(-50%, -50%);
        pointer-events: none;
        white-space: nowrap;
        user-select: none;
      ">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 700; color: ${color}; letter-spacing: 0.5px;">
          ${label}
        </span>
        ${sublabel ? `<span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 8px; color: #94a3b8; margin-left: 4px; border-left: 1px solid rgba(148,163,184,0.3); padding-left: 4px;">${sublabel}</span>` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createAwsIcon(station: SurfaceAwsStation) {
  const isSevere = station.status === 'SEVERE_ALERT';
  const isWarning = station.status === 'WARNING';
  const color = isSevere ? '#ef4444' : isWarning ? '#f59e0b' : '#38bdf8';

  return L.divIcon({
    className: 'tactical-aws-pin',
    html: `
      <div style="
        display: flex;
        align-items: center;
        background: rgba(10, 15, 26, 0.92);
        border: 1px solid ${color};
        border-radius: 4px;
        padding: 2px 5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.8);
        transform: translate(-50%, -50%);
        white-space: nowrap;
        cursor: pointer;
      ">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; margin-right: 4px; ${isSevere ? 'animation: pulse 1.5s infinite;' : ''}"></span>
        <span style="font-family: monospace; font-size: 9px; font-weight: 700; color: #f8fafc;">${station.id}</span>
        <span style="font-family: monospace; font-size: 8px; color: ${color}; margin-left: 4px;">${station.tempC}°C</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface TacticalAirportMapEngineProps {
  children?: React.ReactNode;
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  scrollWheelZoom?: boolean;
  dragging?: boolean;
  zoomControl?: boolean;
  showRunways?: boolean;
  showInfrastructure?: boolean;
  showPerimeter?: boolean;
  showTacticalGrid?: boolean;
  showAwsStations?: boolean;
  selectedSectorId?: string | null;
  onSelectSector?: (sector: TacticalSector) => void;
  selectedAwsId?: string | null;
  onSelectAws?: (station: SurfaceAwsStation) => void;
  showProviderToggle?: boolean;
  providerTogglePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  initialProvider?: TileProviderId;
  className?: string;
  style?: React.CSSProperties;
  onMapReady?: (map: L.Map) => void;
}

// ============================================================================
// MAIN COMPONENT: TACTICAL AIRPORT MAP ENGINE
// ============================================================================

export const TacticalAirportMapEngine: React.FC<TacticalAirportMapEngineProps> = ({
  children,
  center = VEBS_AIRPORT_CENTER,
  zoom = 13,
  minZoom = 9,
  maxZoom = 18,
  scrollWheelZoom = true,
  dragging = true,
  zoomControl = false,
  showRunways = true,
  showInfrastructure = true,
  showPerimeter = true,
  showTacticalGrid = true,
  showAwsStations = true,
  selectedSectorId = null,
  onSelectSector,
  selectedAwsId = null,
  onSelectAws,
  showProviderToggle = true,
  providerTogglePosition = 'top-right',
  initialProvider = 'esriSatellite',
  className = 'w-full h-full',
  style = { height: '100%', width: '100%', zIndex: 1, backgroundColor: '#08090a' },
  onMapReady,
}) => {
  const [activeProvider, setActiveProvider] = useState<TileProviderId>(initialProvider);
  const [gridVisible, setGridVisible] = useState(showTacticalGrid);
  const [awsVisible, setAwsVisible] = useState(showAwsStations);
  const currentProvider = TILE_PROVIDERS[activeProvider];

  // Cached badges for airfield landmarks
  const badge01 = useMemo(() => createTacticalBadge('RWY 01', 'Touchdown 011°', '#38bdf8'), []);
  const badge19 = useMemo(() => createTacticalBadge('RWY 19', 'Threshold 191°', '#38bdf8'), []);
  const badgeT1 = useMemo(() => createTacticalBadge('VEBS T1/T2', 'Passenger Terminal', '#f7f8f8', 'rgba(15,16,17,0.92)'), []);
  const badgeATC = useMemo(() => createTacticalBadge('VEBS ATC / MWO', '118.1 MHz', '#eab308', 'rgba(15,16,17,0.92)'), []);
  const badgeApron = useMemo(() => createTacticalBadge('APRON', 'Bays 1–8', '#94a3b8', 'rgba(15,16,17,0.92)'), []);

  const togglePositionClasses: Record<string, string> = {
    'top-right': 'top-3 right-3',
    'top-left': 'top-3 left-3',
    'bottom-right': 'bottom-3 right-3',
    'bottom-left': 'bottom-3 left-3',
  };
  const positionClass = togglePositionClasses[providerTogglePosition] || 'top-3 right-3';

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        maxBounds={VEBS_DOMAIN_BOUNDS}
        maxBoundsViscosity={0.9}
        scrollWheelZoom={scrollWheelZoom}
        dragging={dragging}
        zoomControl={zoomControl}
        className={className}
        style={style}
      >
        <MapResizer />
        {onMapReady && <MapEventsHelper onMapReady={onMapReady} />}

        {/* Resilient Raster Base Layer */}
        <TileLayer
          key={currentProvider.id}
          url={currentProvider.url}
          subdomains={currentProvider.subdomains || 'abc'}
          maxZoom={currentProvider.maxZoom}
          maxNativeZoom={currentProvider.maxNativeZoom}
          attribution={currentProvider.attribution}
          opacity={activeProvider === 'esriSatellite' ? 0.85 : 1.0}
        />

        {/* 3x3 Tactical Sector Grid Overlay */}
        {gridVisible && (
          <>
            {TACTICAL_3X3_GRID.map((sec) => {
              const isSelected = selectedSectorId === sec.id;
              const isExtreme = sec.cloudburstFlag || sec.radarDbz >= 60;
              const isSevere = sec.radarDbz >= 50;
              const color = isExtreme ? '#ef4444' : isSevere ? '#f97316' : '#38bdf8';

              return (
                <React.Fragment key={sec.id}>
                  <Rectangle
                    bounds={[
                      [sec.latMin, sec.lonMin],
                      [sec.latMax, sec.lonMax],
                    ]}
                    pathOptions={{
                      color: isSelected ? '#ffffff' : color,
                      weight: isSelected ? 2.5 : 1.2,
                      dashArray: isSelected ? undefined : '5, 5',
                      fillColor: color,
                      fillOpacity: isSelected ? 0.20 : isExtreme ? 0.15 : 0.05,
                    }}
                    eventHandlers={{
                      click: () => onSelectSector && onSelectSector(sec),
                    }}
                  >
                    <Popup className="dark-gis-popup">
                      <div className="p-2 text-xs font-mono space-y-1 bg-slate-950 text-slate-100 rounded">
                        <div className="font-bold text-sky-400">{sec.id} [{sec.code}]</div>
                        <div className="text-slate-300 font-sans font-medium">{sec.name}</div>
                        <div className="border-t border-slate-800 pt-1 grid grid-cols-2 gap-1 text-[11px]">
                          <div>Radar: <span className="font-bold text-amber-400">{sec.radarDbz} dBZ</span></div>
                          <div>Rain: <span className="font-bold text-sky-300">{sec.rainRateMmh} mm/h</span></div>
                          <div>Wind: <span className="text-slate-200">{sec.windGustKmh} km/h</span></div>
                          <div>CAPE: <span className="text-rose-400">{sec.capeJkg} J/kg</span></div>
                        </div>
                        {sec.cloudburstFlag && (
                          <div className="mt-1 px-1.5 py-0.5 bg-red-950 text-red-300 border border-red-700 rounded text-[10px] font-bold text-center">
                            CLOUDBURST ALERT &gt;100 MM/H
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Rectangle>

                  {/* Sector Label Badge */}
                  <Marker
                    position={[sec.latMax - 0.02, sec.lonMin + 0.03]}
                    icon={L.divIcon({
                      className: 'sector-badge',
                      html: `
                        <div style="
                          font-family: monospace;
                          font-size: 9px;
                          font-weight: 700;
                          color: ${color};
                          background: rgba(10,15,26,0.85);
                          border: 1px solid ${color}66;
                          padding: 1px 4px;
                          border-radius: 3px;
                          white-space: nowrap;
                          pointer-events: none;
                        ">
                          ${sec.id} • ${sec.radarDbz} dBZ
                        </div>
                      `,
                      iconSize: [0, 0],
                      iconAnchor: [0, 0],
                    })}
                  />
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* 9 In-Situ Surface AWS Stations */}
        {awsVisible && (
          <>
            {SURROUNDING_AWS_STATIONS.map((station) => (
              <Marker
                key={station.id}
                position={[station.lat, station.lon]}
                icon={createAwsIcon(station)}
                eventHandlers={{
                  click: () => onSelectAws && onSelectAws(station),
                }}
              >
                <Popup className="dark-gis-popup">
                  <div className="p-2 text-xs font-mono space-y-1 bg-slate-950 text-slate-100 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sky-400">{station.id}</span>
                      <span className="text-[10px] text-slate-400">WMO {station.code}</span>
                    </div>
                    <div className="text-slate-300 font-sans">{station.name}</div>
                    <div className="border-t border-slate-800 pt-1 grid grid-cols-2 gap-1 text-[11px]">
                      <div>Temp: <span className="font-bold text-amber-300">{station.tempC}°C</span> (Td {station.dewPointC}°C)</div>
                      <div>Press: <span className="text-slate-200">{station.pressureHpa} hPa ({station.tendency3h}hPa/3h)</span></div>
                      <div>Wind: <span className="font-bold text-sky-300">{station.windDirDeg}° @ {station.windSpeedKt}kt (G{station.windGustKt}kt)</span></div>
                      <div>1h Rain: <span className="text-emerald-400">{station.rain1hMm} mm</span></div>
                      <div>CAPE: <span className="text-rose-400">{station.capeJkg} J/kg</span></div>
                      <div>RH: <span className="text-slate-300">{station.humidityPct}%</span></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {/* Airfield Perimeter Fence */}
        {showPerimeter && (
          <Rectangle
            bounds={VEBS_PERIMETER_BOUNDS}
            pathOptions={{
              color: '#38bdf8',
              weight: 1.5,
              dashArray: '6 6',
              fillColor: '#38bdf8',
              fillOpacity: 0.02,
            }}
          />
        )}

        {/* Airfield Runways */}
        {showRunways && (
          <>
            {/* Runway 01 / 19 Base Tarmac */}
            <Polyline
              positions={RUNWAY_01_19}
              pathOptions={{
                color: '#020617',
                weight: 12,
                opacity: 0.95,
                lineCap: 'square',
              }}
            />
            {/* Runway 01 / 19 Surface */}
            <Polyline
              positions={RUNWAY_01_19}
              pathOptions={{
                color: '#1e293b',
                weight: 8,
                opacity: 0.9,
                lineCap: 'square',
              }}
            />
            {/* Runway 01 / 19 High-Contrast Centerline */}
            <Polyline
              positions={RUNWAY_01_19}
              pathOptions={{
                color: '#38bdf8',
                weight: 1.8,
                dashArray: '6 6',
                opacity: 0.95,
              }}
            />

            {/* Runway Threshold Markers - subtle, clean and non-colliding */}
            <CircleMarker
              center={RUNWAY_01_19[0]}
              radius={5}
              pathOptions={{ color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.9, weight: 2 }}
            >
              <Tooltip direction="top" className="!bg-black/90 !text-cyan-300 !font-mono !text-[10px] !font-bold">
                ✈️ RWY 01 Touchdown (011°)
              </Tooltip>
            </CircleMarker>
            <CircleMarker
              center={RUNWAY_01_19[1]}
              radius={5}
              pathOptions={{ color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.9, weight: 2 }}
            >
              <Tooltip direction="top" className="!bg-black/90 !text-cyan-300 !font-mono !text-[10px] !font-bold">
                ✈️ RWY 19 Threshold (191°)
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Airport Infrastructure Markers - subtle dots with tooltip on hover */}
        {showInfrastructure && (
          <>
            <CircleMarker center={VEBS_TERMINAL_1_2} radius={6} pathOptions={{ color: '#ffffff', fillColor: '#38bdf8', fillOpacity: 0.9, weight: 1.5 }}>
              <Tooltip direction="top" className="!bg-black/90 !text-white !font-mono !text-[10px]">
                🏢 VEBS Passenger Terminals 1 &amp; 2
              </Tooltip>
            </CircleMarker>
            <CircleMarker center={VEBS_ATC_TOWER} radius={6} pathOptions={{ color: '#ffffff', fillColor: '#eab308', fillOpacity: 0.9, weight: 1.5 }}>
              <Tooltip direction="top" className="!bg-black/90 !text-amber-300 !font-mono !text-[10px]">
                📡 VEBS ATC Tower (118.1 MHz)
              </Tooltip>
            </CircleMarker>
            <CircleMarker center={VEBS_MAIN_APRON} radius={5} pathOptions={{ color: '#ffffff', fillColor: '#94a3b8', fillOpacity: 0.8, weight: 1.5 }}>
              <Tooltip direction="top" className="!bg-black/90 !text-slate-300 !font-mono !text-[10px]">
                🅿️ Main Apron (Bays 1–8)
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* User-provided vector overlays */}
        {children}
      </MapContainer>

      {/* Floating Tactical Layer & Provider Control */}
      {showProviderToggle && (
        <div
          className={`absolute ${positionClass} z-[400] flex items-center bg-[#08090a]/92 backdrop-blur-md border border-[#34343a] rounded-lg p-1 space-x-1.5 shadow-xl`}
        >
          {/* 3x3 Grid Toggle */}
          <button
            type="button"
            onClick={() => setGridVisible(!gridVisible)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center space-x-1 transition-colors ${
              gridVisible
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>3x3 Grid</span>
          </button>

          {/* AWS Network Toggle */}
          <button
            type="button"
            onClick={() => setAwsVisible(!awsVisible)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center space-x-1 transition-colors ${
              awsVisible
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>AWS (9)</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Tile Selector */}
          <div className="flex items-center pl-1 text-[#8a8f98]">
            <Layers className="w-3 h-3 mr-1 text-[#38bdf8]" />
          </div>
          <button
            type="button"
            onClick={() => setActiveProvider('cartoDark')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
              activeProvider === 'cartoDark'
                ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setActiveProvider('esriSatellite')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
              activeProvider === 'esriSatellite'
                ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setActiveProvider('osmStandard')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
              activeProvider === 'osmStandard'
                ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            OSM
          </button>
        </div>
      )}
    </div>
  );
};

// Internal map ready dispatcher
const MapEventsHelper: React.FC<{ onMapReady: (map: L.Map) => void }> = ({ onMapReady }) => {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
};

export default TacticalAirportMapEngine;
