import { randomBytes } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { nowIso } from '@/lib/workspace/server';
import {
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  type ImportedDocument,
  SIGNER_STATUS,
} from '@/models/agreements';

import { DOC_TYPE_KEYS, docTypeLabel } from './docTypes';
import {
  AgreementError,
  type AgreementView,
  isDay,
  isEmail,
  pdfUrlFor,
  requireAgreements,
  seesConfidential,
  sha256,
  text,
} from './server';
import { getSettings } from './signers';
import {
  deleteStored,
  importPrefix,
  presignPdfUpload,
  readStored,
} from './storage';

/*
 * Past documents: PDFs signed before the Portal (on paper, or with another
 * tool), uploaded for the people they belong to. They sit in the vault and
 * in each person's file next to everything signed here, count towards what
 * each role must have signed, and can carry an end date for the alerts.
 */

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export const importRef = (id: string) => `import:${id}`;

export const parseImportRef = (ref: string) => {
  const m = /^import:([a-f0-9]{24})$/i.exec(ref);
  return m ? m[1] : null;
};

/** A signed link to upload one PDF to, before it is registered. */
export async function presignImport(
  actor: SessionUser,
  companyId: string,
  raw: { name?: unknown; size?: unknown; mime?: unknown },
) {
  await requireAgreements(actor, companyId, 'agreements:create');
  const size = Number(raw.size);
  if (raw.mime !== 'application/pdf')
    throw new AgreementError(400, 'Upload a PDF.');
  if (!Number.isFinite(size) || size <= 0)
    throw new AgreementError(400, 'The file is empty.');
  if (size > MAX_IMPORT_BYTES)
    throw new AgreementError(
      400,
      `PDFs can be up to ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`,
    );
  const name =
    text(raw.name, 200)
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .slice(-80) || 'document.pdf';
  const key = `${importPrefix(companyId)}${randomBytes(12).toString('hex')}-${name}`;
  return { key, ...(await presignPdfUpload(key, size)) };
}

/** Registers an uploaded PDF as a signed document of someone's. */
export async function registerImport(actor: SessionUser, raw: any) {
  const companyId = text(raw?.companyId, 40);
  await requireAgreements(actor, companyId, 'agreements:create');
  const key = text(raw?.key, 300);
  if (!key.startsWith(importPrefix(companyId)) || key.includes('..'))
    throw new AgreementError(400, 'Upload the file first.');
  const title = text(raw?.title, 160);
  if (!title) throw new AgreementError(400, 'Give it a title.');
  const typeKey = DOC_TYPE_KEYS.includes(raw?.typeKey)
    ? (raw.typeKey as string)
    : AGREEMENT_CATEGORY.OTHER;
  const signedOn = isDay(raw?.signedOn) ? raw.signedOn : null;
  if (!signedOn) throw new AgreementError(400, 'Add the day it was signed.');
  const endsOn = isDay(raw?.endsOn) ? raw.endsOn : null;

  // Whose it is: a portal account in the company, or a name and email.
  let userId: string | null = null;
  let personName = text(raw?.personName, 120);
  let personEmail = text(raw?.personEmail, 200).toLowerCase() || null;
  if (typeof raw?.userId === 'string' && raw.userId) {
    const member = await db.companyMember.findFirst({
      where: { companyId, userId: raw.userId },
    });
    const user = member
      ? await db.user.findFirst({
          where: { id: raw.userId },
          select: { id: true, name: true, email: true },
        })
      : null;
    if (!user)
      throw new AgreementError(404, 'That person isn’t in this company.');
    userId = user.id;
    personName = personName || user.name || 'Someone';
    personEmail = (user.email as string | null)?.toLowerCase() ?? personEmail;
  }
  if (!personName) throw new AgreementError(400, 'Say whose document it is.');
  if (personEmail && !isEmail(personEmail))
    throw new AgreementError(400, 'That email doesn’t look right.');

  const bytes = await readStored(key);
  if (!bytes)
    throw new AgreementError(400, 'The upload didn’t finish. Try again.');
  if (Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') {
    await deleteStored(key);
    throw new AgreementError(400, 'That file isn’t a PDF.');
  }
  const settings = await getSettings(companyId);
  const at = nowIso();
  const doc: ImportedDocument = await db.importedDocument.create({
    data: {
      companyId,
      title,
      typeKey,
      userId,
      personName,
      personEmail,
      signedOn,
      endsOn,
      endAlerts: [],
      confidential:
        typeof raw?.confidential === 'boolean'
          ? raw.confidential
          : !!settings.types[typeKey]?.confidential,
      note: text(raw?.note, 500) || null,
      fileKey: key,
      fileName: key
        .slice(key.lastIndexOf('/') + 1)
        .replace(/^[a-f0-9]{24}-/, ''),
      size: bytes.length,
      hash: sha256(Buffer.from(bytes).toString('base64')),
      uploadedById: actor.id,
      createdAt: at,
      updatedAt: at,
    },
  });
  return importView(doc);
}

