import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { DOC_LABEL } from '@/lib/onboarding/meta';
import { nowIso } from '@/lib/workspace/server';
import type {
  DocumentCountersign,
  Onboarding,
  OnboardingDocument,
} from '@/models/onboarding';
import { NotificationType } from '@/models/shared/enums';
import type { Company } from '@/models/workspace';

import { onboardingTypeKey } from './docTypes';
import { sendAgreementEmail } from './emails';
import { buildAgreementPdf, pdfFileName } from './pdf';
import { companySignerFor, getSavedSignature, personRef } from './signers';

/*
 * The company's countersignature on onboarding documents. Once a new hire
 * signs their Trial Policy, NDA or offer, the company signer for that type
 * (the owner, or the hiring lead for minor ones) is asked to countersign:
 * a notification and an email, and an Approve button in the portal that
 * applies their saved signature. Onboarding itself never waits for it.
 */

export class CountersignError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const inboxPath = '/user?tab=documents';

async function companyName(companyId: string) {
  const c: Company | null = await db.company.findFirst({
    where: { id: companyId },
  });
  return c?.name || 'The team';
}

/**
 * Writes one document's countersign field. The hire may be signing another
 * document at the same moment, so it re-reads and writes only if nothing
 * changed in between (by updatedAt), trying again a few times.
 */
async function writeCountersign(
  onboardingId: string,
  docId: string,
  change: (
    current: DocumentCountersign | null | undefined,
    doc: OnboardingDocument,
  ) => DocumentCountersign | null,
  event?: { text: string; byUserId?: string | null },
): Promise<Onboarding> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh: Onboarding | null = await db.onboarding.findFirst({
      where: { id: onboardingId },
    });
    if (!fresh) throw new CountersignError(404, 'Not found.');
    const doc = fresh.documents.find((d) => d.id === docId);
    if (!doc) throw new CountersignError(404, 'Not found.');
    const next = change(doc.countersign, doc);
    if (!next) return fresh;
    // Strictly later than the last write, so the guard below always moves.
    const last = fresh.updatedAt ? new Date(fresh.updatedAt).getTime() : 0;
    const at = new Date(Math.max(Date.now(), last + 1)).toISOString();
    const { count } = await db.onboarding.updateMany({
      where: { id: onboardingId, updatedAt: fresh.updatedAt },
      data: {
        documents: fresh.documents.map((d) =>
          d.id === docId ? { ...d, countersign: next } : d,
        ),
        ...(event
          ? {
              history: [
                ...(fresh.history ?? []),
                { at, text: event.text, byUserId: event.byUserId ?? null },
              ],
            }
          : {}),
        updatedAt: at,
      },
    });
    if (count)
      return (await db.onboarding.findFirst({ where: { id: onboardingId } }))!;
  }
  throw new CountersignError(
    409,
    'This changed while saving. Reload and try again.',
  );
}

/**
 * After the hire signs a document: asks the company signer for that type to
 * countersign it. Does nothing when the type needs no company signature.
 */
export async function requestOnboardingCountersign(
  onboardingId: string,
  docId: string,
  origin: string,
) {
  const onboarding: Onboarding | null = await db.onboarding.findFirst({
    where: { id: onboardingId },
  });
  const doc = onboarding?.documents.find((d) => d.id === docId);
  if (!onboarding || !doc?.signature || doc.countersign) return;
  const signer = await companySignerFor(
    onboarding.companyId,
    onboardingTypeKey(doc.kind),
    { leadId: onboarding.terms?.leadId ?? onboarding.createdById },
  );
  if (!signer) return;
  const saved = await getSavedSignature(signer.id);
  await writeCountersign(
    onboardingId,
    docId,
    (current) =>
      current
        ? null
        : {
            userId: signer.id,
            name: saved?.name || signer.name,
            as: signer.as,
            requestedAt: nowIso(),
            signature: null,
          },
    { text: `Asked ${signer.name} to countersign the ${doc.title}` },
  );

  const company = await companyName(onboarding.companyId);
  const hire = onboarding.details?.legalName || onboarding.name;
  await ensureNotificationsReset();
  const at = new Date();
  await db.notification.createMany({
    data: [
      {
        userId: signer.id,
        title: 'Countersign for the company',
        description: `${doc.title} · ${hire} signed it`,
        matchId: onboarding.id,
        matchType: 'Onboarding',
        notificationType: NotificationType.SELF_GENERATED,
        notificationData: {
          kind: 'agreement',
          actions: [
            {
              title: 'Review and approve',
              trigger_type: 'link',
              trigger: inboxPath,
            },
          ],
        },
        isRead: false,
        createdAt: at,
        updatedAt: at,
      },
    ],
  });
  if (signer.email)
    await sendAgreementEmail(
      {
        kind: 'countersign',
        to: signer.email,
        firstName: signer.name.split(/\s+/)[0] || signer.name,
        companyName: company,
        title: `${doc.title} for ${hire}`,
        signUrl: `${origin}${inboxPath}`,
        sender: { name: 'The Portal', email: null },
        partiesSigned: [hire],
      },
      `onboarding-countersign-${onboarding.id}-${doc.id}`,
    );
}

