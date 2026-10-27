import { GetObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import { getSessionUser } from '@/lib/permissions/server';
import {
  fail,
  nowIso,
  requireCompanyPermission,
  slugify,
} from '@/lib/workspace/server';
import type {
  ApplicationEvent,
  ApplicationFile,
  JobApplication,
  JobOpening,
} from '@/models/hiring';
import { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';
import { MEMBER_STATUS } from '@/models/workspace';

import {
  ALLOWED_FILE_TYPES,
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_BYTES,
  sanitizeFields,
} from './forms';
import { sanitizeTask } from './tasks';

/* -------------------------------- openings ------------------------------- */

/** Loads an opening and checks `permission` in the company that owns it. */
export async function requireOpeningPermission(
  openingId: string,
  permission: string,
) {
  const opening: JobOpening | null = await db.jobOpening.findFirst({
    where: { id: openingId },
  });
  if (!opening) {
    const user = await getSessionUser();
    return {
      response: user
        ? fail(404, 'Opening not found.')
        : fail(401, 'Authentication required.'),
      user,
      opening: null,
    };
  }
  const guard = await requireCompanyPermission(opening.companyId, permission);
  return { response: guard.response, user: guard.user, opening };
}

/** Loads an application and checks `permission` in its company. */
export async function requireApplicationPermission(
  applicationId: string,
  permission: string,
) {
  const application: JobApplication | null = await db.jobApplication.findFirst({
    where: { id: applicationId },
  });
  if (!application) {
    const user = await getSessionUser();
    return {
      response: user
        ? fail(404, 'Application not found.')
        : fail(401, 'Authentication required.'),
      user,
      application: null,
    };
  }
  const guard = await requireCompanyPermission(
    application.companyId,
    permission,
  );
  return { response: guard.response, user: guard.user, application };
}

/**
 * A public slug for /apply/<slug>. A short random suffix keeps it unique
 * across companies and hard to guess before the link is shared.
 */
export async function uniqueOpeningSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 48);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = `${base}-${randomBytes(3).toString('hex')}`;
    const taken = await db.jobOpening.count({ where: { slug } });
    if (!taken) return slug;
  }
  return `${base}-${randomBytes(6).toString('hex')}`;
}

export type StageCounts = Record<APPLICATION_STAGE, number> & {
  total: number;
};

export const emptyStageCounts = (): StageCounts => ({
  total: 0,
  ...(Object.fromEntries(
    Object.values(APPLICATION_STAGE).map((stage) => [stage, 0]),
  ) as Record<APPLICATION_STAGE, number>),
});

/** Applications per stage for each opening. */
export async function countByStage(
  openingIds: string[],
): Promise<Record<string, StageCounts>> {
  if (!openingIds.length) return {};
  const rows: Array<{ openingId: string; stage: APPLICATION_STAGE }> =
    await db.jobApplication.findMany({
      where: { openingId: { in: openingIds } },
      select: { openingId: true, stage: true },
    });
  const out: Record<string, StageCounts> = {};
  for (const row of rows) {
    const counts = (out[row.openingId] ??= emptyStageCounts());
    counts.total += 1;
    if (row.stage in counts) counts[row.stage] += 1;
  }
  return out;
}

/* --------------------------------- files --------------------------------- */

// Candidate files hold personal details, so unlike other uploads they are
// stored private and only handed out through short-lived signed links.
const storage = {
  client: new S3({
    forcePathStyle: false,
    endpoint: process.env.SPACES_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.SPACES_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.SPACES_SECRET_KEY || '',
    },
  }),
  bucket: process.env.SPACES_NAME || '',
  folder: 'hiring',
};

