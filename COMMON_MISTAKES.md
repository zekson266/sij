# Common Mistakes Catalog

**Purpose**: Document mistakes AI agents commonly make and how to prevent them
**Last Updated**: 2026-01-13
**Status**: Living document - update when new mistakes are found

---

## How to Use This Document

When AI agent makes a mistake:
1. Document it here with ❌/✅ examples
2. Add to `.cursorrules` if critical
3. Add to relevant pattern file
4. Update checklists

---

## Frontend Mistakes

### Mistake 1: useEffect Dependency Array with Objects

**❌ WRONG**:
```typescript
React.useEffect(() => {
  reset({
    name: tenant.name,
    email: tenant.email,
  });
}, [tenant, reset]); // ❌ Resets form while user is typing
```

**✅ CORRECT**:
```typescript
React.useEffect(() => {
  reset({
    name: tenant.name,
    email: tenant.email,
  });
}, [tenant?.id, reset]); // ✅ Only resets when switching to different tenant
```

**WHY IT HAPPENS**: 
- Object references change on every render
- React sees `tenant` as "changed" even if values are the same
- Form resets while user is typing, overwriting their input

**HOW TO PREVENT**:
- Always use primitive IDs in dependency arrays when resetting forms
- Use `[entity?.id, reset]` NOT `[entity, reset]`
- Add comment: `// Only reset when entity ID changes, not when object reference changes`

**Reference**: `frontend/REACT_HOOKS_GUIDELINES.md`  
**Examples in Codebase**: 
- ✅ `frontend/src/pages/tenants/components/TenantSettingsTab.tsx` (line 93)
- ✅ `frontend/src/pages/tenants/components/TenantDetailsTab.tsx` (line 68)

---

### Mistake 2: Using Container Directly Instead of PageLayout

**❌ WRONG**:
```typescript
import { Container } from '@mui/material';

export default function MyPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Content */}
    </Container>
  );
}
```

**✅ CORRECT**:
```typescript
import { PageLayout } from '@/components/layout';

export default function MyPage() {
  return (
    <PageLayout maxWidth="md">
      {/* Content */}
    </PageLayout>
  );
}
```

**WHY IT HAPPENS**:
- AI sees Container in Material-UI docs
- Doesn't know about PageLayout wrapper
- Creates inconsistent spacing

**HOW TO PREVENT**:
- Always use `PageLayout` component, never `Container` directly
- Check `frontend/LAYOUT_GUIDELINES.md` before creating pages
- PageLayout handles spacing automatically

**Reference**: `frontend/LAYOUT_GUIDELINES.md`

---

### Mistake 3: Wrong maxWidth Values

**❌ WRONG**:
```typescript
<PageLayout maxWidth="lg">  // ❌ Too wide, inconsistent
<PageLayout maxWidth="sm">  // ❌ Too narrow for main pages
```

**✅ CORRECT**:
```typescript
<PageLayout maxWidth="md">  // ✅ Standard for main pages (960px)
<PageLayout maxWidth="xs">  // ✅ Only for auth pages (Login, Register)
```

**WHY IT HAPPENS**:
- AI doesn't know standard maxWidth values
- Uses arbitrary values from Material-UI docs
- Creates inconsistent page widths

**HOW TO PREVENT**:
- Use `maxWidth="md"` for all main pages
- Use `maxWidth="xs"` ONLY for auth pages
- NEVER use `maxWidth="lg"` in page files
- Check `frontend/LAYOUT_GUIDELINES.md`

**Reference**: `frontend/LAYOUT_GUIDELINES.md`

---

### Mistake 4: Nested maxWidth Constraints

**❌ WRONG**:
```typescript
<PageLayout maxWidth="md">
  <Paper sx={{ maxWidth: 600 }}>  // ❌ Nested constraint
    {/* Content */}
  </Paper>
</PageLayout>
```

**✅ CORRECT**:
```typescript
<PageLayout maxWidth="md">
  <Paper sx={{ p: 4 }}>  // ✅ Only padding, no width constraint
    {/* Content */}
  </Paper>
</PageLayout>
```

