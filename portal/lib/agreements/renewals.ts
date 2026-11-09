import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { todayIst } from '@/lib/onboarding/meta';
import { nowIso } from '@/lib/workspace/server';
import {
  type Agreement,
  AGREEMENT_STATUS,
  type ImportedDocument,
} from '@/models/agreements';
import { NotificationType } from '@/models/shared/enums';
import type { Company } from '@/models/workspace';

import { sendAgreementEmail } from './emails';
import { importRef } from './imports';
import { getSettings, personRef, signatoryFor } from './signers';

/*
 * Renewals: contracts and NDA terms that run out. A signed document can
 * carry the day it ends; 30 and 7 days before, the company's signatory and
 * whoever sent it hear about it by email and in the Portal, once each. A
 * renewal (or an amendment) is sent from the original and stays linked to it.
 */

const DAY = 86_400_000;

export const daysUntil = (day: string, today = todayIst()) =>
  Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY,
  );

/** Which alert is due today for something ending on `endsOn`, if any. */
export function endAlertDue(
  endsOn: string | null | undefined,
  sent: string[] | null | undefined,
  today: string,
): 'd30' | 'd7' | null {
  if (!endsOn) return null;
  const left = daysUntil(endsOn, today);
  const done = new Set(sent ?? []);
  if (left < 0) return null;
  if (left <= 7) return done.has('d7') ? null : 'd7';
  if (left <= 30) return done.has('d30') ? null : 'd30';
  return null;
}

type Item = {
  kind: 'agreement' | 'import';
  id: string;
  companyId: string;
  title: string;
  endsOn: string;
  alert: 'd30' | 'd7';
  ownerOf: string | null;
};

const teamLink = (origin: string, item: Item) =>
  item.kind === 'agreement'
    ? `${origin}/admin?tab=agreements&companyId=${item.companyId}&agreement=${item.id}`
    : `${origin}/admin?tab=agreements&companyId=${item.companyId}`;

async function alertFor(item: Item, origin: string) {
  const company: Company | null = await db.company.findFirst({
    where: { id: item.companyId },
  });
  const people = [
    await signatoryFor(item.companyId),
    await personRef(item.ownerOf),
  ].filter((p, i, all) => p && all.findIndex((q) => q?.id === p.id) === i);
  const left = daysUntil(item.endsOn);
  for (const p of people) {
    if (!p?.email) continue;
    await sendAgreementEmail(
      {
        kind: 'ending',
        to: p.email,
        firstName: p.name.split(/\s+/)[0] || p.name,
        companyName: company?.name || 'The team',
        title: item.title,
        signUrl: teamLink(origin, item),
        sender: { name: 'The Portal', email: null },
        endsOn: item.endsOn,
        daysLeft: left,
        forTeam: true,
        reference: item.kind === 'agreement' ? item.id : null,
        companyLogo: (company?.logo as string | null) ?? null,
      },
      `agreement-end-${item.id}-${item.alert}-${p.id}`,
    );
  }
  const ids = people.map((p) => p!.id);
  if (!ids.length) return;
  await ensureNotificationsReset();
  const at = new Date();
  await db.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      title: `Ends in ${left} days`,
      description: `${item.title} · ${company?.name ?? ''}`.trim(),
      matchId: item.id,
      matchType: 'Agreement',
      notificationType: NotificationType.SELF_GENERATED,
      notificationData: {
        kind: 'agreement',
        actions: [
          {
            title: item.kind === 'agreement' ? 'Open and renew' : 'Open',
            trigger_type: 'link',
            trigger: teamLink('', item),
          },
        ],
      },
      isRead: false,
      createdAt: at,
      updatedAt: at,
    })),
  });
}

/** Alerts for everything ending in the next 30 days. Run daily. */
export async function runEndAlerts(origin: string, dryRun = false) {
  const today = todayIst();
  const [agreements, imported]: [Agreement[], ImportedDocument[]] =
    await Promise.all([
      db.agreement.findMany({
        where: { status: AGREEMENT_STATUS.COMPLETED, endsOn: { gte: today } },
        take: 2000,
      }),
      db.importedDocument.findMany({
        where: { endsOn: { gte: today } },
        take: 2000,
      }),
    ]);
  // A renewal already sent from it means nobody needs telling.
  const renewed = new Set(
    (
      await db.agreement.findMany({
        where: {
          previousId: { in: agreements.map((a) => a.id) },
          status: { in: [AGREEMENT_STATUS.SENT, AGREEMENT_STATUS.COMPLETED] },
        },
        select: { previousId: true },
      })
    ).map((a: { previousId: string }) => a.previousId),
  );
  const items: Item[] = [];
  for (const a of agreements) {
    const alert = endAlertDue(a.endsOn, a.endAlerts, today);
    if (alert && !renewed.has(a.id))
      items.push({
        kind: 'agreement',
        id: a.id,
        companyId: a.companyId,
        title: a.title,
        endsOn: a.endsOn!,
        alert,
        ownerOf: a.createdById,
      });
  }
  for (const d of imported) {
    const alert = endAlertDue(d.endsOn, d.endAlerts, today);
    if (alert)
      items.push({
        kind: 'import',
        id: d.id,
        companyId: d.companyId,
        title: `${d.title} · ${d.personName}`,
        endsOn: d.endsOn!,
        alert,
        ownerOf: d.uploadedById,
      });
  }
  const on = new Map<string, boolean>();
  const due: Item[] = [];
  for (const item of items) {
    if (!on.has(item.companyId))
      on.set(item.companyId, (await getSettings(item.companyId)).endAlerts);
    if (on.get(item.companyId)) due.push(item);
  }
  if (!dryRun)
    for (const item of due) {
      await alertFor(item, origin).catch((e) =>
        console.error('[agreements] end alert', item.id, e),
      );
      // Past the 30-day mark straight into the last week: one alert, not two.
      const mark = item.alert === 'd7' ? ['d30', 'd7'] : ['d30'];
      if (item.kind === 'agreement') {
        const a = agreements.find((x) => x.id === item.id)!;
        await db.agreement.updateMany({
          where: { id: item.id },
          data: {
            endAlerts: Array.from(new Set([...(a.endAlerts ?? []), ...mark])),
            updatedAt: nowIso(),
          },
        });
      } else {
        const d = imported.find((x) => x.id === item.id)!;
        await db.importedDocument.update({
          where: { id: item.id },
          data: {
            endAlerts: Array.from(new Set([...(d.endAlerts ?? []), ...mark])),
            updatedAt: nowIso(),
          },
        });
      }
    }
  return {
    endAlerts: due.length,
    ...(dryRun
      ? {
          plannedEndAlerts: due.map((i) => ({
            ref: i.kind === 'agreement' ? i.id : importRef(i.id),
            title: i.title,
            endsOn: i.endsOn,
            alert: i.alert,
          })),
        }
      : {}),
  };
}
