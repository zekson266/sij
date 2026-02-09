# Manual Testing Instructions - Cookie Authentication

## ✅ Production Setup Complete

**Configuration:**
- Domain: `onebrat.xyz`
- Cookie Domain: `.onebrat.xyz` (shared across subdomains)
- Security: HttpOnly, Secure, SameSite=Lax
- Rate Limiting: Enabled (5 login attempts/minute)

---

## Quick Test Steps

### 1. Install Dependencies & Restart
```bash
# Install rate limiting dependency
docker compose exec backend pip install slowapi==0.1.9

# Restart backend
docker compose restart backend
```

### 2. Test Login (Main Domain)
1. Open: `https://onebrat.xyz/login`
2. Login with valid credentials
3. Open DevTools (F12) → Application → Cookies
4. **Verify**: `access_token` cookie exists with:
   - Domain: `.onebrat.xyz`
   - HttpOnly: ✅
   - Secure: ✅
   - SameSite: `Lax`
5. Navigate to dashboard → Should work ✅

### 3. Test Cross-Subdomain
1. While logged in, navigate to: `https://[tenant-slug].onebrat.xyz`
2. **Verify**: User is recognized as logged in
3. Check cookies → Same `access_token` cookie visible
4. **Expected**: Personalized content shows (if applicable)

### 4. Test Logout
1. Click logout
2. Check cookies → `access_token` should be deleted
3. Try accessing dashboard → Should redirect to login ✅

### 5. Test Rate Limiting
1. Try to login with wrong password 6 times rapidly
2. **Expected**: After 5 attempts, get rate limit error (429)
3. Wait 1 minute → Should work again ✅

---

## Verification Checklist

- [ ] Cookie set on login
- [ ] Cookie accessible on subdomain
- [ ] Cookie cleared on logout
- [ ] Rate limiting blocks excessive attempts
- [ ] Cookie has HttpOnly, Secure, SameSite attributes
- [ ] Authentication works across all subdomains

---

## Troubleshooting

**Cookie not set?**
- Check backend logs: `docker compose logs backend | tail -50`
- Verify `.env` has `COOKIE_DOMAIN=.onebrat.xyz`

**Not working on subdomain?**
- Ensure cookie domain starts with `.` (`.onebrat.xyz`)
- Check CORS allows credentials

**Rate limiting not working?**
- Verify slowapi installed: `docker compose exec backend pip list | grep slowapi`
- Check backend logs for rate limit errors

---

## Success = All Tests Pass ✅

See `COOKIE_AUTH_TESTING.md` for detailed test procedures.

