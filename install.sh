#!/bin/bash
set -e

############################################
# STEP 0 — Domain Configuration (FIRST!)
############################################

echo ""
echo "🚀 MULTI-TENANT SAAS INSTALLER"
echo "==============================="
echo ""
echo "📝 Application Configuration"
echo "-----------------------------"

# Prompt for application name
if [ -n "$APP_NAME" ]; then
    APPLICATION_NAME="$APP_NAME"
    echo "Using application name from environment: $APPLICATION_NAME"
else
    echo "Enter your application name (e.g., 'MyApp', 'Acme CRM'):"
    read -p "Application name: " APP_INPUT
    APPLICATION_NAME="${APP_INPUT:-My Application}"
fi

echo ""
echo "🌐 Domain Configuration"
echo "-----------------------"

# Check if DOMAIN_NAME is set via environment variable
if [ -n "$DOMAIN_NAME" ]; then
    NEW_DOMAIN="$DOMAIN_NAME"
    echo "Using domain from environment: $NEW_DOMAIN"
else
    echo "Enter your domain name (or press Enter for localhost):"
    read -p "Domain: " DOMAIN_INPUT
    NEW_DOMAIN="${DOMAIN_INPUT:-localhost}"
fi

echo ""
echo "Configuration Summary:"
echo "  Application: $APPLICATION_NAME"
echo "  Domain:      $NEW_DOMAIN"
echo ""
read -p "Is this correct? (y/n): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

############################################
# CONFIG
############################################

APP_USER="booker_app"
POSTGRES_DB="mydb"
POSTGRES_SUPERUSER="myuser"

echo ""
echo "============================="
echo "Application:       $APPLICATION_NAME"
echo "Domain:            $NEW_DOMAIN"
echo "DB superuser:      $POSTGRES_SUPERUSER"
echo "App DB user:       $APP_USER"
echo "Database:          $POSTGRES_DB"
echo "============================="
echo ""


############################################
# STEP 1 — Ensure .env base settings
############################################

echo "📝 Ensuring .env base settings..."

# Create .env if missing
if [ ! -f .env ]; then
  cat > .env <<EOF
# ==================== API Configuration ====================
API_TITLE=${APPLICATION_NAME} API
API_VERSION=1.0.0
DEBUG=1

# ==================== Domain Configuration ====================
DOMAIN_NAME=${NEW_DOMAIN}
WEB_PORT=8000

# ==================== CORS Configuration ====================
CORS_ORIGINS=
CORS_CREDENTIALS=1
CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS
CORS_HEADERS=*

# ==================== Database Configuration ====================
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_SUPERUSER}
POSTGRES_PASSWORD=
POSTGRES_HOST=db
POSTGRES_PORT=5432

# ==================== JWT Authentication ====================
SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ==================== Cookie Configuration ====================
# Cookie domain for cross-subdomain authentication
# For production: set to your domain (e.g., '.example.com' or 'example.com')
# For localhost: leave empty (cookies will work on localhost only)
COOKIE_DOMAIN=
# Set Secure flag (HTTPS only). Should be True in production, False for localhost.
# Will be auto-set based on domain (1 for production, 0 for localhost)
COOKIE_SECURE=1
# SameSite attribute: 'strict', 'lax', or 'none' (default: 'lax' for cross-subdomain)
COOKIE_SAMESITE=lax

# ==================== Email Configuration (SMTP) ====================
SMTP_ENABLED=0
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@${NEW_DOMAIN}
SMTP_FROM_NAME=${APPLICATION_NAME}
SMTP_USE_TLS=1

# ==================== Optional Services ====================
OPENAI_API_KEY=
ENCRYPTION_KEY=
CSP_HEADER="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self'; frame-ancestors 'none';"
EOF
  echo "✔ .env created with defaults"
