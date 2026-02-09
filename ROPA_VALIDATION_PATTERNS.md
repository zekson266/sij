# ROPA Enum Field Validation Patterns

**Date**: 2025-01-19  
**Status**: Active - Use these patterns for all enum/select fields

---

## Overview

Material-UI's `FormSelect` component converts `null`/`undefined` to empty string `''` for display. This requires special handling in Zod validation schemas to ensure proper validation behavior for both optional and required enum fields.

---

## Pattern 1: Optional Enum Fields

**Use when**: Field can be left empty (nullable in database, optional in form)

```typescript
import { z } from 'zod';

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
  // Optional enum field
  transfer_mechanism: preprocessEmptyToNull(
    z.enum(['Adequacy', 'Privacy Shield', 'BCR', 'Contract', 'Derogation'])
      .nullable()
      .optional()
  ),
});
```

**Behavior:**
- Empty field: `''` → `null` → ✅ passes (optional)
- Valid value: `'Adequacy'` → passes through → ✅ validates
- Invalid value: `'Invalid'` → passes through → ❌ fails validation

---

## Pattern 2: Required Enum Fields

**Use when**: Field must have a selection (required in form)

```typescript
import { z } from 'zod';

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
  // Required enum field
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

**Behavior:**
- Empty field: `''` → `undefined` → `.refine()` → ❌ "Data format is required"
- Valid value: `'Electronic'` → passes through → ✅ validates
- Invalid value: `'Invalid'` → passes through → ❌ fails validation

---

## Form Component Usage

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
  required  // ✅ Add required prop
/>
```

---

## Key Rules

1. **Always use preprocess**: Material-UI Select always converts `null`/`undefined` to `''`
2. **Optional fields**: Use `preprocessEmptyToNull` with `.nullable().optional()`
3. **Required fields**: Use `preprocessEmptyToUndefined` with `.union()` and `.refine()`
4. **Validation still runs**: Preprocess only converts empty strings; actual values are validated
5. **Add `required` prop**: For required fields, add `required` prop to `FormSelect`

---

## Current Implementation

**Repository Form** (`frontend/src/modules/ropa/schemas/repositorySchema.ts`):

- **Required**: `data_format` (uses `preprocessEmptyToUndefined`)
- **Optional**: `transfer_mechanism`, `derogation_type`, `cross_border_safeguards`, `certification`, `interface_type` (use `preprocessEmptyToNull`)

---

## References

- `frontend/COMPONENT_PATTERNS.md` - Enum Field Validation Pattern (detailed examples)
- `ROPA_BEST_PRACTICES.md` - Validation Rules section
- `frontend/src/modules/ropa/schemas/repositorySchema.ts` - Reference implementation

---

**Last Updated**: 2025-01-19
