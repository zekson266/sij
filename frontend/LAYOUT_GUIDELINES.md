# Layout Guidelines for Booker Frontend

## Overview
This document defines layout standards to ensure visual consistency and maintainability across all pages in the application.

## Standard Page Structure

All pages must follow this vertical structure:
1. **Global AppBar** (handled by App.tsx)
2. **Page Header** (title, optional description, optional actions)
3. **Sub-Navigation** (optional tabs or button groups)
4. **Page Body** (forms, lists, tables, cards, etc.)

## Core Principles

### 1. Use PageLayout Component
**Always** use the `PageLayout` component instead of Material-UI's `Container` directly.

The `PageLayout` component provides a standardized structure with:
- **title**: Page title (displayed as h1)
- **description**: Optional description text below title
- **actions**: Optional action buttons (right-aligned in header)
- **subNavigation**: Optional tabs or button groups for sub-navigation
- **children**: Page body content

```tsx
import { PageLayout } from '../components/layout';

// ✅ Correct - Standard page with header
<PageLayout 
  maxWidth="md"
  title="My Tenants"
  description="Manage your tenant organizations"
  actions={<Button>Create Tenant</Button>}
>
  <Paper sx={{ p: 4 }}>Content</Paper>
</PageLayout>

// ✅ Correct - Page with tabs
<PageLayout 
  maxWidth="md"
  title="Settings"
  subNavigation={
    <Tabs value={tab} onChange={handleChange}>
      <Tab label="Details" />
      <Tab label="Settings" />
    </Tabs>
  }
>
  <TabPanel>Content</TabPanel>
</PageLayout>

// ❌ Incorrect - Direct Container usage
<Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
  {/* content */}
</Container>
```

### 2. Standard maxWidth Values

Use these standard `maxWidth` values based on page type:

| Page Type | maxWidth | Width | Use Case |
|-----------|----------|-------|----------|
| **Detail/Form Pages** | `md` | 960px | Workspace, Tenant Details, Tenant Create, Tenant Public |
| **List Pages** | `md` | 960px | Tenant List, Landing Page |
| **Auth Pages** | `xs` | 400px | Login, Register |

**Current Standard**: All main application pages use `maxWidth="md"` for consistency.

### 3. Never Use Nested Width Constraints

**❌ DO NOT** add `maxWidth` or `width` constraints inside Paper/Card components:

```tsx
// ❌ WRONG - Creates visual inconsistency
<PageLayout maxWidth="md">
  <Paper sx={{ maxWidth: 600, p: 4 }}>
    {/* content */}
  </Paper>
</PageLayout>

// ✅ CORRECT - Let PageLayout control width
<PageLayout maxWidth="md">
  <Paper sx={{ p: 4 }}>
    {/* content */}
  </Paper>
</PageLayout>
```

### 4. Consistent Paper/Card Padding

**Always** use `p: 4` (32px) for Paper and Card components:

```tsx
// ✅ Standard padding
<Paper sx={{ p: 4 }}>
  {/* content */}
</Paper>

<Card>
  <CardContent sx={{ p: 4 }}>
    {/* content */}
  </CardContent>
</Card>
```

### 5. Spacing System

The `PageLayout` component automatically applies:
- `mt: 4` (32px top margin)
- `pb: 4` (32px bottom padding)

**Do not** add additional top/bottom margins to pages. The PageLayout handles this.

**Note**: We use `pb` (padding-bottom) instead of `mb` (margin-bottom) to ensure content never touches the bottom edge of the viewport, even when scrolling. This follows Material UI best practices for page layout spacing.

## Page Structure Templates

### Standard Page with Header

```tsx
import { PageLayout } from '../components/layout';
import { Paper, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

export default function MyPage() {
  return (
    <PageLayout 
      maxWidth="md"
      title="Page Title"
      description="Optional description text"
      actions={
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          variant="outlined"
        >
          Back
        </Button>
      }
    >
      <Paper sx={{ p: 4 }}>
        {/* Page content */}
      </Paper>
    </PageLayout>
  );
}
```

### Page with Sub-Navigation (Tabs)

```tsx
import { PageLayout } from '../components/layout';
import { Tabs, Tab, Paper } from '@mui/material';

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  
  return (
    <PageLayout 
      maxWidth="md"
      title="Settings"
      subNavigation={
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Details" />
          <Tab label="Settings" />
          <Tab label="Members" />
        </Tabs>
      }
    >
      <Paper sx={{ p: 4 }}>
        {/* Tab content */}
      </Paper>
    </PageLayout>
  );
}
```

### List Page with Actions

```tsx
import { PageLayout } from '../components/layout';
import { Button, Grid } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export default function ListPage() {
  return (
    <PageLayout 
      maxWidth="md"
      title="My Items"
      actions={
        <Button 
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Create Item
        </Button>
      }
    >
      <Grid container spacing={3}>
        {/* List items */}
      </Grid>
    </PageLayout>
  );
}
```

## PageLayout API Reference

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `maxWidth` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | Yes | Maximum width of the page container |
| `title` | `React.ReactNode` | No | Page title (rendered as h1) |
| `description` | `React.ReactNode` | No | Optional description text below title |
| `actions` | `React.ReactNode` | No | Action buttons/elements (right-aligned in header) |
| `subNavigation` | `React.ReactNode` | No | Sub-navigation (tabs or button groups) |
| `children` | `React.ReactNode` | Yes | Page body content |
| `sx` | `SxProps<Theme>` | No | Custom styles (use sparingly) |

