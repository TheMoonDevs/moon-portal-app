import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { nowIso } from '@/lib/workspace/server';
import {
  type Agreement,
  AGREEMENT_STATUS,
  type AgreementSigner,
  SIGNER_STATUS,
} from '@/models/agreements';

import {
  agreementByToken,
  AgreementError,
  emailSigners,
  emailTeam,
  isDay,
  isEmail,
  type Meta,
  metaOf,
  mutate,
  newToken,
  notifySigners,
  OPEN_SIGNER,
  requireAgreements,
  sha256,
  signersUp,
  text,
} from './server';
import { MAX_AGREEMENT_BODY, MAX_AGREEMENT_TITLE } from './templates';

/*
 * Fixing an agreement after it went out, without starting over:
 *
 *   correctSigner  the sender fixes a signer's name or a wrong email; the
 *                  old link stops working and the new address gets its own
 *   handOver       a signer passes it to the colleague who should sign
 *   correctText    the sender fixes a typo; anyone who signed the old text
 *                  signs again, and the old text is kept for the record
 *   setEndDate     when a contract or NDA term ends, for the alerts
 *
 * Every change lands in the audit trail.
 */

const userIdFor = async (email: string) =>
  (
    await db.user.findFirst({
      where: { OR: [{ email }, { linkedEmails: email }] },
      select: { id: true },
    })
  )?.id ?? null;

const isUp = (s: AgreementSigner) =>
  s.status === SIGNER_STATUS.PENDING || s.status === SIGNER_STATUS.VIEWED;

/** Puts a new person in a signer's place: new link, nothing signed. */
async function replaceSigner(
  a: Agreement,
  signerId: string,
  next: { name: string; email: string },
) {
  const s = a.signers.find((x) => x.id === signerId);
  if (!s) throw new AgreementError(404, 'That signer is not on it.');
  if (a.status !== AGREEMENT_STATUS.SENT)
    throw new AgreementError(409, 'Only an agreement out for signing.');
  if (s.signature) throw new AgreementError(409, `${s.name} already signed.`);
  if (a.signers.some((x) => x.id !== s.id && x.email === next.email))
    throw new AgreementError(400, `${next.email} already signs this one.`);
  const userId =
    s.company && next.email === s.email
      ? s.userId
      : await userIdFor(next.email);
  const at = nowIso();
  const replaced: AgreementSigner = {
    ...s,
    name: next.name,
    email: next.email,
    userId: userId ?? null,
    token: next.email === s.email ? s.token : newToken(),
    status: isUp(s) ? SIGNER_STATUS.PENDING : s.status,
    notifiedAt: isUp(s) ? at : s.notifiedAt,
    viewedAt: next.email === s.email ? s.viewedAt : null,
    remindedAt: null,
    autoReminders: [],
    // A new person proves who they are with their own email code.
    emailCode: next.email === s.email ? (s.emailCode ?? null) : null,
  };
  return { before: s, after: replaced, at };
}

const parsePerson = (raw: { name?: unknown; email?: unknown }) => {
  const name = text(raw.name, 120);
  const email = text(raw.email, 200).toLowerCase();
  if (!name) throw new AgreementError(400, 'Add their full name.');
  if (!isEmail(email)) throw new AgreementError(400, 'Add a valid email.');
  return { name, email };
};

/** The sender fixes a signer's name or email before they sign. */
export async function correctSigner(
  actor: SessionUser,
  agreement: Agreement,
  signerId: string,
  raw: { name?: unknown; email?: unknown; note?: unknown },
  origin: string,
) {
  await requireAgreements(actor, agreement.companyId, 'agreements:edit');
  const person = parsePerson(raw);
  const note = text(raw.note, 300) || null;
  const out: { change?: Awaited<ReturnType<typeof replaceSigner>> } = {};
  const updated = await mutate(agreement.id, async (a) => {
    const change = await replaceSigner(a, signerId, person);
    out.change = change;
    const { before, after, at } = change;
    if (before.name === after.name && before.email === after.email)
      throw new AgreementError(400, 'Nothing changed.');
    const signers = a.signers.map((x) => (x.id === before.id ? after : x));
    return {
      patch: {
        signers,
        signerTokens: signers.map((x) => x.token),
        corrections: [
          ...(a.corrections ?? []),
          {
            at,
            byUserId: actor.id,
            kind: 'signer' as const,
            note,
            signer: { id: before.id, name: before.name, email: before.email },
          },
        ],
      },
      events: [
        {
          at,
          byUserId: actor.id,
          text: `${actor.name || 'Someone'} changed a signer from ${before.name} (${before.email}) to ${after.name} (${after.email})${
            before.token !== after.token ? '; the old link no longer works' : ''
          }${note ? `: ${note}` : ''}`,
        },
      ],
    };
  });
  const { before, after } = out.change!;
  // Their turn already: the corrected address gets the link now.
  let emailErrors: Array<{ email: string; error: string }> = [];
  if (isUp(after)) {
    const fresh = updated.signers.find((x) => x.id === after.id)!;
    emailErrors = await emailSigners(updated, [fresh], 'request', origin);
    if (before.email !== after.email)
      await notifySigners(updated, [fresh], origin).catch((e) =>
        console.error('[agreements] notify', e),
      );
  }
  return { agreement: updated, emailErrors };
}

/**
 * A signer hands it over to the colleague who should sign instead, from
 * their own link. The sender is told.
 */
