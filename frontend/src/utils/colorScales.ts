/**
 * Color scales and styling utilities for ConvectNow Ops-Room Dashboard
 */

export interface ColorStop {
  min: number;
  max: number;
  color: string;
  label: string;
}

// Standard WSR-88D / IMD Radar Reflectivity color scale (dBZ)
export const RADAR_DBZ_STOPS: ColorStop[] = [
  { min: 5, max: 15, color: '#00e5ff', label: '10 dBZ (Virga / Mist)' },
  { min: 15, max: 25, color: '#0080ff', label: '20 dBZ (Light Rain)' },
  { min: 25, max: 35, color: '#00d000', label: '30 dBZ (Moderate Rain)' },
  { min: 35, max: 45, color: '#ffff00', label: '40 dBZ (Heavy Rain)' },
  { min: 45, max: 55, color: '#ff6600', label: '50 dBZ (Thunderstorm / CI)' },
  { min: 55, max: 65, color: '#ff0000', label: '60 dBZ (Severe / Hail)' },
  { min: 65, max: 80, color: '#d500f9', label: '>65 dBZ (Cloudburst Core)' },
];

export function getRadarColor(dbz: number): string {
  if (dbz < 5) return 'transparent';
  for (const stop of RADAR_DBZ_STOPS) {
    if (dbz >= stop.min && dbz < stop.max) {
      return stop.color;
    }
  }
  return '#d500f9';
}

export function getHazardSeverityBadge(prob: number): {
  colorClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
  badgeBg: string;
} {
  if (prob < 30) {
    return {
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/30',
      borderClass: 'border-emerald-500/30',
      label: 'LOW',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  } else if (prob < 50) {
    return {
      colorClass: 'text-amber-300',
      bgClass: 'bg-amber-950/30',
      borderClass: 'border-amber-500/30',
      label: 'MODERATE',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  } else if (prob < 70) {
    return {
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-950/35',
      borderClass: 'border-orange-500/30',
      label: 'ELEVATED',
      badgeBg: 'bg-orange-500/25 text-orange-300 border-orange-500/40',
    };
  } else if (prob < 85) {
    return {
      colorClass: 'text-red-400',
      bgClass: 'bg-rose-950/40',
      borderClass: 'border-rose-500/40',
      label: 'SEVERE',
      badgeBg: 'bg-rose-500/25 text-rose-300 border-rose-500/50',
    };
  } else {
    return {
      colorClass: 'text-purple-300',
      bgClass: 'bg-purple-950/50',
      borderClass: 'border-purple-500/50 animate-pulse',
      label: 'EXTREME',
      badgeBg: 'bg-purple-600/30 text-purple-200 border-purple-400/60 shadow-lg shadow-purple-500/20',
    };
  }
}
