# ROPA Fields and Relations Summary

**Date:** 2026-01-03  
**Purpose:** Document patterns implemented for Repositories and compare with Activities, DataElements, DPIAs, and Risks

## Overview

This document analyzes what was implemented for **Repositories** and relates those patterns to the other ROPA entities: **Activities**, **Data Elements**, **DPIAs**, and **Risks**.

## Entity Hierarchy

```
Repository (root - tenant-scoped)
  └── Activity (repository-scoped)
      ├── DataElement (activity-scoped)
      └── DPIA (activity-scoped)
          └── Risk (dpia-scoped)
```

---

## 1. Repository - Complete Implementation

### 1.1 Backend Model (`models/repository.py`)

**Fields:** Business/GDPR-focused set organized into logical sections:
- ✅ Basic Identification (`data_repository_name`, `data_repository_description`, `external_vendor`, `business_owner`, `data_format`)
- ✅ Geographic & Location (`geographical_location_ids`, `access_location_ids`)
- ✅ Cross-Border Transfers (`transfer_mechanism`, `derogation_type`, `cross_border_safeguards`, `cross_border_transfer_detail`)
- ✅ Compliance & Certification (`gdpr_compliant`, `dpa_url`, `dpa_file`, `vendor_gdpr_compliance`, `certification`)
- ✅ System Interfaces (`system_interfaces`, `interface_type`, `interface_location_ids`)
- ✅ Data & Records (`record_count`)
- ✅ Data Recipients (`data_recipients`, `sub_processors`)
- ✅ Operational Status (`status`)
- ✅ Additional Metadata (`comments`)

**Special Features:**
- ✅ Custom enum storage for enum values (not names)
- ✅ JSONB fields for UUID arrays and string arrays
- ✅ Comprehensive indexes on key fields

### 1.2 Backend Service (`services/repository.py`)

**Methods:**
- ✅ `create()` - Creates repository with tenant_id
- ✅ `get_by_id()` - Gets repository with tenant isolation check
- ✅ `list_by_tenant()` - Lists all repositories for tenant
- ✅ `update()` - Updates repository fields
- ✅ `delete()` - Deletes repository (cascade deletes activities)

**Pattern:**
- ✅ Static methods
- ✅ Tenant isolation enforced
- ✅ Error handling with `NotFoundError` and `ConflictError`
- ✅ Database session passed as parameter

### 1.3 Backend Schemas (`schemas/repository.py`)

**Schemas:**
- ✅ `RepositoryBase` - Common fields
- ✅ `RepositoryCreate` - Creation schema (extends Base)
- ✅ `RepositoryUpdate` - Update schema (all fields optional)
- ✅ `RepositoryResponse` - Response schema (includes timestamps, relationships)

**Special Features:**
- ✅ Pydantic Field descriptions
- ✅ Field validation (min_length, max_length)
- ✅ Enum types from `enums.py`
- ✅ JSON schema extras with examples and AI hints

### 1.4 Backend Routes (`routers.py`)

**Endpoints:**
- ✅ `POST /repositories` - Create repository (with default name logic)
- ✅ `GET /repositories` - List all repositories
- ✅ `GET /repositories/{repository_id}` - Get repository
- ✅ `PATCH /repositories/{repository_id}` - Update repository
- ✅ `DELETE /repositories/{repository_id}` - Delete repository

**Special Features:**
- ✅ Default name generation if name not provided
- ✅ `require_module("ropa")` dependency
- ✅ `_check_tenant_membership()` authorization
- ✅ Error handling with HTTPException

### 1.5 AI Suggestion System

**Features:**
- ✅ `metadata.py` - Rich metadata for all enum fields
- ✅ `EnumValueMetadata` - Descriptions, examples, context for each enum value
- ✅ `FieldMetadata` - Field-level metadata with AI hints
- ✅ `AISuggestionJob` model - Job tracking
- ✅ `SuggestionJobService` - Job management
- ✅ Celery task `process_suggestion_job` - Background processing
- ✅ Cost tracking (tokens, cost per job)

**API Endpoints:**
- ✅ `POST /repositories/{repository_id}/suggest-field` - Create suggestion job
- ✅ `GET /repositories/{repository_id}/suggest-field/job/{job_id}` - Get job status
- ✅ `GET /repositories/{repository_id}/suggest-field/jobs` - List jobs

### 1.6 Frontend API Service (`services/ropaApi.ts`)

