import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import TileWMS from 'ol/source/TileWMS';
import ImageWMS from 'ol/source/ImageWMS';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import 'ol/ol.css';

import { MapLayerConfig, StormCellFeature } from '../types';
import { HISTORICAL_AWS_STATIONS } from '../utils/historicalFallbackData';
import { getRadarColor } from '../utils/colorScales';

// Center: Cherrapunji / Sohra DWR (25.2702°N, 91.7323°E)
const SOHRA_COORDS = [91.7323, 25.2702];
const SOHRA_WEB_MERCATOR = fromLonLat(SOHRA_COORDS);

interface MapViewProps {
  layersConfig: MapLayerConfig[];
  activeLeadTimeMin: number;
  isReplayMode: boolean;
  replayStepIndex: number;
  stormCells: StormCellFeature[];
  onSelectCell: (lat: number, lon: number) => void;
  clickedCoords: { lat: number; lon: number } | null;
}

export const MapView: React.FC<MapViewProps> = ({
  layersConfig,
  activeLeadTimeMin,
  isReplayMode,
  replayStepIndex,
  stormCells,
  onSelectCell,
  clickedCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  // References to dynamic OpenLayers layer instances
  const olLayersRef = useRef<{ [key: string]: any }>({});
  const stormVectorSourceRef = useRef<VectorSource | null>(null);
  const inspectMarkerSourceRef = useRef<VectorSource | null>(null);
  const radarCanvasSourceRef = useRef<VectorSource | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 0. Base Dark Cartography (CartoDB Dark — no API key, never blocked)
    const baseCartoLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        crossOrigin: 'anonymous',
        attributions: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      }),
    });

    const baseReferenceLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
        crossOrigin: 'anonymous',
      }),
      opacity: 0.85,
    });

    // 1. Administrative Boundaries & Meghalaya River Basins (Bhuvan WMS)
    const bhuvanStateLayer = new TileLayer({
      source: new TileWMS({
        url: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
        params: {
          LAYERS: 'state_ql_new',
          TILED: true,
          VERSION: '1.1.1',
          FORMAT: 'image/png',
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
    });

    // 2. Meghalaya River Basins (Brahmaputra & Barak Basins)
    const bhuvanBasinLayer = new TileLayer({
      source: new TileWMS({
        url: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
        params: {
          LAYERS: 'hydrology:BDRN_2B_Brahmaputra,hydrology:BDRN_2C_BarakOth',
          TILED: true,
          VERSION: '1.1.1',
          FORMAT: 'image/png',
          TRANSPARENT: true,
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
    });

    // 3. IMD INSAT-3DR Thermal IR Satellite Imagery (10.8 µm)
    const imdInsatIrLayer = new TileLayer({
      source: new TileWMS({
        url: 'https://reactjs.imd.gov.in/geoserver/imd/wms',
        params: {
          LAYERS: 'imd:insat_ir',
          TILED: true,
          VERSION: '1.3.0',
          FORMAT: 'image/png',
          TRANSPARENT: true,
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
    });

    // 4. Bhuvan Real-Time Hourly Lightning Strikes & Grid
    const bhuvanLightningLayer = new ImageLayer({
      source: new ImageWMS({
        url: 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/light.exe',
        params: {
          LAYERS: 'lighthourly,grid',
          VERSION: '1.3.0',
          FORMAT: 'image/png',
          TRANSPARENT: true,
        },
        serverType: 'mapserver',
        crossOrigin: 'anonymous',
      }),
    });

    // 5. Bhuvan Topography & Khasi Hills Escarpment DEM Overlay
    const bhuvanTerrainLayer = new TileLayer({
      source: new TileWMS({
        url: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
        params: {
          LAYERS: 'basemap:admin_group_ntl',
          TILED: true,
          VERSION: '1.1.1',
          FORMAT: 'image/png',
          TRANSPARENT: true,
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
    });

    // 6. IMD Automatic Weather Stations (AWS) Vector Points
    const awsVectorSource = new VectorSource();
    // Populate AWS stations from realistic telemetry
    HISTORICAL_AWS_STATIONS.forEach((stn) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([stn.lon, stn.lat])),
        name: stn.name,
        temp: stn.temp,
        rh: stn.rh,
        rain: stn.rain1h,
        wind: `${stn.windSpeed} km/h`,
      });
      awsVectorSource.addFeature(feature);
    });

    const imdAwsLayer = new VectorLayer({
      source: awsVectorSource,
      style: (feature) => {
        const rain = feature.get('rain') || 0;
        const name = feature.get('name') || '';
        const temp = feature.get('temp') || '';
        return new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: rain > 20 ? '#ef4444' : rain > 0 ? '#1888ef' : '#10b981' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
          text: new Text({
            text: `${name}\n${temp}°C | ${rain}mm/h`,
            offsetY: -18,
            font: '10px JetBrains Mono, monospace',
            fill: new Fill({ color: '#f8fafc' }),
            backgroundFill: new Fill({ color: 'rgba(10, 13, 21, 0.85)' }),
            padding: [2, 4, 2, 4],
          }),
        });
      },
    });

    // 7. Radar Reflectivity & Composite Layer (Dynamic Vector/Raster Mesh)
    const radarSource = new VectorSource();
    radarCanvasSourceRef.current = radarSource;

    const radarCompositeLayer = new VectorLayer({
      source: radarSource,
      style: (feature) => {
        const dbz = feature.get('dbz') || 20;
        const color = getRadarColor(dbz);
        return new Style({
          fill: new Fill({ color: color + '99' }), // with opacity
          stroke: new Stroke({ color: color, width: 1 }),
        });
      },
    });

    // 8. Storm Cell Kinematics & Tracking Vectors
    const stormVectorSource = new VectorSource();
    stormVectorSourceRef.current = stormVectorSource;

    const stormCellsLayer = new VectorLayer({
      source: stormVectorSource,
      style: (feature) => {
        const type = feature.get('featureType');
        if (type === 'cell_center') {
          const maxDbz = feature.get('maxDbz');
          const name = feature.get('name');
          const speed = feature.get('speed');
          return new Style({
            image: new CircleStyle({
              radius: 9,
              fill: new Fill({ color: '#d500f9' }),
              stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            }),
            text: new Text({
              text: `⚡ ${name}\n${maxDbz} dBZ · ${speed} km/h`,
              offsetY: -22,
              font: 'bold 11px JetBrains Mono, monospace',
              fill: new Fill({ color: '#ffffff' }),
              backgroundFill: new Fill({ color: 'rgba(213, 0, 249, 0.85)' }),
              padding: [2, 6, 2, 6],
            }),
          });
        } else if (type === 'motion_vector') {
          return new Style({
            stroke: new Stroke({
              color: '#00e5ff',
              width: 3,
              lineDash: [6, 4],
            }),
          });
        } else if (type === 'cell_polygon') {
          const severity = feature.get('severity');
          const color = severity === 'EXTREME' ? '#d500f9' : severity === 'SEVERE' ? '#ff0000' : '#ffff00';
          return new Style({
            stroke: new Stroke({
              color: color,
              width: 2,
            }),
            fill: new Fill({
              color: color + '33',
            }),
          });
        }
        return new Style({});
      },
    });

    // 9. Sohra Radar Range Rings (50, 100, 150, 250 km)
    const rangeRingSource = new VectorSource();
    const ringDistances = [50, 100, 150, 250];

    // Cherrapunji DWR marker
    const dwrMarker = new Feature({
      geometry: new Point(SOHRA_WEB_MERCATOR),
      featureType: 'radar_site',
    });
    rangeRingSource.addFeature(dwrMarker);

    ringDistances.forEach((km) => {
      // Create a smooth polygon circle for each radius in Web Mercator
      const points = 64;
      const ringCoords: number[][] = [];
      const radiusMeters = km * 1000;
      for (let i = 0; i <= points; i++) {
        const angle = (i * 2 * Math.PI) / points;
        const dx = radiusMeters * Math.sin(angle);
        const dy = radiusMeters * Math.cos(angle);
        ringCoords.push([SOHRA_WEB_MERCATOR[0] + dx, SOHRA_WEB_MERCATOR[1] + dy]);
      }
      const ringFeature = new Feature({
        geometry: new Polygon([ringCoords]),
        kmLabel: `${km} km`,
      });
      rangeRingSource.addFeature(ringFeature);
    });

    const rangeRingsLayer = new VectorLayer({
      source: rangeRingSource,
      style: (feature) => {
        const isSite = feature.get('featureType') === 'radar_site';
        if (isSite) {
          return new Style({
            image: new CircleStyle({
              radius: 7,
              fill: new Fill({ color: '#1888ef' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 }),
            }),
            text: new Text({
              text: 'SOHRA DWR (25.27°N, 91.73°E)\nRadar Elevation 1,430m',
              offsetY: 20,
              font: 'bold 11px JetBrains Mono, monospace',
              fill: new Fill({ color: '#93c5fd' }),
              backgroundFill: new Fill({ color: 'rgba(10, 13, 21, 0.9)' }),
              padding: [2, 6, 2, 6],
            }),
          });
        }

        const kmLabel = feature.get('kmLabel');
        return new Style({
          stroke: new Stroke({
            color: 'rgba(56, 189, 248, 0.45)',
            width: 1.5,
            lineDash: [4, 4],
          }),
          text: new Text({
            text: kmLabel,
            font: '10px JetBrains Mono, monospace',
            fill: new Fill({ color: '#7dd3fc' }),
            offsetY: -10,
          }),
        });
      },
    });

    // 10. Clicked Inspection Cell Highlight Layer
    const inspectMarkerSource = new VectorSource();
    inspectMarkerSourceRef.current = inspectMarkerSource;

    const inspectMarkerLayer = new VectorLayer({
      source: inspectMarkerSource,
      style: () =>
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: '#f59e0b' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          }),
          stroke: new Stroke({
            color: '#f59e0b',
            width: 2.5,
            lineDash: [4, 2],
          }),
          fill: new Fill({
            color: 'rgba(245, 158, 11, 0.25)',
          }),
        }),
    });

    // Save references for dynamic toggles & opacity
    olLayersRef.current = {
      layer_radar: radarCompositeLayer,
      layer_insat: imdInsatIrLayer,
      layer_lightning: bhuvanLightningLayer,
      layer_terrain: bhuvanTerrainLayer,
      layer_aws: imdAwsLayer,
      layer_admin_basins: bhuvanBasinLayer,
      layer_state: bhuvanStateLayer,
      layer_ai_hazards: radarCompositeLayer, // coupled with ConvectNet probability
      layer_storm_cells: stormCellsLayer,
      layer_rings: rangeRingsLayer,
    };

    // Instantiate OpenLayers Map
    const map = new Map({
      target: mapContainerRef.current,
      layers: [
        baseCartoLayer,
        baseReferenceLayer,
        bhuvanStateLayer,
        bhuvanTerrainLayer,
        bhuvanBasinLayer,
        imdInsatIrLayer,
        bhuvanLightningLayer,
        radarCompositeLayer,
        rangeRingsLayer,
        stormCellsLayer,
        imdAwsLayer,
        inspectMarkerLayer,
      ],
      view: new View({
        center: SOHRA_WEB_MERCATOR,
        zoom: 9.2,
        minZoom: 6,
        maxZoom: 14,
      }),
      controls: [], // Custom HUD handles controls
    });

    // Click handler for Cell Inspection
    map.on('singleclick', (evt) => {
      const coords = toLonLat(evt.coordinate);
      const lon = coords[0];
      const lat = coords[1];
      onSelectCell(lat, lon);
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Update dynamic layers visibility and opacity from layersConfig
  useEffect(() => {
    layersConfig.forEach((cfg) => {
      const olLayer = olLayersRef.current[cfg.id];
      if (olLayer) {
        olLayer.setVisible(cfg.visible);
        olLayer.setOpacity(cfg.opacity);
      }
    });
  }, [layersConfig]);

  // Update Storm Cells and Motion Vectors on map
  useEffect(() => {
    const source = stormVectorSourceRef.current;
    if (!source) return;

    source.clear();

    stormCells.forEach((cell) => {
      const centerMercator = fromLonLat(cell.centroid);

      // 1. Storm center marker
      const centerFeature = new Feature({
        geometry: new Point(centerMercator),
        featureType: 'cell_center',
        name: cell.name,
        maxDbz: cell.maxDbz,
        speed: cell.speedKmh,
      });
      source.addFeature(centerFeature);

      // 2. Storm cell perimeter polygon (rough oval oriented along bearing)
      const points = 36;
      const polyCoords: number[][] = [];
      const radiusMeters = cell.radiusKm * 1000;
      for (let i = 0; i <= points; i++) {
        const angle = (i * 2 * Math.PI) / points;
        const dx = radiusMeters * Math.sin(angle) * 1.2;
        const dy = radiusMeters * Math.cos(angle) * 0.9;
        polyCoords.push([centerMercator[0] + dx, centerMercator[1] + dy]);
      }
      const polyFeature = new Feature({
        geometry: new Polygon([polyCoords]),
        featureType: 'cell_polygon',
        severity: cell.severity,
      });
      source.addFeature(polyFeature);

      // 3. Projected motion vector line (30-min trajectory)
      const bearingRad = (cell.bearingDeg * Math.PI) / 180;
      const speedMps = (cell.speedKmh * 1000) / 3600;
      const vectorDistanceMeters = speedMps * 1800; // 30 minutes projection
      const endX = centerMercator[0] + vectorDistanceMeters * Math.sin(bearingRad);
      const endY = centerMercator[1] + vectorDistanceMeters * Math.cos(bearingRad);

      const vectorFeature = new Feature({
        geometry: new LineString([centerMercator, [endX, endY]]),
        featureType: 'motion_vector',
      });
      source.addFeature(vectorFeature);
    });
  }, [stormCells]);

  // Update Radar Reflectivity mesh (changes with lead time or replay step)
  useEffect(() => {
    const radarSource = radarCanvasSourceRef.current;
    if (!radarSource) return;

    radarSource.clear();

    // Render each storm cell as a single realistic irregular polygon
    stormCells.forEach((cell) => {
      const baseMercator = fromLonLat(cell.centroid);
      const baseRadiusM = cell.radiusKm * 1000;
      const bearingRad = (cell.bearingDeg * Math.PI) / 180;
      const nPoints = 32;
      const polyCoords: number[][] = [];

      for (let i = 0; i <= nPoints; i++) {
        const angle = (i * 2 * Math.PI) / nPoints;
        const relAngle = angle - bearingRad;
        const alongMotion = Math.cos(relAngle);
        const acrossMotion = Math.sin(relAngle);
        const shapeRadius =
          baseRadiusM *
          (0.85 + 0.15 * acrossMotion * acrossMotion) *
          (1.0 - 0.15 * Math.max(0, alongMotion));
        const seed = (cell.name?.charCodeAt(0) ?? 65) + i;
        const noise = 0.12 * Math.sin(seed * 2.3 + i * 0.7) * shapeRadius;

        polyCoords.push([
          baseMercator[0] + (shapeRadius + noise) * Math.sin(angle),
          baseMercator[1] + (shapeRadius + noise) * Math.cos(angle),
        ]);
      }

      const f = new Feature({
        geometry: new Polygon([polyCoords]),
        dbz: cell.maxDbz,
      });
      radarSource.addFeature(f);
    });
  }, [stormCells, activeLeadTimeMin, isReplayMode, replayStepIndex]);

  // Update Clicked Inspection Marker
  useEffect(() => {
    const inspectSource = inspectMarkerSourceRef.current;
    if (!inspectSource) return;

    inspectSource.clear();

    if (clickedCoords) {
      const clickedMercator = fromLonLat([clickedCoords.lon, clickedCoords.lat]);
      // 1km bounding box polygon
      const halfKm = 500;
      const boxCoords = [
        [clickedMercator[0] - halfKm, clickedMercator[1] - halfKm],
        [clickedMercator[0] + halfKm, clickedMercator[1] - halfKm],
        [clickedMercator[0] + halfKm, clickedMercator[1] + halfKm],
        [clickedMercator[0] - halfKm, clickedMercator[1] + halfKm],
        [clickedMercator[0] - halfKm, clickedMercator[1] - halfKm],
      ];

      const boxFeature = new Feature({
        geometry: new Polygon([boxCoords]),
      });
      const pointFeature = new Feature({
        geometry: new Point(clickedMercator),
      });

      inspectSource.addFeature(boxFeature);
      inspectSource.addFeature(pointFeature);
    }
  }, [clickedCoords]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#0a0d15]" />

      {/* Map Overlay Badge: Domain & Center */}
      <div className="absolute top-3 left-3 bg-[#0a0d15]/85 border border-[#1e293b] backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono z-10 select-none shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-white font-bold">RADAR DOMAIN: MEGHALAYA & ASSAM</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Khasi Hills Escarpment · Sohra Doppler Radar 250 km Range
        </div>
      </div>

      {/* Zoom Controls HUD */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 font-mono">
        <button
          onClick={() => {
            const view = mapRef.current?.getView();
            if (view) view.animate({ zoom: (view.getZoom() || 8.5) + 1, duration: 250 });
          }}
          className="w-8 h-8 rounded-lg bg-[#131928]/90 hover:bg-[#1a2236] border border-[#1e293b] text-white flex items-center justify-center font-bold text-sm shadow-lg transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => {
            const view = mapRef.current?.getView();
            if (view) view.animate({ zoom: (view.getZoom() || 8.5) - 1, duration: 250 });
          }}
          className="w-8 h-8 rounded-lg bg-[#131928]/90 hover:bg-[#1a2236] border border-[#1e293b] text-white flex items-center justify-center font-bold text-sm shadow-lg transition-colors"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={() => {
            const view = mapRef.current?.getView();
            if (view) view.animate({ center: SOHRA_WEB_MERCATOR, zoom: 8.5, duration: 400 });
          }}
          className="w-8 h-8 rounded-lg bg-[#131928]/90 hover:bg-[#1a2236] border border-[#1e293b] text-blue-400 flex items-center justify-center font-bold text-xs shadow-lg transition-colors"
          title="Recenter on Sohra Radar"
        >
          ⌖
        </button>
      </div>
    </div>
  );
};
