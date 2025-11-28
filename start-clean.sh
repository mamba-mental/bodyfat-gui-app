#!/bin/bash

echo "🧹 Cleaning up ports..."

# Kill any process using port 3000
if lsof -i :3000 >/dev/null 2>&1; then
    echo "Killing process on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

# Kill any process using port 8000
if lsof -i :8000 >/dev/null 2>&1; then
    echo "Killing process on port 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fi

# Kill any existing Next.js or Python API processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "python.*api/main.py" 2>/dev/null || true
pkill -f "python.*simple_api.py" 2>/dev/null || true

echo "✅ Ports cleaned!"
echo ""

# Start the Python API
echo "🐍 Starting Python API on port 8000..."
cd /mnt/c/GitHub_Projects/2025.0629_bf-estimator-terminal-standalone/bodyfat-gui-app
python3 api/main.py > api-clean.log 2>&1 &
API_PID=$!

# Wait for API to start
sleep 3

# Start Next.js on port 3000
echo "⚛️  Starting Next.js on port 3000..."
PORT=3000 npm run dev > nextjs-clean.log 2>&1 &
NEXT_PID=$!

# Wait for Next.js to start
echo "⏳ Waiting for servers to start..."
sleep 8

# Check status
echo ""
echo "📊 Server Status:"
echo "─────────────────"

if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Next.js is running on http://localhost:3000"
else
    # Check if it's on 3001
    if curl -s http://localhost:3001 >/dev/null 2>&1; then
        echo "⚠️  Next.js is running on http://localhost:3001 (port 3000 was busy)"
    else
        echo "❌ Next.js failed to start - check nextjs-clean.log"
    fi
fi

if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Python API is running on http://localhost:8000"
else
    echo "❌ Python API failed to start - check api-clean.log"
fi

echo ""
echo "🚀 Access the application at:"
echo "   http://localhost:3000 (or :3001 if 3000 was busy)"
echo ""
echo "📄 Log files:"
echo "   - nextjs-clean.log"
echo "   - api-clean.log"
echo ""
echo "🛑 To stop: kill $NEXT_PID $API_PID"