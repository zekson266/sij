# ROPA AI Suggestions Guide

**Purpose**: Complete guide to the AI-powered field suggestion system in the ROPA module  
**Last Updated**: 2026-01-18  
**Status**: Production-ready (All critical bugs fixed 2026-01-17, React 19 skeleton limitation documented, select field label mapping added 2026-01-18)

---

## Overview

The ROPA module includes an AI-powered suggestion system that helps users fill out forms by providing intelligent, context-aware suggestions for form fields. The system uses OpenAI's API to generate suggestions based on:

- Field metadata (descriptions, examples, AI hints)
- Form context (other fields already filled)
- Entity hierarchy (parent entities for context)
- Current field value (if editing)

---

## Architecture

### Components

1. **Frontend**:
   - `FormFieldWithSuggestion` - Wrapper component that adds AI suggestion UI
   - `useSuggestionJob` - Hook for managing suggestion jobs
   - `SuggestButton` - Button to trigger suggestions
   - `SuggestionDisplay` - Component to show suggestions and accept/dismiss them

2. **Backend**:
   - `AISuggestionJob` - Database model for tracking suggestion jobs
   - `SuggestionJobService` - Service for managing jobs
   - `ROPAContextBuilder` - Builds hierarchical context for AI prompts
   - `OpenAIService` - Handles OpenAI API calls
   - `metadata.py` - Field metadata definitions

3. **Infrastructure**:
   - Celery workers - Process suggestion jobs asynchronously
   - Redis - Job queue backend
   - PostgreSQL - Stores job status and results

---

## Supported Entities

All 5 ROPA entity types support AI suggestions:

### 1. Repository (5 fields)
- **Text fields**: `data_repository_name`, `data_repository_description`, `external_vendor`, `dpa_url`
- **Select fields**: `status`

### 2. Activity (9 fields)
- `purpose`, `lawful_basis`, `legitimate_interest_assessment`, `jit_notice`, `consent_process`, `data_subject_rights`, `dpia_comment`, `children_data`, `parental_consent`

### 3. DataElement (5 fields)
- `category`, `safeguards`, `disposition_method`, `data_minimization_justification`, `data_accuracy_requirements`

### 4. DPIA (4 fields)
- `title`, `description`, `necessity_proportionality_assessment`, `assessor`

### 5. Risk (4 fields)
- `title`, `description`, `mitigation`, `risk_owner`

**Total**: 27 fields across all entities have AI suggestion support.

---

## How It Works

### User Flow

1. **User opens form** (edit mode only - suggestions only appear when editing existing entities)
2. **User clicks "Suggest" button** next to a field (or "Suggest All" for all fields)
3. **System creates suggestion job(s)** and returns immediately
4. **Celery worker processes job** asynchronously:
   - Fetches field metadata
   - Builds context from parent entities
   - Calls OpenAI API with enriched prompt
   - Stores results in database
5. **Frontend polls for job status** until complete
6. **Suggestions appear** in UI below the field
7. **User can accept individual suggestions, accept all at once, or dismiss** suggestions

### Technical Flow

```
User clicks "Suggest"
  ↓
Frontend: suggestionJob.createJob()
  ↓
Backend: POST /api/tenants/{tenant_id}/ropa/{entity_type}/{entity_id}/suggest-field
  ↓
Backend: Creates AISuggestionJob record (status: "pending")
  ↓
Celery: process_suggestion_job.delay()
  ↓
Celery Worker:
  1. Fetch metadata for field
  2. Build context (parent entities)
  3. Call OpenAI API
  4. Update job (status: "completed", suggestions stored)
  ↓
Frontend: Polls GET /api/tenants/{tenant_id}/ropa/{entity_type}/{entity_id}/suggest-field/job/{job_id}
  ↓
Frontend: Displays suggestions when status = "completed"
```

---

## Field Metadata

Each field with AI suggestions has metadata defined in `backend/app/modules/ropa/metadata.py`:

