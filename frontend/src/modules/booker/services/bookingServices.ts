/**
 * Booking services utility functions.
 * Handles reading and managing booking services from tenant settings.
 */

export interface BookingService {
  value: string;
  label: string;
  is_default?: boolean;
}

/**
 * Default booking service used when tenant has no services configured.
 */
const DEFAULT_SERVICE: BookingService = {
  value: 'consultation',
  label: 'Consultation',
  is_default: true,
};


/**
 * Get booking services from tenant settings.
 * 
 * @param tenant - Tenant object with settings
 * @returns Array of booking service configurations
 */
export function getBookingServices(tenant?: { settings?: Record<string, any> }): BookingService[] {
  if (!tenant?.settings) {
    return [DEFAULT_SERVICE];
  }

  const moduleConfig = tenant.settings.module_config;
  if (moduleConfig?.booking?.services && Array.isArray(moduleConfig.booking.services)) {
    return moduleConfig.booking.services.filter(
      (service: any): service is BookingService =>
        service &&
        typeof service === 'object' &&
        typeof service.value === 'string' &&
        typeof service.label === 'string'
    );
  }

  // Return default if not configured
  return [DEFAULT_SERVICE];
}

/**
 * Get the default service for a tenant.
 * 
 * @param tenant - Tenant object with settings
 * @returns Default service or null if no default
 */
export function getDefaultService(tenant?: { settings?: Record<string, any> }): BookingService | null {
  const services = getBookingServices(tenant);

  // Find explicit default
  const explicitDefault = services.find(service => service.is_default === true);
  if (explicitDefault) {
    return explicitDefault;
  }

  // If only one service, it's the default
  if (services.length === 1) {
    return services[0];
  }

  // No default: user must select
  return null;
}

/**
 * Check if service selector should be shown.
 * 
 * @param tenant - Tenant object with settings
 * @returns True if selector should be visible (multiple services), false if hidden (single service)
 */
export function shouldShowServiceSelector(tenant?: { settings?: Record<string, any> }): boolean {
  const services = getBookingServices(tenant);
  return services.length > 1;
}