**Functions:**
- ✅ `listRepositories()` - List all
- ✅ `getRepository()` - Get one
- ✅ `createRepository()` - Create
- ✅ `updateRepository()` - Update
- ✅ `deleteRepository()` - Delete
- ✅ `createSuggestionJob()` - AI suggestions
- ✅ `getSuggestionJob()` - Get job status
- ✅ `listSuggestionJobs()` - List jobs

**Types:**
- ✅ Full TypeScript interface for `Repository`
- ✅ `RepositoryCreate` interface
- ✅ `RepositoryUpdate` interface

### 1.7 Frontend Components

**Components:**
- ✅ `RepositoryFormDialog.tsx` - Large form dialog (~2000 lines)
  - Accordion-based layout
  - ~45 fields organized into sections
  - React Hook Form + Zod validation
  - AI suggestion integration (`FormFieldWithSuggestion`)
  - Responsive design
- ✅ `FormFieldWithSuggestion.tsx` - Field with AI suggestion button
- ✅ `SuggestButton.tsx` - AI suggestion trigger
- ✅ `SuggestionDisplay.tsx` - Display suggestion results
- ✅ `useSuggestionJob.ts` - Hook for managing suggestion jobs

**Features:**
- ✅ Form validation with Zod schema (`repositorySchema.ts`)
- ✅ Real-time polling for suggestion jobs
- ✅ Error handling
- ✅ Success notifications

---

## 2. Activity - Implementation Status

### 2.1 Backend Model (`models/activity.py`)

**Fields:** Simple model with 4 fields:
- ✅ `name` - Activity name
- ✅ `description` - Optional description
- ✅ `purpose` - Purpose of processing
- ✅ `legal_basis` - Legal basis (e.g., "Consent", "Contract")

**Relationships:**
- ✅ `repository_id` - Foreign key to Repository
- ✅ `repository` - Relationship to Repository
- ✅ `data_elements` - One-to-many with DataElement
- ✅ `dpias` - One-to-many with DPIA

**Status:** ✅ **Complete** - Simple model, no special features needed

### 2.2 Backend Service (`services/activity.py`)

**Methods:**
- ✅ `create()` - Creates activity, verifies repository belongs to tenant
- ✅ `get_by_id()` - Gets activity with tenant isolation (through repository)
- ✅ `list_by_repository()` - Lists activities for repository
- ✅ `update()` - Updates activity
- ✅ `delete()` - Deletes activity (cascade deletes data_elements and dpias)

**Pattern:** ✅ **Matches Repository pattern** - Same structure and error handling

### 2.3 Backend Schemas (`schemas/activity.py`)

**Schemas:**
- ✅ `ActivityBase` - Common fields
- ✅ `ActivityCreate` - Creation schema (includes repository_id)
- ✅ `ActivityUpdate` - Update schema (all fields optional)
- ✅ `ActivityResponse` - Response schema (includes nested DataElementBasic and DPIABasic)

**Status:** ✅ **Complete** - Follows same pattern as Repository

### 2.4 Backend Routes (`routers.py`)

**Endpoints:**
- ✅ `POST /repositories/{repository_id}/activities` - Create activity
- ✅ `GET /repositories/{repository_id}/activities` - List activities
- ✅ `GET /activities/{activity_id}` - Get activity
- ✅ `PATCH /activities/{activity_id}` - Update activity
- ✅ `DELETE /activities/{activity_id}` - Delete activity

**Pattern:** ✅ **Matches Repository pattern** - Same structure

**Missing Features:**
- ❌ No default name generation (unlike Repository)
- ❌ No AI suggestion system (only for Repository)

### 2.5 Frontend API Service (`services/ropaApi.ts`)

**Functions:**
- ✅ `listActivities()` - List by repository
- ✅ `getActivity()` - Get one
- ✅ `createActivity()` - Create
- ✅ `updateActivity()` - Update
- ✅ `deleteActivity()` - Delete

**Status:** ✅ **Complete** - All CRUD operations implemented

**Missing:**
- ❌ No AI suggestion functions (only for Repository)

### 2.6 Frontend Components

**Status:** ❌ **Not Implemented**
- ❌ No `ActivityFormDialog.tsx` component
- ❌ No dedicated form for creating/editing activities
- ❌ Activities are likely created/edited through tree view or simple dialogs

---

## 3. Data Element - Implementation Status

### 3.1 Backend Model (`models/data_element.py`)