```python
FieldMetadata(
    field_name="description",
    field_type="text",
    description="Detailed description of the processing activity",
    required=False,
    examples=[
        "Processing customer orders and payments through our e-commerce platform",
        "Managing user authentication and session data for web application"
    ],
    ai_hints="Provide a clear, comprehensive description..."
)
```

### Metadata Components

- **field_name**: Name of the field in the form
- **field_type**: Type of field (text, enum, etc.)
- **description**: What the field is for
- **required**: Whether field is required
- **examples**: Real-world examples (used in AI prompt)
- **ai_hints**: Guidance for AI (included in prompt)
- **allowed_values**: For enum fields (with descriptions)

---

## API Endpoints

### Create Suggestion Job

```http
POST /api/tenants/{tenant_id}/ropa/{entity_type}/{entity_id}/suggest-field
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

**Response**:
```json
{
  "job_id": "uuid",
  "status": "pending",
  "created_at": "2026-01-05T..."
}
```

### Get Job Status

```http
GET /api/tenants/{tenant_id}/ropa/{entity_type}/{entity_id}/suggest-field/job/{job_id}
Authorization: Bearer <token>
```

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

### List All Jobs for Entity

```http
GET /api/tenants/{tenant_id}/ropa/{entity_type}/{entity_id}/suggest-field/jobs
Authorization: Bearer <token>
```

**Response**:
```json
{
  "jobs": [
    {
      "job_id": "uuid",
      "status": "completed",
      "field_name": "description",
      "field_label": "Description",
      "created_at": "2026-01-05T..."
    }
  ]
}
```

### Get Field Metadata

```http
GET /api/tenants/{tenant_id}/ropa/metadata/{entity_type}-fields
Authorization: Bearer <token>
```

**Available endpoints**:
- `/metadata/repository-fields`
- `/metadata/activity-fields`
- `/metadata/data-element-fields`
- `/metadata/dpia-fields`
- `/metadata/risk-fields`

**Response**:
```json
{
  "formType": "activity",
  "fields": {
    "description": {
      "type": "text",
      "description": "Detailed description of the processing activity",
      "required": false,
      "examples": [...],
      "aiHints": "..."
    }
  },
  "version": "1.0"
}
```

---

## Select Field Label Mapping (2026-01-18)

### Overview

For select fields (enum fields with predefined options), the AI returns raw enum values (e.g., `"cloud_storage"`), but the UI should display human-readable labels (e.g., `"Cloud Storage"`). The system automatically maps values to labels for display while preserving raw values for form submission.

### How It Works

1. **AI Returns Raw Values**: The AI suggests raw enum values like `"cloud_storage"`, `"active"`, `"rbac"`, etc.
2. **Display Mapping**: `SuggestionDisplay` receives `selectOptions` prop and creates a value-to-label mapping
3. **User Sees Labels**: Suggestions are displayed with human-readable labels (e.g., `"Cloud Storage"` instead of `"cloud_storage"`)
4. **Form Receives Raw Values**: When user accepts a suggestion, the raw enum value is passed to the form (correct for form submission)

### Implementation

```typescript
// FormFieldWithSuggestion automatically passes selectOptions to SuggestionDisplay
<FormFieldWithSuggestion
  name="repository_type"
  control={control}
  label="Repository Type"
  fieldType="select"
  selectOptions={REPOSITORY_TYPE_OPTIONS} // [{ value: 'cloud_storage', label: 'Cloud Storage' }, ...]
  // ... other props
/>

