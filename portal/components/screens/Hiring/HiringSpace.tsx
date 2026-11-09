'use client';

import type { User } from '@db/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';

import { hasPermission } from '@/lib/permissions/matching';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminHiring } from '../Admin/Hiring/AdminHiring';
import { Spin } from '../Admin/shared/AdminUI';

const COMPANY_STORAGE_KEY = 'tmd-admin-company';

/**
 * The Hiring space at /hiring: hiring, onboarding and courses, for people
 * who can see hiring or write courses in at least one company.
 */
export const HiringSpace = () => {
  const router = useRouter();
  const { user } = useUser();
  const workspace = useWorkspace();
  const [users, setUsers] = useState<User[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const spaceCompanies = useMemo(
    () =>
      workspace.workCompanies.filter(
        (c) =>
          hasPermission(c.permissions, 'hiring:read') ||
          hasPermission(c.permissions, 'courses:edit'),
      ),
    [workspace.workCompanies],
  );

  // Nothing here for them: back to the portal.
  useEffect(() => {
    if (!user || workspace.loading) return;
    if (!spaceCompanies.length && !user.isAdmin)
      router.replace(APP_ROUTES.home);
  }, [user, workspace.loading, spaceCompanies.length, router]);

  // A link can name the company (?company= or ?companyId=); otherwise the
  // last pick in this browser tab, then the top company.
  useEffect(() => {
    const ids = spaceCompanies.map((c) => c.company.id);
    if (companyId && ids.includes(companyId)) return;
    const params = new URLSearchParams(window.location.search);
    let saved = params.get('company') ?? params.get('companyId');
    try {
      if (!saved || !ids.includes(saved))
        saved = sessionStorage.getItem(COMPANY_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    setCompanyId(saved && ids.includes(saved) ? saved : (ids[0] ?? null));
  }, [spaceCompanies, companyId]);

  const selectCompany = useCallback((id: string) => {
    setCompanyId(id);
    try {
      sessionStorage.setItem(COMPANY_STORAGE_KEY, id);
    } catch {
      /* storage unavailable */
    }
    // Opening, applicant and course ids belong to the old company.
    const url = new URL(window.location.href);
    for (const key of [
      'company',
      'companyId',
      'opening',
      'application',
      'stage',
      'hire',
      'start',
      'course',
    ])
      url.searchParams.delete(key);
    window.history.replaceState(null, '', url.toString());
  }, []);

  useEffect(() => {
    if (!user) return;
    PortalSdk.getData('/api/user?status=ALL', null)
      .then((data) => setUsers(data?.data?.user || []))
      .catch((error) => console.error(error));
  }, [user]);

  if (workspace.loading && !spaceCompanies.length)
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-950 text-neutral-500">
        <Spin className="size-6" />
      </div>
    );

  return (
    <>
      <AdminHiring
        users={users}
        spaceCompanies={spaceCompanies}
        selectedCompanyId={companyId}
        onSelectCompany={selectCompany}
        showAdminLink={
          !!user?.isAdmin ||
          workspace.isSuperAdmin ||
          workspace.managesPortal ||
          workspace.managedCompanies.length > 0
        }
      />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </>
  );
};
