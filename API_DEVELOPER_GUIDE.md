# ConvectNow API Developer Guide

## Overview
ConvectNow provides a real-time, 0–6 hour convective nowcasting API for Northeast India. It fuses MOSDAC DWR, INSAT-3D/3DR, Bhuvan Lightning, and IMD AWS data streams.

## Base URL
- Production: `https://convectnow-api.onrender.com/api`
- Local: `http://localhost:8000/api`

---

## 1. WebSockets (Real-Time Feed)

### `ws://<host>/ws/live`
The primary real-time connection for the dashboard.
**Behavior:**
- Connects and immediately receives the `hazard_update` payload.
- Backend runs inference ONCE every 60 seconds and broadcasts concurrent updates to all connected clients.
- Send a `"ping"` text frame to keep the connection alive (server responds with `"pong"`).

**Payload Schema (`hazard_update`):**
```json
{
  "type": "hazard_update",
  "timestamp": "2024-05-24T18:30:00Z",
  "storm_cells_raw": { "type": "FeatureCollection", "features": [...] },
  "aws_raw": { ... },
  "hazards_raw": { ... },
  "eval_raw": { ... },
  "ai_model": "ConvectNet-v3 (Transformer+UNet)"
}
```

---

## 2. Weather & Nowcasting Routers (`/weather`)

### `GET /weather/storm/cells`
Returns the active storm convective cells tracked by the PyTorch model.
**Response:** GeoJSON FeatureCollection containing polygons and convective intensity probabilities.

### `GET /weather/hazards`
Returns the current 3x3 hazard grid (Lightning, Hail, Heavy Rain, Wind).

### `GET /weather/forecast/{lead_time_min}`
Returns the predictive storm forecast for +0m, +15m, +30m, +45m, and +60m.

### `GET /weather/aws_stations`
Returns live telemetry from the 5 critical IMD Automatic Weather Stations in NE India.

---

## 3. System Operations Routers (`/system`)

### `GET /system/status`
Health check endpoint.

### `GET /system/data_quality`
Returns the uptime and confidence scores of the IMD, MOSDAC, and Bhuvan data feeds.

### `GET /system/evaluation_report`
Returns real-time confusion matrices and probability of detection (POD) metrics for the AI model against actual ground truth radar.

---

## Implementation Patterns
1. **Connection Pooling**: External requests use a global `httpx.AsyncClient` pool.
2. **Circuit Breakers**: IMD/MOSDAC outages instantly short-circuit to cache.
3. **Event Bus**: Lightning data is ingested asynchronously.
