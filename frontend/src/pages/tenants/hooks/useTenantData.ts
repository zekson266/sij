import * as React from 'react';
import { getTenantById, getTenantBySlug } from '../../../services/tenantApi';
import { getUserTenants } from '../../../services/authApi';
import { getIdentifierType } from '../../../utils/tenantIdentifier';
import type { Tenant } from '../../../types';

interface UserTenant {
  tenant_user: {
    id: string;
    role: string;
    is_active: boolean;
    effective_permissions?: string[];
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UseTenantDataReturn {
  tenant: Tenant | null;
  userTenant: UserTenant | null;
  canManageSettings: boolean;
  canManageMembers: boolean;
  canAccessRopa: boolean;
  canEditRopa: boolean;
  canDelete: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateTenant: (updatedTenant: Tenant) => void;
}

const ROLE_FALLBACK_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'tenant:read',
    'tenant:write',
    'tenant:delete',
    'tenant:settings',
    'member:invite',
    'member:read',
    'member:update',
    'member:remove',
    'resource:read',
    'resource:write',
    'resource:delete',
    'booking:create',
    'booking:read',
    'booking:update',
    'booking:delete',
    'booking:cancel',
    'ropa:read',
    'ropa:create',
    'ropa:update',
    'ropa:delete',
  ],
  admin: [
    'tenant:read',
    'tenant:write',
    'tenant:settings',
    'member:invite',
    'member:read',
    'member:update',
    'member:remove',
    'resource:read',
    'resource:write',
    'resource:delete',
    'booking:create',
    'booking:read',
    'booking:update',
    'booking:delete',
    'booking:cancel',
    'ropa:read',
    'ropa:create',
    'ropa:update',
    'ropa:delete',
  ],
  editor: [
    'tenant:read',
    'ropa:read',
    'ropa:create',
    'ropa:update',
    'ropa:delete',
  ],
  member: [
    'tenant:read',
    'member:read',
    'resource:read',
    'resource:write',
    'booking:create',
    'booking:read',
    'booking:update',
    'booking:cancel',
    'ropa:read',
    'ropa:create',
    'ropa:update',
  ],
  viewer: [
    'tenant:read',
    'member:read',
    'resource:read',
    'booking:read',
    'ropa:read',
  ],
};

const getFallbackPermissions = (role: string | undefined): string[] => {
  if (!role) {
    return [];
  }
  return ROLE_FALLBACK_PERMISSIONS[role.toLowerCase()] || [];
};

export function useTenantData(tenantId: string | undefined): UseTenantDataReturn {
  const [tenant, setTenant] = React.useState<Tenant | null>(null);
  const [userTenant, setUserTenant] = React.useState<UserTenant | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [hasLoaded, setHasLoaded] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!tenantId) {
      setError('Invalid tenant ID');
      setIsLoading(false);
      return;
    }

    // Only set loading state if this is the initial load
    const isInitialLoad = !hasLoaded;
    
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setError(null);

      // Fetch tenant details - support both UUID and slug
      const identifierType = getIdentifierType(tenantId);
      const tenantData = identifierType === 'uuid' 
        ? await getTenantById(tenantId)
        : await getTenantBySlug(tenantId);
      setTenant(tenantData);

      // Fetch user's tenant relationship to check permissions
      // Use tenant.id (UUID) for matching since userTenants always have UUID
      const userTenants = await getUserTenants();
      const userTenantData = userTenants.find((ut: UserTenant) => ut.tenant.id === tenantData.id);
      setUserTenant(userTenantData || null);

      if (!userTenantData) {
        setError('You are not a member of this tenant');
      }

      setHasLoaded(true);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load tenant';
      setError(errorMessage);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [tenantId, hasLoaded]);

  React.useEffect(() => {
    // Reset hasLoaded when tenantId changes
    setHasLoaded(false);
  }, [tenantId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const effectivePermissions = React.useMemo(() => {
    const permissions = userTenant?.tenant_user.effective_permissions;
    if (permissions && permissions.length > 0) {
      return permissions;
    }
    return getFallbackPermissions(userTenant?.tenant_user.role);
  }, [userTenant]);

  const hasPermission = React.useCallback(
    (permission: string) => effectivePermissions.includes(permission),
    [effectivePermissions]
  );

  const hasAnyPermission = React.useCallback(
    (permissions: string[]) => permissions.some((permission) => effectivePermissions.includes(permission)),
    [effectivePermissions]
  );

  const canManageSettings = hasAnyPermission(['tenant:settings', 'tenant:write']);
  const canManageMembers = hasAnyPermission(['member:invite', 'member:update', 'member:remove']);
  const canAccessRopa = hasAnyPermission(['ropa:read', 'ropa:create', 'ropa:update', 'ropa:delete']);
  const canEditRopa = hasAnyPermission(['ropa:create', 'ropa:update', 'ropa:delete']);
  const canDelete = hasPermission('tenant:delete');

  const updateTenant = React.useCallback((updatedTenant: Tenant) => {
    // Update tenant state directly without refetching
    setTenant(updatedTenant);
  }, []);

  return {
    tenant,
    userTenant,
    canManageSettings,
    canManageMembers,
    canAccessRopa,
    canEditRopa,
    canDelete,
    isLoading,
    error,
    refetch: fetchData,
    updateTenant,
  };
}


