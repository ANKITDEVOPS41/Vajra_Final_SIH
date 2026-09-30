/**
 * Meteorological Raster Generator
 * Generates continuous physical raster layers (Temperature, MSLP Pressure, Relative Humidity, IR Brightness Temp)
 * using Inverse Distance Weighting (IDW) & thermodynamic perturbations.
 * Output is an ImageOverlay Data URL with smooth meteorological colormaps.
 */

export interface RasterStation {
  lat: number;
  lon: number;
  tempC: number;
  pressureHpa: number;
  humidityPct: number;
}

export interface ConvectivePerturbation {
  lat: number;
  lon: number;
  peakDbz: number;
  radiusKm?: number;
}

// Calibrated Color Palettes
export function getTemperatureColor(tempC: number): [number, number, number, number] {
  // 20°C (Teal) -> 24°C (Sky Blue) -> 28°C (Lime) -> 32°C (Yellow) -> 35°C (Orange) -> 38°C (Red) -> 42°C (Crimson)
  if (tempC <= 20) return [13, 148, 136, 180]; // #0d9488
  if (tempC <= 24) {
    const t = (tempC - 20) / 4;
    return [Math.round(13 + (2 - 13) * t), Math.round(148 + (132 - 148) * t), Math.round(136 + (199 - 136) * t), 190];
  }
  if (tempC <= 28) {
    const t = (tempC - 24) / 4;
    return [Math.round(2 + (132 - 2) * t), Math.round(132 + (204 - 132) * t), Math.round(199 + (22 - 199) * t), 200];
  }
  if (tempC <= 32) {
    const t = (tempC - 28) / 4;
    return [Math.round(132 + (234 - 132) * t), Math.round(204 + (179 - 204) * t), Math.round(22 + (8 - 22) * t), 210];
  }
  if (tempC <= 36) {
    const t = (tempC - 32) / 4;
    return [Math.round(234 + (249 - 234) * t), Math.round(179 + (115 - 179) * t), Math.round(8 + (22 - 8) * t), 220];
  }
  if (tempC <= 40) {
    const t = (tempC - 36) / 4;
    return [Math.round(249 + (239 - 249) * t), Math.round(115 + (68 - 115) * t), Math.round(22 + (68 - 22) * t), 230];
  }
  return [153, 27, 27, 240]; // Crimson >40°C
}

export function getPressureColor(pressureHpa: number): [number, number, number, number] {
  // Mesolow (<1006 hPa: Violet/Indigo) -> 1008 (Blue) -> 1010 (Cyan/Teal) -> 1012 (Green) -> 1014 (Yellow) -> >1016 (Amber/Ochre)
  if (pressureHpa <= 1004) return [79, 70, 229, 210]; // #4f46e5 (Indigo Mesolow)
  if (pressureHpa <= 1008) {
    const t = (pressureHpa - 1004) / 4;
    return [Math.round(79 + (2 - 79) * t), Math.round(70 + (132 - 70) * t), Math.round(229 + (199 - 229) * t), 200];
  }
  if (pressureHpa <= 1011) {
    const t = (pressureHpa - 1008) / 3;
    return [Math.round(2 + (16 - 2) * t), Math.round(132 + (185 - 132) * t), Math.round(199 + (129 - 199) * t), 190];
  }
  if (pressureHpa <= 1014) {
    const t = (pressureHpa - 1011) / 3;
    return [Math.round(16 + (234 - 16) * t), Math.round(185 + (179 - 185) * t), Math.round(129 + (8 - 129) * t), 180];
  }
  return [217, 119, 6, 200]; // #d97706 High Pressure
}

