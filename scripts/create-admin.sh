#!/bin/bash
#
# Create Admin Account Helper Script
# Usage: ./scripts/create-admin.sh
#

set -e

echo ""
echo "👤 Create Admin Account"
echo "======================="
echo ""

# Check if backend is running
if ! docker compose ps backend 2>/dev/null | grep -q "Up"; then
    echo "❌ Error: Backend service is not running"
    echo "   Start services first: docker compose up -d"
    exit 1
fi

# Prompt for credentials
read -p "Admin email: " ADMIN_EMAIL

if [ -z "$ADMIN_EMAIL" ]; then
    echo "❌ Email is required"
    exit 1
fi

read -sp "Admin password (leave empty to auto-generate): " ADMIN_PASSWORD
echo ""

if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD=$(openssl rand -base64 16)
    SHOW_PASSWORD=1
    echo "✔ Generated password: $ADMIN_PASSWORD"
    echo "   ⚠️  SAVE THIS PASSWORD!"
    echo ""
fi

read -p "First name (optional): " ADMIN_FIRST_NAME
read -p "Last name (optional): " ADMIN_LAST_NAME

echo ""
echo "📧 Creating admin account..."

# Create superuser
docker compose exec -T \
  -e SUPERUSER_EMAIL="$ADMIN_EMAIL" \
  -e SUPERUSER_PASSWORD="$ADMIN_PASSWORD" \
  -e SUPERUSER_FIRST_NAME="$ADMIN_FIRST_NAME" \
  -e SUPERUSER_LAST_NAME="$ADMIN_LAST_NAME" \
  backend python scripts/create_superuser.py 2>&1 | tail -20

echo ""
echo "✅ Admin account created!"
echo "   Email: $ADMIN_EMAIL"
if [ -n "$SHOW_PASSWORD" ]; then
    echo "   Password: $ADMIN_PASSWORD"
fi
echo ""
echo "🌐 Login at: https://$(grep '^DOMAIN_NAME=' .env 2>/dev/null | cut -d'=' -f2 || echo 'localhost')/login"
echo ""
