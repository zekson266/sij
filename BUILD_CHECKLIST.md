# Build Verification Checklist

## ⚠️ ALWAYS RUN THIS AFTER CODE CHANGES

### Quick Check (30 seconds):
```bash
cd frontend && npm run build
```
**If this fails, STOP and fix errors before proceeding.**

---

## Full Verification (2 minutes):

### 1. Frontend Build
```bash
cd frontend
npm run build
```
✅ **Expected**: Build completes with exit code 0  
❌ **If fails**: Check TypeScript errors, fix immediately

### 2. Verify Build Output
```bash
ls -la frontend/dist/assets/*.js
```
✅ **Expected**: JavaScript bundle files exist  
❌ **If missing**: Build didn't complete successfully

### 3. Docker Build
```bash
docker compose build frontend-build
docker compose logs frontend-build --tail 20
```
✅ **Expected**: "✓ built in X.XXs" message, no errors  
❌ **If fails**: Check logs for TypeScript/Docker errors

### 4. Verify Code in Bundle (for critical features)
```bash
# Example: Check if subdomain code is present
grep -q "isTenantSubdomain\|getSubdomain" frontend/dist/assets/*.js && echo "✅ Found" || echo "❌ Missing"
```

---

## Automated Check

Run the verification script:
```bash
./scripts/verify-build.sh
```

Or with a search term:
```bash
./scripts/verify-build.sh "isTenantSubdomain"
```

---

## Common Issues & Fixes

### TypeScript Error: Property doesn't exist
**Error**: `error TS2339: Property 'X' does not exist on type 'Y'`  
**Fix**: Add type assertion: `(obj as any).property`

### Build succeeds but code not working
1. Check if new bundle is being served:
   ```bash
   docker compose exec nginx cat /usr/share/nginx/html/index.html | grep "index-.*\.js"
   ```
2. Verify bundle was updated:
   ```bash
   ls -lh frontend/dist/assets/*.js
   ```
3. Restart nginx:
   ```bash
   docker compose restart nginx
   ```

### Docker build fails silently
- Always check logs: `docker compose logs frontend-build`
- Check exit code: `docker compose ps frontend-build`

---

## For AI Assistants

**Before marking any frontend task as complete:**
1. ✅ Run `npm run build` in frontend directory
2. ✅ Verify no TypeScript errors
3. ✅ Check build output exists
4. ✅ Verify Docker build succeeds
5. ✅ Check Docker logs for errors

**If any step fails, report immediately and fix before proceeding.**




