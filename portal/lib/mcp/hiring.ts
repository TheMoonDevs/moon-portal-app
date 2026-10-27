import { randomUUID } from 'crypto';

import {
  STARTER_PREFIX,
  STARTER_TEMPLATES,
  starterById,
} from '@/lib/hiring/emailTemplates';
import {
  answerText,
  APPLICATION_STAGES,
  EMPLOYMENT_TYPES,
} from '@/lib/hiring/forms';
import { importApplications } from '@/lib/hiring/importApplications';
import { MAX_IMPORT_ROWS } from '@/lib/hiring/importRows';
import {
  deliverHiringEmails,
  HiringSendError,
  parseHiringSend,
  renderHiringEmails,
} from '@/lib/hiring/sendEmails';
import {
  countByStage,
  emptyStageCounts,
  isStage,
  moveApplication,
  parseOpeningInput,
  statusTimestamps,
  uniqueOpeningSlug,
} from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { nowIso } from '@/lib/workspace/server';
import type {
  ApplicationEvent,
  ApplicationFile,
  FormField,
  HiringEmail,
  HiringEmailTemplate,
  JobApplication,
  JobOpening,
} from '@/models/hiring';
import {
  APPLICATION_STAGE,
  FORM_FIELD_TYPE,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import type { Company } from '@/models/workspace';

import {
  companiesWith,
  type Tool,
  type ToolContext,
  ToolError,
} from './shared';

/*
 * Hiring tools for the Claude connector: job openings and their forms,
 * applicants, and emails to them. Each tool checks the person's hiring
 * permissions in the company it touches, like the hiring tab does.
 */

const MAX_LIST = 200;
/** A repeat of the same subject to the same person within this is skipped. */
const REPEAT_WINDOW_MS = 30 * 60 * 1000;

const STAGES = APPLICATION_STAGES as string[];
const FIELD_TYPES = Object.values(FORM_FIELD_TYPE);
const EDITABLE_STATUSES = [
  JOB_OPENING_STATUS.DRAFT,
  JOB_OPENING_STATUS.OPEN,
  JOB_OPENING_STATUS.CLOSED,
];

const canHire = async (user: SessionUser) =>
  (await companiesWith(user, 'hiring:read')).size > 0;

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}…` : value;

const links = (origin: string) => ({
  hiringTab: `${origin}/admin?tab=hiring`,
  apply: (slug: string) => `${origin}/apply/${slug}`,
});

/* -------------------------------- lookups -------------------------------- */

/** A company by id or name among those where the person holds `permission`. */
async function findCompany(
  user: SessionUser,
  ref: unknown,
  permission: string,
): Promise<Company> {
  const allowed = await companiesWith(user, permission);
  const companies = Array.from(allowed.values());
  if (!companies.length)
    throw new ToolError(
      `You don't have ${permission} in any company. Ask a company owner for a role with Hiring access.`,
    );
  const wanted = typeof ref === 'string' ? ref.trim().toLowerCase() : '';
  if (!wanted) {
    if (companies.length === 1) return companies[0];
    throw new ToolError(
      `Say which company: ${companies.map((c) => c.name).join(', ')}.`,
    );
  }
  const match = companies.find(
    (c) => c.id === ref || c.name.trim().toLowerCase() === wanted,
  );
  if (!match)
    throw new ToolError(
      `No company "${ref}" where you can do that. Yours: ${companies.map((c) => c.name).join(', ')}.`,
    );
  return match;
}

async function findOpening(
  user: SessionUser,
  ref: unknown,
  permission: string,
): Promise<{ opening: JobOpening; company: Company }> {
  if (typeof ref !== 'string' || !ref.trim())
    throw new ToolError('Give the opening id (from list_job_openings).');
  const opening: JobOpening | null = await db.jobOpening.findFirst({
    where: { id: ref.trim() },
  });
  const company = opening
    ? (await companiesWith(user, permission)).get(opening.companyId)
    : undefined;
  if (!opening || !company)
    throw new ToolError(
      `No opening "${ref}" that you can ${permission.endsWith('read') ? 'see' : 'change'}. Call list_job_openings to find it.`,
    );
  return { opening, company };
}

