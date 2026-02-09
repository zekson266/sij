import * as React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import type { Appointment } from '../types';

export type TimeSlotStatus = 'available' | 'booked' | 'pending' | 'confirmed' | 'cancelled';

export interface TimeSlotInfo {
  slot: string;
  status: TimeSlotStatus;
  appointment?: Appointment;
  bookedBy?: string; // User name or email for owner view
}

interface TimeSlotListProps {
  slots: string[];
  bookedSlots?: string[]; // For public booking view - just slot strings
  appointments?: Appointment[]; // For owner view - full appointment objects
  selectedSlot?: string | null;
  onSlotClick: (slot: string, appointment?: Appointment) => void;
  mode?: 'booking' | 'management'; // 'booking' for public, 'management' for owner
  isLoading?: boolean;
}

// Generate time slots from 9 AM to 5 PM (hourly)
export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 9; hour <= 17; hour++) {
    const timeString = hour <= 12 
      ? `${hour === 12 ? 12 : hour}:00 ${hour < 12 ? 'AM' : 'PM'}`
      : `${hour - 12}:00 PM`;
    slots.push(timeString);
  }
  return slots;
};

/**
 * Get the active appointment for a slot, prioritizing pending/confirmed over cancelled.
 * When multiple appointments exist for the same slot (e.g., cancelled + pending),
 * we return the active one (pending/confirmed) to ensure correct UI display.
 */
const getActiveAppointmentForSlot = (
  slot: string,
  appointments: Appointment[]
): Appointment | undefined => {
  const slotAppointments = appointments.filter(apt => apt.appointment_time === slot);
  
  if (slotAppointments.length === 0) {
    return undefined;
  }
  
  // If only one appointment, return it
  if (slotAppointments.length === 1) {
    return slotAppointments[0];
  }
  
  // Multiple appointments: prioritize active ones (pending/confirmed) over cancelled
  const activeAppointment = slotAppointments.find(
    apt => apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'completed'
  );
  
  // Return active appointment if found, otherwise return the first one (likely cancelled)
  return activeAppointment || slotAppointments[0];
};

/**
 * Get the cancelled appointment for a slot (if any), used for showing history.
 * Only returns cancelled appointment if there's no active appointment for the slot.
 */
const getCancelledAppointmentForSlot = (
  slot: string,
  appointments: Appointment[]
): Appointment | undefined => {
  const slotAppointments = appointments.filter(apt => apt.appointment_time === slot);
  const cancelledAppointment = slotAppointments.find(apt => apt.status === 'cancelled');
  
  // Only return cancelled appointment if there's no active appointment
  const hasActiveAppointment = slotAppointments.some(
    apt => apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'completed'
  );
  
  return hasActiveAppointment ? undefined : cancelledAppointment;
};

const getSlotStatus = (
  slot: string,
  bookedSlots: string[],
  appointments?: Appointment[]
): TimeSlotStatus => {
  // For owner view with appointments
  if (appointments) {
    const appointment = getActiveAppointmentForSlot(slot, appointments);
    if (appointment) {
      // Cancelled appointments free up the slot (slot becomes available)
      // But appointment still exists for audit/history purposes
      if (appointment.status === 'cancelled') {
        return 'available';
      }
      return appointment.status as TimeSlotStatus;
    }
  }
  
  // For public booking view
  if (bookedSlots.includes(slot)) {
    return 'booked';
  }
  
  return 'available';
};

const getStatusLabel = (status: TimeSlotStatus): string => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'booked':
      return 'Booked';
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

const getStatusIcon = (status: TimeSlotStatus) => {
  switch (status) {
    case 'available':
      return <ScheduleIcon fontSize="small" />;
    case 'booked':
    case 'pending':
      return <ScheduleIcon fontSize="small" />;
    case 'confirmed':
      return <CheckCircleIcon fontSize="small" />;
    case 'cancelled':
      return <CancelIcon fontSize="small" />;
    default:
      return null;
  }
};

const getCustomerName = (
  _slot: string,
  status: TimeSlotStatus,
  appointment?: Appointment,
  bookedBy?: string
): string | undefined => {
  // Special handling for cancelled appointments - chip shows status, just show name
  if (appointment && appointment.status === 'cancelled' && status === 'available') {
    return bookedBy; // Chip shows "Cancelled", no need to duplicate in name
  }

  if (status === 'available') {
    return undefined;
  }

  // Return customer name directly for owner view
  return bookedBy;
};

