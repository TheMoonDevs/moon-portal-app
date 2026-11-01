/*
 * TODO(onboarding): not wired up yet. Nothing calls this module: the API
 * route (/api/hiring/applications/:id/onboard) and the Onboard card in the
 * applicant panel come back once onboarding is wrapped up.
 */

import { randomInt } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import {
  DEFAULT_MEMBER_ROLE_KEY,
  isAllowedInCompany,
} from '@/lib/permissions/company';
import { isAllowed } from '@/lib/permissions/defaults';
import type { SessionUser } from '@/lib/permissions/server';
import { syncTaskPoints } from '@/lib/progress/server';
import {
  ensureUserAccounts,
  signInCodeTaken,
  suggestUsername,
} from '@/lib/users/server';
import { getCompanyAccess, nowIso } from '@/lib/workspace/server';
import type {
  ApplicationEvent,
  ApplicationOnboarding,
  JobApplication,
  JobOpening,
} from '@/models/hiring';
import { APPLICATION_STAGE } from '@/models/hiring';
import type { Project, Task } from '@/models/workspace';
import { MEMBER_STATUS, TASK_SIZE, TASK_STATUS } from '@/models/workspace';
import {
  ADMIN_EMAIL,
  passcodeEmailTemplate,
  POST_EMAIL_API,
} from '@/utils/helpers/emailTemplates';

/*
 * Hired to onboarded: when someone moves to Hired, the hiring team makes them
 * a portal account (or finds theirs), adds them to the company and the
 * opening's project, makes the hiring lead their buddy and starts a
 * first-week checklist as tasks on that project.
 */

export const MAX_CHECKLIST = 12;

/** The first-week checklist the form starts with. */
export const DEFAULT_CHECKLIST = [
  'Sign in to the portal and set up your profile',
  'Read the project’s pages and handbook',
  'Meet your buddy for a welcome call',
  'Log your first day of work',
  'Pick and finish a first small task',
];

const DAY_MS = 86400000;

type FoundUser = { id: string; name?: string | null; email?: string | null };

/** A portal account that already uses this email, as main or linked. */
export async function findUserByEmail(
  email: string,
): Promise<FoundUser | null> {
  const lower = email.trim().toLowerCase();
  return (await db.user.findFirst({
    where: { OR: [{ email: lower }, { linkedEmails: { has: lower } }] },
    select: { id: true, name: true, email: true },
  })) as FoundUser | null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function freshSignInCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Array.from(
      { length: 6 },
      () => CODE_CHARS[randomInt(CODE_CHARS.length)],
    ).join('');
    if (!(await signInCodeTaken(code))) return code;
  }
  throw new OnboardError(500, 'Could not make a sign-in code. Try again.');
}

export class OnboardError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** What the onboarding form needs to know before it starts. */
export async function onboardingContext(
  actor: SessionUser,
  application: JobApplication,
) {
  const [opening, existing, projects, access] = await Promise.all([
    db.jobOpening.findFirst({
      where: { id: application.openingId },
    }) as Promise<JobOpening | null>,
    findUserByEmail(application.email),
    db.project.findMany({
      where: {
        companyId: application.companyId,
        status: { notIn: ['ARCHIVED', 'COMPLETED'] },
      },
      select: { id: true, name: true, isCore: true, parentId: true },
      orderBy: { name: 'asc' },
    }) as Promise<Array<Pick<Project, 'id' | 'name' | 'isCore' | 'parentId'>>>,
    getCompanyAccess(actor.id, application.companyId),
  ]);
  return {
    existingUser: existing,
    projects,
    projectId: opening?.projectId ?? projects.find((p) => p.isCore)?.id ?? null,
    buddyId: opening?.hiringLeadId ?? null,
    checklist: DEFAULT_CHECKLIST,
    canCreateAccount: isAllowed(actor, 'users:create'),
    canAddMember:
      !!access && isAllowedInCompany(actor, access, 'members:create'),
    onboarding: application.onboarding ?? null,
  };
}

/**
 * Onboards a hire: `{ projectId?, buddyId?, checklist? }`. Safe to repeat:
 * an account, membership or project place that exists is kept, and the
 * checklist is only made the first time.
 */