**WHY IT HAPPENS**:
- AI adds maxWidth to Paper/Card components
- Creates nested constraints
- Causes inconsistent widths

**HOW TO PREVENT**:
- PageLayout already handles width
- Don't add maxWidth to Paper/Card inside PageLayout
- Only use padding (`p: 4`) on Paper components

**Reference**: `frontend/LAYOUT_GUIDELINES.md`

---

### Mistake 5: Inconsistent Spacing

**❌ WRONG**:
```typescript
<Container sx={{ mt: 8, mb: 8 }}>  // ❌ Inconsistent
<Container sx={{ py: 4 }}>         // ❌ Different pattern
```

**✅ CORRECT**:
```typescript
<PageLayout maxWidth="md">  // ✅ Handles spacing automatically (mt: 4, mb: 4)
```

**WHY IT HAPPENS**:
- AI uses different spacing values
- Creates visual inconsistencies
- PageLayout handles this automatically

**HOW TO PREVENT**:
- Use PageLayout (handles spacing)
- Don't add custom spacing to Container/PageLayout
- Use consistent padding on Paper (`p: 4`)

**Reference**: `frontend/LAYOUT_GUIDELINES.md`

---

### Mistake 6: Not Verifying Build After Changes

**❌ WRONG**:
```typescript
// Make changes
// Don't verify build
// Commit code
// Build fails in production
```

**✅ CORRECT**:
```typescript
// Make changes
cd frontend && npm run build  // ✅ Verify build
// Fix any errors
// Then commit
```

**WHY IT HAPPENS**:
- AI assumes build will succeed
- Doesn't verify after changes
- TypeScript errors go unnoticed

**HOW TO PREVENT**:
- ALWAYS run `npm run build` after frontend changes
- Check for TypeScript errors
- Fix errors before committing
- See `.ai-instructions.md` for build verification

**Reference**: `.ai-instructions.md`

---

### Mistake 7: Not Following Existing API Service Patterns

**❌ WRONG**:
```typescript
// Create new API service without checking existing patterns
export async function getData() {
  const response = await fetch('/api/data');
  return response.json();
}
```

**✅ CORRECT**:
```typescript
// Follow existing pattern from api.ts
import { apiGet } from '@/services/api';

export async function getData() {
  return apiGet<DataResponse>('/api/data');
}
```

**WHY IT HAPPENS**:
- AI doesn't check existing patterns
- Creates inconsistent API calls
- Doesn't use centralized error handling

**HOW TO PREVENT**:
- Check existing API services (`frontend/src/services/`)
- Use `apiGet`, `apiPost`, `apiPatch` from `api.ts`
- Follow existing patterns
- Check `frontend/API_PATTERNS.md` (when created)

---

### Mistake 8: Direct Function Calls in JSX with Async State Updates

**❌ WRONG**:
```typescript
// In form dialog JSX
<FormFieldWithSuggestion
  jobStatus={suggestionJob.getJobStatus('name')}  // ❌ May not trigger re-render
  // ...
/>

// In hook
const getJobStatus = React.useCallback(
  (fieldName: string) => {
    return jobStatuses.get(fieldName) || null;
  },
  [jobStatuses]
);
```

**Problem**: When `jobStatuses` (a `Map`) updates asynchronously via polling, React may not detect the change when `getJobStatus()` is called directly in JSX, causing components to not re-render when suggestions complete.

**✅ CORRECT**:
```typescript
// In hook - add version counter
const [jobStatusesVersion, setJobStatusesVersion] = React.useState(0);

// Increment on every jobStatuses update
setJobStatusesVersion(prev => prev + 1);

// Return version in hook
return {
  getJobStatus,
  jobStatusesVersion, // ✅ Version counter for dependencies
};

// In form dialog - use useMemo
const nameJobStatus = React.useMemo(
  () => suggestionJob.getJobStatus('name'),
  [suggestionJob, suggestionJob.jobStatusesVersion] // ✅ React tracks version changes
);

// In JSX
<FormFieldWithSuggestion
  jobStatus={nameJobStatus}  // ✅ Memoized value triggers re-renders
  // ...
/>
```

