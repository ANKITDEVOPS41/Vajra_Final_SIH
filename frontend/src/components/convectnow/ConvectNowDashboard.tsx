import React, { useState, useEffect, useRef } from 'react';
import { TopOperationalBar } from './TopOperationalBar';
import { HazardBar } from './HazardBar';
import { ForecastTimeSlider } from './ForecastTimeSlider';
import { MapView } from './MapView';
import { ClickInspectPanel } from './ClickInspectPanel';
import { LayerControlDrawer } from './LayerControlDrawer';
import { RadarColorbar } from './RadarColorbar';
import { ReplayBanner } from './ReplayBanner';
import { OperationalVerificationModal } from './OperationalVerificationModal';
import { CapAlertModal } from './CapAlertModal';
import { VisualIntelDecisionKey } from '../VisualIntelDecisionKey';

import {
  MapLayerConfig,
  HazardData,
  GridCellData,
  StormCellFeature,
  DataQuality,
} from '../../types/convectnow';
import {
  INITIAL_HAZARDS,
  LEAD_TIME_STEPS,
  HISTORICAL_STORM_CELLS,
  getHistoricalGridCell,
  getForecastForLeadTime,
} from '../../utils/historicalFallbackData';
import { REPLAY_STEPS } from '../../utils/replayState';
import { ApiService, LiveWebSocketClient } from '../../services/api';

const DEFAULT_MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'layer_radar',
    title: 'MOSDAC DWR Radar Composite',
    category: 'operational_radar',
    serviceType: 'Vector',
    endpointUrl: 'https://www.mosdac.gov.in/thredds/catalog.html',
    layerName: 'RSCHR_L2B_STD_COMPOSITE',
    visible: true,
    opacity: 0.85,
    description: 'Sohra, Guwahati, Agartala radar mosaic (10–70 dBZ)',
    provider: 'MOSDAC',
  },
  {
    id: 'layer_insat',
    title: 'INSAT-3DR Thermal IR (10.8 µm)',
    category: 'ogc_gov',
    serviceType: 'TileWMS',
    endpointUrl: 'https://reactjs.imd.gov.in/geoserver/imd/wms',
    layerName: 'imd:insat_ir',
    visible: true,
    opacity: 0.65,
    description: 'Live brightness temp & cloud top cooling rates',
    provider: 'IMD',
  },
  {
    id: 'layer_lightning',
    title: 'Bhuvan Hourly Lightning Strikes',
    category: 'ogc_gov',
    serviceType: 'ImageWMS',
    endpointUrl: 'https://bhuvan-ras2.nrsc.gov.in/cgi-bin/light.exe',
    layerName: 'lighthourly,grid',
    visible: true,
    opacity: 0.85,
    description: 'Hourly ground strikes & 10 km density analysis grid',
    provider: 'Bhuvan',
  },
  {
    id: 'layer_terrain',
    title: 'Bhuvan Khasi Hills Escarpment DEM',
    category: 'ogc_gov',
    serviceType: 'TileWMS',
    endpointUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    layerName: 'basemap:admin_group_ntl',
    visible: true,
    opacity: 0.5,
    description: 'High-relief topographic slope & orographic barriers',
    provider: 'Bhuvan',
  },
  {
    id: 'layer_aws',
    title: 'IMD Automatic Weather Stations',
    category: 'ogc_gov',
    serviceType: 'Vector',
    endpointUrl: 'https://reactjs.imd.gov.in/geoserver/imd/wfs',
    layerName: 'imd:aws_data_layer',
    visible: true,
    opacity: 1.0,
    description: 'Real-time surface telemetry (Cherrapunji, Shillong, Mawsynram)',
    provider: 'IMD',
  },
  {
    id: 'layer_admin_basins',
    title: 'Admin Boundaries & River Basins',
    category: 'ogc_gov',
    serviceType: 'TileWMS',
    endpointUrl: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
    layerName: 'state_ql_new,hydrology:BDRN_2B_Brahmaputra,hydrology:BDRN_2C_BarakOth',
    visible: true,
    opacity: 0.7,
    description: 'National/state borders and Barak/Brahmaputra drainage vectors',
    provider: 'Bhuvan',
  },
  {
    id: 'layer_storm_cells',
    title: 'Storm Cells & Motion Vectors',
    category: 'vector_overlay',
    serviceType: 'Vector',
    endpointUrl: 'internal://convectnet/cells',
    layerName: 'storm_cells_geojson',
    visible: true,
    opacity: 0.9,
    description: 'Tracked convective cell centroids, centroids & 30m vectors',
    provider: 'ConvectNet',
  },
  {
    id: 'layer_rings',
    title: 'Sohra DWR Range Rings (50–250 km)',
    category: 'vector_overlay',
    serviceType: 'Vector',
    endpointUrl: 'internal://rings',
    layerName: 'radar_rings',
    visible: true,
    opacity: 0.6,
    description: 'Calibrated Doppler radar radial range boundaries',
    provider: 'MOSDAC',
  },
];