**Fields:** Simple model with 3 fields:
- ✅ `name` - Data element name (e.g., "Email address")
- ✅ `category` - Data category (e.g., "Contact data", "Identity data")
- ✅ `description` - Optional description

**Relationships:**
- ✅ `activity_id` - Foreign key to Activity
- ✅ `activity` - Relationship to Activity

**Status:** ✅ **Complete** - Simple model

### 3.2 Backend Service (`services/data_element.py`)

**Methods:**
- ✅ `create()` - Creates data element, verifies activity belongs to tenant
- ✅ `get_by_id()` - Gets data element with tenant isolation (through activity → repository)
- ✅ `list_by_activity()` - Lists data elements for activity
- ✅ `update()` - Updates data element
- ✅ `delete()` - Deletes data element

**Pattern:** ✅ **Matches Repository pattern** - Same structure

**Note:** Tenant verification goes through: DataElement → Activity → Repository → Tenant

### 3.3 Backend Schemas (`schemas/data_element.py`)

**Schemas:**
- ✅ `DataElementBase` - Common fields
- ✅ `DataElementCreate` - Creation schema (includes activity_id)
- ✅ `DataElementUpdate` - Update schema (all fields optional)
- ✅ `DataElementResponse` - Response schema

**Status:** ✅ **Complete** - Follows same pattern

### 3.4 Backend Routes (`routers.py`)

**Endpoints:**
- ✅ `POST /activities/{activity_id}/data-elements` - Create data element
- ✅ `GET /activities/{activity_id}/data-elements` - List data elements
- ✅ `GET /data-elements/{data_element_id}` - Get data element
- ✅ `PATCH /data-elements/{data_element_id}` - Update data element
- ✅ `DELETE /data-elements/{data_element_id}` - Delete data element

**Pattern:** ✅ **Matches Repository pattern**

**Missing Features:**
- ❌ No default name generation
- ❌ No AI suggestion system

### 3.5 Frontend API Service (`services/ropaApi.ts`)

**Functions:**
- ✅ `listDataElements()` - List by activity
- ✅ `getDataElement()` - Get one
- ✅ `createDataElement()` - Create
- ✅ `updateDataElement()` - Update
- ✅ `deleteDataElement()` - Delete

**Status:** ✅ **Complete** - All CRUD operations implemented

### 3.6 Frontend Components

**Status:** ❌ **Not Implemented**
- ❌ No `DataElementFormDialog.tsx` component
- ❌ No dedicated form for creating/editing data elements

---

## 4. DPIA - Implementation Status

### 4.1 Backend Model (`models/dpia.py`)

**Fields:** Simple model with 3 fields:
- ✅ `title` - DPIA title
- ✅ `description` - Optional description
- ✅ `status` - Status (draft, in_review, approved, rejected)

**Relationships:**
- ✅ `activity_id` - Foreign key to Activity
- ✅ `activity` - Relationship to Activity
- ✅ `risks` - One-to-many with Risk

**Status:** ✅ **Complete** - Simple model

### 4.2 Backend Service (`services/dpia.py`)

**Methods:**
- ✅ `create()` - Creates DPIA, verifies activity belongs to tenant
- ✅ `get_by_id()` - Gets DPIA with tenant isolation (through activity → repository)
- ✅ `list_by_activity()` - Lists DPIAs for activity
- ✅ `update()` - Updates DPIA
- ✅ `delete()` - Deletes DPIA (cascade deletes risks)

**Pattern:** ✅ **Matches Repository pattern** - Same structure

### 4.3 Backend Schemas (`schemas/dpia.py`)

**Schemas:**
- ✅ `DPIABase` - Common fields
- ✅ `DPIACreate` - Creation schema (includes activity_id)
- ✅ `DPIAUpdate` - Update schema (all fields optional)
- ✅ `DPIAResponse` - Response schema (includes nested RiskBasic)

**Status:** ✅ **Complete** - Follows same pattern

### 4.4 Backend Routes (`routers.py`)

**Endpoints:**
- ✅ `POST /activities/{activity_id}/dpias` - Create DPIA
- ✅ `GET /activities/{activity_id}/dpias` - List DPIAs
- ✅ `GET /dpias/{dpia_id}` - Get DPIA
- ✅ `PATCH /dpias/{dpia_id}` - Update DPIA
- ✅ `DELETE /dpias/{dpia_id}` - Delete DPIA

**Pattern:** ✅ **Matches Repository pattern**