/** Applications by id, all in companies where the person holds `permission`. */
async function findApplications(
  user: SessionUser,
  refs: unknown,
  permission: string,
): Promise<JobApplication[]> {
  const ids = Array.isArray(refs)
    ? Array.from(
        new Set(refs.filter((r): r is string => typeof r === 'string')),
      )
    : typeof refs === 'string'
      ? [refs]
      : [];
  if (!ids.length)
    throw new ToolError('Give applicant ids (from list_applicants).');
  if (ids.length > 500)
    throw new ToolError('Work on at most 500 applicants at a time.');

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: { id: { in: ids } },
  });
  const allowed = await companiesWith(user, permission);
  const usable = applications.filter((a) => allowed.has(a.companyId));
  const missing = ids.filter((id) => !usable.some((a) => a.id === id));
  if (missing.length)
    throw new ToolError(
      `No applicant you can ${permission.endsWith('read') ? 'see' : 'change'} with id ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}.`,
    );
  // Keep the order they were asked for.
  return ids.map((id) => usable.find((a) => a.id === id) as JobApplication);
}

/* --------------------------------- views --------------------------------- */

const openingSummary = (
  opening: JobOpening,
  company: Company | undefined,
  counts: Record<string, number>,
  context: ToolContext,
) => ({
  id: opening.id,
  title: opening.title,
  company: company?.name ?? null,
  status: opening.status,
  department: opening.department ?? null,
  location: opening.location ?? null,
  employmentType: opening.employmentType ?? null,
  questions: opening.fields?.length ?? 0,
  applicants: Object.fromEntries(
    Object.entries(counts).filter(([, n]) => n > 0),
  ),
  applyUrl:
    opening.status === JOB_OPENING_STATUS.OPEN ||
    opening.status === JOB_OPENING_STATUS.CLOSED
      ? links(context.origin).apply(opening.slug)
      : null,
});

const fieldView = (f: FormField) => ({
  id: f.id,
  label: f.label,
  type: f.type,
  required: !!f.required,
  ...(f.options?.length ? { options: f.options } : {}),
  ...(f.helpText ? { helpText: f.helpText } : {}),
});

/** Answers by question label. Files become a link into the portal. */
function answersView(
  application: JobApplication,
  fields: FormField[],
  context: ToolContext,
  maxLength: number,
) {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const value = application.answers?.[field.id];
    if (value === undefined || value === null || value === '') continue;
    if (field.type === FORM_FIELD_TYPE.FILE && typeof value === 'object') {
      out[field.label] = {
        file: (value as ApplicationFile).name,
        // Opens for people signed in to the portal with hiring access.
        link: `${context.origin}/api/hiring/applications/${application.id}/files/${field.id}`,
      };
      continue;
    }
    out[field.label] = clip(answerText(value), maxLength);
  }
  return out;
}

const applicantSummary = (
  a: JobApplication,
  fields: FormField[],
  context: ToolContext,
) => ({
  id: a.id,
  name: a.name,
  email: a.email,
  stage: a.stage,
  appliedAt: a.submittedAt,
  lastEmail: a.lastEmail
    ? {
        subject: a.lastEmail.subject,
        status: a.lastEmail.status,
        at: a.lastEmail.at,
      }
    : null,
  answers: answersView(a, fields, context, 400),
});

/* ---------------------------------- input --------------------------------- */

const questionSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description:
        'Keep the existing id when editing a question, so answers stay linked. Leave out for new questions.',
    },
    label: {
      type: 'string',
      description: 'The question as candidates see it.',
    },
    type: {
      type: 'string',
      enum: FIELD_TYPES,
      description:
        'SHORT_TEXT, LONG_TEXT (paragraph), EMAIL, PHONE, URL, NUMBER, DATE, SELECT (one choice), MULTI_SELECT, CHECKBOX (yes/no) or FILE (PDF, Word or image up to 4 MB, e.g. a resume).',
    },
    required: { type: 'boolean' },
    options: {
      type: 'array',
      items: { type: 'string' },
      description: 'The choices, for SELECT and MULTI_SELECT only.',
    },
    helpText: { type: 'string', description: 'A hint under the question.' },
    placeholder: { type: 'string' },
  },
  required: ['label', 'type'],
};

