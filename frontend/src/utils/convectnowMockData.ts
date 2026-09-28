import {
  HazardData,
  GridCellData,
  LeadTimeStep,
  StormCellFeature,
  ForecastOutput,
} from '../types/convectnow';

export const LEAD_TIME_STEPS: LeadTimeStep[] = [
  { label: 'NOW', minutes: 0, uncertaintyPercent: 2 },
  { label: '+15m', minutes: 15, uncertaintyPercent: 5 },
  { label: '+30m', minutes: 30, uncertaintyPercent: 8 },
  { label: '+45m', minutes: 45, uncertaintyPercent: 10 },
  { label: '+1h', minutes: 60, uncertaintyPercent: 12 },
  { label: '+2h', minutes: 120, uncertaintyPercent: 16 },
  { label: '+3h', minutes: 180, uncertaintyPercent: 20 },
  { label: '+4h', minutes: 240, uncertaintyPercent: 23 },
  { label: '+5h', minutes: 300, uncertaintyPercent: 26 },
  { label: '+6h', minutes: 360, uncertaintyPercent: 28 },
];

export const INITIAL_HAZARDS: HazardData[] = [
  {
    type: 'ci',
    shortCode: 'CI',
    title: 'Convective Initiation',
    value: 87,
    trend: 'up',
    description: 'Rapid cloud top cooling rate (-0.42 K/min) & strong low-level moisture flux convergence',
    alertThreshold: 70,
    unit: '%',
  },
  {
    type: 'lightning',
    shortCode: 'LTG',
    title: 'Lightning Risk',
    value: 91,
    trend: 'up',
    description: 'Bhuvan/ILDN flash rate surge exceeding 2-sigma threshold (38 flashes/10km²)',
    alertThreshold: 75,
    unit: '%',
  },
  {
    type: 'hail',
    shortCode: 'HAIL',
    title: 'Hail Risk',
    value: 64,
    trend: 'stable',
    description: 'High VIL (>48 kg/m²) and differential reflectivity dip indicating hail core aloft',
    alertThreshold: 60,
    unit: '%',
  },
  {
    type: 'downburst',
    shortCode: 'DWN',
    title: 'Downburst Potential',
    value: 42,
    trend: 'down',
    description: 'Negative radial velocity divergence signature; potential surface gusts 40–50 kt',
    alertThreshold: 65,
    unit: '%',
  },
  {
    type: 'cloudburst',
    shortCode: 'CLD',
    title: 'Cloudburst Warning',
    value: 73,
    trend: 'up',
    description: 'Extreme orographic precipitation rate exceeding 100 mm/h threshold',
    alertThreshold: 70,
    unit: '%',
  },
];

export const MOCK_STORM_CELLS: StormCellFeature[] = [
  {
    id: 'cell-sh-01',
    name: 'Sohra Escarpment Core',
    centroid: [91.732, 25.27],
    radiusKm: 14,
    maxDbz: 58.4,
    echoTopKm: 15.2,
    speedKmh: 42,
    bearingDeg: 48,
    etaMinutes: 27,
    severity: 'EXTREME',
  },
  {
    id: 'cell-mw-02',
    name: 'Mawsynram Updraft Cell',
    centroid: [91.58, 25.31],
    radiusKm: 11,
    maxDbz: 53.1,
    echoTopKm: 13.8,
    speedKmh: 38,
    bearingDeg: 55,
    etaMinutes: 42,
    severity: 'SEVERE',
  },
  {
    id: 'cell-gh-03',
    name: 'South Brahmaputra Feeder',
    centroid: [91.82, 25.85],
    radiusKm: 18,
    maxDbz: 46.5,
    echoTopKm: 11.5,
    speedKmh: 32,
    bearingDeg: 35,
    etaMinutes: 65,
    severity: 'MODERATE',
  },
];

export interface MockStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  temp: number;
  rh: number;
  pressure: number;
  windSpeed: number;
  windDir: number;
  rain1h: number;
}

