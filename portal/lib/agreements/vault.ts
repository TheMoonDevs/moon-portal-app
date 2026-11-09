import { strToU8, zipSync } from 'fflate';

import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import {
  type Agreement,
  AGREEMENT_STATUS,
  SIGNER_STATUS,
} from '@/models/agreements';
import type { Onboarding } from '@/models/onboarding';
import { ONBOARDING_DOC_KIND } from '@/models/onboarding';
import {
  type CompanyMember,
  MEMBER_STATUS,
  type Project,
} from '@/models/workspace';

import { onboardingDocPdf } from './countersign';
import { onboardingTypeKey } from './docTypes';
import { canReadOwn } from './mine';
import { pdfFileName } from './pdf';
import {
  AgreementError,
  agreementPdf,
  type AgreementView,
  agreementView,
  expireIfDue,
  onboardingRows,
  parseOnboardingRef,
  requireAgreements,
  seesConfidential,
} from './server';
import { getSettings } from './signers';

/*
 * The document vault: every signed (or out-for-signing) document of a
 * company in one searchable place, each person's file, and exports. Rows
 * marked confidential (pay letters) only reach people with
 * `confidential:read`: HR and owners.
 */

export type VaultRow = AgreementView & {
  /** Everyone in it, for search: names, emails, account ids. */
  people: Array<{ name: string; email: string; userId: string | null }>;
  projectId: string | null;
};

type RowWithBody = VaultRow & { body: string };

async function allRows(
  companyId: string,
  origin: string,
  confidential: boolean,
): Promise<RowWithBody[]> {
  const [agreements, hires]: [Agreement[], Onboarding[]] = await Promise.all([
    db.agreement.findMany({
      where: { companyId },
      orderBy: { sentAt: 'desc' },
      take: 2000,
    }),
    db.onboarding.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    }),
  ]);
  const fresh = await Promise.all(agreements.map(expireIfDue));
  const own = await Promise.all(
    fresh.map(async (a) => ({
      ...(await agreementView(a, origin)),
      body: a.body,
      projectId: null as string | null,
    })),
  );
  const onboarding = (await onboardingRows(companyId, origin, hires)).map(
    (r) => ({
      ...r,
      projectId:
        hires.find((o) => r.id.startsWith(`onboarding:${o.id}:`))?.terms
          ?.projectId ?? null,
    }),
  );
  return [...own, ...onboarding]
    .filter((r) => confidential || !r.confidential)
    .map((r) => ({
      ...r,
      people: r.signers.map((s) => ({
        name: s.name,
        email: s.email,
        userId: s.userId ?? null,
      })),
    }))
    .sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)));
}

export interface VaultFilters {
  q?: string | null;
  /** A portal account id or an email. */
  person?: string | null;
  type?: string | null;
  status?: string | null;
  /** YYYY-MM-DD, on the day it was sent. */
  from?: string | null;
  to?: string | null;
  projectId?: string | null;
}

export function parseVaultFilters(params: URLSearchParams): VaultFilters {
  const day = (v: string | null) =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  return {
    q: params.get('q')?.trim().slice(0, 200) || null,
    person: params.get('person')?.trim().toLowerCase().slice(0, 200) || null,
    type: params.get('type')?.trim().slice(0, 60) || null,
    status: params.get('status')?.trim().slice(0, 20) || null,
    from: day(params.get('from')),
    to: day(params.get('to')),
    projectId: params.get('project')?.trim().slice(0, 40) || null,
  };
}

const involves = (r: VaultRow, person: string) =>
  r.people.some((p) => p.userId === person || p.email.toLowerCase() === person);

