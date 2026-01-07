#!/bin/bash

echo "🚀 Starting Body Fat Tracker Services..."
echo ""

# Kill any existing processes
echo "🔄 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
sleep 2

# Start Python API
echo "🐍 Starting Python API on port 8000..."
cd python-api
uvicorn main:app --reload --host 127.0.0.1 --port 8000 > ../python-api.log 2>&1 &
cd ..

# Wait for Python API to start
sleep 3

# Start Next.js (without Turbopack for stability)
echo "⚛️  Starting Next.js on port 3005..."
HOST=0.0.0.0 PORT=3005 npm run dev > next-dev.log 2>&1 &

# Wait for Next.js to start
sleep 5

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Access the application at:"
echo "   - Next.js:    http://localhost:3005"
echo "   - Python API: http://localhost:8000"
echo ""
echo "📋 Logs:"
echo "   - Next.js:    tail -f next-dev.log"
echo "   - Python API: tail -f python-api.log"
echo ""
echo "🛑 To stop all services: pkill -f 'next dev' && pkill -f 'uvicorn'"