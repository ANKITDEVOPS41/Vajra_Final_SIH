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
// 3x3 TACTICAL GRID (Hyperlocal 1km Resolution around VEBS Aerodrome)
// ============================================================================
export const TACTICAL_3X3_GRID: TacticalSector[] = [
  // ROW 0: NORTH (20.2489 to 20.2579)
  { id: 'SEC-NW', code: 'R0_C0', name: 'NW Approach (Khandagiri)', row: 0, col: 0, latMin: 20.2489, latMax: 20.2579, lonMin: 85.8034, lonMax: 85.8130, center: [20.2534, 85.8082], radarDbz: 22, rainRateMmh: 2.1, pressureHpa: 1004.2, tempC: 28.5, windGustKmh: 24, capeJkg: 1800, lightningStrokesMin: 0, hailRisk: 'NONE', cloudburstFlag: false, description: 'Moderate peripheral convection' },
  { id: 'SEC-N', code: 'R0_C1', name: 'N Final Approach', row: 0, col: 1, latMin: 20.2489, latMax: 20.2579, lonMin: 85.8130, lonMax: 85.8226, center: [20.2534, 85.8178], radarDbz: 49, rainRateMmh: 35.5, pressureHpa: 1002.8, tempC: 26.2, windGustKmh: 68, capeJkg: 3200, lightningStrokesMin: 12, hailRisk: 'ELEVATED', cloudburstFlag: false, description: 'Intense cell intercepting approach path' },
  { id: 'SEC-NE', code: 'R0_C2', name: 'NE Urban (Bhubaneswar Center)', row: 0, col: 2, latMin: 20.2489, latMax: 20.2579, lonMin: 85.8226, lonMax: 85.8322, center: [20.2534, 85.8274], radarDbz: 32, rainRateMmh: 12.0, pressureHpa: 1003.5, tempC: 27.8, windGustKmh: 35, capeJkg: 2100, lightningStrokesMin: 2, hailRisk: 'NONE', cloudburstFlag: false, description: 'Heavy rain, moderate turbulence' },
  // ROW 1: CENTER (20.2399 to 20.2489)
  { id: 'SEC-W', code: 'R1_C0', name: 'W Perimeter', row: 1, col: 0, latMin: 20.2399, latMax: 20.2489, lonMin: 85.8034, lonMax: 85.8130, center: [20.2444, 85.8082], radarDbz: 28, rainRateMmh: 6.5, pressureHpa: 1004.0, tempC: 28.1, windGustKmh: 28, capeJkg: 1900, lightningStrokesMin: 0, hailRisk: 'NONE', cloudburstFlag: false, description: 'Stratiform precipitation' },
  { id: 'SEC-C', code: 'R1_C1', name: 'C Aerodrome (VEBS Terminals)', row: 1, col: 1, latMin: 20.2399, latMax: 20.2489, lonMin: 85.8130, lonMax: 85.8226, center: [20.2444, 85.8178], radarDbz: 52, rainRateMmh: 68.5, pressureHpa: 1001.2, tempC: 24.8, windGustKmh: 85, capeJkg: 4100, lightningStrokesMin: 28, hailRisk: 'SEVERE', cloudburstFlag: true, description: 'Extreme microburst / cloudburst directly over ATC & Terminals' },
  { id: 'SEC-E', code: 'R1_C2', name: 'E Perimeter', row: 1, col: 2, latMin: 20.2399, latMax: 20.2489, lonMin: 85.8226, lonMax: 85.8322, center: [20.2444, 85.8274], radarDbz: 42, rainRateMmh: 22.4, pressureHpa: 1003.1, tempC: 26.9, windGustKmh: 45, capeJkg: 2600, lightningStrokesMin: 5, hailRisk: 'LOW', cloudburstFlag: false, description: 'Squall line edge passing East' },
  // ROW 2: SOUTH (20.2309 to 20.2399)
  { id: 'SEC-SW', code: 'R2_C0', name: 'SW Approach', row: 2, col: 0, latMin: 20.2309, latMax: 20.2399, lonMin: 85.8034, lonMax: 85.8130, center: [20.2354, 85.8082], radarDbz: 29, rainRateMmh: 8.2, pressureHpa: 1004.1, tempC: 28.0, windGustKmh: 30, capeJkg: 1950, lightningStrokesMin: 1, hailRisk: 'NONE', cloudburstFlag: false, description: 'Outflow boundary rain' },
  { id: 'SEC-S', code: 'R2_C1', name: 'S Runway 32 Threshold', row: 2, col: 1, latMin: 20.2309, latMax: 20.2399, lonMin: 85.8130, lonMax: 85.8226, center: [20.2354, 85.8178], radarDbz: 46, rainRateMmh: 42.0, pressureHpa: 1002.4, tempC: 25.6, windGustKmh: 72, capeJkg: 3600, lightningStrokesMin: 15, hailRisk: 'ELEVATED', cloudburstFlag: false, description: 'Severe convective downdraft intercepting RWY 32' },
  { id: 'SEC-SE', code: 'R2_C2', name: 'SE Approach', row: 2, col: 2, latMin: 20.2309, latMax: 20.2399, lonMin: 85.8226, lonMax: 85.8322, center: [20.2354, 85.8274], radarDbz: 31, rainRateMmh: 10.5, pressureHpa: 1003.8, tempC: 27.5, windGustKmh: 32, capeJkg: 2200, lightningStrokesMin: 3, hailRisk: 'NONE', cloudburstFlag: false, description: 'Trailing stratiform rain' }
];

