import { Box, Typography, Paper, Avatar, Card, CardContent, Divider } from '@mui/material';
import { Business as BusinessIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts';
import { PageLayout } from '../components/layout';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get user display name
  const displayName = user
    ? user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.first_name || user.email
    : 'User';

  return (
    <PageLayout maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              bgcolor: 'primary.main',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h4" component="h2" gutterBottom>
            Welcome, {displayName}!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You have successfully logged in to your dashboard.
          </Typography>
          {user && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1,
                textAlign: 'left',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Account Information
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Email:</strong> {user.email}
              </Typography>
              {user.first_name && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>First Name:</strong> {user.first_name}
                </Typography>
              )}
              {user.last_name && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Last Name:</strong> {user.last_name}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Email Verified:</strong>{' '}
                {user.is_email_verified ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }} onClick={() => navigate('/tenants')}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <BusinessIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6">My Tenants</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage your tenants and organizations
                    </Typography>
                  </Box>
                </Box>
                <ArrowForwardIcon color="action" />
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    </PageLayout>
  );
}

