import { createHash, randomBytes } from 'crypto';
import { PDFDocument } from 'pdf-lib';

import type { SessionUser } from '@/lib/permissions/server';
import type {
  Agreement,
  AgreementDocument,
  AgreementPlacement,
  AgreementSigner,
  PlacementKind,
} from '@/models/agreements';

import { partiesOf } from './fields';
import { AgreementError, newId, requireAgreements, text } from './server';
import {
  deleteStored,
  presignPdfUpload,
  readStored,
  signedReadUrl,
  sourcePrefix,
} from './storage';

/*
 * Uploaded PDFs, signed as they are: a lawyer's document goes out without
 * being retyped, with boxes placed on its pages for each signer's
 * signature, initials and the day they sign. The file's SHA-256 is the
 * document's fingerprint; the signed copy is the same file with the
 * signatures drawn into the boxes and the certificate added at the end.
 */

export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_SOURCE_PAGES = 60;
export const MAX_PLACEMENTS = 200;

export const PLACEMENT_KINDS: PlacementKind[] = [
  'signature',
  'initials',
  'date',
];

export const sha256Bytes = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

/** A signed link to upload one PDF to, before it is sent. */
export async function presignSource(
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
  if (size > MAX_SOURCE_BYTES)
    throw new AgreementError(
      400,
      `PDFs can be up to ${MAX_SOURCE_BYTES / 1024 / 1024} MB.`,
    );
  const name =
    text(raw.name, 200)
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .slice(-80) || 'document.pdf';
  const key = `${sourcePrefix(companyId)}${randomBytes(12).toString('hex')}-${name}`;
  return { key, ...(await presignPdfUpload(key, size)) };
}

const rotationOf = (angle: number) =>
  (((Math.round(angle / 90) * 90) % 360) + 360) % 360;

/** Each page's box and rotation, as pdf-lib reads them. */
export function pageBoxes(doc: PDFDocument) {
  return doc.getPages().map((p) => {
    const box = p.getCropBox();
    return {
      x0: box.x,
      y0: box.y,
      W: box.width,
      H: box.height,
      rot: rotationOf(p.getRotation().angle),
    };
  });
}

/** Opens an uploaded PDF, refusing what can't be signed. */
export async function loadSourcePdf(bytes: Uint8Array) {
  if (
    Buffer.from(bytes.subarray(0, 1024)).toString('latin1').indexOf('%PDF-') < 0
  )
    throw new AgreementError(400, 'That file isn’t a PDF.');
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    if (
      (e as Error)?.name === 'EncryptedPDFError' ||
      /encrypt/i.test(String(e))
    )
      throw new AgreementError(
        400,
        'This PDF is password-protected. Save an unlocked copy and upload that.',
      );
    throw new AgreementError(
      400,
      'This PDF can’t be read. Try saving it again as PDF.',
    );
  }
  if (doc.isEncrypted)
    throw new AgreementError(
      400,
      'This PDF is password-protected. Save an unlocked copy and upload that.',
    );
  const count = doc.getPageCount();
  if (!count) throw new AgreementError(400, 'This PDF has no pages.');
  if (count > MAX_SOURCE_PAGES)
    throw new AgreementError(
      400,
      `PDFs to sign can have up to ${MAX_SOURCE_PAGES} pages.`,
    );
  return doc;
}

