/*
 * A company's core project is stored as "CORE". People know that work by
 * the company's name, so screens show the company's name in its place, and
 * "Company (Core)" where the company and its projects are listed together
 * and the core one needs telling apart. Display only: the stored name stays.
 */

type Labelled = {
  name?: string | null;
  isCore?: boolean | null;
  isPersonal?: boolean | null;
};

/** The company's core project (not someone's Personal one). */
export const isCoreProject = (p?: Labelled | null): boolean =>
  !!p &&
  !p.isPersonal &&
  (!!p.isCore || (p.name ?? '').trim().toUpperCase() === 'CORE');

/** The name to show for a project: its company's, for a core project. */
export function projectLabel(
  p: Labelled | null | undefined,
  companyName?: string | null,
): string {
  if (!p) return '';
  if (isCoreProject(p) && companyName?.trim()) return companyName.trim();
  return p.name ?? '';
}

/**
 * The name to show where the company is in view too, like the projects
 * list under each company: "ZONE (Core)".
 */
export function projectLabelInCompany(
  p: Labelled | null | undefined,
  companyName?: string | null,
): string {
  if (!p) return '';
  if (!isCoreProject(p)) return p.name ?? '';
  return companyName?.trim() ? `${companyName.trim()} (Core)` : 'Core';
}

type LabelCompany = {
  id: string;
  name?: string | null;
  logo?: string | null;
  isPersonal?: boolean | null;
};

/**
 * Projects loaded for a screen that only shows them, with each core
 * project's name (and, when it has none, logo) taken from its company.
 * Not for forms that edit a project: they keep the stored name.
 */
export function labelCoreProjects<
  T extends Labelled & { companyId?: string | null; logo?: string | null },
>(
  projects: T[],
  companies: LabelCompany[],
  opts?: { inCompany?: boolean },
): T[] {
  const byId = new Map(companies.map((c) => [c.id, c]));
  return projects.map((p) => {
    const company = p.companyId ? byId.get(p.companyId) : undefined;
    if (company?.isPersonal || !isCoreProject(p)) return p;
    return {
      ...p,
      name: opts?.inCompany
        ? projectLabelInCompany(p, company?.name)
        : projectLabel(p, company?.name),
      logo: p.logo || company?.logo || p.logo,
    };
  });
}
