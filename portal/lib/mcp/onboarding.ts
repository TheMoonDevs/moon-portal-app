import {
  courseView,
  ensureIntroCourse,
  parseCourseInput,
} from '@/lib/courses/server';
import { db } from '@/lib/mongodb/db-client';
import {
  DEFAULT_DOCUMENTS,
  DOC_PLACEHOLDERS,
  MAX_DOC_BODY,
  MAX_DOC_TITLE,
  unknownDocPlaceholders,
} from '@/lib/onboarding/documents';
import {
  AGREEMENT_DOCS,
  DOC_LABEL,
  formatDay,
  formatMoney,
  HIRE_TYPE_LABEL,
  hireNext,
  OFFER_DOCS,
  STEP_LABEL,
  trialPayFor,
} from '@/lib/onboarding/meta';
import {
  decideTrial,
  endOnboarding,
  OnboardingError,
  parseOffer,
  parseTerms,
  renderDocuments,
  resendStepEmail,
  sendAgreements,
  startOnboarding,
} from '@/lib/onboarding/server';
import { hireView, onboardingBoard } from '@/lib/onboarding/view';
import type { SessionUser } from '@/lib/permissions/server';
import { nowIso } from '@/lib/workspace/server';
import {
  type Course,
  type Onboarding,
  ONBOARDING_DOC_KIND,
  ONBOARDING_STEP,
  type OnboardingTemplate,
} from '@/models/onboarding';

import { findCompany } from './hiring';
import { companiesWith, type Tool, ToolError } from './shared';

/*
 * Onboarding through Claude: the same steps as the Onboarding tab. Most
 * hiring managers run hiring from the Claude app, so every step the tab
 * offers has a tool here, with the same rules.
 */

const canHire = async (user: SessionUser) =>
  (await companiesWith(user, 'hiring:read')).size > 0;
const canWriteCourses = async (user: SessionUser) =>
  (await companiesWith(user, 'courses:edit')).size > 0;

const hireLink = (origin: string, o: { id: string; companyId: string }) =>
  `${origin}/admin?tab=onboarding&companyId=${o.companyId}&hire=${o.id}`;

/** Wraps onboarding errors as answers Claude can act on. */
async function attempt<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof OnboardingError) throw new ToolError(e.message);
    throw e;
  }
}

/** A hire by id, name or email, in the companies where `permission` holds. */
async function findHire(
  user: SessionUser,
  ref: unknown,
  permission: string,
): Promise<Onboarding> {
  const wanted = typeof ref === 'string' ? ref.trim() : '';
  if (!wanted)
    throw new ToolError(
      'Say which hire: their id (from list_new_hires), name or email.',
    );
  const companies = Array.from((await companiesWith(user, permission)).keys());
  if (!companies.length)
    throw new ToolError(`You don't have ${permission} in any company.`);
  const rows: Onboarding[] = await db.onboarding.findMany({
    where: { companyId: { in: companies } },
    orderBy: { updatedAt: 'desc' },
  });
  const lower = wanted.toLowerCase();
  const byId = rows.find((o) => o.id === wanted);
  if (byId) return byId;
  const matches = rows.filter(
    (o) =>
      o.email === lower ||
      o.name.toLowerCase() === lower ||
      o.name.toLowerCase().includes(lower),
  );
  const live = matches.filter(
    (o) => o.step !== ONBOARDING_STEP.ENDED && o.step !== ONBOARDING_STEP.HIRED,
  );
  const pick = live.length ? live : matches;
  if (pick.length === 1) return pick[0];
  if (!pick.length) throw new ToolError(`No hire matches "${wanted}".`);
  throw new ToolError(
    `Several hires match "${wanted}": ${pick
      .map((o) => `${o.name} (${o.email}, ${o.id})`)
      .join('; ')}. Use the id.`,
  );
}

/** One plain line on what a hire is waiting for, and who moves next. */
const nextMove = (o: Onboarding) => hireNext(o).text;

