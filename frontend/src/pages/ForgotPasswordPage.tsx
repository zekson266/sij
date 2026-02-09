import * as React from 'react';
import { Link as RouterLink } from 'react-router';
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

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    control,
    handleSubmit,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await apiPost('/api/auth/forgot-password', data);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email');
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
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockResetOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Enter your email and we'll send you a link to reset your password
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            If that email exists, we sent a password reset link. Please check your inbox.
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading || success}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to Sign In
            </Link>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
}
