# ROPA Module - Best Practices Reference

**Date:** 2026-01-03  
**Purpose:** Best practices for GDPR compliance, React, FastAPI, and Material UI in ROPA context

---

## Table of Contents

1. [GDPR Compliance Best Practices](#gdpr-compliance-best-practices)
2. [React Best Practices](#react-best-practices)
3. [FastAPI Best Practices](#fastapi-best-practices)
4. [Material UI Best Practices](#material-ui-best-practices)
5. [ROPA-Specific Patterns](#ropa-specific-patterns)

---

## GDPR Compliance Best Practices

### 1. Record of Processing Activities (ROPA) Requirements

**Article 30 Requirements:**
- ✅ Document all processing activities
- ✅ Include purpose of processing
- ✅ Document data categories and data subjects
- ✅ Record recipients of data (internal/external)
- ✅ Document international transfers
- ✅ Record retention periods
- ✅ Document security measures
- ✅ Include legal basis for processing

**Best Practices:**
1. **Data Minimization:** Only collect fields necessary for GDPR compliance
2. **Accuracy:** Implement validation to ensure data accuracy
3. **Completeness:** All required fields must be documented
4. **Audit Trail:** Maintain timestamps (created_at, updated_at) for all records
5. **Access Control:** Ensure tenant isolation (all entities scoped to tenant)

### 2. Data Protection Impact Assessment (DPIA) Requirements

**When DPIA is Required:**
- Systematic and extensive evaluation of personal aspects
- Automated processing with legal/significant effects
- Large-scale processing of special categories
- Systematic monitoring of publicly accessible areas

**DPIA Must Include:**
- ✅ Necessity and proportionality assessment
- ✅ Risk assessment (severity, likelihood)
- ✅ Mitigation measures
- ✅ Consultation with DPO
- ✅ Supervisory authority consultation (if required)

**Best Practices:**
1. **Risk Levels:** Use consistent severity/likelihood scales
2. **Inherent vs Residual Risk:** Track both before and after mitigation
3. **Risk Acceptance:** Document when risks are accepted
4. **Status Tracking:** Track DPIA status (draft, in_review, approved, rejected)

### 3. Processing Activity Documentation

**Required Fields:**
- Processing activity name and description
- Purpose of processing
- Legal basis (Article 6 GDPR)
- Business function and owner
- Processing operations and systems
- Data locations (geographic)
- Degree of automation
- Use of profiling
- Storage and retention
- Deletion methods
- Access controls
- Recipients (internal/external)
- International transfers

**Best Practices:**
1. **Context Awareness:** Activity should know its Repository context
2. **Hierarchical Structure:** Repository → Activity → Data Elements/DPIAs
3. **Completeness:** All fields should be optional but encouraged
4. **Validation:** Validate legal basis, retention periods, etc.

---

## React Best Practices

### 1. Form Management with React Hook Form

**Pattern (from RepositoryFormDialog):**
```typescript
const {
  control,
  handleSubmit,
  reset,
  watch,
  setValue,
  setError,
  clearErrors,
  formState: { errors }, // ✅ Do NOT include isDirty - use disabled={isSubmitting} only
} = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: React.useMemo(() => {
    // Edit mode: populate from entity
    // Create mode: default values
  }, [entity?.id]), // ✅ Use entity?.id, not entity
});
```

**Best Practices:**
1. ✅ **Use React Hook Form** - Better performance than controlled components
2. ✅ **Zod Validation** - Type-safe schema validation
3. ✅ **useMemo for defaultValues** - Prevent unnecessary re-renders
4. ✅ **watch() for conditional fields** - React to field changes
5. ✅ **setValue() with shouldValidate: false** - Clear hidden fields without validation errors
6. ✅ **clearErrors()** - Remove errors when fields are hidden

### 2. Conditional Field Handling

**Pattern (from RepositoryFormDialog):**
```typescript
// Watch for conditional toggles
const isCloudBased = watch('is_cloud_based');

// Clear dependent fields when toggled off
React.useEffect(() => {
  if (!isCloudBased) {
    setValue('cloud_provider', undefined, { shouldValidate: false });
    clearErrors('cloud_provider');
  }
}, [isCloudBased, setValue, clearErrors]);
```

**Best Practices:**
1. ✅ **Clear hidden fields** - Set to `undefined` (not empty string)
2. ✅ **Disable validation** - Use `shouldValidate: false` when clearing
3. ✅ **Clear errors** - Remove validation errors for hidden fields
4. ✅ **Use useEffect** - React to field changes

### 3. Error Handling

**Pattern (from formHelpers.ts):**
```typescript
export function handleApiErrors<T extends Record<string, any>>(
  error: unknown,
  setError: UseFormSetError<T>,
  setGeneralError?: (message: string) => void
): void {
  if (isApiError(error)) {
    if (error.detail?.errors) {
      // Field-specific errors
      Object.entries(error.detail.errors).forEach(([field, message]) => {
        setError(field as any, { type: 'server', message });
      });
    } else {
      // General error
      setGeneralError?.(error.detail?.message || 'An error occurred');
    }
  }
}
```

**Best Practices:**
1. ✅ **Centralized error handling** - Use `handleApiErrors` utility
2. ✅ **Field-level errors** - Map API errors to form fields
3. ✅ **General errors** - Display non-field errors separately
4. ✅ **Type safety** - Use TypeScript for error types

### 4. Form Component Structure

**Pattern (from RepositoryFormDialog):**
```typescript
// 1. Form setup with useForm
// 2. Conditional field watching
// 3. useEffect for clearing hidden fields
// 4. Error expansion logic (accordions)
// 5. Submit handler with loading state
// 6. Dialog structure with Accordion layout
```

**Best Practices:**
1. ✅ **Separate concerns** - Form logic, UI, API calls
2. ✅ **Loading states** - Show loading during submission
3. ✅ **Success callbacks** - Refresh data after success
4. ✅ **Reset on close** - Clear form when dialog closes
5. ✅ **Accessibility** - Proper labels, ARIA attributes

### 5. Reusable Form Components

**Pattern (from FormTextField.tsx):**
```typescript
export function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  ...textFieldProps
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...textFieldProps}
          {...field}
          label={label}
          required={required}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || textFieldProps.helperText}
          fullWidth={textFieldProps.fullWidth !== false}
        />
      )}
    />
  );
}
```

**Best Practices:**
1. ✅ **Generic components** - Use TypeScript generics
2. ✅ **Controller integration** - Wrap MUI components with Controller
3. ✅ **Error display** - Show validation errors automatically
4. ✅ **Full width default** - Consistent layout
5. ✅ **Type safety** - TypeScript for all props

### 6. useEffect Dependencies

**CRITICAL Pattern (from repo rules):**
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

**Best Practices:**
1. ✅ **Primitive dependencies** - Use IDs, not objects
2. ✅ **Prevent loops** - Only reset when ID changes
3. ✅ **Memoize callbacks** - Use useCallback for handlers
4. ✅ **Dependency arrays** - Include all used values

---

## FastAPI Best Practices

### 1. Database Models (SQLAlchemy)

**Pattern (from Repository model):**
```python
class Repository(Base):
    __tablename__ = "ropa_repositories"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    
    # Foreign keys
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Fields organized by section
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    activities = relationship("Activity", back_populates="repository", cascade="all, delete-orphan")
```

**Best Practices:**
1. ✅ **UUID primary keys** - Use UUID for all entities
2. ✅ **Tenant isolation** - All entities have tenant_id (direct or through parent)
3. ✅ **Indexes** - Index foreign keys and frequently queried fields
4. ✅ **Cascade deletes** - Configure cascade for parent-child relationships
5. ✅ **Timestamps** - Always include created_at and updated_at
6. ✅ **Field organization** - Group related fields with comments
7. ✅ **Nullable fields** - Make optional fields nullable=True
8. ✅ **String lengths** - Use appropriate max_length for String fields
9. ✅ **Text for long content** - Use Text for descriptions, notes

### 2. Enum Handling

**Pattern (from Repository model):**
```python
class EnumValueType(TypeDecorator):
    """Custom type that stores enum values (not names) in the database."""
    impl = String
    
    def process_bind_param(self, value, dialect):
        if isinstance(value, self.enum_class):
            return value.value
        return value
    
    def process_result_value(self, value, dialect):
        # Convert database value to Python enum
        ...

def create_enum_column(enum_class, **kwargs):
    return Column(EnumValueType(enum_class), **kwargs)
```

**Best Practices:**
1. ✅ **Store enum values** - Store 'active' not 'ACTIVE' in database
2. ✅ **Custom TypeDecorator** - Use for enum columns
3. ✅ **Type safety** - Use enum classes in Python
4. ✅ **Flexibility** - Handle both enum and string values

### 3. Pydantic Schemas

**Pattern (from Repository schemas):**
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

class ActivityCreate(ActivityBase):
    """Schema for creating a new activity."""
    repository_id: UUID = Field(..., description="Repository ID this activity belongs to")
    # Override base class field - allow empty string, router will generate default
    name: str = Field("", max_length=255, description="Processing activity name (empty for default)")
    
    @model_validator(mode='before')
    @classmethod
    def allow_empty_name(cls, data: Any) -> Dict[str, Any] | Any:
        """Convert empty strings to single space before validation to pass min_length constraint."""
        return convert_empty_string_to_space(data, 'name')

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

**Best Practices:**
1. ✅ **Base schema** - Common fields in Base class
2. ✅ **Create extends Base** - Create schema inherits from Base
3. ✅ **Update all optional** - Update schema has all fields optional
4. ✅ **Response includes metadata** - Response includes id, timestamps
5. ✅ **Field descriptions** - Document all fields
6. ✅ **Validation** - Use min_length, max_length, etc.
7. ✅ **AI hints** - Include json_schema_extra for AI suggestions
8. ✅ **from_attributes** - Enable ORM mode for responses
9. ✅ **Empty string handling** - Use `@model_validator(mode='before')` with shared utility for Create schemas that need to allow empty strings (router generates defaults)
10. ✅ **Shared validators** - Extract common validator logic to `schemas/validators.py` to reduce duplication
11. ✅ **Type hints** - Always use `Any` from `typing`, not lowercase `any`

### 4. Service Layer Pattern

**Pattern (from RepositoryService):**
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

**Best Practices:**
1. ✅ **Static methods** - Services use static methods
2. ✅ **Database session injection** - Pass db as parameter
3. ✅ **Tenant isolation** - Always check tenant_id
4. ✅ **Error handling** - Use custom exceptions (NotFoundError, ConflictError)
5. ✅ **Transaction management** - Commit/rollback in services
6. ✅ **Refresh after commit** - Refresh entity to get updated data
7. ✅ **Type hints** - Full type annotations

### 5. Route Pattern

**Pattern (from routers.py):**
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
    _check_tenant_membership(db, tenant_id, current_user)
    
    try:
        repository = RepositoryService.create(db, tenant_id, repository_data)
        return repository
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
```

**Best Practices:**
1. ✅ **Module enablement** - Use `require_module()` dependency
2. ✅ **Authentication** - Use `get_current_user` dependency
3. ✅ **Authorization** - Check tenant membership
4. ✅ **Error mapping** - Map service exceptions to HTTP exceptions
5. ✅ **Response models** - Use response_model for type safety
6. ✅ **Status codes** - Use appropriate HTTP status codes
7. ✅ **Nested routes** - Use nested routes for child entities

### 6. Tenant Isolation

**Pattern:**
- **Repository:** Direct `tenant_id` check
- **Activity:** Through repository (Activity → Repository → Tenant)
- **DataElement:** Through activity chain (DataElement → Activity → Repository → Tenant)
- **DPIA:** Through activity chain (DPIA → Activity → Repository → Tenant)
- **Risk:** Through dpia chain (Risk → DPIA → Activity → Repository → Tenant)

**Best Practices:**
1. ✅ **Always verify tenant** - Never skip tenant checks
2. ✅ **Chain verification** - Verify parent belongs to tenant
3. ✅ **Service methods** - Use service methods for verification
4. ✅ **Fail fast** - Raise NotFoundError if tenant mismatch

---

## Material UI Best Practices

### 1. Form Layout for Large Forms

**Pattern (from RepositoryFormDialog):**
```typescript
<DialogContent dividers>
  <Box sx={{ py: 2 }}>
    <Accordion expanded={expandedAccordions.has('basic-info')}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Basic Information</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormTextField name="name" control={control} label="Name" required />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  </Box>
</DialogContent>
```

**Best Practices:**
1. ✅ **Accordion layout** - Use Accordion for large forms (>10 fields)
2. ✅ **Logical grouping** - Group related fields in same Accordion
3. ✅ **Grid layout** - Use Grid for responsive columns
4. ✅ **Full width fields** - Use `fullWidth` prop (default in FormTextField)
5. ✅ **Spacing** - Use consistent spacing (spacing={2})
6. ✅ **Error expansion** - Auto-expand Accordions with errors
7. ✅ **Responsive** - Use xs, md, lg breakpoints

### 2. Dialog Structure

**Pattern:**
```typescript
<Dialog
  open={open}
  onClose={onClose}
  maxWidth="md"
  fullWidth
  fullScreen={fullScreen}
>
  <DialogTitle>Create Repository</DialogTitle>
  <DialogContent dividers>
    {/* Form content */}
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose}>Cancel</Button>
    <Button onClick={handleSubmit(onSubmit)} variant="contained">
      Save
    </Button>
  </DialogActions>
</Dialog>
```

**Best Practices:**
1. ✅ **maxWidth="md"** - Consistent dialog width
2. ✅ **fullWidth** - Use full width of maxWidth
3. ✅ **fullScreen on mobile** - Use useMediaQuery for responsive
4. ✅ **dividers** - Use dividers in DialogContent
5. ✅ **Actions placement** - Cancel left, Save right
6. ✅ **Loading states** - Disable buttons during submission

### 3. Form Field Components

**Pattern:**
```typescript
// Text field
<FormTextField
  name="name"
  control={control}
  label="Name"
  required
  helperText="Optional helper text"
/>

// Select field
<FormSelect
  name="status"
  control={control}
  label="Status"
  options={STATUS_OPTIONS}
  required
/>

// Switch/Checkbox
<FormControlLabel
  control={
    <Controller
      name="is_cloud_based"
      control={control}
      render={({ field }) => (
        <Switch {...field} checked={field.value || false} />
      )}
    />
  }
  label="Cloud Based"
/>
```

**Best Practices:**
1. ✅ **Use FormTextField/FormSelect** - Reusable components
2. ✅ **Controller for custom** - Use Controller for Switches, etc.
3. ✅ **Labels** - Always provide labels
4. ✅ **Required indicator** - Use required prop
5. ✅ **Helper text** - Provide helpful descriptions
6. ✅ **Type safety** - TypeScript for all props

### 4. Responsive Design

**Pattern:**
```typescript
const theme = useTheme();
const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

<Dialog fullScreen={fullScreen} maxWidth="md" fullWidth>
  <Grid container spacing={2}>
    <Grid item xs={12} md={6}>
      {/* Field */}
    </Grid>
  </Grid>
</Dialog>
```

**Best Practices:**
1. ✅ **Breakpoints** - Use theme.breakpoints
2. ✅ **Grid responsive** - xs={12} for mobile, md={6} for desktop
3. ✅ **Full screen on mobile** - Use fullScreen prop
4. ✅ **Stack on mobile** - Fields stack vertically on small screens

### 5. Accessibility

**Best Practices:**
1. ✅ **Labels** - All fields have labels
2. ✅ **ARIA attributes** - MUI handles most ARIA automatically
3. ✅ **Keyboard navigation** - Ensure tab order is logical
4. ✅ **Error messages** - Clear, descriptive error messages
5. ✅ **Focus management** - Focus first field when dialog opens
6. ✅ **Screen readers** - Test with screen readers

---

## ROPA-Specific Patterns

### 1. AI Suggestion Context

**Pattern (from AISuggestionJob):**
```python
# request_data JSONB contains:
{
  "form_data": {...},  # Current form state
  "current_value": "...",  # Current field value
  "field_options": [...]  # Enum options if applicable
}

# For Activity suggestions, include Repository context:
{
  "form_data": {...},
  "repository_context": {
    "name": "...",
    "repository_type": "...",
    "location": "...",
    # ... other Repository fields
  }
}
```

**Best Practices:**
1. ✅ **Include parent context** - Activity includes Repository data
2. ✅ **DataElement includes Activity** - Include Activity + Repository
3. ✅ **DPIA includes Activity** - Include Activity + Repository
4. ✅ **Risk includes full chain** - Include DPIA + Activity + Repository
5. ✅ **Store in request_data** - Use JSONB for flexibility

### 2. Metadata System

**Pattern (from metadata.py):**
```python
@dataclass
class EnumValueMetadata:
    value: str
    label: str
    description: str
    examples: List[str]
    context: Optional[str]
    related_values: List[str]

@dataclass
class FieldMetadata:
    field_name: str
    field_type: str
    description: str
    required: bool
    allowed_values: Optional[List[EnumValueMetadata]]
    examples: List[str]
    ai_hints: Optional[str]
```

**Best Practices:**
1. ✅ **Rich metadata** - Provide context for AI
2. ✅ **Enum metadata** - Document all enum values
3. ✅ **Field metadata** - Document field purpose and examples
4. ✅ **AI hints** - Provide specific guidance for AI
5. ✅ **Related values** - Link related enum values

### 3. Field Organization

**Pattern:**
- Group related fields together
- Use logical sections (Basic Info, Security, Compliance, etc.)
- Order fields by importance/usage frequency
- Use Accordion for >10 fields
- Use simple form for <10 fields

**Best Practices:**
1. ✅ **Logical grouping** - Group by GDPR category
2. ✅ **Progressive disclosure** - Accordion for large forms
3. ✅ **Required first** - Put required fields first
4. ✅ **Contextual fields** - Group conditional fields together

### 4. Validation Rules

**GDPR-Specific:**
- Legal basis must be valid (Article 6 GDPR)
- Retention periods should be reasonable
- International transfers need documentation
- Special category data needs Article 9 basis
- Children's data needs special handling

**Best Practices:**
1. ✅ **Legal basis validation** - Validate against GDPR articles
2. ✅ **Date validation** - Ensure dates are logical (retention > creation)
3. ✅ **Required field logic** - Some fields required based on others
4. ✅ **Enum validation** - Validate enum values
   - Use `preprocessEmptyToNull` for optional enum fields (converts `''` → `null`)
   - Use `preprocessEmptyToUndefined` for required enum fields (converts `''` → `undefined`)
   - Material-UI Select converts `null`/`undefined` to `''`, so preprocess is always needed
   - See `frontend/COMPONENT_PATTERNS.md` - Enum Field Validation Pattern
5. ✅ **Format validation** - Validate email, URL, etc.

---

## Summary Checklist

### Before Implementing New Entity Forms

- [ ] Review GDPR requirements for entity type
- [ ] Define all required fields based on GDPR Article 30
- [ ] Create database model with proper indexes
- [ ] Create Pydantic schemas (Base, Create, Update, Response)
  - If Create schema needs empty string handling, use `@model_validator(mode='before')` with `convert_empty_string_to_space()` from `schemas/validators.py`
- [ ] Implement service layer with tenant isolation
- [ ] Create REST routes with proper error handling
- [ ] Create Zod validation schema
  - Use `preprocessEmptyToNull` for optional enum fields
  - Use `preprocessEmptyToUndefined` for required enum fields
  - See `frontend/COMPONENT_PATTERNS.md` for enum validation patterns
- [ ] Create form component with React Hook Form
- [ ] Use Accordion layout if >10 fields
- [ ] Implement conditional field logic
- [ ] Add error handling and validation
- [ ] Test tenant isolation
- [ ] Test cascade deletes
- [ ] Add AI suggestion context (if needed)
- [ ] Add metadata for enum fields (if needed)

### Code Quality

- [ ] TypeScript types for all props
- [ ] Python type hints for all functions
- [ ] Proper error handling
- [ ] Tenant isolation verified
- [ ] No infinite loops in useEffect
- [ ] Proper dependency arrays
- [ ] Accessible components
- [ ] Responsive design
- [ ] Loading states
- [ ] Success/error notifications

---

**This document should be referenced when implementing Activity, DataElement, DPIA, and Risk forms to ensure consistency with Repository implementation and best practices.**