/** An imported document as a vault row: signed, by the person it is of. */
export function importView(d: ImportedDocument): AgreementView {
  const signedAt = `${d.signedOn}T00:00:00.000Z`;
  return {
    id: importRef(d.id),
    source: 'imported',
    companyId: d.companyId,
    title: d.title,
    category: (Object.values(AGREEMENT_CATEGORY) as string[]).includes(
      d.typeKey,
    )
      ? (d.typeKey as AGREEMENT_CATEGORY)
      : AGREEMENT_CATEGORY.EMPLOYMENT,
    typeKey: d.typeKey,
    typeLabel: docTypeLabel(d.typeKey),
    status: AGREEMENT_STATUS.COMPLETED,
    confidential: !!d.confidential,
    message: d.note ?? null,
    ordered: false,
    sentAt: signedAt,
    completedAt: signedAt,
    expiresOn: null,
    voidReason: null,
    sender: { id: d.uploadedById, name: 'Imported' },
    progress: { signed: 1, total: 1 },
    signers: [
      {
        id: d.id,
        name: d.personName,
        email: d.personEmail ?? '',
        userId: d.userId ?? null,
        role: null,
        order: 1,
        company: false,
        status: SIGNER_STATUS.SIGNED,
        viewedAt: null,
        notifiedAt: null,
        remindedAt: null,
        signedAt,
        saved: false,
        declinedAt: null,
        declineReason: null,
        signUrl: null,
      },
    ],
    link: null,
    pdfUrl: pdfUrlFor(importRef(d.id)),
    endsOn: d.endsOn ?? null,
    previousId: null,
    linkKind: null,
    rolloutId: null,
    templateId: null,
    templateVersion: null,
    blocking: false,
    fieldCount: 0,
    corrected: false,
  };
}

export async function companyImports(companyId: string) {
  const list: ImportedDocument[] = await db.importedDocument.findMany({
    where: { companyId },
    orderBy: { signedOn: 'desc' },
    take: 2000,
  });
  return list;
}

export async function findImport(id: string) {
  const d: ImportedDocument | null = await db.importedDocument.findFirst({
    where: { id },
  });
  return d;
}

export async function importPdf(d: ImportedDocument) {
  return readStored(d.fileKey);
}

/** Changes an imported document's details (not its file). */
export async function updateImport(actor: SessionUser, id: string, raw: any) {
  const d = await findImport(id);
  if (!d) throw new AgreementError(404, 'Document not found.');
  await requireAgreements(actor, d.companyId, 'agreements:edit');
  if (d.confidential && !(await seesConfidential(actor, d.companyId)))
    throw new AgreementError(404, 'Document not found.');
  const patch: Partial<ImportedDocument> = { updatedAt: nowIso() };
  if (typeof raw?.title === 'string' && raw.title.trim())
    patch.title = text(raw.title, 160);
  if (DOC_TYPE_KEYS.includes(raw?.typeKey)) patch.typeKey = raw.typeKey;
  if (isDay(raw?.signedOn)) patch.signedOn = raw.signedOn;
  if ('endsOn' in (raw ?? {})) {
    patch.endsOn = isDay(raw.endsOn) ? raw.endsOn : null;
    patch.endAlerts = [];
  }
  if (typeof raw?.confidential === 'boolean')
    patch.confidential = raw.confidential;
  const updated: ImportedDocument = await db.importedDocument.update({
    where: { id },
    data: patch,
  });
  return importView(updated);
}

export async function deleteImport(actor: SessionUser, id: string) {
  const d = await findImport(id);
  if (!d) throw new AgreementError(404, 'Document not found.');
  await requireAgreements(actor, d.companyId, 'agreements:delete');
  if (d.confidential && !(await seesConfidential(actor, d.companyId)))
    throw new AgreementError(404, 'Document not found.');
  await db.importedDocument.delete({ where: { id } });
  await deleteStored(d.fileKey);
}
