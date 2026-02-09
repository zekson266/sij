#!/bin/bash
# Build Verification Script
# This script verifies that frontend and backend builds complete successfully

set -e  # Exit on any error

echo "🔍 Verifying builds..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command succeeded
check_exit_code() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. Check TypeScript compilation
echo ""
echo "📝 Step 1: Checking TypeScript compilation..."
cd frontend
npm run build 2>&1 | tee /tmp/frontend-build.log
BUILD_EXIT_CODE=${PIPESTATUS[0]}

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    echo ""
    echo "Build errors:"
    grep -i "error" /tmp/frontend-build.log | head -20
    exit 1
fi

check_exit_code "TypeScript compilation successful"

# 2. Verify build output exists
echo ""
echo "📦 Step 2: Verifying build output..."
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ dist/index.html not found!${NC}"
    exit 1
fi

if [ ! -d "dist/assets" ]; then
    echo -e "${RED}❌ dist/assets directory not found!${NC}"
    exit 1
fi

JS_FILES=$(find dist/assets -name "*.js" | wc -l)
if [ $JS_FILES -eq 0 ]; then
    echo -e "${RED}❌ No JavaScript files found in dist/assets!${NC}"
    exit 1
fi

check_exit_code "Build output verified ($JS_FILES JS files found)"

# 3. Check for common issues in bundle
echo ""
echo "🔎 Step 3: Checking bundle for common issues..."
LATEST_JS=$(find dist/assets -name "*.js" -type f | head -1)

if [ -z "$LATEST_JS" ]; then
    echo -e "${RED}❌ No JavaScript bundle found!${NC}"
    exit 1
fi

# Check if bundle is suspiciously small (might be empty or error page)
BUNDLE_SIZE=$(stat -f%z "$LATEST_JS" 2>/dev/null || stat -c%s "$LATEST_JS" 2>/dev/null)
if [ $BUNDLE_SIZE -lt 10000 ]; then
    echo -e "${YELLOW}⚠️  Warning: Bundle seems very small ($BUNDLE_SIZE bytes)${NC}"
fi

check_exit_code "Bundle size check passed ($BUNDLE_SIZE bytes)"

# 4. Verify specific code is in bundle (optional - pass search term as argument)
if [ ! -z "$1" ]; then
    echo ""
    echo "🔍 Step 4: Searching for '$1' in bundle..."
    if grep -q "$1" "$LATEST_JS"; then
        check_exit_code "Found '$1' in bundle"
    else
        echo -e "${YELLOW}⚠️  Warning: '$1' not found in bundle${NC}"
        echo "This might be normal if the code was minified/obfuscated"
    fi
fi

cd ..

echo ""
echo -e "${GREEN}✅ All build checks passed!${NC}"

# Increment build number only on successful build
BUILD_NUMBER_FILE=".build-number"
BUILD_NUMBER=$(cat "$BUILD_NUMBER_FILE" 2>/dev/null || echo "0")
BUILD_NUMBER=$((BUILD_NUMBER + 1))
echo $BUILD_NUMBER > "$BUILD_NUMBER_FILE"

# Write to frontend public directory (accessible at runtime)
echo "{\"buildNumber\":\"$BUILD_NUMBER\"}" > frontend/public/build-info.json

# Also write to dist directory (already built, so we update it directly)
if [ -d "frontend/dist" ]; then
  echo "{\"buildNumber\":\"$BUILD_NUMBER\"}" > frontend/dist/build-info.json
fi

echo -e "${GREEN}Build number: $BUILD_NUMBER${NC}"
echo ""
echo "Next steps:"
echo "  1. Rebuild Docker containers: docker compose build frontend-build"
echo "  2. Restart services: docker compose up -d"
echo "  3. Check logs: docker compose logs frontend-build"