export async function handOver(
  token: string,
  raw: { name?: unknown; email?: unknown; reason?: unknown },
  meta: Meta,
  origin: string,
) {
  const found = await agreementByToken(token);
  if (!found) throw new AgreementError(404, 'This link does not exist.');
  const person = parsePerson(raw);
  const reason = text(raw.reason, 500) || null;
  if (person.email === found.signer.email)
    throw new AgreementError(400, 'That is you. Give their email.');
  const out: { from: string; to?: AgreementSigner } = { from: '' };
  const updated = await mutate(found.agreement.id, async (a) => {
    const s = a.signers.find((x) => x.token === token)!;
    if (!signersUp(a).some((x) => x.id === s.id))
      throw new AgreementError(
        409,
        'You can hand it over when it is your turn.',
      );
    const { before, after, at } = await replaceSigner(a, s.id, person);
    out.from = before.name;
    const handed: AgreementSigner = {
      ...after,
      handedOverFrom: { name: before.name, email: before.email, at },
      // A colleague of the company's signer signs for the company too.
      role: before.role,
    };
    out.to = handed;
    const signers = a.signers.map((x) => (x.id === s.id ? handed : x));
    return {
      patch: { signers, signerTokens: signers.map((x) => x.token) },
      events: [
        {
          at,
          signerId: s.id,
          text: `${before.name} handed it over to ${handed.name} (${handed.email}) to sign${
            reason ? `: ${reason}` : ''
          }`,
          ...metaOf(meta),
        },
      ],
    };
  });
  const fresh = updated.signers.find((x) => x.id === out.to!.id)!;
  const emailErrors = await emailSigners(updated, [fresh], 'request', origin);
  await notifySigners(updated, [fresh], origin).catch((e) =>
    console.error('[agreements] notify', e),
  );
  await emailTeam(updated, 'handedOver', origin, {
    declinedBy: out.from,
    reason,
    handedOverTo: fresh.name,
  });
  return { agreement: updated, emailErrors, to: fresh.name };
}

/**
 * The sender corrects the title or text while it is out for signing. Anyone
 * who already signed signs again, since they signed other words; the old
 * text and its fingerprint are kept.
 */
export async function correctText(
  actor: SessionUser,
  agreement: Agreement,
  raw: { title?: unknown; body?: unknown; note?: unknown },
  origin: string,
) {
  await requireAgreements(actor, agreement.companyId, 'agreements:edit');
  const title = text(raw.title, MAX_AGREEMENT_TITLE);
  const body =
    typeof raw.body === 'string'
      ? raw.body.slice(0, MAX_AGREEMENT_BODY).trim()
      : '';
  const note = text(raw.note, 500) || null;
  if (!title || !body)
    throw new AgreementError(400, 'Add a title and the agreement text.');
  const out: { cleared: string[]; up: AgreementSigner[] } = {
    cleared: [],
    up: [],
  };
  const updated = await mutate(agreement.id, (a) => {
    if (a.status !== AGREEMENT_STATUS.SENT)
      throw new AgreementError(409, 'Only an agreement out for signing.');
    if (a.document)
      throw new AgreementError(
        409,
        'An uploaded PDF can’t be edited here. Withdraw it and send the corrected PDF.',
      );
    if (a.title === title && a.body === body)
      throw new AgreementError(400, 'Nothing changed.');
    const at = nowIso();
    const cleared = a.signers.filter((s) => s.signature).map((s) => s.name);
    out.cleared = cleared;
    // Back to the start: nobody has signed these words yet.
    const reset = a.signers.map((s) => ({
      ...s,
      status: SIGNER_STATUS.WAITING,
      signature: null,
      values: null,
      viewedAt: null,
      autoReminders: [],
    }));
    const next = new Set(
      signersUp({ ...a, signers: reset } as Agreement).map((s) => s.id),
    );
    const signers = reset.map((s) =>
      next.has(s.id)
        ? { ...s, status: SIGNER_STATUS.PENDING, notifiedAt: at }
        : s,
    );
    out.up = signers.filter((s) => next.has(s.id));
    return {
      patch: {
        title,
        body,
        hash: sha256(body),
        signers,
        corrections: [
          ...(a.corrections ?? []),
          {
            at,
            byUserId: actor.id,
            kind: 'text' as const,
            note,
            previous: { title: a.title, body: a.body, hash: a.hash },
          },
        ],
      },
      events: [
        {
          at,
          byUserId: actor.id,
          text: `${actor.name || 'Someone'} corrected the text${note ? `: ${note}` : ''}. The earlier version (SHA-256 ${a.hash.slice(0, 12)}…) is kept${
            cleared.length
              ? `; ${cleared.join(', ')} ${cleared.length === 1 ? 'signs' : 'sign'} again`
              : ''
          }`,
        },
      ],
    };
  });
  const up = updated.signers.filter((s) => out.up.some((u) => u.id === s.id));
  const emailErrors = await emailSigners(updated, up, 'corrected', origin, {
    reason: note,
  });
  await notifySigners(updated, up, origin).catch((e) =>
    console.error('[agreements] notify', e),
  );
  return { agreement: updated, emailErrors, signAgain: out.cleared };
}

/** When a contract or NDA term ends, or no end date. Any status. */
export async function setEndDate(
  actor: SessionUser,
  agreement: Agreement,
  endsOn: unknown,
) {
  await requireAgreements(actor, agreement.companyId, 'agreements:edit');
  const day =
    endsOn === null || endsOn === ''
      ? null
      : isDay(endsOn)
        ? endsOn
        : undefined;
  if (day === undefined) throw new AgreementError(400, 'Pick a date.');
  return mutate(agreement.id, () => ({
    patch: { endsOn: day, endAlerts: [] },
    events: [
      {
        byUserId: actor.id,
        text: day
          ? `${actor.name || 'Someone'} set it to end on ${day}`
          : `${actor.name || 'Someone'} removed its end date`,
      },
    ],
  }));
}

export const isOpenSigner = (s: AgreementSigner) =>
  OPEN_SIGNER.includes(s.status);
