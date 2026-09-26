import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon resolution
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============================================================================
// GEOGRAPHIC CONSTANTS: NETAJI SUBHAS CHANDRA BOSE INTERNATIONAL AIRPORT (CCU)
// ============================================================================

/** Airport aerodrome reference point */
export const CCU_AIRPORT_CENTER: [number, number] = [22.6540, 88.4460];

/** 3x3 km outer bounding box clamp (Lat 22.6400–22.6680, Lon 88.4310–88.4610) */
export const CCU_AIRPORT_BOUNDS: [[number, number], [number, number]] = [
  [22.6400, 88.4310], // SW corner
  [22.6680, 88.4610], // NE corner
];

/** Airfield operational security perimeter */
export const CCU_PERIMETER_BOUNDS: [[number, number], [number, number]] = [
  [22.6450, 88.4350], // SW perimeter fence
  [22.6650, 88.4550], // NE perimeter fence
];

/** Runway 19L / 01R: Primary Instrument Runway (013° / 193° heading, 3627m x 45m) */
export const RUNWAY_19L_01R: [[number, number], [number, number]] = [
  [22.6380, 88.4480], // Runway 01R Threshold (South)
  [22.6680, 88.4520], // Runway 19L Threshold (North)
];

/** Runway 19R / 01L: Secondary Parallel Runway (2790m x 45m) */
export const RUNWAY_19R_01L: [[number, number], [number, number]] = [
  [22.6450, 88.4410], // Runway 01L Threshold (South)
  [22.6650, 88.4440], // Runway 19R Threshold (North)
];

// Key aerodrome facility coordinates
export const CCU_TERMINAL_2: [number, number] = [22.6535, 88.4435];
export const CCU_ATC_TOWER: [number, number] = [22.6548, 88.4475];
export const CCU_MAIN_APRON: [number, number] = [22.6515, 88.4445];