**WHY IT HAPPENS**:
- Async state updates (polling) may not trigger re-renders when functions are called directly in JSX
- React doesn't track `Map` changes reliably when accessed via function calls
- Component may render with stale data even though state updated

**HOW TO PREVENT**:
- Use `useMemo` for derived state from async updates
- Add version counter that increments on state changes
- Use version counter as dependency in `useMemo`
- Never call state accessor functions directly in JSX for async state

**Reference**: `ROPA_AI_SUGGESTIONS.md` - "State Management & Performance Optimizations"  
**Examples in Codebase**: 
- ✅ `frontend/src/modules/ropa/hooks/useSuggestionJob.ts` (version counter)
- ✅ `frontend/src/modules/ropa/components/RepositoryFormDialog.tsx` (useMemo usage)

---

### Mistake 9: Hardcoding Values Instead of Using Config

**❌ WRONG**:
```typescript
const API_URL = 'http://localhost:8000/api';
const MAX_RETRIES = 3;
```

**✅ CORRECT**:
```typescript
import { API_BASE_URL } from '@/config';
// Or use environment variables
const MAX_RETRIES = import.meta.env.VITE_MAX_RETRIES || 3;
```

**WHY IT HAPPENS**:
- AI hardcodes values for simplicity
- Creates maintenance issues
- Doesn't use environment configuration

**HOW TO PREVENT**:
- Always use environment variables or config
- Check existing config files
- Never hardcode URLs, keys, or limits

---

## Backend Mistakes

### Mistake 18: Ignoring Path Parameters in Tenant Context Resolution

**❌ WRONG**:
```python
def get_tenant_context(
    request: Request,
    db: Session,
    token_data: Optional[TokenData] = None,
    tenant_slug: Optional[str] = None,  # ❌ Only checks slug, not tenant_id
) -> Optional[Tenant]:
    # Only checks tenant_slug, JWT token, headers, domain
    # ❌ Ignores tenant_id in URL path even when it's available
    if tenant_slug:
        return TenantService.get_by_slug(db, tenant_slug)
    # ... rest of resolution
```

**✅ CORRECT**:
```python
def get_tenant_context(
    request: Request,
    db: Session,
    token_data: Optional[TokenData] = None,
    tenant_id: Optional[UUID] = None,  # ✅ Check tenant_id first
    tenant_slug: Optional[str] = None,
) -> Optional[Tenant]:
    # Priority 1: Path parameter tenant_id (highest priority)
    if tenant_id:
        return TenantService.get_by_id(db, tenant_id)
    # Priority 2: Path parameter tenant_slug
    if tenant_slug:
        return TenantService.get_by_slug(db, tenant_slug)
    # ... rest of resolution (token, headers, domain)
```

**WHY IT HAPPENS**:
- Path parameters are explicit in the URL but dependency doesn't check them
- Relying only on JWT tokens or headers which may not always include tenant context
- Not following RESTful best practices (path parameters should be primary source)

**HOW TO PREVENT**:
- Always check path parameters first when they're available in the URL
- FastAPI automatically injects path parameters into dependencies
- Priority order: Path params → JWT token → Headers → Domain
- Path parameters are explicit, type-safe, and easier to debug

**Example Route Pattern**:
```python
@router.get("/{tenant_id}/members")
def list_members(
    tenant_id: UUID,  # Path parameter
    tenant: Tenant = Depends(get_current_tenant),  # FastAPI auto-injects tenant_id
):
    # tenant is already resolved from tenant_id
    ...
```

**Reference**: `backend/app/utils/tenant_context.py`, `backend/app/dependencies.py`
**See Also**: `ARCHITECTURE.md` - Tenant Context Resolution Pattern

---

