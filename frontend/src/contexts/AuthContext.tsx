/**
 * Authentication Context for managing user authentication state.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthTokens, LoginRequest, RegisterRequest } from '../types';
import * as authApi from '../services/authApi';
import { getStoredUser, storeUser, clearStoredUser } from '../services/api';
import { isApiError } from '../utils/formHelpers';

interface AuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginRequest, tenantId?: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshToken: (tenantId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Logout user.
   * Clears authentication cookie on backend and local user state.
   * Logout is idempotent - safe to call even when not authenticated.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Even if logout fails (e.g., not authenticated), clear local state
      // No need to log - logout API call is already silent for expected failures
    } finally {
      setUser(null);
      clearStoredUser(); // Clear localStorage on logout
    }
  }, []);

  // Initialize auth state from storage
  // Token is stored in HttpOnly cookie, so we verify by fetching current user
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = getStoredUser();

        // If we have stored user, try to verify authentication
        if (storedUser) {
          setUser(storedUser);
          
          // Verify authentication is still valid by fetching current user
          // This will fail if cookie is invalid/expired
          // Use silent mode to suppress error logs and unauthorized events during initialization
          // (expected 401s should not trigger logout or console errors)
          try {
            const currentUser = await authApi.getCurrentUser({
              suppressUnauthorizedEvent: true, // Don't trigger logout during initialization
              silent: true, // Don't log expected 401 errors to console
            });
            setUser(currentUser);
            storeUser(currentUser);
          } catch (error) {
            // Cookie is invalid/expired, clear local state and stored user silently
            // This is expected behavior, no need to log or trigger events
            // Clear localStorage to prevent this check on subsequent loads
            setUser(null);
            clearStoredUser();
          }
        }
      } catch (error) {
        // Unexpected error during initialization (e.g., localStorage access issue)
        // Only log unexpected errors, not authentication failures (those are handled above)
        // This catch is for truly unexpected errors like localStorage being unavailable
        if (error instanceof Error && !error.message.includes('401')) {
          console.error('Unexpected error during auth initialization:', error);
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for unauthorized events (from API service)
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  /**
   * Login user.
   * Note: We don't set isLoading here to avoid unmounting LoginPage during form submission.
   * Components handle their own loading state for form submissions.
   */
  const login = useCallback(async (credentials: LoginRequest, tenantId?: string) => {
    try {
      const response: AuthTokens = await authApi.login(credentials, tenantId);
      
      // Token is stored in HttpOnly cookie by backend, just update user state
      setUser(response.user);
    } catch (error) {
      // Preserve the full ApiError object (including errors array) instead of wrapping in Error
      // This allows components to access field-specific validation errors
      throw error;
    }
  }, []);

  /**
   * Register new user.
   * Note: We don't set isLoading here to avoid unmounting RegisterPage during form submission.
   * Components handle their own loading state for form submissions.
   */
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      const response: AuthTokens = await authApi.register(data);
      
      // Token is stored in HttpOnly cookie by backend, just update user state
      setUser(response.user);
    } catch (error) {
      // Preserve the full ApiError object (including errors array) instead of wrapping in Error
      // This allows components to access field-specific validation errors
      throw error;
    }
  }, []);


  /**
   * Refresh current user data from API.
   * 
   * @throws {Error} If user is not authenticated
   * @throws {ApiError} If API call fails (will trigger logout if 401)
   */
  const refreshUser = useCallback(async () => {
    if (!user) {
      throw new Error('Not authenticated');
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      storeUser(currentUser);
    } catch (error) {
      // If unauthorized, logout (this will trigger unauthorized event handler)
      if (isApiError(error) && error.status_code === 401) {
        await logout();
      }
      throw error;
    }
  }, [user, logout]);

  /**
   * Refresh access token.
   * 
   * @param tenantId - Optional tenant ID to include in token context
   * @throws {Error} If user is not authenticated
   * @throws {ApiError} If API call fails (will trigger logout if 401)
   */
  const refreshToken = useCallback(async (tenantId?: string) => {
    if (!user) {
      throw new Error('Not authenticated');
    }

    try {
      const response: AuthTokens = await authApi.refreshToken(tenantId);
      // Token is stored in HttpOnly cookie by backend, just update user state
      if (response.user) {
        setUser(response.user);
        storeUser(response.user);
      }
    } catch (error) {
      // If unauthorized, logout (this will trigger unauthorized event handler)
      if (isApiError(error) && error.status_code === 401) {
        await logout();
      }
      throw error;
    }
  }, [user, logout]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context.
 * 
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

