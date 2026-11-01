import type { NextRequest } from 'next/server';

import { answerText } from '@/lib/hiring/forms';
import { POOL_TAGS } from '@/lib/hiring/pool';
import { requireApplicationPermission } from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import {
  fail,
  nowIso,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type {
  ApplicationAnswer,
  ApplicationEvent,
  JobApplication,
  JobOpening,
} from '@/models/hiring';
import { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 300;

/**
 * The company's talent pool (`?companyId=&q=`): applicants from any
 * opening, archived ones included, who carry a pool tag (top pick, sounds
 * genuine, maybe or keep on file). `q` searches names, emails, answers,
 * links and notes, so a skill like "figma" finds people who mention it.
 * Each person also lists every opening they're already in.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');

  const [pooled, openings] = await Promise.all([
    db.jobApplication.findMany({
      // Mongo's $in on an array matches when any tag is one of these.
      where: { companyId, tags: { in: POOL_TAGS.map((t) => t.value) } },
      orderBy: { submittedAt: 'desc' },
    }) as Promise<JobApplication[]>,
    db.jobOpening.findMany({ where: { companyId } }) as Promise<JobOpening[]>,
  ]);

  const matches = (a: JobApplication) =>
    !q ||
    [
      a.name,
      a.email,
      a.notes ?? '',
      ...Object.values(a.answers ?? {}).map((v) =>
        answerText(v as ApplicationAnswer),
      ),
    ]
      .join('\n')
      .toLowerCase()
      .includes(q);
  const people = pooled.filter((a) => a.tags?.length && matches(a));

  // Which openings each person is already in, so they aren't added twice.
  const emails = Array.from(new Set(people.map((a) => a.email)));
  const memberships: Array<{ email: string; openingId: string }> = emails.length
    ? await db.jobApplication.findMany({
        where: { companyId, email: { in: emails } },
        select: { email: true, openingId: true },
      })
    : [];
  const inOpenings: Record<string, string[]> = {};
  for (const m of memberships) (inOpenings[m.email] ??= []).push(m.openingId);

  return ok({
    applications: people.slice(0, MAX_RESULTS),
    total: people.length,
    inOpenings,
    openings: openings.map((o) => ({
      id: o.id,
      title: o.title,
      status: o.status,
      fields: o.fields,
      hiringLeadId: o.hiringLeadId ?? null,
      replyToLead: o.replyToLead ?? true,
    })),
  });
}

/**
 * Adds someone from the pool to another opening: `{ applicationId,
 * openingId }`. Their answers carry over where the new form asks the same
 * question. They start as Shortlisted; send them the "We thought of you"
 * email from the composer.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const applicationId =
    typeof body.applicationId === 'string' ? body.applicationId : '';
  const openingId = typeof body.openingId === 'string' ? body.openingId : '';
  if (!applicationId || !openingId)
    return fail(400, 'applicationId and openingId are required.');

  const { response, application, user } = await requireApplicationPermission(
    applicationId,
    'hiring:edit',
  );
  if (response || !application || !user)
    return response ?? fail(401, 'Authentication required.');

  const opening: JobOpening | null = await db.jobOpening.findFirst({
    where: { id: openingId, companyId: application.companyId },
  });
  if (!opening) return fail(404, 'Opening not found.');
  if (opening.status === JOB_OPENING_STATUS.ARCHIVED)
    return fail(400, 'That opening is archived.');
  if (opening.id === application.openingId)
    return fail(400, 'They’re already in this opening.');
  const taken = await db.jobApplication.count({
    where: { openingId: opening.id, email: application.email },
  });
  if (taken)
    return fail(409, `${application.name} is already in that opening.`);

  const from: JobOpening | null = await db.jobOpening.findFirst({
    where: { id: application.openingId },
  });
  // Carry answers over by question id, else by the same question label.
  const answers: Record<string, ApplicationAnswer> = {};
  const label = (s: string) => s.trim().toLowerCase();
  for (const field of opening.fields ?? []) {
    if (field.id in (application.answers ?? {})) {
      answers[field.id] = application.answers[field.id];
      continue;
    }
    const same = from?.fields?.find(
      (f) => label(f.label) === label(field.label),
    );
    if (same && same.id in (application.answers ?? {}))
      answers[field.id] = application.answers[same.id];
  }

  const now = nowIso();
  const history: ApplicationEvent[] = [
    {
      type: 'SUBMITTED',
      at: now,
      byUserId: user.id,
      to: APPLICATION_STAGE.APPLIED,
      text: `the talent pool${from ? ` (${from.title})` : ''}`,
    },
    {
      type: 'STAGE_CHANGED',
      at: now,
      byUserId: user.id,
      from: APPLICATION_STAGE.APPLIED,
      to: APPLICATION_STAGE.SHORTLISTED,
    },
  ];
  const created: JobApplication = await db.jobApplication.create({
    data: {
      companyId: opening.companyId,
      openingId: opening.id,
      name: application.name,
      email: application.email,
      answers,
      stage: APPLICATION_STAGE.SHORTLISTED,
      source: 'pool',
      pooledFromId: application.id,
      notes: application.notes ?? null,
      history,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ application: created }, { status: 201 });
}