### Mistake 10: Using Lowercase `any` Instead of `Any` from typing

**❌ WRONG**:
```python
from pydantic import BaseModel, Field, model_validator

@model_validator(mode='before')
@classmethod
def allow_empty_name(cls, data: any) -> any:  # ❌ Wrong - lowercase 'any' is not a valid type
    return data
```

**✅ CORRECT**:
```python
from typing import Any, Dict
from pydantic import BaseModel, Field, model_validator

@model_validator(mode='before')
@classmethod
def allow_empty_name(cls, data: Any) -> Dict[str, Any] | Any:  # ✅ Correct - use Any from typing
    return data
```

**WHY IT HAPPENS**:
- Python's `any()` is a built-in function, not a type
- Lowercase `any` is not recognized as a type hint
- Type checkers (mypy, pyright) will fail
- IDE autocomplete won't work properly

**HOW TO PREVENT**:
- Always import `Any` from `typing`: `from typing import Any, Dict`
- Use `Any` (capitalized) for type hints
- Use `Dict[str, Any] | Any` for return types when data can be dict or other types

**Reference**: See `backend/app/modules/ropa/schemas/activity.py` for correct pattern

---

### Mistake 10: Code Duplication in Pydantic Validators

**❌ WRONG**:
```python
# Duplicated in 4 different files
@model_validator(mode='before')
@classmethod
def allow_empty_name(cls, data: Any) -> Dict[str, Any] | Any:
    if isinstance(data, dict) and 'name' in data:
        if data['name'] == '' or (isinstance(data['name'], str) and data['name'].strip() == ''):
            data['name'] = ' '
    return data
```

**✅ CORRECT**:
```python
# In schemas/validators.py (shared utility)
def convert_empty_string_to_space(data: Any, field_name: str) -> Dict[str, Any] | Any:
    """Convert empty strings to single space before validation."""
    if isinstance(data, dict) and field_name in data:
        field_value = data[field_name]
        if field_value == '' or (isinstance(field_value, str) and field_value.strip() == ''):
            data[field_name] = ' '
    return data

# In each schema file
from .validators import convert_empty_string_to_space

@model_validator(mode='before')
@classmethod
def allow_empty_name(cls, data: Any) -> Dict[str, Any] | Any:
    return convert_empty_string_to_space(data, 'name')
```

**WHY IT HAPPENS**:
- Copy-paste pattern when creating similar schemas
- Not thinking about code reuse
- Maintenance burden when logic needs to change

**HOW TO PREVENT**:
- Extract common validator logic to shared utilities
- Create `schemas/validators.py` for shared validator functions
- Import and reuse instead of duplicating

**Reference**: See `backend/app/modules/ropa/schemas/validators.py` for pattern

---

### Mistake 11: Business Logic in Routers Instead of Services

**❌ WRONG**:
```python
@router.post("/tenants")
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    # ❌ Business logic in router
    if db.query(Tenant).filter(Tenant.slug == data.slug).first():
        raise HTTPException(409, "Slug exists")
    tenant = Tenant(**data.dict())
    db.add(tenant)
    db.commit()
    return tenant
```

**✅ CORRECT**:
```python
@router.post("/tenants")
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    # ✅ Business logic in service
    tenant = TenantService.create(db=db, tenant_data=data)
    return tenant
```

**WHY IT HAPPENS**:
- AI puts logic directly in router
- Violates service layer pattern
- Makes code harder to test and reuse

**HOW TO PREVENT**:
- All business logic goes in services
- Routers are thin - just call services
- Check existing services for patterns
- Check `backend/SERVICE_PATTERNS.md` (when created)

**Reference**: `ARCHITECTURE.md` - Service Layer Pattern

---

### Mistake 10: Not Using Dependency Injection for Database

**❌ WRONG**:
```python
@router.get("/tenants")
def list_tenants():
    # ❌ Direct database access
    db = SessionLocal()
    tenants = db.query(Tenant).all()
    return tenants
```

