import * as React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, CircularProgress } from '@mui/material';
import { PageLayout } from '../components/layout';
import { useAuth, useNotification } from '../contexts';
import { getUserTenants } from '../services/authApi';

interface UserTenant {
  tenant_user: {
    id: string;
    role: string;
    is_active: boolean;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [tenants, setTenants] = React.useState<UserTenant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadTenants = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getUserTenants();
        setTenants(data);
      } catch (error: any) {
        showError(error?.message || 'Failed to load tenant roles');
      } finally {
        setIsLoading(false);
      }
    };

    loadTenants();
  }, [user?.id, showError]);

  if (!user) {
    return (
      <PageLayout maxWidth="md" title="Profile">
        <Typography color="text.secondary">No user information available.</Typography>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="md" title="Profile">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              {(user.first_name || user.last_name) && (
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Email verified: {user.is_email_verified ? 'Yes' : 'No'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tenant Roles
              </Typography>
              {isLoading ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : tenants.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tenant memberships found.
                </Typography>
              ) : (
                <Box display="flex" flexDirection="column" gap={1}>
                  {tenants.map((item) => (
                    <Box key={item.tenant.id} display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2">{item.tenant.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.tenant.slug}
                        </Typography>
                      </Box>
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
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageLayout>
  );
}
