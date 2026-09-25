# ConvectNow

ConvectNow is a highly advanced, operational convective-scale nowcasting system built for the Ministry of Earth Sciences (MoES) and NCMRWF (SIH PS-26084). It fuses multi-source meteorological data (radar, satellite, NWP) into a unified PyTorch deep learning architecture (ConvectNet) to predict four severe convective hazards (Hail, Cloudbursts, Downbursts, and Convective Initiation) at 0–6h lead times with 1–2 km spatial resolution. The project includes a high-performance FastAPI backend and a premium, responsive React WebGIS command dashboard for real-time visualization and NDMA-compliant CAP alert generation.

## Key Features

- **Multi-Source Data Ingestion:** Synchronizes ISRO MOSDAC INSAT-3DR satellite telemetry, IMD Doppler Weather Radar, and SEVIR datasets into a unified spatiotemporal analysis cube.
- **Deep Learning Nowcasting (ConvectNet):** Custom 3D-CNN/Spatiotemporal ConvLSTM architecture achieving a 0.69 Critical Success Index (CSI) at 60-minute lead times.
- **Four-Parameter Hazard Physics:** Simultaneously predicts Probability of Severe Hail (POSH), Cloudburst thresholds (>100mm/hr), Downburst velocity, and Convective Initiation probability.
- **Interactive WebGIS Dashboard:** High-fidelity, React-based command center with real-time map overlays, ETA countdown clocks, and interactive scrollytelling for storm anatomy.
- **Automated Alerting:** Dynamically generates NDMA-compliant Common Alerting Protocol (CAP v1.2) XML payloads for vulnerable infrastructure.

## Tech Stack

- **Language:** Python 3.12+, TypeScript
- **Backend Framework:** FastAPI, Uvicorn
- **Machine Learning:** PyTorch, NumPy, SciPy
- **Frontend Framework:** React 19, Vite
- **Styling:** Tailwind CSS, Lucide React
- **Mapping:** Leaflet, RainViewer API (demo), Open-Meteo
- **Deployment:** Vercel (Frontend), Render / AWS EC2 (Backend)

## Prerequisites

- Node.js 20 or higher
- Python 3.12 or higher
- `npm` or `yarn`

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Gaurav711cgu/convect.git
cd convectnow
```

### 2. Setup the Python Backend

Create a virtual environment and install the required machine learning dependencies.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies (ensure you have PyTorch installed for your specific architecture: CPU/CUDA/MPS)
pip install fastapi uvicorn torch torchvision numpy scipy requests matplotlib
```

### 3. Setup the React Frontend

Open a new terminal window and install the Node modules.

```bash
cd frontend
npm install
```

### 4. Start Development Servers

**Terminal 1: FastAPI Backend**
```bash
cd backend
source venv/bin/activate
python server.py
```
The API will run on `http://localhost:8008`.

**Terminal 2: Vite React Frontend**
```bash
cd frontend
npm run dev
```
The WebGIS Dashboard will run on `http://localhost:5174`.

Open [http://localhost:5174](http://localhost:5174) in your browser.

## Architecture

### Directory Structure

```
convectnow/
├── backend/
│   ├── data/                 # Ingestion pipelines (MOSDAC, IMD, WIS2Box)
│   ├── models/               # PyTorch DL architecture and weights
│   │   ├── convectnet.py     # Main 3D-CNN / ConvLSTM architecture
│   │   ├── losses.py         # Custom Asymmetric Loss functions
│   │   ├── inference.py      # Production inference wrapper
│   │   └── *.pth / *.pt      # Trained production weights
│   ├── server.py             # FastAPI entry point
│   ├── hazard_engine.py      # Physics evaluation for Hail, Wind, Rain
│   ├── nowcaster.py          # PySTEPS optical flow baseline fallback
│   ├── evaluator.py          # Meteorological contingency scoring (CSI, FSS, POD)
│   └── cap_generator.py      # NDMA CAP v1.2 XML builder
├── frontend/
│   ├── src/
│   │   ├── components/       # React UI (HazardMap, EvaluationPanel, etc.)
│   │   ├── App.tsx           # Main Dashboard Layout
│   │   └── main.tsx          # Vite Entry Point
│   ├── index.html            # Static HTML
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Tailwind styling rules
│   └── vite.config.ts        # Vite bundler configuration
└── tests/                    # Unit testing suite
```

### Request Lifecycle

1. **Ingestion:** The backend `ingester_mosdac.py` authenticates via the ISRO MOSDAC API to download raw INSAT-3DR HDF5/NetCDF files.
2. **Calibration:** Raw Digital Numbers are converted to Brightness Temperatures (Kelvin/Celsius) using Planck's Law.
3. **Inference:** `ConvectNetInference` processes the tensors through the 75-epoch Spatiotemporal ConvLSTM network in under 50ms.
4. **API Serving:** `server.py` serves the inference output and architectural metadata.
5. **Frontend Rendering:** `HazardMap.tsx` and `App.tsx` request data from the FastAPI server and render it on the WebGIS interface using Leaflet.

### Key Components

**ConvectNet (Deep Learning Engine)**
- Uses a 3D-CNN spatial encoder followed by a `SpatioTemporalConvLSTM`.
- Employs an Adaptive 2D spatial pooling layer to ensure Apple Silicon (MPS backend) compatibility.
- Features four independent linear heads for multi-task regression and classification.

**Hazard Physics Engine**
- Calculates Severe Hail Index (SHI) and Probability of Severe Hail (POSH) by integrating reflectivity above the 0°C freezing level isotherm.
- Computes Tropical Z-R precipitation relationships ($R = (Z/300)^{1/1.5}$).

**Evaluation Metrics**
- Computes standard WMO contingency metrics: Critical Success Index (CSI), Probability of Detection (POD), False Alarm Ratio (FAR), and Fractions Skill Score (FSS).

## Environment Variables

### Backend (`backend/.env`)
*Optional for local demo, but required for live ISRO data pulls.*

| Variable           | Description                       | Default                              |
| ------------------ | --------------------------------- | -------------------------------------- |
| `MOSDAC_USER`      | ISRO MOSDAC SSO Username          | `<YOUR_USERNAME>` |
| `MOSDAC_PASS`      | ISRO MOSDAC SSO Password          | `<YOUR_PASSWORD>` |

## Available Scripts

### Frontend
| Command                       | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | Starts Vite development server on port 5174         |
| `npm run build`               | Compiles TypeScript and builds for production       |
| `npm run preview`             | Previews the production build locally               |

### Backend
| Command                       | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `python server.py`            | Starts the FastAPI server via Uvicorn (port 8008)   |
| `python train_convectnet.py`  | Triggers the local PyTorch training sequence        |
| `pytest tests/test_convectnet.py` | Runs the test suite                             |

## Deployment

### Frontend (Vercel)
The React frontend is optimized for zero-config Vercel deployment.
1. Connect your GitHub repository to Vercel.
2. Set the Framework Preset to `Vite`.
3. Set the Build Command to `npm run build`.
4. (Optional) If deploying the backend remotely, update the `fetch` URLs in `App.tsx` to point to your production API domain instead of `localhost:8008`.

### Backend (Render / AWS EC2)
The FastAPI backend requires a Python environment.
1. Create a `requirements.txt` file (`pip freeze > requirements.txt`).
2. If using Render, set the Start Command to `uvicorn server:app --host 0.0.0.0 --port 10000`.
3. Ensure the `backend/models` directory containing `convectnet_production.pth` is pushed to your hosting provider (using Git LFS if necessary due to file size).