// ============================================================================
// RESILIENT TRI-PROVIDER TILE CONFIGURATION
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
  cartoDark: {
    id: 'cartoDark',
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    maxNativeZoom: 20,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  esriSatellite: {
    id: 'esriSatellite',
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    maxNativeZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  osmStandard: {
    id: 'osmStandard',
    name: 'OSM Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    maxNativeZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

// ============================================================================
// HELPER: BUILT-IN MAP RESIZER HOOK
// ============================================================================

export const MapResizer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Invalidate immediately on mount and after render flush
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
  center = CCU_AIRPORT_CENTER,
  zoom = 16,
  minZoom = 15,
  maxZoom = 18,
  scrollWheelZoom = true,
  dragging = true,
  zoomControl = false,
  showRunways = true,
  showInfrastructure = true,
  showPerimeter = true,
  showProviderToggle = true,
  providerTogglePosition = 'top-right',
  initialProvider = 'cartoDark',
  className = 'w-full h-full',
  style = { height: '100%', width: '100%', zIndex: 1, backgroundColor: '#08090a' },
  onMapReady,
}) => {
  const [activeProvider, setActiveProvider] = useState<TileProviderId>(initialProvider);
  const currentProvider = TILE_PROVIDERS[activeProvider];

  // Cached badges for airfield landmarks
  const badge19L = useMemo(() => createTacticalBadge('RWY 19L', '3627m CAT-IIIb', '#00e5ff'), []);
  const badge01R = useMemo(() => createTacticalBadge('RWY 01R', 'Touchdown', '#00e5ff'), []);
  const badge19R = useMemo(() => createTacticalBadge('RWY 19R', '2790m', '#38a8ff'), []);
  const badge01L = useMemo(() => createTacticalBadge('RWY 01L', 'Touchdown', '#38a8ff'), []);
  const badgeT2 = useMemo(() => createTacticalBadge('CCU T2', 'Passenger Terminal', '#f7f8f8', 'rgba(15,16,17,0.92)'), []);
  const badgeATC = useMemo(() => createTacticalBadge('ATC TWR', '118.1 MHz', '#eab308', 'rgba(15,16,17,0.92)'), []);
  const badgeApron = useMemo(() => createTacticalBadge('APRON', 'Stands 1–32', '#94a3b8', 'rgba(15,16,17,0.92)'), []);

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
        maxBounds={CCU_AIRPORT_BOUNDS}
        maxBoundsViscosity={1.0}
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
          subdomains={currentProvider.subdomains}
          maxZoom={currentProvider.maxZoom}
          maxNativeZoom={currentProvider.maxNativeZoom}
          attribution={currentProvider.attribution}
          opacity={activeProvider === 'esriSatellite' ? 0.85 : 1.0}
        />

        {/* Airfield Perimeter Fence */}
        {showPerimeter && (
          <Rectangle
            bounds={CCU_PERIMETER_BOUNDS}
            pathOptions={{
              color: '#00e5ff',
              weight: 1.5,
              dashArray: '6 6',
              fillColor: '#00e5ff',
              fillOpacity: 0.02,
            }}
          />
        )}

        {/* Airfield Runways */}
        {showRunways && (
          <>
            {/* Runway 19L / 01R Base Tarmac */}
            <Polyline
              positions={RUNWAY_19L_01R}
              pathOptions={{
                color: '#020617',
                weight: 10,
                opacity: 0.95,
                lineCap: 'square',
              }}
            />
            {/* Runway 19L / 01R Surface */}
            <Polyline
              positions={RUNWAY_19L_01R}
              pathOptions={{
                color: '#1e293b',
                weight: 7,
                opacity: 0.9,
                lineCap: 'square',
              }}
            />
            {/* Runway 19L / 01R High-Contrast Centerline */}
            <Polyline
              positions={RUNWAY_19L_01R}
              pathOptions={{
                color: '#00e5ff',
                weight: 1.5,
                dashArray: '6 6',
                opacity: 0.95,
              }}
            />

            {/* Runway 19R / 01L Base Tarmac */}
            <Polyline
              positions={RUNWAY_19R_01L}
              pathOptions={{
                color: '#020617',
                weight: 8,
                opacity: 0.9,
                lineCap: 'square',
              }}
            />
            {/* Runway 19R / 01L Surface */}
            <Polyline
              positions={RUNWAY_19R_01L}
              pathOptions={{
                color: '#1e293b',
                weight: 5,
                opacity: 0.85,
                lineCap: 'square',
              }}
            />
            {/* Runway 19R / 01L Centerline */}
            <Polyline
              positions={RUNWAY_19R_01L}
              pathOptions={{
                color: '#94a3b8',
                weight: 1.2,
                dashArray: '4 4',
                opacity: 0.8,
              }}
            />

            {/* Runway Threshold Markers */}
            <Marker position={[22.6680, 88.4520]} icon={badge19L} />
            <Marker position={[22.6380, 88.4480]} icon={badge01R} />
            <Marker position={[22.6650, 88.4440]} icon={badge19R} />
            <Marker position={[22.6450, 88.4410]} icon={badge01L} />
          </>
        )}

        {/* Airport Infrastructure Markers */}
        {showInfrastructure && (
          <>
            <Marker position={CCU_TERMINAL_2} icon={badgeT2} />
            <Marker position={CCU_ATC_TOWER} icon={badgeATC} />
            <Marker position={CCU_MAIN_APRON} icon={badgeApron} />
          </>
        )}

        {/* User-provided vector overlays (Grid sectors, radar contours, storm tracks) */}
        {children}
      </MapContainer>

      {/* Tri-Provider Floating Selector */}
      {showProviderToggle && (
        <div
          className={`absolute ${positionClass} z-[400] flex items-center bg-[#08090a]/90 backdrop-blur-md border border-[#34343a] rounded-lg p-1 space-x-1 shadow-xl`}
        >
          <div className="flex items-center pl-1.5 pr-1 text-[#8a8f98]">
            <Layers className="w-3.5 h-3.5 mr-1 text-[#00e5ff]" />
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider hidden sm:inline">Tiles</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveProvider('cartoDark')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
              activeProvider === 'cartoDark'
                ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 shadow-sm'
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
                ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 shadow-sm'
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
                ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 shadow-sm'
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
