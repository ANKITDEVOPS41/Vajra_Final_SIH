/**
 * VAJRA / ConvectNow — 3x3 Tactical Sector Grid & Surface AWS In-Situ Network
 * Problem Statement 26084: Convective scale nowcasting (0–6h, 1–2 km resolution)
 * Area of Interest (AOI): Coastal Severe Convection Corridor
 * Bounds: Lat 20.0°N to 20.6°N, Lon 85.5°E to 86.1°E
 * Key Aerodrome: Biju Patnaik International Airport (VEBS: 20.2444°N, 85.8178°E)
 */

export interface TacticalSector {
  id: string; // e.g. 'SEC-NW', 'SEC-C'
  code: string; // 'R0_C0' to 'R2_C2'
  name: string;
  row: number; // 0 (North: 20.4–20.6), 1 (Mid: 20.2–20.4), 2 (South: 20.0–20.2)
  col: number; // 0 (West: 85.5–85.7), 1 (Mid: 85.7–85.9), 2 (East: 85.9–86.1)
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  center: [number, number];
  radarDbz: number;
  rainRateMmh: number;
  pressureHpa: number;
  tempC: number;
  windGustKmh: number;
  capeJkg: number;
  lightningStrokesMin: number;
  hailRisk: string;
  cloudburstFlag: boolean;
  description: string;
}

export interface SurfaceAwsStation {
  id: string; // e.g. 'AWS-VEBS'
  code: string; // WMO / IMD station ID e.g. '42971'
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
  tempC: number;
  dewPointC: number;
  humidityPct: number;
  pressureHpa: number;
  tendency3h: number; // hPa / 3h (negative = falling)
  windDirDeg: number;
  windSpeedKt: number;
  windGustKt: number;
  rain1hMm: number;
  rainRateMmh: number;
  capeJkg: number;
  status: 'SEVERE_ALERT' | 'WARNING' | 'NOMINAL';
}

export const RADAR_STATION = {
  name: 'IMD DWR BHUBANESWAR (VEBS)',
  callsign: 'VEBS-DWR',
  lat: 20.2444,
  lon: 85.8178,
  elevationMsl: 42.0,
  band: 'S-Band (Dual Polarimetric)',
  frequencyGhz: 2.875,
  pulseWidthUs: 1.0,
  prfHz: '600 / 450 (Dual PRF)',
  beamWidthDeg: 0.95,
  vcp: 'VCP-212 (Rapid Convective Initiation)',
  rangeKm: 120.0,
};

export const VEBS_AIRPORT_SPECS = {
  id: 'VEBS / BBI',
  name: 'Biju Patnaik International Airport (Bhubaneswar)',
  elevationM: 42.0,
  center: [20.2444, 85.8178] as [number, number],
  bounds: [
    [20.2280, 85.8050],
    [20.2620, 85.8320],
  ] as [[number, number], [number, number]],
  perimeter: [
    [20.2300, 85.8080],
    [20.2600, 85.8280],
  ] as [[number, number], [number, number]],
  runway01_19: [
    [20.2338, 85.8150], // Runway 01 Threshold (South)
    [20.2550, 85.8206], // Runway 19 Threshold (North)
  ] as [[number, number], [number, number]],
  terminal1_2: [20.2520, 85.8160] as [number, number],
  atcTower: [20.2465, 85.8200] as [number, number],
  apronMain: [20.2450, 85.8170] as [number, number],
};

export const VEBS_DOMAIN_BOUNDS: [[number, number], [number, number]] = [
  [20.00, 85.50],
  [20.60, 86.10],
];

