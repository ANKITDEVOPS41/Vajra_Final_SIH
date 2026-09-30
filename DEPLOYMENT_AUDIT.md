# DEPLOYMENT AUDIT REPORT (MONOREPO)

## 1. Current Architecture & Entry Points

The VAJRA project operates as a full-stack monorepo:

- **Frontend**: React + Vite application (SPAs).
  - _Path:_ `frontend/`
  - _Entry script:_ `package.json` -> `npm run dev` / `npm run build`
  - _Technology:_ TypeScript, React 19, Tailwind CSS, Leaflet/MapGIS components.
- **Backend**: Python FastAPI application for severe weather intelligence.
  - _Path:_ `backend/`
  - _Entry script:_ `backend/server.py` and `backend/api/main.py`. Usually started via `uvicorn backend.server:app --host 0.0.0.0 --port 8000`.
  - _Architecture:_ Modular REST/WebSocket API interfacing with ML models and GIS tracking logic.

## 2. Heavy Dependency Warnings

The backend relies on computationally dense ML and Geospatial mapping libraries that will bloat standard Docker images and potentially fail to compile C-bindings on lightweight Alpine images:

- **PyTorch (`torch==2.3.1`)**: Very heavy (can exceed 2GB). It is crucial to install the CPU-only version for standard API serving on AWS Fargate to avoid unnecessary CUDA bulk, unless GPU inference is explicitly utilized.
- **Geospatial (implied via GIS tracking, `scipy`, `numpy`)**: If GDAL/Rasterio are introduced, they require specialized OS-level dependencies (`libgdal-dev`). A Debian-slim or `osgeo/gdal:ubuntu-small` image is necessary.
- **HDF5 (`h5py==3.11.0`)**: Requires C++ compiling.
- **Model Weights/Datasets**: Files like `.pth`, `.h5` are listed in `.gitignore` and must be stored externally (e.g., AWS S3) rather than bundled inside the ECR Docker image to preserve cold-start speed and cost.

## 3. Monorepo Structure Mapping

- `/frontend/`: UI Codebase. Must be isolated in CI/CD so changes here only trigger Vite actions.
- `/backend/`: Python API and ML Inference logic.
- `/tests/` or `/backend/tests/`: (If present) Backend validation paths.
- `/.github/workflows/`: CI/CD definitions (to be created map to paths).

## 4. Environment Variable Requirements

**Frontend (`frontend/.env`):**
Variables must be prefixed with `VITE_` to be bundled by Vite safely.

- `VITE_API_BASE_URL`: The production URL of the backend (e.g., `https://api.vajra.org`).
- _(No secret tokens should be exposed here)._

**Backend (`backend/.env`):**
Secure environment managed securely in AWS Parameter Store or Secrets Manager.

- `ENV_MODE`: `production` / `development`
- `SECRET_KEY`: Backend signing key (if auth is used).
- `ALLOWED_ORIGINS`: Comma separated CORS origins.
- Other external API keys (e.g., IMD API access, MOSDAC catalog keys).
