import { db } from '@/lib/mongodb/db-client';
import { formatDay } from '@/lib/onboarding/meta';
import type { Onboarding } from '@/models/onboarding';
import type { CompanyMember } from '@/models/workspace';

import { PERSON_KEYS, type PersonKey } from './templates';

/*
 * Templates that fill themselves: what the Portal already knows about the
 * person an agreement goes to (their job title, address, phone, joining day,
 * pay), from their account, their membership of the company and their
 * onboarding. `{{signer1Title}}`, `{{signer1Address}}` and the like are
 * filled from it; the sender can still change any of it before sending.
 * Pay is only filled for people who may see confidential documents.
 */

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

const dayText = (value: unknown) => {
  if (!value) return '';
  const iso =
    value instanceof Date ? value.toISOString() : String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? formatDay(iso.slice(0, 10)) : '';
};

/** What the Portal knows about one person, by their email, in one company. */
export async function personFacts(
  companyId: string,
  email: string,
  opts: { pay: boolean },
): Promise<Partial<Record<PersonKey, string>>> {
  const e = email.trim().toLowerCase();
  if (!e) return {};
  const user = await db.user.findFirst({
    where: { OR: [{ email: e }, { linkedEmails: e }] },
    select: { id: true, name: true, positionTitle: true },
  });
  const [member, hires]: [CompanyMember | null, Onboarding[]] =
    await Promise.all([
      user
        ? db.companyMember.findFirst({
            where: { companyId, userId: user.id },
          })
        : null,
      db.onboarding.findMany({
        where: {
          companyId,
          OR: [{ email: e }, ...(user ? [{ userId: user.id }] : [])],
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
    ]);
  const hire = hires[0] ?? null;
  const d = hire?.details;
  const pay = hire?.offer ?? hire?.terms ?? null;
  const out: Partial<Record<PersonKey, string>> = {
    LegalName: d?.legalName || (user?.name as string) || '',
    Title:
      hire?.offer?.role ||
      (member?.title as string) ||
      hire?.terms?.role ||
      (user?.positionTitle as string) ||
      '',
    Address: [d?.address, d?.city, d?.country].filter(Boolean).join(', '),
    Phone: d?.phone || '',
    DateOfBirth: dayText(d?.dateOfBirth),
    EmergencyContact: [d?.emergencyName, d?.emergencyPhone]
      .filter(Boolean)
      .join(', '),
    JoiningDate:
      dayText(hire?.offer?.joiningDate) ||
      dayText(member?.joinedAt) ||
      dayText(hire?.terms?.startDate),
    Pay:
      opts.pay && pay?.monthlyPay
        ? `${money(pay.monthlyPay, pay.currency)} a month`
        : '',
  };
  for (const k of PERSON_KEYS) if (!out[k]) delete out[k];
  return out;
}

/** `{{signerNTitle}}` and the like for each signer, from what the Portal knows. */
export async function signerFacts(
  companyId: string,
  signers: Array<{ email: string }>,
  opts: { pay: boolean },
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [i, s] of signers.entries()) {
    const facts = await personFacts(companyId, s.email, opts);
    for (const [k, v] of Object.entries(facts))
      if (v) out[`signer${i + 1}${k}`] = v;
  }
  return out;
}
