import * as React from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Avatar,
  Button,
  Link,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import { PageLayout } from '../components/layout';
import { FormTextField } from '../components/common';
import { apiPost } from '../services/api';

const resetPasswordSchema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    control,
    handleSubmit,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues:{
      new_password: '',
      confirm_password: '',
    },
  });

  React.useEffect(() => {
    if (!token) {
      setError('Reset token is missing');
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Reset token is missing');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiPost('/api/auth/reset-password', {
        token,
        new_password: data.new_password,
      });
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired reset link');
    } finally {
      setIsLoading(false);
    }
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
        <Avatar sx={{ m: 1, bgcolor: success ? 'success.main' : 'primary.main' }}>
          <LockResetOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Enter your new password
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            Password reset successfully! Redirecting to login...
          </Alert>
        )}

        {!success && token && (
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ mt: 1, width: '100%' }}
          >
            <FormTextField
              name="new_password"
              control={control}
              label="New Password"
              type="password"
              required
              autoComplete="new-password"
              autoFocus
              disabled={isLoading}
              margin="normal"
            />
            <FormTextField
              name="confirm_password"
              control={control}
              label="Confirm Password"
              type="password"
              required
              autoComplete="new-password"
              disabled={isLoading}
              margin="normal"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Back to Sign In
              </Link>
            </Box>
          </Box>
        )}

        {!token && (
          <Box sx={{ mt: 3, textAlign: 'center', width: '100%' }}>
            <Button
              component={RouterLink}
              to="/forgot-password"
              variant="contained"
              fullWidth
            >
              Request New Reset Link
            </Button>
          </Box>
        )}
      </Box>
    </PageLayout>
  );
}
