import * as React from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts';
import { getTenantPublicInfo } from '../services/tenantApi';
import { getTenantSlugFromSubdomain } from '../utils/subdomain';
import { PageLayout } from '../components/layout';
import { BookingForm } from '../modules/booker/components';
import type { TenantPublic } from '../types';

export default function TenantPublicPage() {
  const { slug: slugFromUrl } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Get tenant slug from subdomain (primary) or URL param (fallback for /tenant/:slug)
  const slugFromSubdomain = getTenantSlugFromSubdomain();
  const slug = slugFromSubdomain || slugFromUrl || null;
  
  const [tenant, setTenant] = React.useState<TenantPublic | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!slug) {
      setError('Invalid tenant slug');
      setIsLoading(false);
      return;
    }

    const fetchTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getTenantPublicInfo(slug);
        setTenant(data);
      } catch (err) {
        const errorMessage =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Failed to load tenant information';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, [slug]);

  if (isLoading) {
    return (
      <PageLayout component="main" maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (error || !tenant) {
    return (
      <PageLayout component="main" maxWidth="md">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Tenant not found'}
        </Alert>
        <Button component={RouterLink} to="/" variant="contained">
          Go to Home
        </Button>
      </PageLayout>
    );
  }

  if (!tenant.is_active) {
    return (
      <PageLayout component="main" maxWidth="md">
        <Alert severity="warning" sx={{ mb: 2 }}>
          This tenant is currently inactive.
        </Alert>
        <Button component={RouterLink} to="/" variant="contained">
          Go to Home
        </Button>
      </PageLayout>
    );
  }

  const handleBookClick = () => {
    if (!isAuthenticated) {
      // Redirect to login, then come back here
      // If on subdomain, preserve the subdomain; otherwise use /tenant/:slug
      const returnPath = slugFromSubdomain 
        ? window.location.pathname 
        : `/tenant/${slug}`;
      navigate('/login', { state: { from: { pathname: returnPath } } });
    } else if (tenant.can_book) {
      // TODO: Open booking interface
      alert('Booking interface coming soon!');
    } else {
      // User is authenticated but can't book (not a member)
      alert('Please contact the tenant to request access.');
    }
  };

  return (
    <PageLayout component="main" maxWidth="md">
      {/* Hero Section */}
      <Box
        sx={{
          mb: 5,
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(156, 39, 176, 0.03) 100%)',
          borderRadius: 3,
          py: 6,
          px: 4,
        }}
      >
        <BusinessIcon
          sx={{
            fontSize: 72,
            color: 'primary.main',
            mb: 2,
            opacity: 0.9,
          }}
        />
        <Typography variant="h3" component="h1" gutterBottom fontWeight={600}>
          {tenant.name}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
          sx={{ mt: 2 }}
        >
          {tenant.is_verified && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Verified"
              color="success"
              size="medium"
            />
          )}
          <Chip
            label={tenant.subscription_tier}
            size="medium"
            variant="outlined"
          />
          {tenant.is_member && tenant.user_role && (
            <Chip
              label={`Member (${tenant.user_role})`}
              color="primary"
              size="medium"
            />
          )}
        </Stack>
      </Box>

      {/* Contact Information */}
      {(tenant.email || tenant.phone) && (
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Contact Information
            </Typography>
            <List disablePadding>
              {tenant.email && (
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
              )}
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
            </List>
          </CardContent>
        </Card>
      )}

      {/* Booking Section */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
            Book an Appointment
          </Typography>

        {tenant.can_book ? (
          // User can book (based on access control settings) - works for both authenticated and unauthenticated
          <BookingForm tenantId={tenant.id} tenantSlug={slug || undefined} tenant={tenant} />
        ) : !isAuthenticated ? (
          // Cannot book and not authenticated - show login required
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={handleBookClick}
              fullWidth
            >
              Log In to Book
            </Button>
            <Button
              component={RouterLink}
              to="/register"
              variant="outlined"
              size="large"
              fullWidth
            >
              Create an Account
            </Button>
          </Stack>
        ) : (
          // Cannot book but authenticated - show membership required
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
            {tenant.is_member
              ? 'Your membership may be inactive. Please contact the tenant.'
              : `You need to be a member of ${tenant.name} to book appointments.`}
          </Alert>
        )}
        </CardContent>
      </Card>

      {/* Additional Metadata */}
      {tenant.tenant_metadata && Object.keys(tenant.tenant_metadata).length > 0 && (
        <Card variant="outlined" sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Additional Information
            </Typography>
            <Box
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: 'text.secondary',
                bgcolor: 'grey.50',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                m: 0,
              }}
            >
              {JSON.stringify(tenant.tenant_metadata, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

