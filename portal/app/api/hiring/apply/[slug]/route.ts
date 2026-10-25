import { validateAnswers, validateApplicant } from '@/lib/hiring/forms';
import {
  checkUpload,
  clientKeyFor,
  isRateLimited,
  storeApplicationFile,
} from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import type { ApplicationAnswer, JobOpening } from '@/models/hiring';
import {
  APPLICATION_STAGE,
  FORM_FIELD_TYPE,
  JOB_OPENING_STATUS,
} from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

const invalid = (errors: Record<string, string>) =>
  Response.json(
    { status: 'fail', error: 'Please fix the highlighted answers.', errors },
    { status: 400 },
  );

/**
 * A candidate's application, sent from the public apply page as multipart
 * form data: `payload` holds `{ name, email, answers }` as JSON and each file
 * question sends its file as `file:<fieldId>`. No sign-in is needed.
 */
export async function POST(request: Request, { params }: Params) {
  if (isRateLimited(clientKeyFor(request)))
    return fail(429, 'Too many applications from here. Try again later.');

  const opening: JobOpening | null = await db.jobOpening.findFirst({
    where: { slug: params.slug },
  });
  if (!opening || opening.status === JOB_OPENING_STATUS.DRAFT)
    return fail(404, 'This opening does not exist.');
  if (opening.status !== JOB_OPENING_STATUS.OPEN)
    return fail(410, 'This opening is no longer taking applications.');

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, 'The application could not be read.');

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(String(form.get('payload') ?? '{}'));
  } catch {
    return fail(400, 'The application could not be read.');
  }

  // A field people never see; bots that fill it get a quiet "thanks".
  if (typeof payload.website === 'string' && payload.website.trim())
    return ok({ submitted: true });

  const fileFields = opening.fields.filter(
    (f) => f.type === FORM_FIELD_TYPE.FILE,
  );
  const files: Record<string, File> = {};
  const fileErrors: Record<string, string> = {};
  for (const field of fileFields) {
    const entry = form.get(`file:${field.id}`);
    if (!entry || typeof entry === 'string' || !entry.size) continue;
    const problem = checkUpload(entry as File);
    if (problem) fileErrors[field.id] = problem;
    else files[field.id] = entry as File;
  }

  const applicant = validateApplicant(payload);
  const rawAnswers =
    payload.answers && typeof payload.answers === 'object'
      ? (payload.answers as Record<string, unknown>)
      : {};
  const { answers, errors } = validateAnswers(opening.fields, rawAnswers, {
    filesPresent: Object.keys(files),
  });
  const allErrors = { ...applicant.errors, ...errors, ...fileErrors };
  if (Object.keys(allErrors).length) return invalid(allErrors);

  const existing = await db.jobApplication.count({
    where: { openingId: opening.id, email: applicant.email },
  });
  if (existing)
    return fail(
      409,
      'You have already applied for this role with this email address.',
    );

  const stored: Record<string, ApplicationAnswer> = {};
  try {
    for (const [fieldId, file] of Object.entries(files))
      stored[fieldId] = await storeApplicationFile(opening.id, file);
  } catch (error) {
    console.error('Failed to store application file', error);
    return fail(502, 'We could not upload your file. Please try again.');
  }

  const now = nowIso();
  await db.jobApplication.create({
    data: {
      companyId: opening.companyId,
      openingId: opening.id,
      name: applicant.name,
      email: applicant.email,
      answers: { ...answers, ...stored },
      stage: APPLICATION_STAGE.APPLIED,
      notes: null,
      history: [{ type: 'SUBMITTED', at: now, to: APPLICATION_STAGE.APPLIED }],
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ submitted: true }, { status: 201 });
}
