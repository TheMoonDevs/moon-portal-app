import { db } from '@/lib/mongodb/db-client';
import { todayIst } from '@/lib/onboarding/meta';
import type { SessionUser } from '@/lib/permissions/server';
import {
  type Agreement,
  AGREEMENT_STATUS,
  SIGNER_STATUS,
} from '@/models/agreements';

import { daysUntil } from './renewals';
import { listRollouts } from './rollouts';
import { requireAgreements, seesConfidential } from './server';
import { requiredChecklist, searchVault } from './vault';

/*
 * The agreements dashboard of a company: what's out for signing and stuck,
 * what waits on the company, what was declined, how long signing takes,
 * who's missing a required document, what ends soon, and how the policy
 * rollouts are going. Confidential documents only count for HR and owners.
 */

const DAY = 86_400_000;

export async function agreementsDashboard(
  actor: SessionUser,
  companyId: string,
  origin: string,
) {
  await requireAgreements(actor, companyId, 'agreements:read');
  const today = todayIst();
  const [rows, checklist, rollouts, confidential] = await Promise.all([
    searchVault(actor, companyId, {}, origin),
    requiredChecklist(actor, companyId, origin),
    listRollouts(actor, companyId),
    seesConfidential(actor, companyId),
  ]);
  const open = rows.filter((r) => r.status === AGREEMENT_STATUS.SENT);
  const up = (r: (typeof rows)[number]) =>
    r.signers.filter(
      (s) =>
        s.status === SIGNER_STATUS.PENDING || s.status === SIGNER_STATUS.VIEWED,
    );
  // Only the company's signature is missing: the other side has signed.
  const waitingCompany = open.filter(
    (r) => up(r).length > 0 && up(r).every((s) => s.company),
  );
  // Stuck: a week or more since the people it waits on got it, or due soon.
  const stuck = open
    .map((r) => {
      const since = Math.min(
        ...up(r).map((s) => Date.parse(s.notifiedAt ?? r.sentAt)),
      );
      const days = Number.isFinite(since)
        ? Math.floor((Date.now() - since) / DAY)
        : 0;
      const dueIn = r.expiresOn ? daysUntil(r.expiresOn, today) : null;
      return { r, days, dueIn };
    })
    .filter((x) => x.days >= 7 || (x.dueIn !== null && x.dueIn <= 2))
    .sort((a, b) => (a.dueIn ?? 99) - (b.dueIn ?? 99) || b.days - a.days);
  const since90 = Date.now() - 90 * DAY;
  const recent = (iso: string | null) => !!iso && Date.parse(iso) >= since90;
  const completed = rows.filter(
    (r) =>
      r.status === AGREEMENT_STATUS.COMPLETED &&
      r.source !== 'imported' &&
      recent(r.completedAt),
  );
  const hours = completed
    .map((r) => (Date.parse(r.completedAt!) - Date.parse(r.sentAt)) / 3_600_000)
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b);
  const median = hours.length ? hours[Math.floor(hours.length / 2)] : null;
  const average = hours.length
    ? hours.reduce((a, b) => a + b, 0) / hours.length
    : null;
  const declined = rows.filter(
    (r) => r.status === AGREEMENT_STATUS.DECLINED && recent(r.sentAt),
  );

  // Signed per week, the last eight weeks, oldest first.
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = Date.parse(`${today}T23:59:59Z`) - (7 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    return {
      weekOf: new Date(start + DAY).toISOString().slice(0, 10),
      signed: rows.filter((r) => {
        if (r.status !== AGREEMENT_STATUS.COMPLETED || r.source === 'imported')
          return false;
        const t = Date.parse(r.completedAt ?? '');
        return t > start && t <= end;
      }).length,
      sent: rows.filter((r) => {
        if (r.source === 'imported') return false;
        const t = Date.parse(r.sentAt);
        return t > start && t <= end;
      }).length,
    };
  });

  const ending = rows
    .filter(
      (r) =>
        r.status === AGREEMENT_STATUS.COMPLETED &&
        r.endsOn &&
        daysUntil(r.endsOn, today) >= 0 &&
        daysUntil(r.endsOn, today) <= 60,
    )
    .map((r) => ({ ...r, daysLeft: daysUntil(r.endsOn!, today) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const renewedIds = new Set(
    rows.filter((r) => r.previousId).map((r) => r.previousId as string),
  );

  // What happened lately, across every agreement the viewer can see. Policy
  // acknowledgements have their own panel.
  const ids = rows
    .filter((r) => r.source === 'portal' && !r.rolloutId)
    .map((r) => r.id);
  const withHistory: Agreement[] = ids.length
    ? await db.agreement.findMany({
        where: { id: { in: ids.slice(0, 300) } },
        select: { id: true, title: true, history: true },
      })
    : [];
  const activity = withHistory
    .flatMap((a) =>
      (a.history ?? []).map((e) => ({
        agreementId: a.id,
        title: a.title,
        at: e.at,
        text: e.text,
      })),
    )
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 12);

  const slim = (r: (typeof rows)[number]) => ({
    id: r.id,
    source: r.source,
    title: r.title,
    typeLabel: r.typeLabel,
    people: r.signers.filter((s) => !s.company).map((s) => s.name),
    waitingOn: up(r).map((s) => s.name),
    sentAt: r.sentAt,
    expiresOn: r.expiresOn,
    link: r.link,
  });

  return {
    confidentialIncluded: confidential,
    counts: {
      out: open.length,
      waitingCompany: waitingCompany.length,
      stuck: stuck.length,
      declined90: declined.length,
      signed90: completed.length,
      endingSoon: ending.filter((e) => e.daysLeft <= 30).length,
      peopleMissing: checklist.people.filter((p) => p.missing > 0).length,
      missingItems: checklist.people.reduce((n, p) => n + p.missing, 0),
    },
    timeToSign: {
      medianHours: median,
      averageHours: average,
      sample: hours.length,
    },
    weeks,
    stuck: stuck.slice(0, 8).map((x) => ({
      ...slim(x.r),
      days: x.days,
      dueIn: x.dueIn,
    })),
    waitingCompany: waitingCompany.slice(0, 8).map(slim),
    declined: declined.slice(0, 5).map((r) => ({
      ...slim(r),
      reason:
        r.signers.find((s) => s.status === SIGNER_STATUS.DECLINED)
          ?.declineReason ?? null,
      by:
        r.signers.find((s) => s.status === SIGNER_STATUS.DECLINED)?.name ??
        null,
    })),
    ending: ending.slice(0, 8).map((r) => ({
      ...slim(r),
      endsOn: r.endsOn,
      daysLeft: r.daysLeft,
      renewed: renewedIds.has(r.id),
    })),
    requirements: checklist.requirements.map((q) => ({
      id: q.id,
      label: q.label,
      signed: q.signed,
      waiting: q.waiting,
      missing: q.missing,
    })),
    rollouts: rollouts
      .filter((r) => r.status === 'OPEN')
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        title: r.title,
        audienceText: r.audienceText,
        counts: r.counts,
      })),
    activity,
  };
}

export type AgreementsDashboard = Awaited<
  ReturnType<typeof agreementsDashboard>
>;
