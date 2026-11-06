import type { ItemSharing } from '@/models/workspace';

import { ancestorPages } from './projectPages';

/*
 * Who can open a project page or a plan. By default a page follows its
 * project and a plan its company: everyone who can open those can open it.
 * Restricting one limits it to the people it is shared with, plus whoever
 * made (or owns) it. A page's restriction applies to every page inside it:
 * to open a page you need to be let into it and into every restricted page
 * above it.
 *
 * Shared by the server (which enforces it) and the browser (which shows it).
 */

/** The person looking, and the companies where they see everything. */
export type SharingViewer = {
  id: string;
  /** A portal admin sees every page and plan. */
  isAdmin?: boolean;
  /** Companies they own: owners see every page and plan there. */
  ownerOf?: ReadonlySet<string> | string[];
};

type Shareable = {
  companyId: string;
  sharing?: ItemSharing | null;
};

type SharedPage = Shareable & {
  id: string;
  parentId?: string | null;
  createdById?: string | null;
};

type SharedPlan = Shareable & {
  ownerId?: string | null;
  createdById?: string | null;
};

export const isRestricted = (item: { sharing?: ItemSharing | null }) =>
  !!item.sharing?.restricted;

/** Whether the viewer sees everything in the company, shared or not. */
export const seesAll = (viewer: SharingViewer, companyId: string) => {
  if (viewer.isAdmin) return true;
  const owned = viewer.ownerOf;
  if (!owned) return false;
  return Array.isArray(owned)
    ? owned.includes(companyId)
    : (owned as ReadonlySet<string>).has(companyId);
};

/** The people who always keep access to an item: who made or owns it. */
export const keeperIds = (item: {
  createdById?: string | null;
  ownerId?: string | null;
}) =>
  Array.from(
    new Set(
      [item.ownerId, item.createdById].filter(
        (x): x is string => typeof x === 'string' && !!x,
      ),
    ),
  );

/** Whether the viewer is let into this one item, ignoring the ones above it. */
const letIn = (
  item: Shareable & { createdById?: string | null; ownerId?: string | null },
  viewer: SharingViewer,
) =>
  !isRestricted(item) ||
  seesAll(viewer, item.companyId) ||
  keeperIds(item).includes(viewer.id) ||
  (item.sharing?.userIds ?? []).includes(viewer.id);

/**
 * Whether the viewer can open `page`: it and every page above it must let
 * them in. `pages` are the project's pages, to find the ones above.
 */
export const canSeePage = <T extends SharedPage>(
  pages: T[],
  page: T,
  viewer: SharingViewer,
) =>
  letIn(page, viewer) &&
  ancestorPages(pages, page.id).every((above) => letIn(above, viewer));

/** The pages the viewer can open, in the order given. */
export const visiblePages = <T extends SharedPage>(
  pages: T[],
  viewer: SharingViewer,
) => pages.filter((p) => canSeePage(pages, p, viewer));

export const canSeePlan = (plan: SharedPlan, viewer: SharingViewer) =>
  letIn(plan, viewer);

/**
 * The nearest restricted page above `pageId`: its people limit who can open
 * this page too. Null when nothing above is restricted.
 */
export const limitingParent = <T extends SharedPage>(
  pages: T[],
  pageId: string,
): T | null => {
  const above = ancestorPages(pages, pageId);
  for (let i = above.length - 1; i >= 0; i--)
    if (isRestricted(above[i])) return above[i];
  return null;
};

/**
 * The sharing to store from an untrusted body. `allowed` are the people it
 * may be shared with (the company's members); `actorId` is who is changing
 * it, who stays on the list so they do not lock themselves out.
 */
export function readSharing(
  body: unknown,
  allowed: ReadonlySet<string>,
  actorId: string,
): { sharing?: ItemSharing; error?: string } {
  if (!body || typeof body !== 'object')
    return { error: 'That sharing is not valid.' };
  const { restricted, userIds } = body as {
    restricted?: unknown;
    userIds?: unknown;
  };
  if (typeof restricted !== 'boolean')
    return { error: 'Say whether it is restricted.' };
  if (userIds !== undefined && !Array.isArray(userIds))
    return { error: 'That list of people is not valid.' };
  const ids = (userIds ?? []) as unknown[];
  const outside = ids.filter(
    (x) => typeof x !== 'string' || !allowed.has(x as string),
  );
  if (outside.length)
    return { error: 'It can only be shared with people in the company.' };
  const people = new Set(ids as string[]);
  if (restricted) people.add(actorId);
  return {
    sharing: {
      restricted,
      userIds: Array.from(people).slice(0, 500),
      updatedById: actorId,
      updatedAt: new Date().toISOString(),
    },
  };
}
