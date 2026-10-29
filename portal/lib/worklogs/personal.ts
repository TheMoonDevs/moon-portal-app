/*
 * Personal work: `p:` lines belong to the writer alone. Every person has a
 * "Personal" company for them, made up here rather than stored, so private
 * lines have somewhere to live. Nobody else ever sees their words, their
 * links or their count: not in worklogs, leaderboards, stats or the World.
 */

import type { WorklogLink } from '@/models/worklogs';

import { PRIVATE_LINE } from './lines';

/** The company id every private line is linked to. */
export const PERSONAL_COMPANY_ID = 'personal';

/**
 * A task written as personal: "p: …", "P - …" or "personal: …" (or
 * "personal - …") at its start.
 */
export const PERSONAL_TITLE =
  /^\s*(?:p\s*:|p\s+[-–—]|p[-–—]\s|personal\s*(?::|[-–—]|$))/i;

/** The Personal company, the same for everyone and visible only to its owner. */
export const PERSONAL_COMPANY = {
  id: PERSONAL_COMPANY_ID,
  name: 'Personal',
  isPersonal: true,
} as const;

export const isPersonalLink = (
  link: Pick<WorklogLink, 'isPrivate' | 'companyId'>,
) => !!link.isPrivate || link.companyId === PERSONAL_COMPANY_ID;

/** A section's text with the private lines taken out. */
export const withoutPrivateLines = (content: string) =>
  content
    .split('\n')
    .filter((line) => !PRIVATE_LINE.test(line))
    .join('\n')
    .trim();

/**
 * A worklog as anyone but its owner may see it: no private lines, no links
 * for them, and no line text in the other links (others see where work went,
 * not the words).
 */
export function publicWorklog<T extends { works?: unknown; links?: unknown }>(
  worklog: T,
): T {
  const works = Array.isArray(worklog.works)
    ? worklog.works.map((work: Record<string, any>) => {
        if (!work || typeof work.content !== 'string') return work;
        // A section left empty keeps a bare bullet, as the editor expects.
        return { ...work, content: withoutPrivateLines(work.content) || '*' };
      })
    : worklog.works;
  const links = Array.isArray(worklog.links)
    ? (worklog.links as WorklogLink[])
        .filter((link) => !isPersonalLink(link))
        .map(({ text: _text, ...link }) => link)
    : worklog.links;
  return { ...worklog, works, links };
}

/** Worklogs as `viewerId` may see them: whole when theirs, public otherwise. */
export const worklogsForViewer = <
  T extends { userId?: string | null; works?: unknown; links?: unknown },
>(
  worklogs: T[],
  viewerId: string | null,
): T[] =>
  worklogs.map((log) =>
    viewerId && log.userId === viewerId ? log : publicWorklog(log),
  );
