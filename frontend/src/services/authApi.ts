/**
 * Authentication API service.
 */

import { apiPost, apiGet, storeUser, type RequestOptions } from './api';
import type { AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

/**
 * Register a new user.
 */
export async function register(data: RegisterRequest): Promise<AuthTokens> {
  const response = await apiPost<AuthTokens>('/api/auth/register', data, {
    requireAuth: false,
  });
  
  // Store user data (token is stored in HttpOnly cookie by backend)
  if (response.user) {
    storeUser(response.user);
  }
  
  return response;
}

/**
 * Login user.
 */
export async function login(
  data: LoginRequest,
  tenantId?: string
): Promise<AuthTokens> {
  const url = tenantId
    ? `/api/auth/login?tenant_id=${tenantId}`
    : '/api/auth/login';
  
  const response = await apiPost<AuthTokens>(url, data, {
    requireAuth: false,
  });
  
  // Store user data (token is stored in HttpOnly cookie by backend)
  if (response.user) {
    storeUser(response.user);
  }
  
  return response;
}

/**
 * Refresh access token.
 */
export async function refreshToken(tenantId?: string): Promise<AuthTokens> {
  const url = tenantId
    ? `/api/auth/refresh?tenant_id=${tenantId}`
    : '/api/auth/refresh';
  
  const response = await apiPost<AuthTokens>(url, undefined);
  
  // Update stored user data (token is stored in HttpOnly cookie by backend)
  if (response.user) {
    storeUser(response.user);
  }
  
  return response;
}

/**
 * Get current authenticated user information.
 * 
 * Verifies authentication by fetching the current user's data from the server.
 * Use with `suppressUnauthorizedEvent: true` and `silent: true` during initialization
 * to avoid triggering logout or logging errors for expected 401s.
 * 
 * @param options - Optional request options
 * @param options.suppressUnauthorizedEvent - Suppress unauthorized event (default: false)
 * @param options.silent - Don't log errors to console (default: false)
 * @returns Promise resolving to the current user
 * @throws {ApiError} If authentication fails or user not found
 * 
 * @example
 * ```typescript
 * // Normal usage (will log errors and trigger logout on 401)
 * const user = await getCurrentUser();
 * 
 * // Silent initialization check
 * const user = await getCurrentUser({
 *   suppressUnauthorizedEvent: true,
 *   silent: true
 * });
 * ```
 */
export async function getCurrentUser(options?: RequestOptions): Promise<User> {
  return apiGet<User>('/api/auth/me', options);
}

/**
 * Get all tenants the current user belongs to.
 */
export async function getUserTenants(): Promise<any[]> {
  return apiGet<any[]>('/api/auth/tenants');
}

/**
 * Logout user (clears authentication cookie on backend).
 * 
 * This function is idempotent - safe to call even when not authenticated.
 * Uses silent mode to prevent error logs for expected 401s when not logged in.
 * 
 * @returns Promise that resolves when logout completes (or fails silently)
 * 
 * @example
 * ```typescript
 * // Safe to call anytime
 * await logout(); // Works even if not logged in
 * ```
 */
export async function logout(): Promise<void> {
  // Call backend logout endpoint to clear HttpOnly cookie
  // Use requireAuth: false and silent: true to prevent infinite loop and error logs
  // when not authenticated (expected scenario)
  try {
    await apiPost<{ message: string }>('/api/auth/logout', undefined, {
      requireAuth: false,
      silent: true, // Don't log expected 401 errors when not logged in
    });
  } catch (error) {
    // Even if logout fails (e.g., not authenticated), fail silently
    // This is expected behavior - logout should be idempotent
  }
}

/**
 * Verify email address.
 */
export async function verifyEmail(token: string): Promise<{ message: string; data: any }> {
  return apiPost<{ message: string; data: any }>('/api/auth/verify-email', { token }, {
    requireAuth: false,
  });
}

/**
 * Resend verification email.
 */
export async function resendVerification(email: string): Promise<{ message: string; data?: any }> {
  return apiPost<{ message: string; data?: any }>('/api/auth/resend-verification', { email }, {
    requireAuth: false,
  });
}

/**
 * Request password reset.
 */
export async function forgotPassword(email: string): Promise<{ message: string; data?: any }> {
  return apiPost<{ message: string; data?: any }>('/api/auth/forgot-password', { email }, {
    requireAuth: false,
  });
}

/**
 * Reset password with token.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string; data: any }> {
  return apiPost<{ message: string; data: any }>(
    '/api/auth/reset-password',
    { token, new_password: newPassword },
    { requireAuth: false }
  );
}