else
  # Update DOMAIN_NAME if present, otherwise append
  if grep -q "^DOMAIN_NAME=" .env; then
      sed -i "s/^DOMAIN_NAME=.*/DOMAIN_NAME=${NEW_DOMAIN}/" .env
  else
      echo "DOMAIN_NAME=${NEW_DOMAIN}" >> .env
  fi

  # Ensure all required settings exist
  grep -q "^API_TITLE=" .env              || echo "API_TITLE=${APPLICATION_NAME} API" >> .env
  grep -q "^API_VERSION=" .env            || echo "API_VERSION=1.0.0" >> .env
  grep -q "^DEBUG=" .env                   || echo "DEBUG=1" >> .env
  grep -q "^WEB_PORT=" .env                || echo "WEB_PORT=8000" >> .env
  grep -q "^CORS_ORIGINS=" .env           || echo "CORS_ORIGINS=" >> .env
  grep -q "^CORS_CREDENTIALS=" .env       || echo "CORS_CREDENTIALS=1" >> .env
  grep -q "^CORS_METHODS=" .env           || echo "CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS" >> .env
  grep -q "^CORS_HEADERS=" .env            || echo "CORS_HEADERS=*" >> .env
  grep -q "^POSTGRES_DB=" .env             || echo "POSTGRES_DB=${POSTGRES_DB}" >> .env
  grep -q "^POSTGRES_USER=" .env           || echo "POSTGRES_USER=${POSTGRES_SUPERUSER}" >> .env
  grep -q "^POSTGRES_HOST=" .env          || echo "POSTGRES_HOST=db" >> .env
  grep -q "^POSTGRES_PORT=" .env           || echo "POSTGRES_PORT=5432" >> .env
  grep -q "^ALGORITHM=" .env               || echo "ALGORITHM=HS256" >> .env
  grep -q "^ACCESS_TOKEN_EXPIRE_MINUTES=" .env || echo "ACCESS_TOKEN_EXPIRE_MINUTES=30" >> .env
  grep -q "^COOKIE_DOMAIN=" .env          || echo "COOKIE_DOMAIN=" >> .env
  grep -q "^COOKIE_SECURE=" .env          || echo "COOKIE_SECURE=1" >> .env
  grep -q "^COOKIE_SAMESITE=" .env        || echo "COOKIE_SAMESITE=lax" >> .env
  grep -q "^SMTP_ENABLED=" .env            || echo "SMTP_ENABLED=0" >> .env
  grep -q "^SMTP_HOST=" .env               || echo "SMTP_HOST=smtp.gmail.com" >> .env
  grep -q "^SMTP_PORT=" .env               || echo "SMTP_PORT=587" >> .env
  grep -q "^SMTP_USER=" .env               || echo "SMTP_USER=" >> .env
  grep -q "^SMTP_PASSWORD=" .env           || echo "SMTP_PASSWORD=" >> .env
  grep -q "^SMTP_FROM_EMAIL=" .env         || echo "SMTP_FROM_EMAIL=noreply@${NEW_DOMAIN}" >> .env
  grep -q "^SMTP_FROM_NAME=" .env          || echo "SMTP_FROM_NAME=${APPLICATION_NAME}" >> .env
  grep -q "^SMTP_USE_TLS=" .env            || echo "SMTP_USE_TLS=1" >> .env

  echo "✔ .env updated"
fi

echo ""

############################################
# STEP 1.5 — Create frontend .env
############################################

echo "📝 Creating frontend environment configuration..."

mkdir -p frontend

cat > frontend/.env << EOF
# Frontend Environment Variables
# These are embedded at build time by Vite

# Main domain name (without subdomain)
# Used for subdomain detection and URL construction
VITE_DOMAIN_NAME=${NEW_DOMAIN}
EOF

echo "✔ Frontend .env created with VITE_DOMAIN_NAME=${NEW_DOMAIN}"
echo ""


############################################
# STEP 2 — Obtain / reuse HTTPS certificates
############################################