export function getHumidityColor(humidityPct: number): [number, number, number, number] {
  // <40% (Dry Bronze) -> 60% (Olive) -> 75% (Teal) -> 85% (Cyan) -> 95% (Blue) -> >98% (Saturated Magenta)
  if (humidityPct <= 45) return [180, 83, 9, 160]; // Dry Bronze
  if (humidityPct <= 65) {
    const t = (humidityPct - 45) / 20;
    return [Math.round(180 + (101 - 180) * t), Math.round(83 + (163 - 83) * t), Math.round(9 + (13 - 9) * t), 180];
  }
  if (humidityPct <= 80) {
    const t = (humidityPct - 65) / 15;
    return [Math.round(101 + (2 - 101) * t), Math.round(163 + (132 - 163) * t), Math.round(13 + (199 - 13) * t), 200];
  }
  if (humidityPct <= 92) {
    const t = (humidityPct - 80) / 12;
    return [Math.round(2 + (99 - 2) * t), Math.round(132 + (102 - 132) * t), Math.round(199 + (241 - 199) * t), 220];
  }
  // Saturated convective column (>92%)
  const t = Math.min((humidityPct - 92) / 8, 1.0);
  return [Math.round(99 + (192 - 99) * t), Math.round(102 + (38 - 102) * t), Math.round(241 + (211 - 241) * t), 235]; // Magenta #c026d3
}

export function getBrightnessTempColor(btK: number): [number, number, number, number] {
  // Dvorak BD-Curve Enhancement:
  // >240K: Navy -> 230K: Cyan -> 220K: Green -> 210K: Yellow -> 200K: Orange -> 190K: Red -> <185K: Deep Crimson
  if (btK >= 245) return [29, 78, 216, 70]; // Navy fringe
  if (btK >= 230) {
    const t = (245 - btK) / 15;
    return [Math.round(29 + (6 - 29) * t), Math.round(78 + (182 - 78) * t), Math.round(216 + (212 - 216) * t), Math.round(70 + 80 * t)];
  }
  if (btK >= 215) {
    const t = (230 - btK) / 15;
    return [Math.round(6 + (34 - 6) * t), Math.round(182 + (197 - 182) * t), Math.round(212 + (94 - 212) * t), Math.round(150 + 50 * t)];
  }
  if (btK >= 205) {
    const t = (215 - btK) / 10;
    return [Math.round(34 + (234 - 34) * t), Math.round(197 + (179 - 197) * t), Math.round(94 + (8 - 94) * t), Math.round(200 + 20 * t)];
  }
  if (btK >= 195) {
    const t = (205 - btK) / 10;
    return [Math.round(234 + (249 - 234) * t), Math.round(179 + (115 - 179) * t), Math.round(8 + (22 - 8) * t), Math.round(220 + 15 * t)];
  }
  if (btK >= 185) {
    const t = (195 - btK) / 10;
    return [Math.round(249 + (239 - 249) * t), Math.round(115 + (68 - 115) * t), Math.round(22 + (68 - 22) * t), 240];
  }
  return [127, 29, 29, 250]; // Overshooting top <185K Deep Crimson
}

export interface GenerateRasterOptions {
  type: 'temperature' | 'pressure' | 'humidity' | 'ir_rainbow';
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  stations: RasterStation[];
  perturbations?: ConvectivePerturbation[];
  gridResolution?: number; // e.g. 100x100
}

/**
 * Generates an interpolated raster image Data URL for Leaflet ImageOverlay
 */
