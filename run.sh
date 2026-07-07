#!/bin/bash

# Exit on first error for setup steps
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🚀 Initializing CipherLens development environment..."
echo "Root directory: $PROJECT_ROOT"

# --- 1. SETUP BACKEND PYTHON VIRTUALENV ---
echo ""
echo "📦 Setting up Python FastAPI Backend..."
cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment at backend/venv..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

echo "Checking and updating backend python dependencies..."
pip install --upgrade pip
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings pyjwt bcrypt passlib psycopg2-binary alembic python-multipart dnspython email-validator pytest httpx

# --- 2. SETUP FRONTEND NODE DEPENDENCIES ---
echo ""
echo "📦 Setting up React Frontend..."
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies via npm..."
    npm install
else
    echo "Frontend node_modules found. Skipping npm install."
fi

# --- 3. VERIFY AND START REDIS SERVICE ---
echo ""
echo "🔍 Checking Redis message broker status..."
if ! nc -z localhost 6379 >/dev/null 2>&1; then
    echo "⚠️ Redis is not running on port 6379."
    if command -v docker >/dev/null 2>&1; then
        echo "🐳 Docker found. Launching temporary Redis container..."
        # Remove any existing stopped container
        docker rm -f cipherlens-redis >/dev/null 2>&1 || true
        docker run -d --name cipherlens-redis -p 6379:6379 redis:alpine >/dev/null 2>&1
        sleep 2
    elif command -v redis-server >/dev/null 2>&1; then
        echo "📦 Starting local daemonized redis-server..."
        redis-server --daemonize yes
        sleep 2
    else
        echo "❌ WARNING: Redis is required for worker queue operations but is not running on port 6379."
        echo "Please install/start Redis or install Docker to automatically spin up a container."
    fi
else
    echo "✅ Redis is running on port 6379."
fi

# --- 4. START SERVICES CONCURRENTLY ---
echo ""
echo "🚦 Starting CipherLens Local Development Servers..."

# Create a trap to kill all background processes on exit/interrupt
cleanup() {
    echo ""
    echo "⚠️ Shutting down local development servers..."
    kill $BACKEND_PID $FRONTEND_PID $WORKER_PID 2>/dev/null || true
    if [ "$(docker ps -q -f name=cipherlens-redis 2>/dev/null)" ]; then
        echo "🐳 Stopping Docker Redis container..."
        docker stop cipherlens-redis >/dev/null 2>&1 || true
        docker rm cipherlens-redis >/dev/null 2>&1 || true
    fi
}
trap cleanup SIGINT SIGTERM EXIT

# Set backend port config
export PORT=3005
export VITE_API_URL="http://localhost:3005"

# Launch FastAPI backend on port 3005
cd "$PROJECT_ROOT/backend"
echo "Starting FastAPI Backend on http://localhost:3005..."
PYTHONPATH=. "$PROJECT_ROOT/backend/venv/bin/python" -m uvicorn main:app --host 0.0.0.0 --port 3005 --reload &
BACKEND_PID=$!

# Launch Background Worker process
cd "$PROJECT_ROOT/backend"
echo "Starting background worker pipeline task runner..."
PYTHONPATH=. "$PROJECT_ROOT/backend/venv/bin/python" worker.py &
WORKER_PID=$!

# Launch React frontend on port 5173 (standard Vite dev port)
cd "$PROJECT_ROOT/frontend"
echo "Starting React Frontend dev server..."
npm run dev &
FRONTEND_PID=$!

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID $WORKER_PID
