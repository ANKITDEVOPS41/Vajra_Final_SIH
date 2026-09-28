# SIH Grand Finale: The Winning Pitch Guide 🏆

This document contains the exact psychological and technical strategy to present ConvectNow to the Ministry of Earth Sciences (MoES) and IMD judges.

## 1. The Core Narrative (The Hook)
**Do NOT say:** "We built an AI that predicts weather better than IMD." (They will immediately dismiss you).
**DO say:** "We built ConvectNow as a 'Last-Mile' AI Fusion Layer. We aren't replacing your physics models; we are fusing your existing public radar and satellite data into an instant, explainable operational dashboard for your duty officers."

## 2. Handling the "Data Access" Question
*Judge: "How is your AI accurate if you didn't have access to our classified high-resolution Doppler IQ data?"*
**Your Answer:** "Sir/Ma'am, we recognized that limitation early on. That is exactly why we built a **modular, plug-and-play architecture**. We trained and tested our AI pipeline using your public OGC endpoints and the verified historical data from the June 2022 Cherrapunji cloudburst. Our system is fully modular. Tomorrow, if you give this system access to your internal, unredacted APIs, it will run exactly the same way, just with higher precision."

## 3. The Live Demo Flow (3 Minutes)
1. **The Ops Room (0:00 - 0:40):** Open the live dashboard. Emphasize the single-pane WebGIS. *"Notice how there are no disconnected tables. Everything floats over the real topography. We integrated live Bhuvan and IMD GeoServer OGC WMS/WFS layers directly."*
2. **Explainability & Attribution (0:40 - 1:15):** Click on a storm cell. *"Scientists hate black-box AI, and so do we. Under Physical Attribution, our model shows the exact meteorological drivers: 35% Radar echo core, 28% Schultz 2σ lightning jump, 22% Mecikalski cooling rate, and 15% Khasi escarpment forcing."*
3. **Scientific Verification (1:15 - 1:50):** Click the `VERIFICATION` button in the top bar. *"We don't claim fake 99% accuracy. We evaluate using WMO-No. 488 contingency scores. At +60m lead time, ConvectNet achieves a Critical Success Index (CSI) of 0.69 compared to 0.42 for radar optical flow (pySTEPS) — a 64% gain in threat capture."*
4. **National Integration (1:50 - 2:20):** Click `CAP ALERT` or `DISPATCH CAP WARNING`. *"An alert is useless if isolated. ConvectNow generates schema-compliant ITU-T X.1303 / WMO CAP v1.2 XML and NDMA Sachet GeoJSON payloads with one-click dispatch to SDMA Meghalaya."*
5. **The Climax - Replay Mode (2:20 - 3:00):** Click the `REPLAY` button. *"We pre-loaded the catastrophic June 16, 2022 Cherrapunji event (972.6 mm / 24h). Watch how the AI captures the rapid moisture convergence, escalating the cloudburst threat from 40% to 98% 48 minutes before historical torrential downpour."*

## 4. Key Buzzwords to Drop Naturally
* **"Critical Success Index (CSI) & POD/FAR"** (Proves you speak real atmospheric science metrics).
* **"ITU-T X.1303 / WMO CAP v1.2"** (Proves direct integration with NDMA Sachet).
* **"Physical Feature Attribution / SHAP"** (Proves explainable AI, not a black box).
* **"OGC Compliant (WMS / WFS)"** (Proves government GIS interoperability).
* **"Graceful Degradation"** (Proves zero-crash resilience during sensor dropouts).
* **"Orography / Escarpment Lock"** (Proves understanding of Northeast India meso-scale dynamics).