const openingProperties = {
  title: { type: 'string' },
  department: { type: 'string' },
  location: { type: 'string', description: 'e.g. "Remote" or "Hyderabad".' },
  employmentType: {
    type: 'string',
    description: `Usually one of: ${EMPLOYMENT_TYPES.join(', ')}.`,
  },
  description: {
    type: 'string',
    description:
      'A short summary at the top of the apply page: who you are and what the role is, in a few lines. Plain text; blank lines separate paragraphs.',
  },
  details: {
    type: 'string',
    description:
      'The rest of the job post, shown below the summary: requirements, responsibilities, nice-to-haves, pay and perks. Plain text; lines starting with "- " or "* " become bullets, and a short line before them becomes a heading.',
  },
  notes: {
    type: 'string',
    description:
      'Private notes for the hiring team, e.g. budget, who interviews, what to look for. Candidates never see them.',
  },
  questions: {
    type: 'array',
    items: questionSchema,
    maxItems: 40,
    description:
      'The application form. Name and email are always asked, so leave them out.',
  },
};

/** A template by starter key, saved template id or name. */
async function findTemplate(companyId: string, ref: string) {
  const wanted = ref.trim().toLowerCase();
  const starter =
    starterById(ref) ??
    STARTER_TEMPLATES.find(
      (t) => t.key === wanted || t.name.toLowerCase() === wanted,
    );
  if (starter)
    return {
      id: `${STARTER_PREFIX}${starter.key}`,
      subject: starter.subject,
      body: starter.body,
      moveTo: starter.moveTo,
    };
  const saved: HiringEmailTemplate[] = await db.hiringEmailTemplate.findMany({
    where: { companyId },
  });
  const match = saved.find(
    (t) => t.id === ref || t.name.trim().toLowerCase() === wanted,
  );
  if (!match)
    throw new ToolError(
      `No template "${ref}". Call list_email_templates to see them.`,
    );
  return {
    id: match.id,
    subject: match.subject,
    body: match.body,
    moveTo: match.moveTo ?? null,
  };
}

/* ---------------------------------- tools --------------------------------- */

