/**
 * Tenant API service.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import type { Tenant, TenantPublic } from '../types';

/**
 * Create a new tenant.
 */
export async function createTenant(data: {
  name: string;
  slug?: string;
  domain?: string;
  email: string;
  phone?: string;
  subscription_tier?: string;
}): Promise<Tenant> {
  return apiPost<Tenant>('/api/tenants', data);
}

/**
 * Get tenant by ID.
 */
export async function getTenantById(tenantId: string): Promise<Tenant> {
  return apiGet<Tenant>(`/api/tenants/${tenantId}`);
}

/**
 * Get tenant by slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant> {
  return apiGet<Tenant>(`/api/tenants/slug/${slug}`);
}

/**
 * Get public tenant information (works with or without authentication).
 * Sends auth token if available so backend can determine correct can_book value.
 */
export async function getTenantPublicInfo(slug: string): Promise<TenantPublic> {
  return apiGet<TenantPublic>(`/api/tenants/slug/${slug}/public`, {
    requireAuth: true, // Send token if available (endpoint accepts optional auth)
  });
}

/**
 * List tenants (with optional filters).
 */
export async function listTenants(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  is_verified?: boolean;
}): Promise<Tenant[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.is_verified !== undefined) queryParams.append('is_verified', params.is_verified.toString());
  
  const query = queryParams.toString();
  const url = query ? `/api/tenants?${query}` : '/api/tenants';
  
  return apiGet<Tenant[]>(url, {
    requireAuth: false, // This endpoint is public
  });
}

/**
 * Update tenant.
 */
export async function updateTenant(
  tenantId: string,
  data: Partial<{
    name: string;
    slug: string;
    domain: string;
    email: string;
    phone: string;
    subscription_tier: string;
    is_active: boolean;
    is_verified: boolean;
    tenant_metadata: Record<string, any>;
    settings: Record<string, any>;
  }>
): Promise<Tenant> {
  return apiPatch<Tenant>(`/api/tenants/${tenantId}`, data);
}

/**
 * Delete tenant (soft delete by default).
 */
export async function deleteTenant(
  tenantId: string,
  softDelete: boolean = true
): Promise<{ message: string; data: any }> {
  return apiDelete<{ message: string; data: any }>(
    `/api/tenants/${tenantId}?soft_delete=${softDelete}`
  );
}

