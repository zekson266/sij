/**
 * Utility functions for working with tenant identifiers (UUID or slug).
 */

/**
 * Check if a string is a valid UUID format.
 * UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Determine if an identifier is a UUID or slug.
 * Returns 'uuid' if it's a UUID, 'slug' otherwise.
 */
export function getIdentifierType(identifier: string): 'uuid' | 'slug' {
  return isUUID(identifier) ? 'uuid' : 'slug';
}





