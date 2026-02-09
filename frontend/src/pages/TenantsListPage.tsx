import * as React from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowForwardIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { getUserTenants } from '../services/authApi';
import { PageLayout } from '../components/layout';

interface UserTenant {
  tenant_user: {
    id: string;
    role: string;
    is_active: boolean;
    effective_permissions?: string[];
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    domain?: string;
  };
}

export default function TenantsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = React.useState<UserTenant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const lastTenantId =
    typeof window !== 'undefined' ? window.localStorage.getItem('lastActiveTenantId') : null;
  const postAuthRedirect = (location.state as { postAuthRedirect?: boolean } | null)?.postAuthRedirect;

  React.useEffect(() => {
    const fetchTenants = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getUserTenants();
        setTenants(data);

        if (postAuthRedirect) {
          // Auto-redirect to last active tenant when possible
          if (lastTenantId) {
            const lastTenant = data.find(
              (item) => item.tenant.id === lastTenantId && item.tenant_user.is_active
            );
            if (lastTenant) {
              setIsRedirecting(true);
              navigate(`/tenant/${lastTenant.tenant.id}/workspace`, { replace: true });
              return; // Don't render the list
            }
          }

          // Auto-redirect if user has only one active tenant
          if (data.length === 1) {
            const singleTenant = data[0];
            const isActive = singleTenant.tenant_user.is_active;

            if (isActive) {
              setIsRedirecting(true);
              navigate(`/tenant/${singleTenant.tenant.id}/workspace`, { replace: true });
              return; // Don't render the list
            }
          }

          if (data.length === 0) {
            setIsRedirecting(true);
            navigate('/tenants/new', { replace: true });
            return;
          }
        }
      } catch (err) {
        const errorMessage =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Failed to load tenants';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [navigate]);

  if (isLoading || isRedirecting) {
    return (
      <PageLayout maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      maxWidth="md"
      title="My Tenants"
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tenants/new')}
        >
          Create Tenant
        </Button>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {tenants.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Tenants Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first tenant to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tenants/new')}
          >
            Create Your First Tenant
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {tenants.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.tenant.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h2">
                      {item.tenant.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Slug: {item.tenant.slug}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={item.tenant_user.role}
                      size="small"
                      color={
                        item.tenant_user.role === 'owner'
                          ? 'primary'
                          : item.tenant_user.role === 'admin'
                          ? 'secondary'
                          : item.tenant_user.role === 'editor'
                          ? 'info'
                          : 'default'
                      }
                    />
                    {!item.tenant_user.is_active && (
                      <Chip label="Inactive" size="small" color="error" />
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    component={RouterLink}
                  to={`/tenant/${item.tenant.id}/workspace`}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('lastActiveTenantId', item.tenant.id);
                    }
                  }}
                  >
                    View Details
                  </Button>
                  {(item.tenant_user.effective_permissions ?? []).some((permission) =>
                    ['tenant:settings', 'tenant:write'].includes(permission)
                  ) && (
                    <Button
                      size="small"
                      startIcon={<SettingsIcon />}
                      component={RouterLink}
                      to={`/tenant/${item.tenant.id}/settings`}
                    >
                      Settings
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </PageLayout>
  );
}


