import * as React from 'react';
import {
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { TimeSlotList, AppointmentDetailsDialog } from './index';
import { generateTimeSlots } from './TimeSlotList';
import {
  getAppointmentsByDate,
  confirmAppointment,
  cancelAppointmentById,
} from '../services/bookingApi';
import { useNotification } from '../../../contexts';
import { isApiError } from '../../../utils/formHelpers';
import {
  getBookingServices,
  shouldShowServiceSelector,
} from '../services/bookingServices';
import type { Appointment } from '../types';

interface AppointmentManagementFormProps {
  tenantId: string;
  tenant?: { settings?: Record<string, any> };
}

const TIME_SLOTS = generateTimeSlots();

export default function AppointmentManagementForm({ tenantId, tenant }: AppointmentManagementFormProps) {
  const { showSuccess, showError } = useNotification();
  
  // Get services from tenant settings
  const services = React.useMemo(() => getBookingServices(tenant), [tenant]);
  const showServiceSelector = shouldShowServiceSelector(tenant);

  // Build service options with "All Services" option for filtering
  const serviceOptions = React.useMemo(() => {
    const allServicesOption = { value: '', label: 'All Services' };
    const serviceOptions = services.map(service => ({
      value: service.value,
      label: service.label,
    }));
    return [allServicesOption, ...serviceOptions];
  }, [services]);
  
  const [selectedService, setSelectedService] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<Dayjs | null>(null);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  // Auto-select today's date on mount
  React.useEffect(() => {
    // Always start with today - owner can use arrow buttons to navigate to other dates
    handleDateChange(dayjs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = run once on mount

  // Filter appointments by selected service
  const filteredAppointments = React.useMemo(() => {
    if (!selectedService) {
      return appointments;
    }
    return appointments.filter(apt => apt.service_type === selectedService);
  }, [appointments, selectedService]);

  const handleServiceChange = (event: { target: { value: unknown } }) => {
    setSelectedService(event.target.value as string);
  };

  const handleDateChange = async (newValue: Dayjs | null) => {
    setSelectedDate(newValue);
    setSelectedAppointment(null);

    // Fetch appointments for the selected date
    if (newValue) {
      setIsLoadingAppointments(true);
      try {
        const apts = await getAppointmentsByDate(tenantId, newValue);
        setAppointments(apts);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        showError('Failed to load appointments. Please try again.');
        setAppointments([]);
      } finally {
        setIsLoadingAppointments(false);
      }
    } else {
      setAppointments([]);
    }
  };

  const handlePreviousDay = () => {
    if (selectedDate) {
      handleDateChange(selectedDate.subtract(1, 'day'));
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      handleDateChange(selectedDate.add(1, 'day'));
    }
  };

  const handleTimeSlotClick = (_slot: string, appointment?: Appointment) => {
    if (appointment) {
      setSelectedAppointment(appointment);
      setDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleConfirm = async (appointmentId: string) => {
    setIsLoading(true);
    try {
      await confirmAppointment(tenantId, appointmentId);
      showSuccess('Appointment confirmed successfully!');
      
      // Refresh appointments
      if (selectedDate) {
        const apts = await getAppointmentsByDate(tenantId, selectedDate);
        setAppointments(apts);
      }
      
      setDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error confirming appointment:', error);
      if (isApiError(error)) {
        const errorMessage = error.message || error.detail || 'Failed to confirm appointment. Please try again.';
        showError(errorMessage);
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    setIsLoading(true);
    try {
      await cancelAppointmentById(tenantId, appointmentId);
      showSuccess('Appointment cancelled successfully!');
      
      // Refresh appointments
      if (selectedDate) {
        const apts = await getAppointmentsByDate(tenantId, selectedDate);
        setAppointments(apts);
      }
      
      setDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      if (isApiError(error)) {
        const errorMessage = error.message || error.detail || 'Failed to cancel appointment. Please try again.';
        showError(errorMessage);
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async (_appointmentId: string) => {
    // For now, reschedule will just close the dialog
    // In the future, we can add a reschedule dialog with date/time picker
    showError('Reschedule functionality coming soon. Please cancel and create a new appointment.');
    setDialogOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <>
      <Stack spacing={1.5}>
        {/* Service selector - only show if multiple services */}
        {showServiceSelector && (
          <FormControl fullWidth>
            <InputLabel>Filter by Service Type</InputLabel>
            <Select
              value={selectedService}
              onChange={handleServiceChange}
              label="Filter by Service Type"
            >
              {serviceOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Hidden DatePicker - controlled by clicking the date text below */}
        <Box sx={{ display: 'none' }}>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={handleDateChange}
            open={datePickerOpen}
            onClose={() => setDatePickerOpen(false)}
            onOpen={() => setDatePickerOpen(true)}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />
        </Box>

        {/* Date Navigation Display - clickable to open date picker */}
        {selectedDate && (
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <IconButton
              onClick={handlePreviousDay}
              aria-label="Previous day"
            >
              <ArrowBackIcon />
            </IconButton>

            <Box
              textAlign="center"
              flex={1}
              onClick={() => setDatePickerOpen(true)}
              sx={{
                cursor: 'pointer',
                py: 1,
                borderRadius: 1,
                transition: 'background-color 0.2s',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <CalendarTodayIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" component="div">
                  {selectedDate.format('dddd, MMMM D')}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {(() => {
                  const availableSlots = TIME_SLOTS.filter(slot => {
                    const bookedSlot = filteredAppointments.find(
                      apt => apt.appointment_time === slot && apt.status !== 'cancelled'
                    );
                    return !bookedSlot;
                  }).length;
                  const bookedSlots = filteredAppointments.filter(
                    apt => apt.status !== 'cancelled'
                  ).length;
                  return `${availableSlots} available, ${bookedSlots} booked`;
                })()}
              </Typography>
            </Box>

            <IconButton
              onClick={handleNextDay}
              aria-label="Next day"
            >
              <ArrowForwardIcon />
            </IconButton>
          </Box>
        )}

        {/* Time Slots - Show all slots with appointment details */}
        <TimeSlotList
          slots={TIME_SLOTS}
          appointments={filteredAppointments}
          selectedSlot={selectedAppointment?.appointment_time || null}
          onSlotClick={handleTimeSlotClick}
          mode="management"
          isLoading={isLoadingAppointments}
        />
      </Stack>

      <AppointmentDetailsDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        appointment={selectedAppointment}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onReschedule={handleReschedule}
        isLoading={isLoading}
      />
    </>
  );
}