**Missing Features:**
- ❌ No default title generation
- ❌ No AI suggestion system

### 4.5 Frontend API Service (`services/ropaApi.ts`)

**Functions:**
- ✅ `listDPIAs()` - List by activity
- ✅ `getDPIA()` - Get one
- ✅ `createDPIA()` - Create
- ✅ `updateDPIA()` - Update
- ✅ `deleteDPIA()` - Delete

**Status:** ✅ **Complete** - All CRUD operations implemented

### 4.6 Frontend Components

**Status:** ❌ **Not Implemented**
- ❌ No `DPIAFormDialog.tsx` component
- ❌ No dedicated form for creating/editing DPIAs

---

## 5. Risk - Implementation Status

### 5.1 Backend Model (`models/risk.py`)

**Fields:** Model with 5 fields:
- ✅ `title` - Risk title
- ✅ `description` - Optional description
- ✅ `severity` - Risk severity (low, medium, high, critical)
- ✅ `likelihood` - Risk likelihood (low, medium, high)
- ✅ `mitigation` - Mitigation measures

**Relationships:**
- ✅ `dpia_id` - Foreign key to DPIA
- ✅ `dpia` - Relationship to DPIA

**Status:** ✅ **Complete** - Simple model

### 5.2 Backend Service (`services/risk.py`)

**Methods:**
- ✅ `create()` - Creates risk, verifies DPIA belongs to tenant
- ✅ `get_by_id()` - Gets risk with tenant isolation (through dpia → activity → repository)
- ✅ `list_by_dpia()` - Lists risks for DPIA
- ✅ `update()` - Updates risk
- ✅ `delete()` - Deletes risk

**Pattern:** ✅ **Matches Repository pattern** - Same structure

**Note:** Tenant verification goes through: Risk → DPIA → Activity → Repository → Tenant

### 5.3 Backend Schemas (`schemas/risk.py`)

**Schemas:**
- ✅ `RiskBase` - Common fields
- ✅ `RiskCreate` - Creation schema (includes dpia_id)
- ✅ `RiskUpdate` - Update schema (all fields optional)
- ✅ `RiskResponse` - Response schema

**Status:** ✅ **Complete** - Follows same pattern

### 5.4 Backend Routes (`routers.py`)

**Endpoints:**
- ✅ `POST /dpias/{dpia_id}/risks` - Create risk
- ✅ `GET /dpias/{dpia_id}/risks` - List risks
- ✅ `GET /risks/{risk_id}` - Get risk
- ✅ `PATCH /risks/{risk_id}` - Update risk
- ✅ `DELETE /risks/{risk_id}` - Delete risk

**Pattern:** ✅ **Matches Repository pattern**

**Missing Features:**
- ❌ No default title generation
- ❌ No AI suggestion system

### 5.5 Frontend API Service (`services/ropaApi.ts`)

**Functions:**
- ✅ `listRisks()` - List by DPIA
- ✅ `getRisk()` - Get one
- ✅ `createRisk()` - Create
- ✅ `updateRisk()` - Update
- ✅ `deleteRisk()` - Delete

**Status:** ✅ **Complete** - All CRUD operations implemented

### 5.6 Frontend Components

**Status:** ❌ **Not Implemented**
- ❌ No `RiskFormDialog.tsx` component
- ❌ No dedicated form for creating/editing risks

---

## Summary Comparison

### ✅ What's Implemented for All Entities

| Feature | Repository | Activity | DataElement | DPIA | Risk |
|---------|-----------|----------|-------------|------|------|
| **Backend Model** | ✅ ~45 fields | ✅ 4 fields | ✅ 3 fields | ✅ 3 fields | ✅ 5 fields |
| **Backend Service** | ✅ Full CRUD | ✅ Full CRUD | ✅ Full CRUD | ✅ Full CRUD | ✅ Full CRUD |
| **Backend Schemas** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| **Backend Routes** | ✅ Full REST | ✅ Full REST | ✅ Full REST | ✅ Full REST | ✅ Full REST |
| **Frontend API** | ✅ All functions | ✅ All functions | ✅ All functions | ✅ All functions | ✅ All functions |
| **Tenant Isolation** | ✅ Direct | ✅ Through repo | ✅ Through activity | ✅ Through activity | ✅ Through dpia |
| **Cascade Deletes** | ✅ Activities | ✅ DataElements/DPIAs | ✅ None | ✅ Risks | ✅ None |

### ❌ What's Only for Repository