export const MOCK_AWS_STATIONS: MockStation[] = [
  { id: 'aws-01', name: 'Cherrapunji (Sohra)', lat: 25.2702, lon: 91.7323, elevation: 1430, temp: 21.4, rh: 92, pressure: 865.2, windSpeed: 24, windDir: 190, rain1h: 34.8 },
  { id: 'aws-02', name: 'Mawsynram', lat: 25.2975, lon: 91.5828, elevation: 1400, temp: 20.8, rh: 95, pressure: 867.5, windSpeed: 28, windDir: 195, rain1h: 42.0 },
  { id: 'aws-03', name: 'Shillong (Barapani)', lat: 25.5788, lon: 91.8933, elevation: 1525, temp: 22.1, rh: 84, pressure: 855.0, windSpeed: 16, windDir: 180, rain1h: 12.4 },
  { id: 'aws-04', name: 'Guwahati (Airport)', lat: 26.1061, lon: 91.5859, elevation: 54, temp: 28.6, rh: 78, pressure: 998.4, windSpeed: 14, windDir: 160, rain1h: 4.2 },
  { id: 'aws-05', name: 'Jowai', lat: 25.4450, lon: 92.2030, elevation: 1380, temp: 22.8, rh: 88, pressure: 870.1, windSpeed: 18, windDir: 205, rain1h: 18.5 },
  { id: 'aws-06', name: 'Nongstoin', lat: 25.5200, lon: 91.2700, elevation: 1410, temp: 21.9, rh: 86, pressure: 868.0, windSpeed: 20, windDir: 200, rain1h: 22.1 },
  { id: 'aws-07', name: 'Dawki (Border)', lat: 25.1850, lon: 92.0150, elevation: 120, temp: 26.4, rh: 91, pressure: 992.3, windSpeed: 22, windDir: 185, rain1h: 28.0 },
  { id: 'aws-08', name: 'Williamnagar', lat: 25.5000, lon: 90.6200, elevation: 280, temp: 27.2, rh: 82, pressure: 975.0, windSpeed: 12, windDir: 175, rain1h: 8.6 },
];