# Only obtain SSL certificates if domain is not localhost
if [ "$NEW_DOMAIN" != "localhost" ]; then
  echo "🔐 SSL Certificate Setup for ${NEW_DOMAIN}"
  echo ""
  echo "📋 Options:"
  echo "   1. Standard SSL (${NEW_DOMAIN} + www.${NEW_DOMAIN}) - Automatic"
  echo "   2. Wildcard SSL (*.${NEW_DOMAIN} + ${NEW_DOMAIN}) - Interactive, requires DNS access"
  echo "   3. Skip SSL for now (set up manually later)"
  echo ""
  read -p "Choose option (1, 2, or 3, default: 2): " SSL_OPTION
  SSL_OPTION=${SSL_OPTION:-2}

  if [ "$SSL_OPTION" = "1" ]; then
    # Install certbot if needed
    if ! command -v certbot >/dev/null 2>&1; then
      echo "📦 Installing certbot..."
      apt-get update -qq
      apt-get install -y certbot >/dev/null 2>&1
    fi

    # Stop nginx if running to free port 80
    if docker compose ps nginx 2>/dev/null | grep -q "Up"; then
      echo "⏸️  Stopping nginx temporarily to free port 80..."
      docker compose stop nginx >/dev/null 2>&1
    fi

    echo ""
    echo "🌐 Obtaining standard SSL certificate for ${NEW_DOMAIN} and www.${NEW_DOMAIN}..."
    echo "   Using HTTP challenge (automatic - no DNS changes needed)"
    echo ""

    # Use standalone HTTP challenge - fully automatic, no interaction needed
    certbot certonly --standalone \
      -d "${NEW_DOMAIN}" -d "www.${NEW_DOMAIN}" \
      --email "admin@${NEW_DOMAIN}" \
      --agree-tos --no-eff-email --non-interactive || {
      echo ""
      echo "⚠️  Certificate generation failed."
      echo "   Common causes:"
      echo "   - Port 80 is blocked by firewall"
      echo "   - DNS not pointing to this server yet"
      echo "   - Domain doesn't exist"
      echo ""
      echo "   You can obtain certificates manually later with:"
      echo "   certbot certonly --standalone -d ${NEW_DOMAIN} -d www.${NEW_DOMAIN}"
      echo ""
      SSL_FAILED=1
    }

    # Check if certificates were created
    if [ -d "/etc/letsencrypt/live/${NEW_DOMAIN}" ] && [ -z "$SSL_FAILED" ]; then
      echo "✔ SSL certificates obtained from Let's Encrypt"
      echo "✔ Certificate auto-renewal configured"
    else
      echo "⚠️  Certificates not found. Continuing without SSL."
      echo "   You can add SSL later following the documentation."
    fi
    echo ""
  elif [ "$SSL_OPTION" = "2" ]; then
    # Wildcard SSL with DNS challenge
    # Install certbot if needed
    if ! command -v certbot >/dev/null 2>&1; then
      echo "📦 Installing certbot..."
      apt-get update -qq
      apt-get install -y certbot >/dev/null 2>&1
    fi

    # Stop nginx if running
    if docker compose ps nginx 2>/dev/null | grep -q "Up"; then
      echo "⏸️  Stopping nginx temporarily..."
      docker compose stop nginx >/dev/null 2>&1
    fi

    echo ""
    echo "🌐 Obtaining wildcard SSL certificate for *.${NEW_DOMAIN} and ${NEW_DOMAIN}..."
    echo ""
    echo "⚠️  IMPORTANT: This requires DNS access!"
    echo "   You'll need to add a TXT record to your DNS provider."
    echo "   Have your DNS provider login ready (Cloudflare, Namecheap, etc.)"
    echo ""
    read -p "Press Enter to continue (or Ctrl+C to cancel)..."
    echo ""

    # Use manual DNS challenge - requires user interaction
    certbot certonly --manual --preferred-challenges dns \
      -d "${NEW_DOMAIN}" -d "*.${NEW_DOMAIN}" \
      --email "admin@${NEW_DOMAIN}" \
      --agree-tos --no-eff-email || {
      echo ""
      echo "⚠️  Wildcard certificate generation failed or was cancelled."
      echo ""
      echo "   You can obtain wildcard certificates manually later with:"
      echo "   certbot certonly --manual --preferred-challenges dns -d ${NEW_DOMAIN} -d *.${NEW_DOMAIN}"
      echo ""
      SSL_FAILED=1
    }

    # Check if certificates were created
    # Wildcard certs might be in a different directory
    CERT_DIR="/etc/letsencrypt/live/${NEW_DOMAIN}"
    if [ ! -d "$CERT_DIR" ]; then
      CERT_DIR="/etc/letsencrypt/live/${NEW_DOMAIN}-0001"
    fi

    if [ -d "$CERT_DIR" ] && [ -z "$SSL_FAILED" ]; then
      echo ""
      echo "✔ Wildcard SSL certificates obtained from Let's Encrypt!"
      echo "✔ Covers: ${NEW_DOMAIN} and *.${NEW_DOMAIN} (all subdomains)"
      echo ""
      echo "⚠️  Note: Wildcard certificates require manual renewal every 90 days."
      echo "   Renewal command:"
      echo "   certbot certonly --manual --preferred-challenges dns -d ${NEW_DOMAIN} -d *.${NEW_DOMAIN}"
      echo ""
    else
      echo "⚠️  Certificates not found. Continuing without SSL."
      echo "   You can add SSL later following the documentation."
    fi
    echo ""
  else
    echo "⏭️  Skipping SSL certificate setup"
    echo ""
    echo "   To add SSL later:"
    echo "   Standard: certbot certonly --standalone -d ${NEW_DOMAIN} -d www.${NEW_DOMAIN}"
    echo "   Wildcard: certbot certonly --manual --preferred-challenges dns -d ${NEW_DOMAIN} -d *.${NEW_DOMAIN}"
    echo "   Then copy certificates to ./ssl/ and restart nginx"
    echo ""
  fi
