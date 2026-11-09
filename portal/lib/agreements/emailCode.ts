import { randomBytes, randomInt } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import type { Agreement, AgreementSigner } from '@/models/agreements';
import { AGREEMENT_STATUS } from '@/models/agreements';

import { sendAgreementEmail } from './emails';
import {
  agreementByToken,
  AgreementError,
  type Meta,
  metaOf,
  mutate,
  sha256,
} from './server';

/*
 * An email code before signing: when the sender asks for it, a signer's
 * link opens on a "verify it's you" step, and the document shows only once
 * they enter the code emailed to them. Their browser then holds a proof
 * (a cookie) for 12 hours. Signed in to the Portal as the signer, there is
 * no code to enter: the sign-in already says who they are.
 */

export const CODE_MINUTES = 10;
const PROOF_HOURS = 12;
const MAX_TRIES = 5;
const MAX_SENDS_PER_HOUR = 5;

/** The cookie that holds one signer's proof. */
export const proofCookieName = (signerId: string) => `sv_${signerId}`;

/** a•••@gmail.com */
export const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(5, user.length - 1)))}@${domain}`;
};

const codeHash = (signerId: string, code: string) =>
  sha256(`${signerId}:${code}`);

/** Whether this signer still has to enter a code to open it. */
export function codeNeeded(
  agreement: Pick<Agreement, 'emailCode' | 'status'>,
  signer: AgreementSigner,
  opts: { proof?: string | null; signedIn?: boolean },
) {
  if (!agreement.emailCode || opts.signedIn) return false;
  // Once it's closed there is nothing left to sign; the copy still needs
  // the proof, as it holds the whole document.
  return !proofOk(signer, opts.proof);
}

export function proofOk(signer: AgreementSigner, proof?: string | null) {
  const c = signer.emailCode;
  return (
    !!proof &&
    !!c?.proofHash &&
    c.proofHash === sha256(proof) &&
    !!c.proofExpiresAt &&
    c.proofExpiresAt > new Date().toISOString()
  );
}

/** Emails the signer a fresh six-digit code. */
export async function sendSignerCode(token: string, meta: Meta) {
  const found = await agreementByToken(token);
  if (!found) throw new AgreementError(404, 'This link does not exist.');
  if (!found.agreement.emailCode)
    throw new AgreementError(400, 'This document doesn’t ask for a code.');
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
  const updated = await mutate(found.agreement.id, (a) => {
    const s = a.signers.find((x) => x.token === token)!;
    if (a.status === AGREEMENT_STATUS.VOIDED)
      throw new AgreementError(409, 'This document was withdrawn.');
    const sent = (s.emailCode?.sent ?? []).filter((t) => t > hourAgo);
    if (sent.length >= MAX_SENDS_PER_HOUR)
      throw new AgreementError(
        429,
        'Several codes went out in the last hour. Use the latest one, or try again later.',
      );
    const at = now.toISOString();
    return {
      patch: {
        signers: a.signers.map((x) =>
          x.id === s.id
            ? {
                ...x,
                emailCode: {
                  ...(x.emailCode ?? {}),
                  hash: codeHash(s.id, code),
                  expiresAt: new Date(
                    now.getTime() + CODE_MINUTES * 60_000,
                  ).toISOString(),
                  tries: 0,
                  sent: [...sent, at],
                },
              }
            : x,
        ),
      },
      events: [
        {
          at,
          signerId: s.id,
          text: `Email code sent to ${maskEmail(s.email)}`,
          ...metaOf(meta),
        },
      ],
    };
  });
  const signer = updated.signers.find((x) => x.token === token)!;
  const company: { name?: string } | null = await db.company.findFirst({
    where: { id: updated.companyId },
    select: { name: true },
  });
  const error = await sendAgreementEmail(
    {
      kind: 'code',
      to: signer.email,
      firstName: signer.name.split(/\s+/)[0] || signer.name,
      companyName: company?.name || 'The team',
      title: updated.title,
      signUrl: '',
      sender: { name: company?.name || 'The team', email: null },
      code,
      reference: updated.id,
    },
    `agreement-${updated.id}-${signer.id}-code-${now.getTime()}`,
  );
  if (error)
    throw new AgreementError(502, `The code couldn’t be emailed: ${error}`);
  return { sentTo: maskEmail(signer.email), minutes: CODE_MINUTES };
}

/** Checks a code; the right one gives the browser its proof. */
export async function checkSignerCode(
  token: string,
  rawCode: unknown,
  meta: Meta,
) {
  const found = await agreementByToken(token);
  if (!found) throw new AgreementError(404, 'This link does not exist.');
  const code =
    typeof rawCode === 'string' ? rawCode.replace(/\D/g, '').slice(0, 6) : '';
  if (code.length !== 6) throw new AgreementError(400, 'Enter the 6 digits.');
  const proof = randomBytes(24).toString('hex');
  const now = new Date();
  let wrong = false;
  const updated = await mutate(found.agreement.id, (a) => {
    const s = a.signers.find((x) => x.token === token)!;
    const c = s.emailCode;
    if (!c?.hash || !c.expiresAt)
      throw new AgreementError(400, 'Send yourself a code first.');
    if (c.expiresAt < now.toISOString())
      throw new AgreementError(400, 'That code has expired. Send a new one.');
    if ((c.tries ?? 0) >= MAX_TRIES)
      throw new AgreementError(
        429,
        'Too many wrong tries. Send yourself a new code.',
      );
    const at = now.toISOString();
    wrong = c.hash !== codeHash(s.id, code);
    return {
      patch: {
        signers: a.signers.map((x) =>
          x.id === s.id
            ? {
                ...x,
                emailCode: wrong
                  ? { ...c, tries: (c.tries ?? 0) + 1 }
                  : {
                      ...c,
                      hash: null,
                      expiresAt: null,
                      tries: 0,
                      proofHash: sha256(proof),
                      proofExpiresAt: new Date(
                        now.getTime() + PROOF_HOURS * 3_600_000,
                      ).toISOString(),
                      verifiedAt: at,
                    },
              }
            : x,
        ),
      },
      events: wrong
        ? []
        : [
            {
              at,
              signerId: s.id,
              text: `${s.name} entered the code sent to their email`,
              ...metaOf(meta),
            },
          ],
    };
  });
  if (wrong) {
    const left =
      MAX_TRIES -
      (updated.signers.find((x) => x.token === token)?.emailCode?.tries ?? 0);
    throw new AgreementError(
      400,
      left > 0
        ? `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.`
        : 'Too many wrong tries. Send yourself a new code.',
    );
  }
  const signer = updated.signers.find((x) => x.token === token)!;
  return {
    proof,
    cookie: `${proofCookieName(signer.id)}=${proof}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${PROOF_HOURS * 3600}`,
  };
}

/** The proof a request carries for one signer, from its cookies. */
export function proofFrom(cookieHeader: string | null, signerId: string) {
  const name = proofCookieName(signerId);
  for (const part of (cookieHeader ?? '').split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}
