# ROPA Organization Level - Implementation Guide

**Date:** 2026-01-03  
**Purpose:** Step-by-step guide for implementing Organization level in ROPA tree  
**Status:** Implementation Plan (No code changes made)

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Frontend Tree Structure](#phase-1-frontend-tree-structure)
3. [Phase 2: Organization Panel](#phase-2-organization-panel)
4. [Phase 3: Backend API Endpoints](#phase-3-backend-api-endpoints)
5. [Phase 4: Import/Export Functionality](#phase-4-importexport-functionality)
6. [Phase 5: Testing & Validation](#phase-5-testing--validation)
7. [Migration Strategy](#migration-strategy)

---

## Implementation Overview

### Implementation Order

1. **Frontend Tree Structure** - Add organization root node
2. **Organization Panel Component** - Create dashboard panel
3. **Backend Dashboard API** - Statistics endpoint
4. **Backend Export API** - Export functionality
5. **Backend Import API** - Import functionality
6. **Frontend Import/Export UI** - User interface
7. **Testing & Polish** - End-to-end testing

### Estimated Timeline

- **Phase 1:** 2-3 hours
- **Phase 2:** 4-6 hours
- **Phase 3:** 3-4 hours
- **Phase 4:** 6-8 hours
- **Phase 5:** 2-3 hours
- **Total:** 17-24 hours (2-3 days)

---

## Phase 1: Frontend Tree Structure

### Step 1.1: Update ROPATreeItem Type

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 73-81 (interface definition)

**Change:**
```typescript
// BEFORE:
interface ROPATreeItem {
  id: string;
  label: string;
  children?: ROPATreeItem[];
  type: 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk' | 'add_action';
  data?: Repository | Activity | DataElement | DPIA | Risk;
  // ...
}

// AFTER:
interface ROPATreeItem {
  id: string;
  label: string;
  children?: ROPATreeItem[];
  type: 'organization' | 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk' | 'add_action';
  data?: Tenant | Repository | Activity | DataElement | DPIA | Risk;
  // ...
}
```

**Notes:**
- Add `'organization'` to the type union
- Add `Tenant` to the data union
- Need to import `Tenant` type (check if it exists in types)

### Step 1.2: Add Organization Icon

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 259-277 (`getIconForType` function)

**Change:**
```typescript
// BEFORE:
const getIconForType = React.useCallback((type: ROPATreeItem['type']) => {
  switch (type) {
    case 'repository':
      return <StorageIcon fontSize="small" color="primary" />;
    // ... other cases
  }
}, []);

// AFTER:
const getIconForType = React.useCallback((type: ROPATreeItem['type']) => {
  switch (type) {
    case 'organization':
      return <BusinessIcon fontSize="small" color="primary" />; // or DomainIcon, AccountTreeIcon
    case 'repository':
      return <StorageIcon fontSize="small" color="primary" />;
    // ... other cases
  }
}, []);
```

**Notes:**
- Choose appropriate icon (BusinessIcon, DomainIcon, AccountTreeIcon, etc.)
- Import the icon if not already imported

### Step 1.3: Update fetchROPAData to Wrap in Organization

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 115-257 (`fetchROPAData` function)

**Change:**
```typescript
// BEFORE:
const fetchROPAData = React.useCallback(async (skipLoading = false): Promise<ROPATreeItem[]> => {
  // ... existing code that builds repository items ...
  
  // Add "Add Repository" action as last item
  const itemsWithAdd: ROPATreeItem[] = [
    ...items,
    {
      id: 'add-repository',
      label: 'Add Repository',
      type: 'add_action' as const,
      addActionType: 'repository' as const,
    },
  ];

  setTreeItems(itemsWithAdd);
  return itemsWithAdd;
}, [id, tenant?.id, canEditMemo, showError]);

// AFTER:
const fetchROPAData = React.useCallback(async (skipLoading = false): Promise<ROPATreeItem[]> => {
  if (!id || !tenant || !canEditMemo) {
    setIsLoading(false);
    return [];
  }

  try {
    if (!skipLoading) {
      setIsLoading(true);
    }
    setError(null);

    const repositories = await listRepositories(id);

    // Build repository items (existing logic)
    const repositoryItems: ROPATreeItem[] = await Promise.all(
      repositories.map(async (repo) => {
        // ... existing repository tree building logic ...
        return {
          id: `repository-${repo.id}`,
          label: repo.name,
          type: 'repository' as const,
          data: repo,
          children: repositoryChildren,
        };
      })
    );

    // Add "Add Repository" action as child of organization
    const repositoryItemsWithAdd: ROPATreeItem[] = [
      ...repositoryItems,
      {
        id: 'add-repository',
        label: 'Add Repository',
        type: 'add_action' as const,
        addActionType: 'repository' as const,
        // No parentId since it's under organization
      },
    ];

    // Wrap in organization root
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
  } catch (err: any) {
    // ... existing error handling ...
  } finally {
    // ... existing finally block ...
  }
}, [id, tenant, canEditMemo, showError]);
```

**Key Changes:**
1. Move "Add Repository" to be a child of organization (not root level)
2. Wrap all repository items in organization root
3. Return single-item array with organization

### Step 1.4: Update handleItemClick for Organization

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 319-353 (`handleItemClick` function)

**Change:**
```typescript
// BEFORE:
const handleItemClick = (_event: React.SyntheticEvent, itemId: string) => {
  const item = findItemInTree(treeItems, itemId);
  if (!item) return;

  // Handle "Add New..." actions
  if (item.type === 'add_action' && item.addActionType) {
    // ... existing logic ...
  }

  // Normal item selection
  setSelectedItem(item);
};

// AFTER:
const handleItemClick = (_event: React.SyntheticEvent, itemId: string) => {
  const item = findItemInTree(treeItems, itemId);
  if (!item) return;

  // Handle organization selection - show dashboard panel
  if (item.type === 'organization') {
    setSelectedItem(item);
    return; // Don't proceed to other handlers
  }

  // Handle "Add New..." actions
  if (item.type === 'add_action' && item.addActionType) {
    // ... existing logic ...
  }

  // Normal item selection
  setSelectedItem(item);
};
```

**Notes:**
- Organization click shows dashboard panel (handled in render)
- No special action needed, just selection

### Step 1.5: Update Panel Rendering Logic

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 910-936 (panel rendering)

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
    onExport={handleExport}
    onImport={handleImport}
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
- Need to create `handleExport` and `handleImport` functions
- Need to import `Tenant` type

### Step 1.6: Auto-Expand Organization Node

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** Line 94 (`expandedItems` state) and after `fetchROPAData` call

**Change:**
```typescript
// After setting treeItems in fetchROPAData:
setTreeItems(treeItems);

// Auto-expand organization node
if (treeItems.length > 0 && treeItems[0].type === 'organization') {
  setExpandedItems([treeItems[0].id]);
}

return treeItems;
```

**Alternative:** Use `useEffect` to auto-expand on initial load:
```typescript
React.useEffect(() => {
  if (treeItems.length > 0 && treeItems[0].type === 'organization') {
    setExpandedItems([treeItems[0].id]);
  }
}, [treeItems]);
```

**Notes:**
- Organization should be expanded by default
- User can still collapse if needed

### Step 1.7: Update Toolbar Actions for Organization

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
- Organization doesn't have Edit/Delete actions (it's the tenant)
- Organization actions are in the panel (dashboard, import/export)

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
import { useNotification } from '../../../contexts';

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
  onExport: (format: string) => Promise<void>;
  onImport: (file: File) => Promise<void>;
}

export default function ROPAOrganizationPanel({
  tenant,
  tenantId,
  onExport,
  onImport,
}: ROPAOrganizationPanelProps) {
  const { showSuccess, showError } = useNotification();
  const [stats, setStats] = React.useState<ROPAStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch dashboard statistics
  React.useEffect(() => {
    fetchDashboardStats();
  }, [tenantId]);

  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      // Call API endpoint (will create in Phase 3)
      const response = await fetch(`/api/tenants/${tenantId}/ropa/dashboard`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setStatsError(err?.message || 'Failed to load dashboard statistics');
      showError(err?.message || 'Failed to load dashboard statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleExportClick = async (format: string) => {
    try {
      setIsExporting(true);
      await onExport(format);
      showSuccess(`ROPA data exported successfully as ${format.toUpperCase()}`);
    } catch (err: any) {
      showError(err?.message || 'Failed to export ROPA data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      await onImport(file);
      showSuccess('ROPA data imported successfully');
      // Refresh stats after import
      await fetchDashboardStats();
    } catch (err: any) {
      showError(err?.message || 'Failed to import ROPA data');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
          Organization ROPA Dashboard
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* ROPA Dashboard Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          ROPA Dashboard
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
            {/* Repeat for Activities, Data Elements, DPIAs, Risks */}
          </Grid>
        ) : null}
      </Box>

      {/* Import/Export Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Import / Export
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportClick('json')}
            disabled={isExporting}
          >
            Export JSON
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportClick('csv')}
            disabled={isExporting}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleImportClick}
            disabled={isImporting}
          >
            Import ROPA Data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Stack>
        {isExporting && (
          <Box sx={{ mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Exporting...
            </Typography>
          </Box>
        )}
        {isImporting && (
          <Box sx={{ mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Importing...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Organization Settings Section */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Organization Settings
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Timezone
            </Typography>
            <Typography variant="body1">{tenant.timezone || 'UTC'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Subscription
            </Typography>
            <Typography variant="body1">
              {tenant.subscription_tier || 'Free'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
```

**Notes:**
- Use existing API service pattern (apiGet, apiPost) instead of fetch
- Reuse statistics calculation logic from tenant workspace (if needed)
- Add proper error handling
- Add loading states

### Step 2.2: Add Export/Import Handlers to ROPAPage

**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

**Location:** After `handleDialogSuccess` function (around line 687)

**Add:**
```typescript
// Handle export ROPA data
const handleExport = async (format: string) => {
  if (!id) return;
  
  try {
    // Call export API endpoint
    const response = await fetch(`/api/tenants/${id}/ropa/export?format=${format}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    // Get filename from Content-Disposition header or generate
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `ropa-export-${new Date().toISOString().split('T')[0]}.${format}`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    // Download file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to export ROPA data');
  }
};

// Handle import ROPA data
const handleImport = async (file: File) => {
  if (!id) return;
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`/api/tenants/${id}/ropa/import`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Import failed');
    }
    
    const result = await response.json();
    
    // Refresh tree after successful import
    await fetchROPAData(true);
    
    // Show success message with details
    showSuccess(
      `Import completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`
    );
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to import ROPA data');
  }
};
```

**Notes:**
- Use existing API service functions if available
- Add proper error handling
- Show import results (created/updated/errors count)

---

## Phase 3: Backend API Endpoints

### Step 3.1: Create Dashboard Statistics Endpoint

**File:** `backend/app/modules/ropa/routers.py`

**Location:** Add new route after existing routes

**Add:**
```python
@router.get(
    "/tenants/{tenant_id}/ropa/dashboard",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_ropa_dashboard(
    tenant_id: UUID,
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get ROPA dashboard statistics for organization.
    
    Returns counts of all ROPA entities for the tenant.
    """
    from app.modules.ropa.services.repository import RepositoryService
    from app.modules.ropa.services.activity import ActivityService
    from app.modules.ropa.services.data_element import DataElementService
    from app.modules.ropa.services.dpia import DPIAService
    from app.modules.ropa.services.risk import RiskService
    
    _check_tenant_membership(db, tenant_id, current_user)
    
    try:
        # Get counts
        repositories = RepositoryService.list_by_tenant(db, tenant_id)
        repo_count = len(repositories)
        
        activity_count = 0
        data_element_count = 0
        dpia_count = 0
        risk_count = 0
        
        # Count activities, data elements, DPIAs, and risks
        for repo in repositories:
            activities = ActivityService.list_by_repository(db, repo.id, tenant_id)
            activity_count += len(activities)
            
            for activity in activities:
                data_elements = DataElementService.list_by_activity(
                    db, activity.id, tenant_id
                )
                data_element_count += len(data_elements)
                
                dpias = DPIAService.list_by_activity(db, activity.id, tenant_id)
                dpia_count += len(dpias)
                
                for dpia in dpias:
                    risks = RiskService.list_by_dpia(db, dpia.id, tenant_id)
                    risk_count += len(risks)
        
        return {
            "repositories": repo_count,
            "activities": activity_count,
            "data_elements": data_element_count,
            "dpias": dpia_count,
            "risks": risk_count,
        }
    except Exception as e:
        logger.error(f"Error fetching ROPA dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard statistics: {str(e)}"
        )
```

**Notes:**
- Use existing service methods
- Optimize with SQL COUNT queries if performance is an issue
- Add caching if needed for large datasets

### Step 3.2: Create Export Endpoint

**File:** `backend/app/modules/ropa/routers.py`

**Add:**
```python
from fastapi.responses import FileResponse, StreamingResponse
import json
import csv
import io
from datetime import datetime

@router.get("/tenants/{tenant_id}/ropa/export")
def export_ropa_data(
    tenant_id: UUID,
    format: str = Query("json", regex="^(json|csv|xlsx|pdf)$"),
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all ROPA data for organization.
    
    Formats supported: json, csv, xlsx, pdf
    """
    from app.modules.ropa.services.repository import RepositoryService
    from app.modules.ropa.services.activity import ActivityService
    from app.modules.ropa.services.data_element import DataElementService
    from app.modules.ropa.services.dpia import DPIAService
    from app.modules.ropa.services.risk import RiskService
    from app.modules.ropa.schemas.repository import RepositoryResponse
    from app.modules.ropa.schemas.activity import ActivityResponse
    from app.modules.ropa.schemas.data_element import DataElementResponse
    from app.modules.ropa.schemas.dpia import DPIAResponse
    from app.modules.ropa.schemas.risk import RiskResponse
    
    _check_tenant_membership(db, tenant_id, current_user)
    
    try:
        # Fetch all ROPA entities
        repositories = RepositoryService.list_by_tenant(db, tenant_id)
        
        # Build complete data structure
        export_data = {
            "tenant_id": str(tenant_id),
            "exported_at": datetime.utcnow().isoformat(),
            "repositories": [],
        }
        
        for repo in repositories:
            repo_dict = RepositoryResponse.model_validate(repo).model_dump()
            
            activities = ActivityService.list_by_repository(db, repo.id, tenant_id)
            repo_dict["activities"] = []
            
            for activity in activities:
                activity_dict = ActivityResponse.model_validate(activity).model_dump()
                
                # Add data elements
                data_elements = DataElementService.list_by_activity(
                    db, activity.id, tenant_id
                )
                activity_dict["data_elements"] = [
                    DataElementResponse.model_validate(de).model_dump()
                    for de in data_elements
                ]
                
                # Add DPIAs
                dpias = DPIAService.list_by_activity(db, activity.id, tenant_id)
                activity_dict["dpias"] = []
                
                for dpia in dpias:
                    dpia_dict = DPIAResponse.model_validate(dpia).model_dump()
                    
                    # Add risks
                    risks = RiskService.list_by_dpia(db, dpia.id, tenant_id)
                    dpia_dict["risks"] = [
                        RiskResponse.model_validate(risk).model_dump()
                        for risk in risks
                    ]
                    
                    activity_dict["dpias"].append(dpia_dict)
                
                repo_dict["activities"].append(activity_dict)
            
            export_data["repositories"].append(repo_dict)
        
        # Format according to requested format
        if format == "json":
            content = json.dumps(export_data, indent=2, default=str)
            return Response(
                content=content,
                media_type="application/json",
                headers={
                    "Content-Disposition": f'attachment; filename="ropa-export-{datetime.now().strftime("%Y%m%d")}.json"'
                }
            )
        elif format == "csv":
            # Flatten structure for CSV
            # This is complex - may need to create separate CSV files or flatten
            # For now, return JSON in CSV format (not ideal, but functional)
            output = io.StringIO()
            writer = csv.writer(output)
            # Write headers and data...
            # (Implementation depends on desired CSV structure)
            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f'attachment; filename="ropa-export-{datetime.now().strftime("%Y%m%d")}.csv"'
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Format {format} not yet implemented"
            )
    except Exception as e:
        logger.error(f"Error exporting ROPA data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export ROPA data: {str(e)}"
        )
```

**Notes:**
- Start with JSON export (simplest)
- CSV export requires flattening nested structure
- Excel/PDF require additional libraries (openpyxl, reportlab)
- Consider async export for large datasets

### Step 3.3: Create Import Endpoint

**File:** `backend/app/modules/ropa/routers.py`

**Add:**
```python
from fastapi import UploadFile, File
from typing import List

@router.post("/tenants/{tenant_id}/ropa/import")
def import_ropa_data(
    tenant_id: UUID,
    file: UploadFile = File(...),
    tenant: Tenant = Depends(require_module("ropa")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Import ROPA data from file.
    
    Supports JSON format. CSV/Excel support can be added later.
    """
    from app.modules.ropa.services.repository import RepositoryService
    from app.modules.ropa.services.activity import ActivityService
    from app.modules.ropa.services.data_element import DataElementService
    from app.modules.ropa.services.dpia import DPIAService
    from app.modules.ropa.services.risk import RiskService
    from app.modules.ropa.schemas.repository import RepositoryCreate
    from app.modules.ropa.schemas.activity import ActivityCreate
    from app.modules.ropa.schemas.data_element import DataElementCreate
    from app.modules.ropa.schemas.dpia import DPIACreate
    from app.modules.ropa.schemas.risk import RiskCreate
    
    _check_tenant_membership(db, tenant_id, current_user)
    
    # Check permissions - only owners/admins can import
    if not _can_edit_tenant(db, tenant_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can import ROPA data"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse JSON
        if file.filename.endswith('.json'):
            import_data = json.loads(content.decode('utf-8'))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON format is currently supported"
            )
        
        # Validate tenant_id matches
        if str(tenant_id) != import_data.get("tenant_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID in file does not match current tenant"
            )
        
        # Import statistics
        created_count = 0
        updated_count = 0
        error_count = 0
        errors: List[str] = []
        
        # Import repositories
        for repo_data in import_data.get("repositories", []):
            try:
                # Check if repository exists
                existing_repo = RepositoryService.get_by_id(
                    db, UUID(repo_data["id"]), tenant_id
                ) if "id" in repo_data else None
                
                if existing_repo:
                    # Update existing
                    # (Implement update logic)
                    updated_count += 1
                else:
                    # Create new
                    repo_create = RepositoryCreate(**repo_data)
                    RepositoryService.create(db, tenant_id, repo_create)
                    created_count += 1
                
                # Import activities, data elements, DPIAs, risks
                # (Recursive import logic)
                
            except Exception as e:
                error_count += 1
                errors.append(f"Repository {repo_data.get('name', 'unknown')}: {str(e)}")
        
        return {
            "created": created_count,
            "updated": updated_count,
            "errors": error_count,
            "error_details": errors[:10],  # Limit error details
        }
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error importing ROPA data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import ROPA data: {str(e)}"
        )
```

**Notes:**
- Start with JSON import only
- Add validation for data structure
- Handle duplicates (update vs. create)
- Return detailed import results
- Consider transaction rollback on errors

---

## Phase 4: Import/Export Functionality

### Step 4.1: Add API Service Functions

**File:** `frontend/src/modules/ropa/services/ropaApi.ts`

**Add:**
```typescript
// Dashboard statistics
export interface ROPADashboardStats {
  repositories: number;
  activities: number;
  data_elements: number;
  dpias: number;
  risks: number;
}

export async function getROPADashboard(
  tenantId: string
): Promise<ROPADashboardStats> {
  return apiGet<ROPADashboardStats>(`/tenants/${tenantId}/ropa/dashboard`);
}

// Export
export async function exportROPAData(
  tenantId: string,
  format: 'json' | 'csv' | 'xlsx' | 'pdf' = 'json'
): Promise<Blob> {
  const response = await fetch(
    `/api/tenants/${tenantId}/ropa/export?format=${format}`,
    {
      credentials: 'include',
    }
  );
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  return response.blob();
}

// Import
export interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  error_details?: string[];
}

export async function importROPAData(
  tenantId: string,
  file: File
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiPost<ImportResult>(
    `/tenants/${tenantId}/ropa/import`,
    formData,
    {
      headers: {
        // Don't set Content-Type - browser will set with boundary
      },
    }
  );
}
```

**Notes:**
- Use existing `apiGet`, `apiPost` functions
- Handle file uploads properly
- Add proper error handling

### Step 4.2: Update ROPAOrganizationPanel to Use API Service

**File:** `frontend/src/modules/ropa/components/ROPAOrganizationPanel.tsx`

**Update imports and function calls:**
```typescript
import {
  getROPADashboard,
  exportROPAData,
  importROPAData,
  type ROPADashboardStats,
  type ImportResult,
} from '../services/ropaApi';

// Update fetchDashboardStats:
const fetchDashboardStats = async () => {
  try {
    setIsLoadingStats(true);
    setStatsError(null);
    const data = await getROPADashboard(tenantId);
    setStats(data);
  } catch (err: any) {
    // ... error handling
  } finally {
    setIsLoadingStats(false);
  }
};

// Update handleExportClick:
const handleExportClick = async (format: string) => {
  try {
    setIsExporting(true);
    const blob = await exportROPAData(tenantId, format as any);
    
    // Download file
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ropa-export-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showSuccess(`ROPA data exported successfully as ${format.toUpperCase()}`);
  } catch (err: any) {
    showError(err?.message || 'Failed to export ROPA data');
  } finally {
    setIsExporting(false);
  }
};

// Update handleFileChange:
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    setIsImporting(true);
    const result: ImportResult = await importROPAData(tenantId, file);
    
    showSuccess(
      `Import completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`
    );
    
    if (result.error_details && result.error_details.length > 0) {
      // Show error details in a dialog or expandable section
      console.warn('Import errors:', result.error_details);
    }
    
    // Refresh stats after import
    await fetchDashboardStats();
    
    // Notify parent to refresh tree
    if (onImportSuccess) {
      onImportSuccess();
    }
  } catch (err: any) {
    showError(err?.message || 'Failed to import ROPA data');
  } finally {
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};
```

---

## Phase 5: Testing & Validation

### Step 5.1: Test Tree Structure

**Test Cases:**
1. Organization node appears as root
2. Organization node is expanded by default
3. Organization node shows correct icon
4. Organization node shows tenant name
5. Repositories appear as children of organization
6. "Add Repository" appears as child of organization
7. Clicking organization shows dashboard panel
8. Tree structure matches expected hierarchy

### Step 5.2: Test Dashboard Panel

**Test Cases:**
1. Dashboard loads statistics correctly
2. Statistics match actual data counts
3. Loading state shows during fetch
4. Error state shows on failure
5. Statistics update after import
6. Panel displays correctly on different screen sizes

### Step 5.3: Test Export Functionality

**Test Cases:**
1. JSON export downloads correctly
2. CSV export downloads correctly (if implemented)
3. Export file contains all ROPA data
4. Export file structure is correct
5. Export works with large datasets
6. Export shows progress indicator
7. Export handles errors gracefully

### Step 5.4: Test Import Functionality

**Test Cases:**
1. JSON import works correctly
2. Import validates tenant ID
3. Import creates new entities
4. Import updates existing entities (if implemented)
5. Import shows progress indicator
6. Import shows results (created/updated/errors)
7. Import refreshes tree after completion
8. Import handles invalid files gracefully
9. Import handles missing data gracefully
10. Import validates data structure

### Step 5.5: Test Permissions

**Test Cases:**
1. All users can view dashboard
2. All users can export
3. Only owners/admins can import
4. Permission errors show correctly

---

## Migration Strategy

### Backward Compatibility

**No Breaking Changes:**
- Existing tree structure still works
- Organization is just a wrapper
- All existing functionality preserved

### Rollout Plan

1. **Development:** Implement and test in development environment
2. **Staging:** Deploy to staging, test with real data
3. **Production:** Deploy with feature flag (optional)
4. **Monitoring:** Monitor for errors, performance issues

### Data Migration

**No Data Migration Needed:**
- Tenant data already exists
- ROPA entities already tenant-scoped
- Just adding UI layer

---

## Summary

This implementation guide provides a complete step-by-step approach to adding the Organization level to the ROPA tree. The implementation is broken down into 5 phases:

1. **Frontend Tree Structure** - Add organization root node
2. **Organization Panel** - Create dashboard component
3. **Backend API** - Add dashboard, export, import endpoints
4. **Import/Export UI** - Complete the functionality
5. **Testing** - Comprehensive testing

**Key Points:**
- No database changes needed
- Backward compatible
- Reuses existing patterns and code
- Incremental implementation possible
- Well-tested approach

**Next Steps:**
1. Review this guide
2. Start with Phase 1 (tree structure)
3. Test incrementally
4. Proceed to next phases
5. Deploy when ready