// SuggestionDisplay maps values to labels internally
function SuggestionDisplay({ selectOptions, ... }) {
  const valueToLabelMap = React.useMemo(() => {
    if (!selectOptions) return null;
    return new Map(selectOptions.map(opt => [opt.value, opt.label]));
  }, [selectOptions]);

  const getDisplayLabel = (value: string) => {
    return valueToLabelMap?.get(value) || value; // Fallback to raw value
  };

  // Display: getDisplayLabel(suggestion) → "Cloud Storage"
  // onAccept: suggestion → "cloud_storage" (raw value)
}
```

### Supported Forms

Currently implemented in:
- ✅ **RepositoryFormDialog**: All 8 select fields support label mapping

Future forms (ActivityFormDialog, DPIAFormDialog, RiskFormDialog) will automatically support this when they adopt `FormFieldWithSuggestion` for their select fields.

### Key Points

1. **Automatic**: No additional code needed in form dialogs - just pass `selectOptions` to `FormFieldWithSuggestion`
2. **Backward Compatible**: Text fields are unaffected (no `selectOptions` = no mapping)
3. **Fallback Safe**: If a suggestion value isn't found in options, it displays the raw value
4. **Form Correctness**: Raw enum values are always passed to forms (correct for validation/submission)

---

## Frontend Integration

### Using FormFieldWithSuggestion

#### Text/Textarea Fields

```typescript
import FormFieldWithSuggestion from './FormFieldWithSuggestion';
import { useSuggestionJob } from '../hooks/useSuggestionJob';

// Initialize hook
const suggestionJob = useSuggestionJob({
  tenantId,
  entityType: 'activity',
  entityId: activity?.id || null,
  enabled: open && !!activity?.id,
});

// In form JSX
<FormFieldWithSuggestion
  name="description"
  control={control}
  label="Description"
  fieldType="textarea"
  jobStatus={suggestionJob.getJobStatus('description')}
  isSuggesting={
    (() => {
      const status = suggestionJob.getJobStatus('description');
      return status?.status === 'pending' || status?.status === 'processing';
    })()
  }
  onSuggest={async () => {
    try {
      const formData = watch();
      await suggestionJob.createJob(
        'description',
        'text',
        'Description',
        formData.description || '',
        formData
      );
    } catch (err) {
      // Error already shown by hook
    }
  }}
  onAccept={(suggestion) => {
    if (Array.isArray(suggestion)) {
      const joined = suggestion.join('\n\n');
      setValue('description', joined, { shouldValidate: true });
    } else if (typeof suggestion === 'string') {
      setValue('description', suggestion, { shouldValidate: true });
    }
  }}
  onDismiss={() => {
    suggestionJob.clearJobStatus('description');
  }}
/>
```

#### Select Fields (with Label Mapping)

```typescript
const REPOSITORY_TYPE_OPTIONS = [
  { value: 'database', label: 'Database' },
  { value: 'cloud_storage', label: 'Cloud Storage' },
  { value: 'file_system', label: 'File System' },
  // ...
];

<FormFieldWithSuggestion
  name="repository_type"
  control={control}
  label="Repository Type"
  fieldType="select"
  selectOptions={REPOSITORY_TYPE_OPTIONS} // ✅ Required for select fields
  jobStatus={suggestionJob.getJobStatus('repository_type')}
  isSuggesting={isFieldSuggesting('repository_type')}
  isRestoring={suggestionJob.isRestoring}
  onSuggest={async () => {
    const formData = watch();
    await handleSuggestField(
      'repository_type',
      'select',
      'Repository Type',
      formData.repository_type || '',
      formData,
      REPOSITORY_TYPE_OPTIONS.map(opt => opt.value) // ✅ Pass options to AI
    );
  }}
  onAccept={(suggestion) => {
    // For select fields, accept the first suggestion (should be a single value)
    const value = Array.isArray(suggestion) ? suggestion[0] : suggestion;
    if (typeof value === 'string') {
      setValue('repository_type', value as any, { shouldValidate: true });
    }
  }}
  onDismiss={() => {
    suggestionJob.clearJobStatus('repository_type');
  }}
