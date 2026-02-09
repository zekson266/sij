# API Reference for Frontend Developers

Quick reference guide for integrating the frontend with the backend API.

## Base URL

- **Development**: `http://localhost:8000/api`
- **Production**: `https://yourdomain.com/api`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "error": false,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": true,
  "message": "Error message",
  "status_code": 400
}
```

---

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Response**: `TokenResponse` with `access_token` and `user` object

---

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Query Parameters** (optional):
- `tenant_id` - Include tenant context in token

**Response**: `TokenResponse` with `access_token`, `user`, `tenant_id`, `role`

---

## ROPA Module Endpoints

### Metadata Endpoints

#### Get Repository Field Metadata
```http
GET /api/tenants/{tenant_id}/ropa/metadata/repository-fields
Authorization: Bearer <token>
```

Returns field metadata for Repository form including descriptions, examples, and AI hints.

**Response**:
```json
{
  "formType": "repository",
  "fields": {
    "name": {
      "type": "text",
      "description": "Name or identifier of the data repository",
      "required": true,
      "examples": ["Production Customer Database", "AWS S3 Marketing Assets Bucket"],
      "aiHints": "Provide a clear, descriptive name..."
    }
  },
  "version": "1.0"
}
```

#### Get Activity Field Metadata
```http
GET /api/tenants/{tenant_id}/ropa/metadata/activity-fields
Authorization: Bearer <token>
```

Returns field metadata for Activity form.

#### Get DataElement Field Metadata
```http
GET /api/tenants/{tenant_id}/ropa/metadata/data-element-fields
Authorization: Bearer <token>
```

Returns field metadata for DataElement form.

#### Get DPIA Field Metadata
```http
GET /api/tenants/{tenant_id}/ropa/metadata/dpia-fields
Authorization: Bearer <token>
```

Returns field metadata for DPIA form.

#### Get Risk Field Metadata
```http
GET /api/tenants/{tenant_id}/ropa/metadata/risk-fields
Authorization: Bearer <token>
```

Returns field metadata for Risk form.

### AI Suggestion Job Endpoints

#### Create Suggestion Job (Repository)
```http
POST /api/tenants/{tenant_id}/ropa/repositories/{repository_id}/suggest-field
Authorization: Bearer <token>
Content-Type: application/json