async function filterRows(
  rows: RowWithBody[],
  f: VaultFilters,
  companyId: string,
) {
  let team: Set<string> | null = null;
  if (f.projectId) {
    const project: Project | null = await db.project.findFirst({
      where: { id: f.projectId, companyId },
    });
    team = new Set((project?.memberIds as string[] | undefined) ?? []);
  }
  const words = (f.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (f.person && !involves(r, f.person)) return false;
    if (f.type && r.typeKey !== f.type) return false;
    if (f.status) {
      if (f.status === 'WAITING_COMPANY') {
        if (
          r.status !== AGREEMENT_STATUS.SENT ||
          !r.signers.some(
            (s) =>
              s.company &&
              (s.status === SIGNER_STATUS.PENDING ||
                s.status === SIGNER_STATUS.VIEWED),
          )
        )
          return false;
      } else if (f.status === 'CLOSED') {
        if (
          r.status === AGREEMENT_STATUS.SENT ||
          r.status === AGREEMENT_STATUS.COMPLETED
        )
          return false;
      } else if (r.status !== f.status) return false;
    }
    const day = String(r.sentAt).slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (
      team &&
      r.projectId !== f.projectId &&
      !r.people.some((p) => p.userId && team!.has(p.userId))
    )
      return false;
    if (words.length) {
      const hay = [
        r.title,
        r.typeLabel,
        r.body,
        ...r.people.flatMap((p) => [p.name, p.email]),
      ]
        .join(' \n ')
        .toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** Search the vault. */
export async function searchVault(
  actor: SessionUser,
  companyId: string,
  filters: VaultFilters,
  origin: string,
): Promise<VaultRow[]> {
  await requireAgreements(actor, companyId, 'agreements:read');
  const confidential = await seesConfidential(actor, companyId);
  const rows = await filterRows(
    await allRows(companyId, origin, confidential),
    filters,
    companyId,
  );
  return rows.map(({ body: _b, ...r }) => r);
}

/* --------------------------------- people --------------------------------- */

/** The company's people, each with how many documents they have. */
export async function vaultPeople(
  actor: SessionUser,
  companyId: string,
  origin: string,
) {
  await requireAgreements(actor, companyId, 'agreements:read');
  const confidential = await seesConfidential(actor, companyId);
  const [rows, members]: [RowWithBody[], CompanyMember[]] = await Promise.all([
    allRows(companyId, origin, confidential),
    db.companyMember.findMany({
      where: { companyId, status: MEMBER_STATUS.ACTIVE },
    }),
  ]);
  const users = members.length
    ? await db.user.findMany({
        where: { id: { in: members.map((m) => m.userId) } },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          positionTitle: true,
          linkedEmails: true,
        },
      })
    : [];
  return members
    .map((m) => {
      const u = users.find((x: { id: string }) => x.id === m.userId);
      if (!u) return null;
      const emails = [u.email, ...(u.linkedEmails ?? [])]
        .filter(Boolean)
        .map((e: string) => e.toLowerCase());
      const mine = rows.filter((r) =>
        r.people.some(
          (p) => p.userId === u.id || emails.includes(p.email.toLowerCase()),
        ),
      );
      return {
        userId: u.id as string,
        name: (u.name as string) || 'Someone',
        email: (u.email as string) ?? null,
        avatar: (u.avatar as string) ?? null,
        title: (m.title as string) || (u.positionTitle as string) || null,
        roleKeys: m.roleKeys ?? [],
        signed: mine.filter((r) => r.status === AGREEMENT_STATUS.COMPLETED)
          .length,
        // Out for signing and still waiting on them, not on someone else.
        waiting: mine.filter(
          (r) =>
            r.status === AGREEMENT_STATUS.SENT &&
            r.signers.some(
              (s) =>
                (s.userId === u.id || emails.includes(s.email.toLowerCase())) &&
                !s.signedAt,
            ),
        ).length,
      };
    })
    .filter(<T>(x: T | null): x is T => !!x)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One person's file: everything they signed or still have to, and gaps. */
export async function personFile(
  actor: SessionUser,
  companyId: string,
  userId: string,
  origin: string,
) {
  await requireAgreements(actor, companyId, 'agreements:read');
  const confidential = await seesConfidential(actor, companyId);
  const user = await db.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      positionTitle: true,
      linkedEmails: true,
    },
  });
  const member: CompanyMember | null = await db.companyMember.findFirst({
    where: { companyId, userId },
  });
  if (!user || !member)
    throw new AgreementError(404, 'That person isn’t in this company.');
  const emails = [user.email, ...(user.linkedEmails ?? [])]
    .filter(Boolean)
    .map((e: string) => e.toLowerCase());
  const everything = await allRows(companyId, origin, true);
  const theirs = everything.filter((r) =>
    r.people.some(
      (p) => p.userId === userId || emails.includes(p.email.toLowerCase()),
    ),
  );
  const visible = theirs.filter((r) => confidential || !r.confidential);
  const hidden = theirs.length - visible.length;

  // What a member should have on file: an NDA, and once hired, the offer
  // and work agreement. Per-role requirements come later.
  const signedTypes = new Set(
    theirs
      .filter(
        (r) =>
          r.status === AGREEMENT_STATUS.COMPLETED ||
          r.signers.some(
            (s) =>
              !s.company &&
              (s.userId === userId || emails.includes(s.email.toLowerCase())) &&
              s.signedAt,
          ),
      )
      .map((r) => r.typeKey),
  );
  const hasNda =
    signedTypes.has('NDA') ||
    signedTypes.has(onboardingTypeKey(ONBOARDING_DOC_KIND.NDA));
  const missing: Array<{ key: string; label: string; why: string }> = [];
  if (!hasNda)
    missing.push({
      key: 'NDA',
      label: 'Non-Disclosure Agreement',
      why: 'No signed NDA on file.',
    });
  const waitingOnThem = visible.filter(
    (r) =>
      r.status === AGREEMENT_STATUS.SENT &&
      r.signers.some(
        (s) =>
          (s.userId === userId || emails.includes(s.email.toLowerCase())) &&
          !s.signedAt,
      ),
  );
  return {
    person: {
      userId: user.id as string,
      name: (user.name as string) || 'Someone',
      email: (user.email as string) ?? null,
      avatar: (user.avatar as string) ?? null,
      title: (member.title as string) || (user.positionTitle as string) || null,
      roleKeys: member.roleKeys ?? [],
      joinedAt: (member.joinedAt as string) ?? null,
    },
    documents: visible.map(({ body: _b, ...r }) => r),
    hiddenConfidential: hidden,
    missing,
    waitingOnThem: waitingOnThem.map((r) => r.id),
  };
}

