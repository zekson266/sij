#!/bin/bash
# Frontend Build Script
# This script builds the frontend and automatically increments the build number

set -e  # Exit on any error

echo "🔨 Building frontend..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Increment build number
BUILD_NUMBER_FILE=".build-number"
BUILD_NUMBER=$(cat "$BUILD_NUMBER_FILE" 2>/dev/null || echo "0")
BUILD_NUMBER=$((BUILD_NUMBER + 1))
echo $BUILD_NUMBER > "$BUILD_NUMBER_FILE"

echo -e "${GREEN}📦 Build number: $BUILD_NUMBER${NC}"

# 2. Update build-info.json files
echo "{\"buildNumber\":\"$BUILD_NUMBER\"}" > frontend/public/build-info.json
echo "{\"buildNumber\":\"$BUILD_NUMBER\"}" > frontend/dist/build-info.json

echo -e "${GREEN}✅ Build info files updated${NC}"

# 3. Build using Docker Compose
echo ""
echo "🐳 Building with Docker Compose..."
docker compose up frontend-build

# 4. Update build-info.json in dist after build (in case it was overwritten)
if [ -d "frontend/dist" ]; then
  echo "{\"buildNumber\":\"$BUILD_NUMBER\"}" > frontend/dist/build-info.json
  echo -e "${GREEN}✅ Build number synced to dist directory${NC}"
fi

echo ""
echo -e "${GREEN}✅ Frontend build complete! Build number: $BUILD_NUMBER${NC}"

























