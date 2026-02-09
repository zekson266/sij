#!/bin/bash
set -e

echo "🔄 Rebuilding Booker Application with Cookie Authentication"
echo "============================================================"
echo ""

echo "🛑 Step 1: Stopping services..."
docker compose down

echo ""
echo "🔨 Step 2: Rebuilding backend (installs slowapi + applies code changes)..."
docker compose build --no-cache backend

echo ""
echo "🔨 Step 3: Rebuilding frontend (applies code changes)..."
docker compose build --no-cache frontend-build

echo ""
echo "🚀 Step 4: Starting services..."
docker compose up -d

echo ""
echo "⏳ Step 5: Waiting for backend to be ready..."
sleep 5

echo ""
echo "📦 Step 6: Running database migrations..."
docker compose exec -T backend alembic upgrade head || {
    echo "⚠️  Migration may have failed - check logs: docker compose logs backend"
}

echo ""
echo "🏗️  Step 7: Building frontend assets..."
docker compose up frontend-build

echo ""
echo "🔄 Step 8: Restarting nginx..."
docker compose restart nginx

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "📋 Verification Steps:"
echo "  1. Check services: docker compose ps"
echo "  2. Check backend logs: docker compose logs backend | grep 'rate limiting'"
echo "  3. Verify slowapi: docker compose exec backend pip list | grep slowapi"
echo "  4. Test login: https://onebrat.xyz/login"
echo ""
echo "See MANUAL_TEST_INSTRUCTIONS.md for testing guide."