export default function TimeSlotList({
  slots,
  bookedSlots = [],
  appointments,
  selectedSlot,
  onSlotClick,
  mode = 'booking',
  isLoading = false,
}: TimeSlotListProps) {
  // Create a map of appointments by time slot for efficient lookup
  // Prioritize active appointments (pending/confirmed) over cancelled ones
  const appointmentsBySlot = React.useMemo(() => {
    if (!appointments) return new Map<string, Appointment>();
    const map = new Map<string, Appointment>();
    
    // Group appointments by time slot
    const slotsMap = new Map<string, Appointment[]>();
    appointments.forEach(apt => {
      const slot = apt.appointment_time;
      if (!slotsMap.has(slot)) {
        slotsMap.set(slot, []);
      }
      slotsMap.get(slot)!.push(apt);
    });
    
    // For each slot, prioritize active appointments
    slotsMap.forEach((slotAppointments, slot) => {
      const activeAppointment = getActiveAppointmentForSlot(slot, slotAppointments);
      if (activeAppointment) {
        map.set(slot, activeAppointment);
      }
    });
    
    return map;
  }, [appointments]);

  const getSlotInfo = (slot: string): TimeSlotInfo => {
    const status = getSlotStatus(slot, bookedSlots, appointments);
    const appointment = appointmentsBySlot.get(slot);
    
    // For cancelled slots that are available, also get the cancelled appointment for history
    let cancelledAppointment: Appointment | undefined;
    if (status === 'available' && appointments && mode === 'management') {
      cancelledAppointment = getCancelledAppointmentForSlot(slot, appointments);
    }
    
    // Use cancelled appointment for display if slot is available but has cancelled history
    const displayAppointment = cancelledAppointment || appointment;
    
    // For owner view, get customer name/email
    let bookedBy: string | undefined;
    if (displayAppointment && mode === 'management') {
      // Check if it's a guest booking (has guest contact info)
      const isGuestBooking = !!(displayAppointment.guest_name || displayAppointment.guest_email || displayAppointment.guest_phone);

      if (isGuestBooking) {
        // Guest booking: show guest name or email
        bookedBy = displayAppointment.guest_name || displayAppointment.guest_email || 'Guest';
      } else if (displayAppointment.user) {
        // Registered user: show name or email
        const hasName = displayAppointment.user.first_name || displayAppointment.user.last_name;
        if (hasName) {
          bookedBy = displayAppointment.user.first_name && displayAppointment.user.last_name
            ? `${displayAppointment.user.first_name} ${displayAppointment.user.last_name}`
            : (displayAppointment.user.first_name || displayAppointment.user.last_name);
        } else {
          bookedBy = displayAppointment.user.email;
        }
      } else {
        // Fallback if user data not loaded
        bookedBy = 'Unknown';
      }
    }
    
    return {
      slot,
      status,
      appointment: displayAppointment, // Show cancelled appointment for history if slot is available
      bookedBy,
    };
  };

  const slotInfos = slots.map(getSlotInfo);
  const availableCount = slotInfos.filter(info => info.status === 'available').length;

  // Generate hour markers (N slots + 1 end marker)
  // This creates proper visual boundaries for time periods
  const hourMarkers = React.useMemo(() => {
    return [...slots, '6:00 PM'];  // Add closing boundary marker
  }, [slots]);

  return (
    <Box>
      {isLoading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Loading available slots...
          </Typography>
        </Box>
      ) : (
        <>
          {/* iOS Calendar-style vertical timeline */}
          <Stack spacing={0}>
            {hourMarkers.map((marker, markerIndex) => {
              // Determine if this marker has a bookable slot
              const isBookableSlot = markerIndex < slots.length;

              // End marker - just visual boundary, not bookable
              if (!isBookableSlot) {
                return (
                  <Box key={marker} sx={{ height: 12 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.375, // 3px gap (MUI: 0.375 × 8px) - smaller for end marker
                        height: 12,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          width: 56, // Reduced width - line starts closer to left
                          flexShrink: 0,
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      >
                        {marker}
                      </Typography>
                      <Divider sx={{ flex: 1, borderColor: 'divider' }} />
                    </Box>
                  </Box>
                );
              }

              // Bookable slot - render marker + content area
              const slotInfo = slotInfos[markerIndex];
              const { slot, status, appointment } = slotInfo;
              const isSelected = selectedSlot === slot;
              const isAvailable = status === 'available';
              const isDisabled = status !== 'available' && mode === 'booking';
              const statusLabel = getStatusLabel(status);
              const customerName = getCustomerName(
                slot,
                status,
                appointment,
                slotInfo.bookedBy
              );

              return (
                <Box key={marker} sx={{ height: 56 }}>
                  {/*
                    SPACING METHODOLOGY:
                    - Time text width: 56px (fixed, prevents divider shift)
                    - Gap: 1.25 units = 10px (MUI spacing: 1.25 × 8px = 10px)
                    - Spacer width: 66px = 56px (time) + 10px (gap)
                    - This ensures appointment buttons align with divider lines horizontally
                  */}
                  {/* Hour marker - non-interactive, pure visual separator */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25, // 10px gap (MUI spacing: 1.25 × 8px = 10px)
                      height: 12,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        width: 56, // Reduced width - line starts closer to left
                        flexShrink: 0,
                        fontWeight: 500,
                        fontSize: '0.75rem',
                      }}
                    >
                      {marker}
                    </Typography>

                    {/* Pure divider - never changes */}
                    <Divider
                      sx={{
                        flex: 1,
                        borderColor: 'divider',
                      }}
                    />
                  </Box>

                  {/* Content area - container for spacer + appointment area */}
                  <Box
                    sx={{
                      height: 44,
                      display: 'flex',
                      gap: 0,
                    }}
                  >
                    {/* Spacer to align with divider line (matches time text width + gap) */}
                    <Box sx={{ width: 66 }} /> {/* 56px time text + 10px gap */}

                    {/* Appointment area - width defined here, both button and hover follow */}
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0, // Fix flexbox min-width:auto - prevents content from driving width
                        cursor: isAvailable ? 'pointer' : 'default',
                        transition: 'background-color 0.2s ease-in-out',
                        borderRadius: 2.5,
                        ...(isAvailable && {
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }),
                      }}
                      onClick={isAvailable ? () => onSlotClick(slot, appointment) : undefined}
                    >
                      {/* Appointment button - fills parent container (inherits width) */}
                      {(!isAvailable || (appointment?.status === 'cancelled' && mode === 'management')) && (
                        <Button
                          variant={appointment?.status === 'cancelled' ? 'outlined' : 'text'}
                          color={appointment?.status === 'cancelled' ? 'error' : undefined}
                          onClick={() => onSlotClick(slot, appointment)}
                          disabled={isDisabled}
                          sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 2.5,
                            py: 0.5,
                            px: 1.5,
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            textTransform: 'none',
                            transition: 'all 0.2s ease-in-out',
                            overflow: 'hidden',
                            // Cancelled: keep outlined dashed style
                            ...(appointment?.status === 'cancelled' && {
                              borderStyle: 'dashed',
                              opacity: 0.7,
                              bgcolor: 'transparent',
                              boxShadow: 0,
                              '&:hover': {
                                boxShadow: 1,
                                transform: 'translateY(-1px)',
                              },
                            }),
                            // Non-cancelled: flat design with vibrant light background
                            ...(appointment?.status !== 'cancelled' && {
                              border: 'none',
                              boxShadow: 'none',
                              bgcolor:
                                appointment?.status === 'pending'
                                  ? 'rgba(255, 152, 0, 0.15)' // Vibrant amber for pending (15%)
                                  : appointment?.status === 'confirmed'
                                  ? 'rgba(76, 175, 80, 0.15)' // Vibrant green for confirmed (15%)
                                  : 'rgba(25, 118, 210, 0.08)', // Light blue for others
                              '&:hover': {
                                bgcolor:
                                  appointment?.status === 'pending'
                                    ? 'rgba(255, 152, 0, 0.20)' // Darker on hover
                                    : appointment?.status === 'confirmed'
                                    ? 'rgba(76, 175, 80, 0.20)' // Darker on hover
                                    : 'rgba(25, 118, 210, 0.12)',
                                transform: 'translateY(-1px)',
                              },
                            }),
                            ...(isSelected && {
                              outline: '2px solid',
                              outlineColor: 'primary.main',
                              outlineOffset: 2,
                            }),
                            '&.Mui-disabled': {
                              opacity: 0.6,
                              bgcolor: 'action.disabledBackground',
                              color: 'text.disabled',
                              cursor: 'not-allowed',
                            },
                          }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            width: '100%',
                          }}
                        >
                          {/* LEFT: Customer name/email (grows, truncates) */}
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              color: appointment?.status === 'cancelled' ? 'error.main' : 'text.primary',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1,
                              maxWidth: '65%', // Constrain text width for visual consistency
                              textAlign: 'left',
                            }}
                          >
                            {customerName || ' '} {/* Only chip shows status for cancelled */}
                          </Typography>

                          {/* RIGHT: Status chip (fixed width, intense color) */}
                          <Chip
                            icon={getStatusIcon(status) || undefined}
                            label={appointment?.status ? getStatusLabel(appointment.status as TimeSlotStatus) : statusLabel}
                            size="small"
                            variant={appointment?.status === 'cancelled' ? 'outlined' : undefined}
                            color={
                              appointment?.status === 'pending'
                                ? 'warning' // Orange for pending
                                : appointment?.status === 'confirmed'
                                ? 'success' // Green for confirmed
                                : appointment?.status === 'cancelled'
                                ? 'error' // Red for cancelled
                                : 'default' // Grey for booked/other
                            }
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              flexShrink: 0,
                              '& .MuiChip-icon': {
                                fontSize: '0.8rem',
                              },
                            }}
                          />
                        </Box>
                      </Button>
                    )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>

          {/* No available slots message */}
          {availableCount === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No available time slots for this date
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