| Feature | Repository | Activity | DataElement | DPIA | Risk |
|---------|-----------|----------|-------------|------|------|
| **AI Suggestions** | ✅ Full system | ❌ None | ❌ None | ❌ None | ❌ None |
| **Metadata System** | ✅ Rich metadata | ❌ None | ❌ None | ❌ None | ❌ None |
| **Enum Handling** | ✅ Custom types | ❌ None | ❌ None | ❌ None | ❌ None |
| **Default Name Logic** | ✅ Auto-generate | ❌ None | ❌ None | ❌ None | ❌ None |
| **Frontend Form Dialog** | ✅ ~2000 lines | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| **Form Validation Schema** | ✅ Zod schema | ✅ Zod schema | ✅ Zod schema | ✅ Zod schema | ✅ Zod schema |
| **Suggestion Components** | ✅ Full UI | ✅ Full UI | ✅ Full UI | ✅ Full UI | ✅ Full UI |

### 📊 Implementation Completeness

**Backend:**
- ✅ **Repository:** 100% complete with advanced features
- ✅ **Activity:** 100% complete (basic CRUD)
- ✅ **DataElement:** 100% complete (basic CRUD)
- ✅ **DPIA:** 100% complete (basic CRUD)
- ✅ **Risk:** 100% complete (basic CRUD)

**Frontend:**
- ✅ **Repository:** 100% complete with advanced UI
- ✅ **Activity:** 100% complete (form dialog + AI suggestions)
- ✅ **DataElement:** 100% complete (form dialog + AI suggestions)
- ✅ **DPIA:** 100% complete (form dialog + AI suggestions)
- ✅ **Risk:** 100% complete (form dialog + AI suggestions)

---

## Patterns Identified

### 1. Service Layer Pattern
All entities follow the same service pattern:
- Static methods
- Tenant isolation checks
- Error handling with custom exceptions
- Database session injection

### 2. Schema Pattern
All entities follow the same schema pattern:
- `Base` schema for common fields
- `Create` schema extends Base, includes parent_id
- `Update` schema with all fields optional
- `Response` schema includes timestamps and relationships

### 3. Route Pattern
All entities follow the same REST pattern:
- Nested routes for child entities (e.g., `/repositories/{id}/activities`)
- Direct routes for individual operations (e.g., `/activities/{id}`)
- `require_module("ropa")` dependency
- `_check_tenant_membership()` authorization
- Consistent error handling

### 4. Frontend API Pattern
All entities follow the same API pattern:
- `list*()` - List by parent
- `get*()` - Get one
- `create*()` - Create
- `update*()` - Update
- `delete*()` - Delete

### 5. Tenant Isolation Pattern
- **Repository:** Direct `tenant_id` check
- **Activity:** Through repository (Activity → Repository → Tenant)
- **DataElement:** Through activity chain (DataElement → Activity → Repository → Tenant)
- **DPIA:** Through activity chain (DPIA → Activity → Repository → Tenant)
- **Risk:** Through dpia chain (Risk → DPIA → Activity → Repository → Tenant)

---

## Recommendations

### For Consistency

1. **Default Name Generation:** Consider adding default name logic for Activities, DataElements, DPIAs, and Risks (similar to Repository)

2. **Frontend Form Components:** Create form dialogs for:
   - `ActivityFormDialog.tsx`
   - `DataElementFormDialog.tsx`
   - `DPIAFormDialog.tsx`
   - `RiskFormDialog.tsx`

3. **Form Validation:** Create Zod schemas for:
   - `activitySchema.ts`
   - `dataElementSchema.ts`
   - `dpiaSchema.ts`
   - `riskSchema.ts`

4. **AI Suggestions (Optional):** Consider extending AI suggestion system to other entities if needed

5. **Metadata (Optional):** If other entities need enum fields, consider adding metadata system

---

## Conclusion

**Repository** has the most complete implementation with:
- Comprehensive data model (~45 fields)
- AI suggestion system
- Rich metadata
- Full frontend form with validation

**Activity, DataElement, DPIA, and Risk** have:
- ✅ Complete backend implementation (models, services, schemas, routes)
- ✅ Complete frontend API service
- ❌ Missing frontend form components
- ❌ Missing AI suggestion integration (if needed)
- ❌ Missing default name generation (if desired)

The backend architecture is **consistent and complete** across all entities. The frontend needs form components for the simpler entities to match the Repository implementation level.
