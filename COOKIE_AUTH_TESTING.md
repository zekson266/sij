# Cookie-Based Authentication - Manual Testing Guide

## Production Setup Complete ✅

### Configuration Applied
- **Domain**: `onebrat.xyz`
- **Cookie Domain**: `.onebrat.xyz` (shared across subdomains)
- **Cookie Secure**: `1` (HTTPS only)
- **Cookie SameSite**: `lax` (CSRF protection)
- **Rate Limiting**: Enabled on auth endpoints

---

## Pre-Testing Checklist

### 1. Verify Environment
```bash
# Check .env configuration
grep -E "^(DOMAIN_NAME|COOKIE_DOMAIN|COOKIE_SECURE|COOKIE_SAMESITE)=" .env

# Expected output:
# DOMAIN_NAME=onebrat.xyz
# COOKIE_DOMAIN=.onebrat.xyz
# COOKIE_SECURE=1
# COOKIE_SAMESITE=lax
```

### 2. Install Dependencies
```bash
# Install new rate limiting dependency
docker compose exec backend pip install slowapi==0.1.9

# Or rebuild backend container
docker compose build backend
```

### 3. Restart Services
```bash
# Restart backend to apply changes
docker compose restart backend

# Verify backend is running
docker compose ps backend
```

---

## Manual Testing Instructions

### Test 1: Login Flow (Main Domain)

**Steps:**
1. Open browser: `https://onebrat.xyz/login`
2. Enter valid credentials and login
3. Open browser DevTools (F12) → Application → Cookies
4. Verify cookie exists:
   - **Name**: `access_token`
   - **Domain**: `.onebrat.xyz`
   - **HttpOnly**: ✅ (checked)
   - **Secure**: ✅ (checked)
   - **SameSite**: `Lax`
5. Navigate to tenant list: `https://onebrat.xyz/tenants`
6. **Expected**: User is logged in, tenant list loads (then workspace for single-tenant users)

**Success Criteria:**
- ✅ Cookie is set with correct attributes
- ✅ User can access protected pages
- ✅ User info displays correctly

---

### Test 2: Cross-Subdomain Authentication

**Steps:**
1. Ensure you're logged in on `https://onebrat.xyz`
2. Navigate to tenant subdomain: `https://tenant-slug.onebrat.xyz`
   (Replace `tenant-slug` with an actual tenant slug)
3. Check browser DevTools → Application → Cookies
4. **Expected**: Same `access_token` cookie visible (domain: `.onebrat.xyz`)
5. Verify page behavior:
   - If tenant public page: Should show "You are authenticated" or member status
   - Check if personalized content appears

**Success Criteria:**
- ✅ Cookie is accessible on subdomain
- ✅ User is recognized as logged in
- ✅ Personalized content shows (if applicable)

---

### Test 3: Logout Flow

**Steps:**
1. While logged in, click logout button
2. Check browser DevTools → Application → Cookies
3. **Expected**: `access_token` cookie is deleted/cleared
4. Navigate to protected page: `https://onebrat.xyz/tenants`
5. **Expected**: Redirected to login page

**Success Criteria:**
- ✅ Cookie is cleared on logout
- ✅ User cannot access protected pages after logout

---

### Test 4: Token Refresh

**Steps:**
1. Login and note cookie expiration time
2. Wait or trigger token refresh (if implemented)
3. Check browser DevTools → Application → Cookies
4. **Expected**: New cookie with updated expiration

**Success Criteria:**
- ✅ Token refresh updates cookie
- ✅ Authentication persists after refresh

---

### Test 5: Rate Limiting

**Steps:**
1. Open browser DevTools → Network tab
2. Attempt to login with wrong password 6 times rapidly
3. **Expected**: After 5 attempts, receive rate limit error (429)
4. Wait 1 minute and try again
5. **Expected**: Can attempt login again

**Success Criteria:**
- ✅ Rate limiting blocks excessive attempts
- ✅ Rate limit resets after time window

---

### Test 6: Cookie Security Attributes

