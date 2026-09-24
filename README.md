# ⛈️ ConvectNow 
**SIH 2026 | Problem Statement 26084 (MoES / NCMRWF) | Team: DEBUG THUGS**

ConvectNow is a highly scalable, multi-modal Deep Learning nowcasting system designed to predict severe convective weather hazards (Lightning, Hail, Downbursts, Cloudbursts) 0-6 hours in advance at a 1-3 km resolution.

## 🧠 System Architecture

Our solution strictly splits the 0-6 hour mandate into two arms to handle the US-to-India meteorological domain gap:
1. **0–2h Tactical Window (Production):** Driven by `pysteps` (Optical Flow) and live precursor fusion.
2. **2–6h Strategic Window (Research):** Driven by **ConvectNet** (Spatio-Temporal ConvLSTM), designed for continuous domain adaptation.

### The Dual-Track Data Ingestion
To bypass bureaucratic delays with governmental DWR (Doppler Weather Radar) APIs, we implemented a dual-track adapter:
* **Track 1 (The AI Training):** Trained on the open-source MIT SEVIR Dataset (1.2TB of multi-modal storm events).
* **Track 2 (Live Inference):** Connects to open global websockets (WIS2Box for IMD surface data, Blitzortung for live lightning strikes).

### ConvectNet: Multi-Task Learning
Instead of running 4 separate heavy models, ConvectNet uses a **Shared Encoder** to learn storm physics, which branches into **4 Hazard Heads**. 
We use a **2-Phase MLOps Training Strategy**:
* **Phase 1:** Train the shared body on general convective initiation.
* **Phase 2:** Freeze the body, and fine-tune the specific hazard heads (e.g., Hail, Downburst) using **Focal Loss** to counteract severe-event data imbalance.

## 🚀 The 9-Milestone Execution Plan

- [x] **M1:** Detect Storm Cell (Computer Vision Masking)
- [x] **M2:** Track Storm Cell (Hungarian Matching Algorithm)
- [x] **M3:** Understand Evolution (Intensity Delta Tracking)
- [x] **M4:** Multimodal Fusion (Radar + Satellite + NWP + Lightning)
- [x] **M5:** Hazard Prediction (ConvectNet PyTorch Architecture)
- [x] **M6:** ETA & Hazard Footprint (Backend calculation + MapOverlay.jsx)
- [x] **M7:** Explainability & Confidence HUD (Domain-gap warning decay)
- [x] **M8:** Scientific Verification (Historical Replay: ConvectNet vs pysteps baseline)
- [x] **M9:** Continuous Improvement (Automated Domain Gap Error Catching for Transfer Learning)

## 💻 Running the Project

**1. Train the Model (Kaggle/Colab)**
Upload the codebase to Kaggle (Dual T4 GPUs), and run the training pipeline to generate the weights:
```bash
python backend/colab_training_pipeline.py
```
*Download the resulting `convectnet_production.pth` into `backend/models/weights/`.*

**2. Start the Backend (FastAPI)**
```bash
cd backend
uvicorn server:app --reload
```

**3. Start the Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev
```

---
*Architected for the Smart India Hackathon 2026. Built by DEBUG THUGS.*