/**
 * The company signer approves: their saved signature goes on the document,
 * and the hire gets the fully signed PDF.
 */
export async function approveOnboardingDoc(
  actor: { id: string; name?: string | null },
  onboardingId: string,
  docId: string,
  meta: { ip: string | null; userAgent: string | null },
  origin: string,
) {
  const saved = await getSavedSignature(actor.id);
  if (!saved)
    throw new CountersignError(
      409,
      'Save your signature first; after that it’s one click.',
    );
  let title = '';
  const updated = await writeCountersign(
    onboardingId,
    docId,
    (current, doc) => {
      if (!current || current.userId !== actor.id)
        throw new CountersignError(
          403,
          'This isn’t waiting for your countersignature.',
        );
      if (!doc.signature)
        throw new CountersignError(409, 'The new hire hasn’t signed it yet.');
      if (current.signature)
        throw new CountersignError(409, 'You already countersigned it.');
      title = doc.title;
      return {
        ...current,
        signature: {
          name: current.name,
          method: saved.method,
          image: saved.image ?? null,
          saved: true,
          at: nowIso(),
          ip: meta.ip,
          userAgent: meta.userAgent?.slice(0, 300) ?? null,
          provider: 'portal',
        },
      };
    },
    {
      text: `${actor.name || 'The company'} countersigned the document`,
      byUserId: actor.id,
    },
  );
  const doc = updated.documents.find((d) => d.id === docId)!;
  // The hire gets the copy signed by both sides.
  try {
    const company = await companyName(updated.companyId);
    const bytes = await onboardingDocPdf(updated, doc);
    const hire = updated.details?.legalName || updated.name;
    await sendAgreementEmail(
      {
        kind: 'completed',
        to: updated.email,
        firstName: hire.split(/\s+/)[0] || hire,
        companyName: company,
        title: title || doc.title,
        signUrl: `${origin}${inboxPath}`,
        sender: { name: actor.name || company, email: null },
        signedBy: [hire, doc.countersign!.name],
        pdf: {
          filename: pdfFileName(doc.title),
          base64: Buffer.from(bytes).toString('base64'),
        },
      },
      `onboarding-completed-${updated.id}-${doc.id}`,
    );
  } catch (e) {
    console.error('[agreements] countersign email', e);
  }
  return updated;
}

/** The PDF of one onboarding document: the hire's and the company's signatures. */
export async function onboardingDocPdf(
  onboarding: Onboarding,
  doc: OnboardingDocument,
) {
  const company = await companyName(onboarding.companyId);
  const hire = onboarding.details?.legalName || onboarding.name;
  const cs = doc.countersign;
  const csEmail = cs ? ((await personRef(cs.userId))?.email ?? '') : '';
  const trail: Array<{ at: string; text: string; ip?: string | null }> = [
    { at: doc.sentAt, text: `Sent to ${hire} through onboarding` },
  ];
  if (doc.viewedAt) trail.push({ at: doc.viewedAt, text: `${hire} opened it` });
  if (doc.signature)
    trail.push({
      at: doc.signature.at,
      text: `${hire} signed by typing their full name`,
      ip: doc.signature.ip ?? null,
    });
  if (cs)
    trail.push({ at: cs.requestedAt, text: `${cs.name} asked to countersign` });
  if (cs?.signature)
    trail.push({
      at: cs.signature.at,
      text: `${cs.name} countersigned${cs.signature.saved ? ' with their saved signature' : ''}`,
      ip: cs.signature.ip ?? null,
    });
  const complete = !!doc.signature && (!cs || !!cs.signature);
  return buildAgreementPdf({
    reference: `${onboarding.id}-${doc.id}`,
    title: doc.title || DOC_LABEL[doc.kind],
    companyName: company,
    body: doc.body,
    hash: doc.hash,
    sentAt: doc.sentAt,
    completedAt: complete
      ? ([doc.signature?.at, cs?.signature?.at].filter(Boolean).sort().at(-1) ??
        null)
      : null,
    status: complete ? 'COMPLETED' : 'WAITING FOR THE COMPANY',
    signers: [
      {
        name: hire,
        email: onboarding.email,
        role: 'New hire',
        status: doc.signature ? 'SIGNED' : 'PENDING',
        signature: doc.signature
          ? {
              name: doc.signature.name,
              method: 'typed',
              at: doc.signature.at,
              ip: doc.signature.ip ?? null,
            }
          : null,
      },
      ...(cs
        ? [
            {
              name: cs.name,
              email: csEmail,
              role: `For ${company}`,
              company: true,
              status: cs.signature ? 'SIGNED' : 'PENDING',
              signature: cs.signature
                ? {
                    name: cs.signature.name,
                    method: cs.signature.method,
                    image: cs.signature.image ?? null,
                    at: cs.signature.at,
                    ip: cs.signature.ip ?? null,
                    saved: !!cs.signature.saved,
                  }
                : null,
            },
          ]
        : []),
    ],
    history: trail.sort((a, b) => a.at.localeCompare(b.at)),
  });
}
