import { randomBytes } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import { nowIso } from '@/lib/workspace/server';
import {
  type Agreement,
  AGREEMENT_STATUS,
  type SealedPdf,
} from '@/models/agreements';

import { envelopeId } from './envelope';
import { agreementPdf } from './server';
import { sha256Bytes } from './source';
import {
  deleteStored,
  putStored,
  readStored,
  sealedPrefix,
  signedReadUrl,
} from './storage';

/*
 * The signed PDF as it was issued. The first time a completed agreement's
 * PDF is made (for the completion email, usually) it is stored with its
 * SHA-256, and every later download, attachment and zip is that same file.
 * So a copy someone hands over can be checked byte for byte on /verify.
 */

export const verifyUrlOf = (origin: string) => `${origin}/verify`;

/** The issued PDF of a completed agreement, sealing it the first time. */
export async function sealedPdf(
  agreement: Agreement,
  origin: string,
): Promise<{ bytes: Uint8Array; sealed: SealedPdf | null }> {
  const verifyUrl = verifyUrlOf(origin);
  if (agreement.status !== AGREEMENT_STATUS.COMPLETED)
    return {
      bytes: await agreementPdf(agreement, { verifyUrl }),
      sealed: null,
    };
  if (agreement.sealed) {
    const bytes = await readStored(agreement.sealed.fileKey);
    if (bytes && sha256Bytes(bytes) === agreement.sealed.hash)
      return { bytes, sealed: agreement.sealed };
    console.error('[agreements] issued PDF missing', agreement.id);
    return {
      bytes: await agreementPdf(agreement, { verifyUrl }),
      sealed: null,
    };
  }
  const bytes = await agreementPdf(agreement, { verifyUrl });
  const sealed: SealedPdf = {
    fileKey: `${sealedPrefix(agreement.companyId)}${agreement.id}-${randomBytes(6).toString('hex')}.pdf`,
    hash: sha256Bytes(bytes),
    size: bytes.length,
    at: nowIso(),
  };
  try {
    await putStored(sealed.fileKey, bytes);
    const { count } = await db.agreement.updateMany({
      where: { id: agreement.id, sealed: null },
      data: { sealed },
    });
    if (!count) {
      // Issued at the same moment elsewhere: that copy is the one.
      await deleteStored(sealed.fileKey);
      const fresh: Agreement | null = await db.agreement.findFirst({
        where: { id: agreement.id },
      });
      const theirs = fresh?.sealed
        ? await readStored(fresh.sealed.fileKey)
        : null;
      if (fresh?.sealed && theirs)
        return { bytes: theirs, sealed: fresh.sealed };
    }
    return { bytes, sealed };
  } catch (e) {
    console.error('[agreements] seal', agreement.id, e);
    return { bytes, sealed: null };
  }
}

/**
 * A PDF download. Big files (an uploaded document with many pages) go
 * through a short-lived storage link, as responses over ~4.5 MB fail.
 */
export async function pdfResponse(
  bytes: Uint8Array,
  sealed: SealedPdf | null,
  fileName: string,
  inline: boolean,
) {
  if (sealed && bytes.length > 4 * 1024 * 1024)
    return Response.redirect(
      await signedReadUrl(sealed.fileKey, fileName, inline),
      302,
    );
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/** The 24-hex id behind an Envelope ID, however it was typed. */
export const parseEnvelopeId = (raw: unknown) => {
  const hex = typeof raw === 'string' ? raw.replace(/[^0-9a-f]/gi, '') : '';
  return /^[0-9a-f]{24}$/i.test(hex) ? hex.toLowerCase() : null;
};

export type VerifyResult =
  | {
      /** The file is a signed PDF issued by the Portal, unchanged. */
      match: 'file';
      envelopeId: string;
      title: string;
      companyName: string;
      completedAt: string | null;
      issuedAt: string;
      hash: string;
      signers: Array<{ name: string; role: string | null; signedAt: string }>;
    }
  | {
      /** The envelope exists; without the file, only that much is shown. */
      match: 'envelope';
      envelopeId: string;
      companyName: string;
      status: 'COMPLETED' | 'IN_PROGRESS' | 'CLOSED';
      completedAt: string | null;
      signatures: number;
      /** The file given doesn't match this envelope's issued PDF. */
      fileMismatch: boolean;
      /** No issued PDF to compare against yet. */
      canCheckFile: boolean;
    }
  | { match: 'none'; fileGiven: boolean };

const companyName = async (id: string) =>
  ((await db.company.findFirst({ where: { id }, select: { name: true } }))
    ?.name as string | undefined) || 'A company';

/**
 * Checks a copy: by the SHA-256 of the file (worked out in the browser, so
 * the file itself never leaves it) and/or its Envelope ID. Only someone
 * holding the exact file sees what it is and who signed it.
 */
export async function verifyDocument(raw: {
  id?: unknown;
  hash?: unknown;
}): Promise<VerifyResult> {
  const hash =
    typeof raw.hash === 'string' && /^[a-f0-9]{64}$/i.test(raw.hash)
      ? raw.hash.toLowerCase()
      : null;
  const id = parseEnvelopeId(raw.id);
  if (hash) {
    const found: Agreement | null = await db.agreement.findFirst({
      where: { 'sealed.hash': hash },
    });
    if (found?.sealed) {
      const name = await companyName(found.companyId);
      return {
        match: 'file',
        envelopeId: envelopeId(found.id),
        title: found.title,
        companyName: name,
        completedAt: found.completedAt ?? null,
        issuedAt: found.sealed.at,
        hash: found.sealed.hash,
        signers: found.signers
          .filter((s) => s.signature)
          .sort((a, b) => a.signature!.at.localeCompare(b.signature!.at))
          .map((s) => ({
            name: s.name,
            role: s.role ?? null,
            signedAt: s.signature!.at,
          })),
      };
    }
  }
  if (id) {
    const found: Agreement | null = await db.agreement.findFirst({
      where: { id },
    });
    if (found)
      return {
        match: 'envelope',
        envelopeId: envelopeId(found.id),
        companyName: await companyName(found.companyId),
        status:
          found.status === AGREEMENT_STATUS.COMPLETED
            ? 'COMPLETED'
            : found.status === AGREEMENT_STATUS.SENT
              ? 'IN_PROGRESS'
              : 'CLOSED',
        completedAt: found.completedAt ?? null,
        signatures: found.signers.filter((s) => s.signature).length,
        fileMismatch: !!hash,
        canCheckFile: !!found.sealed,
      };
  }
  return { match: 'none', fileGiven: !!hash };
}
