# ROPA Organization Level - Simplified Implementation Plan

**Date:** 2026-01-03  
**Status:** Planning (No code changes yet)  
**Goal:** Add organization root to tree + panel with statistics and placeholder buttons

---

## Overview

**Simplified Approach:**
1. Add organization root node to tree
2. Create organization panel component
3. Panel shows concise statistics
4. Panel shows dummy buttons (import/export - implement later)

**What We're NOT Doing Yet:**
- Full import/export functionality
- Complex dashboard features
- Multi-organization support
- Backend API endpoints for import/export

---

## Phase 1: Tree Structure Changes

### Step 1.1: Update ROPATreeItem Type

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 73-81 (interface definition)

**Change:**
```typescript
// BEFORE:
type: 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk' | 'add_action';

// AFTER:
type: 'organization' | 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk' | 'add_action';
```

**Also update data type:**
```typescript
// BEFORE:
data?: Repository | Activity | DataElement | DPIA | Risk;

// AFTER:
data?: Tenant | Repository | Activity | DataElement | DPIA | Risk;
```

**Notes:**
- Need to import `Tenant` type (check where it's defined)
- Simple type union addition

### Step 1.2: Add Organization Icon

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 259-277 (`getIconForType` function)

**Change:**
```typescript
const getIconForType = React.useCallback((type: ROPATreeItem['type']) => {
  switch (type) {
    case 'organization':
      return <BusinessIcon fontSize="small" color="primary" />;
    case 'repository':
      return <StorageIcon fontSize="small" color="primary" />;
    // ... rest stays the same
  }
}, []);
```

**Notes:**
- Use `BusinessIcon` (already imported)
- Or use `DomainIcon`, `AccountTreeIcon` if preferred

### Step 1.3: Wrap Tree in Organization Root

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 115-257 (`fetchROPAData` function)

**Change:**
```typescript
// AFTER building repositoryItems (existing logic):
const repositoryItems: ROPATreeItem[] = await Promise.all(
  repositories.map(async (repo) => {
    // ... existing repository tree building ...
  })
);

// Add "Add Repository" as child of organization (not root)
const repositoryItemsWithAdd: ROPATreeItem[] = [
  ...repositoryItems,
  {
    id: 'add-repository',
    label: 'Add Repository',
    type: 'add_action' as const,
    addActionType: 'repository' as const,
  },
];

// WRAP IN ORGANIZATION ROOT:
const organizationItem: ROPATreeItem = {
  id: `organization-${tenant.id}`,
  label: tenant.name,
  type: 'organization' as const,
  data: tenant,
  children: repositoryItemsWithAdd,
};

const treeItems = [organizationItem];
setTreeItems(treeItems);
return treeItems;
```

**Key Changes:**
1. Move "Add Repository" to be child of organization (not root level)
2. Wrap all repository items in organization root
3. Return single-item array with organization

### Step 1.4: Auto-Expand Organization

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** After setting treeItems in `fetchROPAData`

**Add:**
```typescript
setTreeItems(treeItems);

// Auto-expand organization node
if (treeItems.length > 0 && treeItems[0].type === 'organization') {
  setExpandedItems([treeItems[0].id]);
}

return treeItems;
```

**Notes:**
- Organization should be expanded by default
- User can still collapse if needed

### Step 1.5: Handle Organization Click

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 319-353 (`handleItemClick` function)

**Change:**
```typescript
const handleItemClick = (_event: React.SyntheticEvent, itemId: string) => {
  const item = findItemInTree(treeItems, itemId);
  if (!item) return;

  // Handle organization selection - show dashboard panel
  if (item.type === 'organization') {
    setSelectedItem(item);
    return; // Don't proceed to other handlers
  }

  // ... rest of existing logic (add_action, normal selection) ...
};
```

**Notes:**
- Organization click just sets selectedItem
- Panel rendering will handle showing organization panel

### Step 1.6: Update Panel Rendering

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 910-936 (panel rendering section)

**Change:**
```typescript
// BEFORE:
{selectedItem && selectedItem.type !== 'add_action' ? (
  <ROPADetailsPanel
    itemType={selectedItem.type}
    data={selectedItem.data || null}
    isRefreshing={isRefreshing}
  />
) : (
  // Empty state
)}

// AFTER:
{selectedItem && selectedItem.type === 'organization' ? (
  <ROPAOrganizationPanel
    tenant={selectedItem.data as Tenant}
    tenantId={id!}
  />
) : selectedItem && selectedItem.type !== 'add_action' ? (
  <ROPADetailsPanel
    itemType={selectedItem.type}
    data={selectedItem.data || null}
    isRefreshing={isRefreshing}
  />
) : (
  // Empty state
)}
```

**Notes:**
- Need to import `ROPAOrganizationPanel` (will create in Phase 2)
- Need to import `Tenant` type

### Step 1.7: Hide Edit/Delete for Organization

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 778-822 (toolbar actions)

**Change:**
```typescript
// BEFORE:
{selectedItem && selectedItem.type !== 'add_action' && (
  <Stack direction="row" spacing={1} justifyContent="flex-end">
    <Button onClick={handleEdit}>Edit</Button>
    <Button onClick={handleDelete}>Delete</Button>
  </Stack>
)}

// AFTER:
{selectedItem && 
 selectedItem.type !== 'add_action' && 
 selectedItem.type !== 'organization' && (
  <Stack direction="row" spacing={1} justifyContent="flex-end">
    <Button onClick={handleEdit}>Edit</Button>
    <Button onClick={handleDelete}>Delete</Button>
  </Stack>
)}
```

**Notes:**
- Organization doesn't have Edit/Delete (it's the tenant)
- Actions are in the panel (statistics, buttons)