/>
```

**Key Points for Select Fields**:
- ✅ Pass `selectOptions` prop - enables automatic label mapping
- ✅ Pass `fieldOptions` to `createJob` - AI receives available options
- ✅ Accept first suggestion - select fields return single values
- ✅ Raw enum values are preserved - form receives correct values

### Key Points

1. **Edit mode only**: Suggestions only appear when `isEditMode && entity?.id` is true
2. **Job status**: Use `suggestionJob.getJobStatus(fieldName)` to get current status
3. **Polling**: Hook automatically polls for job completion
4. **Restoration**: Jobs are restored when dialog reopens (via `useEffect`)

---

## Context Building

The system builds rich context for AI prompts by fetching parent entities:

- **Activity** → Fetches Repository
- **DataElement** → Fetches Activity → Repository
- **DPIA** → Fetches Activity → Repository
- **Risk** → Fetches DPIA → Activity → Repository

This hierarchical context helps AI provide more relevant suggestions.

---

## Job States

- **pending**: Job created, waiting to be processed
- **processing**: Celery worker is processing the job
- **completed**: Job completed successfully, suggestions available
- **failed**: Job failed (error message in `error_message` field)

---

## Cost Tracking

Each suggestion job tracks:
- **Model used**: e.g., "gpt-4o-mini"
- **Tokens used**: Total tokens (prompt + completion)
- **Cost (USD)**: Calculated based on OpenAI pricing

Costs are stored in the database for tracking and analysis.

---

## Best Practices

### For Developers

1. **Always check metadata exists** before adding suggestions to new fields
2. **Use appropriate field types**: `text`, `textarea`, `multiline` based on expected content length
3. **Provide good examples** in metadata - they significantly improve suggestion quality
4. **Test suggestion restoration** - ensure jobs restore when dialogs reopen

### For Users

1. **Fill other fields first** - More context = better suggestions
2. **Review suggestions carefully** - AI suggestions are helpful but may need editing
3. **Use suggestions as starting points** - Customize to fit your specific needs
4. **Check parent entities** - Suggestions consider parent context (e.g., Activity suggestions consider Repository)

---

## Troubleshooting

### Suggestions Not Appearing

1. **Check entity exists**: Suggestions only work in edit mode (entity must have ID)
2. **Check job status**: Look for errors in browser console or backend logs
3. **Verify Celery worker**: Ensure Celery workers are running
4. **Check OpenAI API key**: Verify `OPENAI_API_KEY` is set in backend environment

### Suggestions Are Poor Quality

1. **Check metadata**: Ensure field has good examples and AI hints
2. **Add more context**: Fill other form fields before requesting suggestions
3. **Review metadata examples**: Update examples in `metadata.py` if needed

### Jobs Stuck in "Pending"

1. **Check Celery workers**: Ensure workers are running and processing jobs
2. **Check Redis**: Verify Redis is running (used for job queue)
3. **Check logs**: Look for errors in Celery worker logs

### Suggestions Not Restoring

1. **Check restoration effect**: Ensure `useEffect` calls `suggestionJob.restoreJobs()` when dialog opens
2. **Check localStorage**: Jobs are stored in localStorage - check browser storage
3. **Verify entity ID**: Restoration only works when `entity?.id` exists

### Multiselect Fields

Current AI suggestions are configured for single-value text/select fields only. If multiselect suggestions are added in the future, ensure the AI returns arrays of individual items rather than comma-separated strings.

---

## State Management & Performance Optimizations

### React Closure Issue Fix (2026-01-12)

**Problem**: When clicking "Suggest" button multiple times, suggestions would flicker/blink - newly created jobs would briefly appear, then disappear and be replaced by old completed jobs.

**Root Cause**: `restoreJobs` callback was using a stale closure of `jobStatuses` state. When `restoreJobs` was called (e.g., when dialog reopened), it always saw an empty `jobStatuses` Map because the closure captured the initial empty state. This caused it to overwrite newly created jobs with old jobs fetched from the API.

**Solution**: Use a ref to track current state value:

```typescript
// In hook - add ref to track current jobStatuses
const jobStatusesRef = React.useRef<Map<string, SuggestionJobStatus>>(new Map());