**✅ CORRECT**:
```python
@router.get("/tenants")
def list_tenants(db: Session = Depends(get_db)):
    # ✅ Dependency injection
    tenants = db.query(Tenant).all()
    return tenants
```

**WHY IT HAPPENS**:
- AI doesn't understand dependency injection
- Creates database sessions manually
- Doesn't follow FastAPI patterns

**HOW TO PREVENT**:
- Always use `db: Session = Depends(get_db)`
- Never create sessions manually
- Check existing routers for pattern

**Reference**: `ARCHITECTURE.md` - Dependency Injection

---

### Mistake 11: Creating Local Notification State Instead of Using Centralized System

**❌ WRONG**:
```typescript
// Creating local Alert/Snackbar state in every component
const [error, setError] = React.useState<string | null>(null);
const [success, setSuccess] = React.useState<string | null>(null);

return (
  <Box>
    {error && <Alert severity="error">{error}</Alert>}
    {success && <Alert severity="success">{success}</Alert>}
    {/* Content */}
  </Box>
);
```

**✅ CORRECT**:
```typescript
// Use centralized notification system
import { useNotification } from '../../../contexts';

export default function MyComponent() {
  const { showSuccess, showError } = useNotification();

  const handleSave = async (data: FormData) => {
    try {
      await updateResource(id, data);
      showSuccess('Resource updated successfully!');
    } catch (err: any) {
      showError(err?.message || 'Failed to update resource');
    }
  };

  return (
    <Box>
      {/* No Alert components needed - notifications handled centrally */}
    </Box>
  );
}
```

**WHY IT HAPPENS**:
- AI creates local state for each component
- Doesn't know about centralized notification system
- Creates inconsistent notification behavior
- Duplicates code across components

**HOW TO PREVENT**:
- ALWAYS use `useNotification()` hook from `'../../../contexts'`
- NEVER create local `error`/`success` state with Alert components
- Use `showSuccess()`, `showError()`, `showWarning()`, `showInfo()` methods
- Check `frontend/COMPONENT_PATTERNS.md` - Notification Pattern
- See examples: TenantSettingsTab, TenantDetailsTab, TenantMembersTab, BookingForm

**Reference**: `frontend/COMPONENT_PATTERNS.md` - Notification Pattern  
**Examples in Codebase**: 
- ✅ `frontend/src/pages/tenants/components/TenantSettingsTab.tsx`
- ✅ `frontend/src/pages/tenants/components/TenantDetailsTab.tsx`
- ✅ `frontend/src/pages/tenants/components/TenantMembersTab.tsx`
- ✅ `frontend/src/components/booking/BookingForm.tsx`

---

### Mistake 12: Using .toISOString() for Date-Only Fields

**❌ WRONG**:
```typescript
// Creating appointment with dayjs date
const appointmentDate = data.date.toISOString();
// Result for UTC+10 timezone: "2025-01-14T14:00:00.000Z"
// User selected Jan 15, but got Jan 14 due to timezone conversion!

const appointmentData: AppointmentCreate = {
  service_type: data.service_type,
  appointment_date: appointmentDate,  // ❌ Wrong date!
  appointment_time: data.timeSlot,
};
```

**✅ CORRECT**:
```typescript
// Creating appointment with dayjs date
const appointmentDate = data.date.format('YYYY-MM-DD');
// Result for any timezone: "2025-01-15"
// Correct date, no timezone conversion

const appointmentData: AppointmentCreate = {
  service_type: data.service_type,
  appointment_date: appointmentDate,  // ✅ Correct date!
  appointment_time: data.timeSlot,
};
```

**WHY IT HAPPENS**:
- `.toISOString()` converts local midnight to UTC timestamp
- For UTC+ timezones (e.g., UTC+10), this shifts the date backwards
- User in Australia selects "Jan 15" → becomes "2025-01-14T14:00:00.000Z" → stored as Jan 14
- Creates booking conflicts: user sees availability but gets "already booked" error
- Different users in different timezones see different availability for same slots

