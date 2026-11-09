import { db } from '@/lib/mongodb/db-client';
import { DOC_LABEL } from '@/lib/onboarding/meta';
import type { SessionUser } from '@/lib/permissions/server';
import { type Agreement, AGREEMENT_STATUS } from '@/models/agreements';
import type { Onboarding } from '@/models/onboarding';
import type { Company } from '@/models/workspace';

import { approveOnboardingDoc, CountersignError } from './countersign';
import { docTypeLabel, onboardingTypeKey } from './docTypes';
import {
  AgreementError,
  approveAgreement,
  emailsOf,
  expireIfDue,
  isSignerUser,
  onboardingRef,
  parseOnboardingRef,
  pdfUrlFor,
  signersUp,
} from './server';
import { getSavedSignature, savedSignatureView } from './signers';

/*
 * A person's own documents, wherever they came from: agreements they were
 * sent (or sign for the company), and their onboarding documents. The
 * to-sign inbox on Home and the Documents tab of their Profile read this.
 */

export type MyDocStatus =
  /** Their turn: sign it (or, for the company signer, approve it). */
  | 'TO_SIGN'
  /** Not their turn yet: someone signs before them. */
  | 'UP_NEXT'
  /** They signed; others still have to. */
  | 'WAITING_OTHERS'
  | 'COMPLETED'
  | 'DECLINED'
  | 'VOIDED'
  | 'EXPIRED';

export interface MyDoc {
  ref: string;
  source: 'portal' | 'onboarding';
  title: string;
  typeLabel: string;
  companyId: string;
  companyName: string;
  /** Signs as a party, or for the company. */
  as: 'party' | 'company';
  status: MyDocStatus;
  from: string;
  others: string[];
  sentAt: string;
  signedAt: string | null;
  completedAt: string | null;
  expiresOn: string | null;
  /** Where to read and sign it by hand. */
  signUrl: string | null;
  /** One click with a saved signature. */
  canApprove: boolean;
  pdfUrl: string | null;
}

async function companyNames(ids: string[]) {
  const companies: Company[] = ids.length
    ? await db.company.findMany({ where: { id: { in: ids } } })
    : [];
  return (id: string) => companies.find((c) => c.id === id)?.name || 'Company';
}

async function names(ids: string[]) {
  const users = ids.length
    ? await db.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    : [];
  return (id: string | null | undefined) =>
    users.find((u: { id: string }) => u.id === id)?.name || 'The team';
}

