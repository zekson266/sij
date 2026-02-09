/**
 * Booking/Appointment API service.
 */

import { apiGet, apiPost, apiPatch } from '../../../services/api';
import type { Appointment, AppointmentCreate } from '../types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

/**
 * Create a new appointment for a tenant.
 * 
 * @param tenantId - Tenant UUID
 * @param data - Appointment data (date and time will be combined)
 */
export async function createAppointment(
  tenantId: string,
  data: {
    service_type: string;
    date: Dayjs;
    timeSlot: string;
    notes?: string;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
  }
): Promise<Appointment> {
  // Send date as plain YYYY-MM-DD string (timezone-agnostic)
  // Backend stores as DATE type, no timezone conversion
  const appointmentDate = data.date.format('YYYY-MM-DD');

  const appointmentData: AppointmentCreate = {
    service_type: data.service_type,
    appointment_date: appointmentDate,
    appointment_time: data.timeSlot,
    notes: data.notes,
    guest_name: data.guest_name,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone,
  };

  return apiPost<Appointment>(`/api/tenants/${tenantId}/booker/appointments`, appointmentData);
}

/**
 * Get appointment by ID.
 */
export async function getAppointment(
  tenantId: string,
  appointmentId: string
): Promise<Appointment> {
  return apiGet<Appointment>(`/api/tenants/${tenantId}/booker/appointments/${appointmentId}`);
}

/**
 * List appointments for a tenant.
 */
export async function listTenantAppointments(
  tenantId: string,
  params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }
): Promise<Appointment[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  
  const query = queryParams.toString();
  const url = query 
    ? `/api/tenants/${tenantId}/booker/appointments?${query}`
    : `/api/tenants/${tenantId}/booker/appointments`;
  
  return apiGet<Appointment[]>(url);
}

/**
 * Update an appointment.
 */
export async function updateAppointment(
  tenantId: string,
  appointmentId: string,
  data: Partial<{
    service_type: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    notes: string;
  }>
): Promise<Appointment> {
  return apiPatch<Appointment>(
    `/api/tenants/${tenantId}/booker/appointments/${appointmentId}`,
    data
  );
}

/**
 * Cancel an appointment (legacy function name, kept for backward compatibility).
 * @deprecated Use cancelAppointmentById instead for clarity
 */
export async function cancelAppointment(
  tenantId: string,
  appointmentId: string
): Promise<Appointment> {
  return cancelAppointmentById(tenantId, appointmentId);
}

/**
 * Get the first date with available slots for a tenant and optionally service type.
 * Each service type has its own independent calendar.
 * 
 * @param tenantId - Tenant UUID
 * @param serviceType - Optional service type to filter by. If omitted, checks all services.
 * @param maxDaysAhead - Maximum number of days to search ahead (default: 60)
 * @returns Dayjs object for the first available date, or today if all dates are booked
 */
export async function getFirstAvailableDate(
  tenantId: string,
  serviceType?: string,
  maxDaysAhead: number = 60
): Promise<Dayjs> {
  let url = `/api/tenants/${tenantId}/booker/appointments/first-available-date?max_days_ahead=${maxDaysAhead}`;
  
  if (serviceType) {
    url += `&service_type=${encodeURIComponent(serviceType)}`;
  }
  
  const dateStr = await apiGet<string>(url);
  return dayjs(dateStr);
}

/**
 * Get list of booked time slots for a specific tenant, date, and optionally service type.
 * Each service type has its own independent calendar.
 * 
 * @param tenantId - Tenant UUID
 * @param date - Date to check (Dayjs object)
 * @param serviceType - Optional service type to filter by. If omitted, returns all booked slots.
 */
export async function getBookedSlots(
  tenantId: string,
  date: Dayjs,
  serviceType?: string
): Promise<string[]> {
  const dateStr = date.format('YYYY-MM-DD');
  let url = `/api/tenants/${tenantId}/booker/appointments/available-slots?date=${dateStr}`;
  
  if (serviceType) {
    url += `&service_type=${encodeURIComponent(serviceType)}`;
  }
  
  return apiGet<string[]>(url);
}

/**
 * Get appointments for a tenant on a specific date.
 * Returns full appointment objects with user info (for owner view).
 * 
 * @param tenantId - Tenant UUID
 * @param date - Date to check (Dayjs object)
 */
export async function getAppointmentsByDate(
  tenantId: string,
  date: Dayjs
): Promise<Appointment[]> {
  const dateStr = date.format('YYYY-MM-DD');
  // Filter appointments by date on the frontend for now
  // In the future, backend can add a date filter parameter
  const appointments = await listTenantAppointments(tenantId, {
    limit: 1000, // Get all appointments, then filter by date
  });
  
  // Filter by date
  return appointments.filter(apt => {
    const aptDate = dayjs(apt.appointment_date).format('YYYY-MM-DD');
    return aptDate === dateStr;
  });
}

/**
 * Confirm an appointment (change status to confirmed).
 * 
 * @param tenantId - Tenant UUID
 * @param appointmentId - Appointment UUID
 */
export async function confirmAppointment(
  tenantId: string,
  appointmentId: string
): Promise<Appointment> {
  return updateAppointment(tenantId, appointmentId, {
    status: 'confirmed',
  });
}

/**
 * Cancel an appointment (change status to cancelled).
 * 
 * @param tenantId - Tenant UUID
 * @param appointmentId - Appointment UUID
 */
export async function cancelAppointmentById(
  tenantId: string,
  appointmentId: string
): Promise<Appointment> {
  return updateAppointment(tenantId, appointmentId, {
    status: 'cancelled',
  });
}

/**
 * Reschedule an appointment (update date and/or time).
 * 
 * @param tenantId - Tenant UUID
 * @param appointmentId - Appointment UUID
 * @param newDate - New date (Dayjs object)
 * @param newTimeSlot - New time slot string
 */
export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  newDate: Dayjs,
  newTimeSlot: string
): Promise<Appointment> {
  const appointmentDate = newDate.format('YYYY-MM-DD');  // Plain date string, no timezone conversion
  return updateAppointment(tenantId, appointmentId, {
    appointment_date: appointmentDate,
    appointment_time: newTimeSlot,
  });
}