export function generateMeteorologicalRaster({
  type,
  bounds,
  stations,
  perturbations = [],
  gridResolution = 200,
}: GenerateRasterOptions): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = gridResolution;
  canvas.height = gridResolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(gridResolution, gridResolution);
  const data = imgData.data;

  const latMin = bounds[0][0];
  const lonMin = bounds[0][1];
  const latMax = bounds[1][0];
  const lonMax = bounds[1][1];

  const latSpan = latMax - latMin;
  const lonSpan = lonMax - lonMin;

  for (let y = 0; y < gridResolution; y++) {
    // Canvas y=0 is north (latMax), y=height is south (latMin)
    const lat = latMax - (y / (gridResolution - 1)) * latSpan;

    for (let x = 0; x < gridResolution; x++) {
      const lon = lonMin + (x / (gridResolution - 1)) * lonSpan;
      const pixelIndex = (y * gridResolution + x) * 4;

      // 1. Interpolate station base value using Inverse Distance Weighting (IDW)
      let weightSum = 0;
      let tempSum = 0;
      let pressureSum = 0;
      let humiditySum = 0;

      for (const st of stations) {
        const dLat = (st.lat - lat) * 111.0;
        const dLon = (st.lon - lon) * 111.0 * Math.cos((lat * Math.PI) / 180);
        const distKm = Math.sqrt(dLat * dLat + dLon * dLon) + 0.1; // Smoothing offset

        const w = 1.0 / Math.pow(distKm, 3.0);
        weightSum += w;
        tempSum += st.tempC * w;
        pressureSum += st.pressureHpa * w;
        humiditySum += st.humidityPct * w;
      }

      let baseTemp = weightSum > 0 ? tempSum / weightSum : 28.0;
      let basePressure = weightSum > 0 ? pressureSum / weightSum : 1010.0;
      let baseHumidity = weightSum > 0 ? humiditySum / weightSum : 80.0;

      // 2. Apply convective perturbations from active storm cells
      let maxCellDbz = 0;
      for (const cell of perturbations) {
        const dLat = (cell.lat - lat) * 111.0;
        const dLon = (cell.lon - lon) * 111.0 * Math.cos((lat * Math.PI) / 180);
        const distKm = Math.sqrt(dLat * dLat + dLon * dLon);
        const influenceRadius = cell.radiusKm || 12.0;

        if (distKm < influenceRadius) {
          const factor = Math.cos((distKm / influenceRadius) * (Math.PI / 2));
          const dbzEffect = (cell.peakDbz / 65.0) * factor;

          // Cold pool evaporative cooling (-3 to -6°C)
          baseTemp -= dbzEffect * 4.5;
          // Dynamic mesolow pressure drop (-2 to -5 hPa)
          basePressure -= dbzEffect * 3.8;
          // Updraft moisture convergence (+10 to +25% RH up to 99%)
          baseHumidity = Math.min(99.5, baseHumidity + dbzEffect * 22.0);

          if (cell.peakDbz * factor > maxCellDbz) {
            maxCellDbz = cell.peakDbz * factor;
          }
        }
      }

      // 3. Map to pixel colors
      let color: [number, number, number, number];

      if (type === 'temperature') {
        color = getTemperatureColor(baseTemp);
      } else if (type === 'pressure') {
        color = getPressureColor(basePressure);
      } else if (type === 'humidity') {
        color = getHumidityColor(baseHumidity);
      } else {
        // ir_rainbow: map convective intensity to brightness temperature (Kelvin)
        // Background troposphere: 245K, intense convective core: down to 180K
        const btK = Math.max(180, 245 - (maxCellDbz / 65.0) * 65);
        color = getBrightnessTempColor(btK);
      }

      data[pixelIndex] = color[0];
      data[pixelIndex + 1] = color[1];
      data[pixelIndex + 2] = color[2];
      data[pixelIndex + 3] = color[3];
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Generate Isobar Contours for Atmospheric Pressure Mode
 */
export interface IsobarLine {
  pressureHpa: number;
  label: string;
  points: [number, number][];
}

export function generateDynamicIsobars(
  stations: RasterStation[],
  perturbations: ConvectivePerturbation[] = [],
  bounds: [[number, number], [number, number]]
): IsobarLine[] {
  // Generate concentric or curved isobar paths across the Odisha domain
  const isobars: IsobarLine[] = [];
  const isobarLevels = [1006, 1008, 1010, 1012, 1014];

  // If there's an active convective cell with a mesolow, curve the isobars around the core
  const primaryCell = perturbations.length > 0 ? perturbations[0] : { lat: 20.2444, lon: 85.8178, peakDbz: 55 };

  isobarLevels.forEach((hpa) => {
    const points: [number, number][] = [];
    const radiusDeg = (hpa - 1003) * 0.085; // Organic distance from mesolow

    for (let angle = 0; angle <= 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      // Elliptical deformation along storm propagation axis
      const latWarp = 1.0 + 0.25 * Math.sin(rad * 2);
      const lonWarp = 1.2 + 0.2 * Math.cos(rad);

      const lat = primaryCell.lat + Math.sin(rad) * radiusDeg * latWarp;
      const lon = primaryCell.lon + Math.cos(rad) * radiusDeg * lonWarp;

      if (lat >= bounds[0][0] && lat <= bounds[1][0] && lon >= bounds[0][1] && lon <= bounds[1][1]) {
        points.push([lat, lon]);
      }
    }

    if (points.length >= 4) {
      isobars.push({
        pressureHpa: hpa,
        label: `${hpa} hPa`,
        points,
      });
    }
  });

  return isobars;
}
