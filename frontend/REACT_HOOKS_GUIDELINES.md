# React Hooks Best Practices

## useEffect Dependency Arrays - CRITICAL PATTERN

### The Problem We Fixed

**Issue:** Form inputs were being reset while typing, preventing users from editing values.

**Root Cause:** useEffect dependency array included entire object instead of primitive ID.

### ❌ WRONG Pattern (Causes Bugs)

```typescript
React.useEffect(() => {
  if (tenant) {
    reset({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      slug: tenant.slug || '',
      domain: tenant.domain || '',
      subscription_tier: tenant.subscription_tier as 'free' | 'pro' | 'enterprise',
    });
  }
}, [tenant, reset]); // ❌ Resets on every object reference change
```

**Why This Fails:**
- Parent component updates tenant object → new reference
- useEffect sees "new" tenant → calls reset()
- Form values get overwritten while user is typing
- User cannot edit fields

### ✅ CORRECT Pattern (Fixed)

```typescript
React.useEffect(() => {
  if (tenant) {
    reset({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      slug: tenant.slug || '',
      domain: tenant.domain || '',
      subscription_tier: tenant.subscription_tier as 'free' | 'pro' | 'enterprise',
    });
  }
}, [tenant?.id, reset]); // ✅ Only resets when switching tenants
```

**Why This Works:**
- Only resets when tenant ID actually changes (switching tenants)
- Ignores object reference changes (same tenant, updated data)
- User can type without interruption

### When to Use Each Pattern

| Scenario | Dependency Array | Example |
|----------|------------------|---------|
| Reset form when entity changes | `[entity?.id, reset]` | TenantDetailsTab, TenantSettingsTab |
| React to specific property | `[entity.property, reset]` | Settings changes |
| React to ALL changes | `[entity, reset]` | Rare - usually wrong |

### Examples in Codebase

✅ **Correct Implementation:**
- `frontend/src/pages/tenants/components/TenantSettingsTab.tsx` (line 93)
  ```typescript
  }, [tenant?.id, reset]); // Only reset when tenant ID changes, not when object reference changes
  ```
- `frontend/src/pages/tenants/components/TenantDetailsTab.tsx` (line 68)
  ```typescript
  }, [tenant?.id, reset]); // Only reset when tenant ID changes, not when object reference changes
  ```

### Checklist for New Forms

When creating forms that reset from props:
- [ ] Use `entity?.id` in dependency array (not `entity`)
- [ ] Add comment explaining why: `// Only reset when entity ID changes, not when object reference changes`
- [ ] Test typing in fields - should not reset while typing
- [ ] Verify form resets when switching to different entity

### Common Mistakes

1. **Using entire object**: `[tenant, reset]` ❌
   - **Problem**: Resets on every object reference change
   - **Fix**: Use `[tenant?.id, reset]`

2. **Missing optional chaining**: `[tenant.id, reset]` ❌
   - **Problem**: Fails if tenant is null/undefined
   - **Fix**: Use `[tenant?.id, reset]`

3. **Forgetting reset function**: `[tenant?.id]` ❌
   - **Problem**: ESLint will warn about missing dependency
   - **Fix**: Include `reset` in array: `[tenant?.id, reset]`

4. **Using nested properties**: `[tenant.settings, reset]` ❌
   - **Problem**: Still causes resets on object reference changes
   - **Fix**: Use specific property or ID: `[tenant?.id, reset]`

### ESLint Help

The `react-hooks/exhaustive-deps` rule should warn about missing dependencies, but it won't catch the "object vs ID" pattern. Always manually verify dependency arrays follow this pattern.

### Testing the Pattern

To verify your form doesn't have this bug:

1. **Open the form in edit mode**
2. **Start typing in a field**
3. **Trigger a parent component update** (e.g., save another field, navigate)
4. **Verify**: The field you're typing in should NOT reset
5. **Switch to a different entity** (different ID)
6. **Verify**: The form SHOULD reset with new entity data

### Related Patterns

#### React Hook Form Integration
```typescript
const { control, handleSubmit, reset } = useForm<FormData>({
  defaultValues: {
    name: entity.name,
    // ...
  },
});

// ✅ Correct: Reset only when entity ID changes
React.useEffect(() => {
  if (entity) {
    reset({
      name: entity.name,
      // ...
    });
  }
}, [entity?.id, reset]);
```

#### With Multiple Entities
```typescript
// ✅ Correct: Track both entity IDs
React.useEffect(() => {
  if (tenant && user) {
    reset({
      tenantName: tenant.name,
      userName: user.name,
    });
  }
}, [tenant?.id, user?.id, reset]);
```

#### When You Actually Need All Changes
```typescript
// ⚠️ Rare case: Only use [entity, reset] if you truly need to react to ALL property changes
// Usually this is wrong - prefer specific properties or ID
React.useEffect(() => {
  // This runs on EVERY object reference change
  // Only use if you have a specific reason
}, [entity, reset]);
```

### Summary

**Golden Rule**: When resetting forms from props, always use `[entity?.id, reset]` instead of `[entity, reset]`. This ensures the form only resets when switching to a different entity, not when the same entity's object reference changes.

---

**Last Updated**: 2025-12-28
**Maintained By**: Development Team





















