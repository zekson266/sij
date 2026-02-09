# Frontend Component Patterns

**Purpose**: Show AI agents correct patterns for creating components  
**Last Updated**: 2024-12-22  
**Status**: Living document - update when patterns change

---

## Page Component Pattern

### ✅ CORRECT

```typescript
import * as React from 'react';
import { PageLayout } from '@/components/layout';
import { Paper, Typography } from '@mui/material';

export default function MyPage() {
  return (
    <PageLayout maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4">Page Title</Typography>
        {/* Content */}
      </Paper>
    </PageLayout>
  );
}
```

### ❌ INCORRECT

```typescript
import { Container } from '@mui/material';

export default function MyPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 8 }}>
      {/* Content */}
    </Container>
  );
}
```

### WHY

- **PageLayout** ensures consistent spacing (mt: 4, mb: 4)
- **maxWidth="md"** (960px) is standard for main pages
- **maxWidth="lg"** (1280px) is too wide and inconsistent
- **Container directly** bypasses our layout system

### Examples in Codebase

- ✅ `frontend/src/pages/tenants/TenantWorkspacePage.tsx`
- ✅ `frontend/src/pages/TenantsListPage.tsx`
- ✅ `frontend/src/pages/tenants/TenantDetailPage.tsx`
- ✅ `frontend/src/pages/LandingPage.tsx`

**Reference**: `frontend/LAYOUT_GUIDELINES.md`

---

## Auth Page Pattern

### ✅ CORRECT

```typescript
import { PageLayout } from '@/components/layout';

export default function LoginPage() {
  return (
    <PageLayout maxWidth="xs">
      {/* Auth form */}
    </PageLayout>
  );
}
```

### ❌ INCORRECT

```typescript
<PageLayout maxWidth="md">  // ❌ Too wide for auth pages
```

### WHY

- Auth pages (Login, Register) should be narrower
- **maxWidth="xs"** (444px) is appropriate for forms
- Main pages use **maxWidth="md"** (960px)

**Reference**: `frontend/LAYOUT_GUIDELINES.md`

---

## Form Component Pattern

### ✅ CORRECT

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormTextField } from '@/components/common';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

export default function MyForm({ entity, onUpdate }: Props) {
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: entity?.name || '',
      email: entity?.email || '',
    },
  });

  // ✅ CORRECT: Only reset when entity ID changes
  React.useEffect(() => {
    if (entity) {
      reset({
        name: entity.name,
        email: entity.email,
      });
    }
  }, [entity?.id, reset]); // ✅ Use entity?.id, not entity

  const onSubmit = async (data: FormData) => {
    await onUpdate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormTextField
        name="name"
        control={control}
        label="Name"
      />
      <FormTextField
        name="email"
        control={control}
        label="Email"
      />
      <Button type="submit">Save</Button>
    </form>
  );
}
```

### ❌ INCORRECT

```typescript
// ❌ WRONG: Resets form while user is typing
React.useEffect(() => {
  reset({
    name: entity.name,
    email: entity.email,
  });
}, [entity, reset]); // ❌ Using entity object, not entity?.id
```

### WHY

- **entity?.id** only changes when switching to different entity
- **entity** object reference changes on every render
- Using **entity** causes form to reset while typing

**Reference**: `frontend/REACT_HOOKS_GUIDELINES.md`  
**Examples**: 
- ✅ `frontend/src/pages/tenants/components/TenantDetailsTab.tsx`
- ✅ `frontend/src/pages/tenants/components/TenantSettingsTab.tsx`

---

## Form Submission in Dialog Pattern

### ⚠️ CRITICAL: React Hook Form Handles preventDefault Automatically

**Problem**: When forms are in Material-UI Dialogs with submit buttons in `DialogActions` (outside the form), manually calling `preventDefault()` can interfere with React Hook Form's internal event handling, causing page reloads.

**Root Cause**: 
- React Hook Form's `handleSubmit` automatically calls `preventDefault()` internally
- Manually calling `preventDefault()` before `handleSubmit(onSubmit)(e)` creates a conflict
- When buttons are outside the form using the `form` attribute, timing issues can occur

### ✅ CORRECT Pattern (Button Outside Form)

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogActions, Button, Box } from '@mui/material';

export default function MyDialogForm({ open, onClose }: Props) {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = async (data: FormData) => {
    await saveData(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <Box 
          component="form" 
          id="my-form" 
          onSubmit={handleSubmit(onSubmit)}  // ✅ Direct React Hook Form handler
        >
          <FormTextField name="name" control={control} label="Name" />
          <FormTextField name="email" control={control} label="Email" />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button
          type="button"  // ✅ Explicit type for non-submit buttons
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="my-form"  // ✅ Links button to form via HTML5 form attribute
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

### ✅ CORRECT Pattern (Button Inside Form)

```typescript
<Box component="form" onSubmit={handleSubmit(onSubmit)}>
  <FormTextField name="name" control={control} label="Name" />
  <Button type="submit">Save</Button>  // ✅ Button inside form
</Box>
```

### ❌ INCORRECT Patterns

```typescript
// ❌ WRONG: Manual preventDefault interferes with React Hook Form
<Box 
  component="form" 
  onSubmit={(e) => {
    e.preventDefault();        // ❌ React Hook Form already does this
    e.stopPropagation();       // ❌ Unnecessary and can cause issues
    handleSubmit(onSubmit)(e); // ❌ Creates timing conflicts
  }}
>

// ❌ WRONG: Missing type="button" on Cancel button
<Button onClick={onClose}>Cancel</Button>  // ❌ Defaults to type="submit" in some contexts

// ❌ WRONG: Button outside form without form attribute
<DialogActions>
  <Button type="submit">Save</Button>  // ❌ Won't submit the form
