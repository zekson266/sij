import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import type { Appointment } from '../types';
import dayjs from 'dayjs';

interface AppointmentDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm?: (appointmentId: string) => Promise<void>;
  onCancel?: (appointmentId: string) => Promise<void>;
  onReschedule?: (appointmentId: string) => Promise<void>;
  isLoading?: boolean;
}

const getServiceLabel = (serviceValue: string): string => {
  const labels: Record<string, string> = {
    consultation: 'Consultation',
    'follow-up': 'Follow-up',
    'check-up': 'Check-up',
  };
  return labels[serviceValue] || serviceValue;
};

const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'confirmed':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'completed':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <ScheduleIcon />;
    case 'confirmed':
      return <CheckCircleIcon />;
    case 'cancelled':
      return <CancelIcon />;
    default:
      return null;
  }
};

export default function AppointmentDetailsDialog({
  open,
  onClose,
  appointment,
  onConfirm,
  onCancel,
  onReschedule,
  isLoading = false,
}: AppointmentDetailsDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  if (!appointment) {
    return null;
  }

  const appointmentDate = dayjs(appointment.appointment_date);
  const canConfirm = appointment.status === 'pending' && onConfirm;
  const canCancel = (appointment.status === 'pending' || appointment.status === 'confirmed') && onCancel;
  const canReschedule = (appointment.status === 'pending' || appointment.status === 'confirmed') && onReschedule;

  // Check if we should show customer information section
  // Show for: guest bookings OR registered users with user details
  const isGuestBooking = !!(appointment.guest_name || appointment.guest_email || appointment.guest_phone);
  const hasUserDetails = !!appointment.user;
  const showCustomerInfo = isGuestBooking || hasUserDetails;

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm(appointment.id);
    }
  };

  const handleCancel = async () => {
    if (onCancel) {
      await onCancel(appointment.id);
    }
  };

  const handleReschedule = async () => {
    if (onReschedule) {
      await onReschedule(appointment.id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Appointment Details</Typography>
          <Chip
            icon={getStatusIcon(appointment.status) || undefined}
            label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            color={getStatusColor(appointment.status)}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ mt: 2 }}>
          {/* Service and Date/Time Section */}
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Service Type
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {getServiceLabel(appointment.service_type)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Date & Time
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {appointmentDate.format('dddd, MMMM DD, YYYY')}
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {appointment.appointment_time}
              </Typography>
            </Box>
          </Stack>

          {/* Customer Information Section */}
          {showCustomerInfo && (
            <>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1.5 }}>
                  Customer Information
                </Typography>
                <Stack spacing={1.5}>
                  {/* For guest bookings: show guest contact info */}
                  {isGuestBooking && (
                    <>
                      {appointment.guest_name && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body1">{appointment.guest_name}</Typography>
                        </Box>
                      )}
                      {appointment.guest_email && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body1">{appointment.guest_email}</Typography>
                        </Box>
                      )}
                      {appointment.guest_phone && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body1">{appointment.guest_phone}</Typography>
                        </Box>
                      )}
                    </>
                  )}

                  {/* For registered users: show user details */}
                  {hasUserDetails && appointment.user && !isGuestBooking && (
                    <>
                      {(appointment.user.first_name || appointment.user.last_name) && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body1">
                            {appointment.user.first_name && appointment.user.last_name
                              ? `${appointment.user.first_name} ${appointment.user.last_name}`
                              : appointment.user.first_name || appointment.user.last_name}
                          </Typography>
                        </Box>
                      )}
                      <Box display="flex" alignItems="center" gap={1}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body1">{appointment.user.email}</Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Notes Section */}
          {appointment.notes && (
            <>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body1">{appointment.notes}</Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 0 }}>
        <Stack spacing={2} sx={{ width: '100%', p: 3 }}>
          {/* Primary Action - Highest Visual Weight */}
          {canConfirm && (
            <Button
              variant="contained"
              fullWidth
              onClick={handleConfirm}
              disabled={isLoading}
              startIcon={<CheckCircleIcon />}
              size="large"
            >
              {isLoading ? 'Confirming...' : 'Confirm Appointment'}
            </Button>
          )}

          {/* Secondary Actions - Medium Visual Weight */}
          {canReschedule && (
            <Button
              variant="outlined"
              fullWidth
              onClick={handleReschedule}
              disabled={isLoading}
              startIcon={<ScheduleIcon />}
              size="large"
            >
              Reschedule
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={handleCancel}
              disabled={isLoading}
              startIcon={<CancelIcon />}
              size="large"
            >
              Delete Appointment
            </Button>
          )}

          {/* Visual Separator */}
          {(canConfirm || canReschedule || canCancel) && (
            <Divider sx={{ my: 1 }} />
          )}

          {/* Dismissive Action - Lowest Visual Weight */}
          <Button
            fullWidth
            onClick={onClose}
            disabled={isLoading}
            color="inherit"
            size="large"
          >
            Close
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
