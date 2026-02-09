# Form Standardization Plan - Remove `isDirty` Pattern

**Date**: 2025-01-04  
**Purpose**: Remove `isDirty` from all forms - standardize to `disabled={isSubmitting}` only  
**Status**: ✅ **COMPLETED** - All forms standardized

---

## Background

**Decision**: Remove `isDirty` from all forms. Submit buttons should only be disabled when `isSubmitting`.

**Why**: `isDirty` is unreliable with complex form state (resets, conditional fields, restoration). Proven pattern from RepositoryFormDialog and ActivityFormDialog.

## Files Updated

### ROPA Forms (5 files) - ✅ ALL COMPLETE
- ✅ `ActivityFormDialog.tsx` - Standardized
- ✅ `RepositoryFormDialog.tsx` - Standardized
- ✅ `DataElementFormDialog.tsx` - Standardized
- ✅ `DPIAFormDialog.tsx` - Standardized
- ✅ `RiskFormDialog.tsx` - Standardized

---

## Standardization Steps

### Step 1: Remove `isDirty` from formState

**Find:** `formState: { errors, isDirty }`  
**Replace:** `formState: { errors }`

**Files:**
- `RepositoryFormDialog.tsx` (line 168)
- `DataElementFormDialog.tsx` (line 82)
- `DPIAFormDialog.tsx` (line 91)
- `RiskFormDialog.tsx` (line 100)

---

### Step 2: Update Button Disabled Condition

**Find:** `disabled={isSubmitting || !isDirty}`  
**Replace:** `disabled={isSubmitting}`

**Files:**
- `DataElementFormDialog.tsx` (line 546)
- `DPIAFormDialog.tsx` (line 545)
- `RiskFormDialog.tsx` (line 488)

**Note:** `RepositoryFormDialog.tsx` already has correct button (line 2035), but check `handleClose` (line 550) for `isDirty` usage.

---

### Step 3: Remove `isDirty` from handleClose (if present)

**Find:** `if (isDirty) { ... }` in `handleClose()`  
**Replace:** Remove the check (or entire block if only used for confirmation)

**Files:**
- `RepositoryFormDialog.tsx` (line 550) - Check if `isDirty` is used for confirmation dialog

---

### Step 4: ROPA Forms Only - Additional Fixes

For ROPA forms with AI suggestions (`DataElementFormDialog`, `DPIAFormDialog`, `RiskFormDialog`):

**4a. Add `keepDefaultValues: false` to reset calls:**
```typescript
reset({ ...fields }, { keepDefaultValues: false });
```

**4b. Remove `reset()` from `handleClose()`:**
```typescript
const handleClose = () => {
  if (!isSubmitting) {
    onClose(); // Don't reset - preserve state
  }
};
```

**4c. Add restoration effect (after reset useEffect):**
```typescript
React.useEffect(() => {
  if (open && entity?.id) {
    const timer = setTimeout(() => suggestionJob.restoreJobs(), 100);
    return () => clearTimeout(timer);
  }
}, [open, entity?.id, suggestionJob]);
```

**Files:**
- `DataElementFormDialog.tsx` - Steps 4a, 4b, 4c
- `DPIAFormDialog.tsx` - Steps 4a, 4b, 4c
- `RiskFormDialog.tsx` - Steps 4a, 4b, 4c

---

## Files Summary

| File | Step 1 | Step 2 | Step 3 | Step 4 |
|------|--------|--------|--------|--------|
| `RepositoryFormDialog.tsx` | ✅ | ✅ | ✅ | ✅ |
| `ActivityFormDialog.tsx` | ✅ | ✅ | ✅ | ✅ |
| `DataElementFormDialog.tsx` | ✅ | ✅ | ✅ | ✅ |
| `DPIAFormDialog.tsx` | ✅ | ✅ | ✅ | ✅ |
| `RiskFormDialog.tsx` | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- Step 1: Remove `isDirty` from formState ✅
- Step 2: Update button disabled condition ✅
- Step 3: Remove `isDirty` from handleClose ✅
- Step 4: ROPA-specific fixes (reset options, restoration) ✅

## Implementation Details

### Completed Changes

1. **formState destructuring**: All forms now use `formState: { errors }` only (no `isDirty`)
2. **Button disabled state**: All submit buttons use `disabled={isSubmitting}` only
3. **Reset calls**: All forms use `keepDefaultValues: false` in reset calls
4. **handleClose**: All forms preserve state on close (no reset call)
5. **Restoration logic**: All forms have suggestion job restoration:
   - Repository, Activity, DPIA, Risk: Use ref pattern to prevent re-triggering
   - DataElement: Uses direct call with timeout

### Restoration Pattern Variations

**Ref Pattern** (Repository, Activity, DPIA, Risk):
```typescript
const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
restoreJobsRef.current = suggestionJob.restoreJobs;

React.useEffect(() => {
  if (open && entity?.id && restoreJobsRef.current) {
    const timer = setTimeout(() => {
      restoreJobsRef.current?.();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [open, entity?.id]);
```

**Direct Pattern** (DataElement):
```typescript
React.useEffect(() => {
  if (open && entity?.id) {
    const timer = setTimeout(() => {
      suggestionJob.restoreJobs();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [open, entity?.id, suggestionJob]);
```

Both patterns work correctly. The ref pattern prevents unnecessary re-triggering when `suggestionJob` object reference changes.

---

## Verification

✅ **Completed:**
1. ✅ Build: `./scripts/build-frontend.sh` - No TypeScript errors
2. ✅ All forms verified: Submit button enabled when form is ready
3. ✅ All forms tested: No `isDirty` dependencies, proper state management

## Current State

All ROPA form dialogs now follow the standardized pattern:
- ✅ No `isDirty` in formState
- ✅ Submit buttons disabled only when `isSubmitting`
- ✅ Form state preserved on close (for suggestion restoration)
- ✅ Proper reset logic with `keepDefaultValues: false`
- ✅ Suggestion job restoration implemented

---

**Reference:** `frontend/COMPONENT_PATTERNS.md` - Form Submit Button Disabled State Pattern

**Last Updated**: 2025-01-11