</DialogActions>
```

### Key Rules

1. **Use `handleSubmit(onSubmit)` directly** - Never manually call `preventDefault()` before React Hook Form's handler
2. **React Hook Form handles preventDefault** - The library automatically prevents default form submission
3. **Use `form` attribute for external buttons** - When submit button is in `DialogActions`, use `form="form-id"` to link it
4. **Explicit button types** - Always set `type="button"` for Cancel buttons, `type="submit"` for submit buttons
5. **No stopPropagation needed** - Not necessary for form submission and can interfere with React's event system

### When to Use Each Pattern

- **Button inside form**: Standard forms, simple dialogs where buttons can be inside `DialogContent`
- **Button outside form**: Material-UI Dialogs where `DialogActions` contains buttons (common pattern)

### Examples in Codebase

- ✅ `frontend/src/modules/ropa/components/RepositoryFormDialog.tsx` (Button outside form with `form` attribute)
- ✅ `frontend/src/pages/RegisterPage.tsx` (Button inside form)
- ✅ `frontend/src/pages/tenants/components/TenantDetailsTab.tsx` (Button inside form)

**Reference**: React Hook Form documentation, Material-UI Dialog patterns

---

## Form Submit Button Disabled State Pattern

### ⚠️ CRITICAL: Do NOT Use `isDirty` for Button Disabled State

**Decision Date**: 2025-01-04  
**Status**: Standard pattern for all ROPA forms

### The Problem We Fixed

**Issue**: Submit buttons were disabled when `!isDirty`, preventing users from saving even after making changes. This was caused by form reset logic interfering with `isDirty` state tracking.

**Root Causes**:
1. Form resets can incorrectly reset `isDirty` to `false` even after user changes
2. Complex form state management (conditional fields, restoration logic) makes `isDirty` unreliable
3. Users couldn't save forms that appeared unchanged but had valid data

### ✅ CORRECT Pattern (Standard for All Forms)

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@mui/material';

export default function MyFormDialog({ open, entity, onClose }: Props) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }, // ✅ Do NOT destructure isDirty
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { /* ... */ },
  });

  // ✅ CORRECT: Reset with keepDefaultValues: false
  React.useEffect(() => {
    if (entity) {
      reset({
        name: entity.name,
        // ... all fields
      }, { keepDefaultValues: false }); // ✅ Important for proper state management
    }
  }, [entity?.id, reset]);

  // ✅ CORRECT: Do NOT reset on close - preserve state for restoration
  const handleClose = () => {
    if (!isSubmitting) {
      // Don't reset form on close - preserve state for restoration
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      {/* Form content */}
      <DialogActions>
        <Button
          type="submit"
          form="my-form"
          variant="contained"
          disabled={isSubmitting} // ✅ Only disable when submitting
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

### ❌ INCORRECT Patterns

```typescript
// ❌ WRONG: Using isDirty in disabled condition
const { formState: { errors, isDirty } } = useForm();
<Button disabled={isSubmitting || !isDirty}> // ❌ Unreliable with complex forms

// ❌ WRONG: Resetting form on close
const handleClose = () => {
  reset(); // ❌ Clears form state, prevents restoration
  onClose();
};

// ❌ WRONG: Not using keepDefaultValues in reset
reset({ name: entity.name }); // ❌ Can cause state management issues
```

### Key Rules

1. **Never use `isDirty` for button disabled state** - Only use `isSubmitting`
2. **Do NOT destructure `isDirty`** - Remove it from `formState` destructuring
3. **Use `keepDefaultValues: false` in reset calls** - Ensures proper form state management
4. **Do NOT reset on close** - Preserve form state for suggestion restoration
5. **Add restoration effect for suggestions** - When dialog reopens, restore pending suggestions

### Why This Pattern Works

1. **Simpler state management** - No need to track dirty state manually
2. **More reliable** - Avoids issues with form resets and complex state
3. **Better UX** - Users can always save if they want to
4. **Consistent behavior** - All forms work the same way
5. **Backend efficiency** - Backend can handle unchanged data efficiently

### Examples in Codebase

✅ **All ROPA Forms Standardized:**
- `frontend/src/modules/ropa/components/RepositoryFormDialog.tsx`
  ```typescript
  disabled={isSubmitting} // ✅ No isDirty check
  formState: { errors } // ✅ No isDirty destructured
  ```
- `frontend/src/modules/ropa/components/ActivityFormDialog.tsx`
  ```typescript
  disabled={isSubmitting} // ✅ No isDirty check
  formState: { errors } // ✅ No isDirty destructured
  ```
- `frontend/src/modules/ropa/components/DataElementFormDialog.tsx` ✅
- `frontend/src/modules/ropa/components/DPIAFormDialog.tsx` ✅
- `frontend/src/modules/ropa/components/RiskFormDialog.tsx` ✅

### Checklist for New Forms

When creating or updating forms:
- [ ] Do NOT destructure `isDirty` from `formState`
- [ ] Use `disabled={isSubmitting}` only (no `!isDirty` check)
- [ ] Use `keepDefaultValues: false` in all `reset()` calls
- [ ] Do NOT call `reset()` in `handleClose()`
- [ ] Add restoration effect if form has AI suggestions

### Related Patterns

- **Form Reset Pattern**: See `frontend/REACT_HOOKS_GUIDELINES.md` - useEffect Dependencies
- **Suggestion Restoration**: See AI suggestion implementation in ROPA forms

**Reference**: This pattern was established after fixing ActivityFormDialog issues (2025-01-04)

---

## Conditional Validation Pattern (Hidden Fields)

### ⚠️ CRITICAL: Conditional Fields Must Be Cleared When Hidden

**Problem**: When a field is conditionally required (e.g., `backup_frequency` when `backup_enabled = true`), if the field is hidden and has an invalid value (like empty string `''`), validation errors occur but are invisible to the user.

**Root Cause**: 
- Enum fields with `.optional()` still validate the value if it exists
- Empty string `''` is not a valid enum value, so validation fails
- Hidden fields can't show errors, making the form appear broken

### ✅ CORRECT Pattern

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  backup_enabled: z.boolean().default(false),
  backup_frequency: z.enum(['daily', 'weekly']).optional(),
}).refine((data) => {
  // Only required when backup_enabled is true
  if (data.backup_enabled && !data.backup_frequency) {
    return false;
  }
  return true;
}, {
  message: 'Backup frequency is required when backups are enabled',
  path: ['backup_frequency'],
});

export default function MyForm() {
  const { control, watch, setValue, clearErrors } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      backup_enabled: false,
      backup_frequency: undefined, // ✅ Use undefined, not ''
    },
  });

  const backupEnabled = watch('backup_enabled');

  // ✅ CRITICAL: Clear dependent field when condition becomes false
  React.useEffect(() => {
    if (!backupEnabled) {
      // Set to undefined (not empty string) to prevent enum validation errors
      setValue('backup_frequency', undefined, { shouldValidate: false });
      clearErrors('backup_frequency');
    }
  }, [backupEnabled, setValue, clearErrors]);

  return (
    <form>
      <Switch
        checked={backupEnabled}
        onChange={(e) => setValue('backup_enabled', e.target.checked)}
      />
      {backupEnabled && (
        <FormSelect
          name="backup_frequency"
          control={control}
          label="Backup Frequency"
        />
      )}
    </form>
  );
}
```

