# Rebuild Instructions - Apply Cookie Authentication Changes

## 🔄 Rebuild Required

Since we've made changes to backend code and dependencies, you need to rebuild the Docker containers.

---

## Quick Rebuild (Recommended)

```bash
# 1. Stop all services
docker compose down

# 2. Rebuild backend (installs slowapi + applies code changes)
docker compose build --no-cache backend

# 3. Rebuild frontend (applies code changes)
docker compose build --no-cache frontend-build

# 4. Start all services
docker compose up -d

# 5. Run database migrations
# Single initial migration creates all 15 tables (core, booker, ROPA, AI)
docker compose exec backend alembic upgrade head

# 6. Build frontend assets
docker compose up frontend-build

# 7. Restart nginx to serve new frontend
docker compose restart nginx
```

---

## Faster Rebuild (If containers are running)

```bash
# 1. Rebuild and restart backend
docker compose build backend
docker compose up -d --force-recreate backend

# 2. Rebuild and restart frontend
docker compose build frontend-build
docker compose up frontend-build

# 3. Restart nginx
docker compose restart nginx
```

---

## Verify Changes Applied

### Check Backend
```bash
# Verify slowapi is installed
docker compose exec backend pip list | grep slowapi

# Check backend logs for rate limiting
docker compose logs backend | grep -i "rate limiting"

# Test health endpoint
curl https://onebrat.xyz/api/health
```

### Check Frontend
```bash
# Check frontend build completed
docker compose ps frontend-build

# Verify nginx is serving new build
curl -I https://onebrat.xyz
```

---

## What Gets Rebuilt

### Backend Container
- ✅ Installs `slowapi==0.1.9` (new dependency)
- ✅ Applies cookie configuration changes
- ✅ Applies rate limiting changes
- ✅ Applies token reading from cookies

### Frontend Container
- ✅ Applies cookie authentication changes
- ✅ Removes localStorage token storage
- ✅ Updates API service

---

## Expected Output

### Backend Logs Should Show:
```
Rate limiting configured
CORS configured with allowed origins: [...]
```

### Frontend Build Should Show:
```
✓ built in Xs
```

### Verification:
```bash
# Check cookie settings
grep -E "COOKIE" .env

# Check slowapi installed
docker compose exec backend pip list | grep slowapi
```

---

## Troubleshooting

### Backend won't start?
```bash
# Check logs
docker compose logs backend

# Verify requirements.txt
cat backend/requirements.txt | grep slowapi
```

### Frontend build fails?
```bash
# Check logs
docker compose logs frontend-build

# Rebuild with verbose output
docker compose build --progress=plain frontend-build
```

### Cookie not working?
```bash
# Verify .env configuration
grep -E "COOKIE" .env

# Check backend can read cookies (check logs)
docker compose logs backend | grep -i cookie
```

---

## After Rebuild - Test

1. **Login**: `https://onebrat.xyz/login`
2. **Check cookies**: DevTools → Application → Cookies
3. **Test subdomain**: Navigate to `https://[tenant-slug].onebrat.xyz`
4. **Verify**: User recognized as logged in

See `MANUAL_TEST_INSTRUCTIONS.md` for complete testing guide.