else
  echo "⏭️  Skipping SSL certificates (localhost mode)"
  echo ""
fi


############################################
# STEP 3 — Copy certs into project ./ssl
############################################

# Set cookie domain and secure flag based on domain
if [ "$NEW_DOMAIN" != "localhost" ]; then
  # Production domain - set cookie domain with leading dot for subdomain sharing
  if grep -q "^COOKIE_DOMAIN=" .env; then
    # Only update if empty, don't overwrite if already set
    if grep -q "^COOKIE_DOMAIN=$" .env || ! grep -q "^COOKIE_DOMAIN=." .env; then
      sed -i "s|^COOKIE_DOMAIN=.*|COOKIE_DOMAIN=.${NEW_DOMAIN}|" .env
    fi
  else
    echo "COOKIE_DOMAIN=.${NEW_DOMAIN}" >> .env
  fi
  
  # Set COOKIE_SECURE=1 for production (HTTPS required)
  if grep -q "^COOKIE_SECURE=" .env; then
    sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=1|" .env
  else
    echo "COOKIE_SECURE=1" >> .env
  fi
  
  echo "✔ Cookie domain set to .${NEW_DOMAIN} for cross-subdomain authentication"
  echo "✔ Cookie Secure flag enabled (HTTPS required)"
  echo ""
else
  # Localhost - no cookie domain, allow HTTP
  if grep -q "^COOKIE_DOMAIN=" .env; then
    sed -i "s|^COOKIE_DOMAIN=.*|COOKIE_DOMAIN=|" .env
  else
    echo "COOKIE_DOMAIN=" >> .env
  fi
  
  # Set COOKIE_SECURE=0 for localhost (HTTP allowed)
  if grep -q "^COOKIE_SECURE=" .env; then
    sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=0|" .env
  else
    echo "COOKIE_SECURE=0" >> .env
  fi
  
  echo "✔ Cookie configuration set for localhost (HTTP allowed)"
  echo ""
fi