### ❌ INCORRECT Patterns

```typescript
// ❌ WRONG: Using empty string for optional enum fields
defaultValues: {
  backup_frequency: '', // ❌ Empty string fails enum validation
}

// ❌ WRONG: Not clearing field when condition changes
// If backup_enabled changes to false, backup_frequency keeps its value
// This causes validation errors for hidden fields

// ❌ WRONG: Not using shouldValidate: false when clearing
setValue('backup_frequency', undefined); // ❌ Triggers validation immediately
```

### Key Rules

1. **Use `undefined` for optional enum fields** - Never use empty string `''` for optional enum/select fields
2. **Clear dependent fields when condition becomes false** - Use `useEffect` to watch the condition and clear the field
3. **Use `shouldValidate: false`** - When clearing fields, prevent immediate validation
4. **Clear errors explicitly** - Use `clearErrors()` to remove stale error states
5. **Watch the condition** - Use `watch()` to react to condition changes

### When to Use

- ✅ Fields that are conditionally required based on toggle/switch state
- ✅ Fields that are hidden/shown based on other field values
- ✅ Enum/select fields that are optional but required when condition is met

### Examples in Codebase

- ✅ `frontend/src/modules/ropa/components/RepositoryFormDialog.tsx`
  - `cloud_provider` when `is_cloud_based = true`
  - `backup_frequency` when `backup_enabled = true`

---

## Enum Field Validation Pattern (Material-UI Select)

### ⚠️ CRITICAL: Material-UI Select Converts null/undefined to Empty String

**Problem**: Material-UI's `FormSelect` component converts `null`/`undefined` to empty string `''` for display (`value={field.value ?? ''}`). This causes validation issues:
- Zod's `.optional()` only allows `undefined`, not `null` or `''`
- Empty string `''` is not a valid enum value
- Validation appears to be "skipped" when fields are empty

**Root Cause**: 
- Material-UI Select: `value={field.value ?? ''}` converts `null`/`undefined` → `''`
- Zod enum validation expects `undefined` (optional) or valid enum value
- Empty string `''` fails enum validation but error may not be visible

### ✅ CORRECT Pattern for Optional Enum Fields

```typescript
import { z } from 'zod';

/**
 * Preprocess function to convert empty strings to null for optional nullable fields.
 * Material-UI Select components convert null/undefined to '' for display,
 * so we need to convert '' back to null before validation.
 */
const preprocessEmptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === "null" || val == null) {
        return null;
      }
      return val;
    },
    schema
  );

const schema = z.object({
  // Optional enum field: uses preprocessEmptyToNull
  data_format: preprocessEmptyToNull(
    z.enum(['Electronic', 'Physical']).nullable().optional()
  ),
});
```

**Flow for Optional Fields:**
- Empty: `undefined` → FormSelect shows `''` → preprocess → `null` → `.nullable().optional()` → ✅ passes
- Valid value: `'Electronic'` → preprocess passes through → enum validates → ✅ passes
- Invalid value: `'InvalidValue'` → preprocess passes through → enum validates → ❌ fails

### ✅ CORRECT Pattern for Required Enum Fields

```typescript
import { z } from 'zod';

/**
 * Preprocess function to convert empty strings to undefined for required fields.
 * This ensures Zod triggers required_error instead of invalid_enum_value when field is empty.
 */
const preprocessEmptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === "null" || val == null) {
        return undefined;
      }
      return val;
    },
    schema
  );

const schema = z.object({
  // Required enum field: uses preprocessEmptyToUndefined
  data_format: preprocessEmptyToUndefined(
    z.union([
      z.enum(['Electronic', 'Physical']),
      z.undefined(),
    ]).refine(
      (val) => val !== undefined,
      { message: 'Data format is required' }
    )
  ),
});
```

**Flow for Required Fields:**
- Empty: `undefined` → FormSelect shows `''` → preprocess → `undefined` → `.refine()` → ❌ "Data format is required"
- Valid value: `'Electronic'` → preprocess passes through → enum validates → ✅ passes
- Invalid value: `'InvalidValue'` → preprocess passes through → enum validates → ❌ fails

