#!/bin/bash

echo "Clearing all Next.js and Node.js caches..."

# Remove Next.js build cache
echo "Removing .next directory..."
rm -rf .next

# Remove node_modules cache
echo "Removing node_modules cache..."
rm -rf node_modules/.cache

# Remove any other potential caches
echo "Removing other potential caches..."
rm -rf .turbo
rm -rf .cache

echo "All caches cleared!"
echo ""
echo "To restart the development server, run:"
echo "npm run dev"