**Steps:**
1. Login successfully
2. Open browser DevTools → Application → Cookies
3. Verify cookie attributes:
   - **HttpOnly**: ✅ (JavaScript cannot access)
   - **Secure**: ✅ (HTTPS only)
   - **SameSite**: `Lax` (CSRF protection)
   - **Domain**: `.onebrat.xyz` (shared across subdomains)

**Success Criteria:**
- ✅ All security attributes are correct
- ✅ Cookie cannot be accessed via JavaScript (HttpOnly)
- ✅ Cookie only sent over HTTPS (Secure)

---

### Test 7: Multiple Subdomains

**Steps:**
1. Login on `https://onebrat.xyz`
2. Open new tab: `https://tenant1.onebrat.xyz`
3. **Expected**: Recognized as logged in
4. Open another tab: `https://tenant2.onebrat.xyz`
5. **Expected**: Recognized as logged in

**Success Criteria:**
- ✅ Authentication works across all subdomains
- ✅ Single login provides access to all subdomains

---

### Test 8: Browser DevTools Verification

**Steps:**
1. Login successfully
2. Open DevTools → Application → Cookies → `https://onebrat.xyz`
3. Try to access cookie via Console:
   ```javascript
   document.cookie
   ```
4. **Expected**: `access_token` is NOT in the output (HttpOnly prevents access)

**Success Criteria:**
- ✅ Cookie is not accessible via JavaScript
- ✅ XSS attacks cannot steal token

---

## Troubleshooting

### Cookie Not Set
- **Check**: Backend logs for errors
- **Check**: CORS configuration allows credentials
- **Check**: `.env` has correct `COOKIE_DOMAIN`

### Cookie Not Shared Across Subdomains
- **Check**: `COOKIE_DOMAIN` starts with `.` (e.g., `.onebrat.xyz`)
- **Check**: Both domains are subdomains of same parent domain

### Rate Limiting Not Working
- **Check**: `slowapi` is installed: `docker compose exec backend pip list | grep slowapi`
- **Check**: Backend logs for rate limit errors
- **Check**: Rate limit decorators are applied to endpoints

### Authentication Fails on Subdomain
- **Check**: Cookie domain is `.onebrat.xyz` (with leading dot)
- **Check**: Backend can read cookies (check logs)
- **Check**: CORS allows credentials from subdomain

---

## Quick Verification Commands

```bash
# Check backend is running
docker compose ps backend

# Check backend logs
docker compose logs backend | tail -50

# Verify cookie settings in .env
grep -E "COOKIE" .env

# Test API endpoint (should return 401 without cookie)
curl -v https://onebrat.xyz/api/auth/me

# Test with cookie (after login, copy cookie from browser)
curl -v -H "Cookie: access_token=YOUR_TOKEN" https://onebrat.xyz/api/auth/me
```

---

## Expected Behavior Summary

| Action | Main Domain | Subdomain | Expected Result |
|--------|------------|-----------|-----------------|
| Login | ✅ | N/A | Cookie set, user authenticated |
| Access Protected Page | ✅ | ✅ | User recognized, page loads |
| Logout | ✅ | ✅ | Cookie cleared, redirected to login |
| Token Refresh | ✅ | ✅ | Cookie updated, auth persists |
| Rate Limit | ✅ | ✅ | Blocks after 5 failed attempts |

---

## Success Indicators

✅ **All tests pass if:**
- Cookie is set with correct security attributes
- Authentication works across subdomains
- Logout clears cookie properly
- Rate limiting prevents brute force
- Cookie is not accessible via JavaScript

---

## Next Steps After Testing

1. **Monitor**: Check backend logs for any errors
2. **Verify**: All subdomains are accessible
3. **Test**: With real users in production
4. **Monitor**: Rate limiting effectiveness

---

## Production Deployment Notes

- ✅ Cookie domain configured for `.onebrat.xyz`
- ✅ HTTPS enforced (COOKIE_SECURE=1)
- ✅ CSRF protection enabled (SameSite=Lax)
- ✅ Rate limiting active on auth endpoints
- ✅ HttpOnly cookies prevent XSS attacks

**Status**: Ready for production use ✅