// ============================================================================
// 3x3 TACTICAL GRID (AOI: 20.0°N–20.6°N, 85.5°E–86.1°E)
// ============================================================================
export const TACTICAL_3X3_GRID: TacticalSector[] = [
  // ROW 0 (NORTH: 20.4°N to 20.6°N)
  {
    id: 'SEC-NW',
    code: 'R0_C0',
    name: 'Chandaka Uplands / Cuttack North',
    row: 0,
    col: 0,
    latMin: 20.40,
    latMax: 20.60,
    lonMin: 85.50,
    lonMax: 85.70,
    center: [20.50, 85.60],
    radarDbz: 22.4,
    rainRateMmh: 8.2,
    pressureHpa: 1004.8,
    tempC: 30.5,
    windGustKmh: 32,
    capeJkg: 2100,
    lightningStrokesMin: 2,
    hailRisk: 'LOW (<10%)',
    cloudburstFlag: false,
    description: 'Forested wildlife ridge; boundary layer thermal lifting.'
  },
  {
    id: 'SEC-N',
    code: 'R0_C1',
    name: 'Mahanadi Basin Corridor / Cuttack Core',
    row: 0,
    col: 1,
    latMin: 20.40,
    latMax: 20.60,
    lonMin: 85.70,
    lonMax: 85.90,
    center: [20.50, 85.80],
    radarDbz: 48.5,
    rainRateMmh: 52.8,
    pressureHpa: 1002.5,
    tempC: 26.2,
    windGustKmh: 58,
    capeJkg: 2850,
    lightningStrokesMin: 12,
    hailRisk: 'MODERATE (40%)',
    cloudburstFlag: false,
    description: 'Major river confluence; high low-level moisture convergence.'
  },
  {
    id: 'SEC-NE',
    code: 'R0_C2',
    name: 'Paradeep Approach West',
    row: 0,
    col: 2,
    latMin: 20.40,
    latMax: 20.60,
    lonMin: 85.90,
    lonMax: 86.10,
    center: [20.50, 86.00],
    radarDbz: 32.0,
    rainRateMmh: 18.5,
    pressureHpa: 1005.1,
    tempC: 31.0,
    windGustKmh: 38,
    capeJkg: 2400,
    lightningStrokesMin: 4,
    hailRisk: 'LOW (15%)',
    cloudburstFlag: false,
    description: 'Coastal maritime transit sector with sea-breeze interaction.'
  },

  // ROW 1 (CENTER: 20.2°N to 20.4°N — CONTAINS VEBS AIRPORT)
  {
    id: 'SEC-W',
    code: 'R1_C0',
    name: 'Khurda Highway Ridge / NH-16',
    row: 1,
    col: 0,
    latMin: 20.20,
    latMax: 20.40,
    lonMin: 85.50,
    lonMax: 85.70,
    center: [20.30, 85.60],
    radarDbz: 56.0,
    rainRateMmh: 94.2,
    pressureHpa: 1001.0,
    tempC: 24.1,
    windGustKmh: 74,
    capeJkg: 3200,
    lightningStrokesMin: 22,
    hailRisk: 'HIGH (75% / 28mm MESH)',
    cloudburstFlag: false,
    description: 'Orographic highway ridge triggering secondary convective multicellular growth.'
  },
  {
    id: 'SEC-C',
    code: 'R1_C1',
    name: 'VEBS Aerodrome Core / Smart City',
    row: 1,
    col: 1,
    latMin: 20.20,
    latMax: 20.40,
    lonMin: 85.70,
    lonMax: 85.90,
    center: [20.30, 85.80],
    radarDbz: 64.5,
    rainRateMmh: 174.5,
    pressureHpa: 999.2,
    tempC: 22.8,
    windGustKmh: 99,
    capeJkg: 3600,
    lightningStrokesMin: 34,
    hailRisk: 'EXTREME (92% / 48mm MESH)',
    cloudburstFlag: true,
    description: 'Direct severe microburst touchdown & low-level wind shear over Runway 01/19.'
  },
  {
    id: 'SEC-E',
    code: 'R1_C2',
    name: 'Balianta-Kuakhai River Corridor',
    row: 1,
    col: 2,
    latMin: 20.20,
    latMax: 20.40,
    lonMin: 85.90,
    lonMax: 86.10,
    center: [20.30, 86.00],
    radarDbz: 42.0,
    rainRateMmh: 36.4,
    pressureHpa: 1002.8,
    tempC: 27.5,
    windGustKmh: 48,
    capeJkg: 2700,
    lightningStrokesMin: 8,
    hailRisk: 'MODERATE (30%)',
    cloudburstFlag: false,
    description: 'River floodplain capturing cold-pool gust front outflow drainage.'
  },

  // ROW 2 (SOUTH: 20.0°N to 20.2°N)
  {
    id: 'SEC-SW',
    code: 'R2_C0',
    name: 'Jatni-Janla Western Approach',
    row: 2,
    col: 0,
    latMin: 20.00,
    latMax: 20.20,
    lonMin: 85.50,
    lonMax: 85.70,
    center: [20.10, 85.60],
    radarDbz: 28.5,
    rainRateMmh: 14.8,
    pressureHpa: 1003.5,
    tempC: 29.8,
    windGustKmh: 36,
    capeJkg: 2300,
    lightningStrokesMin: 3,
    hailRisk: 'LOW (12%)',
    cloudburstFlag: false,
    description: 'Railway corridor and major high-voltage power transmission grid.'
  },
  {
    id: 'SEC-S',
    code: 'R2_C1',
    name: 'Pipili Highway Intercept',
    row: 2,
    col: 1,
    latMin: 20.00,
    latMax: 20.20,
    lonMin: 85.70,
    lonMax: 85.90,
    center: [20.10, 85.80],
    radarDbz: 38.0,
    rainRateMmh: 28.6,
    pressureHpa: 1001.8,
    tempC: 25.4,
    windGustKmh: 52,
    capeJkg: 2950,
    lightningStrokesMin: 14,
    hailRisk: 'MODERATE (35%)',
    cloudburstFlag: false,
    description: 'Puri pilgrimage highway corridor; active feeder convective band.'
  },
  {
    id: 'SEC-SE',
    code: 'R2_C2',
    name: 'Daya River Delta / Chilika Margin',
    row: 2,
    col: 2,
    latMin: 20.00,
    latMax: 20.20,
    lonMin: 85.90,
    lonMax: 86.10,
    center: [20.10, 86.00],
    radarDbz: 30.5,
    rainRateMmh: 16.2,
    pressureHpa: 1004.2,
    tempC: 28.9,
    windGustKmh: 42,
    capeJkg: 2600,
    lightningStrokesMin: 5,
    hailRisk: 'LOW (15%)',
    cloudburstFlag: false,
    description: 'Littoral marshland pumping maritime moisture into convective updrafts.'
  },
];

