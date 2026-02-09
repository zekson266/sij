import * as React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  IconButton,
  Radio,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { updateTenant } from '../../../services/tenantApi';
import { useNotification } from '../../../contexts';
import { getBookingServices } from '../../../modules/booker/services/bookingServices';
import type { Tenant } from '../../../types';

interface BookingService {
  value: string;
  label: string;
  is_default: boolean;
}

interface BookingSettingsFormData {
  booking_services: BookingService[];
}

interface BookingSettingsTabProps {
  tenant: Tenant;
  onUpdate: (updatedTenant: Tenant) => void;
}

export default function BookingSettingsTab({
  tenant,
  onUpdate,
}: BookingSettingsTabProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { showSuccess, showError } = useNotification();

  const { handleSubmit, reset, control, watch, setValue } = useForm<BookingSettingsFormData>({
    defaultValues: {
      booking_services: [],
    },
  });

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control,
    name: 'booking_services',
  });

  const bookingServices = watch('booking_services');

  React.useEffect(() => {
    // Get booking services from tenant settings
    // Only reset when tenant ID changes (switching tenants), not on every object reference change
    const services = getBookingServices(tenant);
    const bookingServices: BookingService[] = services.map((service) => ({
      value: service.value,
      label: service.label,
      is_default: service.is_default || false,
    }));

    reset({
      booking_services: bookingServices,
    });
  }, [tenant?.id, reset]); // Only reset when tenant ID changes, not when object reference changes

  const onSubmit = async (data: BookingSettingsFormData) => {
    if (!tenant) {
      return;
    }

    // Validation: At least one service required
    if (!data.booking_services || data.booking_services.length === 0) {
      showError('At least one booking service is required');
      return;
    }

    // Validation: Exactly one default service
    const defaultCount = data.booking_services.filter((s) => s.is_default).length;
    if (defaultCount !== 1) {
      showError('Exactly one service must be set as default');
      return;
    }

    // Validation: Unique service values
    const values = data.booking_services.map((s) => s.value.toLowerCase().trim());
    const uniqueValues = new Set(values);
    if (values.length !== uniqueValues.size) {
      showError('Service values must be unique');
      return;
    }

    try {
      setIsSaving(true);

      // Build booking services structure
      const bookingServices = data.booking_services.map((service) => ({
        value: service.value.trim().toLowerCase(),
        label: service.label.trim(),
        is_default: service.is_default,
      }));

      // Merge with existing settings, using module_config.booking structure
      const currentSettings = (tenant.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        module_config: {
          ...(currentSettings.module_config || {}),
          booking: {
            services: bookingServices,
          },
        },
      };

      // updateTenant already returns the updated tenant, use it directly
      const updatedTenant = await updateTenant(tenant.id, {
        settings: updatedSettings,
      });

      showSuccess('Booking settings saved successfully!');
      
      // Update parent with the updated tenant (no need to refetch)
      onUpdate(updatedTenant);
    } catch (err: any) {
      const errorMessage = err?.message || err?.detail || 'Failed to save booking settings';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddService = () => {
    appendService({
      value: '',
      label: '',
      is_default: serviceFields.length === 0, // First service is default
    });
  };

  const handleRemoveService = (index: number) => {
    if (serviceFields.length <= 1) {
      showError('At least one service is required');
      return;
    }
    removeService(index);
  };

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Typography variant="h6" gutterBottom>
          Booking Services
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure the services available for booking. Each service has its own independent calendar.
          At least one service is required, and exactly one must be set as default.
        </Typography>

        <Card variant="outlined">
          <CardContent>
            {serviceFields.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                No services configured. Add at least one service to enable booking.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {serviceFields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Controller
                      name={`booking_services.${index}.is_default`}
                      control={control}
                      render={({ field: defaultField }) => (
                        <FormControlLabel
                          control={
                            <Radio
                              checked={defaultField.value || false}
                              onChange={() => {
                                // Set all services to false, then set this one to true
                                if (bookingServices) {
                                  bookingServices.forEach((_, idx) => {
                                    setValue(`booking_services.${idx}.is_default`, idx === index);
                                  });
                                }
                              }}
                            />
                          }
                          label="Default"
                          sx={{ minWidth: 100 }}
                        />
                      )}
                    />
                    <Controller
                      name={`booking_services.${index}.value`}
                      control={control}
                      rules={{
                        required: 'Service value is required',
                        pattern: {
                          value: /^[a-z0-9_-]+$/,
                          message: 'Value must contain only lowercase letters, numbers, hyphens, and underscores',
                        },
                      }}
                      render={({ field: valueField, fieldState: { error } }) => (
                        <TextField
                          {...valueField}
                          label="Service Value"
                          placeholder="e.g., consultation"
                          error={!!error}
                          helperText={error?.message || 'Used internally (lowercase, no spaces)'}
                          size="small"
                          sx={{ flex: 1 }}
                        />
                      )}
                    />
                    <Controller
                      name={`booking_services.${index}.label`}
                      control={control}
                      rules={{ required: 'Service label is required' }}
                      render={({ field: labelField, fieldState: { error } }) => (
                        <TextField
                          {...labelField}
                          label="Service Label"
                          placeholder="e.g., Consultation"
                          error={!!error}
                          helperText={error?.message || 'Display name shown to users'}
                          size="small"
                          sx={{ flex: 1 }}
                        />
                      )}
                    />
                    <IconButton
                      onClick={() => handleRemoveService(index)}
                      color="error"
                      disabled={serviceFields.length <= 1}
                      title={serviceFields.length <= 1 ? 'At least one service is required' : 'Remove service'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            <Button
              startIcon={<AddIcon />}
              onClick={handleAddService}
              variant="outlined"
              sx={{ mt: 2 }}
            >
              Add Service
            </Button>
          </CardContent>
        </Card>

        <Divider sx={{ my: 3 }} />

        {/* Save Button */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}

