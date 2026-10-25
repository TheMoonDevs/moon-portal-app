'use client';

import type { Company, CompanyMember } from '@db/client';
import { useCallback, useEffect, useState } from 'react';

import { hasPermission } from '@/lib/permissions/matching';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { useUser } from './useUser';

export interface WorkspaceCompany {
  company: Company;
  member: CompanyMember | null;
  permissions: string[];
}

export interface WorkspaceData {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  permissions: string[];
  companies: WorkspaceCompany[];
}

/** Company permissions that open the admin console for that company. */
const MANAGE_PERMISSIONS = [
  'companies:edit',
  'members:edit',
  'roles:edit',
  'projects:create',
  'projects:edit',
];

/** Portal permissions that open the admin console. */
const PORTAL_ADMIN_PERMISSIONS = [
  'users:create',
  'users:edit',
  'users:delete',
  'permissions:read',
  'badges:create',
];

// One request shared by every component on the page.
let cache: { userId: string; data: WorkspaceData } | null = null;
let inflight: Promise<WorkspaceData> | null = null;
const listeners = new Set<() => void>();

const load = (userId: string, force = false): Promise<WorkspaceData> => {
  if (!force && cache?.userId === userId) return Promise.resolve(cache.data);
  if (!force && inflight) return inflight;
  inflight = PortalSdk.getData('/api/workspace', null)
    .then((res) => {
      const data: WorkspaceData = res?.data ?? {
        isSuperAdmin: false,
        isAdmin: false,
        permissions: [],
        companies: [],
      };
      cache = { userId, data };
      listeners.forEach((notify) => notify());
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

/**
 * The signed-in user's companies and what they may do in each. This only
 * shapes the UI: every API call is checked again on the server.
 */
export const useWorkspace = () => {
  const { user, status } = useUser();
  const userId = user?.id ?? '';
  const [data, setData] = useState<WorkspaceData | null>(
    cache?.userId === userId ? cache.data : null,
  );
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    const notify = () => cache?.userId === userId && setData(cache.data);
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, [userId]);

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    setLoading(true);
    load(userId)
      .then(setData)
      .catch((err) => console.error('Failed to load workspace', err))
      .finally(() => setLoading(false));
  }, [status, userId]);

  const refresh = useCallback(
    () => (userId ? load(userId, true) : Promise.resolve(null)),
    [userId],
  );

  const companies = data?.companies ?? [];
  const can = useCallback(
    (companyId: string | null | undefined, permission: string) =>
      !!companyId &&
      hasPermission(
        companies.find((c) => c.company.id === companyId)?.permissions ?? [],
        permission,
      ),
    [companies],
  );

  const portalPermissions = data?.permissions ?? [];
  /** A portal-wide permission, e.g. `users:delete`. */
  const canPortal = useCallback(
    (permission: string) => hasPermission(portalPermissions, permission),
    [portalPermissions],
  );

  const managedCompanies = companies.filter((c) =>
    MANAGE_PERMISSIONS.some((p) => hasPermission(c.permissions, p)),
  );
  const managesPortal = PORTAL_ADMIN_PERMISSIONS.some((p) =>
    hasPermission(portalPermissions, p),
  );

  return {
    loading,
    companies,
    managedCompanies,
    isSuperAdmin: !!data?.isSuperAdmin,
    /** Whether the admin console has anything for this user. */
    canOpenAdmin:
      !!user?.isAdmin ||
      !!data?.isSuperAdmin ||
      managesPortal ||
      managedCompanies.length > 0,
    can,
    canPortal,
    refresh,
  };
};
