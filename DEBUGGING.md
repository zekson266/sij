# Debugging Guide - AI-Assisted Development

**Purpose:** Comprehensive guide for debugging the Booker application, optimized for AI-assisted development workflows.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Debug Mode Configuration](#debug-mode-configuration)
3. [Frontend Debugging](#frontend-debugging)
4. [Backend Debugging](#backend-debugging)
5. [Debug Tools](#debug-tools)
6. [Common Debugging Scenarios](#common-debugging-scenarios)
7. [AI-Assisted Debugging Patterns](#ai-assisted-debugging-patterns)
8. [Troubleshooting Workflows](#troubleshooting-workflows)

---

## Quick Reference

### Enable Debug Mode
```bash
# In .env file
DEBUG=1
```

### View Logs
```bash
# Backend logs
docker compose logs -f backend

# Frontend build logs
docker compose logs frontend-build

# All services
docker compose logs -f
```

### Debug Endpoint
```bash
# Only works when DEBUG=1
POST /api/debug/ingest/{log_id}
```

### Check Debug Status
```bash
# Verify DEBUG is enabled
docker compose exec backend python -c "from app.config import settings; print(f'DEBUG={settings.DEBUG}')"
```

---

## Debug Mode Configuration

### What DEBUG Mode Enables

**Backend:**
- ✅ Debug logging endpoint (`/api/debug/ingest/{log_id}`)
- ✅ More verbose logging (DEBUG level instead of INFO)
- ✅ Detailed error messages in responses
- ✅ SQL query logging (if enabled in `database.py`)
- ✅ CORS allows all origins (development only)

**Frontend:**
- ✅ Can send logs to debug endpoint
- ✅ More detailed console logging
- ✅ Error boundaries show stack traces

### Security Note

⚠️ **CRITICAL:** `DEBUG=1` should **NEVER** be enabled in production:
- Debug endpoint exposes internal logging
- Verbose errors may leak sensitive information
- CORS is permissive (allows all origins)

### Configuration

**Development:**
```bash
# .env
DEBUG=1
DOMAIN_NAME=localhost
```

**Production:**
```bash
# .env
DEBUG=0
DOMAIN_NAME=yourdomain.com
```

---

## Frontend Debugging

### 1. Browser Console

**Access:** Open DevTools (F12) → Console tab

**Common Commands:**
```javascript
// Check authentication state
localStorage.getItem('auth_token')  // Should be null (using cookies)
document.cookie  // Check cookies

// Check API base URL
import { API_BASE_URL } from './services/api';
console.log(API_BASE_URL);

// Inspect React state (if using React DevTools)
// Component state visible in Components tab
```

### 2. React DevTools

**Install:** [React DevTools Browser Extension](https://react.dev/learn/react-developer-tools)

**Usage:**
1. Open DevTools → Components tab
2. Select component to inspect
3. View props, state, hooks
4. Edit props/state in real-time

**Key Features:**
- Component tree navigation
- Props and state inspection
- Hook values (useState, useEffect, etc.)
- Profiler for performance debugging

### 3. Network Tab

**Access:** DevTools → Network tab

**What to Check:**
- **Request URL:** Verify correct endpoint
- **Request Method:** GET, POST, PATCH, DELETE
- **Request Headers:** Cookies, Authorization
- **Request Payload:** Form data, JSON body
- **Response Status:** 200, 400, 401, 403, 500
- **Response Body:** Error messages, data structure

**Common Issues:**
```javascript
// CORS Error
// Problem: Request blocked by CORS policy
// Solution: Check DEBUG mode, verify CORS config in backend

// 401 Unauthorized
// Problem: Missing or invalid authentication
// Solution: Check cookies, verify login status

// 422 Validation Error
// Problem: Request body doesn't match schema
// Solution: Check request payload, verify field types
```

### 4. Debug Logging to Backend

**When to Use:** Debugging issues that only occur in production/VPS environment

**Setup:**
```typescript
// In your component or service
const sendDebugLog = async (data: any) => {
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG === '1') {
    try {
      await fetch('/api/debug/ingest/frontend-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'info',
          message: 'Debug message',
          data: data,
          timestamp: Date.now(),
        }),
      });
    } catch (err) {
      // Fail silently - don't break app if debug endpoint fails
      console.error('Debug log failed:', err);
    }
  }
};
```

**View Logs:**
```bash
docker compose logs -f backend | grep DEBUG_LOG
```

### 5. Component State Debugging

**Pattern:**
```typescript
// Add temporary debug logging
React.useEffect(() => {
  console.log('Component state:', {
    prop1,
    prop2,
    state1,
    state2,
  });
}, [prop1, prop2, state1, state2]);
```

**React Hook Form Debugging:**
```typescript
// Watch all form values
const formValues = watch();
console.log('Form values:', formValues);

// Watch specific field
const fieldValue = watch('fieldName');
console.log('Field value:', fieldValue);

// Check form errors
console.log('Form errors:', errors);
```

### 6. API Service Debugging

**Check API Calls:**
```typescript
// In frontend/src/services/api.ts
// Add logging before requests
console.log('API Request:', {
  method,
  url,
  data,
  headers,
});

// Add logging after responses
console.log('API Response:', {
  status,
  data,
  headers,
});
```

---

## Backend Debugging

### 1. Docker Logs

**View Real-Time Logs:**
```bash
# Backend only
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail 100 backend

# Search for errors
docker compose logs backend | grep -i error

# Search for specific text
docker compose logs backend | grep "search term"
```

**Log Levels:**
- `DEBUG` - Detailed debugging information (only when DEBUG=1)
- `INFO` - General information
- `WARNING` - Warning messages
- `ERROR` - Error messages
- `CRITICAL` - Critical errors

### 2. SQL Query Logging

**Enable SQL Logging:**
```python
# backend/app/database.py
# Change echo parameter
engine = create_engine(
    database_url,
    echo=True  # Set to True to log all SQL queries
)
```

**View SQL Queries:**
```bash
docker compose logs -f backend | grep "SELECT\|INSERT\|UPDATE\|DELETE"
```

**Note:** SQL logging can be verbose. Only enable when debugging database issues.

### 3. Request/Response Debugging

**Add Logging to Routers:**
```python
# In any router file
import logging

logger = logging.getLogger(__name__)

@router.post("/endpoint")
async def my_endpoint(request: Request, data: MySchema):
    logger.info(f"Request received: {data.model_dump()}")
    
    try:
        result = await service.do_something(data)
        logger.info(f"Request successful: {result}")
        return result
    except Exception as e:
        logger.error(f"Request failed: {str(e)}", exc_info=True)
        raise
```

**View Request Logs:**
```bash
docker compose logs -f backend | grep "Request received\|Request successful\|Request failed"
```

### 4. Debug Endpoint Usage

**Endpoint:** `POST /api/debug/ingest/{log_id}`

**Security:** Only works when `DEBUG=1`

**Usage:**
```bash
# Send debug log
curl -X POST http://localhost/api/debug/ingest/my-log-id \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Debug message",
    "data": {"key": "value"},
    "timestamp": 1234567890
  }'
```

**View Logs:**
```bash
docker compose logs -f backend | grep DEBUG_LOG
```

### 5. Database Debugging

**Connect to Database:**
```bash
# Using psql
docker compose exec db psql -U app_user -d app_db

# Common queries
SELECT * FROM users LIMIT 10;
SELECT * FROM tenants LIMIT 10;
SELECT * FROM ropa_repositories LIMIT 10;

# Check table structure
\d users
\d tenants
\d ropa_repositories
```

**Check Migration Status:**
```bash
docker compose exec backend alembic current
docker compose exec backend alembic history
```

**View Recent Migrations:**
```bash
docker compose exec backend alembic show head
```

### 6. Error Tracing

**Python Exception Logging:**
```python
import logging
import traceback

logger = logging.getLogger(__name__)

try:
    # Your code
    pass
except Exception as e:
    # Log full traceback
    logger.error(f"Error occurred: {str(e)}", exc_info=True)
    
    # Or print traceback
    traceback.print_exc()
```

**View Full Tracebacks:**
```bash
docker compose logs backend | grep -A 20 "Traceback"
```

---

## Debug Tools

### 1. Debug Log Server (Local Development)

**File:** `scripts/debug-log-server.py`

**Purpose:** Local HTTP server for receiving debug logs (alternative to Docker debug endpoint)

**Usage:**
```bash
# Start debug log server
python scripts/debug-log-server.py

# Server listens on port 7342
# Logs written to: .cursor/debug.log
```

**When to Use:**
- Local development without Docker
- Testing debug logging functionality
- Collecting logs in NDJSON format

**Log Format:**
```json
{"level": "info", "message": "Debug message", "timestamp": 1234567890, "log_id": "my-log-id"}
```

**View Logs:**
```bash
# View all logs
cat .cursor/debug.log

# View last 10 lines
tail -10 .cursor/debug.log

# Search logs
grep "error" .cursor/debug.log
```

### 2. API Documentation (Swagger)

**Access:** `http://localhost/api/docs` (when running)

**Features:**
- Interactive API testing
- Request/response examples
- Schema validation
- Try-it-out functionality

**Usage:**
1. Navigate to `/api/docs`
2. Select endpoint
3. Click "Try it out"
4. Enter parameters
5. Execute request
6. View response

**Debugging Tips:**
- Test endpoints directly without frontend
- Verify request/response formats
- Check authentication requirements
- Test error scenarios

### 3. Health Check Endpoint

**Endpoint:** `GET /api/health`

**Usage:**
```bash
curl http://localhost/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

**When to Use:**
- Verify backend is running
- Check API accessibility
- Monitor service health

---

## Common Debugging Scenarios

### 1. "Service Unavailable" Error

**Symptoms:**
- Frontend shows "Service unavailable"
- API calls fail with network errors
- 502/503 errors

**Debugging Steps:**
```bash
# 1. Check if backend is running
docker compose ps backend

# 2. Check backend logs
docker compose logs backend | tail -50

# 3. Check if backend is healthy
curl http://localhost/api/health

# 4. Check database connection
docker compose exec backend python -c "from app.database import engine; engine.connect()"

# 5. Restart backend
docker compose restart backend
```

### 2. Authentication Issues

**Symptoms:**
- 401 Unauthorized errors
- User not recognized as logged in
- Cookies not being set

**Debugging Steps:**
```bash
# 1. Check cookies in browser
# DevTools → Application → Cookies

# 2. Check backend auth logs
docker compose logs backend | grep -i "auth\|login\|token"

# 3. Verify JWT secret
docker compose exec backend python -c "from app.config import settings; print('SECRET_KEY set:', bool(settings.SECRET_KEY))"

# 4. Check CORS configuration
# Verify DEBUG mode and CORS settings
```

**Frontend Debug:**
```javascript
// Check if cookies are being sent
console.log('Cookies:', document.cookie);

// Check API request headers
// Network tab → Request Headers → Cookie
```

### 3. Form Validation Errors

**Symptoms:**
- Forms don't submit
- 422 Validation Error
- Fields show errors incorrectly

**Debugging Steps:**
```typescript
// 1. Check form values
const values = watch();
console.log('Form values:', values);

// 2. Check form errors
console.log('Form errors:', errors);

// 3. Check validation schema
// Verify Zod schema matches form fields

// 4. Check backend schema
// Verify Pydantic schema matches frontend
```

**Backend Debug:**
```python
# Add logging to router
logger.info(f"Received data: {data.model_dump()}")
logger.info(f"Validation errors: {data.model_errors if hasattr(data, 'model_errors') else 'None'}")
```

### 4. Database Connection Issues

**Symptoms:**
- Database connection errors
- Migration failures
- Query timeouts

**Debugging Steps:**
```bash
# 1. Check database is running
docker compose ps db

# 2. Check database logs
docker compose logs db | tail -50

# 3. Test database connection
docker compose exec db pg_isready

# 4. Connect to database
docker compose exec db psql -U app_user -d app_db -c "SELECT 1;"

# 5. Check database URL
docker compose exec backend python -c "from app.config import settings; print(settings.DATABASE_URL)"
```

### 5. Build Failures

**Symptoms:**
- Frontend build fails
- TypeScript errors
- Missing dependencies

**Debugging Steps:**
```bash
# 1. Check build logs
docker compose logs frontend-build | tail -100

# 2. Build locally to see full errors
cd frontend && npm run build

# 3. Check TypeScript errors
cd frontend && npx tsc --noEmit

# 4. Check for missing dependencies
cd frontend && npm install

# 5. Clear build cache
rm -rf frontend/dist frontend/node_modules/.vite
cd frontend && npm run build
```

---

## AI-Assisted Debugging Patterns

### 1. Structured Error Reporting

**Pattern:** Provide AI with structured error information

```typescript
// When reporting errors to AI, include:
const errorReport = {
  error: error.message,
  stack: error.stack,
  context: {
    component: 'ComponentName',
    action: 'user action',
    state: { /* relevant state */ },
    props: { /* relevant props */ },
  },
  network: {
    url: request.url,
    method: request.method,
    status: response.status,
    body: response.body,
  },
  environment: {
    debug: import.meta.env.DEV,
    apiUrl: import.meta.env.VITE_API_URL,
  },
};
```

### 2. Reproducible Debug Steps

**Pattern:** Create step-by-step reproduction instructions

```markdown
## Bug Reproduction Steps

1. **Environment:**
   - DEBUG=1
   - Browser: Chrome 120
   - User: Logged in as admin

2. **Steps:**
   - Navigate to /tenants
   - Click "Create Tenant"
   - Fill form with: name="Test"
   - Click "Save"

3. **Expected:** Tenant created successfully
4. **Actual:** 422 Validation Error
5. **Error:** "name: String must contain at least 3 characters"
6. **Logs:** [paste relevant logs]
```

### 3. Debugging Checklist for AI

**When asking AI to debug, provide:**

- [ ] Error message (full text)
- [ ] Stack trace (if available)
- [ ] Steps to reproduce
- [ ] Expected behavior
- [ ] Actual behavior
- [ ] Relevant code snippets
- [ ] Environment details (DEBUG mode, browser, etc.)
- [ ] Logs (backend/frontend)
- [ ] Network requests (if API-related)

### 4. AI-Friendly Debug Code

**Pattern:** Add debug helpers that AI can use

```typescript
// Create debug utility
export const debug = {
  log: (label: string, data: any) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${label}:`, data);
    }
  },
  error: (label: string, error: Error) => {
    console.error(`[ERROR] ${label}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  },
  api: (request: any, response: any) => {
    console.log('[API] Request:', request);
    console.log('[API] Response:', response);
  },
};

// Usage
debug.log('Component render', { props, state });
debug.error('Form submission failed', error);
debug.api({ url, method, data }, { status, body });
```

---

## Troubleshooting Workflows

### Workflow 1: Frontend Issue

```
1. Reproduce issue in browser
2. Open DevTools → Console (check for errors)
3. Open DevTools → Network (check API calls)
4. Check React DevTools → Components (inspect state)
5. Add console.log() at relevant points
6. Check backend logs: docker compose logs backend
7. If API issue: Test endpoint in Swagger (/api/docs)
8. Report findings to AI with structured error report
```

### Workflow 2: Backend Issue

```
1. Check backend logs: docker compose logs -f backend
2. Search for errors: docker compose logs backend | grep -i error
3. Enable SQL logging (if database issue)
4. Test endpoint directly: curl or Swagger
5. Check database: docker compose exec db psql -U app_user -d app_db
6. Verify environment: DEBUG mode, database URL, etc.
7. Add detailed logging to router/service
8. Reproduce and capture full traceback
```

### Workflow 3: Build/Deployment Issue

```
1. Check build logs: docker compose logs frontend-build
2. Try local build: cd frontend && npm run build
3. Check TypeScript: cd frontend && npx tsc --noEmit
4. Verify dependencies: cd frontend && npm install
5. Check Docker: docker compose ps (all services running?)
6. Check environment: .env file, DEBUG mode
7. Restart services: docker compose restart
8. Full rebuild if needed: ./rebuild.sh
```

### Workflow 4: Database Issue

```
1. Check database status: docker compose ps db
2. Check database logs: docker compose logs db
3. Test connection: docker compose exec db pg_isready
4. Connect to database: docker compose exec db psql -U app_user -d app_db
5. Check migrations: docker compose exec backend alembic current
6. Check table structure: \d table_name
7. Query data: SELECT * FROM table_name LIMIT 10;
8. Check for locks: SELECT * FROM pg_locks;
```

---

## Best Practices

### 1. Use DEBUG Mode Wisely

- ✅ Enable in development
- ❌ Never enable in production
- ✅ Disable before deployment
- ✅ Check DEBUG status regularly

### 2. Logging Levels

- **DEBUG:** Detailed information (development only)
- **INFO:** General information (what's happening)
- **WARNING:** Potential issues (non-critical)
- **ERROR:** Errors that need attention
- **CRITICAL:** Critical errors (immediate action needed)

### 3. Error Messages

- Include context (what operation failed)
- Include relevant data (IDs, values)
- Don't expose sensitive information
- Use structured logging (JSON format)

### 4. Debug Code Cleanup

- Remove debug console.log() before committing
- Use environment checks: `if (DEBUG) { ... }`
- Don't commit temporary debug endpoints
- Clean up debug logging in production code

### 5. AI-Assisted Debugging

- Provide structured error reports
- Include reproduction steps
- Share relevant logs
- Include environment details
- Show expected vs. actual behavior

---

## Quick Commands Reference

```bash
# Enable debug mode
echo "DEBUG=1" >> .env
docker compose restart backend

# View backend logs
docker compose logs -f backend

# View frontend build logs
docker compose logs frontend-build

# Check debug status
docker compose exec backend python -c "from app.config import settings; print(f'DEBUG={settings.DEBUG}')"

# Test API health
curl http://localhost/api/health

# Connect to database
docker compose exec db psql -U app_user -d app_db

# Check migrations
docker compose exec backend alembic current

# Restart services
docker compose restart backend
docker compose restart nginx

# Full rebuild
./rebuild.sh
```

---

## Additional Resources

- **API Documentation:** `http://localhost/api/docs` (when running)
- **React DevTools:** [Install Extension](https://react.dev/learn/react-developer-tools)
- **Docker Logs:** [Docker Logs Documentation](https://docs.docker.com/compose/logging/)
- **PostgreSQL Debugging:** [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated:** 2026-01-21  
**For AI Assistants:** This guide provides comprehensive debugging workflows optimized for AI-assisted development. Use structured error reports and follow the troubleshooting workflows when debugging issues.
