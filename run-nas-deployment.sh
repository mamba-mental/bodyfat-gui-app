#!/bin/bash

echo "🚀 Ap³𝘹Fit.ai – 𝛼 (Alpha) - NAS Deployment Script"
echo "=================================================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Build and deploy
echo "🔨 Building Ap³𝘹Fit.ai – 𝛼 (Alpha)..."
docker-compose build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🚀 Starting container..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Container started successfully!"
else
    echo "❌ Failed to start container!"
    exit 1
fi

echo ""
echo "🔍 Checking container status..."
docker ps | grep apex-fit-ai-alpha

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📱 Access your app at:"
echo "   → http://192.168.86.97:7888"
echo ""
echo "🔧 Management commands:"
echo "   → View logs: docker logs apex-fit-ai-alpha"
echo "   → Stop app:  docker-compose down"
echo "   → Restart:   docker-compose restart"
echo ""
echo "🎯 Your Ap³𝘹Fit.ai – 𝛼 (Alpha) MVP is now live!"