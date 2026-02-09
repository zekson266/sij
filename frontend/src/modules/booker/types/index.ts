/**
 * Booker module types.
 */

export interface Appointment {
  id: string;
  tenant_id: string;
  user_id: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }; // User details (populated for registered users)
  service_type: string;
  appointment_date: string; // Plain date string "YYYY-MM-DD" (timezone-agnostic)
  appointment_time: string; // e.g., "9:00 AM"
  status: string; // pending, confirmed, cancelled, completed
  notes?: string;
  guest_name?: string; // For anonymous bookings
  guest_email?: string; // For anonymous bookings
  guest_phone?: string; // For anonymous bookings
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreate {
  service_type: string;
  appointment_date: string; // Plain date string "YYYY-MM-DD" (timezone-agnostic)
  appointment_time: string; // e.g., "9:00 AM"
  notes?: string;
  guest_name?: string; // Required for anonymous bookings
  guest_email?: string; // Required for anonymous bookings (if phone not provided)
  guest_phone?: string; // Required for anonymous bookings (if email not provided)
}

// Re-export TimeSlot types from components
export type { TimeSlotStatus, TimeSlotInfo } from '../components/TimeSlotList';