const summary = (o: Onboarding, origin: string) => ({
  id: o.id,
  name: o.name,
  email: o.email,
  step: STEP_LABEL[o.step],
  role: o.terms?.role ?? null,
  hireType: o.terms ? HIRE_TYPE_LABEL[o.terms.hireType] : null,
  next: nextMove(o),
  trial: o.trialStartsOn
    ? `${formatDay(o.trialStartsOn)} to ${formatDay(o.trialEndsOn)}`
    : null,
  url: hireLink(origin, o),
});

const TERMS_SCHEMA = {
  type: 'object',
  description:
    'What the agreements are written from. Ask the person for anything you do not know; never guess pay.',
  properties: {
    companyName: {
      type: 'string',
      description: 'The company name as it reads in the agreements.',
    },
    role: { type: 'string' },
    hireType: {
      type: 'string',
      enum: ['INTERN', 'FULL_TIME'],
      description: 'Interns get a 14-day trial, full-time hires 7.',
    },
    monthlyPay: {
      type: 'number',
      description:
        'Their usual monthly pay; the trial payment is worked out from it.',
    },
    currency: {
      type: 'string',
      description: 'INR (default), USD, EUR, GBP, AED or SGD.',
    },
    startDate: {
      type: 'string',
      description: 'First trial day, YYYY-MM-DD. Access day if later.',
    },
    projectId: { type: 'string', description: 'The project they join first.' },
    location: { type: 'string', description: 'Where they work, e.g. Remote.' },
    leadId: {
      type: 'string',
      description:
        'Their hiring manager (user id). Named in the agreements as their contact; a company owner when empty.',
    },
    buddyId: {
      type: 'string',
      description: 'Optional buddy (user id). Can decide the trial too.',
    },
  },
};

