/**
 * TypeScript type definitions for the application.
 */

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_superuser?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  email: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_tier: string;
  tenant_metadata?: Record<string, any>;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantPublic {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_tier: string;
  user_role?: string;
  is_member: boolean;
  can_book: boolean;
  tenant_metadata?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  permissions?: Record<string, any>;
  effective_permissions?: string[];
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  user: User;
  tenant_id?: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

// Appointment types moved to modules/booker/types
// Import directly: import type { Appointment } from '../modules/booker/types';

export interface ApiError {
  error: boolean;
  message: string;
  status_code: number;
  detail?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