export const ConvectNowDashboard: React.FC = () => {
  // Master State
  const [layersConfig, setLayersConfig] = useState<MapLayerConfig[]>(DEFAULT_MAP_LAYERS);
  const [isLayerDrawerOpen, setIsLayerDrawerOpen] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);

  // Forecast Time Slider & Animation State
  const [activeLeadStepIndex, setActiveLeadStepIndex] = useState<number>(0);
  const [mapBaseStyle, setMapBaseStyle] = useState<'tactical' | 'satellite'>('satellite');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Historical Event Replay Mode State
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [replayStepIndex, setReplayStepIndex] = useState<number>(0);

  // Telemetry & Hazard Data State
  const [hazards, setHazards] = useState<HazardData[]>(INITIAL_HAZARDS);
  const [stormCells, setStormCells] = useState<StormCellFeature[]>(HISTORICAL_STORM_CELLS);
  const [dataQuality, setDataQuality] = useState<DataQuality>({
    radar: { status: 'GOOD', lag: '1m14s lag', latency_sec: 74 },
    satellite: { status: 'GOOD', lag: '3m lag', latency_sec: 180 },
    lightning: { status: 'GOOD', lag: '45s lag', latency_sec: 45 },
    aws: { status: 'MODERATE', lag: '12m lag', latency_sec: 720 },
    ai_model: 'ConvectNet v1 (Hybrid Fusion)',
  });

  // Cell Inspection Drawer State
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lon: number } | null>({
    lat: 25.2702,
    lon: 91.7323,
  });
  const [inspectCellData, setInspectCellData] = useState<GridCellData | null>(
    getHistoricalGridCell(25.2702, 91.7323)
  );
  const [isInspectDrawerOpen, setIsInspectDrawerOpen] = useState<boolean>(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [isCapModalOpen, setIsCapModalOpen] = useState<boolean>(false);

  // Animation Loop Timer Ref
  const playTimerRef = useRef<number | null>(null);

  // Initialize API check and WebSocket
  useEffect(() => {
    // Initial health check
    ApiService.checkHealth().then((isAvailable) => {
      setIsLiveMode(isAvailable);
    });

    // WebSocket connection
    const wsClient = new LiveWebSocketClient(
      (data) => {
        const hazardProbs = data.hazard_probabilities || data.hazards;
        if (hazardProbs && !isReplayMode) {
          setHazards((prev) =>
            prev.map((h) => {
              if (h.type === 'ci') return { ...h, value: hazardProbs.ci_prob ?? h.value };
              if (h.type === 'lightning') return { ...h, value: hazardProbs.lightning_prob ?? h.value };
              if (h.type === 'hail') return { ...h, value: hazardProbs.hail_prob ?? h.value };
              if (h.type === 'downburst') return { ...h, value: hazardProbs.downburst_prob ?? h.value };
              if (h.type === 'cloudburst') return { ...h, value: hazardProbs.cloudburst_prob ?? h.value };
              return h;
            })
          );
        }

        if (data.storm_cells && !isReplayMode) {
          if (Array.isArray(data.storm_cells)) {
            setStormCells(data.storm_cells);
          } else if (data.storm_cells.features && Array.isArray(data.storm_cells.features)) {
            setStormCells(
              data.storm_cells.features.map((f: any, idx: number) => ({
                id: f.properties?.cell_id || `ws-cell-${idx}`,
                name: f.properties?.name || `Live Cell ${idx + 1}`,
                centroid: f.geometry?.coordinates || [91.73, 25.27],
                radiusKm: f.properties?.radiusKm || 14,
                maxDbz: f.properties?.max_dbz || 55,
                echoTopKm: f.properties?.echo_top_km || 14,
                speedKmh: f.properties?.speedKmh || 42,
                bearingDeg: f.properties?.bearingDeg || 45,
                etaMinutes: f.properties?.etaMinutes || 25,
                severity: f.properties?.severity || 'SEVERE',
              }))
            );
          }
        }
      },
      (connected) => {
        setIsLiveMode(connected);
      }
    );

    return () => {
      wsClient.disconnect();
    };
  }, [isReplayMode]);

  // Handle Play/Pause playback loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = isReplayMode ? 2200 : 1500;
      playTimerRef.current = window.setInterval(() => {
        if (isReplayMode) {
          setReplayStepIndex((prev) => (prev + 1) % REPLAY_STEPS.length);
        } else {
          setActiveLeadStepIndex((prev) => (prev + 1) % LEAD_TIME_STEPS.length);
        }
      }, intervalMs);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, isReplayMode]);

  // Update Hazard Values and Storm Cells when Lead Time changes (in Live Mode)
  useEffect(() => {
    if (isReplayMode) return;

    const currentStep = LEAD_TIME_STEPS[activeLeadStepIndex];
    if (!currentStep) return;

    ApiService.getForecast(currentStep.minutes).then((forecast) => {
      setStormCells(forecast.storm_cells);
      setHazards((prev) =>
        prev.map((h) => {
          if (h.type === 'ci') return { ...h, value: forecast.hazard_probabilities.ci_prob };
          if (h.type === 'lightning') return { ...h, value: forecast.hazard_probabilities.lightning_prob };
          if (h.type === 'hail') return { ...h, value: forecast.hazard_probabilities.hail_prob };
          if (h.type === 'downburst') return { ...h, value: forecast.hazard_probabilities.downburst_prob };
          if (h.type === 'cloudburst') return { ...h, value: forecast.hazard_probabilities.cloudburst_prob };
          return h;
        })
      );
    });
  }, [activeLeadStepIndex, isReplayMode]);

  // Update Hazard Values and Storm Cells when Replay Step changes (in Replay Mode)
  useEffect(() => {
    if (!isReplayMode) return;

    const step = REPLAY_STEPS[replayStepIndex];
    if (!step) return;

    // Escalate hazards according to historical timeline
    setHazards((prev) =>
      prev.map((h) => {
        if (h.type === 'ci') return { ...h, value: step.ciProb, trend: 'up' };
        if (h.type === 'lightning') return { ...h, value: step.lightningProb, trend: 'up' };
        if (h.type === 'hail') return { ...h, value: step.hailProb, trend: step.hailProb > 70 ? 'up' : 'stable' };
        if (h.type === 'downburst') return { ...h, value: step.downburstProb, trend: 'up' };
        if (h.type === 'cloudburst') return { ...h, value: step.cloudburstProb, trend: 'up' };
        return h;
      })
    );

    // Update historical storm position
    setStormCells([
      {
        id: 'replay-cherra-core',
        name: 'Cherrapunji Orographic Core',
        centroid: step.stormCenter,
        radiusKm: 14 + replayStepIndex * 2,
        maxDbz: step.maxReflectivityDbz,
        echoTopKm: 13.5 + replayStepIndex * 0.5,
        speedKmh: 42 - replayStepIndex * 3, // slows as it locks to escarpment
        bearingDeg: 45,
        etaMinutes: 0,
        severity: step.cloudburstProb > 85 ? 'EXTREME' : 'SEVERE',
      },
    ]);

    // Also update inspection panel if active on Sohra
    if (clickedCoords) {
      setInspectCellData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          observations: {
            ...prev.observations,
            radar_dbz: step.maxReflectivityDbz,
            rainfall_rate: step.rainRateMmH,
            lightning_count: step.flashRatePerMin,
          },
          ai_hazards: {
            ...prev.ai_hazards,
            cloudburst_prob: step.cloudburstProb,
            ci_prob: step.ciProb,
            composite_risk: step.cloudburstProb > 85 ? 'CRITICAL' : 'HIGH',
          },
        };
      });
    }
  }, [isReplayMode, replayStepIndex]);

  // Handle Layer Toggle
  const handleToggleLayer = (id: string) => {
    setLayersConfig((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  // Handle Layer Opacity Change
  const handleChangeOpacity = (id: string, opacity: number) => {
    setLayersConfig((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  };

  // Handle Map Click to inspect cell
  const handleSelectCell = async (lat: number, lon: number) => {
    setClickedCoords({ lat, lon });
    setIsInspectDrawerOpen(true);
    const data = await ApiService.getGridCell(lat, lon);
    setInspectCellData(data);
  };

  // Toggle Replay Mode
  const handleToggleReplay = () => {
    if (isReplayMode) {
      // Exit Replay Mode
      setIsReplayMode(false);
      setIsPlaying(false);
      setActiveLeadStepIndex(0);
      setStormCells(HISTORICAL_STORM_CELLS);
      setHazards(INITIAL_HAZARDS);
    } else {
      // Enter Replay Mode
      setIsReplayMode(true);
      setReplayStepIndex(0);
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0d15] text-slate-100 overflow-hidden font-sans">
      {/* Top Operational Bar */}
      <TopOperationalBar
        isLiveMode={isLiveMode}
        isReplayActive={isReplayMode}
        onToggleReplay={handleToggleReplay}
        onToggleLayers={() => setIsLayerDrawerOpen((prev) => !prev)}
        onOpenVerification={() => setIsVerificationModalOpen(true)}
        onOpenCapModal={() => setIsCapModalOpen(true)}
        isLayerDrawerOpen={isLayerDrawerOpen}
        dataQuality={dataQuality}
      />

      {/* Replay Mode Warning Banner (if active) */}
      {isReplayMode && (
        <ReplayBanner
          currentStep={REPLAY_STEPS[replayStepIndex]}
          onExitReplay={handleToggleReplay}
          onOpenCapModal={() => setIsCapModalOpen(true)}
        />
      )}

      {/* Main Map Canvas Area */}
      <main className="relative flex-1 w-full overflow-hidden">
        <MapView
          mapBaseStyle={mapBaseStyle}
          layersConfig={layersConfig}
          activeLeadTimeMin={LEAD_TIME_STEPS[activeLeadStepIndex]?.minutes || 0}
          isReplayMode={isReplayMode}
          replayStepIndex={replayStepIndex}
          stormCells={stormCells}
          onSelectCell={handleSelectCell}
          clickedCoords={clickedCoords}
        />

        {/* Floating Radar Reflectivity Colorbar Legend */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
          <RadarColorbar />
        </div>

        {/* Floating Forecast Time Slider (centered above bottom hazard bar) */}
        <div className="absolute bottom-3 left-0 right-0 z-20 pointer-events-auto">
          <ForecastTimeSlider
            steps={LEAD_TIME_STEPS}
            activeStepIndex={isReplayMode ? replayStepIndex : activeLeadStepIndex}
            onSelectStep={(idx) => {
              if (isReplayMode) {
                setReplayStepIndex(idx);
              } else {
                setActiveLeadStepIndex(idx);
              }
            }}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            isReplayMode={isReplayMode}
            replaySteps={REPLAY_STEPS}
          />
        </div>

        
        {/* Map Style Toggle */}
        <div className="absolute top-20 right-4 z-20">
          <button
            onClick={() => setMapBaseStyle(prev => prev === 'tactical' ? 'satellite' : 'tactical')}
            className="flex items-center gap-2 px-3 py-2 bg-[#131928]/95 border border-blue-500/40 rounded shadow-lg backdrop-blur text-[11px] font-bold tracking-wider font-mono text-blue-300 hover:bg-[#1e293b] hover:text-white transition-colors"
          >
            {mapBaseStyle === 'tactical' ? '🌍 ENABLE LIVE SATELLITE (IMD/MOSDAC)' : '🗺️ ENABLE TACTICAL MAP'}
          </button>
        </div>
        
        {/* Slide-out Layer Controller Drawer */}

        <LayerControlDrawer
          layers={layersConfig}
          onToggleLayer={handleToggleLayer}
          onChangeOpacity={handleChangeOpacity}
          isOpen={isLayerDrawerOpen}
          onClose={() => setIsLayerDrawerOpen(false)}
        />

        {/* Slide-out Click-to-Inspect Sidebar */}
        <ClickInspectPanel
          data={inspectCellData}
          isOpen={isInspectDrawerOpen}
          onClose={() => setIsInspectDrawerOpen(false)}
          onOpenCapModal={() => setIsCapModalOpen(true)}
        />
      </main>

      {/* Bottom Convective Hazard Bar (Always Visible) */}
      <HazardBar
        hazards={hazards}
        onHazardClick={(h) => {
          if (clickedCoords) {
            setIsInspectDrawerOpen(true);
          }
        }}
      />

      {/* WMO Operational Verification Scorecard Modal */}
      <OperationalVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />

      {/* NDMA / IMD Common Alerting Protocol (CAP v1.2) Modal */}
      <CapAlertModal
        isOpen={isCapModalOpen}
        onClose={() => setIsCapModalOpen(false)}
        cellData={inspectCellData}
        isReplayActive={isReplayMode}
      />

      {/* Standardized Visual Intel & Decision Key */}
      <VisualIntelDecisionKey page="convectnow" />
    </div>
  );
};

export default ConvectNowDashboard;
