import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Stack,
  TextField,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import type { Dayjs } from 'dayjs';
import type { User } from '../../../types';

interface BookingConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (guestData?: GuestContactData) => void;
  service: string;
  date: Dayjs | null;
  timeSlot: string | null;
  notes: string;
  onNotesChange: (notes: string) => void;
  isAuthenticated: boolean;
  currentUser?: User | null;
  isLoading?: boolean;
}

export interface GuestContactData {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}

export default function BookingConfirmationDialog({
  open,
  onClose,
  onConfirm,
  service,
  date,
  timeSlot,
  notes,
  onNotesChange,
  isAuthenticated,
  currentUser,
  isLoading = false,
}: BookingConfirmationDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Guest contact form state (only for anonymous users)
  const [guestName, setGuestName] = React.useState('');
  const [guestEmail, setGuestEmail] = React.useState('');
  const [guestPhone, setGuestPhone] = React.useState('');

  // Validation errors
  const [errors, setErrors] = React.useState<{
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    contact?: string;
  }>({});

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setGuestName('');
      setGuestEmail('');
      setGuestPhone('');
      setErrors({});
    }
  }, [open]);

  const getServiceLabel = (serviceValue: string): string => {
    const labels: Record<string, string> = {
      consultation: 'Consultation',
      'follow-up': 'Follow-up',
      'check-up': 'Check-up',
    };
    return labels[serviceValue] || serviceValue;
  };

  const validateGuestForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate name
    if (!guestName.trim()) {
      newErrors.guestName = 'Name is required';
    }

    // Validate email format if provided
    if (guestEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        newErrors.guestEmail = 'Invalid email format';
      }
    }

    // Check that at least one contact method is provided
    if (!guestEmail.trim() && !guestPhone.trim()) {
      newErrors.contact = 'Please provide at least one contact method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!isAuthenticated) {
      // Validate guest form
      if (!validateGuestForm()) {
        return;
      }

      // Pass guest data to parent
      onConfirm({
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
      });
    } else {
      // Authenticated user - no guest data needed
      onConfirm();
    }
  };

  const isFormValid = isAuthenticated || (guestName.trim() && (guestEmail.trim() || guestPhone.trim()));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        {isAuthenticated ? 'Confirm Your Booking' : 'Complete Your Booking'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Booking Summary */}
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Service Type
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {service ? getServiceLabel(service) : 'Not selected'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Date & Time
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {date && timeSlot
                  ? `${date.format('dddd, MMMM DD, YYYY')} at ${timeSlot}`
                  : 'Not selected'}
              </Typography>
            </Box>
          </Stack>

          {/* Authenticated User Info */}
          {isAuthenticated && currentUser && (
            <>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Booking for
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {currentUser.first_name && currentUser.last_name
                    ? `${currentUser.first_name} ${currentUser.last_name}`
                    : currentUser.email}
                </Typography>
                {currentUser.first_name && currentUser.last_name && (
                  <Typography variant="body2" color="text.secondary">
                    {currentUser.email}
                  </Typography>
                )}
              </Box>
            </>
          )}

          {/* Guest Contact Form (Anonymous Users) */}
          {!isAuthenticated && (
            <>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Your Contact Information
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Full Name"
                    variant="outlined"
                    required
                    fullWidth
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    error={!!errors.guestName}
                    helperText={errors.guestName}
                    autoComplete="name"
                    disabled={isLoading}
                  />

                  <TextField
                    label="Email Address"
                    variant="outlined"
                    type="email"
                    fullWidth
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    error={!!errors.guestEmail || !!errors.contact}
                    helperText={errors.guestEmail}
                    autoComplete="email"
                    disabled={isLoading}
                  />

                  <TextField
                    label="Phone Number"
                    variant="outlined"
                    type="tel"
                    fullWidth
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    helperText={errors.contact || 'Email or phone required'}
                    error={!!errors.contact}
                    autoComplete="tel"
                    disabled={isLoading}
                  />
                </Stack>
              </Box>
            </>
          )}

          {/* Notes Field (Both User Types) */}
          <>
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Additional Notes or Requests (Optional)
              </Typography>
              <TextField
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Any special requests or information..."
                disabled={isLoading}
              />
            </Box>
          </>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 0 }}>
        <Stack spacing={2} sx={{ width: '100%', p: 3 }}>
          {/* Primary Action - Highest Visual Weight */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleConfirm}
            disabled={isLoading || !service || !date || !timeSlot || !isFormValid}
            startIcon={<CheckCircleIcon />}
            size="large"
          >
            {isLoading ? 'Confirming...' : 'Confirm Booking'}
          </Button>

          {/* Visual Separator */}
          <Divider sx={{ my: 1 }} />

          {/* Dismissive Action - Lowest Visual Weight */}
          <Button
            fullWidth
            onClick={onClose}
            disabled={isLoading}
            color="inherit"
            size="large"
          >
            Cancel
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
