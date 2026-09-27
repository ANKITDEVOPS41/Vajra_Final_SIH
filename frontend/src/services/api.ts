import { GridCellData, ForecastOutput, DataQuality, HazardData, StormCellFeature } from '../types';
import { getMockGridCell, getForecastForLeadTime, INITIAL_HAZARDS, MOCK_STORM_CELLS } from '../utils/mockData';

const API_BASE = '/api';

export class ApiService {
  private static isBackendAvailable: boolean | null = null;

  public static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/data_quality`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      const available = res.ok;
      this.isBackendAvailable = available;
      return available;
    } catch {
      this.isBackendAvailable = false;
      return false;
    }
  }

  public static getBackendStatus(): boolean {
    return this.isBackendAvailable ?? false;
  }

  public static async getGridCell(lat: number, lon: number): Promise<GridCellData> {
    try {
      const res = await fetch(`${API_BASE}/grid/${lat.toFixed(4)}/${lon.toFixed(4)}`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        this.isBackendAvailable = true;
        return data;
      }
    } catch {
      // Graceful fallback to historical data fallback
    }
    return getMockGridCell(lat, lon);
  }

  public static async getForecast(leadMinutes: number): Promise<ForecastOutput> {
    try {
      const res = await fetch(`${API_BASE}/forecast/${leadMinutes}`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        this.isBackendAvailable = true;
        return data;
      }
    } catch {
      // Fallback
    }
    return getForecastForLeadTime(leadMinutes);
  }

  public static async getStormCells(): Promise<StormCellFeature[]> {
    try {
      const res = await fetch(`${API_BASE}/storm/cells`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const geojson = await res.json();
        this.isBackendAvailable = true;
        if (geojson.features && Array.isArray(geojson.features)) {
          return geojson.features.map((f: any, idx: number) => ({
            id: f.id || `cell-${idx}`,
            name: f.properties?.name || `Cell ${idx + 1}`,
            centroid: f.geometry?.coordinates || [91.73, 25.27],
            radiusKm: f.properties?.radiusKm || 12,
            maxDbz: f.properties?.maxDbz || 55,
            echoTopKm: f.properties?.echoTopKm || 14,
            speedKmh: f.properties?.speedKmh || 40,
            bearingDeg: f.properties?.bearingDeg || 45,
            etaMinutes: f.properties?.etaMinutes || 25,
            severity: f.properties?.severity || 'SEVERE',
          }));
        }
      }
    } catch {
      // Fallback
    }
    return MOCK_STORM_CELLS;
  }

  public static async getDataQuality(): Promise<DataQuality> {
    try {
      const res = await fetch(`${API_BASE}/data_quality`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        this.isBackendAvailable = true;
        return data;
      }
    } catch {
      // Fallback
    }
    return {
      radar: { status: 'GOOD', lag: '1m14s lag', latency_sec: 74 },
      satellite: { status: 'GOOD', lag: '3m lag', latency_sec: 180 },
      lightning: { status: 'GOOD', lag: '45s lag', latency_sec: 45 },
      aws: { status: 'MODERATE', lag: '12m lag', latency_sec: 720 },
      ai_model: 'ConvectNet v1 (HistoricalMode)',
    };
  }
}

export class LiveWebSocketClient {
  private ws: WebSocket | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onStatusChangeCallback: ((connected: boolean) => void) | null = null;
  private reconnectInterval: number = 5000;
  private fallbackTimer: number | null = null;

  constructor(
    onMessage: (data: any) => void,
    onStatusChange?: (connected: boolean) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange || null;
    this.connect();
  }

  private connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
        if (this.fallbackTimer) {
          window.clearInterval(this.fallbackTimer);
          this.fallbackTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (this.onMessageCallback) this.onMessageCallback(payload);
        } catch (e) {
          console.warn('Failed to parse WS payload', e);
        }
      };

      this.ws.onclose = () => {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
        this.startFallbackHeartbeat();
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.ws.onerror = () => {
        if (this.ws) this.ws.close();
      };
    } catch {
      this.startFallbackHeartbeat();
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  private startFallbackHeartbeat() {
    if (this.fallbackTimer) return;
    // Push periodic simulated update every 30s to keep UI active
    this.fallbackTimer = window.setInterval(() => {
      if (this.onMessageCallback) {
        this.onMessageCallback({
          timestamp: new Date().toISOString(),
          data_mode: 'historical_fallback',
          lead_time_min: 0,
          hazard_probabilities: {
            ci_prob: 87,
            lightning_prob: 91,
            hail_prob: 64,
            downburst_prob: 42,
            cloudburst_prob: 73,
          },
        });
      }
    }, 30000);
  }

  public disconnect() {
    if (this.fallbackTimer) {
      window.clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