export const HIRING_TOOLS: Tool[] = [
  {
    name: 'list_job_openings',
    title: 'List job openings',
    description:
      'Job openings in the companies where the person can see hiring, with how many applicants are in each stage and the public apply link. Archived openings are left out.',
    inputSchema: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description: 'Company id or name (optional).',
        },
      },
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args, context) => {
      const allowed = await companiesWith(user, 'hiring:read');
      const company =
        typeof args?.company === 'string' && args.company.trim()
          ? await findCompany(user, args.company, 'hiring:read')
          : null;
      const companyIds = company ? [company.id] : Array.from(allowed.keys());
      const openings: JobOpening[] = companyIds.length
        ? await db.jobOpening.findMany({
            where: {
              companyId: { in: companyIds },
              status: { notIn: [JOB_OPENING_STATUS.ARCHIVED] },
            },
            orderBy: { createdAt: 'desc' },
          })
        : [];
      const counts = await countByStage(openings.map((o) => o.id));
      return {
        openings: openings.map((o) =>
          openingSummary(
            o,
            allowed.get(o.companyId),
            counts[o.id] ?? emptyStageCounts(),
            context,
          ),
        ),
        hiringTab: links(context.origin).hiringTab,
      };
    },
  },
  {
    name: 'get_job_opening',
    title: 'Get a job opening',
    description:
      'One opening with its summary, full details and private notes, every question on its application form (with ids), and applicant counts per stage.',
    inputSchema: {
      type: 'object',
      properties: { openingId: { type: 'string' } },
      required: ['openingId'],
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args, context) => {
      const { opening, company } = await findOpening(
        user,
        args?.openingId,
        'hiring:read',
      );
      const counts = await countByStage([opening.id]);
      return {
        ...openingSummary(
          opening,
          company,
          counts[opening.id] ?? emptyStageCounts(),
          context,
        ),
        description: opening.description ?? null,
        details: opening.details ?? null,
        notes: opening.notes ?? null,
        questions: (opening.fields ?? []).map(fieldView),
      };
    },
  },
  {
    name: 'create_job_opening',
    title: 'Create a job opening',
    description:
      'Creates a job opening with its application form. It starts as a draft, which only the hiring team sees. Show the person the title, summary, details and questions, and set publish to true only when they want it live; publishing makes the apply link work for anyone who has it.',
    inputSchema: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description:
            'Company id or name. Optional when they hire for one company.',
        },
        ...openingProperties,
        publish: {
          type: 'boolean',
          description: 'True to open it for applications now.',
        },
      },
      required: ['title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args, context) => {
      const company = await findCompany(user, args?.company, 'hiring:create');
      const { data, error } = parseOpeningInput({
        title: args?.title,
        department: args?.department,
        location: args?.location,
        employmentType: args?.employmentType,
        description: args?.description,
        details: args?.details,
        notes: args?.notes,
        fields: args?.questions ?? [],
        status: args?.publish
          ? JOB_OPENING_STATUS.OPEN
          : JOB_OPENING_STATUS.DRAFT,
      });
      if (error || !data.title)
        throw new ToolError(error ?? 'Give the opening a title.');

      const now = nowIso();
      const opening: JobOpening = await db.jobOpening.create({
        data: {
          companyId: company.id,
          title: data.title,
          slug: await uniqueOpeningSlug(data.title),
          department: data.department ?? null,
          location: data.location ?? null,
          employmentType: data.employmentType ?? null,
          description: data.description ?? null,
          details: data.details ?? null,
          notes: data.notes ?? null,
          status: data.status,
          fields: data.fields ?? [],
          createdById: user.id,
          publishedAt: null,
          closedAt: null,
          ...statusTimestamps(data.status),
          createdAt: now,
          updatedAt: now,
        },
      });
      const dropped =
        (Array.isArray(args?.questions) ? args.questions.length : 0) -
        (opening.fields?.length ?? 0);
      return {
        opening: {
          ...openingSummary(opening, company, emptyStageCounts(), context),
          questions: opening.fields.map(fieldView),
        },
        ...(dropped > 0 && {
          note: `${dropped} question(s) were left out: each needs a label and a known type, and choice questions need options.`,
        }),
        hiringTab: links(context.origin).hiringTab,
      };
    },
  },
  {
    name: 'update_job_opening',
    title: 'Update a job opening',
    description:
      'Changes an opening: its details, its form, or its status (DRAFT, OPEN to accept applications, CLOSED to stop them). `questions` replaces the whole form, so pass every question you want to keep, with its id. Call get_job_opening first.',
    inputSchema: {
      type: 'object',
      properties: {
        openingId: { type: 'string' },
        ...openingProperties,
        status: { type: 'string', enum: EDITABLE_STATUSES },
      },
      required: ['openingId'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args, context) => {
      const { opening, company } = await findOpening(
        user,
        args?.openingId,
        'hiring:edit',
      );
      if (args?.status && !EDITABLE_STATUSES.includes(args.status))
        throw new ToolError('Status can be DRAFT, OPEN or CLOSED.');
      const input: Record<string, unknown> = {};
      for (const key of [
        'title',
        'department',
        'location',
        'employmentType',
        'description',
        'details',
        'notes',
        'status',
      ])
        if (args?.[key] !== undefined) input[key] = args[key];
      if (args?.questions !== undefined) input.fields = args.questions;
      if (!Object.keys(input).length)
        throw new ToolError('Say what to change.');

      const { data, error } = parseOpeningInput(input);
      if (error) throw new ToolError(error);
      const statusChanged = !!data.status && data.status !== opening.status;
      const updated: JobOpening = await db.jobOpening.update({
        where: { id: opening.id },
        data: {
          ...data,
          ...(statusChanged && statusTimestamps(data.status, opening)),
          updatedAt: nowIso(),
        },
      });
      const counts = await countByStage([opening.id]);
      return {
        opening: {
          ...openingSummary(
            updated,
            company,
            counts[opening.id] ?? emptyStageCounts(),
            context,
          ),
          questions: (updated.fields ?? []).map(fieldView),
        },
      };
    },
  },
  {
    name: 'list_applicants',
    title: 'List applicants',
    description:
      'Applicants to one opening, newest first, with their stage, last email and answers (long answers are shortened; get_applicant has them in full). Filter by stage or by words in their name or email.',
    inputSchema: {
      type: 'object',
      properties: {
        openingId: { type: 'string' },
        stage: { type: 'string', enum: STAGES },
        search: { type: 'string', description: 'Words in name or email.' },
        limit: {
          type: 'number',
          description: `How many to return, up to ${MAX_LIST}. Default 50.`,
        },
      },
      required: ['openingId'],
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args, context) => {
      const { opening } = await findOpening(
        user,
        args?.openingId,
        'hiring:read',
      );
      if (args?.stage && !isStage(args.stage))
        throw new ToolError(`Stage is one of ${STAGES.join(', ')}.`);
      const applications: JobApplication[] = await db.jobApplication.findMany({
        where: {
          openingId: opening.id,
          ...(args?.stage ? { stage: args.stage } : {}),
        },
        orderBy: { submittedAt: 'desc' },
      });
      const words =
        typeof args?.search === 'string'
          ? args.search.toLowerCase().split(/\s+/).filter(Boolean)
          : [];
      const matching = applications.filter((a) =>
        words.every((w: string) =>
          `${a.name} ${a.email}`.toLowerCase().includes(w),
        ),
      );
      const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), MAX_LIST);
      return {
        opening: { id: opening.id, title: opening.title },
        total: matching.length,
        applicants: matching
          .slice(0, limit)
          .map((a) => applicantSummary(a, opening.fields ?? [], context)),
      };
    },
  },
  {
    name: 'get_applicant',
    title: 'Get an applicant',
    description:
      "One applicant's full answers, the team's private notes, their history (who moved them and when) and every email they were sent with its delivery status.",
    inputSchema: {
      type: 'object',
      properties: { applicationId: { type: 'string' } },
      required: ['applicationId'],
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args, context) => {
      const [application] = await findApplications(
        user,
        args?.applicationId,
        'hiring:read',
      );
      const [opening, emails]: [JobOpening | null, HiringEmail[]] =
        await Promise.all([
          db.jobOpening.findFirst({ where: { id: application.openingId } }),
          db.hiringEmail.findMany({
            where: { applicationId: application.id },
            orderBy: { sentAt: 'desc' },
          }),
        ]);
      const people: Array<{ id: string; name?: string }> =
        await db.user.findMany({
          where: {
            id: {
              in: Array.from(
                new Set(
                  [
                    ...(application.history ?? []).map((e) => e.byUserId),
                    ...emails.map((e) => e.sentById),
                  ].filter((id): id is string => !!id),
                ),
              ),
            },
          },
          select: { id: true, name: true },
        });
      const nameOf = (id?: string | null) =>
        people.find((p) => p.id === id)?.name ?? null;

      return {
        id: application.id,
        name: application.name,
        email: application.email,
        stage: application.stage,
        opening: opening ? { id: opening.id, title: opening.title } : null,
        appliedAt: application.submittedAt,
        answers: answersView(application, opening?.fields ?? [], context, 5000),
        notes: application.notes ?? null,
        history: (application.history ?? []).map((e) => ({
          type: e.type,
          at: e.at,
          by: nameOf(e.byUserId),
          ...(e.to ? { to: e.to } : {}),
          ...(e.text ? { text: e.text } : {}),
        })),
        emails: emails.map((e) => ({
          subject: e.subject,
          status: e.status,
          sentAt: e.sentAt,
          sentBy: nameOf(e.sentById),
          ...(e.error ? { error: e.error } : {}),
        })),
      };
    },
  },
  {
    name: 'move_applicants',
    title: 'Move applicants to a stage',
    description: `Moves applicants to a stage in the pipeline (${STAGES.join(' → ')}). This doesn't email them; use email_applicants for that, which can also move them.`,
    inputSchema: {
      type: 'object',
      properties: {
        applicationIds: { type: 'array', items: { type: 'string' } },
        stage: { type: 'string', enum: STAGES },
      },
      required: ['applicationIds', 'stage'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args) => {
      if (!isStage(args?.stage))
        throw new ToolError(`Stage is one of ${STAGES.join(', ')}.`);
      const applications = await findApplications(
        user,
        args?.applicationIds,
        'hiring:edit',
      );
      const moved = await Promise.all(
        applications.map((a) => moveApplication(a, args.stage, user.id)),
      );
      return {
        moved: moved.map((a) => ({ id: a.id, name: a.name, stage: a.stage })),
      };
    },
  },
  {
    name: 'add_applicant_note',
    title: 'Add a note to an applicant',
    description:
      "Adds a private note to an applicant, e.g. a summary of their answers or how a call went. Only the hiring team sees notes; they're added below any existing notes.",
    inputSchema: {
      type: 'object',
      properties: {
        applicationId: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['applicationId', 'note'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args) => {
      const [application] = await findApplications(
        user,
        args?.applicationId,
        'hiring:edit',
      );
      const note =
        typeof args?.note === 'string' ? args.note.trim().slice(0, 4000) : '';
      if (!note) throw new ToolError('Write the note first.');
      const at = nowIso();
      const notes = [application.notes?.trim(), note]
        .filter(Boolean)
        .join('\n\n')
        .slice(-10000);
      const event: ApplicationEvent = {
        type: 'NOTE',
        at,
        byUserId: user.id,
        text: `Added a note: ${clip(note, 120)}`,
      };
      await db.jobApplication.update({
        where: { id: application.id },
        data: { notes, updatedAt: at, history: { push: event } },
      });
      return { id: application.id, notes };
    },
  },
  {
    name: 'import_applicants',
    title: 'Import applicants from a sheet',
    description: `Adds people who applied earlier, e.g. the rows of a Google Form's response sheet, to an opening. Nobody is emailed. Before importing, show the person how the sheet's columns map to the opening's questions and how many rows there are. Send up to ${MAX_IMPORT_ROWS} rows per call. People already in the opening are skipped, and when someone appears twice the later row is kept.`,
    inputSchema: {
      type: 'object',
      properties: {
        openingId: { type: 'string' },
        rows: {
          type: 'array',
          maxItems: MAX_IMPORT_ROWS,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              appliedAt: {
                type: 'string',
                description:
                  'When they applied, ISO 8601 with the sheet’s time zone, e.g. 2025-03-15T14:45:00+05:30. Read the sheet’s date order (day or month first) from its values.',
              },
              stage: {
                type: 'string',
                description: `${STAGES.join(', ')}, or the sheet's own status words such as "Rejected" or "HR round".`,
              },
              notes: { type: 'string', description: 'Private notes.' },
              answers: {
                type: 'object',
                additionalProperties: true,
                description:
                  'Answers by question id or label. Columns that match no question are added to the notes.',
              },
            },
            required: ['email'],
          },
        },
        stage: {
          type: 'string',
          enum: STAGES,
          description: 'Stage for rows without their own. Default APPLIED.',
        },
        source: {
          type: 'string',
          description:
            'Where the rows came from, e.g. the sheet’s name. Shown in their history.',
        },
      },
      required: ['openingId', 'rows'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args, context) => {
      const { opening } = await findOpening(
        user,
        args?.openingId,
        'hiring:edit',
      );
      if (opening.status === JOB_OPENING_STATUS.ARCHIVED)
        throw new ToolError('This opening is archived.');
      if (!Array.isArray(args?.rows) || !args.rows.length)
        throw new ToolError('Give the rows to import.');
      if (args.rows.length > MAX_IMPORT_ROWS)
        throw new ToolError(
          `Send at most ${MAX_IMPORT_ROWS} rows per call, then the next ones.`,
        );
      if (args?.stage !== undefined && !isStage(args.stage))
        throw new ToolError(`Stage is one of ${STAGES.join(', ')}.`);

      const result = await importApplications(
        user.id,
        opening,
        args.rows.map((r: Record<string, unknown>) => ({
          ...r,
          submittedAt: r?.appliedAt ?? r?.submittedAt,
        })),
        {
          defaultStage: args?.stage ?? APPLICATION_STAGE.APPLIED,
          source:
            typeof args?.source === 'string'
              ? args.source.trim().slice(0, 120) || null
              : null,
        },
      );
      return {
        opening: { id: opening.id, title: opening.title },
        imported: result.imported,
        skipped: result.skipped,
        hiringTab: links(context.origin).hiringTab,
      };
    },
  },
  {
    name: 'list_email_templates',
    title: 'List email templates',
    description:
      "The email templates for a company's candidates: the starters (rejection, task, interview, offer) and the ones the company saved. Placeholders {{firstName}}, {{name}}, {{role}}, {{company}} and {{sender}} are filled in per person; parts in [square brackets] are notes to replace before sending.",
    inputSchema: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description: 'Company id or name (optional).',
        },
      },
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args) => {
      const company = await findCompany(user, args?.company, 'hiring:read');
      const saved: HiringEmailTemplate[] =
        await db.hiringEmailTemplate.findMany({
          where: { companyId: company.id },
          orderBy: { name: 'asc' },
        });
      return {
        company: company.name,
        templates: [
          ...STARTER_TEMPLATES.map((t) => ({
            id: t.key,
            name: t.name,
            subject: t.subject,
            body: t.body,
            moveTo: t.moveTo,
          })),
          ...saved.map((t) => ({
            id: t.id,
            name: t.name,
            subject: t.subject,
            body: t.body,
            moveTo: t.moveTo ?? null,
          })),
        ],
      };
    },
  },
  {
    name: 'email_applicants',
    title: 'Email applicants',
    description: `Emails applicants of one company, each their own copy with {{placeholders}} filled in, from careers@ the company's domain with replies going to the person. {{meetingLink}} puts in the person's own booking link (prefilled for each candidate) so candidates can pick an interview time. Give a template (from list_email_templates) or a subject and body; a template's stage suggestion is used unless you set moveTo. ALWAYS call with dryRun true first, show the person the subject, a preview and how many people it goes to, and send (dryRun false) only after they say yes: emails can't be unsent. Anyone sent the same subject in the last 30 minutes is skipped.`,
    inputSchema: {
      type: 'object',
      properties: {
        applicationIds: { type: 'array', items: { type: 'string' } },
        template: {
          type: 'string',
          description: 'Template id or name, e.g. "rejection".',
        },
        subject: {
          type: 'string',
          description: 'Overrides the template subject.',
        },
        body: {
          type: 'string',
          description: 'Plain text. Overrides the template body.',
        },
        moveTo: {
          type: 'string',
          enum: [...STAGES, 'NONE'],
          description:
            'Stage to move everyone the email reached to. NONE leaves them where they are.',
        },
        replyTo: {
          type: 'string',
          description: "Where replies go. Defaults to the person's email.",
        },
        dryRun: {
          type: 'boolean',
          description: 'True to preview without sending.',
        },
      },
      required: ['applicationIds', 'dryRun'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    visible: canHire,
    run: async (user, args, context) => {
      const applications = await findApplications(
        user,
        args?.applicationIds,
        'hiring:edit',
      );
      const template =
        typeof args?.template === 'string' && args.template.trim()
          ? await findTemplate(applications[0].companyId, args.template)
          : null;
      const moveTo =
        args?.moveTo === 'NONE'
          ? null
          : args?.moveTo !== undefined
            ? args.moveTo
            : (template?.moveTo ?? null);
      const { send, error } = parseHiringSend({
        ids: applications.map((a) => a.id),
        subject: args?.subject ?? template?.subject,
        body: args?.body ?? template?.body,
        templateId: template?.id ?? null,
        moveTo,
        replyTo: args?.replyTo,
        sendId: `mcp-${randomUUID()}`,
      });
      if (error) throw new ToolError(error);

      try {
        if (args?.dryRun !== false) {
          const emails = await renderHiringEmails(
            { ...user, origin: context.origin },
            applications,
            send,
          );
          return {
            dryRun: true,
            recipients: applications.length,
            moveTo: send.moveTo,
            from: emails[0].from,
            replyTo: emails[0].replyTo,
            previews: emails.slice(0, 3).map((e) => ({
              to: e.to,
              subject: e.subject,
              text: e.text,
            })),
            ...(/\[[^\]\n]{3,}\]/.test(send.body) && {
              warning:
                'The body still has [square bracket] notes to replace before sending.',
            }),
          };
        }
        const result = await deliverHiringEmails(
          { ...user, origin: context.origin },
          applications,
          send,
          {
            skipRecentMs: REPEAT_WINDOW_MS,
          },
        );
        return {
          sent: result.sent,
          failed: result.failures,
          skipped: result.skipped,
          movedTo: result.sent ? send.moveTo : null,
        };
      } catch (err) {
        if (err instanceof HiringSendError) throw new ToolError(err.message);
        throw err;
      }
    },
  },
];