// ============================================================================
// 9 SURROUNDING AUTOMATIC WEATHER STATIONS (AWS IN-SITU NETWORK)
// ============================================================================
export const SURROUNDING_AWS_STATIONS: SurfaceAwsStation[] = [
  {
    id: 'AWS-VEBS',
    code: '42971',
    name: 'Biju Patnaik Airport (Aerodrome AWS)',
    lat: 20.2444,
    lon: 85.8178,
    elevationM: 42.0,
    tempC: 22.8,
    dewPointC: 22.1,
    humidityPct: 96,
    pressureHpa: 999.2,
    tendency3h: -4.8, // Rapid cyclonic barometric fall
    windDirDeg: 210,
    windSpeedKt: 28,
    windGustKt: 54, // 100 km/h squall gust
    rain1hMm: 68.4,
    rainRateMmh: 174.5,
    capeJkg: 3600,
    status: 'SEVERE_ALERT'
  },
  {
    id: 'AWS-CTC',
    code: '42973',
    name: 'Cuttack Ravenshaw Meteorological Observatory',
    lat: 20.4620,
    lon: 85.8820,
    elevationM: 36.0,
    tempC: 26.2,
    dewPointC: 24.0,
    humidityPct: 88,
    pressureHpa: 1002.5,
    tendency3h: -2.4,
    windDirDeg: 190,
    windSpeedKt: 16,
    windGustKt: 31,
    rain1hMm: 24.2,
    rainRateMmh: 52.8,
    capeJkg: 2850,
    status: 'WARNING'
  },
  {
    id: 'AWS-KUR',
    code: '42975',
    name: 'Khurda District Collectorate AWS',
    lat: 20.1820,
    lon: 85.6250,
    elevationM: 75.0,
    tempC: 24.1,
    dewPointC: 22.8,
    humidityPct: 92,
    pressureHpa: 1001.0,
    tendency3h: -3.6,
    windDirDeg: 230,
    windSpeedKt: 22,
    windGustKt: 40,
    rain1hMm: 42.0,
    rainRateMmh: 94.2,
    capeJkg: 3200,
    status: 'SEVERE_ALERT'
  },
  {
    id: 'AWS-PIP',
    code: '42978',
    name: 'Pipili Agrimet Observation Station',
    lat: 20.1150,
    lon: 85.8350,
    elevationM: 28.0,
    tempC: 23.5,
    dewPointC: 22.5,
    humidityPct: 94,
    pressureHpa: 1000.4,
    tendency3h: -3.2,
    windDirDeg: 200,
    windSpeedKt: 24,
    windGustKt: 42,
    rain1hMm: 54.0,
    rainRateMmh: 38.0,
    capeJkg: 2950,
    status: 'WARNING'
  },
  {
    id: 'AWS-PURI',
    code: '43053',
    name: 'Puri Coastal Baseline Observatory',
    lat: 19.8130,
    lon: 85.8310,
    elevationM: 9.0,
    tempC: 29.5,
    dewPointC: 26.2,
    humidityPct: 82,
    pressureHpa: 1005.1,
    tendency3h: -1.2,
    windDirDeg: 160,
    windSpeedKt: 18,
    windGustKt: 25,
    rain1hMm: 4.5,
    rainRateMmh: 12.0,
    capeJkg: 2400,
    status: 'NOMINAL'
  },
  {
    id: 'AWS-PAR',
    code: '42976',
    name: 'Paradeep Port Meteorological Office',
    lat: 20.2640,
    lon: 86.6710,
    elevationM: 6.0,
    tempC: 30.1,
    dewPointC: 26.0,
    humidityPct: 79,
    pressureHpa: 1006.4,
    tendency3h: -0.8,
    windDirDeg: 140,
    windSpeedKt: 21,
    windGustKt: 28,
    rain1hMm: 2.0,
    rainRateMmh: 6.0,
    capeJkg: 2100,
    status: 'NOMINAL'
  },
  {
    id: 'AWS-CDK',
    code: '42972',
    name: 'Chandaka Reserve Forest Station',
    lat: 20.3800,
    lon: 85.7400,
    elevationM: 82.0,
    tempC: 24.8,
    dewPointC: 22.9,
    humidityPct: 89,
    pressureHpa: 1002.8,
    tendency3h: -2.1,
    windDirDeg: 220,
    windSpeedKt: 14,
    windGustKt: 26,
    rain1hMm: 18.0,
    rainRateMmh: 32.0,
    capeJkg: 2750,
    status: 'NOMINAL'
  },
  {
    id: 'AWS-NMP',
    code: '42979',
    name: 'Nimapada Hydrological AWS',
    lat: 20.0800,
    lon: 86.0200,
    elevationM: 18.0,
    tempC: 25.2,
    dewPointC: 23.6,
    humidityPct: 91,
    pressureHpa: 1001.8,
    tendency3h: -2.8,
    windDirDeg: 185,
    windSpeedKt: 19,
    windGustKt: 32,
    rain1hMm: 38.5,
    rainRateMmh: 42.0,
    capeJkg: 2950,
    status: 'WARNING'
  },
  {
    id: 'AWS-CHK',
    code: '43051',
    name: 'Chilika Lagoon North Observatory',
    lat: 19.9800,
    lon: 85.5200,
    elevationM: 12.0,
    tempC: 28.0,
    dewPointC: 25.4,
    humidityPct: 86,
    pressureHpa: 1003.9,
    tendency3h: -1.5,
    windDirDeg: 175,
    windSpeedKt: 17,
    windGustKt: 27,
    rain1hMm: 8.2,
    rainRateMmh: 14.5,
    capeJkg: 2550,
    status: 'NOMINAL'
  },
];