# Only copy certificates if domain is not localhost
if [ "$NEW_DOMAIN" != "localhost" ]; then
  echo "📦 Copying certificates to ./ssl/ folder..."

  mkdir -p ssl

  # Find the certificate directory (might be ${NEW_DOMAIN} or ${NEW_DOMAIN}-0001 for wildcards)
  CERT_SOURCE_DIR="/etc/letsencrypt/live/${NEW_DOMAIN}"
  if [ ! -d "$CERT_SOURCE_DIR" ]; then
    CERT_SOURCE_DIR="/etc/letsencrypt/live/${NEW_DOMAIN}-0001"
  fi

  if [ -d "$CERT_SOURCE_DIR" ]; then
    sudo cp "${CERT_SOURCE_DIR}/fullchain.pem" ./ssl/
    sudo cp "${CERT_SOURCE_DIR}/privkey.pem" ./ssl/

    # Make them owned by current user for nginx container mount
    sudo chown "$USER":"$USER" ssl/fullchain.pem ssl/privkey.pem

    echo "✔ Certificates copied from ${CERT_SOURCE_DIR}"
    echo ""
  else
    echo "⚠️  Certificate directory not found. Skipping certificate copy."
    echo "   If you obtained certificates, copy them manually:"
    echo "   sudo cp /etc/letsencrypt/live/${NEW_DOMAIN}/fullchain.pem ./ssl/"
    echo "   sudo cp /etc/letsencrypt/live/${NEW_DOMAIN}/privkey.pem ./ssl/"
    echo ""
  fi
else
  echo "⏭️  Skipping certificate copy (localhost mode)"
  echo "   Create self-signed certificates manually if needed for HTTPS"
  echo ""
fi


############################################
# STEP 4 — Generate SECRET_KEY
############################################

echo "🔑 Generating SECRET_KEY..."

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")

if grep -q "^SECRET_KEY=" .env; then
    sed -i "s|^SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY}|" .env
else
    echo "SECRET_KEY=${SECRET_KEY}" >> .env
fi

echo "✔ SECRET_KEY generated"
echo ""


############################################
# STEP 5 — Generate ENCRYPTION_KEY
############################################

echo "🧬 Generating ENCRYPTION_KEY..."

ENCRYPTION_KEY=$(python3 - << 'EOF'
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
EOF
)

if grep -q "^ENCRYPTION_KEY=" .env; then
    sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" .env
else
    echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}" >> .env
fi

echo "✔ ENCRYPTION_KEY generated"
echo ""


############################################
# STEP 6 — Generate Postgres superuser password
############################################

echo "🔐 Generating PostgreSQL superuser password..."

SUPER_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/" | head -c 20)

# Make sure .env has POSTGRES_USER as the superuser right now
if grep -q "^POSTGRES_USER=" .env; then
    sed -i "s|^POSTGRES_USER=.*|POSTGRES_USER=${POSTGRES_SUPERUSER}|" .env
else
    echo "POSTGRES_USER=${POSTGRES_SUPERUSER}" >> .env
fi

if grep -q "^POSTGRES_PASSWORD=" .env; then
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${SUPER_PASSWORD}|" .env
else
    echo "POSTGRES_PASSWORD=${SUPER_PASSWORD}" >> .env
fi

echo "✔ Superuser password updated (POSTGRES_USER=${POSTGRES_SUPERUSER})"
echo ""


############################################
# STEP 7 — Prepare DB SSL config BEFORE starting container
############################################

echo "🔒 Generating PostgreSQL SSL certificates for DB..."

mkdir -p ssl/db

openssl req -new -newkey rsa:4096 -days 365 -x509 \
  -subj "/CN=postgres" \
  -keyout ssl/db/db-key.pem \
  -out ssl/db/db-cert.pem \
  -nodes >/dev/null 2>&1

chmod 600 ssl/db/db-key.pem
chmod 644 ssl/db/db-cert.pem
chown 999:999 ssl/db/db-key.pem ssl/db/db-cert.pem

echo "✔ DB SSL certs generated"
echo ""

echo "📄 Writing PostgreSQL SSL configuration..."

mkdir -p postgres

# If docker previously created a directory at postgres/postgresql.conf, remove it
if [ -d postgres/postgresql.conf ]; then
  echo "⚠️  postgres/postgresql.conf is a directory. Removing it so we can write a file."
  rm -rf postgres/postgresql.conf
fi