export async function onboardHire(
  actor: SessionUser,
  application: JobApplication,
  input: Record<string, unknown>,
): Promise<{
  application: JobApplication;
  onboarding: ApplicationOnboarding;
  createdAccount: boolean;
}> {
  if (application.stage !== APPLICATION_STAGE.HIRED)
    throw new OnboardError(400, 'Move them to Hired first.');
  const companyId = application.companyId;
  const access = await getCompanyAccess(actor.id, companyId);
  if (!access || !isAllowedInCompany(actor, access, 'members:create'))
    throw new OnboardError(
      403,
      'Adding people to the company needs the members:create permission.',
    );

  const opening: JobOpening | null = await db.jobOpening.findFirst({
    where: { id: application.openingId },
  });

  // Their project: one of the company's, or none.
  const projectId =
    typeof input.projectId === 'string' && input.projectId
      ? input.projectId
      : null;
  const project: Project | null = projectId
    ? await db.project.findFirst({ where: { id: projectId, companyId } })
    : null;
  if (projectId && !project)
    throw new OnboardError(404, 'That project isn’t in this company.');

  // Their buddy: an active member, the hiring lead by default.
  const buddyId =
    typeof input.buddyId === 'string' && input.buddyId ? input.buddyId : null;
  if (buddyId) {
    const isMember = await db.companyMember.count({
      where: { companyId, userId: buddyId, status: MEMBER_STATUS.ACTIVE },
    });
    if (!isMember)
      throw new OnboardError(400, 'Their buddy has to be in the company.');
  }

  const checklist = (Array.isArray(input.checklist) ? input.checklist : [])
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_CHECKLIST);

  // 1. Their account.
  let hire = await findUserByEmail(application.email);
  let createdAccount = false;
  if (!hire) {
    if (!isAllowed(actor, 'users:create'))
      throw new OnboardError(
        403,
        `${application.name} has no portal account yet, and making one needs the users:create permission. Ask a portal admin, or add their account first.`,
      );
    await ensureUserAccounts();
    const code = await freshSignInCode();
    const now = new Date();
    hire = (await db.user.create({
      data: {
        name: application.name,
        email: application.email,
        linkedEmails: [],
        username: await suggestUsername(application.name, application.email),
        code,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    })) as FoundUser;
    createdAccount = true;
    try {
      await fetch(POST_EMAIL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: application.email,
          sender: ADMIN_EMAIL,
          subject: 'Your Portal sign-in code',
          body: passcodeEmailTemplate(application.name, code),
          displayName: 'Portal',
        }),
      });
    } catch (e) {
      // The account exists; the code can be shared from the user editor.
      console.error('Failed to send sign-in code email', e);
    }
  }
  const hireId = hire!.id;
  const now = nowIso();

  // 2. The company.
  const member = await db.companyMember.findFirst({
    where: { companyId, userId: hireId },
  });
  if (!member)
    await db.companyMember.create({
      data: {
        companyId,
        userId: hireId,
        roleKeys: [DEFAULT_MEMBER_ROLE_KEY],
        title: opening?.title ?? null,
        status: MEMBER_STATUS.ACTIVE,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
  else if (member.status !== MEMBER_STATUS.ACTIVE)
    await db.companyMember.update({
      where: { id: member.id },
      data: { status: MEMBER_STATUS.ACTIVE, updatedAt: now },
    });

  // 3. The project, remembered on the opening for the next hire.
  if (project && !(project.memberIds ?? []).includes(hireId))
    await db.project.update({
      where: { id: project.id },
      data: {
        memberIds: [...(project.memberIds ?? []), hireId],
        updatedAt: now,
      },
    });
  if (opening && project && opening.projectId !== project.id)
    await db.jobOpening.update({
      where: { id: opening.id },
      data: { projectId: project.id },
    });

  // 4. The first-week checklist, once.
  const previous = application.onboarding;
  let taskIds = previous?.taskIds ?? [];
  if (!taskIds.length && project && checklist.length) {
    const buddy = buddyId
      ? ((await db.user.findFirst({
          where: { id: buddyId },
          select: { name: true },
        })) as { name?: string | null } | null)
      : null;
    const dueDate = new Date(Date.now() + 7 * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const firstName = application.name.split(/\s+/)[0];
    const items = [
      ...checklist.map((title) => ({
        title,
        assigneeIds: [hireId],
        description: buddy?.name
          ? `First week at ${opening?.title ?? 'the company'}. Your buddy is ${buddy.name}; ask them anything.`
          : `First week at ${opening?.title ?? 'the company'}.`,
      })),
      ...(buddyId && buddyId !== hireId
        ? [
            {
              title: `Welcome ${firstName} and show them around`,
              assigneeIds: [buddyId],
              description: `You're ${application.name}'s buddy for their first week. They joined as ${opening?.title ?? 'a new hire'}.`,
            },
          ]
        : []),
    ];
    const created: Task[] = [];
    for (const item of items) {
      const task: Task = await db.task.create({
        data: {
          companyId,
          projectId: project.id,
          title: item.title,
          description: item.description,
          size: TASK_SIZE.MINOR,
          status: TASK_STATUS.TODO,
          assigneeIds: item.assigneeIds,
          dueDate,
          forDate: null,
          completedAt: null,
          completedByIds: [],
          goalChecked: true,
          createdById: actor.id,
          madeBy: 'person',
          createdAt: now,
          updatedAt: now,
        },
      });
      await syncTaskPoints(task).catch(() => null);
      created.push(task);
    }
    taskIds = created.map((t) => t.id);
  }

  const onboarding: ApplicationOnboarding = {
    userId: hireId,
    createdAccount: previous?.createdAccount || createdAccount,
    projectId: project?.id ?? previous?.projectId ?? null,
    buddyId: buddyId ?? previous?.buddyId ?? null,
    taskIds,
    byUserId: actor.id,
    at: now,
  };
  const event: ApplicationEvent = {
    type: 'ONBOARDED',
    at: now,
    byUserId: actor.id,
    text: [
      createdAccount
        ? 'made their portal account'
        : 'linked their portal account',
      'added them to the company',
      project && `added them to ${project.name}`,
      taskIds.length &&
        !previous?.taskIds?.length &&
        `started a ${taskIds.length}-task first week`,
    ]
      .filter(Boolean)
      .join(', '),
  };
  const updated: JobApplication = await db.jobApplication.update({
    where: { id: application.id },
    data: { onboarding, updatedAt: now, history: { push: event } },
  });
  return { application: updated, onboarding, createdAccount };
}
