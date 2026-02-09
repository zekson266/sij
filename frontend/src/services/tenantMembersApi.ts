/**
 * Tenant Members API service.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import type { TenantUser, User } from '../types';

export interface TenantMember extends TenantUser {
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

/**
 * Search for a user by email (for inviting to tenant).
 */
export async function searchUserByEmail(
  tenantId: string,
  email: string
): Promise<User | null> {
  return apiGet<User | null>(
    `/api/tenants/${tenantId}/members/search-user?email=${encodeURIComponent(email)}`
  );
}

/**
 * List all members of a tenant.
 */
export async function listTenantMembers(
  tenantId: string,
  params?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
    role?: string;
  }
): Promise<TenantMember[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.role !== undefined) queryParams.append('role', params.role);
  
  const query = queryParams.toString();
  const url = query
    ? `/api/tenants/${tenantId}/members?${query}`
    : `/api/tenants/${tenantId}/members`;
  
  return apiGet<TenantMember[]>(url);
}

/**
 * Invite a user to a tenant.
 */
export async function inviteUserToTenant(
  tenantId: string,
  userId: string,
  role: string = 'member'
): Promise<TenantUser> {
  return apiPost<TenantUser>(
    `/api/tenants/${tenantId}/members?user_id=${userId}&role=${role}`,
    {}
  );
}

/**
 * Get a specific tenant member.
 */
export async function getTenantMember(
  tenantId: string,
  userId: string
): Promise<TenantUser> {
  return apiGet<TenantUser>(`/api/tenants/${tenantId}/members/${userId}`);
}

/**
 * Update a tenant member's role or status.
 */
export async function updateTenantMember(
  tenantId: string,
  userId: string,
  data: {
    role?: string;
    is_active?: boolean;
  }
): Promise<TenantUser> {
  return apiPatch<TenantUser>(`/api/tenants/${tenantId}/members/${userId}`, data);
}

/**
 * Remove a user from a tenant.
 */
export async function removeTenantMember(
  tenantId: string,
  userId: string
): Promise<{ message: string; data: any }> {
  return apiDelete<{ message: string; data: any }>(
    `/api/tenants/${tenantId}/members/${userId}`
  );
}

