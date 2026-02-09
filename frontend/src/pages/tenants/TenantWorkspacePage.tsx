import * as React from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router';
import {
  Box,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Public as PublicIcon,
  ArrowForward as ArrowForwardIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { PageLayout } from '../../components/layout';
import { useTenantData } from './hooks/useTenantData';

export default function TenantWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { tenant, userTenant, canManageSettings, canAccessRopa, isLoading, error } = useTenantData(id);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && tenant?.id) {
      window.localStorage.setItem('lastActiveTenantId', tenant.id);
    }
  }, [tenant?.id]);

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
        <Button component={RouterLink} to="/tenants" variant="contained">
          Back to Tenants
        </Button>
      </PageLayout>
    );
  }

  if (!tenant || !userTenant) {
    return null;
  }

  const publicPageUrl = tenant.slug ? `/tenant/${tenant.slug}` : null;
  const domainName = import.meta.env.VITE_DOMAIN_NAME || 'localhost';
  const subdomainUrl = tenant.slug ? `https://${tenant.slug}.${domainName}` : null;

  return (
    <PageLayout maxWidth="md" title={tenant.name}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Tenant Information
              </Typography>
              <List disablePadding>
                <ListItem disablePadding sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Link href={`mailto:${tenant.email}`} underline="hover">
                        {tenant.email}
                      </Link>
                    }
                  />
                </ListItem>
                {tenant.phone && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <PhoneIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Link href={`tel:${tenant.phone}`} underline="hover">
                          {tenant.phone}
                        </Link>
                      }
                    />
                  </ListItem>
                )}
                {subdomainUrl && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <LanguageIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Link href={subdomainUrl} target="_blank" rel="noopener" underline="hover">
                          {subdomainUrl}
                        </Link>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {canManageSettings && (
              <Card
                variant="outlined"
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 }, flex: 1 }}
                onClick={() => navigate(`/tenant/${tenant.id}/settings`)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SettingsIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                        <Typography>Settings</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Manage tenant details, access control, and members
                      </Typography>
                    </Box>
                    <ArrowForwardIcon color="action" />
                  </Box>
                </CardContent>
              </Card>
            )}

            {canAccessRopa && (
              <Card
                variant="outlined"
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 }, flex: 1 }}
                onClick={() => navigate(`/tenant/${tenant.id}/ropa`)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <StorageIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                        <Typography>ROPA</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Record of Processing Activities (GDPR Article 30)
                      </Typography>
                    </Box>
                    <ArrowForwardIcon color="action" />
                  </Box>
                </CardContent>
              </Card>
            )}

            {publicPageUrl && (
              <Card
                variant="outlined"
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 }, flex: 1 }}
                onClick={() => navigate(publicPageUrl)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PublicIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                        <Typography>Public Page</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        View your public booking page
                      </Typography>
                      {subdomainUrl && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {subdomainUrl}
                        </Typography>
                      )}
                    </Box>
                    <ArrowForwardIcon color="action" />
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
    </PageLayout>
  );
}
