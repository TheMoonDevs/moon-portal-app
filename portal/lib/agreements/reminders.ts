import { db } from '@/lib/mongodb/db-client';
import { todayIst } from '@/lib/onboarding/meta';
import { type Agreement, AGREEMENT_STATUS } from '@/models/agreements';
import { APP_BASE_URL } from '@/utils/constants/appInfo';

import { remindSignersAutomatically } from './server';
import { getSettings } from './signers';

/*
 * Automatic reminders, run once a day by the agreements cron. Each signer
 * whose turn it is gets a reminder 2 days and 5 days after their link went
 * out, and a "due tomorrow" the day before the deadline; never more than one
 * a day, and each only once. A company can turn them off. Expired agreements
 * are closed on the way.
 */

const DAY = 86_400_000;

const daysBetween = (fromIso: string, today: string) =>
  Math.floor(
    (Date.parse(`${today}T00:00:00Z`) -
      Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)) /
      DAY,
  );

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Which reminder a signer is due today, if any. */
export function reminderDue(
  signer: { notifiedAt?: string | null; autoReminders?: string[] | null },
  agreement: { expiresOn?: string | null },
  today: string,
): 'due' | 'd5' | 'd2' | null {
  const sent = new Set(signer.autoReminders ?? []);
  if (agreement.expiresOn && addDays(today, 1) === agreement.expiresOn)
    return sent.has('due') ? null : 'due';
  if (!signer.notifiedAt) return null;
  const days = daysBetween(signer.notifiedAt, today);
  if (days >= 5 && !sent.has('d5')) return 'd5';
  if (days >= 2 && days < 5 && !sent.has('d2')) return 'd2';
  return null;
}

export async function runAgreementReminders(
  opts: { dryRun?: boolean; origin?: string } = {},
) {
  const origin = (opts.origin || APP_BASE_URL).replace(/\/$/, '');
  const today = todayIst();
  const open: Agreement[] = await db.agreement.findMany({
    where: { status: AGREEMENT_STATUS.SENT },
    take: 2000,
  });
  const settingsOf = new Map<string, boolean>();
  const result = { checked: open.length, reminded: 0, expired: 0, skipped: 0 };
  const planned: Array<{ agreement: string; signer: string; kind: string }> =
    [];
  for (const a of open) {
    if (!settingsOf.has(a.companyId))
      settingsOf.set(
        a.companyId,
        (await getSettings(a.companyId)).autoReminders,
      );
    if (!settingsOf.get(a.companyId)) {
      result.skipped++;
      continue;
    }
    const res = await remindSignersAutomatically(a, today, origin, {
      dryRun: !!opts.dryRun,
      due: reminderDue,
    });
    result.reminded += res.reminded.length;
    if (res.expired) result.expired++;
    planned.push(
      ...res.reminded.map((r) => ({
        agreement: a.id,
        signer: r.name,
        kind: r.kind,
      })),
    );
  }
  return { ...result, today, ...(opts.dryRun ? { planned } : {}) };
}