### Header Layout

- **Title**: Left-aligned, rendered as `h1` with `variant="h4"`
- **Description**: Below title, `body2` variant, secondary color
- **Actions**: Right-aligned, flexbox with gap for multiple buttons
- **Responsive**: On mobile, header stacks vertically (title/description on top, actions below)

### Sub-Navigation Guidelines

- **Tabs**: Use for true navigation between logical sub-pages (URL-addressable)
- **Button Groups**: Use for filters or view modes (not navigation)
- **Rule**: Tabs = navigation, Buttons = actions/filters
- Sub-navigation appears below header, above body content

## Checklist for New Pages

When creating a new page, ensure:

- [ ] Uses `PageLayout` component (not `Container`)
- [ ] Uses appropriate `maxWidth` value (`md` for most pages, `xs` for auth)
- [ ] Page title provided via `title` prop (not manually in body)
- [ ] Action buttons in `actions` prop (not manually positioned)
- [ ] Sub-navigation (if needed) in `subNavigation` prop
- [ ] No nested `maxWidth` or `width` constraints in Paper/Card
- [ ] Paper components use `p: 4` padding
- [ ] No additional `mt`/`mb` on page root (PageLayout handles it)
- [ ] Consistent with existing pages visually

## Common Mistakes to Avoid

1. **Manual header construction**: Use `title`, `description`, `actions` props instead of building headers manually
2. **Nested maxWidth**: Don't add `maxWidth: 600` or similar inside Paper
3. **Direct Container usage**: Always use `PageLayout`, not `Container`
4. **Inconsistent padding**: Always use `p: 4` for Papers
5. **Extra spacing**: Don't add `mt: 4, mb: 4` - PageLayout already has it
6. **Hardcoded widths**: Avoid `width: '600px'` or similar pixel values
7. **Tabs in body**: Use `subNavigation` prop for tabs, not inside Paper
8. **Multiple h1 elements**: PageLayout renders title as h1, don't add another h1 in body

## Responsive Behavior

The `PageLayout` component (which wraps Material-UI `Container`) automatically:
- Adds horizontal padding on mobile devices
- Centers content on larger screens
- Respects the `maxWidth` breakpoint
- Handles all responsive behavior

You don't need to add responsive logic - it's handled automatically.

## Examples

### ✅ Good Example: List Page
```tsx
<PageLayout 
  maxWidth="md"
  title="My Tenants"
  actions={<Button variant="contained">Create</Button>}
>
  <Grid container spacing={3}>
    {/* List items */}
  </Grid>
</PageLayout>
```

### ✅ Good Example: Form Page
```tsx
<PageLayout 
  maxWidth="md"
  title="Create Tenant"
  description="Create a new tenant organization"
>
  <Paper sx={{ p: 4 }}>
    <form>{/* Form fields */}</form>
  </Paper>
</PageLayout>
```

### ❌ Bad Example: Manual Header Construction
```tsx
// ❌ DON'T DO THIS - Use PageLayout props instead
<PageLayout maxWidth="md">
  <Box display="flex" justifyContent="space-between" mb={3}>
    <Typography variant="h4">My Page</Typography>
    <Button>Action</Button>
  </Box>
  {/* content */}
</PageLayout>

// ✅ DO THIS INSTEAD
<PageLayout 
  maxWidth="md"
  title="My Page"
  actions={<Button>Action</Button>}
>
  {/* content */}
</PageLayout>
```

### ❌ Bad Example: Nested Width Constraints
```tsx
<Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
  <Paper sx={{ p: 4, maxWidth: 600 }}>
    {/* content - nested maxWidth creates inconsistency */}
  </Paper>
</Container>
```

## Related Guidelines

### Form Handling
When creating forms that reset from props, see [REACT_HOOKS_GUIDELINES.md](./REACT_HOOKS_GUIDELINES.md) for correct useEffect dependency patterns. Incorrect dependencies can cause form values to be reset while typing, which breaks the user experience.

**Key Pattern**: Use `[entity?.id, reset]` instead of `[entity, reset]` when resetting forms from props.

## Questions?

If you're unsure about layout decisions:
1. Check existing pages for patterns
2. Follow the templates above
3. When in doubt, use `maxWidth="md"` and `p: 4` for Papers

---

## Spacing & Density Standards

- **Page vertical spacing**: `mt: 4` (top margin), `pb: 4` (bottom padding) - handled by PageLayout
- **Header spacing**: `mb: 3` (between header and content)
- **Sub-navigation spacing**: `mb: 2` (between sub-nav and body)
- **Section spacing**: `mb: 3` (between major sections)
- **Card padding**: `p: 4` (32px) for Paper and Card components

**Why padding-bottom instead of margin-bottom?**
- Padding ensures content never touches the viewport bottom edge
- Prevents bottom borders from being cut off when scrolling
- Follows Material UI best practices for page layout

## PWA & Mobile Considerations

- AppBar remains global and fixed
- Page content scrolls independently
- Header actions stack vertically on mobile
- Sub-navigation (tabs) scroll horizontally on mobile (MUI handles this)
- No layout logic inside individual pages
- Must work on mobile without layout overrides

---

**Last Updated**: 2025-12-28
**Maintained By**: Development Team



