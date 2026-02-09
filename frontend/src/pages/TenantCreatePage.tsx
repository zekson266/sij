import * as React from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../contexts';
import { createTenant } from '../services/tenantApi';
import { createTenantAsAdmin, listAllUsers } from '../services/adminApi';
import { PageLayout } from '../components/layout';
import { FormTextField, FormSelect } from '../components/common';
import { tenantFormSchema, type TenantFormData } from '../schemas/validation';
import { handleApiErrors } from '../utils/formHelpers';
import type { User } from '../types';

export default function TenantCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperuser = user?.is_superuser ?? false;

  const [ownerId, setOwnerId] = React.useState<string>('');
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError: setFormError,
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      slug: '',
      domain: '',
      subscription_tier: 'free' as const,
    },
  });

  // Load users if superuser
  React.useEffect(() => {
    if (isSuperuser) {
      const loadUsers = async () => {
        try {
          setIsLoadingUsers(true);
          const data = await listAllUsers({ limit: 100, is_active: true });
          setUsers(data);
          // Default to current user
          if (user) {
            setOwnerId(user.id);
          }
        } catch (err) {
          console.error('Failed to load users:', err);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      loadUsers();
    }
  }, [isSuperuser, user]);

  const onSubmit = async (data: TenantFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Normalize slug and convert empty strings to undefined for optional fields
      let normalizedSlug: string | undefined = undefined;
      if (data.slug) {
        // Apply slug normalization (same logic as schema transform)
        let normalized = data.slug.toLowerCase().trim().replace(/\s+/g, '-');
        normalized = normalized.replace(/[^a-z0-9-]/g, '');
        normalized = normalized.replace(/-+/g, '-');
        normalized = normalized.replace(/^-+|-+$/g, '');
        normalizedSlug = normalized || undefined;
      }

      const tenantData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        slug: normalizedSlug,
        domain: data.domain || undefined,
        subscription_tier: data.subscription_tier,
      };

      let tenant;
      if (isSuperuser) {
        // Use admin endpoint with owner assignment
        tenant = await createTenantAsAdmin(tenantData, ownerId || undefined);
      } else {
        // Use regular endpoint (creator becomes owner)
        tenant = await createTenant(tenantData);
      }

      // Redirect to tenant owner page
      navigate(`/tenant/${tenant.id}/workspace`);
    } catch (err) {
      // Handle API errors using our utility function
      handleApiErrors(err, setFormError, setError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const subscriptionTierOptions = [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  return (
    <PageLayout
      maxWidth="md"
      title="Create New Tenant"
      description={
        isSuperuser
          ? 'Create a tenant and assign an owner (superuser only).'
          : 'Create a new tenant. You will automatically become the owner.'
      }
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/tenants')}
        sx={{ mb: 2 }}
      >
        Back to Tenants
      </Button>

      <Paper sx={{ p: 4 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {isSuperuser && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Owner</InputLabel>
              <Select
                value={ownerId}
                label="Owner"
                onChange={(e) => setOwnerId(e.target.value)}
                disabled={isLoadingUsers}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.email} {u.first_name && `(${u.first_name} ${u.last_name || ''})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormTextField
            name="name"
            control={control}
            label="Tenant Name"
            required
            sx={{ mb: 2 }}
          />

          <FormTextField
            name="email"
            control={control}
            label="Email"
            type="email"
            required
            sx={{ mb: 2 }}
          />

          <FormTextField
            name="phone"
            control={control}
            label="Phone (Optional)"
            sx={{ mb: 2 }}
          />

          <FormTextField
            name="slug"
            control={control}
            label="Slug (Optional)"
            helperText="URL-friendly identifier (auto-generated if not provided)"
            sx={{ mb: 2 }}
          />

          <FormTextField
            name="domain"
            control={control}
            label="Domain (Optional)"
            sx={{ mb: 2 }}
          />

          <FormSelect<TenantFormData>
            name="subscription_tier"
            control={control as any}
            label="Subscription Tier"
            options={subscriptionTierOptions}
            sx={{ mb: 3 }}
          />

          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => navigate('/tenants')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Create Tenant'}
            </Button>
          </Box>
        </form>
      </Paper>
    </PageLayout>
  );
}
