#!/bin/bash
# Script to initialize Docker volumes with source code
# Run this script before deploying the Portainer stack

echo "🚀 Initializing Apex Fit Docker volumes..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create temporary containers to copy files into volumes
echo "📦 Copying Next.js source code..."
docker run --rm -v apex-fit-nextjs-src:/data -v "$SCRIPT_DIR:/src" alpine sh -c "cp -r /src/* /data/ && ls -la /data/"

echo "📦 Copying Python API source code..."
docker run --rm -v apex-fit-python-src:/data -v "$SCRIPT_DIR/python-api:/src" alpine sh -c "cp -r /src/* /data/ && ls -la /data/"

echo "✅ Volumes initialized successfully!"
echo ""
echo "You can now deploy the stack in Portainer using portainer-stack-volumes.yml"