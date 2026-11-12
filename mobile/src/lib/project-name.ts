import { useQuery } from '@tanstack/react-query';

import { api } from './api';
import type { Workspace } from './types';

/*
 * A company's general work sits in its core project, named CORE. People
 * know it by the company's name, so that is what the app shows.
 */

type Named = { name?: string | null; isCore?: boolean | null; isPersonal?: boolean | null };

/** The company's core project (its general work), not someone's Personal. */
export const isCoreProject = (p?: Named | null) =>
  !!p && !p.isPersonal && (!!p.isCore || (p.name ?? '').trim().toUpperCase() === 'CORE');

/** A project's name to show: the company's name for its core project. */
export function projectName(p: Named | null | undefined, companyName?: string | null) {
  if (!p) return '';
  return isCoreProject(p) ? companyName || 'Company work' : (p.name ?? '');
}

/**
 * A project's name where its company is in view too, like a list of the
 * company's projects: "ZONE (Core)" for its core project.
 */
export function projectNameInCompany(p: Named | null | undefined, companyName?: string | null) {
  if (!p) return '';
  return isCoreProject(p) ? (companyName ? `${companyName} (Core)` : 'Core') : (p.name ?? '');
}

/** The person's companies by id, from the workspace (cached). */
export function useCompanyLookup() {
  const query = useQuery({
    queryKey: ['workspace'],
    queryFn: () => api<Workspace>('/api/workspace'),
  });
  const byId = new Map((query.data?.companies ?? []).map((c) => [c.company.id, c.company]));
  return (id?: string | null) => (id ? byId.get(id) : undefined);
}

/**
 * How to show a project: its name and mark, or for a core project the
 * company's name, colour and logo.
 */
export function useProjectLabel() {
  const companyOf = useCompanyLookup();
  return (
    p: Named & { companyId?: string | null; companyName?: string | null; color?: string | null; logo?: string | null },
  ) => {
    if (!isCoreProject(p)) return { name: p.name ?? '', color: p.color, logo: p.logo };
    const company = companyOf(p.companyId);
    return {
      name: p.companyName || company?.name || 'Company work',
      color: company?.color ?? p.color,
      logo: company?.logo ?? p.logo,
    };
  };
}

/** A company's name by id, from the workspace (cached). */
export function useCompanyName() {
  const companyOf = useCompanyLookup();
  return (id?: string | null) => companyOf(id)?.name ?? null;
}
