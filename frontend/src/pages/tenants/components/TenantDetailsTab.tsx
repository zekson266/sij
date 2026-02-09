import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { FormTextField, FormSelect } from '../../../components/common';
import { tenantFormSchema, type TenantFormData } from '../../../schemas/validation';
import { handleApiErrors } from '../../../utils/formHelpers';
import { updateTenant } from '../../../services/tenantApi';
import { useNotification } from '../../../contexts';
import type { Tenant } from '../../../types';

interface TenantDetailsTabProps {
  tenant: Tenant;
  onUpdate: (updatedTenant: Tenant) => void;
  isLoading?: boolean;
}

export default function TenantDetailsTab({
  tenant,
  onUpdate,
  isLoading = false,
}: TenantDetailsTabProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { showSuccess, showError } = useNotification();

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema) as any,
    defaultValues: {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      slug: tenant.slug || '',
      domain: tenant.domain || '',
      subscription_tier: tenant.subscription_tier as 'free' | 'pro' | 'enterprise',
    },
  });

  const subscriptionTierOptions = [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  React.useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone || '',
        slug: tenant.slug || '',
        domain: tenant.domain || '',
        subscription_tier: tenant.subscription_tier as 'free' | 'pro' | 'enterprise',
      });
    }
  }, [tenant?.id, reset]); // Only reset when tenant ID changes, not when object reference changes

  const onSubmit = async (data: TenantFormData) => {
    if (!tenant) return;

    try {
      setIsSaving(true);

      // Normalize slug and convert empty strings to undefined
      let normalizedSlug: string | undefined = undefined;
      if (data.slug) {
        let normalized = data.slug.toLowerCase().trim().replace(/\s+/g, '-');
        normalized = normalized.replace(/[^a-z0-9-]/g, '');
        normalized = normalized.replace(/-+/g, '-');
        normalized = normalized.replace(/^-+|-+$/g, '');
        normalizedSlug = normalized || undefined;
      }

      const updated = await updateTenant(tenant.id, {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        slug: normalizedSlug,
        domain: data.domain || undefined,
        subscription_tier: data.subscription_tier,
      });

      showSuccess('Tenant details updated successfully!');
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      handleApiErrors(err, setFormError, (errorMessage) => showError(errorMessage));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!tenant) return;
    setIsEditing(false);
    reset({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      slug: tenant.slug || '',
      domain: tenant.domain || '',
      subscription_tier: tenant.subscription_tier as 'free' | 'pro' | 'enterprise',
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
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
            label="Phone"
            sx={{ mb: 2 }}
          />

          <FormTextField
            name="slug"
            control={control}
            label="Slug"
            sx={{ mb: 2 }}
          />

          <FormTextField
            name="domain"
            control={control}
            label="Domain"
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
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Box>
        </form>
      ) : (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Tenant Information
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Email:</strong> {tenant.email}
            </Typography>
            {tenant.phone && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Phone:</strong> {tenant.phone}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Slug:</strong> {tenant.slug}
            </Typography>
            {tenant.domain && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Domain:</strong> {tenant.domain}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Subscription Tier:</strong> {tenant.subscription_tier}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Created:</strong>{' '}
              {new Date(tenant.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

