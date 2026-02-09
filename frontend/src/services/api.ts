/**
 * Base API client with authentication and error handling.
 */

import type { ApiError, User } from '../types';

// API base URL - use relative URL in production (nginx proxies /api to backend)
// For development, use VITE_API_BASE_URL env var or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:8000');

// User storage key (token is now stored in HttpOnly cookie)
const USER_STORAGE_KEY = 'booker_user';

/**
 * Get stored user data.
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  return userStr ? (JSON.parse(userStr) as User) : null;
}

/**
 * Store user data.
 */
export function storeUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Clear stored user data.
 */
export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * API request options.
 * 
 * Extends the standard RequestInit interface with additional options for authentication
 * and error handling control.
 */
export interface RequestOptions extends RequestInit {
  /**
   * Whether authentication is required for this request.
   * @default true
   * When false, 401 errors won't trigger unauthorized event handlers.
   */
  requireAuth?: boolean;
  
  /**
   * Skip automatic error handling and return error as data instead of throwing.
   * @default false
   * When true, errors are returned as data instead of being thrown.
   */
  skipErrorHandling?: boolean;
  
  /**
   * Suppress the auth:unauthorized event for expected 401s (e.g., during initialization).
   * @default false
   * When true, 401 errors won't trigger the unauthorized event handler.
   * Use this for silent authentication verification during app initialization.
   */
  suppressUnauthorizedEvent?: boolean;
  
  /**
   * Silent mode - don't log errors to console (useful for expected failures).
   * @default false
   * When true, errors are still thrown but not logged to console.
   * Use this for expected failures during initialization or idempotent operations.
   */
  silent?: boolean;
}

/**
 * Parse API error response.
 */
function parseError(response: Response, errorData?: any): ApiError {
  // If errorData is already parsed, use it; otherwise try to parse
  let parsedData: any = errorData;
  
  if (!parsedData) {
    try {
      // This should not happen in normal flow, but handle it just in case
      parsedData = {
        detail: response.statusText || 'An error occurred',
      };
    } catch {
      parsedData = {
        detail: response.statusText || 'An error occurred',
      };
    }
  }

  const apiError: ApiError = {
    error: true,
    message: parsedData.detail || parsedData.message || 'An error occurred',
    status_code: response.status,
    detail: parsedData.detail,
    errors: parsedData.errors || parsedData.detail?.errors,
  };

  return apiError;
}

/**
 * Make an API request with automatic token injection and error handling.
 * 
 * Handles authentication via HttpOnly cookies, error parsing, and conditional
 * logging/event dispatching based on request options.
 * 
 * @template T - The expected response type
 * @param endpoint - API endpoint (relative or absolute URL)
 * @param options - Request options including authentication and error handling flags
 * @returns Promise resolving to the response data
 * @throws {ApiError} If the request fails and skipErrorHandling is false
 * 
 * @example
 * ```typescript
 * // Normal request with authentication
 * const user = await apiGet<User>('/api/users/me');
 * 
 * // Silent initialization check
 * const user = await apiGet<User>('/api/users/me', {
 *   suppressUnauthorizedEvent: true,
 *   silent: true
 * });
 * ```
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    requireAuth = true,
    skipErrorHandling = false,
    suppressUnauthorizedEvent = false,
    silent = false,
    headers = {},
    ...fetchOptions
  } = options;

  // Build full URL
  // If API_BASE_URL is empty (production), use relative URL (nginx will proxy)
  // Otherwise, prepend the base URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : API_BASE_URL 
      ? `${API_BASE_URL}${endpoint}`
      : endpoint; // Relative URL for production

  // Prepare headers
  // Note: Authentication is handled via HttpOnly cookies, not Authorization header
  // Cookies are automatically sent with credentials: 'include'
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Make request
  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      credentials: 'include', // Include cookies for CORS
    });
  } catch (fetchError) {
    // Network error or fetch failed
    throw {
      error: true,
      message: 'Network error. Please check your connection.',
      status_code: 0,
      detail: fetchError instanceof Error ? fetchError.message : 'Network error',
    } as ApiError;
  }

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    if (!response.ok) {
      // For non-JSON errors, create error from status
      throw parseError(response);
    }
    // For non-JSON successful responses, return empty object
    return {} as T;
  }

  // Read response as text first, then parse JSON
  // This allows us to handle JSON parsing errors while still having the text
  const text = await response.text();
  let data: any;
  
  try {
    data = text ? JSON.parse(text) : {};
  } catch (jsonError) {
    // If JSON parsing fails, try to extract error from text or use status
    if (!response.ok) {
      // Try to parse as JSON one more time, or use text as detail
      try {
        const errorData = JSON.parse(text);
        throw parseError(response, errorData);
      } catch {
        throw parseError(response, { detail: text || response.statusText });
      }
    }
    // For successful responses with invalid JSON, throw parsing error
    throw {
      error: true,
      message: 'Invalid response format',
      status_code: response.status,
      detail: 'Failed to parse response as JSON',
    } as ApiError;
  }

  // Handle errors
  if (!response.ok) {
    // Pass already-parsed data to parseError
    const error = parseError(response, data);
    
    // Only log errors if not in silent mode (for expected failures during initialization)
    if (!silent) {
      console.error('API Error:', {
        status: response.status,
        data,
        error,
        message: error.message,
        detail: error.detail
      });
    }
    
    // Handle 401 Unauthorized - token expired or invalid
    // Only dispatch unauthorized event if:
    // 1. It's a 401 error
    // 2. Auth is required (requireAuth = true)
    // 3. We're not suppressing the event (for expected failures during initialization)
    if (response.status === 401 && requireAuth && !suppressUnauthorizedEvent) {
      // Dispatch custom event for auth context to handle
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    if (!skipErrorHandling) {
      throw error;
    }
    
    return error as unknown as T;
  }

  return data as T;
}

/**
 * GET request helper.
 */
export async function apiGet<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'GET',
  });
}

/**
 * POST request helper.
 */
export async function apiPost<T>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper.
 */
export async function apiPut<T>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper.
 */
export async function apiPatch<T>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper.
 */
export async function apiDelete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'DELETE',
  });
}

