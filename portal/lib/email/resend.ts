import { createHmac, timingSafeEqual } from 'crypto';

/*
 * Email through Resend's REST API, shared by every feature that sends mail.
 * Each feature picks its own sender on the one verified domain, e.g.
 * careers@ for hiring.
 *
 *   RESEND_API_KEY         API key with sending access
 *   RESEND_DOMAIN          domain verified in Resend, e.g. example.com
 *   RESEND_WEBHOOK_SECRET  optional, signing secret of a Resend webhook, for
 *                          delivery updates
 *   RESEND_API_URL         optional, only to point at a mock while testing
 */

const BATCH_SIZE = 100;

export const resendDomain = () =>
  process.env.RESEND_DOMAIN?.trim().replace(/^@/, '').toLowerCase() || null;

/** Whether mail can be sent at all. */
export const isResendConfigured = () =>
  !!process.env.RESEND_API_KEY && !!resendDomain();

/** Whether Resend's webhook is set up to report delivery. */
export const isResendWebhookConfigured = () =>
  !!process.env.RESEND_WEBHOOK_SECRET;

/** `<local>@<RESEND_DOMAIN>`, or null while the domain isn't set. */
export const senderAddress = (local: string) => {
  const domain = resendDomain();
  return domain ? `${local}@${domain}` : null;
};

/** A From header such as `Acme <careers@example.com>`. */
export const fromHeader = (address: string, displayName?: string | null) => {
  const name = (displayName ?? '').replace(/["\\<>,;:@\r\n]/g, '').trim();
  return name ? `${name} <${address}>` : address;
};

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  html: string;
  /** Shown in Resend's logs and sent back with webhook events. */
  tags?: Array<{ name: string; value: string }>;
}

export type SendResult =
  | { id: string; error?: never }
  | { id?: never; error: string };

const apiUrl = () =>
  (process.env.RESEND_API_URL || 'https://api.resend.com').replace(/\/$/, '');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postBatch(
  emails: OutgoingEmail[],
  idempotencyKey: string,
): Promise<SendResult[]> {
  const payload = emails.map((email) => ({
    from: email.from,
    to: [email.to],
    subject: email.subject,
    text: email.text,
    html: email.html,
    ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    ...(email.tags?.length ? { tags: email.tags } : {}),
  }));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(`${apiUrl()}/emails/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          // Resend answers a repeat of the same key with the first result
          // instead of sending again, so a retry can't double send.
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      if (attempt < 2) {
        await wait(1000 * (attempt + 1));
        continue;
      }
      return emails.map(() => ({
        error: 'Could not reach the email service.',
      }));
    }

    const body = await res.json().catch(() => null);
    if (res.ok) {
      const ids: Array<{ id?: string }> = body?.data ?? [];
      return emails.map((_, i) =>
        ids[i]?.id ? { id: ids[i].id as string } : { error: 'No id returned.' },
      );
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await wait(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter, 5) * 1000
          : 1000 * (attempt + 1),
      );
      continue;
    }
    const message =
      (typeof body?.message === 'string' && body.message) ||
      `The email service answered ${res.status}.`;
    return emails.map(() => ({ error: message }));
  }
  return emails.map(() => ({ error: 'The email service is busy.' }));
}

/**
 * Sends one email per entry, in batches of 100. Results come back in the
 * same order. Calling again with the same `idempotencyKey` within a day
 * never sends twice.
 */
export async function sendEmails(
  emails: OutgoingEmail[],
  idempotencyKey: string,
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (let start = 0; start < emails.length; start += BATCH_SIZE) {
    const chunk = emails.slice(start, start + BATCH_SIZE);
    results.push(
      ...(await postBatch(chunk, `${idempotencyKey}-${start / BATCH_SIZE}`)),
    );
  }
  return results;
}

/**
 * Checks a Resend (Svix) webhook signature: an HMAC of
 * `<id>.<timestamp>.<body>` keyed with the base64 part of `whsec_…`.
 */
export function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signatures = headers.get('svix-signature');
  if (!secret || !id || !timestamp || !signatures) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();

  return signatures.split(' ').some((entry) => {
    const [version, signature] = entry.split(',');
    if (version !== 'v1' || !signature) return false;
    const given = Buffer.from(signature, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