export async function myDocuments(user: SessionUser) {
  const emails = await emailsOf(user.id);
  const [agreements, asHire, asCountersigner]: [
    Agreement[],
    Onboarding[],
    Onboarding[],
  ] = await Promise.all([
    db.agreement.findMany({
      where: {
        OR: [
          { 'signers.userId': user.id },
          ...(emails.length ? [{ 'signers.email': { in: emails } }] : []),
        ],
      },
      orderBy: { sentAt: 'desc' },
      take: 500,
    }),
    db.onboarding.findMany({ where: { userId: user.id }, take: 20 }),
    db.onboarding.findMany({
      where: { 'documents.countersign.userId': user.id },
      take: 500,
    }),
  ]);
  const companyOf = await companyNames(
    Array.from(
      new Set([
        ...agreements.map((a) => a.companyId),
        ...asHire.map((o) => o.companyId),
        ...asCountersigner.map((o) => o.companyId),
      ]),
    ),
  );
  const senderOf = await names(
    Array.from(new Set(agreements.map((a) => a.createdById))),
  );
  const docs: MyDoc[] = [];

  for (const raw of agreements) {
    const a = await expireIfDue(raw);
    // The agreement may have more than one row for them (rare): the first.
    let me = null;
    for (const s of a.signers)
      if (await isSignerUser(user, s)) {
        me = s;
        break;
      }
    if (!me) continue;
    const up = signersUp(a).some((s) => s.id === me!.id);
    const status: MyDocStatus =
      a.status === AGREEMENT_STATUS.SENT
        ? me.signature
          ? 'WAITING_OTHERS'
          : up
            ? 'TO_SIGN'
            : 'UP_NEXT'
        : (a.status as MyDocStatus);
    docs.push({
      ref: a.id,
      source: 'portal',
      title: a.title,
      typeLabel: docTypeLabel(a.category),
      companyId: a.companyId,
      companyName: companyOf(a.companyId),
      as: me.company ? 'company' : 'party',
      status,
      from: senderOf(a.createdById),
      others: a.signers.filter((s) => s.id !== me!.id).map((s) => s.name),
      sentAt: a.sentAt,
      signedAt: me.signature?.at ?? null,
      completedAt: a.completedAt ?? null,
      expiresOn: a.expiresOn ?? null,
      signUrl: `/sign/${me.token}`,
      canApprove: status === 'TO_SIGN',
      pdfUrl: a.status === AGREEMENT_STATUS.COMPLETED ? pdfUrlFor(a.id) : null,
    });
  }

  // Their own onboarding documents.
  for (const o of asHire)
    for (const d of o.documents ?? []) {
      const cs = d.countersign;
      const complete = !!d.signature && (!cs || !!cs.signature);
      docs.push({
        ref: onboardingRef(o.id, d.id),
        source: 'onboarding',
        title: d.title || DOC_LABEL[d.kind],
        typeLabel: docTypeLabel(onboardingTypeKey(d.kind)),
        companyId: o.companyId,
        companyName: companyOf(o.companyId),
        as: 'party',
        status: d.signature
          ? complete
            ? 'COMPLETED'
            : 'WAITING_OTHERS'
          : 'TO_SIGN',
        from: 'Onboarding',
        others: cs ? [cs.name] : [],
        sentAt: d.sentAt,
        signedAt: d.signature?.at ?? null,
        completedAt: complete
          ? ([d.signature?.at, cs?.signature?.at]
              .filter(Boolean)
              .sort()
              .at(-1) ?? null)
          : null,
        expiresOn: null,
        signUrl: d.signature ? null : `/join/${o.token}`,
        canApprove: false,
        pdfUrl: d.signature ? pdfUrlFor(onboardingRef(o.id, d.id)) : null,
      });
    }

  // Onboarding documents they countersign for the company.
  for (const o of asCountersigner)
    for (const d of o.documents ?? []) {
      const cs = d.countersign;
      if (!cs || cs.userId !== user.id) continue;
      const hire = o.details?.legalName || o.name;
      docs.push({
        ref: onboardingRef(o.id, d.id),
        source: 'onboarding',
        title: `${d.title || DOC_LABEL[d.kind]} · ${hire}`,
        typeLabel: docTypeLabel(onboardingTypeKey(d.kind)),
        companyId: o.companyId,
        companyName: companyOf(o.companyId),
        as: 'company',
        status: cs.signature
          ? 'COMPLETED'
          : d.signature
            ? 'TO_SIGN'
            : 'UP_NEXT',
        from: 'Onboarding',
        others: [hire],
        sentAt: cs.requestedAt,
        signedAt: cs.signature?.at ?? null,
        completedAt: cs.signature?.at ?? null,
        expiresOn: null,
        signUrl: null,
        canApprove: !cs.signature && !!d.signature,
        pdfUrl: d.signature ? pdfUrlFor(onboardingRef(o.id, d.id)) : null,
      });
    }

  docs.sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)));
  const saved = await getSavedSignature(user.id);
  return {
    toSign: docs.filter((d) => d.status === 'TO_SIGN'),
    documents: docs,
    signature: savedSignatureView(saved),
  };
}

export type MyDocuments = Awaited<ReturnType<typeof myDocuments>>;

/** Approve one document with the saved signature. */
export async function approveMine(
  user: SessionUser,
  ref: string,
  meta: { ip: string | null; userAgent: string | null },
  origin: string,
) {
  const ob = parseOnboardingRef(ref);
  try {
    if (ob)
      await approveOnboardingDoc(user, ob.onboardingId, ob.docId, meta, origin);
    else {
      if (!/^[a-f0-9]{24}$/i.test(ref))
        throw new AgreementError(404, 'Not found.');
      const a: Agreement | null = await db.agreement.findFirst({
        where: { id: ref },
      });
      if (!a) throw new AgreementError(404, 'Not found.');
      await approveAgreement(user, a, meta, origin);
    }
  } catch (e) {
    if (e instanceof CountersignError)
      throw new AgreementError(e.status, e.message);
    throw e;
  }
}

/** Whether someone may download a document's PDF, and its bytes. */
export async function canReadOwn(user: SessionUser, ref: string) {
  const ob = parseOnboardingRef(ref);
  if (ob) {
    const o: Onboarding | null = await db.onboarding.findFirst({
      where: { id: ob.onboardingId },
    });
    if (!o) return null;
    const d = o.documents.find((x) => x.id === ob.docId);
    if (!d) return null;
    return o.userId === user.id || d.countersign?.userId === user.id
      ? o.companyId
      : null;
  }
  if (!/^[a-f0-9]{24}$/i.test(ref)) return null;
  const a: Agreement | null = await db.agreement.findFirst({
    where: { id: ref },
  });
  if (!a) return null;
  for (const s of a.signers)
    if (await isSignerUser(user, s)) return a.companyId;
  return null;
}
