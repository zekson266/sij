# ROPA Interface - Architecture, Patterns & Documentation

**Date:** 2026-01-11  
**Purpose:** Comprehensive overview of ROPA module architecture, patterns, and documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Hierarchy](#entity-hierarchy)
3. [Architecture](#architecture)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Key Patterns](#key-patterns)
7. [AI Suggestions System](#ai-suggestions-system)
8. [Documentation Files](#documentation-files)
9. [Implementation Status](#implementation-status)

---

## Overview

The ROPA (Record of Processing Activities) module is a GDPR compliance tool that helps organizations document their data processing activities. It implements a hierarchical structure of entities that must be documented according to GDPR Article 30.

### Key Features
- ✅ Hierarchical entity management (Repository → Activity → DataElement/DPIA → Risk)
- ✅ Comprehensive form dialogs with validation
- ✅ AI-powered field suggestions (OpenAI integration)
- ✅ Tenant isolation and RBAC permissions
- ✅ Tree view interface for navigation
- ✅ Details panel for viewing entity information

---

## Entity Hierarchy

```
Repository (root - tenant-scoped)
  └── Activity (repository-scoped)
      ├── DataElement (activity-scoped)
      └── DPIA (activity-scoped)
          └── Risk (dpia-scoped)
```

### Entity Details

| Entity | Fields | Parent | Scope |
|--------|--------|--------|-------|
| **Repository** | ~45 fields | Tenant | Direct tenant_id |
| **Activity** | 4-8 fields | Repository | Through repository |
| **DataElement** | 3-6 fields | Activity | Through activity → repository |
| **DPIA** | 3-4 fields | Activity | Through activity → repository |
| **Risk** | 5 fields | DPIA | Through dpia → activity → repository |

---

## Architecture

### Module Structure

```
backend/app/modules/ropa/
├── __init__.py
├── enums.py                    # Enum definitions
├── metadata.py                 # Field metadata for AI suggestions
├── routers.py                  # FastAPI routes
├── tasks.py                    # Celery tasks for AI suggestions
├── models/
│   ├── repository.py          # Repository model (~45 fields)
│   ├── activity.py            # Activity model
│   ├── data_element.py        # DataElement model
│   ├── dpia.py                # DPIA model
│   ├── risk.py                # Risk model
│   └── ai_suggestion_job.py   # AI suggestion job tracking
├── schemas/
│   ├── repository.py          # Pydantic schemas
│   ├── activity.py
│   ├── data_element.py
│   ├── dpia.py
│   ├── risk.py
│   ├── suggestion_job.py
│   └── validators.py          # Shared validators
└── services/
    ├── repository.py          # Business logic
    ├── activity.py
    ├── data_element.py
    ├── dpia.py
    ├── risk.py
    ├── suggestion_job.py     # AI job management
    └── context_builder.py    # Builds AI context from hierarchy

frontend/src/modules/ropa/
├── components/
│   ├── RepositoryFormDialog.tsx    # Large form (~2000 lines, ~45 fields)
│   ├── ActivityFormDialog.tsx      # Simple form (4 fields)
│   ├── DataElementFormDialog.tsx   # Simple form (3 fields)
│   ├── DPIAFormDialog.tsx          # Simple form (3 fields)
│   ├── RiskFormDialog.tsx          # Simple form (5 fields)
│   ├── FormFieldWithSuggestion.tsx # AI suggestion wrapper
│   ├── SuggestButton.tsx           # AI suggestion trigger
│   ├── SuggestionDisplay.tsx      # Display suggestions
│   └── ROPADetailsPanel.tsx        # Details view panel
├── hooks/
│   └── useSuggestionJob.ts         # AI suggestion job hook
├── pages/
│   └── ROPAPage.tsx                # Main page with tree view
├── schemas/
│   ├── repositorySchema.ts         # Zod validation
│   ├── activitySchema.ts
│   ├── dataElementSchema.ts
│   ├── dpiaSchema.ts
│   └── riskSchema.ts
├── services/
│   └── ropaApi.ts                  # API client
└── types/
    └── settings.ts
```

---

## Backend Architecture

### 1. Database Models

**Pattern:** SQLAlchemy models with UUID primary keys, tenant isolation, and cascade deletes.

**Key Features:**
- ✅ UUID primary keys for all entities
- ✅ Tenant isolation (direct or through parent chain)
- ✅ Timestamps (created_at, updated_at)
- ✅ Cascade deletes for parent-child relationships
- ✅ Custom `EnumValueType` for storing enum values (not names)
- ✅ JSONB fields for arrays (geographical_location_ids, access_location_ids, comments, etc.)
- ✅ Comprehensive indexes on foreign keys and frequently queried fields

**Example (Repository):**
```python
class Repository(Base):
    __tablename__ = "ropa_repositories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ~45 fields organized into logical sections
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    # ... more fields ...
    
    # Relationships
    activities = relationship("Activity", back_populates="repository", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
```

### 2. Service Layer

**Pattern:** Static methods with database session injection, tenant isolation checks, and custom exceptions.

**Key Features:**
- ✅ Static methods (no instance needed)
- ✅ Database session passed as parameter
- ✅ Tenant isolation enforced in all methods
- ✅ Custom exceptions (NotFoundError, ConflictError)
- ✅ Transaction management (commit/rollback)
- ✅ Refresh entity after commit to get updated data

**Example:**
```python
class RepositoryService:
    @staticmethod
    def create(db: Session, tenant_id: UUID, repository_data: RepositoryCreate) -> Repository:
        repository_dict = repository_data.model_dump(exclude_unset=True)
        repository_dict['tenant_id'] = tenant_id
        repository = Repository(**repository_dict)
        
        try:
            db.add(repository)
            db.commit()
            db.refresh(repository)
            return repository
        except IntegrityError as e:
            db.rollback()
            raise ConflictError(f"Failed to create repository: {str(e)}")
    
    @staticmethod
    def get_by_id(db: Session, repository_id: UUID, tenant_id: UUID) -> Repository:
        repository = db.query(Repository).filter(
            Repository.id == repository_id,
            Repository.tenant_id == tenant_id
        ).first()
        
        if not repository:
            raise NotFoundError(f"Repository with ID {repository_id} not found")
        return repository
```

### 3. Pydantic Schemas

**Pattern:** Base → Create → Update → Response schema hierarchy.

**Key Features:**
- ✅ `Base` schema for common fields
- ✅ `Create` schema extends Base, includes parent_id
- ✅ `Update` schema with all fields optional
- ✅ `Response` schema includes timestamps and relationships
- ✅ Field descriptions for API documentation
- ✅ Validation (min_length, max_length, etc.)
- ✅ JSON schema extras with examples and AI hints
- ✅ Empty string handling with `@model_validator(mode='before')` for Create schemas
- ✅ Shared validators in `schemas/validators.py`

**Example:**
```python
class RepositoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Repository name")
    description: Optional[str] = Field(None, description="Optional description")
    repository_type: Optional[RepositoryType] = Field(
        None,
        description="Type of data repository",
        json_schema_extra={
            "examples": ["database", "cloud_storage"],
            "aiHints": "Choose based on where data is stored."
        }
    )

class RepositoryCreate(RepositoryBase):
    pass  # Extends Base

class RepositoryUpdate(BaseModel):
    """All fields optional for updates."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

class RepositoryResponse(RepositoryBase):
    """Response includes read-only fields."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
```

### 4. API Routes

**Pattern:** RESTful routes with module enablement check, authentication, authorization, and error handling.

**Key Features:**
- ✅ Nested routes for child entities (e.g., `/repositories/{id}/activities`)
- ✅ Direct routes for individual operations (e.g., `/activities/{id}`)
- ✅ `require_module("ropa")` dependency for module enablement
- ✅ `get_current_user` dependency for authentication
- ✅ `_check_ropa_permission()` for RBAC authorization
- ✅ Consistent error handling (map service exceptions to HTTP exceptions)
- ✅ Response models for type safety

**Example:**
```python
@router.post(
    "/repositories",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_repository(
    tenant_id: UUID,
    repository_data: RepositoryCreate,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_ropa_permission(db, tenant_id, current_user, "ropa:create")
    
    try:
        repository = RepositoryService.create(db, tenant_id, repository_data)
        return repository
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
```

### 5. Tenant Isolation Pattern

**Hierarchy:**
- **Repository:** Direct `tenant_id` check
- **Activity:** Through repository (Activity → Repository → Tenant)
- **DataElement:** Through activity chain (DataElement → Activity → Repository → Tenant)
- **DPIA:** Through activity chain (DPIA → Activity → Repository → Tenant)
- **Risk:** Through dpia chain (Risk → DPIA → Activity → Repository → Tenant)

**Best Practices:**
- ✅ Always verify tenant in service methods
- ✅ Chain verification for child entities
- ✅ Fail fast with NotFoundError if tenant mismatch
- ✅ Never skip tenant checks

---

## Frontend Architecture

### 1. API Service

**Pattern:** Centralized API client using `apiGet`, `apiPost`, `apiPatch`, `apiDelete` from `services/api.ts`.

**Key Features:**
- ✅ TypeScript interfaces for all entities
- ✅ CRUD operations for all entities
- ✅ AI suggestion job endpoints
- ✅ Error handling with try/catch
- ✅ Type safety throughout

**Example:**
```typescript
export async function listRepositories(tenantId: string): Promise<Repository[]> {
  return apiGet<Repository[]>(`/api/tenants/${tenantId}/ropa/repositories`);
}

export async function createRepository(
  tenantId: string,
  data: RepositoryCreate
): Promise<Repository> {
  return apiPost<Repository>(`/api/tenants/${tenantId}/ropa/repositories`, data);
}
```

### 2. Form Components

**Pattern:** React Hook Form + Zod validation + Material-UI components.

**Key Features:**
- ✅ React Hook Form for form management
- ✅ Zod schemas for validation
- ✅ Material-UI Dialog with Accordion layout (for large forms)
- ✅ Conditional field handling
- ✅ Error handling with `handleApiErrors` utility
- ✅ Success notifications via `useNotification()` hook
- ✅ AI suggestion integration (for Repository and other entities)
- ✅ Responsive design (fullScreen on mobile)

**Form Structure:**
- **RepositoryFormDialog:** ~2000 lines, ~45 fields, 10 Accordion sections
- **ActivityFormDialog:** Simple form, 4 fields
- **DataElementFormDialog:** Simple form, 3 fields
- **DPIAFormDialog:** Simple form, 3 fields
- **RiskFormDialog:** Simple form, 5 fields

**Key Patterns:**
```typescript
// Form setup
const {
  control,
  handleSubmit,
  reset,
  watch,
  setValue,
  clearErrors,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: React.useMemo(() => {
    // Edit mode: populate from entity
    // Create mode: default values
  }, [entity?.id]), // ✅ Use entity?.id, not entity
});

// Conditional fields
const isCloudBased = watch('is_cloud_based');
React.useEffect(() => {
  if (!isCloudBased) {
    setValue('cloud_provider', undefined, { shouldValidate: false });
    clearErrors('cloud_provider');
  }
}, [isCloudBased, setValue, clearErrors]);

// Submit handler
const onSubmit = async (data: FormData) => {
  setIsSubmitting(true);
  try {
    if (entity) {
      await updateRepository(tenantId, entity.id, data);
    } else {
      await createRepository(tenantId, data);
    }
    showSuccess('Repository saved successfully');
    onSuccess?.();
    onClose();
  } catch (error) {
    handleApiErrors(error, setError, setGeneralError);
  } finally {
    setIsSubmitting(false);
  }
};
```

### 3. ROPA Page

**Pattern:** Tree view with details panel, form dialogs, and background data refresh.

**Key Features:**
- ✅ MUI X RichTreeView for hierarchical display
- ✅ Details panel for viewing selected entity
- ✅ Form dialogs for create/edit operations
- ✅ Background data refresh (no full-page spinner)
- ✅ Loading overlay in details panel during refresh
- ✅ Permission checking (owner/admin only)
- ✅ Error handling and loading states

**Data Flow:**
1. Fetch all repositories for tenant
2. For each repository → fetch activities
3. For each activity → fetch data elements and DPIAs (parallel)
4. For each DPIA → fetch risks
5. Build tree structure from hierarchical data
6. Display in tree view with icons and actions

**Tree Item Structure:**
```typescript
interface ROPATreeItem {
  id: string;
  label: string;
  children?: ROPATreeItem[];
  type: 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk' | 'add_action';
  data?: Repository | Activity | DataElement | DPIA | Risk;
  addActionType?: 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk';
  parentId?: string;
}
```

### 4. AI Suggestions System

**Architecture:**
- **Frontend:** `FormFieldWithSuggestion`, `useSuggestionJob` hook, polling for job status
- **Backend:** `AISuggestionJob` model, `SuggestionJobService`, Celery tasks
- **Infrastructure:** Celery workers, Redis queue, PostgreSQL storage

**Flow:**
1. User clicks "Suggest" button
2. Frontend creates suggestion job via API
3. Backend creates job record (status: "pending")
4. Celery worker processes job asynchronously:
   - Fetches field metadata
   - Builds context from parent entities
   - Calls OpenAI API
   - Stores results in database
5. Frontend polls for job status
6. Suggestions appear in UI when complete
7. User can accept/dismiss suggestions

**Supported Entities:**
- **Repository:** 22 fields with suggestions
- **Activity:** 8 fields
- **DataElement:** 6 fields
- **DPIA:** 4 fields
- **Risk:** 4 fields

**Total:** 44 fields across all entities

---

## Key Patterns

### 1. Form Submission in Dialogs

**Problem:** Forms in Material-UI Dialogs with submit buttons outside form causing page reloads.

**Solution:**
- Use `onSubmit={handleSubmit(onSubmit)}` directly (no manual `preventDefault()`)
- Submit button outside form: Use `type="submit"` with `form="form-id"` attribute
- Cancel button: Always set `type="button"` explicitly

### 2. Conditional Field Validation

**Problem:** Hidden conditional fields can have invalid values causing validation errors.

**Solution:**
- Watch conditional toggles with `watch()`
- Clear dependent fields to `undefined` (not `''`) when condition becomes false
- Use `setValue(fieldName, undefined, { shouldValidate: false })`
- Use `clearErrors(fieldName)` to remove stale errors

### 3. Background Data Refresh

**Problem:** Refreshing data after form submission triggers full-page loading spinner.

**Solution:**
- Add `skipLoading` parameter to fetch functions
- Only set `isLoading(true)` when `skipLoading` is false
- Initial load: `fetchData()` - shows full-page spinner
- Background refresh: `fetchData(true)` - no full-page spinner

### 4. Loading Overlay for Details Panel

**Problem:** During background refresh, details panel shows stale data with no feedback.

**Solution:**
- Add `isRefreshing` state in parent component
- Pass `isRefreshing` prop to details panel
- Show loading overlay with semi-transparent background
- Dim content to 50% opacity during refresh

### 5. useEffect Dependencies

**CRITICAL Pattern:**
```typescript
// ✅ CORRECT: Use entity ID, not entire entity
React.useEffect(() => {
  if (entity?.id) {
    reset(formData);
  }
}, [entity?.id, reset]);

// ❌ WRONG: Don't use entire entity object
React.useEffect(() => {
  reset(formData);
}, [entity, reset]); // This causes infinite loops!
```

### 6. Form Submit Button Disabled State

**Pattern:** Only disable when submitting, not based on `isDirty` (standardized across all forms).

```typescript
// ✅ CORRECT
<Button
  type="submit"
  variant="contained"
  disabled={isSubmitting}
>
  Save
</Button>

// ❌ WRONG
<Button
  type="submit"
  variant="contained"
  disabled={isSubmitting || !isDirty} // isDirty is unreliable
>
  Save
</Button>
```

---

## AI Suggestions System

### Architecture Components

1. **Frontend:**
   - `FormFieldWithSuggestion` - Wrapper component
   - `useSuggestionJob` - Hook for managing jobs
   - `SuggestButton` - Trigger button
   - `SuggestionDisplay` - Display results

2. **Backend:**
   - `AISuggestionJob` - Database model
   - `SuggestionJobService` - Job management
   - `ROPAContextBuilder` - Builds hierarchical context
   - `OpenAIService` - OpenAI API calls
   - `metadata.py` - Field metadata definitions

3. **Infrastructure:**
   - Celery workers - Background processing
   - Redis - Job queue
   - PostgreSQL - Job storage

### Context Building

The system builds rich context for AI prompts by fetching parent entities:
- **Activity** → Fetches Repository
- **DataElement** → Fetches Activity → Repository
- **DPIA** → Fetches Activity → Repository
- **Risk** → Fetches DPIA → Activity → Repository

### Job States

- **pending:** Job created, waiting to be processed
- **processing:** Celery worker is processing
- **completed:** Job completed, suggestions available
- **failed:** Job failed (error message stored)

### Cost Tracking

Each job tracks:
- Model used (e.g., "gpt-4o-mini")
- Tokens used (prompt + completion)
- Cost (USD) calculated from OpenAI pricing

---

## Documentation Files

### Core Documentation

1. **ROPA_BEST_PRACTICES.md** - Best practices for GDPR, React, FastAPI, Material UI
2. **ROPA_AI_SUGGESTIONS.md** - Complete guide to AI suggestion system
3. **ROPA_FIELDS_AND_RELATIONS_SUMMARY.md** - Entity fields and relationships comparison
4. **ROPA_IMPLEMENTATION_PLAN.md** - Implementation plan for bringing all entities to Repository level
5. **ROPA_FORM_IMPLEMENTATION_SUMMARY.md** - Key learnings from Repository form implementation
6. **ROPA_FORM_STANDARDIZATION_PLAN.md** - Plan to standardize form patterns
7. **ROPA_PAGE_SETUP.md** - Initial ROPA page setup documentation

### Related Documentation

- **frontend/COMPONENT_PATTERNS.md** - Component patterns (includes ROPA patterns)
- **frontend/API_PATTERNS.md** - API service patterns
- **frontend/LAYOUT_GUIDELINES.md** - Layout standards
- **frontend/REACT_HOOKS_GUIDELINES.md** - React hooks best practices
- **COMMON_MISTAKES.md** - Common mistakes to avoid

---

## Implementation Status

### Backend

| Entity | Model | Service | Schemas | Routes | AI Suggestions |
|--------|-------|---------|---------|--------|----------------|
| **Repository** | ✅ ~45 fields | ✅ Complete | ✅ Complete | ✅ Complete | ✅ 22 fields |
| **Activity** | ✅ 4 fields | ✅ Complete | ✅ Complete | ✅ Complete | ✅ 8 fields |
| **DataElement** | ✅ 3 fields | ✅ Complete | ✅ Complete | ✅ Complete | ✅ 6 fields |
| **DPIA** | ✅ 3 fields | ✅ Complete | ✅ Complete | ✅ Complete | ✅ 4 fields |
| **Risk** | ✅ 5 fields | ✅ Complete | ✅ Complete | ✅ Complete | ✅ 4 fields |

**Backend Status:** ✅ **100% Complete** for all entities

### Frontend

| Entity | API Service | Form Dialog | Validation Schema | AI Integration |
|--------|-------------|-------------|-------------------|----------------|
| **Repository** | ✅ Complete | ✅ Complete (~2000 lines) | ✅ Complete | ✅ Complete |
| **Activity** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| **DataElement** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| **DPIA** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| **Risk** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |

**Frontend Status:** ✅ **100% Complete** for all entities

### Features

| Feature | Status |
|---------|--------|
| **CRUD Operations** | ✅ Complete for all entities |
| **Form Validation** | ✅ Complete for all entities |
| **AI Suggestions** | ✅ Complete for all entities (44 fields total) |
| **Tree View** | ✅ Complete with all entity types |
| **Details Panel** | ✅ Complete with loading overlay |
| **Tenant Isolation** | ✅ Complete with RBAC |
| **Module Enablement** | ✅ Complete with `require_module()` |

---

## Summary

The ROPA module is a **fully implemented, production-ready** GDPR compliance tool with:

- ✅ **Complete backend** - All 5 entities with full CRUD, AI suggestions, and tenant isolation
- ✅ **Complete frontend** - All form dialogs, tree view, details panel, and AI integration
- ✅ **Comprehensive patterns** - Well-documented patterns for forms, validation, and data refresh
- ✅ **AI-powered suggestions** - 44 fields across all entities with context-aware suggestions
- ✅ **Robust architecture** - Service layer, proper error handling, and type safety throughout

The module follows consistent patterns across all entities, making it easy to maintain and extend. All documentation is comprehensive and up-to-date.

---

**Last Updated:** 2026-01-11
