import * as React from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router';
import {
  Avatar,
  Button,
  Link,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { PageLayout } from '../components/layout';
import { apiPost } from '../services/api';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = React.useState(true);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Verification token is missing');
        setIsLoading(false);
        return;
      }

      try {
        await apiPost('/api/auth/verify-email', { token });
        setSuccess(true);
        setError(null);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err: any) {
        setError(err?.message || 'Invalid or expired verification link');
        setSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <PageLayout component="main" maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: success ? 'success.main' : 'primary.main' }}>
          <MarkEmailReadOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Email Verification
        </Typography>

        {isLoading && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>
              Verifying your email...
            </Typography>
          </Box>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 3, width: '100%' }}>
            Email verified successfully! Redirecting to login...
          </Alert>
        )}

        {error && (
          <>
            <Alert severity="error" sx={{ mt: 3, width: '100%' }}>
              {error}
            </Alert>
            <Box sx={{ mt: 3, textAlign: 'center', width: '100%' }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                fullWidth
              >
                Go to Login
              </Button>
              <Box sx={{ mt: 2 }}>
                <Link component={RouterLink} to="/register" variant="body2">
                  Create a new account
                </Link>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </PageLayout>
  );
}