---

## Phase 2: Organization Panel Component

### Step 2.1: Create ROPAOrganizationPanel Component

**File:** `frontend/src/modules/ropa/components/ROPAOrganizationPanel.tsx` (NEW FILE)

**Structure:**
```typescript
import * as React from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Storage as StorageIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import type { Tenant } from '../../../types'; // Adjust import path

interface ROPAStats {
  repositories: number;
  activities: number;
  dataElements: number;
  dpias: number;
  risks: number;
}

interface ROPAOrganizationPanelProps {
  tenant: Tenant;
  tenantId: string;
}

export default function ROPAOrganizationPanel({
  tenant,
  tenantId,
}: ROPAOrganizationPanelProps) {
  const [stats, setStats] = React.useState<ROPAStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  // Fetch statistics on mount
  React.useEffect(() => {
    fetchStats();
  }, [tenantId]);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      
      // Reuse existing API calls to calculate stats
      const { listRepositories, listActivities, listDataElements, listDPIAs, listRisks } = 
        await import('../services/ropaApi');
      
      const repositories = await listRepositories(tenantId);
      let activitiesCount = 0;
      let dataElementsCount = 0;
      let dpiasCount = 0;
      let risksCount = 0;

      for (const repo of repositories) {
        const activities = await listActivities(tenantId, repo.id);
        activitiesCount += activities.length;

        for (const activity of activities) {
          const [dataElements, dpias] = await Promise.all([
            listDataElements(tenantId, activity.id),
            listDPIAs(tenantId, activity.id),
          ]);

          dataElementsCount += dataElements.length;
          dpiasCount += dpias.length;

          for (const dpia of dpias) {
            const risks = await listRisks(tenantId, dpia.id);
            risksCount += risks.length;
          }
        }
      }

      setStats({
        repositories: repositories.length,
        activities: activitiesCount,
        dataElements: dataElementsCount,
        dpias: dpiasCount,
        risks: risksCount,
      });
    } catch (err: any) {
      setStatsError(err?.message || 'Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Placeholder handlers for buttons
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked - to be implemented');
  };

  const handleImport = () => {
    // TODO: Implement import functionality
    console.log('Import clicked - to be implemented');
  };

  return (
    <Box sx={{ p: 3, height: '100%', minHeight: 600 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <BusinessIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" component="h1">
            {tenant.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Organization ROPA Overview
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Statistics Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Statistics
        </Typography>
        {isLoadingStats ? (
          <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Box>
        ) : statsError ? (
          <Alert severity="error">{statsError}</Alert>
        ) : stats ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <StorageIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.repositories}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Repositories
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <BusinessIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.activities}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Activities
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CategoryIcon sx={{ fontSize: 32, color: 'info.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.dataElements}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Data Elements
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <DescriptionIcon sx={{ fontSize: 32, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.dpias}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        DPIAs
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <WarningIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.risks}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Risks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}
      </Box>

      {/* Import/Export Section - Placeholder Buttons */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Data Management
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={isLoadingStats}
          >
            Export ROPA Data
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleImport}
            disabled={isLoadingStats}
          >
            Import ROPA Data
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Import/Export functionality will be implemented in a future update.
        </Typography>
      </Box>
    </Box>
  );
}
```

**Key Points:**
- Reuses existing API calls to calculate statistics
- Shows 5 stat cards (Repositories, Activities, Data Elements, DPIAs, Risks)
- Placeholder buttons with console.log (to be implemented later)
- Simple, clean layout
- Loading and error states

---

## Summary of Changes

### Files to Modify

1. **`frontend/src/modules/ropa/pages/ROPAPage.tsx`**
   - Update `ROPATreeItem` type (add 'organization')
   - Add organization icon
   - Wrap tree in organization root
   - Auto-expand organization
   - Handle organization click
   - Update panel rendering
   - Hide Edit/Delete for organization

### Files to Create

2. **`frontend/src/modules/ropa/components/ROPAOrganizationPanel.tsx`** (NEW)
   - Organization panel component
   - Statistics section
   - Placeholder buttons

### Estimated Effort

- **Phase 1 (Tree Changes):** 1-2 hours
- **Phase 2 (Panel Component):** 2-3 hours
- **Total:** 3-5 hours

### What's NOT Included (For Later)

- Backend API endpoints for dashboard
- Import/Export functionality
- Organization switcher
- Multi-organization view
- Advanced dashboard features

---

## Implementation Order

1. **Start with Phase 1:**
   - Update types
   - Add icon
   - Wrap tree structure
   - Test tree displays correctly

2. **Then Phase 2:**
   - Create panel component
   - Add statistics calculation
   - Add placeholder buttons
   - Test panel displays correctly

3. **Test:**
   - Organization appears in tree
   - Clicking organization shows panel
   - Statistics load correctly
   - Buttons are visible (even if not functional)

---

## Notes

- **Simple approach:** Just add organization to tree and show basic panel
- **Reuse existing code:** Statistics calculation reuses existing API calls
- **Placeholder buttons:** Will implement functionality later
- **No breaking changes:** All existing functionality preserved
- **Easy to extend:** Can add features incrementally later

This simplified plan focuses on the core functionality: showing organization in tree and providing a basic panel with statistics and placeholder buttons for future features.
