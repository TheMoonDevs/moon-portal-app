import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { validateAnswers } from '@/lib/hiring/forms';
import {
  checkUpload,
  clientKeyFor,
  isRateLimited,
  storeApplicationFile,
} from '@/lib/hiring/server';
import { canSubmitTask, TASK_TOKEN_PATTERN } from '@/lib/hiring/tasks';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import type {
  ApplicationAnswer,
  ApplicationEvent,
  JobApplication,
  JobOpening,
  TaskOpens,
  TaskSubmission,
} from '@/models/hiring';
import { APPLICATION_STAGE, FORM_FIELD_TYPE } from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { token: string } };

/** Stages a task submission moves forward into Task review. */
const BEFORE_REVIEW: APPLICATION_STAGE[] = [
  APPLICATION_STAGE.APPLIED,
  APPLICATION_STAGE.SHORTLISTED,
  APPLICATION_STAGE.TASK,
];

/** Visits closer together than this count once (a reload, a second tab). */
const REOPEN_MS = 60_000;

/**
 * Notes that the candidate opened their task page, so the team can see the
 * link landed. The page calls this once per browser tab. Visits from someone
 * signed in to the portal (the team checking a link) are not counted.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  if (!TASK_TOKEN_PATTERN.test(params.token))
    return fail(404, 'This task link does not exist.');
  const signedIn = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie:
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https',
  }).catch(() => null);
  if (signedIn) return ok({ counted: false });

  const application: JobApplication | null = await db.jobApplication.findFirst({
    where: { taskToken: params.token },
  });
  if (!application) return fail(404, 'This task link does not exist.');

  const at = nowIso();
  const before = application.taskOpens;
  if (before && Date.now() - new Date(before.lastAt).getTime() < REOPEN_MS)
    return ok({ counted: false });
  const taskOpens: TaskOpens = {
    count: (before?.count ?? 0) + 1,
    firstAt: before?.firstAt ?? at,
    lastAt: at,
  };
  const event: ApplicationEvent = { type: 'TASK_OPENED', at };
  await db.jobApplication.update({
    where: { id: application.id },
    data: {
      taskOpens,
      // Only the first visit goes in the history; the count says the rest.
      ...(!before && { history: { push: event } }),
      updatedAt: at,
    },
  });
  return ok({ counted: true });
}

const invalid = (errors: Record<string, string>) =>
  Response.json(
    { status: 'fail', error: 'Please fix the highlighted answers.', errors },
    { status: 400 },
  );

/**
 * A candidate's task, sent from their private /task/<token> page as multipart
 * form data: `payload` holds `{ answers }` as JSON and each file question
 * sends its file as `file:<fieldId>`. The token is the only key.
 */
export async function POST(request: Request, { params }: Params) {
  if (isRateLimited(clientKeyFor(request)))
    return fail(429, 'Too many tries from here. Try again later.');
  if (!TASK_TOKEN_PATTERN.test(params.token))
    return fail(404, 'This task link does not exist.');

  const application: JobApplication | null = await db.jobApplication.findFirst({
    where: { taskToken: params.token },
  });
  const opening: JobOpening | null = application
    ? await db.jobOpening.findFirst({ where: { id: application.openingId } })
    : null;
  const task = opening?.task;
  if (!application || !opening || !task)
    return fail(404, 'This task link does not exist.');
  if (!canSubmitTask(task, application))
    return fail(409, 'We already have your task. Thank you!');

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, 'Your task could not be read.');

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(String(form.get('payload') ?? '{}'));
  } catch {
    return fail(400, 'Your task could not be read.');
  }

  const files: Record<string, File> = {};
  const fileErrors: Record<string, string> = {};
  for (const field of task.fields.filter(
    (f) => f.type === FORM_FIELD_TYPE.FILE,
  )) {
    const entry = form.get(`file:${field.id}`);
    if (!entry || typeof entry === 'string' || !entry.size) continue;
    const problem = checkUpload(entry as File);
    if (problem) fileErrors[field.id] = problem;
    else files[field.id] = entry as File;
  }

  // On a resend, files sent last time count as attached unless replaced.
  const previous = application.taskSubmission?.answers ?? {};
  const keptFiles = task.fields
    .filter(
      (f) =>
        f.type === FORM_FIELD_TYPE.FILE &&
        !files[f.id] &&
        previous[f.id] &&
        typeof previous[f.id] === 'object',
    )
    .map((f) => f.id);

  const rawAnswers =
    payload.answers && typeof payload.answers === 'object'
      ? (payload.answers as Record<string, unknown>)
      : {};
  const { answers, errors } = validateAnswers(task.fields, rawAnswers, {
    filesPresent: [...Object.keys(files), ...keptFiles],
  });
  const allErrors = { ...errors, ...fileErrors };
  if (Object.keys(allErrors).length) return invalid(allErrors);

  const stored: Record<string, ApplicationAnswer> = {};
  for (const id of keptFiles) stored[id] = previous[id];
  try {
    for (const [fieldId, file] of Object.entries(files))
      stored[fieldId] = await storeApplicationFile(opening.id, file);
  } catch (error) {
    console.error('Failed to store task file', error);
    return fail(502, 'We could not upload your file. Please try again.');
  }

  const now = nowIso();
  const submission: TaskSubmission = {
    answers: { ...answers, ...stored },
    submittedAt: now,
  };
  const events: ApplicationEvent[] = [
    {
      type: 'TASK_SUBMITTED',
      at: now,
      text: application.taskSubmission ? 'Sent the task again' : null,
    },
  ];
  // A task sent back waits in Task review. Candidates already further on
  // (or rejected) stay where they are.
  const toReview = BEFORE_REVIEW.includes(application.stage);
  if (toReview)
    events.push({
      type: 'STAGE_CHANGED',
      at: now,
      byUserId: null,
      from: application.stage,
      to: APPLICATION_STAGE.TASK_REVIEW,
    });
  await db.jobApplication.update({
    where: { id: application.id },
    data: {
      taskSubmission: submission,
      ...(toReview ? { stage: APPLICATION_STAGE.TASK_REVIEW } : {}),
      updatedAt: now,
      history: { push: { $each: events } },
    },
  });
  return ok({ submitted: true, submittedAt: now }, { status: 201 });
}