### Form Component Usage

```typescript
// Optional field
<FormSelect
  name="transfer_mechanism"
  control={control}
  label="Transfer Mechanism"
  options={TRANSFER_MECHANISM_OPTIONS}
/>

// Required field
<FormSelect
  name="data_format"
  control={control}
  label="Data Format"
  options={DATA_FORMAT_OPTIONS}
  required  // ✅ Add required prop for required fields
/>
```

### Key Rules

1. **Optional enum fields**: Use `preprocessEmptyToNull` with `.nullable().optional()`
   - Converts `''` → `null` → passes validation (optional)
   - Still validates when value is provided

2. **Required enum fields**: Use `preprocessEmptyToUndefined` with `.union()` and `.refine()`
   - Converts `''` → `undefined` → triggers "required" error
   - Still validates when value is provided

3. **Always use preprocess**: Material-UI Select always converts `null`/`undefined` to `''`, so preprocess is always needed

4. **Validation still runs**: Preprocess only converts empty strings; actual values pass through and are validated

5. **Add `required` prop**: For required fields, add `required` prop to `FormSelect` to show required indicator (*)

### When to Use

- ✅ All enum/select fields using Material-UI `FormSelect` component
- ✅ Optional fields that can be left empty
- ✅ Required fields that must have a selection
- ✅ Fields that come from database as `null` (nullable columns)

### Examples in Codebase

- ✅ `frontend/src/modules/ropa/schemas/repositorySchema.ts`
  - Optional: `transfer_mechanism`, `derogation_type`, `cross_border_safeguards`, `certification`, `interface_type`
  - Required: `data_format` (as of 2025-01-19)

**Reference**: This pattern was established after fixing validation issues with optional nullable enum fields (2025-01-19)

---

## List Component Pattern

### ✅ CORRECT

```typescript
import * as React from 'react';
import { PageLayout } from '@/components/layout';
import { Paper, List, ListItem, CircularProgress, Alert } from '@mui/material';

export default function MyListPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getItems();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (isLoading) {
    return (
      <PageLayout maxWidth="md">
        <Box display="flex" justifyContent="center" p: 4>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout maxWidth="md">
        <Alert severity="error">{error}</Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Items</Typography>
        <List>
          {items.map((item) => (
            <ListItem key={item.id}>
              {/* Item content */}
            </ListItem>
          ))}
        </List>
      </Paper>
    </PageLayout>
  );
}
```

### WHY

- **Loading state** shows spinner while fetching
- **Error state** shows error message
- **Empty state** handled gracefully
- **PageLayout** ensures consistent layout

**Examples**: 
- ✅ `frontend/src/pages/TenantsListPage.tsx`
- ✅ `frontend/src/pages/LandingPage.tsx`

---

## Loading State Pattern

### ✅ CORRECT

```typescript
if (isLoading) {
  return (
    <PageLayout maxWidth="md">
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    </PageLayout>
  );
}
```

### ❌ INCORRECT

```typescript
// ❌ No loading state
// ❌ Shows content before data is loaded
// ❌ Causes layout shift
```

### WHY

- Prevents layout shift
- Shows user that data is loading
- Consistent loading experience

---

## Error State Pattern

### ✅ CORRECT

```typescript
if (error) {
  return (
    <PageLayout maxWidth="md">
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
      <Button onClick={handleRetry}>Retry</Button>
    </PageLayout>
  );
}
```

### ❌ INCORRECT

```typescript
// ❌ No error handling
// ❌ Crashes on error
// ❌ Poor user experience
```

### WHY

- Graceful error handling
- User-friendly error messages
- Option to retry

---

## Paper Component Pattern

### ✅ CORRECT

```typescript
<PageLayout maxWidth="md">
  <Paper sx={{ p: 4 }}>
    {/* Content */}
  </Paper>
</PageLayout>
```

### ❌ INCORRECT

```typescript
<PageLayout maxWidth="md">
  <Paper sx={{ maxWidth: 600, p: 4 }}>  // ❌ Nested width constraint
    {/* Content */}
  </Paper>
</PageLayout>
```

### WHY

- **PageLayout** already handles width
- **Nested maxWidth** creates inconsistent widths
- **Only padding** needed on Paper (`p: 4`)

---

## Notification Pattern

### ✅ CORRECT - Using Centralized Notification System

```typescript
import * as React from 'react';
import { useNotification } from '../../../contexts';
import { updateResource } from '../../../services/resourceApi';

export default function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  const handleSave = async (data: FormData) => {
    try {
      await updateResource(id, data);
      showSuccess('Resource updated successfully!');
    } catch (err: any) {
      const errorMessage = err?.message || err?.detail || 'Failed to update resource';
      showError(errorMessage);
    }
  };

  return (
    <Box>
      {/* Component content - no Alert/Snackbar components needed */}
    </Box>
  );
}
```

### ❌ INCORRECT - Local Notification State

```typescript
// ❌ WRONG: Managing notifications locally
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

### WHY

- **Centralized system** ensures consistent behavior across the app
- **Material-UI Snackbar + Alert pattern** (official MUI recommendation)
- **Consistent positioning** (bottom-center)
- **Auto-hide durations** configured per severity
- **No code duplication** - single notification component
- **Simple API** - just call `showSuccess()`, `showError()`, etc.

### Notification Methods

```typescript
const { showSuccess, showError, showWarning, showInfo } = useNotification();

// Success messages (auto-hide after 6 seconds)
showSuccess('Settings saved successfully!');

// Error messages (auto-hide after 8 seconds, prevents clickaway dismissal)
showError('Failed to save settings');

// Warning messages (auto-hide after 7 seconds)
showWarning('This action cannot be undone');