/** The uploaded file as the agreement keeps it, checked and measured. */
export async function inspectSource(
  companyId: string,
  rawKey: unknown,
  rawName?: unknown,
): Promise<AgreementDocument> {
  const key = text(rawKey, 300);
  if (!key.startsWith(sourcePrefix(companyId)) || key.includes('..'))
    throw new AgreementError(400, 'Upload the PDF first.');
  const bytes = await readStored(key);
  if (!bytes)
    throw new AgreementError(400, 'The upload didn’t finish. Try again.');
  let doc: PDFDocument;
  try {
    doc = await loadSourcePdf(bytes);
  } catch (e) {
    await deleteStored(key);
    throw e;
  }
  const pages = pageBoxes(doc).map((b) =>
    b.rot === 90 || b.rot === 270 ? { w: b.H, h: b.W } : { w: b.W, h: b.H },
  );
  const fromKey = key
    .slice(key.lastIndexOf('/') + 1)
    .replace(/^[a-f0-9]{24}-/, '');
  return {
    fileKey: key,
    fileName: (text(rawName, 160) || fromKey || 'document.pdf').replace(
      /[\r\n"]/g,
      '',
    ),
    size: bytes.length,
    hash: sha256Bytes(bytes),
    pages: pages.map((p) => ({
      w: Math.round(p.w * 100) / 100,
      h: Math.round(p.h * 100) / 100,
    })),
  };
}

const unit = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.min(1, Math.max(0, v))
    : NaN;

/**
 * The boxes on the pages, from an untrusted body. Every party needs at
 * least one signature box, and so does the company's signer when there is
 * one.
 */
export function parsePlacements(
  raw: unknown,
  opts: {
    pages: number;
    parties: string[];
    /** The company's signer, when someone signs for it. */
    company: string | null;
  },
): AgreementPlacement[] {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_PLACEMENTS) : [];
  const out: AgreementPlacement[] = [];
  for (const r of list) {
    const kind = PLACEMENT_KINDS.includes(r?.kind)
      ? (r.kind as PlacementKind)
      : null;
    const page = Number(r?.page);
    const signer = Number(r?.signer);
    const [x, y, w, h] = [unit(r?.x), unit(r?.y), unit(r?.w), unit(r?.h)];
    if (!kind || [x, y, w, h].some(Number.isNaN)) continue;
    if (!Number.isInteger(page) || page < 0 || page >= opts.pages) continue;
    if (!Number.isInteger(signer) || signer < 0 || signer > opts.parties.length)
      continue;
    if (signer === 0 && !opts.company) continue;
    if (w < 0.01 || h < 0.005) continue;
    out.push({
      id:
        typeof r?.id === 'string' && /^[\w-]{1,24}$/.test(r.id)
          ? r.id
          : newId(),
      kind,
      signer,
      page,
      x: Math.min(x, 1 - w),
      y: Math.min(y, 1 - h),
      w,
      h,
    });
  }
  const needs = [
    ...opts.parties.map((name, i) => ({ n: i + 1, name })),
    ...(opts.company ? [{ n: 0, name: opts.company }] : []),
  ];
  for (const p of needs)
    if (!out.some((b) => b.signer === p.n && b.kind === 'signature'))
      throw new AgreementError(
        400,
        `Place a signature box for ${p.name} on the document.`,
      );
  return out;
}

/** Which of an agreement's boxes are one signer's. */
export function placementsFor(
  agreement: Pick<Agreement, 'placements' | 'signers'>,
  signer: Pick<AgreementSigner, 'id' | 'company'>,
) {
  const all = agreement.placements ?? [];
  if (signer.company) return all.filter((p) => p.signer === 0);
  const index = partiesOf(agreement.signers).findIndex(
    (s) => s.id === signer.id,
  );
  return index < 0 ? [] : all.filter((p) => p.signer === index + 1);
}

/** The signer each box belongs to. */
export function placementOwners(
  agreement: Pick<Agreement, 'placements' | 'signers'>,
) {
  const parties = partiesOf(agreement.signers);
  const company = agreement.signers.find((s) => s.company) ?? null;
  return (agreement.placements ?? []).map((p) => ({
    ...p,
    signerId: (p.signer === 0 ? company : parties[p.signer - 1])?.id ?? null,
  }));
}

/** Initials from a name: "Asha K. Verma" → "AKV". */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 4);

/** The uploaded file's bytes, checked against its fingerprint. */
export async function sourceBytes(document: AgreementDocument) {
  const bytes = await readStored(document.fileKey);
  if (!bytes || sha256Bytes(bytes) !== document.hash)
    throw new AgreementError(
      500,
      'The uploaded PDF is missing from storage, or it changed. Contact support.',
    );
  return bytes;
}

/** A short-lived link to the uploaded file, to show its pages. */
export const sourceLink = (document: AgreementDocument, inline = true) =>
  signedReadUrl(document.fileKey, document.fileName, inline);
