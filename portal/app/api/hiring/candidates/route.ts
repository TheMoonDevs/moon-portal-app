import type { NextRequest } from 'next/server';

import { answerText } from '@/lib/hiring/forms';
import { isPoolTag } from '@/lib/hiring/pool';
import { isStage } from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import {
  APPLICATION_STAGE,
  type ApplicationAnswer,
  type JobApplication,
  type JobOpening,
} from '@/models/hiring';

export const dynamic = 'force-dynamic';

const MAX_PEOPLE = 300;

const SORTS = ['updated', 'applied', 'oldest', 'name'] as const;
export type CandidateSort = (typeof SORTS)[number];

const time = (value: unknown) => {
  const t = new Date(String(value ?? '')).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** When the application last changed stage (or came in, if it never has). */
const changedAt = (a: JobApplication) => {
  let at = time(a.submittedAt);
  for (const e of a.history ?? [])
    if (e.type === 'STAGE_CHANGED') at = Math.max(at, time(e.at));
  return at;
};

/** What one application looks like in the Candidates list. */
const brief = (a: JobApplication) => ({
  updatedAt: new Date(changedAt(a) || Date.now()).toISOString(),
  id: a.id,
  openingId: a.openingId,
  name: a.name,
  email: a.email,
  stage: a.stage,
  submittedAt: a.submittedAt,
  tags: a.tags ?? [],
  source: a.source ?? null,
  lastEmail: a.lastEmail ?? null,
  taskSubmitted: !!a.taskSubmission,
  taskOpened: !!a.taskOpens?.count,
  scorecards: a.scorecards?.length ?? 0,
  notes: a.notes ? a.notes.slice(0, 240) : null,
});

export type CandidateApplication = ReturnType<typeof brief>;

/**
 * Everyone who applied to any of the company's openings, archived ones
 * included (`?companyId=`), one row per person (by email) with each opening
 * they're in. `q` searches names, emails, answers, links, notes and sources;
 * `openingId`, `stage` and `tag` narrow the list.
 * Rejected applications are left out unless `rejected=1` or the stage asked
 * for is Rejected. `sort` is updated (last stage change first, the default),
 * applied (newest first), oldest or name.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const companyId = params.get('companyId');
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');

  const q = (params.get('q') ?? '').trim().toLowerCase();
  const openingId = params.get('openingId') || null;
  const stage = params.get('stage');
  const tag = params.get('tag');
  const sortParam = params.get('sort') as CandidateSort | null;
  const sort: CandidateSort =
    sortParam && SORTS.includes(sortParam) ? sortParam : 'updated';
  const withRejected =
    params.get('rejected') === '1' || stage === APPLICATION_STAGE.REJECTED;

  const [applications, openings] = await Promise.all([
    db.jobApplication.findMany({
      where: { companyId },
      orderBy: { submittedAt: 'desc' },
    }) as Promise<JobApplication[]>,
    db.jobOpening.findMany({
      where: { companyId },
      select: { id: true, title: true, status: true },
    }) as Promise<Array<Pick<JobOpening, 'id' | 'title' | 'status'>>>,
  ]);

  const words = q.split(/\s+/).filter(Boolean);
  const matches = (a: JobApplication) => {
    if (!words.length) return true;
    const text = [
      a.name,
      a.email,
      a.notes ?? '',
      a.source ?? '',
      ...Object.values(a.answers ?? {}).map((v) =>
        answerText(v as ApplicationAnswer),
      ),
    ]
      .join('\n')
      .toLowerCase();
    // Every word has to appear somewhere, so "react delhi" narrows down.
    return words.every((w) => text.includes(w));
  };

  // One row per person; a filter keeps a person when any of their
  // applications matches, and the row still lists all of them.
  const byEmail = new Map<string, JobApplication[]>();
  for (const a of applications) {
    if (!withRejected && a.stage === APPLICATION_STAGE.REJECTED) continue;
    const list = byEmail.get(a.email);
    if (list) list.push(a);
    else byEmail.set(a.email, [a]);
  }

  const people: Array<{
    email: string;
    name: string;
    latestAt: JobApplication['submittedAt'];
    updatedAt: string;
    applications: CandidateApplication[];
  }> = [];
  for (const [email, rows] of Array.from(byEmail.entries())) {
    const hit = rows.some(
      (a) =>
        (!openingId || a.openingId === openingId) &&
        (!isStage(stage) || a.stage === stage) &&
        (!isPoolTag(tag) || a.tags?.includes(tag)),
    );
    if (!hit) continue;
    if (!rows.some(matches)) continue;
    // The application that changed last leads the row.
    const briefs = rows
      .map(brief)
      .sort((x, y) => time(y.updatedAt) - time(x.updatedAt));
    people.push({
      email,
      name: rows[0].name,
      latestAt: rows[0].submittedAt,
      updatedAt: briefs[0].updatedAt,
      applications: briefs,
    });
  }

  const firstApplied = (p: (typeof people)[number]) =>
    Math.min(...p.applications.map((a) => time(a.submittedAt)));
  people.sort((x, y) => {
    if (sort === 'name') return x.name.localeCompare(y.name);
    if (sort === 'applied') return time(y.latestAt) - time(x.latestAt);
    if (sort === 'oldest') return firstApplied(x) - firstApplied(y);
    return time(y.updatedAt) - time(x.updatedAt);
  });

  return ok({
    people: people.slice(0, MAX_PEOPLE),
    total: people.length,
    applications: applications.length,
    openings,
  });
}
