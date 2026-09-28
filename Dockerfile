# ─────────────────────────────────────────────────────────────────────────────
# ConvectNow Backend — Dockerfile
# Optimised for Render / AWS ECS / any container platform
#
# Build:  docker build -t convectnow-api .
# Run:    docker run -p 8000:8000 convectnow-api
# ─────────────────────────────────────────────────────────────────────────────

# Use official slim Python image (smaller attack surface, faster pulls)
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable stdout buffering
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Torch CPU-only — saves ~2 GB image size on cloud (model is only 11 MB)
    # Override with PIP_EXTRA_INDEX_URL if you want CUDA on AWS GPU instances
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install OS deps needed by torch / scipy / h5py
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch FIRST (much smaller than default CUDA build)
# This resolves before requirements.txt so torch isn't re-downloaded
RUN pip install torch==2.3.1 --index-url https://download.pytorch.org/whl/cpu

# Copy and install the rest of the Python dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy the entire project (model weights, backend code, evaluation report)
COPY . .

# Expose port
EXPOSE 8000

# Health check — Render / ECS uses this to know when the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/data_quality')"

# Start the FastAPI server
# "convectnow.backend.api.main:app" — matches your existing package structure
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
