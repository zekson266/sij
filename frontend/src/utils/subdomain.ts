/**
 * Subdomain utility functions.
 *
 * Handles extraction of tenant subdomain from hostname.
 * Works with domains like: acme.example.com -> "acme"
 */

/**
 * Main domain name (without subdomain).
 * This should match your production domain.
 * Defaults to 'localhost' for development if VITE_DOMAIN_NAME is not set.
 */
const MAIN_DOMAIN = import.meta.env.VITE_DOMAIN_NAME || 'localhost';

/**
 * Reserved subdomains that should not be treated as tenant slugs.
 * These will return null when extracted.
 */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'ftp',
  'localhost',
]);

/**
 * Extract subdomain from current hostname.
 *
 * Examples:
 * - "acme.example.com" -> "acme"
 * - "www.example.com" -> null (reserved)
 * - "example.com" -> null (main domain)
 * - "acme.localhost" -> "acme" (for local development)
 *
 * @returns Subdomain string or null if on main domain or reserved subdomain
 */
export function getSubdomain(): string | null {
  if (typeof window === 'undefined') {
    // Server-side rendering
    return null;
  }

  const hostname = window.location.hostname.toLowerCase();
  
  // Handle localhost for development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  // Split hostname into parts
  const parts = hostname.split('.');
  
  // Need at least 2 parts (e.g., "example.com")
  if (parts.length < 2) {
    return null;
  }

  // Check if this is the main domain (e.g., example.com or www.example.com)
  const domainParts = MAIN_DOMAIN.split('.');
  const mainDomainSuffix = domainParts.slice(-2).join('.'); // e.g., "example.com"
  
  // Check if hostname ends with main domain
  if (hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}`) {
    return null;
  }

  // Check if hostname ends with main domain (for subdomains)
  if (hostname.endsWith(`.${mainDomainSuffix}`)) {
    // Extract subdomain (first part)
    const subdomain = parts[0];
    
    // Check if it's a reserved subdomain
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return null;
    }
    
    return subdomain;
  }

  // For local development with custom domains (e.g., acme.localhost)
  // If we have more than 2 parts and it's not the main domain, assume first part is subdomain
  if (parts.length > 2) {
    const subdomain = parts[0];
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return null;
    }
    return subdomain;
  }

  return null;
}

/**
 * Check if current request is on a tenant subdomain.
 * 
 * @returns true if on a tenant subdomain, false otherwise
 */
export function isTenantSubdomain(): boolean {
  return getSubdomain() !== null;
}

/**
 * Get the tenant slug from subdomain or return null.
 * This is a convenience function that's equivalent to getSubdomain().
 * 
 * @returns Tenant slug from subdomain or null
 */
export function getTenantSlugFromSubdomain(): string | null {
  return getSubdomain();
}