{
  "field_name": "description",
  "field_type": "text",
  "field_label": "Description",
  "current_value": "",
  "form_data": { ... },
  "field_options": null
}
```

Creates an AI suggestion job for a repository field. Returns immediately with job ID.

**Response**:
```json
{
  "job_id": "uuid",
  "status": "pending",
  "created_at": "2026-01-05T..."
}
```

#### Get Suggestion Job Status (Repository)
```http
GET /api/tenants/{tenant_id}/ropa/repositories/{repository_id}/suggest-field/job/{job_id}
Authorization: Bearer <token>
```

Returns the current status and results of a suggestion job.

**Response**:
```json
{
  "job_id": "uuid",
  "status": "completed",
  "field_name": "description",
  "field_label": "Description",
  "general_statement": "Based on the context...",
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "error_message": null,
  "openai_model": "gpt-4o-mini",
  "openai_tokens_used": 150,
  "openai_cost_usd": 0.000023,
  "created_at": "2026-01-05T...",
  "completed_at": "2026-01-05T..."
}
```

#### List Suggestion Jobs (Repository)
```http
GET /api/tenants/{tenant_id}/ropa/repositories/{repository_id}/suggest-field/jobs
Authorization: Bearer <token>
```

Returns all suggestion jobs for a repository.

**Similar endpoints exist for**:
- Activities: `/api/tenants/{tenant_id}/ropa/activities/{activity_id}/suggest-field/*`
- DataElements: `/api/tenants/{tenant_id}/ropa/data-elements/{data_element_id}/suggest-field/*`
- DPIAs: `/api/tenants/{tenant_id}/ropa/dpias/{dpia_id}/suggest-field/*`
- Risks: `/api/tenants/{tenant_id}/ropa/risks/{risk_id}/suggest-field/*`

All follow the same pattern:
- `POST /{entity_type}/{entity_id}/suggest-field` - Create job
- `GET /{entity_type}/{entity_id}/suggest-field/job/{job_id}` - Get job status
- `GET /{entity_type}/{entity_id}/suggest-field/jobs` - List all jobs

**Note**: See `ROPA_AI_SUGGESTIONS.md` for complete documentation of the AI suggestion system.

---

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

**Query Parameters** (optional):
- `tenant_id` - Switch to different tenant context

**Response**: New `TokenResponse`

---

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response**: `UserResponse`

---

### Get User's Tenants
```http
GET /api/auth/tenants
Authorization: Bearer <token>
```

**Response**: Array of tenant objects with `tenant_user` and `tenant` info. Each `tenant_user`
includes `effective_permissions` (derived from role + custom permissions).

---

### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

---

### Resend Verification Email
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

---

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

---

### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "new_password": "newpassword123"
}
```

---

## Tenant Endpoints

### Create Tenant
```http
POST /api/tenants
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Company",
  "email": "contact@company.com",
  "phone": "+1234567890",
  "domain": "company.com"
}
```

---

### List Tenants
```http
GET /api/tenants
Authorization: Bearer <token>
```

**Response**: Array of `TenantResponse`

---

### Get Tenant by ID
```http
GET /api/tenants/{tenant_id}
Authorization: Bearer <token>
```

---

### Get Tenant by Slug
```http
GET /api/tenants/slug/{slug}
Authorization: Bearer <token>
```

---

### Update Tenant
```http
PATCH /api/tenants/{tenant_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@company.com"
}
```

**Note**: Requires `tenant:update` permission

---

### Delete Tenant
```http
DELETE /api/tenants/{tenant_id}
Authorization: Bearer <token>
```

**Note**: Requires `tenant:delete` permission

---

## Tenant Members Endpoints

### Invite User to Tenant
```http
POST /api/tenants/{tenant_id}/members?user_id={user_id}&role=admin
Authorization: Bearer <token>
```

**Query Parameters**:
- `user_id` (required) - UUID of user to invite
- `role` (optional) - Role to assign (default: "member")

**Note**: Requires `member:invite` permission

---

### List Tenant Members
```http
GET /api/tenants/{tenant_id}/members
Authorization: Bearer <token>
```

**Response**: Array of `TenantUserResponse` with user info

---

### Get Tenant Member
```http
GET /api/tenants/{tenant_id}/members/{user_id}
Authorization: Bearer <token>
```

---

### Update Tenant Member
```http
PATCH /api/tenants/{tenant_id}/members/{user_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin",
  "is_active": true,
  "permissions": { ... }
}
```

**Note**: Requires `member:update` permission and role hierarchy check

---

### Remove Tenant Member
```http
DELETE /api/tenants/{tenant_id}/members/{user_id}
Authorization: Bearer <token>
```

**Note**: Requires `member:remove` permission

---

## Data Models

### User
```typescript
interface User {
  id: string;              // UUID
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_superuser: boolean;
  last_login_at?: string;  // ISO datetime
  created_at: string;      // ISO datetime
  updated_at: string;      // ISO datetime
}
```

### Tenant
```typescript
interface Tenant {
  id: string;              // UUID
  name: string;
  slug: string;
  domain?: string;
  email: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_tier?: string;
  created_at: string;      // ISO datetime
  updated_at: string;      // ISO datetime
}
```

### TenantUser
```typescript
interface TenantUser {
  id: string;              // UUID
  tenant_id: string;       // UUID
  user_id: string;         // UUID
  role: string;            // "owner" | "admin" | "editor" | "member" | "viewer"
  is_active: boolean;
  permissions?: object;    // JSON object
  effective_permissions?: string[]; // Derived role + custom permissions
  invited_by?: string;     // UUID
  invited_at?: string;     // ISO datetime
  joined_at: string;       // ISO datetime
  created_at: string;      // ISO datetime
  updated_at: string;       // ISO datetime
}
```

### TokenResponse
```typescript
interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
  tenant_id?: string;      // UUID, if in tenant context
  role?: string;           // Role in tenant, if in tenant context
}
```

---

## Roles & Permissions

### Role Hierarchy
```
owner > admin > editor > member > viewer
```

### Default Permissions by Role

**Owner**: All permissions
**Admin**: Most permissions (cannot manage owners)
**Editor**: ROPA read/write
**Member**: Read/write on resources
**Viewer**: Read-only

**Note**: Client access checks should use `effective_permissions` from membership payloads
instead of hard-coded role checks, so UI gates match backend RBAC.

### Common Permissions
- `tenant:read`, `tenant:write`, `tenant:settings`, `tenant:delete`
- `member:invite`, `member:read`, `member:update`, `member:remove`
- `resource:read`, `resource:write`, `resource:delete`

---

## Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Frontend Integration Tips

### 1. Token Storage
Store JWT token in:
- **LocalStorage** (simple, but XSS vulnerable)
- **HttpOnly Cookie** (more secure, requires backend support)
- **Memory** (most secure, but lost on refresh)

### 2. Token Refresh
- Tokens expire in 30 minutes (configurable)
- Use `/api/auth/refresh` before expiration
- Handle 401 errors by redirecting to login

### 3. Tenant Context
- Include `tenant_id` in login/refresh to get tenant context
- Store current tenant ID in state
- Switch tenants via refresh endpoint

### 4. Error Handling
```typescript
try {
  const response = await fetch('/api/tenants', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
} catch (error) {
  // Handle error
}
```

### 5. Request Interceptor (Example)
```typescript
// Add token to all requests
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Testing Endpoints

Use the interactive API docs:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

---

## CORS Configuration

CORS is configured for:
- `https://yourdomain.com`
- `http://localhost:3000` (development)
- `http://localhost:5173` (Vite dev server)

Update `CORS_ORIGINS` in `.env` for custom origins.

---

## Next Steps

1. Set up API client (axios, fetch, etc.)
2. Implement authentication flow
3. Add token refresh logic
4. Handle tenant context switching
5. Implement error handling
6. Add loading states

See `ARCHITECTURE.md` for detailed backend architecture.











