/**
 * Admin API service (superuser only).
 */

import { apiGet, apiPost } from './api';
import type { User, Tenant } from '../types';

/**
 * Create a tenant as superuser (with optional owner assignment).
 */
export async function createTenantAsAdmin(
  data: {
    name: string;
    slug?: string;
    domain?: string;
    email: string;
    phone?: string;
    subscription_tier?: string;
  },
  ownerId?: string
): Promise<Tenant> {
  const url = ownerId
    ? `/api/admin/tenants?owner_id=${ownerId}`
    : '/api/admin/tenants';
  return apiPost<Tenant>(url, data);
}

/**
 * List all users (superuser only).
 */
export async function listAllUsers(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  is_superuser?: boolean;
}): Promise<User[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.is_superuser !== undefined) queryParams.append('is_superuser', params.is_superuser.toString());
  
  const query = queryParams.toString();
  const url = query ? `/api/admin/users?${query}` : '/api/admin/users';
  
  return apiGet<User[]>(url);
}


