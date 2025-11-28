#!/bin/bash

# Kill any existing processes on ports 3000 and 8000
echo "Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true

# Start the Python API
echo "Starting Python API on port 8000..."
cd /mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app
python3 api/main.py > api.log 2>&1 &
API_PID=$!
echo "Python API started with PID: $API_PID"

# Give the API a moment to start
sleep 3

# Start the Next.js development server
echo "Starting Next.js on port 3000..."
npm run dev > nextjs.log 2>&1 &
NEXT_PID=$!
echo "Next.js started with PID: $NEXT_PID"

# Wait a moment for servers to initialize
sleep 5

# Check if servers are running
echo ""
echo "Checking server status..."
if lsof -i:3000 >/dev/null 2>&1; then
    echo "✓ Next.js is running on port 3000"
else
    echo "✗ Next.js failed to start on port 3000"
    echo "Check nextjs.log for errors"
fi

if lsof -i:8000 >/dev/null 2>&1; then
    echo "✓ Python API is running on port 8000"
else
    echo "✗ Python API failed to start on port 8000"
    echo "Check api.log for errors"
fi

echo ""
echo "Access the application at:"
echo "  → http://localhost:3000"
echo ""
echo "To stop the servers, run:"
echo "  kill $NEXT_PID $API_PID"
echo ""
echo "Or use: pkill -f 'next dev' && pkill -f 'python3 api/main.py'"