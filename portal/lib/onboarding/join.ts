import { ensureIntroCourse } from '@/lib/courses/server';
import { db } from '@/lib/mongodb/db-client';
import { type Onboarding, ONBOARDING_STEP } from '@/models/onboarding';
import type { Company } from '@/models/workspace';

import { AGREEMENT_DOCS, OFFER_DOCS } from './meta';
import { contactFor, currentRound, JOIN_TOKEN_PATTERN } from './server';

/** The onboarding behind a /join link. */
export async function onboardingByToken(
  token: string,
): Promise<Onboarding | null> {
  if (!JOIN_TOKEN_PATTERN.test(token)) return null;
  return db.onboarding.findFirst({ where: { token } });
}

/** What the hire may see on their /join page. */
export async function joinState(onboarding: Onboarding, origin: string) {
  const company: Company | null = await db.company.findFirst({
    where: { id: onboarding.companyId },
  });
  const contact = await contactFor(onboarding);
  const user = onboarding.userId
    ? await db.user.findFirst({
        where: { id: onboarding.userId },
        select: { avatar: true },
      })
    : null;
  const hasAccess =
    onboarding.step === ONBOARDING_STEP.TRIAL ||
    onboarding.step === ONBOARDING_STEP.OFFER ||
    onboarding.step === ONBOARDING_STEP.HIRED;
  const course = hasAccess
    ? await ensureIntroCourse(onboarding.companyId, onboarding.createdById)
    : null;
  const round = currentRound(onboarding);
  const name = onboarding.details?.preferredName || onboarding.name;
  return {
    token: onboarding.token,
    step: onboarding.step,
    firstName: name.trim().split(/\s+/)[0] || name,
    name: onboarding.name,
    email: onboarding.email,
    companyName: onboarding.terms?.companyName || company?.name || 'The team',
    companyLogo: (company?.logo as string | null) ?? null,
    role: onboarding.terms?.role ?? null,
    hireType: onboarding.terms?.hireType ?? null,
    contact: {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
    },
    legalName: onboarding.details?.legalName ?? null,
    signInEmail: onboarding.details?.signInEmail ?? null,
    avatar: (user?.avatar as string | null) ?? null,
    /** Documents waiting for a signature now, in order. */
    toSign: onboarding.documents
      .filter((d) => round.includes(d.kind))
      .map((d) => ({
        id: d.id,
        kind: d.kind,
        title: d.title,
        body: d.body,
        signature: d.signature
          ? { name: d.signature.name, at: d.signature.at }
          : null,
      })),
    /** Signed copies from earlier rounds. */
    signed: onboarding.documents
      .filter((d) => d.signature && !round.includes(d.kind))
      .map((d) => ({
        id: d.id,
        kind: d.kind,
        title: d.title,
        body: d.body,
        signature: { name: d.signature!.name, at: d.signature!.at },
      })),
    waitingOnTeam:
      onboarding.step === ONBOARDING_STEP.AGREEMENTS &&
      !onboarding.documents.some((d) => AGREEMENT_DOCS.includes(d.kind)),
    hasOffer: onboarding.documents.some((d) => OFFER_DOCS.includes(d.kind)),
    trialStartsOn: onboarding.trialStartsOn ?? null,
    trialEndsOn: onboarding.trialEndsOn ?? null,
    trialPay: onboarding.trialPay ?? null,
    loginUrl: hasAccess ? `${origin}/login` : null,
    courseUrl: course ? `${origin}/courses/${course.id}` : null,
  };
}

export type JoinState = Awaited<ReturnType<typeof joinState>>;
