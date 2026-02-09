import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { deleteTenant } from '../../services/tenantApi';
import { PageLayout } from '../../components/layout';
import { useTenantData } from './hooks/useTenantData';
import TenantHeader from './components/TenantHeader';
import TenantDetailsTab from './components/TenantDetailsTab';
import BookingSettingsTab from './components/BookingSettingsTab';
import TenantMembersTab from './components/TenantMembersTab';
import ROPASettingsTab from './components/ROPASettingsTab';
import type { Tenant } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tenant-tabpanel-${index}`}
      aria-labelledby={`tenant-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `tenant-tab-${index}`,
    'aria-controls': `tenant-tabpanel-${index}`,
  };
}

export default function TenantSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get tab from URL or default to 0 (Details)
  // Tabs: 0=Details, 1=Booking, 2=Members, 3=ROPA (will be added in Phase 2)
  const tabFromUrl = parseInt(searchParams.get('tab') || '0', 10);
  const [tabValue, setTabValue] = React.useState(tabFromUrl >= 0 && tabFromUrl <= 3 ? tabFromUrl : 0);
  
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const {
    tenant,
    userTenant,
    canManageSettings,
    canManageMembers,
    canDelete,
    isLoading,
    error,
    refetch,
    updateTenant,
  } = useTenantData(id);

  // Sync tab value with URL
  React.useEffect(() => {
    const urlTab = parseInt(searchParams.get('tab') || '0', 10);
    if (urlTab >= 0 && urlTab <= 3 && urlTab !== tabValue) {
      setTabValue(urlTab);
    }
  }, [searchParams, tabValue]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Update URL with tab parameter
    const newSearchParams = new URLSearchParams(searchParams);
    if (newValue === 0) {
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', newValue.toString());
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await deleteTenant(id, true);
      navigate('/tenants');
    } catch (err: any) {
      // Error handling - could show snackbar
      console.error('Failed to delete tenant:', err);
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleTenantUpdate = (updatedTenant: Tenant) => {
    // Update tenant state directly without refetching
    // This prevents page reload and unnecessary API calls
    // The updated tenant is already the latest data from the server
    updateTenant(updatedTenant);
  };

  const handleSettingsClick = () => {
    setTabValue(1);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', '1');
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleMembersClick = () => {
    setTabValue(2);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', '2');
    setSearchParams(newSearchParams, { replace: true });
  };

  // Only show full-page loading on initial load (when tenant is null)
  if (isLoading && !tenant) {
    return (
      <PageLayout maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (error && !tenant) {
    return (
      <PageLayout maxWidth="md">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button component="button" onClick={() => navigate('/tenants')} variant="contained">
          Back to Tenants
        </Button>
      </PageLayout>
    );
  }

  if (!tenant || !userTenant) {
    return null;
  }

  return (
    <PageLayout
      maxWidth="md"
      title={tenant.name}
      actions={
        <>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/tenants')}
            variant="outlined"
          >
            Back to Tenants
          </Button>
          {id && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/tenant/${id}/workspace`)}
            >
              Owner Dashboard
            </Button>
          )}
        </>
      }
      subNavigation={
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="tenant management tabs"
          >
            <Tab
              label="Details"
              icon={<BusinessIcon />}
              iconPosition="start"
              {...a11yProps(0)}
            />
            <Tab
              label="Booking"
              icon={<SettingsIcon />}
              iconPosition="start"
              {...a11yProps(1)}
              disabled={!canManageSettings}
            />
            <Tab
              label="Members"
              icon={<PeopleIcon />}
              iconPosition="start"
              {...a11yProps(2)}
              disabled={!canManageMembers}
            />
            <Tab
              label="ROPA"
              icon={<DescriptionIcon />}
              iconPosition="start"
              {...a11yProps(3)}
              disabled={!canManageSettings}
            />
          </Tabs>
        </Box>
      }
    >
      <Paper sx={{ p: 4 }}>
        <TenantHeader
          tenant={tenant}
          userTenant={userTenant}
          canManageSettings={canManageSettings}
          canManageMembers={canManageMembers}
          canDelete={canDelete}
          onDeleteClick={() => setDeleteDialogOpen(true)}
          onSettingsClick={handleSettingsClick}
          onMembersClick={handleMembersClick}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          <TenantDetailsTab
            tenant={tenant}
            onUpdate={handleTenantUpdate}
            isLoading={isLoading}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {canManageSettings ? (
            <BookingSettingsTab
              tenant={tenant}
              onUpdate={handleTenantUpdate}
            />
          ) : (
            <Alert severity="error">
              You don't have permission to edit booking settings.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {canManageMembers ? (
            <TenantMembersTab
              tenant={tenant}
              userTenant={userTenant}
              onMembersUpdate={refetch}
            />
          ) : (
            <Alert severity="error">
              You don't have permission to manage members.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {canManageSettings ? (
            <ROPASettingsTab
              tenant={tenant}
              onUpdate={handleTenantUpdate}
            />
          ) : (
            <Alert severity="error">
              You don't have permission to edit ROPA settings.
            </Alert>
          )}
        </TabPanel>
      </Paper>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{tenant.name}"? This action cannot be undone.
            The tenant will be soft-deleted and can be restored later if needed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}