/** Lookup sector by coordinates */
export function getSectorForLatLng(lat: number, lon: number): TacticalSector | null {
  return TACTICAL_3X3_GRID.find(
    s => lat >= s.latMin && lat <= s.latMax && lon >= s.lonMin && lon <= s.lonMax
  ) || null;
}

/** Get nearest AWS station */
export function getNearestAwsStation(lat: number, lon: number): SurfaceAwsStation {
  let closest = SURROUNDING_AWS_STATIONS[0];
  let minDist = Number.MAX_VALUE;
  for (const s of SURROUNDING_AWS_STATIONS) {
    const dist = Math.hypot(lat - s.lat, lon - s.lon);
    if (dist < minDist) {
      minDist = dist;
      closest = s;
    }
  }
  return closest;
}

// ============================================================================
// HYPER-LOCAL AERODROME 3.0 KM × 3.0 KM GRID (1.0 KM × 1.0 KM CELLS)
// Verified Geodesic Bounds: Lat 20.2309°N–20.2579°N, Lon 85.8034°E–85.8322°E
// Problem Statement 26084: Convective scale nowcasting (1–2 km resolution)
// ============================================================================

export const AERODROME_CORE_SPECS = {
  id: 'VEBS-3X3KM-CORE',
  name: 'VEBS Aerodrome Core Tactical Domain (3.0 km × 3.0 km)',
  center: [20.2444, 85.8178] as [number, number],
  bounds: [
    [20.2309, 85.8034], // SW corner
    [20.2579, 85.8322], // NE corner
  ] as [[number, number], [number, number]],
  widthMeters: 3000,
  heightMeters: 3000,
  areaKm2: 9.0,
  cellResolutionMeters: 1000, // 1.0 km x 1.0 km
  runwayLengthMeters: 2743,
  compliance: 'MoES PS-26084: 1–2 km Convective Scale Resolution',
};

