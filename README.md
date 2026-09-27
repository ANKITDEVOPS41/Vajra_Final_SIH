# ConvectNow ⛈️ 
**Smart India Hackathon (SIH) — PS-26084 (Ministry of Earth Sciences)**

ConvectNow is a **0–6 Hour Convective Nowcasting & Hazard Risk Assessment System** tailored for the complex orography of Northeast India (centered on Cherrapunji/Sohra). 

Unlike traditional Numerical Weather Prediction (NWP) models that require supercomputers, ConvectNow operates as a **"Last-Mile" AI Fusion Layer**. It ingests standard meteorological data (Radar, Satellite IR, Lightning, AWS) via open OGC protocols and provides duty officers with an explainable, instant threat assessment for extreme convective events.

## 🎯 The SIH Winning Philosophy
We did not build ConvectNow to replace the IMD's Prithvi supercomputers. We built it to empower the duty officer. 

* **Plug-and-Play Architecture:** Built using modular `SourceAdapters`, the system currently runs on public Bhuvan/IMD OGC WMS/WFS endpoints. Unplug our public data adapters, plug in IMD's internal live data streams, and ConvectNow is ready for production tomorrow.
* **Explainable AI (XAI):** We reject the "Black Box" approach. Our operational dashboard explicitly shows *why* an alert is triggered (e.g., Cloud Cooling Rate drops below -0.27 K/min, CAPE exceeds 2000 J/kg), allowing scientists to trust the model.
* **Graceful Degradation:** Real-world sensors fail. ConvectNow uses a dynamic fallback mechanism, gracefully reverting to physics-based spatiotemporal advection (Kalman tracking) if a live sensor stream is interrupted.

## 🚀 Key Features
1. **Single-Pane-of-Glass WebGIS:** No context switching. A dark-mode, Ops-Room ready interface built on React 19 and OpenLayers 10 with live Bhuvan and IMD WMS/WFS layers.
2. **Hybrid ConvectNet Pipeline:** 5-stage processing (Storm Detection → Kalman Tracking → CI Detection → Extrapolation → Multi-layer Perceptron Fusion).
3. **Physical XAI Feature Attribution:** Quantitative breakdown of each hazard prediction into physical radar echo, Schultz 2σ lightning jump, Mecikalski cooling rate, and orographic lift drivers.
4. **WMO Operational Verification Scorecard:** 0–6h skill scores (CSI, POD, FAR, HSS) benchmarked against pySTEPS optical flow baseline and validated on May 2024 & June 2022 events.
5. **NDMA / IMD Standard CAP v1.2 Dispatcher:** One-click generation of ITU-T X.1303 Common Alerting Protocol XML and NDMA Sachet JSON payloads with simulated SDMA broadcast.
6. **Historical Event Replay Simulator:** Built-in playback of the catastrophic June 16–17, 2022 Cherrapunji cloudburst event (972.6 mm / 24h) to prove AI nowcasting efficacy on real data.

## 🏗️ Tech Stack
* **Backend:** Python 3, FastAPI, NumPy, SciPy (O(1) dual-grid coordinate indexing)
* **Frontend:** React 19, TypeScript, Vite, TailwindCSS, OpenLayers 10
* **Data Protocols:** OGC WMS (Web Map Service), WFS (Web Feature Service), GeoJSON

## 🏁 Quick Start
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

*Built with precision for the Ministry of Earth Sciences.*
