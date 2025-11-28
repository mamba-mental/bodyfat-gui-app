#!/bin/bash

echo "Starting Next.js on port 3005 with WSL2 fix..."

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start with explicit host binding for WSL2
HOSTNAME=0.0.0.0 PORT=3005 npm run dev