export const AERODROME_3X3_KM_GRID: TacticalSector[] = [
  // ROW 0 (NORTH: +0.5 km to +1.5 km of Airport Center)
  {
    id: 'T-A1',
    code: 'SEC_A1',
    name: 'RWY 19 West Approach Buffer (1 km²)',
    row: 0,
    col: 0,
    latMin: 20.2489,
    latMax: 20.2579,
    lonMin: 85.8034,
    lonMax: 85.8130,
    center: [20.2534, 85.8082],
    radarDbz: 34.5,
    rainRateMmh: 24.0,
    pressureHpa: 1000.5,
    tempC: 25.1,
    windGustKmh: 42,
    capeJkg: 2800,
    lightningStrokesMin: 6,
    hailRisk: 'LOW (<20%)',
    cloudburstFlag: false,
    description: '1 km² cell: Northwest approach corridor outside perimeter fence.'
  },
  {
    id: 'T-A2',
    code: 'SEC_A2',
    name: 'RWY 19 Threshold & Localizer North (1 km²)',
    row: 0,
    col: 1,
    latMin: 20.2489,
    latMax: 20.2579,
    lonMin: 85.8130,
    lonMax: 85.8226,
    center: [20.2534, 85.8178],
    radarDbz: 46.2,
    rainRateMmh: 48.0,
    pressureHpa: 999.8,
    tempC: 24.3,
    windGustKmh: 56,
    capeJkg: 3100,
    lightningStrokesMin: 14,
    hailRisk: 'MODERATE (45%)',
    cloudburstFlag: false,
    description: '1 km² cell: Contains Runway 19 threshold (20.2550°N) and Category-I ILS localizer array.'
  },
  {
    id: 'T-A3',
    code: 'SEC_A3',
    name: 'Terminal 1/2 & Main Apron North (1 km²)',
    row: 0,
    col: 2,
    latMin: 20.2489,
    latMax: 20.2579,
    lonMin: 85.8226,
    lonMax: 85.8322,
    center: [20.2534, 85.8274],
    radarDbz: 38.0,
    rainRateMmh: 31.5,
    pressureHpa: 1000.2,
    tempC: 24.8,
    windGustKmh: 48,
    capeJkg: 2950,
    lightningStrokesMin: 8,
    hailRisk: 'LOW (<25%)',
    cloudburstFlag: false,
    description: '1 km² cell: Commercial passenger terminals, taxiway stand parking, ground ramp operations.'
  },

  // ROW 1 (MIDFIELD: -0.5 km to +0.5 km of Airport Center)
  {
    id: 'T-B1',
    code: 'SEC_B1',
    name: 'West Airside / Perimeter Taxiway (1 km²)',
    row: 1,
    col: 0,
    latMin: 20.2399,
    latMax: 20.2489,
    lonMin: 85.8034,
    lonMax: 85.8130,
    center: [20.2444, 85.8082],
    radarDbz: 51.0,
    rainRateMmh: 68.0,
    pressureHpa: 999.5,
    tempC: 23.6,
    windGustKmh: 64,
    capeJkg: 3300,
    lightningStrokesMin: 18,
    hailRisk: 'HIGH (60%)',
    cloudburstFlag: false,
    description: '1 km² cell: Western airfield boundary and parallel perimeter drainage culvert.'
  },
  {
    id: 'T-B2',
    code: 'SEC_B2',
    name: 'Aerodrome Midfield / DWR & ATC Tower (1 km²)',
    row: 1,
    col: 1,
    latMin: 20.2399,
    latMax: 20.2489,
    lonMin: 85.8130,
    lonMax: 85.8226,
    center: [20.2444, 85.8178],
    radarDbz: 58.5,
    rainRateMmh: 112.0,
    pressureHpa: 999.2,
    tempC: 23.1,
    windGustKmh: 82,
    capeJkg: 3500,
    lightningStrokesMin: 28,
    hailRisk: 'SEVERE (82% / 35mm MESH)',
    cloudburstFlag: true,
    description: '1 km² cell: Airfield geometric center, ATC control tower, DWR radar radome, midpoint of Runway 01/19.'
  },
  {
    id: 'T-B3',
    code: 'SEC_B3',
    name: 'East Apron / Cargo & Fire Station (1 km²)',
    row: 1,
    col: 2,
    latMin: 20.2399,
    latMax: 20.2489,
    lonMin: 85.8226,
    lonMax: 85.8322,
    center: [20.2444, 85.8274],
    radarDbz: 44.0,
    rainRateMmh: 42.0,
    pressureHpa: 1000.0,
    tempC: 24.0,
    windGustKmh: 54,
    capeJkg: 3050,
    lightningStrokesMin: 11,
    hailRisk: 'MODERATE (40%)',
    cloudburstFlag: false,
    description: '1 km² cell: Eastern air cargo hub, aviation fuel farm, ARFF airport crash tender station.'
  },

  // ROW 2 (SOUTH: -1.5 km to -0.5 km of Airport Center — ACTIVE MICROBURST INTERCEPT)
  {
    id: 'T-C1',
    code: 'SEC_C1',
    name: 'Southwest Inflow Ridge / Khandagiri (1 km²)',
    row: 2,
    col: 0,
    latMin: 20.2309,
    latMax: 20.2399,
    lonMin: 85.8034,
    lonMax: 85.8130,
    center: [20.2354, 85.8082],
    radarDbz: 60.2,
    rainRateMmh: 135.0,
    pressureHpa: 998.8,
    tempC: 22.4,
    windGustKmh: 88,
    capeJkg: 3600,
    lightningStrokesMin: 32,
    hailRisk: 'SEVERE (88% / 42mm MESH)',
    cloudburstFlag: true,
    description: '1 km² cell: Southwestern boundary inflow zone triggering explosive convective cell development.'
  },
  {
    id: 'T-C2',
    code: 'SEC_C2',
    name: 'RWY 01 Touchdown / Microburst Core (1 km²)',
    row: 2,
    col: 1,
    latMin: 20.2309,
    latMax: 20.2399,
    lonMin: 85.8130,
    lonMax: 85.8226,
    center: [20.2354, 85.8178],
    radarDbz: 64.5,
    rainRateMmh: 174.5,
    pressureHpa: 998.4,
    tempC: 21.8,
    windGustKmh: 99,
    capeJkg: 3750,
    lightningStrokesMin: 38,
    hailRisk: 'EXTREME (94% / 48mm MESH)',
    cloudburstFlag: true,
    description: '1 km² cell: Contains Runway 01 threshold (20.2338°N); active center of severe microburst and 48 m/s LLWS.'
  },
  {
    id: 'T-C3',
    code: 'SEC_C3',
    name: 'Southeast Glideslope / Outer Marker (1 km²)',
    row: 2,
    col: 2,
    latMin: 20.2309,
    latMax: 20.2399,
    lonMin: 85.8226,
    lonMax: 85.8322,
    center: [20.2354, 85.8274],
    radarDbz: 49.0,
    rainRateMmh: 62.0,
    pressureHpa: 999.6,
    tempC: 23.5,
    windGustKmh: 62,
    capeJkg: 3200,
    lightningStrokesMin: 16,
    hailRisk: 'HIGH (55%)',
    cloudburstFlag: false,
    description: '1 km² cell: Runway 01 instrument approach corridor and south glideslope antenna tower.'
  },
];