export const ONBOARDING_TOOLS: Tool[] = [
  {
    name: 'list_new_hires',
    title: 'List new hires in onboarding',
    description:
      "New hires going through onboarding (details form, Trial Policy and NDA, trial, offer), what each is waiting on, and hired applicants whose onboarding hasn't started. Also the company's people and projects, for the terms. Start here.",
    inputSchema: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description: 'Company id or name (optional with one company).',
        },
        includeFinished: {
          type: 'boolean',
          description: 'Also hires who are fully hired or ended.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args, context) => {
      const company = await findCompany(user, args?.company, 'hiring:read');
      const rows: Onboarding[] = await db.onboarding.findMany({
        where: { companyId: company.id },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
      const board = await onboardingBoard(company.id);
      const live = rows.filter(
        (o) =>
          args?.includeFinished ||
          (o.step !== ONBOARDING_STEP.ENDED &&
            o.step !== ONBOARDING_STEP.HIRED),
      );
      return {
        company: { id: company.id, name: company.name },
        hires: live.map((o) => summary(o, context.origin)),
        readyToOnboard: board.readyToOnboard,
        people: board.people.map((p) => ({
          id: p!.id,
          name: p!.name,
          title: p!.title,
          isOwner: p!.isOwner,
        })),
        projects: board.projects,
        tab: `${context.origin}/admin?tab=onboarding`,
      };
    },
  },
  {
    name: 'get_new_hire',
    title: 'Get one new hire',
    description:
      'One hire in full: their details, the terms, trial dates and pay, each document with its signature, the decision and the history. Set includeDocuments to read the documents’ text.',
    inputSchema: {
      type: 'object',
      properties: {
        hire: { type: 'string', description: 'Id, name or email.' },
        includeDocuments: { type: 'boolean' },
      },
      required: ['hire'],
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args, context) => {
      const o = await findHire(user, args?.hire, 'hiring:read');
      const view = await hireView(o, user, context.origin);
      return {
        ...view,
        next: nextMove(o),
        url: hireLink(context.origin, o),
        documents: view.documents.map((d) => ({
          ...d,
          body: args?.includeDocuments ? d.body : undefined,
        })),
        trialPay: view.trialPay
          ? {
              ...view.trialPay,
              fullText: formatMoney(view.trialPay.full, view.trialPay.currency),
              halfText: formatMoney(view.trialPay.half, view.trialPay.currency),
            }
          : null,
      };
    },
  },
  {
    name: 'start_onboarding',
    title: 'Start onboarding a new hire',
    description:
      "Emails a new hire their details form (personal details and a profile photo), which makes their portal account. Use an applicant id from list_new_hires' readyToOnboard (moves them to Hired), or a name and email. Pass terms to have the Trial Policy and NDA go out by themselves as soon as the form is back. Confirm with the person before calling: it sends an email.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        applicationId: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        terms: TERMS_SCHEMA,
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args, context) =>
      attempt(async () => {
        const company = await findCompany(user, args?.company, 'hiring:edit');
        const { onboarding, emailError } = await startOnboarding(
          user,
          {
            companyId: company.id,
            applicationId: args?.applicationId ?? null,
            name: args?.name ?? null,
            email: args?.email ?? null,
            terms: args?.terms ?? null,
          },
          context.origin,
        );
        return { ...summary(onboarding, context.origin), emailError };
      }),
  },
  {
    name: 'send_agreements',
    title: 'Send the Trial Policy and NDA',
    description:
      'Fills in the agreement terms and sends the Trial Policy and NDA to sign. Before the details form is back, the terms are saved and go out by themselves. Use preview: true first and show the person the trial pay and the contact named; send only after they say yes.',
    inputSchema: {
      type: 'object',
      properties: {
        hire: { type: 'string', description: 'Id, name or email.' },
        terms: TERMS_SCHEMA,
        preview: {
          type: 'boolean',
          description: 'Return the documents without saving or sending.',
        },
      },
      required: ['hire', 'terms'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args, context) =>
      attempt(async () => {
        const o = await findHire(user, args?.hire, 'hiring:edit');
        if (args?.preview) {
          const terms = await parseTerms(o.companyId, args?.terms ?? {});
          const pay = trialPayFor(
            terms.monthlyPay,
            terms.hireType,
            terms.currency,
          );
          const docs = await renderDocuments(o, AGREEMENT_DOCS, terms);
          return {
            preview: true,
            trialPay: `${formatMoney(pay.full, pay.currency)} for ${pay.days} days if confirmed; ${formatMoney(pay.half, pay.currency)} if the trial ends`,
            documents: docs.map((d) => ({ title: d.title, body: d.body })),
          };
        }
        const { onboarding, emailError } = await sendAgreements(
          user,
          o,
          args?.terms ?? {},
          context.origin,
        );
        return { ...summary(onboarding, context.origin), emailError };
      }),
  },
  {
    name: 'decide_trial',
    title: 'Confirm or end a trial',
    description:
      "Ends a new hire's trial. ACCEPTED sends the offer letter and Work Agreement to sign (a trial can be confirmed early); once signed, Claude opens for them. REJECTED closes all their portal access and records half the trial pay as owed. Only their hiring manager, buddy or a company owner can decide. Use preview: true for the offer first, and get the person's explicit OK before deciding: it can't be undone.",
    inputSchema: {
      type: 'object',
      properties: {
        hire: { type: 'string' },
        outcome: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] },
        offer: {
          type: 'object',
          description: 'For ACCEPTED. Defaults come from the trial terms.',
          properties: {
            role: { type: 'string' },
            hireType: { type: 'string', enum: ['INTERN', 'FULL_TIME'] },
            monthlyPay: { type: 'number' },
            currency: { type: 'string' },
            joiningDate: { type: 'string', description: 'YYYY-MM-DD' },
            noticeDays: { type: 'number', description: 'Default 15.' },
            note: {
              type: 'string',
              description: 'An extra paragraph for the offer letter.',
            },
          },
        },
        note: {
          type: 'string',
          description: 'Why, for the record (not emailed).',
        },
        notify: { type: 'boolean', description: 'Email them (default true).' },
        preview: {
          type: 'boolean',
          description:
            'ACCEPTED only: return the offer documents without sending.',
        },
      },
      required: ['hire', 'outcome'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    visible: canHire,
    run: async (user, args, context) =>
      attempt(async () => {
        const o = await findHire(user, args?.hire, 'hiring:edit');
        if (args?.preview) {
          if (args?.outcome !== 'ACCEPTED' || !o.terms)
            throw new ToolError(
              'Preview works for ACCEPTED, once the trial terms exist.',
            );
          const offer = parseOffer(args?.offer ?? {}, o.terms);
          const docs = await renderDocuments(o, OFFER_DOCS, o.terms, offer);
          return {
            preview: true,
            offer,
            documents: docs.map((d) => ({ title: d.title, body: d.body })),
          };
        }
        const { onboarding, emailError } = await decideTrial(
          user,
          o,
          {
            outcome: args?.outcome,
            offer: args?.offer ?? null,
            note: args?.note ?? null,
            notify: args?.notify !== false,
          },
          context.origin,
        );
        return {
          ...summary(onboarding, context.origin),
          decision: onboarding.decision,
          emailError,
        };
      }),
  },
  {
    name: 'resend_onboarding_email',
    title: 'Send a hire their onboarding email again',
    description:
      'Emails the step they are on again: the details form, the agreements, their sign-in (on trial) or the offer.',
    inputSchema: {
      type: 'object',
      properties: { hire: { type: 'string' } },
      required: ['hire'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args, context) =>
      attempt(async () => {
        const o = await findHire(user, args?.hire, 'hiring:edit');
        const { onboarding, emailError } = await resendStepEmail(
          user,
          o,
          context.origin,
        );
        return { ...summary(onboarding, context.origin), emailError };
      }),
  },
  {
    name: 'stop_onboarding',
    title: 'Stop onboarding a hire',
    description:
      'Stops onboarding when someone withdraws or declines the offer, and closes any access they have. On trial this ends the trial (half pay owed). Confirm with the person first.',
    inputSchema: {
      type: 'object',
      properties: {
        hire: { type: 'string' },
        note: { type: 'string' },
        notify: {
          type: 'boolean',
          description: 'On trial: email them (default true).',
        },
      },
      required: ['hire'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    visible: canHire,
    run: async (user, args, context) =>
      attempt(async () => {
        const o = await findHire(user, args?.hire, 'hiring:edit');
        const { onboarding } = await endOnboarding(
          user,
          o,
          { note: args?.note ?? null, notify: args?.notify !== false },
          context.origin,
        );
        return summary(onboarding, context.origin);
      }),
  },
  {
    name: 'list_onboarding_documents',
    title: 'List onboarding document templates',
    description:
      "The company's Trial Policy, NDA, Offer Letter and Work Agreement as templates (Markdown with {{placeholders}}), and the placeholders they can use. Read before editing one.",
    inputSchema: {
      type: 'object',
      properties: { company: { type: 'string' } },
    },
    annotations: { readOnlyHint: true },
    visible: canHire,
    run: async (user, args) => {
      const company = await findCompany(user, args?.company, 'hiring:read');
      const own: OnboardingTemplate[] = await db.onboardingTemplate.findMany({
        where: { companyId: company.id },
      });
      return {
        placeholders: DOC_PLACEHOLDERS,
        documents: Object.values(ONBOARDING_DOC_KIND).map((kind) => {
          const t = own.find((x) => x.kind === kind);
          return {
            kind,
            label: DOC_LABEL[kind],
            custom: !!t,
            title: t?.title ?? DEFAULT_DOCUMENTS[kind].title,
            body: t?.body ?? DEFAULT_DOCUMENTS[kind].body,
          };
        }),
      };
    },
  },
  {
    name: 'save_onboarding_document',
    title: 'Save an onboarding document template',
    description:
      "Saves the company's wording for one document. Documents already sent keep the text they were sent with. Show the person the change first.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        kind: { type: 'string', enum: Object.values(ONBOARDING_DOC_KIND) },
        title: { type: 'string' },
        body: {
          type: 'string',
          description: 'Markdown with {{placeholders}}.',
        },
      },
      required: ['kind', 'title', 'body'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canHire,
    run: async (user, args) => {
      const company = await findCompany(user, args?.company, 'hiring:edit');
      const kind = args?.kind as ONBOARDING_DOC_KIND;
      if (!Object.values(ONBOARDING_DOC_KIND).includes(kind))
        throw new ToolError('Unknown kind.');
      const title = String(args?.title ?? '')
        .trim()
        .slice(0, MAX_DOC_TITLE);
      const body = String(args?.body ?? '').slice(0, MAX_DOC_BODY);
      if (!title || !body.trim())
        throw new ToolError('Add a title and the text.');
      const unknown = unknownDocPlaceholders(body);
      if (unknown.length)
        throw new ToolError(
          `Unknown placeholders: ${unknown.join(', ')}. Use list_onboarding_documents for the list.`,
        );
      const now = nowIso();
      const found: OnboardingTemplate | null =
        await db.onboardingTemplate.findFirst({
          where: { companyId: company.id, kind },
        });
      if (found)
        await db.onboardingTemplate.update({
          where: { id: found.id },
          data: { title, body, updatedById: user.id, updatedAt: now },
        });
      else
        await db.onboardingTemplate.create({
          data: {
            companyId: company.id,
            kind,
            title,
            body,
            updatedById: user.id,
            createdAt: now,
            updatedAt: now,
          },
        });
      return { saved: DOC_LABEL[kind] };
    },
  },
  {
    name: 'list_courses',
    title: 'List courses',
    description:
      "A company's courses, with their lessons. The intro course (Portal usage and guidance) is the one new hires get with their sign-in.",
    inputSchema: {
      type: 'object',
      properties: { company: { type: 'string' } },
    },
    annotations: { readOnlyHint: true },
    visible: canWriteCourses,
    run: async (user, args, context) => {
      const company = await findCompany(user, args?.company, 'courses:read');
      await ensureIntroCourse(company.id, user.id);
      const courses: Course[] = await db.course.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: 'asc' },
      });
      return {
        courses: await Promise.all(
          courses.map(async (c) => ({
            ...(await courseView(c, null)),
            url: `${context.origin}/courses/${c.id}`,
          })),
        ),
      };
    },
  },
  {
    name: 'save_course',
    title: 'Write or update a course',
    description:
      'Creates a course, or with course (an id) replaces its title, description and lessons. Lessons are { id?, title, body } in order, body in Markdown; keep ids of lessons you keep so progress stays. Show the person the outline before saving.',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        course: {
          type: 'string',
          description: 'Course id to update; leave out to create.',
        },
        title: { type: 'string' },
        description: { type: 'string' },
        lessons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['title', 'body'],
          },
        },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canWriteCourses,
    run: async (user, args, context) => {
      const company = await findCompany(user, args?.company, 'courses:edit');
      const input: Record<string, unknown> = {};
      for (const key of ['title', 'description', 'lessons'])
        if (args?.[key] !== undefined) input[key] = args[key];
      const { data, error } = parseCourseInput(input);
      if (error) throw new ToolError(error);
      const now = nowIso();
      let course: Course;
      if (args?.course) {
        const found: Course | null = await db.course.findFirst({
          where: { id: args.course, companyId: company.id },
        });
        if (!found) throw new ToolError('No such course in this company.');
        course = await db.course.update({
          where: { id: found.id },
          data: { ...data, updatedById: user.id, updatedAt: now },
        });
      } else {
        if (!data.title) throw new ToolError('Give the course a title.');
        course = await db.course.create({
          data: {
            companyId: company.id,
            title: data.title,
            description: data.description ?? null,
            isIntro: false,
            lessons: data.lessons ?? [],
            createdById: user.id,
            updatedById: user.id,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
      return {
        id: course.id,
        title: course.title,
        lessons: (course.lessons ?? []).length,
        url: `${context.origin}/courses/${course.id}`,
      };
    },
  },
];
