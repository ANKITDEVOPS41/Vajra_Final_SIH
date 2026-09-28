import { useState, useEffect, useCallback } from 'react';

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RainViewerData {
  radarTileUrl: string | null;
  satelliteTileUrl: string | null;
  latestTimestamp: number | null;
  timeFormatted: string | null;
  isLoading: boolean;
  error: string | null;
  pastFrames: RadarFrame[];
  refresh: () => void;
}

// Fallback path in case network is delayed
const DEFAULT_RADAR_PATH = '/v2/radar/4467c8e9dec0';
const DEFAULT_HOST = 'https://tilecache.rainviewer.com';

/**
 * Custom hook to stream live RainViewer Doppler Radar and Satellite IR tiles.
 * Queries https://api.rainviewer.com/public/weather-maps.json on mount and every 5 minutes.
 */
export function useRainViewerRadar(refreshIntervalMs: number = 300000): RainViewerData {
  const [radarTileUrl, setRadarTileUrl] = useState<string>(
    `${DEFAULT_HOST}${DEFAULT_RADAR_PATH}/256/{z}/{x}/{y}/2/1_1.png`
  );
  const [satelliteTileUrl, setSatelliteTileUrl] = useState<string | null>(null);
  const [latestTimestamp, setLatestTimestamp] = useState<number | null>(null);
  const [timeFormatted, setTimeFormatted] = useState<string | null>(null);
  const [pastFrames, setPastFrames] = useState<RadarFrame[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRadarData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`RainViewer API returned status ${res.status}`);
      }
      const data = await res.json();
      const host = data.host || DEFAULT_HOST;

      // Extract latest radar frame from past observations
      const past: RadarFrame[] = data.radar?.past || [];
      if (past.length > 0) {
        const latestRadar = past[past.length - 1];
        setRadarTileUrl(`${host}${latestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`);
        setLatestTimestamp(latestRadar.time);
        setPastFrames(past);

        const date = new Date(latestRadar.time * 1000);
        const minsAgo = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
        setTimeFormatted(`${date.toISOString().substring(11, 16)} UTC (${minsAgo}m ago)`);
      }

      // Extract latest satellite IR frame if available
      const satInfrared = data.satellite?.infrared || [];
      if (satInfrared.length > 0) {
        const latestSat = satInfrared[satInfrared.length - 1];
        setSatelliteTileUrl(`${host}${latestSat.path}/256/{z}/{x}/{y}/0/1_0.png`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown RainViewer error';
      console.warn('[useRainViewerRadar] Using fallback radar path due to error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRadarData();
    const interval = setInterval(fetchRadarData, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchRadarData, refreshIntervalMs]);

  return {
    radarTileUrl,
    satelliteTileUrl,
    latestTimestamp,
    timeFormatted,
    isLoading,
    error,
    pastFrames,
    refresh: fetchRadarData,
  };
}

export default useRainViewerRadar;