export function checkUpload(file: File): string | null {
  if (!file.size) return 'The file is empty.';
  if (file.size > MAX_FILE_BYTES)
    return `Files can be up to ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  if (!ALLOWED_FILE_TYPES[file.type])
    return 'Upload a PDF, a Word document or an image (PNG or JPG).';
  return null;
}

export async function storeApplicationFile(
  openingId: string,
  file: File,
): Promise<ApplicationFile> {
  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'file';
  const key = `${storage.folder}/${openingId}/${randomBytes(12).toString('hex')}-${safeName}`;
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ACL: 'private',
      ContentType: file.type,
      ContentDisposition: `inline; filename="${safeName}"`,
    }),
  );
  return {
    key,
    name: file.name.slice(0, 200),
    type: file.type,
    size: file.size,
  };
}

/** A link to a candidate's file that expires after ten minutes. */
export function signedFileUrl(key: string) {
  return getSignedUrl(
    storage.client,
    new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    { expiresIn: 600 },
  );
}

/* ------------------------------ rate limiting ---------------------------- */

const recentSubmissions = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;

/**
 * Best-effort limit on public submissions per client address. It lives in the
 * server's memory, so it slows down a script but is not a hard guarantee.
 */
export function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const hits = (recentSubmissions.get(clientKey) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );
  if (hits.length >= MAX_PER_WINDOW) {
    recentSubmissions.set(clientKey, hits);
    return true;
  }
  hits.push(now);
  recentSubmissions.set(clientKey, hits);
  if (recentSubmissions.size > 5000) {
    for (const [key, times] of Array.from(recentSubmissions.entries())) {
      if (times.every((t) => now - t >= WINDOW_MS))
        recentSubmissions.delete(key);
    }
  }
  return false;
}

export const clientKeyFor = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'unknown';

/* ------------------------------ opening input ---------------------------- */

const OPENING_TEXT_LIMITS = {
  title: 140,
  department: 80,
  location: 120,
  employmentType: 40,
  description: MAX_DESCRIPTION_LENGTH,
  details: MAX_DESCRIPTION_LENGTH,
  notes: MAX_DESCRIPTION_LENGTH,
} as const;

/**
 * The editable parts of an opening from an untrusted body. Only keys present
 * in the body are returned, so the same parser serves create and update.
 */
export function parseOpeningInput(body: Record<string, unknown>): {
  data: Partial<JobOpening>;
  error: string | null;
} {
  const data: Partial<JobOpening> = {};

  for (const [key, max] of Object.entries(OPENING_TEXT_LIMITS)) {
    if (!(key in body)) continue;
    const value =
      typeof body[key] === 'string' ? (body[key] as string).trim() : '';
    (data as Record<string, unknown>)[key] = value.slice(0, max) || null;
  }
  if ('title' in data && !data.title)
    return { data, error: 'Give the opening a title.' };

  if ('status' in body) {
    if (
      !Object.values(JOB_OPENING_STATUS).includes(
        body.status as JOB_OPENING_STATUS,
      )
    )
      return { data, error: 'Unknown opening status.' };
    data.status = body.status as JOB_OPENING_STATUS;
  }
  if ('fields' in body) data.fields = sanitizeFields(body.fields);
  if ('task' in body) data.task = sanitizeTask(body.task);
  if ('hiringLeadId' in body)
    data.hiringLeadId =
      typeof body.hiringLeadId === 'string' && body.hiringLeadId.trim()
        ? body.hiringLeadId.trim().slice(0, 64)
        : null;
  if ('replyToLead' in body) data.replyToLead = body.replyToLead !== false;

  return { data, error: null };
}

/** Null when `userId` is an active member of the company, else why not. */
export async function hiringLeadProblem(
  companyId: string,
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null;
  const member = await db.companyMember.count({
    where: { companyId, userId, status: MEMBER_STATUS.ACTIVE },
  });
  return member ? null : 'The hiring lead has to be a member of the company.';
}

/* ---------------------------------- tasks -------------------------------- */

/**
 * The application's private task link token, made the first time it is
 * needed. It is the only key to /task/<token>, so it is long and random.
 */
export async function ensureTaskToken(
  application: Pick<JobApplication, 'id' | 'taskToken'>,
): Promise<string> {
  if (application.taskToken) return application.taskToken;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(24).toString('base64url');
    const taken = await db.jobApplication.count({
      where: { taskToken: token },
    });
    if (taken) continue;
    await db.jobApplication.update({
      where: { id: application.id },
      data: { taskToken: token },
    });
    return token;
  }
  throw new Error('Could not make a task link.');
}

export const taskLinkFor = (origin: string, token: string) =>
  `${origin.replace(/\/$/, '')}/task/${token}`;

/** Publish and close timestamps that follow a status change. */
export function statusTimestamps(
  status: JOB_OPENING_STATUS | undefined,
  current?: Pick<JobOpening, 'publishedAt'> | null,
) {
  if (status === JOB_OPENING_STATUS.OPEN)
    return {
      publishedAt: current?.publishedAt ?? nowIso(),
      closedAt: null,
    };
  if (status === JOB_OPENING_STATUS.CLOSED) return { closedAt: nowIso() };
  return {};
}

/* ------------------------------ stage changes ---------------------------- */

export const isStage = (value: unknown): value is APPLICATION_STAGE =>
  Object.values(APPLICATION_STAGE).includes(value as APPLICATION_STAGE);

/** Moves one application to `stage` and records who moved it. */
export async function moveApplication(
  application: JobApplication,
  stage: APPLICATION_STAGE,
  byUserId: string | null,
): Promise<JobApplication> {
  if (application.stage === stage) return application;
  const at = nowIso();
  const event: ApplicationEvent = {
    type: 'STAGE_CHANGED',
    at,
    byUserId,
    from: application.stage,
    to: stage,
  };
  return db.jobApplication.update({
    where: { id: application.id },
    data: { stage, updatedAt: at, history: { push: event } },
  });
}
