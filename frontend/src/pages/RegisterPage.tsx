import * as React from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Avatar,
  Button,
  Link,
  Box,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { GoogleLogin } from '@react-oauth/google';
import { PageLayout } from '../components/layout';
import { FormTextField } from '../components/common';
import { registerSchema, type RegisterFormData } from '../schemas/validation';
import { handleApiErrors } from '../utils/formHelpers';
import { apiPost, storeUser } from '../services/api';

export default function RegisterPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get('token');
  const inviteSearch = inviteToken ? `?token=${encodeURIComponent(inviteToken)}` : '';

  const {
    control,
    handleSubmit,
    setError: setFormError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert empty strings to undefined for optional fields
      const registerData = {
        email: data.email,
        password: data.password,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
      };

      await apiPost('/api/auth/register', registerData);
      setSuccess(true);
      setUserEmail(data.email);
      setError(null);
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
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-up was cancelled or failed');
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
          <PersonAddOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            Registration successful! Please check your email ({userEmail}) to verify your account.
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
            disabled={isLoading || success}
            margin="normal"
          />
          <FormTextField
            name="first_name"
            control={control}
            label="First Name"
            autoComplete="given-name"
            disabled={isLoading || success}
            margin="normal"
          />
          <FormTextField
            name="last_name"
            control={control}
            label="Last Name"
            autoComplete="family-name"
            disabled={isLoading || success}
            margin="normal"
          />
          <FormTextField
            name="password"
            control={control}
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            disabled={isLoading || success}
            margin="normal"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading || success}
          >
            {isLoading ? 'Signing up...' : 'Sign Up'}
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>

          <Box sx={{ mb: 2 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link component={RouterLink} to={`/login${inviteSearch}`} variant="body2">
              Already have an account? Sign in
            </Link>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
}
