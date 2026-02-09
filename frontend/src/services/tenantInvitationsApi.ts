/**
 * Tenant Invitations API service.
 */

import { apiGet, apiPost, apiDelete } from './api';

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  token: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantInvitationCreate {
  tenant_id: string;
  email: string;
  role: string;
  expires_in_days?: number;
}

/**
 * Create a tenant invitation by email.
 */
export async function createTenantInvitation(
  tenantId: string,
  data: TenantInvitationCreate
): Promise<TenantInvitation> {
  return apiPost<TenantInvitation>(`/api/tenants/${tenantId}/invitations`, data);
}

/**
 * List all invitations for a tenant.
 */
export async function listTenantInvitations(
  tenantId: string,
  params?: {
    skip?: number;
    limit?: number;
    status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
  }
): Promise<TenantInvitation[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  
  const query = queryParams.toString();
  const url = query
    ? `/api/tenants/${tenantId}/invitations?${query}`
    : `/api/tenants/${tenantId}/invitations`;
  
  return apiGet<TenantInvitation[]>(url);
}

/**
 * Get a specific invitation.
 */
export async function getTenantInvitation(
  tenantId: string,
  invitationId: string
): Promise<TenantInvitation> {
  return apiGet<TenantInvitation>(`/api/tenants/${tenantId}/invitations/${invitationId}`);
}

/**
 * Cancel a pending invitation.
 */
export async function cancelTenantInvitation(
  tenantId: string,
  invitationId: string
): Promise<{ message: string; data: any }> {
  return apiDelete<{ message: string; data: any }>(
    `/api/tenants/${tenantId}/invitations/${invitationId}`
  );
}

/**
 * Get invitation details by token (public endpoint).
 */
export async function getInvitationByToken(
  token: string
): Promise<{
  invitation_id: string;
  tenant_id: string;
  tenant_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}> {
  return apiGet<{
    invitation_id: string;
    tenant_id: string;
    tenant_name: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
    created_at: string;
  }>(`/api/auth/invitation/${token}`, {
    requireAuth: false, // Public endpoint
  });
}

/**
 * Accept an invitation by token.
 */
export async function acceptInvitation(
  token: string
): Promise<{ message: string; data: any }> {
  return apiPost<{ message: string; data: any }>(
    `/api/auth/invitation/${token}/accept`,
    {}
  );
}
