#!/bin/bash

# Development startup script for Body Fat Tracker GUI
# Starts both Python API and Next.js development server

echo "🚀 Starting Body Fat Tracker Development Environment"
echo "=================================================="

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the bodyfat-gui-app directory"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not installed"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is required but not installed"
    exit 1
fi

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Shutting down development servers..."
    kill $PYTHON_PID $NEXTJS_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "🐍 Setting up Python API..."

# Create Python virtual environment if it doesn't exist
if [ ! -d "python-api/venv" ]; then
    echo "Creating Python virtual environment..."
    cd python-api
    python3 -m venv venv
    cd ..
fi

# Install Python dependencies
echo "Installing Python dependencies..."
cd python-api
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo "🔧 Installing Node.js dependencies..."
npm install

echo "🟢 Starting Python API server on http://127.0.0.1:8000"
cd python-api
source venv/bin/activate
python main.py &
PYTHON_PID=$!
cd ..

# Wait for Python API to start
sleep 3

echo "🟢 Starting Next.js development server on http://localhost:3000"
npm run dev &
NEXTJS_PID=$!

echo ""
echo "✅ Development environment is ready!"
echo "📱 GUI Application: http://localhost:3000"
echo "🐍 Python API: http://127.0.0.1:8000"
echo "📚 API Documentation: http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait