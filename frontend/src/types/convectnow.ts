export type HazardType = 'ci' | 'lightning' | 'hail' | 'downburst' | 'cloudburst';

export interface HazardData {
  type: HazardType;
  title: string;
  shortCode: string;
  value: number; // 0 - 100 %
  trend: 'up' | 'stable' | 'down';
  description: string;
  alertThreshold: number;
  unit: string;
}

export interface LeadTimeStep {
  label: string;
  minutes: number;
  uncertaintyPercent: number; // e.g. 5, 12, 28
}

export interface CellObservations {
  radar_dbz: number;
  radial_velocity: number;
  ir_bt: number;
  cooling_rate: number;
  lightning_count: number;
  cape: number;
  rh: number;
  surface_temp: number;
  pressure: number;
  rainfall_rate: number;
  vil: number;
  echo_top: number;
}

export interface CellAiHazards {
  ci_prob: number;
  hail_prob: number;
  cloudburst_prob: number;
  downburst_vel: number;
  downburst_prob: number;
  composite_risk: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

export interface StormMotion {
  direction_deg: number;
  direction_cardinal: string;
  speed_kmh: number;
  eta_min: number;
  kinematic_state: string;
}

export interface DataQualitySource {
  status: 'GOOD' | 'MODERATE' | 'DEGRADED' | 'OFFLINE';
  lag: string;
  latency_sec: number;
}

export interface DataQuality {
  radar: DataQualitySource;
  satellite: DataQualitySource;
  lightning: DataQualitySource;
  aws: DataQualitySource;
  ai_model: string;
}

export interface GridCellData {
  coordinates: {
    lat: number;
    lon: number;
    elevation: number;
    region: string;
  };
  observations: CellObservations;
  ai_hazards: CellAiHazards;
  storm_motion: StormMotion;
  data_quality: DataQuality;
}

export interface MapLayerConfig {
  id: string;
  title: string;
  category: 'ogc_gov' | 'operational_radar' | 'ai_hazard' | 'vector_overlay';
  serviceType: 'WMS' | 'WFS' | 'TileWMS' | 'ImageWMS' | 'Vector' | 'Canvas';
  endpointUrl: string;
  layerName: string;
  visible: boolean;
  opacity: number;
  description: string;
  provider: 'MOSDAC' | 'IMD' | 'Bhuvan' | 'ConvectNet';
}

export interface ReplayStep {
  stepIndex: number;
  utcTime: string;
  istTime: string;
  relativeTime: string;
  title: string;
  description: string;
  cloudburstProb: number;
  ciProb: number;
  lightningProb: number;
  hailProb: number;
  downburstProb: number;
  maxReflectivityDbz: number;
  rainRateMmH: number;
  flashRatePerMin: number;
  stormCenter: [number, number]; // [lon, lat]
}

export interface StormCellFeature {
  id: string;
  name: string;
  centroid: [number, number]; // [lon, lat]
  radiusKm: number;
  maxDbz: number;
  echoTopKm: number;
  speedKmh: number;
  bearingDeg: number;
  etaMinutes: number;
  severity: 'MODERATE' | 'SEVERE' | 'EXTREME';
}

export interface ForecastOutput {
  lead_time_min: number;
  timestamp: string;
  hazard_probabilities: {
    ci_prob: number;
    lightning_prob: number;
    hail_prob: number;
    downburst_prob: number;
    cloudburst_prob: number;
  };
  uncertainty_percent: number;
  storm_cells: StormCellFeature[];
  data_mode: 'live' | 'historical_fallback';
}
