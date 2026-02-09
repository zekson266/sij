import * as React from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Avatar,
  Button,
  FormControlLabel,
  Checkbox,
  Link,
  Box,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts';
import { PageLayout } from '../components/layout';
import { FormTextField } from '../components/common';
import { loginSchema, type LoginFormData } from '../schemas/validation';
import { handleApiErrors } from '../utils/formHelpers';
import { apiPost, storeUser } from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get('token');
  const inviteSearch = inviteToken ? `?token=${encodeURIComponent(inviteToken)}` : '';

  const {
    control,
    handleSubmit,
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data);
      // Clear errors on successful login
      setError(null);
      // Don't manually navigate - AuthRoute will automatically redirect
      // when isAuthenticated becomes true, preventing race conditions
    } catch (err) {
      // Handle API errors using our utility function
      handleApiErrors(err, setFormError, setError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response: any = await apiPost('/api/auth/google', {
        credential: credentialResponse.credential
      });
      // Store user data to localStorage before redirect
      if (response.user) {
        storeUser(response.user);
      }
      // Reload to trigger auth context update
      if (inviteToken) {
        window.location.href = `/accept-invitation?token=${encodeURIComponent(inviteToken)}`;
      } else {
        // Redirect to tenants list, which will auto-redirect to tenant owner page if single tenant
        window.location.href = '/tenants';
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed');
  };

  return (
    <PageLayout component="main" maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1, width: '100%' }}
        >
          <FormTextField
            name="email"
            control={control}
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            autoFocus
            disabled={isLoading}
            margin="normal"
          />
          <FormTextField
            name="password"
            control={control}
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            disabled={isLoading}
            margin="normal"
          />
          <FormControlLabel
            control={<Checkbox value="remember" color="primary" />}
            label="Remember me"
            disabled={isLoading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>

          <Box sx={{ mb: 2 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot password?
            </Link>
            <Link component={RouterLink} to={`/register${inviteSearch}`} variant="body2">
              {"Don't have an account? Sign Up"}
            </Link>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
}
