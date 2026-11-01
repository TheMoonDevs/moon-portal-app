import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { APPLICATION_STAGE } from '@/models/hiring';
import type { Onboarding } from '@/models/onboarding';
import { ONBOARDING_STEP } from '@/models/onboarding';
import type { CompanyMember, Project } from '@/models/workspace';
import { MEMBER_STATUS, PROJECT_STATUS } from '@/models/workspace';

import { canDecideTrial, joinUrl } from './server';

/** One hire as the admin screens and Claude tools see them. */
export async function hireView(
  onboarding: Onboarding,
  actor: SessionUser,
  origin: string,
) {
  const [user, opening] = await Promise.all([
    onboarding.userId
      ? db.user.findFirst({
          where: { id: onboarding.userId },
          select: { id: true, avatar: true, username: true, status: true },
        })
      : null,
    onboarding.openingId
      ? (db.jobOpening.findFirst({
          where: { id: onboarding.openingId },
        }) as Promise<JobOpening | null>)
      : null,
  ]);
  return {
    id: onboarding.id,
    companyId: onboarding.companyId,
    name: onboarding.name,
    email: onboarding.email,
    step: onboarding.step,
    avatar: (user?.avatar as string | null) ?? null,
    userId: onboarding.userId ?? null,
    username: (user?.username as string | null) ?? null,
    applicationId: onboarding.applicationId ?? null,
    openingId: onboarding.openingId ?? null,
    openingTitle: opening?.title ?? null,
    hiringLeadId: opening?.hiringLeadId ?? null,
    joinUrl: joinUrl(origin, onboarding.token),
    details: onboarding.details ?? null,
    terms: onboarding.terms ?? null,
    autoSendAgreements: !!onboarding.autoSendAgreements,
    trialPay: onboarding.trialPay ?? null,
    trialStartsOn: onboarding.trialStartsOn ?? null,
    trialEndsOn: onboarding.trialEndsOn ?? null,
    offer: onboarding.offer ?? null,
    decision: onboarding.decision ?? null,
    documents: (onboarding.documents ?? []).map((d) => ({
      id: d.id,
      kind: d.kind,
      title: d.title,
      body: d.body,
      hash: d.hash,
      sentAt: d.sentAt,
      viewedAt: d.viewedAt ?? null,
      signature: d.signature ?? null,
    })),
    lastEmail: onboarding.lastEmail ?? null,
    history: [...(onboarding.history ?? [])].reverse(),
    canDecide: await canDecideTrial(actor, onboarding),
    createdAt: onboarding.createdAt ?? null,
    updatedAt: onboarding.updatedAt ?? null,
    accessAt: onboarding.accessAt ?? null,
    hiredAt: onboarding.hiredAt ?? null,
    endedAt: onboarding.endedAt ?? null,
  };
}

export type HireView = Awaited<ReturnType<typeof hireView>>;

/** What the Onboarding tab needs besides the hires themselves. */
export async function onboardingBoard(companyId: string) {
  const [company, members, projects, hired, openings] = await Promise.all([
    db.company.findFirst({ where: { id: companyId } }),
    db.companyMember.findMany({
      where: { companyId, status: MEMBER_STATUS.ACTIVE },
    }) as Promise<CompanyMember[]>,
    db.project.findMany({
      where: {
        companyId,
        status: { notIn: [PROJECT_STATUS.ARCHIVED, PROJECT_STATUS.COMPLETED] },
      },
      select: { id: true, name: true, isCore: true },
      orderBy: { name: 'asc' },
    }) as Promise<Array<Pick<Project, 'id' | 'name' | 'isCore'>>>,
    db.jobApplication.findMany({
      where: { companyId, stage: APPLICATION_STAGE.HIRED },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }) as Promise<JobApplication[]>,
    db.jobOpening.findMany({ where: { companyId } }) as Promise<JobOpening[]>,
  ]);
  const users = members.length
    ? await db.user.findMany({
        where: { id: { in: members.map((m) => m.userId) } },
        select: { id: true, name: true, email: true, avatar: true },
      })
    : [];
  const people = members
    .map((m) => {
      const u = users.find((x: { id: string }) => x.id === m.userId);
      return u
        ? {
            id: u.id as string,
            name: (u.name as string) || 'Someone',
            email: (u.email as string | null) ?? null,
            avatar: (u.avatar as string | null) ?? null,
            title: m.title ?? null,
            isOwner: (m.roleKeys ?? []).includes('owner'),
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name));
  const openingOf = (id: string) => openings.find((o) => o.id === id);
  return {
    companyName: (company?.name as string) ?? '',
    people,
    projects,
    // Hired applicants whose onboarding hasn't started.
    readyToOnboard: hired
      .filter((a) => !a.onboardingId)
      .map((a) => ({
        applicationId: a.id,
        name: a.name,
        email: a.email,
        openingId: a.openingId,
        openingTitle: openingOf(a.openingId)?.title ?? null,
        location: openingOf(a.openingId)?.location ?? null,
        employmentType: openingOf(a.openingId)?.employmentType ?? null,
        projectId: openingOf(a.openingId)?.projectId ?? null,
        hiringLeadId: openingOf(a.openingId)?.hiringLeadId ?? null,
      })),
  };
}

export const ACTIVE_STEPS = [
  ONBOARDING_STEP.DETAILS,
  ONBOARDING_STEP.AGREEMENTS,
  ONBOARDING_STEP.TRIAL,
  ONBOARDING_STEP.OFFER,
];