**REAL-WORLD IMPACT**:
- User in Europe saw time slot as available
- Clicked to book, got "already booked" error
- Root cause: Date shifted due to timezone conversion
- Bug affected all users in UTC+ timezones

**HOW TO PREVENT**:
- NEVER use `.toISOString()` for date-only fields (appointments, birthdays, etc.)
- ALWAYS use `.format('YYYY-MM-DD')` for plain date strings
- Database stores as DATE type (timezone-agnostic)
- Backend validates dates in tenant's timezone using `_get_tenant_today()`
- Frontend sends plain date strings like "2025-01-15"

**WHERE THIS APPLIES**:
- All appointment/booking date serialization
- Any date-only field (birthdays, deadlines, events)
- Calendar date pickers
- Date range filters

**Reference**: See CLAUDE.md - Timezone Handling section
**Examples in Codebase**:
- ✅ `frontend/src/services/bookingApi.ts` (line 27) - createAppointment
- ✅ `frontend/src/services/bookingApi.ts` (line 220) - rescheduleAppointment
- ✅ `frontend/src/services/bookingApi.ts` (line 141, 162) - date queries

---

### Mistake 13: React Closure Issues with useCallback

**❌ WRONG**:
```typescript
// In hook
const [jobStatuses, setJobStatuses] = React.useState<Map<string, JobStatus>>(new Map());

const restoreJobs = React.useCallback(async () => {
  // ❌ jobStatuses is NOT in dependency array
  // Closure captures initial empty Map
  const currentJob = jobStatuses.get(fieldName); // Always sees empty Map!
  
  // Fetches jobs from API
  const apiJobs = await fetchJobsFromAPI();
  
  // Overwrites newly created jobs with old API jobs
  // because currentJob is always null (stale closure)
  if (!currentJob) {
    setJobStatuses(apiJobs); // ❌ Overwrites new jobs!
  }
}, [entityId]); // ❌ Missing jobStatuses in deps
```

**Problem**: When `restoreJobs` is called, it always sees an empty `jobStatuses` Map because the closure captured the initial state. This causes it to overwrite newly created jobs with old jobs from the API, causing flickering/blinking UI.

**✅ CORRECT**:
```typescript
// In hook - add ref to track current state
const [jobStatuses, setJobStatuses] = React.useState<Map<string, JobStatus>>(new Map());
const jobStatusesRef = React.useRef<Map<string, JobStatus>>(new Map());

// Update ref whenever state changes
setJobStatuses((prev) => {
  const next = new Map(prev);
  next.set(fieldName, status);
  jobStatusesRef.current = next; // ✅ Update ref
  return next;
});

// Use ref in callback (no dependency needed)
const restoreJobs = React.useCallback(async () => {
  // ✅ Use ref to get current value
  const currentJob = jobStatusesRef.current.get(fieldName);
  
  const apiJobs = await fetchJobsFromAPI();
  
  // Compare timestamps to prevent overwriting newer jobs
  if (currentJob) {
    const currentJobCreatedAt = new Date(currentJob.created_at);
    const apiJobCreatedAt = new Date(apiJob.created_at);
    if (currentJobCreatedAt > apiJobCreatedAt) {
      // ✅ Keep newer job from state
      return;
    }
  }
  
  setJobStatuses(apiJobs);
}, [entityId]); // ✅ No jobStatuses in deps - we use ref instead
```

**WHY IT HAPPENS**:
- `useCallback` creates a closure that captures state values at creation time
- If state isn't in the dependency array, the closure always sees the initial value
- When the callback runs later, it uses stale values from the closure
- This causes race conditions and state overwrites

**HOW TO PREVENT**:
- **Use refs for current values in callbacks**: When a callback needs current state but shouldn't re-create when state changes, use a ref that's updated on every state change
- **Update refs in state setters**: Always update the ref when setting state: `ref.current = newValue`
- **Compare timestamps for async operations**: When restoring state from API, compare `created_at` timestamps to ensure newer state isn't overwritten
- **Don't add state to deps if using ref**: If using a ref to access current state, don't add the state to the dependency array (would cause unnecessary re-creations)