/* --------------------------------- exports -------------------------------- */

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // Neutralise spreadsheet formulas, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function vaultCsv(rows: VaultRow[]) {
  const head = [
    'Title',
    'Type',
    'Status',
    'Confidential',
    'Sent',
    'Completed',
    'Signers',
    'Signed by',
    'Waiting on',
    'Reference',
  ];
  const lines = rows.map((r) =>
    [
      r.title,
      r.typeLabel,
      r.status,
      r.confidential ? 'yes' : 'no',
      r.sentAt,
      r.completedAt ?? '',
      r.signers.map((s) => `${s.name} <${s.email}>`).join('; '),
      r.signers
        .filter((s) => s.signedAt)
        .map((s) => s.name)
        .join('; '),
      r.signers
        .filter((s) => !s.signedAt && s.status !== SIGNER_STATUS.DECLINED)
        .map((s) => s.name)
        .join('; '),
      r.id,
    ]
      .map(csvCell)
      .join(','),
  );
  return `\uFEFF${[head.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
}

/** The PDF bytes of one row, by its reference. */
export async function pdfForRef(ref: string) {
  const ob = parseOnboardingRef(ref);
  if (ob) {
    const o: Onboarding | null = await db.onboarding.findFirst({
      where: { id: ob.onboardingId },
    });
    const doc = o?.documents.find((d) => d.id === ob.docId);
    if (!o || !doc?.signature) return null;
    return {
      title: doc.title,
      bytes: await onboardingDocPdf(o, doc),
    };
  }
  const a: Agreement | null = await db.agreement.findFirst({
    where: { id: ref },
  });
  if (!a) return null;
  return { title: a.title, bytes: await agreementPdf(a) };
}

/** Which company a document belongs to, and whether it is confidential. */
async function refInfo(ref: string) {
  const ob = parseOnboardingRef(ref);
  if (ob) {
    const o: Onboarding | null = await db.onboarding.findFirst({
      where: { id: ob.onboardingId },
    });
    const d = o?.documents.find((x) => x.id === ob.docId);
    if (!o || !d) return null;
    const settings = await getSettings(o.companyId);
    return {
      companyId: o.companyId,
      confidential: !!settings.types[onboardingTypeKey(d.kind)]?.confidential,
      ready: !!d.signature,
    };
  }
  if (!/^[a-f0-9]{24}$/i.test(ref)) return null;
  const a: Agreement | null = await db.agreement.findFirst({
    where: { id: ref },
  });
  return a
    ? {
        companyId: a.companyId,
        confidential: !!a.confidential,
        ready: a.status === AGREEMENT_STATUS.COMPLETED,
      }
    : null;
}

/**
 * One document's PDF for someone: the people who signed it, or the team
 * with `agreements:read` (and `confidential:read` for confidential ones).
 */
export async function documentPdfFor(actor: SessionUser, ref: string) {
  const info = await refInfo(ref);
  if (!info) throw new AgreementError(404, 'Document not found.');
  if (!(await canReadOwn(actor, ref))) {
    await requireAgreements(actor, info.companyId, 'agreements:read');
    if (info.confidential && !(await seesConfidential(actor, info.companyId)))
      throw new AgreementError(404, 'Document not found.');
  }
  if (!info.ready)
    throw new AgreementError(409, 'The PDF is ready once it is signed.');
  const pdf = await pdfForRef(ref);
  if (!pdf) throw new AgreementError(404, 'Document not found.');
  return pdf;
}

export const MAX_ZIP_DOCUMENTS = 150;

/** A zip of the signed PDFs among the rows, with a CSV index. */
export async function vaultZip(rows: VaultRow[]) {
  const files: Record<string, Uint8Array> = {};
  const done = rows.filter((r) => r.pdfUrl).slice(0, MAX_ZIP_DOCUMENTS);
  const used = new Set<string>();
  for (const r of done) {
    const pdf = await pdfForRef(r.id);
    if (!pdf) continue;
    const who = r.signers
      .filter((s) => !s.company)
      .map((s) => s.name)
      .join(' ')
      .replace(/[^\w\s-]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40);
    let name = `${who ? `${who}-` : ''}${pdfFileName(r.title)}`;
    for (let i = 2; used.has(name); i++)
      name = name.replace(/(-\d+)?\.pdf$/, `-${i}.pdf`);
    used.add(name);
    files[name] = pdf.bytes;
  }
  files['index.csv'] = strToU8(vaultCsv(done));
  return zipSync(files, { level: 6 });
}