// Info messages (auto-hide after 6 seconds)
showInfo('Processing your request...');
```

### When to Use Notifications

- ✅ **Success notifications**: After successful save/create/update/delete operations
- ✅ **Error notifications**: API failures, network errors, validation errors
- ✅ **Warning notifications**: Non-critical warnings, confirmations
- ✅ **Info notifications**: Processing states, helpful information

### When NOT to Use Notifications

- ❌ **Form validation errors**: Use inline `Alert` components in forms
- ❌ **Critical system errors**: Use inline `Alert` for persistent errors
- ❌ **Redirects on success**: Pages that redirect immediately don't need success notifications

### Examples in Codebase

- ✅ `frontend/src/pages/tenants/components/TenantSettingsTab.tsx`
- ✅ `frontend/src/pages/tenants/components/TenantDetailsTab.tsx`
- ✅ `frontend/src/pages/tenants/components/TenantMembersTab.tsx`
- ✅ `frontend/src/components/booking/BookingForm.tsx`

**Reference**: `frontend/src/contexts/NotificationContext.tsx`

---

## Date Navigation Pattern (Clickable Date with Arrows)

### ✅ CORRECT

```typescript
import * as React from 'react';
import { Box, IconButton, Typography, Stack } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';

export default function DateNavigationExample() {
  const [selectedDate, setSelectedDate] = React.useState<Dayjs | null>(dayjs());
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  const handlePreviousDay = () => {
    if (selectedDate) {
      setSelectedDate(selectedDate.subtract(1, 'day'));
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      setSelectedDate(selectedDate.add(1, 'day'));
    }
  };

  return (
    <Stack spacing={1.5}>
      {/* Hidden DatePicker - controlled by clicking the date text below */}
      <Box sx={{ display: 'none' }}>
        <DatePicker
          label="Select Date"
          value={selectedDate}
          onChange={setSelectedDate}
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          onOpen={() => setDatePickerOpen(true)}
        />
      </Box>

      {/* Clickable date display with arrow navigation */}
      {selectedDate && (
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <IconButton onClick={handlePreviousDay} aria-label="Previous day">
            <ArrowBackIcon />
          </IconButton>

          <Box
            textAlign="center"
            flex={1}
            onClick={() => setDatePickerOpen(true)}
            sx={{
              cursor: 'pointer',
              py: 1,
              borderRadius: 1,
              transition: 'background-color 0.2s',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
              <CalendarTodayIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="h6" component="div">
                {selectedDate.format('dddd, MMMM D')}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              5 available, 4 booked
            </Typography>
          </Box>

          <IconButton onClick={handleNextDay} aria-label="Next day">
            <ArrowForwardIcon />
          </IconButton>
        </Box>
      )}
    </Stack>
  );
}
```

### ❌ INCORRECT

```typescript
// ❌ Visible DatePicker field takes up space
<DatePicker
  label="Select Date"
  value={selectedDate}
  onChange={setSelectedDate}
  fullWidth
/>

// ❌ No arrow navigation for quick day-by-day browsing
// ❌ No visual calendar icon to indicate clickability
// ❌ No availability stats
```

### WHY

- **Hidden DatePicker** - Opens modal calendar only when needed, saves space
- **Clickable date text** - Large touch target, calendar icon indicates interactivity
- **Arrow navigation** - Quick day-by-day browsing (most common use case)
- **Hover effect** - Clear visual feedback that date is clickable
- **Availability stats** - Helpful context without opening calendar
- **Mobile-friendly** - Large, centered touch targets

### When to Use

- ✅ Booking/appointment interfaces with day-by-day navigation
- ✅ Schedule/calendar views where users browse nearby dates
- ✅ When space is limited and DatePicker field seems too prominent

### When NOT to Use

- ❌ Simple forms where date selection is rare (use standard DatePicker)
- ❌ Date range selection (arrows don't work well for ranges)
- ❌ When users need to jump to distant dates frequently (standard DatePicker better)

### Examples in Codebase

- ✅ `frontend/src/components/booking/BookingForm.tsx`
- ✅ `frontend/src/components/booking/AppointmentManagementForm.tsx`

---

## Background Data Refresh Pattern (Skip Loading State)

### ⚠️ CRITICAL: Prevent Full-Page Spinner on Background Refreshes

**Problem**: When refreshing data after form submission or delete operations, setting `isLoading(true)` causes the entire page to be replaced with a loading spinner, making it look like a full page reload.

**Root Cause**: 
- Data fetch functions typically set `isLoading(true)` for all operations
- Page render logic checks `if (isLoading)` and shows full-page spinner
- Background refreshes (after save/delete) don't need full-page spinner
- Users see a jarring "page reload" experience

### ✅ CORRECT Pattern

```typescript
import * as React from 'react';

export default function MyPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // ✅ Add skipLoading parameter for background refreshes
  const fetchData = React.useCallback(async (skipLoading = false): Promise<Item[]> => {
    if (!tenantId) {
      setIsLoading(false);
      return [];
    }

    try {
      // ✅ Only set loading state for initial loads, not background refreshes
      if (!skipLoading) {
        setIsLoading(true);
      }
      setError(null);

      const data = await apiGetItems(tenantId);
      setItems(data);
      return data;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load data';
      setError(errorMessage);
      showError(errorMessage);
      return [];
    } finally {
      // ✅ Only clear loading state if we set it
      if (!skipLoading) {
        setIsLoading(false);
      }
    }
  }, [tenantId, showError]);

  // Handle form submission success
  const handleFormSuccess = async () => {
    // ✅ Use skipLoading=true for background refresh
    await fetchData(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteItem(id);
    // ✅ Use skipLoading=true for background refresh
    await fetchData(true);
  };

  // Initial load
  React.useEffect(() => {
    fetchData(); // ✅ No parameter = shows loading spinner
  }, [fetchData]);

  // ✅ Render logic
  if (isLoading) {
    return <CircularProgress />; // Full-page spinner only on initial load
  }

  return (
    <Box>
      {/* Content */}
    </Box>
  );
}
```

### ❌ INCORRECT Pattern

```typescript
// ❌ WRONG: Always sets isLoading, causing full-page spinner on refresh
const fetchData = async () => {
  setIsLoading(true); // ❌ Always sets loading state
  const data = await apiGetItems();
  setItems(data);
  setIsLoading(false);
};

// ❌ WRONG: Background refresh triggers full-page spinner
const handleFormSuccess = async () => {
  await fetchData(); // ❌ Shows full-page spinner unnecessarily
};
```

### Key Rules

1. **Add `skipLoading` parameter** - Default to `false` for backward compatibility
2. **Conditional loading state** - Only set `isLoading(true)` when `skipLoading` is `false`
3. **Conditional cleanup** - Only clear `isLoading(false)` in `finally` if it was set
4. **Initial load** - Call `fetchData()` without parameter to show spinner
5. **Background refresh** - Call `fetchData(true)` to skip loading state

### When to Use

- ✅ **Initial page load**: `fetchData()` - Shows full-page spinner
- ✅ **After form submission**: `fetchData(true)` - Background refresh, no spinner
- ✅ **After delete operation**: `fetchData(true)` - Background refresh, no spinner
- ✅ **Manual refresh button**: `fetchData(true)` - Background refresh, no spinner

### Examples in Codebase

- ✅ `frontend/src/modules/ropa/pages/ROPAPage.tsx`
  - `fetchROPAData(skipLoading)` - Handles both initial load and background refresh
  - `handleDialogSuccess()` - Calls `fetchROPAData(true)` after form submission
  - `handleDeleteRepository()` - Calls `fetchROPAData(true)` after delete

---

## Loading Overlay Pattern (Details Panel Refresh)

### ⚠️ CRITICAL: Show Loading Feedback During Background Refreshes

**Problem**: When data refreshes in the background (after form submission), the details panel shows stale data for 1-3 seconds before updating. Users don't know if the update succeeded or if the page is broken.

**Solution**: Show a loading overlay with spinner on the details panel while data is refreshing.

### ✅ CORRECT Pattern

```typescript
import * as React from 'react';
import { Card, CardContent, Box, CircularProgress } from '@mui/material';

interface DetailsPanelProps {
  data: Item | null;
  isRefreshing?: boolean; // ✅ Add refreshing state prop
}

export default function DetailsPanel({ data, isRefreshing = false }: DetailsPanelProps) {
  if (!data) {
    return <Card>No data available</Card>;
  }

  return (
    <Card variant="outlined" sx={{ height: '100%', position: 'relative' }}>
      {/* ✅ Loading Overlay */}
      {isRefreshing && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            borderRadius: 1,
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}
      
      {/* ✅ Content with opacity transition */}
      <CardContent sx={{ opacity: isRefreshing ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* Panel content */}
        <Typography variant="h6">{data.name}</Typography>
        {/* ... more fields ... */}
      </CardContent>
    </Card>
  );
}
```

### Parent Component Pattern

```typescript
export default function MyPage() {
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleFormSuccess = async () => {
    const selectedItemId = selectedItem?.id;
    
    // ✅ Set refreshing state before refresh
    setIsRefreshing(true);
    
    try {
      // Refresh data (skipLoading=true to avoid full-page spinner)
      const newItems = await fetchData(true);
      
      // Update selected item with fresh data
      if (selectedItemId) {
        const updatedItem = newItems.find(item => item.id === selectedItemId);
        if (updatedItem) {
          setSelectedItem(updatedItem);
        }
      }
    } finally {
      // ✅ Always clear refreshing state, even on error
      setIsRefreshing(false);
    }
  };

  return (
    <Box>
      <DetailsPanel 
        data={selectedItem} 
        isRefreshing={isRefreshing} // ✅ Pass refreshing state
      />
    </Box>
  );
}
```

### ❌ INCORRECT Patterns

```typescript
// ❌ WRONG: No loading feedback during refresh
const handleFormSuccess = async () => {
  await fetchData(true); // ❌ User sees stale data for 1-3 seconds
  // No visual feedback that refresh is happening
};

// ❌ WRONG: Full-page spinner on refresh
const handleFormSuccess = async () => {
  setIsLoading(true); // ❌ Shows full-page spinner unnecessarily
  await fetchData();
  setIsLoading(false);
};

// ❌ WRONG: No try/finally - refreshing state might not clear on error
const handleFormSuccess = async () => {
  setIsRefreshing(true);
  await fetchData(true); // ❌ If this throws, isRefreshing stays true forever
  setIsRefreshing(false);
};
```

### Key Rules

1. **Add `isRefreshing` prop** - Optional boolean, defaults to `false`
2. **Use absolute positioning** - Overlay covers entire card/panel
3. **Semi-transparent background** - `rgba(255, 255, 255, 0.7)` keeps content visible
4. **Dim content** - Set opacity to 0.5 during refresh for visual feedback
5. **Smooth transition** - Use `transition: 'opacity 0.2s'` for smooth fade
6. **Always clear state** - Use `try/finally` to ensure `isRefreshing` is cleared
7. **Centered spinner** - Use flexbox to center `CircularProgress`

### Visual Design

- **Overlay**: Semi-transparent white (`rgba(255, 255, 255, 0.7)`)
- **Spinner**: `CircularProgress` size 40px, centered
- **Content**: Dimmed to 50% opacity during refresh
- **Transition**: 0.2s opacity transition for smooth fade
- **Z-index**: 1 to appear above content

### When to Use

- ✅ **After form submission** - Show overlay while refreshing details panel
- ✅ **After delete operation** - Show overlay if panel needs to update
- ✅ **Manual refresh** - Show overlay when user triggers refresh
- ❌ **Initial load** - Use full-page spinner, not overlay
- ❌ **Fast operations** - If refresh is < 200ms, overlay might flash unnecessarily

### Examples in Codebase

- ✅ `frontend/src/modules/ropa/components/ROPADetailsPanel.tsx`
  - Accepts `isRefreshing` prop
  - Shows overlay with spinner during refresh
  - Dims content to 50% opacity
- ✅ `frontend/src/modules/ropa/pages/ROPAPage.tsx`
  - Manages `isRefreshing` state
  - Sets `isRefreshing(true)` before refresh
  - Clears in `finally` block

---

## Component Checklist

Before creating a new component:

- [ ] Uses `PageLayout` (not `Container` directly)
- [ ] Uses correct `maxWidth` ("md" for main, "xs" for auth)
- [ ] No nested `maxWidth` constraints
- [ ] Uses `Paper` with `p: 4` padding (no width constraints)
- [ ] Handles loading state
- [ ] Handles error state
- [ ] Uses React Hook Form for forms
- [ ] Uses `entity?.id` in useEffect dependencies (not `entity`)
- [ ] Uses centralized notification system (`useNotification`) for success/error messages
- [ ] Build succeeds (`npm run build`)

### For Forms in Dialogs:

- [ ] Uses `handleSubmit(onSubmit)` directly (no manual `preventDefault()`)
- [ ] Submit button has `type="submit"` and `form="form-id"` if outside form
- [ ] Cancel button has `type="button"` explicitly set
- [ ] Conditional fields cleared when condition becomes false
- [ ] Optional enum fields use `undefined`, not empty string `''`

### For Data Refresh After Form Submission:

- [ ] Fetch function has `skipLoading` parameter for background refreshes
- [ ] Initial load calls `fetchData()` (shows spinner)
- [ ] Background refresh calls `fetchData(true)` (no full-page spinner)
- [ ] Details panel shows loading overlay during refresh (`isRefreshing` prop)
- [ ] `isRefreshing` state cleared in `finally` block

---

---

## AI Suggestion Field Pattern

### ✅ CORRECT - Complete Pattern with Metadata Integration

The AI suggestion system now uses backend metadata to provide better suggestions. Metadata includes field descriptions, examples, and AI hints that are automatically included in AI prompts.

```typescript
import FormFieldWithSuggestion from './FormFieldWithSuggestion';
import { useSuggestionJob } from '../hooks/useSuggestionJob';

export default function MyFormDialog({ open, onClose, entity, tenantId }) {
  // Initialize suggestion job hook
  const suggestionJob = useSuggestionJob({
    tenantId,
    entityType: 'activity', // 'repository', 'activity', 'data_element', 'dpia', 'risk'
    entityId: entity?.id || null,
    enabled: open && !!entity?.id, // Only enable when dialog is open and entity exists
  });

  // Restore suggestion jobs when dialog opens (if editing existing entity)
  // Use ref pattern to avoid unnecessary re-triggers
  const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
  restoreJobsRef.current = suggestionJob.restoreJobs;

  React.useEffect(() => {
    if (open && entity?.id && restoreJobsRef.current) {
      const timer = setTimeout(() => {
        restoreJobsRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, entity?.id]); // ✅ Only depends on open and entity ID

  return (
    <FormFieldWithSuggestion
      name="description"
      control={control}
      label="Description"
      fieldType="textarea" // 'text', 'textarea', 'multiline', 'select'
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
            'description',        // Field name (must match metadata)
            'text',              // Field type
            'Description',       // Field label
            formData.description || '', // Current value
            formData            // All form data for context
          );
        } catch (err) {
          // Error already shown by hook
        }
      }}
      onAccept={(suggestion) => {
        if (Array.isArray(suggestion)) {
          // Multiple suggestions - join with newlines
          const joined = suggestion.join('\n\n');
          setValue('description', joined, { shouldValidate: true });
        } else if (typeof suggestion === 'string') {
          // Single suggestion
          setValue('description', suggestion, { shouldValidate: true });
        }
      }}
      onDismiss={() => {
        suggestionJob.clearJobStatus('description');
      }}
    />
  );
}
```

### Key Rules:

1. **Edit mode only**: Suggestions only appear when `isEditMode && entity?.id` is true
2. **Initialize hook**: Only when dialog is open and entity exists
3. **Restore jobs**: Call `suggestionJob.restoreJobs()` when dialog opens (with delay)
4. **Job status**: Derive `isSuggesting` from job status
5. **Field name**: Must match field name in backend metadata
6. **Metadata**: Backend automatically includes metadata in AI prompts

### Supported Entity Types:

- `'repository'` - Repository entities (22 fields with suggestions)
- `'activity'` - Activity entities (8 fields with suggestions)
- `'data_element'` - DataElement entities (6 fields with suggestions)
- `'dpia'` - DPIA entities (4 fields with suggestions)
- `'risk'` - Risk entities (4 fields with suggestions)

### Field Types:

- `'text'`: Single-line text input
- `'textarea'`: Multi-line text input (3 rows)
- `'multiline'`: Multi-line text input (4 rows)
- `'select'`: Dropdown select (requires `selectOptions` prop)
- `'multiselect'`: Multi-select field (requires custom children)

### Select Field Label Mapping (2026-01-18)

For select fields, the AI returns raw enum values (e.g., `"cloud_storage"`), but the UI should display human-readable labels (e.g., `"Cloud Storage"`). This is handled automatically by `FormFieldWithSuggestion` and `SuggestionDisplay`:

**Key Points**:
- ✅ Pass `selectOptions` prop to `FormFieldWithSuggestion` - enables automatic label mapping
- ✅ `SuggestionDisplay` maps values to labels for display
- ✅ Raw enum values are preserved for form submission (correct for validation)
- ✅ Works automatically - no additional code needed in form dialogs

**Example**:
```typescript
const REPOSITORY_TYPE_OPTIONS = [
  { value: 'cloud_storage', label: 'Cloud Storage' },
  // ...
];

<FormFieldWithSuggestion
  fieldType="select"
  selectOptions={REPOSITORY_TYPE_OPTIONS} // ✅ Required for label mapping
  // ... other props
/>
```

**How It Works**:
- AI returns: `"cloud_storage"` (raw enum value)
- Display shows: `"Cloud Storage"` (human-readable label)
- Form receives: `"cloud_storage"` (raw enum value - correct for form)

### Examples in Codebase:

- ✅ `RepositoryFormDialog.tsx` - 14 text fields + 8 select fields with label mapping
- ✅ `ActivityFormDialog.tsx` - 8 fields with suggestions (text fields only, select fields coming soon)
- ✅ `DataElementFormDialog.tsx` - 6 fields with suggestions
- ✅ `DPIAFormDialog.tsx` - 4 fields with suggestions
- ✅ `RiskFormDialog.tsx` - 4 fields with suggestions

### Metadata Integration:

The backend automatically:
1. Fetches metadata for the field based on entity type
2. Includes field description in AI prompt
3. Includes example values in AI prompt
4. Includes AI hints/guidance in AI prompt
5. Builds hierarchical context from parent entities

No additional frontend code needed - metadata is handled automatically by the backend.

**See**: `ROPA_AI_SUGGESTIONS.md` for complete documentation of the AI suggestion system.

---

---

## AI Suggestion Field Pattern (Enhanced)

### Complete Pattern with Metadata Integration

The AI suggestion system now uses backend metadata to provide better suggestions. Metadata includes field descriptions, examples, and AI hints that are automatically included in AI prompts.

### ✅ CORRECT - Full Pattern

```typescript
import FormFieldWithSuggestion from './FormFieldWithSuggestion';
import { useSuggestionJob } from '../hooks/useSuggestionJob';

export default function MyFormDialog({ open, onClose, entity, tenantId }) {
  // Initialize suggestion job hook
  const suggestionJob = useSuggestionJob({
    tenantId,
    entityType: 'activity', // 'repository', 'activity', 'data_element', 'dpia', 'risk'
    entityId: entity?.id || null,
    enabled: open && !!entity?.id, // Only enable when dialog is open and entity exists
  });

  // Restore suggestion jobs when dialog opens (if editing existing entity)
  // Use ref pattern to avoid unnecessary re-triggers
  const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
  restoreJobsRef.current = suggestionJob.restoreJobs;

  React.useEffect(() => {
    if (open && entity?.id && restoreJobsRef.current) {
      const timer = setTimeout(() => {
        restoreJobsRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, entity?.id]); // ✅ Only depends on open and entity ID

  return (
    <FormFieldWithSuggestion
      name="description"
      control={control}
      label="Description"
      fieldType="textarea" // 'text', 'textarea', 'multiline', 'select'
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
            'description',        // Field name (must match metadata)
            'text',              // Field type
            'Description',       // Field label
            formData.description || '', // Current value
            formData            // All form data for context
          );
        } catch (err) {
          // Error already shown by hook
        }
      }}
      onAccept={(suggestion) => {
        if (Array.isArray(suggestion)) {
          // Multiple suggestions - join with newlines
          const joined = suggestion.join('\n\n');
          setValue('description', joined, { shouldValidate: true });
        } else if (typeof suggestion === 'string') {
          // Single suggestion
          setValue('description', suggestion, { shouldValidate: true });
        }
      }}
      onDismiss={() => {
        suggestionJob.clearJobStatus('description');
      }}
    />
  );
}
```

### Key Rules:

1. **Edit mode only**: Suggestions only appear when `isEditMode && entity?.id` is true
2. **Initialize hook**: Only when dialog is open and entity exists
3. **Restore jobs**: Call `suggestionJob.restoreJobs()` when dialog opens (with delay)
4. **Job status**: Derive `isSuggesting` from job status
5. **Field name**: Must match field name in backend metadata
6. **Metadata**: Backend automatically includes metadata in AI prompts

### Supported Entity Types:

- `'repository'` - Repository entities
- `'activity'` - Activity entities
- `'data_element'` - DataElement entities
- `'dpia'` - DPIA entities
- `'risk'` - Risk entities

### Field Types:

- `'text'`: Single-line text input
- `'textarea'`: Multi-line text input (3 rows)
- `'multiline'`: Multi-line text input (4 rows)
- `'select'`: Dropdown select (requires `selectOptions` prop)
- `'multiselect'`: Multi-select field (requires custom children)

### Examples in Codebase:

- ✅ `RepositoryFormDialog.tsx` - 14 fields with suggestions
- ✅ `ActivityFormDialog.tsx` - 8 fields with suggestions
- ✅ `DataElementFormDialog.tsx` - 6 fields with suggestions
- ✅ `DPIAFormDialog.tsx` - 4 fields with suggestions
- ✅ `RiskFormDialog.tsx` - 4 fields with suggestions

### Metadata Integration:

The backend automatically:
1. Fetches metadata for the field based on entity type
2. Includes field description in AI prompt
3. Includes example values in AI prompt
4. Includes AI hints/guidance in AI prompt
5. Builds hierarchical context from parent entities

No additional frontend code needed - metadata is handled automatically by the backend.

---

**Last Updated**: 2026-01-11







