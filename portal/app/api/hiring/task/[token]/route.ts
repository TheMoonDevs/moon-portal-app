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
  TaskSubmission,
} from '@/models/hiring';
import { FORM_FIELD_TYPE } from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { token: string } };

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
  const event: ApplicationEvent = {
    type: 'TASK_SUBMITTED',
    at: now,
    text: application.taskSubmission ? 'Sent the task again' : null,
  };
  await db.jobApplication.update({
    where: { id: application.id },
    data: {
      taskSubmission: submission,
      updatedAt: now,
      history: { push: event },
    },
  });
  return ok({ submitted: true, submittedAt: now }, { status: 201 });
}
