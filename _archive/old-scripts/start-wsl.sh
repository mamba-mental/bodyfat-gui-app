#!/bin/bash

echo "🚀 Starting Body Fat Tracker for WSL..."
echo "📍 Server will be accessible from Windows at:"
echo "   - http://localhost:3001"
echo "   - http://127.0.0.1:3001"
echo "   - http://$(hostname -I | awk '{print $1}'):3001"
echo ""

# Kill any existing processes
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start with explicit host binding
HOST=0.0.0.0 PORT=3001 npm run dev