export function getMockGridCell(lat: number, lon: number): GridCellData {
  // Distance from Sohra (25.27, 91.73)
  const dLat = lat - 25.2702;
  const dLon = lon - 91.7323;
  const distDeg = Math.sqrt(dLat * dLat + dLon * dLon);
  const distKm = distDeg * 111.0;

  // Elevation estimation: high on Khasi plateau, lower to north (Brahmaputra) and south (Bangladesh)
  let elevation = 1430;
  if (lat < 25.15) {
    elevation = Math.max(30, Math.round(1430 - (25.15 - lat) * 4500));
  } else if (lat > 25.6) {
    elevation = Math.max(55, Math.round(1430 - (lat - 25.6) * 2200));
  } else {
    elevation = Math.round(1350 + Math.sin(lat * 15) * 120);
  }

  // Convective intensity decay from storm core
  const decay = Math.exp(-(distKm * distKm) / (2 * 18 * 18));
  const radar_dbz = Number((15 + decay * 42.5).toFixed(1));
  const rainfall_rate = Number((decay * 68.4).toFixed(1));
  const lightning_count = Math.round(decay * 28);
  const ir_bt = Math.round(270 - decay * 56);
  const cooling_rate = Number((-0.05 - decay * 0.42).toFixed(2));
  const cape = Math.round(1100 + decay * 1050);

  const ci_prob = Math.min(99, Math.round(25 + decay * 72));
  const hail_prob = Math.min(95, Math.round(15 + decay * 62));
  const cloudburst_prob = Math.min(98, Math.round(10 + decay * 82));
  const downburst_vel = Math.round(18 + decay * 29);
  const downburst_prob = Math.min(90, Math.round(12 + decay * 48));

  let composite_risk: GridCellData['ai_hazards']['composite_risk'] = 'LOW';
  if (cloudburst_prob > 85 || ci_prob > 90) composite_risk = 'CRITICAL';
  else if (cloudburst_prob > 65 || hail_prob > 60) composite_risk = 'HIGH';
  else if (cloudburst_prob > 45 || ci_prob > 50) composite_risk = 'ELEVATED';
  else if (cloudburst_prob > 25) composite_risk = 'MODERATE';

  return {
    coordinates: {
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      elevation,
      region: distKm < 20 ? 'Sohra / Khasi Escarpment' : distKm < 50 ? 'East Khasi Hills' : 'Northeast Region',
    },
    observations: {
      radar_dbz,
      radial_velocity: Number((-2.0 - decay * 7.5).toFixed(1)),
      ir_bt,
      cooling_rate,
      lightning_count,
      cape,
      rh: Math.min(98, Math.round(72 + decay * 22)),
      surface_temp: Number((25.5 - (elevation / 1000) * 5.2 - decay * 1.8).toFixed(1)),
      pressure: Number((1013.25 * Math.exp(-elevation / 8400)).toFixed(1)),
      rainfall_rate,
      vil: Number((5 + decay * 48).toFixed(1)),
      echo_top: Number((6.5 + decay * 9.2).toFixed(1)),
    },
    ai_hazards: {
      ci_prob,
      hail_prob,
      cloudburst_prob,
      downburst_vel,
      downburst_prob,
      composite_risk,
    },
    storm_motion: {
      direction_deg: 48,
      direction_cardinal: 'NE',
      speed_kmh: 42,
      eta_min: Math.max(0, Math.round(distKm / 0.7)),
      kinematic_state: decay > 0.6 ? 'Vigorous Updraft Inflow' : 'Forward Stratiform Anvil',
    },
    data_quality: {
      radar: { status: 'GOOD', lag: '1m14s lag', latency_sec: 74 },
      satellite: { status: 'GOOD', lag: '3m lag', latency_sec: 180 },
      lightning: { status: 'GOOD', lag: '45s lag', latency_sec: 45 },
      aws: { status: 'MODERATE', lag: '12m lag', latency_sec: 720 },
      ai_model: 'ConvectNet v1 (Hybrid Fusion)',
    },
  };
}

export function getForecastForLeadTime(leadMinutes: number): ForecastOutput {
  const uncertainty = Math.min(35, Math.round(2 + (leadMinutes / 360) * 26));
  // As lead time increases, storm moves towards northeast (0.7 km/min)
  const shiftKm = leadMinutes * 0.65;
  const shiftDegLat = (shiftKm * Math.cos((48 * Math.PI) / 180)) / 111.0;
  const shiftDegLon = (shiftKm * Math.sin((48 * Math.PI) / 180)) / 100.0;

  const shiftedCells: StormCellFeature[] = MOCK_STORM_CELLS.map((cell) => {
    const newLon = Number((cell.centroid[0] + shiftDegLon).toFixed(4));
    const newLat = Number((cell.centroid[1] + shiftDegLat).toFixed(4));
    const eta = Math.max(0, cell.etaMinutes - leadMinutes);
    return {
      ...cell,
      centroid: [newLon, newLat],
      etaMinutes: eta,
      radiusKm: Math.round(cell.radiusKm + (leadMinutes / 60) * 1.5),
    };
  });

  return {
    lead_time_min: leadMinutes,
    timestamp: new Date().toISOString(),
    hazard_probabilities: {
      ci_prob: Math.max(30, Math.round(87 - (leadMinutes / 360) * 25)),
      lightning_prob: Math.max(25, Math.round(91 - (leadMinutes / 360) * 35)),
      hail_prob: Math.max(20, Math.round(64 - (leadMinutes / 360) * 20)),
      downburst_prob: Math.max(15, Math.round(42 - (leadMinutes / 360) * 15)),
      cloudburst_prob: Math.max(35, Math.round(73 - (leadMinutes / 360) * 18)),
    },
    uncertainty_percent: uncertainty,
    storm_cells: shiftedCells,
    data_mode: 'historical_fallback',
  };
}