cat > postgres/postgresql.conf << 'EOF'
# PostgreSQL SSL Configuration
listen_addresses='*'
ssl = on
ssl_cert_file = '/etc/ssl/postgresql/db-cert.pem'
ssl_key_file  = '/etc/ssl/postgresql/db-key.pem'
ssl_ca_file   = '/etc/ssl/postgresql/db-cert.pem'
ssl_prefer_server_ciphers = on
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_min_protocol_version = 'TLSv1.2'
EOF

echo "✔ DB SSL config written"
echo ""


############################################
# STEP 8 — Start DB container
############################################

echo "🐘 Starting PostgreSQL container (db service)..."

docker compose up -d db

echo "⏳ Waiting for Postgres to be ready..."
# We use the superuser we configured above
until docker compose exec -T db pg_isready -U "$POSTGRES_SUPERUSER" >/dev/null 2>&1; do
  printf '.'
  sleep 1
done
echo ""
echo "✔ DB is ready"
echo ""


############################################
# STEP 9 — Create restricted app user
############################################

echo "👤 Creating restricted DB user: ${APP_USER}"

APP_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/" | head -c 20)

docker compose exec -T db psql -U "$POSTGRES_SUPERUSER" -d "$POSTGRES_DB" << EOF
DO
\$do\$
BEGIN
   IF NOT EXISTS (
       SELECT FROM pg_catalog.pg_roles WHERE rolname = '$APP_USER'
   ) THEN
       CREATE ROLE $APP_USER LOGIN PASSWORD '$APP_PASSWORD';
   ELSE
       ALTER ROLE $APP_USER LOGIN PASSWORD '$APP_PASSWORD';
   END IF;
END
\$do\$;

GRANT CONNECT ON DATABASE $POSTGRES_DB TO $APP_USER;
GRANT USAGE ON SCHEMA public TO $APP_USER;

-- Tables: full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $APP_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $APP_USER;

-- Sequences: allowed privileges (no INSERT/DELETE)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $APP_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO $APP_USER;

GRANT CREATE ON SCHEMA public TO $APP_USER;
EOF

echo "✔ Restricted user ensured/updated"
echo ""


############################################
# STEP 10 — Update .env to use app user
############################################

sed -i "s|^POSTGRES_USER=.*|POSTGRES_USER=${APP_USER}|" .env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${APP_PASSWORD}|" .env

echo "✔ .env updated with restricted app user credentials"
echo ""


############################################
# DONE
############################################

############################################
# STEP 11 — Add initial setup variables to .env
############################################

echo "📝 Adding initial setup variables to .env..."

# Add initial setup variables (commented out by default)
cat >> .env << 'EOF'

# ==================== Initial Setup (Optional) ====================
# Uncomment and set these to create initial admin user and tenant
# INITIAL_ADMIN_EMAIL=
# INITIAL_ADMIN_PASSWORD=
# INITIAL_ADMIN_FIRST_NAME=Admin
# INITIAL_ADMIN_LAST_NAME=User
# INITIAL_TENANT_NAME=
# INITIAL_TENANT_EMAIL=
# SKIP_INITIAL_SETUP=0
EOF

echo "✔ Initial setup variables added to .env"
echo ""


############################################
# DONE
############################################

echo ""
echo "🎉 INSTALLATION COMPLETE!"
echo "============================="
echo "🔐 Domain:           $NEW_DOMAIN"
echo "🔐 SECRET_KEY:       $SECRET_KEY"
echo "🔐 ENCRYPTION_KEY:   $ENCRYPTION_KEY"
echo "🔐 DB superuser:     ${POSTGRES_SUPERUSER}"
echo "   Superuser pass:   ${SUPER_PASSWORD}"
echo "🔐 App DB user:      ${APP_USER}"
echo "   App DB password:  ${APP_PASSWORD}"
echo ""
echo "👉 NEXT STEPS:"
echo "   1. Start services: docker compose up -d"
echo "   2. Wait for backend to be ready, then run migrations:"
echo "      docker compose exec backend alembic upgrade head"
echo "      (Single initial migration creates all 15 tables)"
echo "   3. (Optional) Run initial setup to create admin/tenant and seed data:"
echo "      Set INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, INITIAL_TENANT_NAME in .env"
echo "      Then: docker compose exec backend python scripts/initial_setup.py"
echo "   4. Build frontend: docker compose up frontend-build"
echo "   5. Start nginx: docker compose up -d nginx"
echo ""
echo "💡 TIP: Initial setup will automatically seed:"
echo "   - Global locations (EU, US, UK, Canada, APAC, Australia, Other)"
echo "   - Tenant departments (IT, HR, Legal, Operations, Sales & Marketing)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "👤 Admin Account Setup"
echo "----------------------"
echo "Create an admin account to manage your application."
echo ""
read -p "Create admin account now? (y/n, default: y): " CREATE_ADMIN
CREATE_ADMIN=${CREATE_ADMIN:-y}