**Reference**: 
- `ROPA_AI_SUGGESTIONS.md` - "State Management & Performance Optimizations" section
- `.ai-instructions.md` - "React State Management with Async Updates" section
- `frontend/src/modules/ropa/hooks/useSuggestionJob.ts` - Example implementation

---

### Mistake 14: useEffect with Object References in Dependencies

**❌ WRONG**:
```typescript
const suggestionJob = useSuggestionJob({ /* ... */ });

React.useEffect(() => {
  if (open && repository?.id) {
    suggestionJob.restoreJobs();
  }
}, [open, repository?.id, suggestionJob]); // ❌ suggestionJob object changes on every render
```

**✅ CORRECT**:
```typescript
const suggestionJob = useSuggestionJob({ /* ... */ });
const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
restoreJobsRef.current = suggestionJob.restoreJobs;

React.useEffect(() => {
  if (open && repository?.id && restoreJobsRef.current) {
    restoreJobsRef.current();
  }
}, [open, repository?.id]); // ✅ Only depends on primitives
```

**WHY IT HAPPENS**:
- Hooks that return objects create new object references on every render
- React sees the object as "changed" even if the values inside are the same
- This causes `useEffect` to re-run unnecessarily
- In the case of `restoreJobs`, this causes it to be called after `createJob` completes, leading to flickering

**HOW TO PREVENT**:
- **Use refs for function references**: Store memoized functions in refs to avoid dependency issues
- **Only depend on primitives**: Use primitive values (strings, numbers, booleans) in dependency arrays
- **Use stable references**: If you need to depend on a function, ensure it's memoized with `useCallback` and use a ref to access it
- **Pattern for hooks returning objects**: When a hook returns an object with functions, use refs to access the functions in `useEffect`:

```typescript
// Pattern: Hook returns object with functions
const hookResult = useSomeHook();
const functionRef = React.useRef(hookResult.someFunction);
functionRef.current = hookResult.someFunction; // Update ref on each render

React.useEffect(() => {
  functionRef.current?.(); // Use ref, not object
}, [primitiveDependency]); // Only depend on primitives
```

**Reference**: 
- `ROPA_AI_SUGGESTIONS.md` - "useEffect Dependency Fix (2026-01-13)" section
- `.ai-instructions.md` - "useEffect Dependency Best Practices" section
- `frontend/src/modules/ropa/components/RepositoryFormDialog.tsx` - Example implementation

---

## Prevention Checklist

Before committing code, check:

- [ ] No `[entity, reset]` in useEffect (use `[entity?.id, reset]`)
- [ ] Using PageLayout, not Container directly
- [ ] maxWidth="md" for main pages (or "xs" for auth)
- [ ] No nested maxWidth constraints
- [ ] Build succeeds (`npm run build`)
- [ ] Following existing API service patterns
- [ ] No hardcoded values (use config/env)
- [ ] Business logic in services, not routers
- [ ] Using dependency injection for database
- [ ] Using centralized notifications (useNotification hook, not local Alert state)
- [ ] Using `.format('YYYY-MM-DD')` for dates, NOT `.toISOString()`
- [ ] Using refs for current state values in useCallback (not closures)
- [ ] No object references in useEffect dependencies (use refs for function references)
- [ ] Tenant context resolution checks path parameters first (tenant_id in URL)

---

## How to Add New Mistakes

When you find a new mistake:

1. **Document it here**:
   - ❌ Wrong example
   - ✅ Correct example
   - WHY it happens
   - HOW to prevent

2. **Update AI files**:
   - Add to `.cursorrules` if critical
   - Add to `.ai-instructions.md` checklists

3. **Update patterns**:
   - Add to relevant pattern file
   - Update examples

4. **Update this document**:
   - Add to appropriate section
   - Keep format consistent

---

**Last Updated**: 2026-01-24
**Total Mistakes Documented**: 18







