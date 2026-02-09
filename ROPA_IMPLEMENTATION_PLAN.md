# ROPA Implementation Plan

**Date:** 2026-01-03  
**Status:** ✅ **COMPLETED** - All form dialogs implemented and standardized  
**Goal:** Bring Activity, DataElement, DPIA, and Risk to same implementation level as Repository

---

## Current State

### ✅ Complete (Repository)
- Backend: Full CRUD + AI suggestions + metadata
- Frontend: Full API + Form dialog + Validation + AI integration

### ✅ Complete (Activity, DataElement, DPIA, Risk)
- Backend: ✅ Full CRUD complete
- Frontend: ✅ API complete, ✅ Form components complete, ✅ AI suggestions integrated

---

## Implementation Plan

### Phase 1: Frontend Form Components (Priority: High)

**Goal:** Create form dialogs for all entities to match Repository pattern

#### 1.1 Activity Form Dialog
- **File:** `frontend/src/modules/ropa/components/ActivityFormDialog.tsx`
- **Fields:** name, description, purpose, legal_basis
- **Pattern:** Follow `RepositoryFormDialog.tsx` structure (simpler version)
- **Validation:** Create `activitySchema.ts` with Zod
- **Features:**
  - Create/Edit modes
  - React Hook Form integration
  - Error handling
  - Success notifications

#### 1.2 DataElement Form Dialog
- **File:** `frontend/src/modules/ropa/components/DataElementFormDialog.tsx`
- **Fields:** name, category, description
- **Pattern:** Simple form (3 fields)
- **Validation:** Create `dataElementSchema.ts` with Zod
- **Features:** Same as Activity

#### 1.3 DPIA Form Dialog
- **File:** `frontend/src/modules/ropa/components/DPIAFormDialog.tsx`
- **Fields:** title, description, status (enum: draft, in_review, approved, rejected)
- **Pattern:** Simple form with status dropdown
- **Validation:** Create `dpiaSchema.ts` with Zod
- **Features:** Same as Activity

#### 1.4 Risk Form Dialog
- **File:** `frontend/src/modules/ropa/components/RiskFormDialog.tsx`
- **Fields:** title, description, severity (enum), likelihood (enum), mitigation
- **Pattern:** Form with enum dropdowns
- **Validation:** Create `riskSchema.ts` with Zod
- **Features:** Same as Activity

**Estimated Effort:** 2-3 days (all 4 components)

---

### Phase 2: Integration with ROPAPage (Priority: High)

**Goal:** Connect form dialogs to tree view

#### 2.1 Update ROPAPage Component
- **File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`
- **Changes:**
  - Add state for each entity type dialog
  - Add "Create" buttons in tree view context menu
  - Add "Edit" action on item click
  - Wire up form dialogs to tree items
  - Refresh tree after create/update/delete

**Estimated Effort:** 1 day

---

### Phase 3: Default Name Generation (Priority: Low)

**Goal:** Add default name logic like Repository

#### 3.1 Backend Routes
- **Files:** `backend/app/modules/ropa/routers.py`
- **Changes:**
  - Activity: Auto-generate "Activity 1", "Activity 2", etc. if name empty
  - DataElement: Auto-generate "Data Element 1", etc. if name empty
  - DPIA: Auto-generate "DPIA 1", etc. if title empty
  - Risk: Auto-generate "Risk 1", etc. if title empty

**Estimated Effort:** 0.5 days

---

### Phase 4: AI Suggestions (Optional - Priority: Low)

**Goal:** Extend AI suggestion system to other entities (if needed)

#### 4.1 Backend Metadata
- **File:** `backend/app/modules/ropa/metadata.py`
- **Changes:**
  - Add metadata for Activity fields (purpose, legal_basis)
  - Add metadata for DPIA fields (status)
  - Add metadata for Risk fields (severity, likelihood)

#### 4.2 Backend Routes
- **File:** `backend/app/modules/ropa/routers.py`
- **Changes:**
  - Add suggestion endpoints for Activity, DPIA, Risk
  - Extend `SuggestionJobService` to support other entities

#### 4.3 Frontend Integration
- **Files:** Form dialog components
- **Changes:**
  - Add `FormFieldWithSuggestion` to relevant fields
  - Add suggestion job hooks

**Estimated Effort:** 2-3 days (if needed)

---

## Implementation Order

### Sprint 1: Core Forms (Week 1)
1. ✅ ActivityFormDialog + validation schema
2. ✅ DataElementFormDialog + validation schema
3. ✅ DPIAFormDialog + validation schema
4. ✅ RiskFormDialog + validation schema
5. ✅ Update ROPAPage to integrate forms

### Sprint 2: Polish (Week 2)
1. ✅ Default name generation (backend)
2. ✅ Testing and bug fixes
3. ✅ UI/UX improvements

### Sprint 3: Advanced Features (Optional)
1. ⚠️ AI suggestions for other entities (if needed)
2. ⚠️ Additional validation rules
3. ⚠️ Bulk operations

---

## Technical Decisions

### Form Component Structure
- **Pattern:** Follow `RepositoryFormDialog.tsx` but simplified
- **Layout:** Simple form (no Accordion needed for <5 fields)
- **Validation:** React Hook Form + Zod (same as Repository)
- **Notifications:** Use `useNotification()` hook (centralized)

### Schema Location
- **Pattern:** `frontend/src/modules/ropa/schemas/`
- **Files:**
  - `activitySchema.ts`
  - `dataElementSchema.ts`
  - `dpiaSchema.ts`
  - `riskSchema.ts`

### Component Location
- **Pattern:** `frontend/src/modules/ropa/components/`
- **Files:**
  - `ActivityFormDialog.tsx`
  - `DataElementFormDialog.tsx`
  - `DPIAFormDialog.tsx`
  - `RiskFormDialog.tsx`

### Default Name Logic
- **Pattern:** Same as Repository (check existing, increment counter)
- **Location:** Backend routes (in create endpoints)

---

## Success Criteria

### Must Have (MVP)
- ✅ All 4 entities have form dialogs
- ✅ Forms integrated with tree view
- ✅ Create/Edit/Delete works from UI
- ✅ Validation works correctly
- ✅ Error handling works

### Nice to Have
- ⚠️ Default name generation
- ⚠️ AI suggestions for other entities
- ⚠️ Bulk operations
- ⚠️ Export functionality

---

## Risk Assessment

### Low Risk
- Form component creation (straightforward, follows existing pattern)
- Schema validation (standard Zod patterns)
- Integration with tree view (API already exists)

### Medium Risk
- Default name generation (needs testing for edge cases)
- UI/UX consistency (need to match Repository style)

### High Risk
- None identified

---

## Dependencies

### Required
- ✅ React Hook Form (already in use)
- ✅ Zod (already in use)
- ✅ MUI components (already in use)
- ✅ API services (already implemented)

### Optional
- ⚠️ AI suggestion system (if extending to other entities)

---

## Notes

1. **Keep it Simple:** Other entities have fewer fields than Repository, so forms should be simpler
2. **Reuse Patterns:** Follow Repository patterns but don't over-engineer
3. **Consistency:** Match UI/UX with Repository form dialog
4. **Testing:** Test each form independently before integration
5. **Progressive Enhancement:** Start with basic forms, add features later if needed

---

## Estimated Total Effort

- **Phase 1 (Forms):** 2-3 days
- **Phase 2 (Integration):** 1 day
- **Phase 3 (Default Names):** 0.5 days
- **Phase 4 (AI Suggestions):** 2-3 days (optional)

**Total MVP:** ~4 days  
**Total with Optional:** ~7 days