if [[ $CREATE_ADMIN =~ ^[Yy]$ ]]; then
    echo ""
    read -p "Admin email: " ADMIN_EMAIL

    if [ -z "$ADMIN_EMAIL" ]; then
        echo "⏭️  Email required. Skipping admin creation."
        echo "   Create admin later with: docker compose exec backend python scripts/create_superuser.py"
    else
        read -sp "Admin password (leave empty to auto-generate): " ADMIN_PASSWORD
        echo ""

        if [ -z "$ADMIN_PASSWORD" ]; then
            ADMIN_PASSWORD=$(openssl rand -base64 16)
            echo "✔ Generated password: $ADMIN_PASSWORD"
            echo "   ⚠️  SAVE THIS PASSWORD - it won't be shown again!"
            echo ""
        fi

        read -p "First name (optional): " ADMIN_FIRST_NAME
        read -p "Last name (optional): " ADMIN_LAST_NAME

        # Save admin creation for after services start
        ADMIN_EMAIL_SAVED="$ADMIN_EMAIL"
        ADMIN_PASSWORD_SAVED="$ADMIN_PASSWORD"
        ADMIN_FIRST_NAME_SAVED="$ADMIN_FIRST_NAME"
        ADMIN_LAST_NAME_SAVED="$ADMIN_LAST_NAME"
        CREATE_ADMIN_AFTER_START=1
        echo ""
        echo "✔ Admin credentials saved. Will create after services start."
    fi
else
    echo ""
    echo "⏭️  Skipping admin creation."
    echo "   Create admin later with:"
    echo "   docker compose exec backend python scripts/create_superuser.py"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Starting services..."
echo ""
echo "   Run: docker compose up -d"
echo "   Then: docker compose exec backend alembic upgrade head"
echo ""

# Create admin if requested
if [ -n "$CREATE_ADMIN_AFTER_START" ]; then
    echo "After services start, creating admin account..."
    echo "   (This will happen automatically when you run 'docker compose up -d')"
    echo ""

    # Create a helper script for admin creation
    cat > /tmp/create_admin_post_install.sh << EOF
#!/bin/bash
echo ""
echo "📧 Creating admin account..."
docker compose exec -T -e SUPERUSER_EMAIL="${ADMIN_EMAIL_SAVED}" \
  -e SUPERUSER_PASSWORD="${ADMIN_PASSWORD_SAVED}" \
  -e SUPERUSER_FIRST_NAME="${ADMIN_FIRST_NAME_SAVED}" \
  -e SUPERUSER_LAST_NAME="${ADMIN_LAST_NAME_SAVED}" \
  backend python scripts/create_superuser.py 2>&1 | tail -20
echo ""
echo "✔ Admin account setup complete!"
echo "   Email: ${ADMIN_EMAIL_SAVED}"
if [ -z "${ADMIN_PASSWORD_ORIGINAL:-}" ]; then
  echo "   Password: ${ADMIN_PASSWORD_SAVED}"
fi
echo "   Login at: https://${NEW_DOMAIN}/login"
echo ""
rm -f /tmp/create_admin_post_install.sh
EOF
    chmod +x /tmp/create_admin_post_install.sh

    echo "   After starting services and running migrations, run:"
    echo "   bash /tmp/create_admin_post_install.sh"
fi

echo ""
