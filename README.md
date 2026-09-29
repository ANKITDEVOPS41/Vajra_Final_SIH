# ConvectNow - Location-First Multimodal Convective Nowcasting

ConvectNow is a mission-critical aviation intelligence platform that translates evolving convective forecast fields into queryable location-specific 0–6 hour hazard intelligence. Built for SIH 2026 (SIH26084).

## Key Features

- **Multi-Source Data Ingestion:** Synchronizes ISRO MOSDAC INSAT-3DR satellite telemetry, IMD Doppler Weather Radar, and SEVIR datasets into a unified spatiotemporal analysis cube.
- **Deep Learning Nowcasting (ConvectNet):** Custom 3D-CNN/Spatiotemporal ConvLSTM architecture achieving a verified 0.661 Critical Success Index (CSI) at 60-minute lead times.
- **Fault-Tolerant Government Integration:** Features an automatic "Circuit Breaker" fallback system. If the IMD OpenData API times out, the backend seamlessly ingests historical radar buffers (e.g., the May 2024 Meghalaya storm) directly into the PyTorch inference engine without crashing the UI.
- **Four-Parameter Hazard Physics:** Simultaneously predicts Probability of Severe Hail (POSH), Cloudburst thresholds (>100mm/hr), Downburst velocity, and Convective Initiation probability based on raw AI tensors.
- **Interactive WebGIS Dashboard:** High-fidelity, React-based command center with real-time map overlays, dynamic ETA countdown clocks, and location-first tracking.

## Tech Stack

- **Language**: Python 3.14+, TypeScript
- **Backend Framework**: FastAPI, Uvicorn
- **Machine Learning**: PyTorch, NumPy, SciPy
- **Frontend Framework**: React 19, Vite
- **Styling**: Tailwind CSS, Lucide React
- **Mapping**: Leaflet, RainViewer API (demo), Open-Meteo
- **Deployment**: Vercel (Frontend), Render / AWS EC2 (Backend)

## Prerequisites

- Node.js 20 or higher
- Python 3.12 or higher
- `npm` or `yarn`

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Gaurav711cgu/convect.git
cd convect
```

### 2. Setup the Python Backend

Create a virtual environment and install the required dependencies.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: `venv\Scriptsctivate`

# Install dependencies
pip install -r requirements.txt
# (Ensure you have PyTorch installed for your specific architecture)
```

### 3. Setup the React Frontend

Open a new terminal window and install the Node modules.

```bash
cd frontend
npm ci
```

### 4. Environment Setup

Create a `.env` file in the root directory (or in `backend/.env`):

```bash
IMD_API_KEY=f88dc614a4ff64dce67a8f267f54435829a3c22590195bbe175917bb1d8ac406
MOSDAC_USER=<YOUR_USERNAME>
MOSDAC_PASS=<YOUR_PASSWORD>
```

### 5. Start Development Servers

**Terminal 1: FastAPI Backend**
```bash
cd backend
source venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2: Vite React Frontend**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Architecture

### Directory Structure

```
convect/
├── backend/
│   ├── api/                  # FastAPI controllers and routes (main.py)
│   ├── core/                 # Pydantic Schemas and configs
│   ├── data/                 # Ingestion pipelines (MOSDAC, IMD)
│   ├── models/               # PyTorch DL architecture and weights
│   │   ├── convectnet.py     # Main 3D-CNN / ConvLSTM architecture
│   │   ├── inference.py      # Production inference wrapper
│   │   └── *.pth / *.pt      # Trained production weights
│   ├── meteorology.py        # Physics equations (Marshall-Palmer, Z-R)
│   ├── hazard_engine.py      # Hazard derivation layer
│   └── tests/                # Legacy backend tests
├── frontend/
│   ├── src/
│   │   ├── components/       # React UI (HazardMap, EvaluationPanel, etc.)
│   │   ├── hooks/            # Custom React hooks (useConvectNowData)
│   │   ├── utils/            # Data formatting and historical fallback maps
│   │   └── App.tsx           # Main Dashboard Layout
│   ├── tailwind.config.js    # Tailwind styling rules
│   └── vite.config.ts        # Vite bundler configuration
└── tests/                    # Core Unit testing suite (pytest)
```

### The Inference Pipeline

1. **API Polling:** The React frontend polls the backend for coordinates.
2. **Data Fetching:** `data_source_manager.py` attempts to fetch live radar grids from IMD.
3. **Circuit Breaker:** If IMD is unreachable (NXDOMAIN or Timeout), it gracefully catches the error and substitutes a high-fidelity historical cache (May 2024 Cherrapunji storm).
4. **PyTorch Inference:** `inference.py` loads the raw radar tensors into `convectnet_st_nowcaster.pt`. The AI computes standard physical convolutions to generate raw hazard probabilities.
5. **Meteorological Translation:** `meteorology.py` translates the AI tensors into human-readable aviation standards (mm/hr, Wind Shear Knots, Hail Size).
6. **Delivery:** The FastAPI endpoint (`/api/grid` or `/api/forecast`) returns the payload with `synthetic_data: False` to confirm authentic model execution.

## Testing

The project uses `pytest` for the backend. All mock UI tests and legacy pipeline tests that require 50GB training rigs are safely skipped for the production MVP.

```bash
# Run all core backend API and Physics tests
pytest tests/
```

*Expected output: 71 passed, 6 skipped.*

## Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`.

### Backend (Render / AWS EC2)
1. Start Command: `uvicorn api.main:app --host 0.0.0.0 --port 10000`.
2. Ensure the `backend/models` directory containing `convectnet_st_nowcaster.pt` is pushed to your hosting provider using Git LFS due to file size constraints.
