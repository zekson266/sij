# Frontend API Service Patterns

**Purpose**: Show AI agents correct patterns for API services
**Last Updated**: 2025-12-28
**Status**: Living document - update when patterns change

---

## API Service Structure Pattern

### ✅ CORRECT

```typescript
/**
 * MyResource API service.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import type { MyResource } from '../types';

/**
 * Get resource by ID.
 */
export async function getResourceById(id: string): Promise<MyResource> {
  return apiGet<MyResource>(`/api/resources/${id}`);
}

/**
 * List resources.
 */
export async function listResources(params?: {
  skip?: number;
  limit?: number;
}): Promise<MyResource[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip) queryParams.append('skip', params.skip.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  const url = `/api/resources${query ? `?${query}` : ''}`;
  
  return apiGet<MyResource[]>(url);
}

/**
 * Create resource.
 */
export async function createResource(data: {
  name: string;
  description?: string;
}): Promise<MyResource> {
  return apiPost<MyResource>('/api/resources', data);
}

/**
 * Update resource.
 */
export async function updateResource(
  id: string,
  data: Partial<MyResource>
): Promise<MyResource> {
  return apiPatch<MyResource>(`/api/resources/${id}`, data);
}

/**
 * Delete resource.
 */
export async function deleteResource(id: string): Promise<void> {
  return apiDelete(`/api/resources/${id}`);
}
```

### ❌ INCORRECT

```typescript
// ❌ WRONG: Direct fetch, no error handling, no type safety
export async function getResource(id: string) {
  const response = await fetch(`/api/resources/${id}`);
  return response.json();
}
```

### WHY

- **apiGet/apiPost/etc** handle authentication automatically
- **Type safety** with TypeScript generics
- **Error handling** centralized in `api.ts`
- **Consistent pattern** across all API services

**Reference**: `frontend/src/services/api.ts`  
**Examples**: 
- ✅ `frontend/src/services/tenantApi.ts`
- ✅ `frontend/src/services/authApi.ts`
- ✅ `frontend/src/services/bookingApi.ts`

---

## Using API Services in Components

### ✅ CORRECT

```typescript
import * as React from 'react';
import { getResourceById, updateResource } from '@/services/resourceApi';
import type { Resource } from '@/types';

export default function ResourcePage({ id }: { id: string }) {
  const [resource, setResource] = React.useState<Resource | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchResource = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getResourceById(id);
        setResource(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResource();
  }, [id]);

  const handleUpdate = async (data: Partial<Resource>) => {
    try {
      setError(null);
      const updated = await updateResource(id, data);
      setResource(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  // ... render
}
```

### ❌ INCORRECT

```typescript
// ❌ WRONG: Direct fetch, no error handling, no loading state
const [resource, setResource] = React.useState(null);

React.useEffect(() => {
  fetch(`/api/resources/${id}`)
    .then(res => res.json())
    .then(data => setResource(data));
}, [id]);
```

### WHY

- **Error handling** shows user-friendly messages
- **Loading state** prevents layout shift
- **Type safety** catches errors at compile time
- **Consistent pattern** across components

---

## Optional Authentication Pattern

### ✅ CORRECT

```typescript
/**
 * Get public resource (works with or without authentication).
 */
export async function getPublicResource(slug: string): Promise<PublicResource> {
  return apiGet<PublicResource>(`/api/resources/slug/${slug}/public`, {
    requireAuth: true, // Send token if available (endpoint accepts optional auth)
  });
}
```

### WHY

- **requireAuth: true** sends token if available
- Backend can enhance response for authenticated users
- Works for both authenticated and unauthenticated users

**Example**: `frontend/src/services/tenantApi.ts` - `getTenantPublicInfo`

---

## Error Handling Pattern

### ✅ CORRECT

```typescript
try {
  const data = await getResourceById(id);
  setResource(data);
} catch (err) {
  // apiGet throws ApiError with message
  const errorMessage = err instanceof Error ? err.message : 'Failed to load';
  setError(errorMessage);
}
```

### WHY

- **apiGet** throws `ApiError` with user-friendly message
- **Error handling** shows message to user
- **Type safety** with instanceof check

---

## Query Parameters Pattern

### ✅ CORRECT

```typescript
export async function listResources(params?: {
  skip?: number;
  limit?: number;
  filter?: string;
}): Promise<Resource[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip) queryParams.append('skip', params.skip.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.filter) queryParams.append('filter', params.filter);
  
  const query = queryParams.toString();
  const url = `/api/resources${query ? `?${query}` : ''}`;
  
  return apiGet<Resource[]>(url);
}
```

### WHY

- **URLSearchParams** handles encoding automatically
- **Conditional appending** only adds non-empty params
- **Clean URL** construction

---

## API Service Checklist

Before creating a new API service:

- [ ] Uses `apiGet`, `apiPost`, `apiPatch`, `apiDelete` from `api.ts`
- [ ] Includes TypeScript types for request/response
- [ ] Includes JSDoc comments
- [ ] Follows existing service structure
- [ ] Handles query parameters correctly
- [ ] Uses `requireAuth: true` for optional auth endpoints
- [ ] Matches backend API endpoint structure
- [ ] Uses `.format('YYYY-MM-DD')` for date-only fields, NOT `.toISOString()`

---

## Date Serialization Pattern

### ✅ CORRECT

```typescript
import { apiPost } from './api';
import type { Appointment, AppointmentCreate } from '../types';
import type { Dayjs } from 'dayjs';

/**
 * Create appointment with date-only field.
 */
export async function createAppointment(
  tenantId: string,
  data: {
    service_type: string;
    date: Dayjs;
    timeSlot: string;
    notes?: string;
  }
): Promise<Appointment> {
  // ✅ Use .format() for date-only fields (timezone-agnostic)
  const appointmentDate = data.date.format('YYYY-MM-DD');

  const appointmentData: AppointmentCreate = {
    service_type: data.service_type,
    appointment_date: appointmentDate,  // Plain date string "YYYY-MM-DD"
    appointment_time: data.timeSlot,
    notes: data.notes,
  };

  return apiPost<Appointment>(`/api/tenants/${tenantId}/appointments`, appointmentData);
}
```

### ❌ INCORRECT

```typescript
// ❌ WRONG: .toISOString() converts to UTC, causing date shifts
const appointmentDate = data.date.toISOString();
// User in UTC+10 selects "Jan 15"
// Result: "2025-01-14T14:00:00.000Z"
// Stored as Jan 14 ← WRONG DATE!

// ❌ WRONG: .startOf('day').toISOString() still has timezone conversion
const appointmentDate = data.date.startOf('day').toISOString();
```

### WHY

- **`.toISOString()`** converts local midnight to UTC timestamp
- **UTC+ timezones** (Asia, Australia) shift date backwards
- **Creates booking conflicts** - users see different availability
- **Database stores DATE type** - should receive plain "YYYY-MM-DD" string

### WHEN TO USE

- Appointment dates
- Event dates
- Birthdays
- Deadlines
- Any date-only field (not datetime)

**Reference**: See COMMON_MISTAKES.md - Mistake #12
**Live Examples**: `frontend/src/services/bookingApi.ts`

---

**Last Updated**: 2025-12-28




