// Update ref whenever state changes
setJobStatuses((prev) => {
  const next = new Map(prev);
  next.set(fieldName, status);
  jobStatusesRef.current = next; // ✅ Update ref
  return next;
});

// In restoreJobs - use ref instead of closure
const restoreJobs = React.useCallback(async () => {
  // ...
  const currentJobInState = jobStatusesRef.current.get(fieldName); // ✅ Use ref
  if (currentJobInState) {
    const currentJobCreatedAt = new Date(currentJobInState.created_at);
    const apiJobCreatedAt = new Date(job.created_at);
    if (currentJobCreatedAt > apiJobCreatedAt) {
      // Keep newer job from state, don't overwrite with old API job
      newJobStatuses.set(fieldName, currentJobInState);
      continue;
    }
  }
  // ...
}, [entityId, enabled]); // Note: jobStatuses NOT in deps - we use ref instead
```

**Key Lessons Learned**:

1. **useCallback closures capture state at creation time**: If state isn't in the dependency array, the callback will always see the initial value.

2. **Use refs for current values in callbacks**: When a callback needs the current state value but shouldn't re-create when state changes, use a ref that's updated on every state change.

3. **Compare timestamps to prevent overwrites**: When restoring state from API, compare `created_at` timestamps to ensure newer state isn't overwritten by older API data.

4. **Race condition protection**: Always check if the job ID matches before updating state in async operations (polling, restoration).

**Reference**: 
- `frontend/src/modules/ropa/hooks/useSuggestionJob.ts` - Complete implementation
- `COMMON_MISTAKES.md` - Mistake 13: React Closure Issues with useCallback
- `.ai-instructions.md` - React State Management with Async Updates

---

### useEffect Dependency Fix (2026-01-13)

**Problem**: When clicking "Suggest" button twice, suggestions would flicker - the newly created job would briefly appear, then disappear and be replaced by an old job. This happened because `restoreJobs` was being called unnecessarily after `createJob` completed.

**Root Cause**: The `useEffect` hook in form dialogs had `suggestionJob` in its dependency array. When `createJob` updated state, React re-rendered the component, causing `useSuggestionJob` to return a new object reference. This triggered the `useEffect` to re-run, calling `restoreJobs()` again, which would fetch old jobs from the API and temporarily overwrite the newly created job.

**Solution**: Remove `suggestionJob` from the dependency array and use a ref to call `restoreJobs` directly:

```typescript
// ❌ WRONG - causes unnecessary re-triggers
React.useEffect(() => {
  if (open && repository?.id) {
    const timer = setTimeout(() => {
      suggestionJob.restoreJobs();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [open, repository?.id, suggestionJob]); // ❌ suggestionJob changes on every render
```

```typescript
// ✅ CORRECT - only triggers when dialog opens or entity changes
const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
restoreJobsRef.current = suggestionJob.restoreJobs;

React.useEffect(() => {
  if (open && repository?.id && restoreJobsRef.current) {
    const timer = setTimeout(() => {
      restoreJobsRef.current?.();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [open, repository?.id]); // ✅ Only depends on open and entity ID
```

**Key Lessons Learned**:

1. **Object references change on every render**: When a hook returns an object, that object gets a new reference on each render, even if the values inside are the same.

2. **useEffect dependencies should be primitives**: Use primitive values (strings, numbers, booleans) or stable references (refs, memoized callbacks) in dependency arrays, not object references.

3. **Use refs for stable function references**: When you need to call a memoized function from `useEffect`, use a ref to store the current function reference without triggering re-runs.

**Applied to**: All ROPA form dialogs (RepositoryFormDialog, RiskFormDialog, DPIAFormDialog, ActivityFormDialog)

**Reference**: 
- `COMMON_MISTAKES.md` - Mistake 14: useEffect with Object References
- `.ai-instructions.md` - useEffect Dependency Best Practices

---

### Skeleton Loader for Initial Load (2026-01-13)

**Problem**: When opening a form dialog, suggestions would suddenly "pop in" without any loading indicator. This created a jarring user experience, especially when there were existing suggestion jobs that needed to be restored from the API.

**Root Cause**: The `restoreJobs` function runs asynchronously when the dialog opens. During this time, `jobStatus` is `null` for all fields, so `SuggestionDisplay` returns `null`. Once `restoreJobs` completes, suggestions appear suddenly.

**Solution**: Add an `isRestoring` state to track when jobs are being restored, and show a skeleton loader during this time:

```typescript
// In useSuggestionJob hook
const [isRestoring, setIsRestoring] = React.useState(false);

const restoreJobs = React.useCallback(async () => {
  if (!entityId || !enabled) return;
  
  setIsRestoring(true);
  try {
    // ... fetch and restore jobs ...
  } finally {
    setIsRestoring(false);
  }
}, [/* deps */]);

return {
  // ... other returns ...
  isRestoring, // Expose for components
};
```

```typescript
// In SuggestionDisplay component
function SuggestionDisplay({
  jobStatus,
  isRestoring = false,
  // ... other props
}) {
  // Show skeleton loader during initial restoration
  if (isRestoring && !jobStatus) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
        <Stack spacing={1}>
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="rectangular" width="100%" height={60} />
          <Skeleton variant="rectangular" width="100%" height={60} />
        </Stack>
      </Paper>
    );
  }
  
  // ... rest of component
}
```

**Known Limitation (React 19)**:

⚠️ **Skeleton may not appear**: React 19 automatically batches state updates, causing `setIsRestoring(true)` and `setJobStatuses` to be batched into a single render. This means the condition `isRestoring && !jobStatus` may never be true during a render cycle, preventing the skeleton from appearing.

**Why This Happens**:
- React 19 batches all state updates in event handlers and effects
- `setIsRestoring(true)` and `setJobStatuses(newJobStatuses)` are batched together
- By the time the component renders, both states have updated, so `isRestoring && !jobStatus` is never true

**Impact**: Minor UX trade-off - suggestions may appear without skeleton loader, but they appear quickly so the impact is minimal.

**Attempted Solutions (Reverted)**:
- ❌ `flushSync` - Anti-pattern, forces synchronous updates, hurts performance
- ❌ `setTimeout` delays - Anti-pattern, adds unnecessary delays
- ❌ `hasAnyJobStatuses` flag - Didn't resolve the batching issue

**Decision**: Accept this as a React 19 limitation rather than using anti-patterns. The UX is still acceptable as suggestions appear quickly.

**Applied to**: All ROPA form dialogs with suggestion fields

**Reference**: 
- `frontend/src/modules/ropa/components/SuggestionDisplay.tsx` - Skeleton loader implementation
- `frontend/src/modules/ropa/hooks/useSuggestionJob.ts` - `isRestoring` state management
- `ROPA_SUGGESTION_BUG_ANALYSIS.md` - Detailed analysis of React 19 batching limitation

---

## Future Enhancements

Potential improvements to the AI suggestion system:

1. **Suggestion History**: View and restore previous suggestions
2. **Bulk Suggestions**: Suggest multiple fields at once
3. **Suggestion Analytics**: Track which fields get suggested most, acceptance rates
4. **Template Suggestions**: Pre-defined templates for common scenarios
5. **Cross-Entity Suggestions**: Suggest Activity based on Repository context
6. **Compliance Checking**: AI suggestions that check for GDPR compliance issues

---

## Related Documentation

- `frontend/COMPONENT_PATTERNS.md` - Component patterns including AI suggestions
- `frontend/API_PATTERNS.md` - API service patterns
- `API_REFERENCE.md` - Complete API reference
- `ROPA_BEST_PRACTICES.md` - ROPA module best practices

---

**Last Updated**: 2026-01-27

---

## Known Issues

No known issues for current suggestion fields (all are single-value text/select fields).