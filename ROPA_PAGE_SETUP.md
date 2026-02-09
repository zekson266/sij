# ROPA Page Setup

**Date:** 2026-01-03  
**Status:** Initial Structure Created - Package Installation Required

## What Was Created

### 1. ROPA API Service
**File:** `frontend/src/modules/ropa/services/ropaApi.ts`

Complete API service with all CRUD operations for:
- Repositories
- Activities
- Data Elements
- DPIAs
- Risks

### 2. ROPA Page Component
**File:** `frontend/src/modules/ropa/pages/ROPAPage.tsx`

Full page component that:
- Displays tenant name in header
- Shows hierarchical tree view of ROPA structure
- Fetches all ROPA data and builds tree structure
- Handles loading and error states
- Checks permissions (owner/admin only)

### 3. Route Added
**File:** `frontend/src/App.tsx`

Route: `/tenant/:id/ropa`
- Protected route (requires authentication)
- Uses ROPAPage component

## Tree Structure

The tree view displays the ROPA hierarchy:

```
📁 Repository
  ├── 📋 Activity
  │   ├── 📊 Data Element
  │   └── 📝 DPIA
  │       └── ⚠️ Risk
```

## Required Package Installation

**MUI X Tree View** needs to be installed:

```bash
cd frontend
npm install @mui/x-tree-view
```

**Note:** The package is not yet installed. The code uses `RichTreeView` from `@mui/x-tree-view/RichTreeView`.

## Current Features

✅ Tenant name display  
✅ Tree view structure  
✅ Hierarchical data loading  
✅ Permission checking  
✅ Loading states  
✅ Error handling  
✅ Navigation (Back to Workspace button)

## Next Steps

1. **Install MUI X Tree View:**
   ```bash
   cd frontend
   npm install @mui/x-tree-view
   ```

2. **Rebuild Frontend:**
   ```bash
   ./scripts/build-frontend.sh
   docker compose restart nginx
   ```

3. **Add Navigation Link:**
   - Add ROPA card/button to the tenant workspace page to navigate to ROPA page

4. **Enhance Tree View:**
   - Add icons for different node types
   - Add click handlers to view/edit items
   - Add context menu for actions (edit, delete)
   - Add create buttons for each level

5. **Module Enablement Check:**
   - Check if ROPA module is enabled before showing
   - Show appropriate message if disabled

## Tree View Customization

The current implementation uses `RichTreeView` with:
- Default expanded items (all nodes expanded)
- Basic label display
- Hierarchical structure

**Future enhancements:**
- Custom node rendering with icons
- Click handlers for viewing/editing
- Context menus for actions
- Drag and drop (if needed)
- Search/filter functionality

## API Integration

The page fetches data in this order:
1. Repositories (for tenant)
2. For each repository → Activities
3. For each activity → Data Elements and DPIAs (parallel)
4. For each DPIA → Risks

This creates a complete tree structure with all relationships.

## File Structure

```
frontend/src/modules/ropa/
├── pages/
│   ├── ROPAPage.tsx          ← Main ROPA page with tree view
│   └── index.ts
├── services/
│   ├── ropaApi.ts            ← Complete API service
│   └── index.ts
└── components/                ← (To be created)
```

---

**Last Updated:** 2026-01-03  
**Next:** Install package and test



