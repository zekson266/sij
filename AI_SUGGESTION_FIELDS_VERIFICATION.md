# AI Suggestion Fields Verification

## Fields with AI Suggestions Enabled

All fields below have AI suggestion support via `FormFieldWithSuggestion` component. They only show the "Suggest" button in **edit mode** (when `isEditMode && repository?.id` is true).

### ✅ Verified Fields

1. **data_repository_name** (Repository Name)
   - Type: `text`
   - Required: ✅ Yes
   - Location: Basic Information accordion
   - Status: ✅ Working

2. **data_repository_description** (Description)
   - Type: `textarea`
   - Required: No
   - Location: Basic Information accordion
   - Status: ✅ Working

3. **external_vendor** (Vendor/Provider)
   - Type: `text`
   - Required: No
   - Location: Basic Information accordion
   - Status: ✅ Working

4. **dpa_url** (Data Processing Agreement URL)
   - Type: `text`
   - Required: No
   - Location: Compliance & Certification accordion
   - Status: ✅ Working

5. **status** (Status)
   - Type: `select`
   - Required: ✅ Yes (for create)
   - Location: Basic Information accordion
   - Status: ✅ Working

## Common Issues to Check

### If a field is not showing the Suggest button:

1. **Is the form in edit mode?**
   - AI suggestions only work when editing an existing repository
   - Check: `isEditMode && repository?.id` must be true

2. **Is the field conditionally hidden?**
   - Some fields are only rendered in edit mode or within accordions
   - Make sure the field section is visible

3. **Is the accordion expanded?**
   - Fields are inside accordions - make sure the accordion is expanded

4. **Check browser console for errors**
   - Look for JavaScript errors that might prevent rendering

### If suggestions are not appearing:

1. **Check job status**
   - Verify `suggestionJob.getJobStatus('fieldName')` returns a valid status
   - Status should be: `pending`, `processing`, `completed`, or `failed`

2. **Check network requests**
   - Verify API calls to `/suggest-field/jobs` are successful
   - Check for 422 or other errors

3. **Verify repository ID exists**
   - The hook needs `repositoryId` to work properly
   - Check: `useSuggestionJob({ tenantId, repositoryId: repository?.id || null, enabled: ... })`

## Recent Fixes

- ✅ Updated repository suggestion field names to current schema
- ✅ Kept suggestion handling type-safe for text vs select fields

## Testing Checklist

For each field, verify:
- [ ] Suggest button appears in edit mode
- [ ] Suggest button shows loading state when clicked
- [ ] Suggestions appear after job completes
- [ ] "Accept" button fills the field correctly
- [ ] For multiselect: "Accept All" adds all suggestions
- [ ] Job status persists after form close/reopen








