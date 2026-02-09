import * as React from 'react';
import {
  Stack,
  Box,
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
import { BookingConfirmationDialog, TimeSlotList } from './index';
import type { GuestContactData } from './BookingConfirmationDialog';
import { generateTimeSlots } from './TimeSlotList';
import { createAppointment, getBookedSlots, getFirstAvailableDate } from '../services/bookingApi';
import { useNotification, useAuth } from '../../../contexts';
import { isApiError } from '../../../utils/formHelpers';
import {
  getBookingServices,
  getDefaultService,
  shouldShowServiceSelector,
} from '../services/bookingServices';

interface BookingFormProps {
  tenantId: string;
  tenantSlug?: string;
  tenant?: { settings?: Record<string, any> };
}

const TIME_SLOTS = generateTimeSlots();

export default function BookingForm({ tenantId, tenant }: BookingFormProps) {
  const { showSuccess, showError } = useNotification();
  const { isAuthenticated, user } = useAuth();

  // Get services from tenant settings
  const services = React.useMemo(() => getBookingServices(tenant), [tenant]);
  const defaultService = React.useMemo(() => getDefaultService(tenant), [tenant]);
  const showServiceSelector = shouldShowServiceSelector(tenant);

  // Initialize with default service if available
  const [selectedService, setSelectedService] = React.useState<string>(() => {
    return defaultService?.value || '';
  });

  const [selectedDate, setSelectedDate] = React.useState<Dayjs | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<string>('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [bookedSlots, setBookedSlots] = React.useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isLoadingFirstDate, setIsLoadingFirstDate] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  // Update selectedService when defaultService changes (e.g., tenant data loads)
  React.useEffect(() => {
    if (defaultService && !selectedService) {
      setSelectedService(defaultService.value);
    }
  }, [defaultService, selectedService]);
  
  // Auto-select first available date when service is selected and no date is selected yet
  React.useEffect(() => {
    // Only auto-select if:
    // 1. Service is selected
    // 2. No date is currently selected
    // 3. Not already loading
    if (!selectedService || selectedDate !== null || isLoadingFirstDate) {
      return;
    }
    
    const loadFirstAvailableDate = async () => {
      setIsLoadingFirstDate(true);
      try {
        const firstDate = await getFirstAvailableDate(tenantId, selectedService);
        // Check again if date is still null (user might have selected one while loading)
        if (selectedDate === null) {
          // Use handleDateChange to properly set date and fetch slots
          // This ensures consistency with manual date selection
          await handleDateChange(firstDate);
          
          // Note: handleDateChange already loads slots, so we don't need to validate here
          // The slots will be loaded and displayed, and if the date is fully booked,
          // the user will see all slots as booked and can manually select another date
          // This is better UX than automatically changing the date again
        }
      } catch (error) {
        console.error('Error fetching first available date:', error);
        
        // Handle 404 (no available dates) gracefully
        if (isApiError(error) && error.status_code === 404) {
          showError('No available dates found. Please try again later or contact the tenant.');
          // Don't set a date, let user manually select
          return;
        }
        
        // On other errors, fallback to today and still load slots (only if date is still null)
        if (selectedDate === null) {
          await handleDateChange(dayjs());
        }
      } finally {
        setIsLoadingFirstDate(false);
      }
    };
    
    loadFirstAvailableDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService, tenantId]); // Only depend on selectedService and tenantId

  const handleServiceChange = (event: { target: { value: unknown } }) => {
    const newService = event.target.value as string;
    setSelectedService(newService);
    // Reset date and slots when service changes (different calendar)
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setBookedSlots([]);
  };

  const handleDateChange = async (newValue: Dayjs | null) => {
    setSelectedDate(newValue);
    // Reset time slot when date changes
    setSelectedTimeSlot(null);
    
    // Fetch booked slots for the selected date and service type
    if (newValue && selectedService) {
      setIsLoadingSlots(true);
      try {
        const booked = await getBookedSlots(tenantId, newValue, selectedService);
        setBookedSlots(booked);
      } catch (error) {
        console.error('Error fetching booked slots:', error);
        // On error, assume no slots are booked (fail open)
        setBookedSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    } else {
      setBookedSlots([]);
    }
  };
  
  // Refetch slots when service changes (if date is already selected)
  React.useEffect(() => {
    if (selectedDate && selectedService) {
      handleDateChange(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService]);

  const handleTimeSlotClick = (timeSlot: string) => {
    // Only allow clicking available slots
    if (bookedSlots.includes(timeSlot)) {
      return;
    }
    setSelectedTimeSlot(timeSlot);
    // Open confirmation dialog
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handlePreviousDay = () => {
    if (selectedDate && selectedDate.isAfter(dayjs(), 'day')) {
      handleDateChange(selectedDate.subtract(1, 'day'));
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      handleDateChange(selectedDate.add(1, 'day'));
    }
  };

  const handleConfirmBooking = async (guestData?: GuestContactData) => {
    if (!selectedService || !selectedDate || !selectedTimeSlot) {
      return;
    }

    // Prevent booking if slot is already in booked list (double-check)
    if (bookedSlots.includes(selectedTimeSlot)) {
      showError('This time slot is no longer available. Please select another time.');
      setDialogOpen(false);
      // Refresh slots to get latest state
      if (selectedDate && selectedService) {
        try {
          const booked = await getBookedSlots(tenantId, selectedDate, selectedService);
          setBookedSlots(booked);
        } catch (error) {
          console.error('Error refreshing booked slots:', error);
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await createAppointment(tenantId, {
        service_type: selectedService,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        notes: notes.trim() || undefined,
        // Guest contact data (only for anonymous users)
        guest_name: guestData?.guestName,
        guest_email: guestData?.guestEmail,
        guest_phone: guestData?.guestPhone,
      });

      // Optimistically update booked slots immediately (add the just-booked slot)
      // This ensures the UI updates instantly before the server refresh
      const justBookedSlot = selectedTimeSlot;
      setBookedSlots(prev => {
        if (!prev.includes(justBookedSlot)) {
          return [...prev, justBookedSlot];
        }
        return prev;
      });

      // Success - show message and reset form
      showSuccess('Appointment booked successfully!');
      
      // Refresh booked slots from server to ensure accuracy (in case user wants to book another slot)
      // This happens after the optimistic update, so the UI is already correct
      if (selectedDate && selectedService) {
        getBookedSlots(tenantId, selectedDate, selectedService)
          .then(booked => {
            setBookedSlots(booked);
          })
          .catch(error => {
            console.error('Error refreshing booked slots:', error);
            // If refresh fails, keep the optimistic update
          });
      }
      
      // Reset form (but keep service if it's the default/single service)
      if (showServiceSelector) {
        setSelectedService(defaultService?.value || '');
      }
      setSelectedTimeSlot(null);
      setDialogOpen(false);
      // Keep the date selected so user can book another slot if desired
    } catch (error) {
      // Handle error
      console.error('Booking error:', error);
      
      // Use type guard for type-safe error handling
      if (isApiError(error)) {
        const errorMessage = error.message || error.detail || `Failed to book appointment (${error.status_code || 'unknown error'}). Please try again.`;
        showError(errorMessage);
        
        // If it's a 409 conflict (slot already booked), refresh booked slots immediately
        // This ensures the UI shows the current state and prevents users from trying to book unavailable slots
        if (error.status_code === 409 && selectedDate && selectedService) {
          try {
            const booked = await getBookedSlots(tenantId, selectedDate, selectedService);
            setBookedSlots(booked);
          } catch (refreshError) {
            console.error('Error refreshing booked slots after conflict:', refreshError);
            // If refresh fails, still show the error message
          }
        }
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack spacing={1.5}>
        {/* Service selector - only show if multiple services */}
        {showServiceSelector && (
          <FormControl fullWidth required>
            <InputLabel>Service Type</InputLabel>
            <Select
              value={selectedService}
              onChange={handleServiceChange}
              label="Service Type"
              required
            >
              {services.map((service) => (
                <MenuItem key={service.value} value={service.value}>
                  {service.label}
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
            minDate={dayjs()}
            disabled={!selectedService}
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
              disabled={!selectedDate.isAfter(dayjs(), 'day')}
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
                  const availableSlots = TIME_SLOTS.length - bookedSlots.length;
                  const booked = bookedSlots.length;
                  return `${availableSlots} available, ${booked} booked`;
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

        {/* Time Slots - Show all slots with visual indicators */}
        <TimeSlotList
          slots={TIME_SLOTS}
          bookedSlots={bookedSlots}
          selectedSlot={selectedTimeSlot}
          onSlotClick={handleTimeSlotClick}
          mode="booking"
          isLoading={isLoadingSlots}
        />
      </Stack>

      <BookingConfirmationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onConfirm={handleConfirmBooking}
        service={selectedService}
        date={selectedDate}
        timeSlot={selectedTimeSlot}
        notes={notes}
        onNotesChange={setNotes}
        isAuthenticated={isAuthenticated}
        currentUser={user}
        isLoading={isSubmitting}
      />
    </>
  );
}