// ============================================================================
// 9 GROUND TRUTH AWS SENSORS (Hyperlocal distribution inside the 3x3 km bounds)
// ============================================================================
export const SURROUNDING_AWS_STATIONS: SurfaceAwsStation[] = [
  { id: 'AWS-RWY14', code: 'VEBS-14', name: 'Runway 14 Threshold', lat: 20.2520, lon: 85.8135, elevationM: 42, tempC: 26.2, dewPointC: 24.1, humidityPct: 92, pressureHpa: 1002.8, tendency3h: -2.1, windDirDeg: 340, windSpeedKt: 25, windGustKt: 42, rain1hMm: 35.5, rainRateMmh: 65.0, capeJkg: 3200, status: 'WARNING' },
  { id: 'AWS-ATC', code: 'VEBS-ATC', name: 'ATC Tower Roof', lat: 20.2450, lon: 85.8170, elevationM: 65, tempC: 24.8, dewPointC: 23.5, humidityPct: 96, pressureHpa: 1001.2, tendency3h: -3.5, windDirDeg: 310, windSpeedKt: 38, windGustKt: 55, rain1hMm: 68.5, rainRateMmh: 120.0, capeJkg: 4100, status: 'SEVERE_ALERT' },
  { id: 'AWS-T1', code: 'VEBS-T1', name: 'Terminal 1 Apron', lat: 20.2475, lon: 85.8190, elevationM: 42, tempC: 25.1, dewPointC: 23.8, humidityPct: 95, pressureHpa: 1001.5, tendency3h: -3.2, windDirDeg: 315, windSpeedKt: 32, windGustKt: 48, rain1hMm: 52.0, rainRateMmh: 95.0, capeJkg: 3800, status: 'SEVERE_ALERT' },
  { id: 'AWS-RWY32', code: 'VEBS-32', name: 'Runway 32 Threshold', lat: 20.2370, lon: 85.8210, elevationM: 43, tempC: 25.6, dewPointC: 23.5, humidityPct: 88, pressureHpa: 1002.4, tendency3h: -2.5, windDirDeg: 290, windSpeedKt: 30, windGustKt: 45, rain1hMm: 42.0, rainRateMmh: 75.0, capeJkg: 3600, status: 'WARNING' },
  { id: 'AWS-FIRE', code: 'VEBS-FIRE', name: 'Aerodrome Fire Station', lat: 20.2420, lon: 85.8150, elevationM: 43, tempC: 25.4, dewPointC: 23.2, humidityPct: 86, pressureHpa: 1002.1, tendency3h: -2.8, windDirDeg: 300, windSpeedKt: 28, windGustKt: 40, rain1hMm: 38.0, rainRateMmh: 60.0, capeJkg: 3500, status: 'WARNING' },
  { id: 'AWS-KHD', code: 'VEBS-KHD', name: 'Khandagiri Approach', lat: 20.2550, lon: 85.8080, elevationM: 85, tempC: 27.5, dewPointC: 24.5, humidityPct: 82, pressureHpa: 1003.5, tendency3h: -1.5, windDirDeg: 270, windSpeedKt: 18, windGustKt: 25, rain1hMm: 12.0, rainRateMmh: 18.0, capeJkg: 2100, status: 'NOMINAL' },
  { id: 'AWS-BMP', code: 'VEBS-BMP', name: 'Barmunda Perimeter', lat: 20.2490, lon: 85.8060, elevationM: 45, tempC: 27.8, dewPointC: 24.8, humidityPct: 80, pressureHpa: 1003.8, tendency3h: -1.2, windDirDeg: 265, windSpeedKt: 15, windGustKt: 22, rain1hMm: 8.5, rainRateMmh: 12.0, capeJkg: 1900, status: 'NOMINAL' },
  { id: 'AWS-EKM', code: 'VEBS-EKM', name: 'Ekamra Perimeter', lat: 20.2480, lon: 85.8280, elevationM: 44, tempC: 26.9, dewPointC: 24.2, humidityPct: 85, pressureHpa: 1003.1, tendency3h: -1.8, windDirDeg: 320, windSpeedKt: 22, windGustKt: 35, rain1hMm: 22.4, rainRateMmh: 35.0, capeJkg: 2600, status: 'NOMINAL' },
  { id: 'AWS-PUN', code: 'VEBS-PUN', name: 'Puintola Perimeter', lat: 20.2330, lon: 85.8180, elevationM: 41, tempC: 27.2, dewPointC: 24.0, humidityPct: 83, pressureHpa: 1003.6, tendency3h: -1.4, windDirDeg: 280, windSpeedKt: 16, windGustKt: 24, rain1hMm: 14.5, rainRateMmh: 20.0, capeJkg: 2000, status: 'NOMINAL' }
];

export const AERODROME_3X3_KM_GRID = TACTICAL_3X3_GRID;
export const AERODROME_CORE_SPECS = VEBS_AIRPORT_SPECS;
