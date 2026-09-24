#!/bin/bash
# ConvectNow — Startup Launcher for SIH PS-26084
# Starts FastAPI Backend (Port 8008) and React WebGIS Frontend (Port 5174)

echo "=========================================================="
echo "⚡ Starting ConvectNow Operational Nowcasting Engine (MoES)"
echo "=========================================================="

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Activate Python Virtual Environment
source "$ROOT_DIR/venv/bin/activate"

# Start Backend Server
echo "🚀 [1/2] Launching ConvectNow FastAPI Backend on http://localhost:8008 ..."
python3 "$SCRIPT_DIR/backend/server.py" &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 2

# Start Frontend
echo "🌐 [2/2] Launching ConvectNow WebGIS Dashboard on http://localhost:5174 ..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ ConvectNow is live and streaming!"
echo "   - WebGIS Command Dashboard : http://localhost:5174"
echo "   - Operational REST API Docs : http://localhost:8008/docs"
echo "   - Health Endpoint          : http://localhost:8008/api/health"
echo "=========================================================="

# Trap SIGINT to kill background processes on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
