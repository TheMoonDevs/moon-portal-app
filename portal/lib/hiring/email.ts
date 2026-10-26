import { createHmac, timingSafeEqual } from 'crypto';

import { HIRING_EMAIL_STATUS } from '@/models/hiring';

/*
 * Sending candidate emails through Resend's REST API.
 *
 *   RESEND_API_KEY         API key with sending access
 *   HIRING_EMAIL_FROM      sender on a verified domain, e.g. careers@acme.com
 *                          or "Acme Careers <careers@acme.com>"
 *   RESEND_WEBHOOK_SECRET  optional, signing secret of a webhook pointed at
 *                          /api/hiring/emails/webhook for delivery updates
 *   RESEND_API_URL         optional, only to point at a mock while testing
 */

const BATCH_SIZE = 100;

export function emailSettings() {
  const from = process.env.HIRING_EMAIL_FROM?.trim() || null;
  return {
    configured: !!process.env.RESEND_API_KEY && !!from,
    from,
    tracksDelivery: !!process.env.RESEND_WEBHOOK_SECRET,
  };
}

/**
 * The From header. When HIRING_EMAIL_FROM is a bare address the company's
 * name is shown as the sender.
 */
export function fromHeader(companyName: string) {
  const from = emailSettings().from ?? '';
  if (from.includes('<')) return from;
  const name = companyName.replace(/["\\<>,;:@\r\n]/g, '').trim();
  return name ? `${name} <${from}>` : from;
}

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  html: string;
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
    tags: [{ name: 'source', value: 'portal-hiring' }],
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
 * same order. `sendId` makes the call safe to repeat.
 */
export async function sendEmails(
  emails: OutgoingEmail[],
  sendId: string,
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (let start = 0; start < emails.length; start += BATCH_SIZE) {
    const chunk = emails.slice(start, start + BATCH_SIZE);
    results.push(
      ...(await postBatch(chunk, `hiring-${sendId}-${start / BATCH_SIZE}`)),
    );
  }
  return results;
}

/* --------------------------------- webhook -------------------------------- */

/**
 * Checks a Resend (Svix) webhook signature: an HMAC of
 * `<id>.<timestamp>.<body>` keyed with the base64 part of `whsec_…`.
 */
export function verifyWebhook(rawBody: string, headers: Headers): boolean {
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

/** Resend event types and the status each one means. */
export const WEBHOOK_STATUS: Record<string, HIRING_EMAIL_STATUS> = {
  'email.sent': HIRING_EMAIL_STATUS.SENT,
  'email.delivery_delayed': HIRING_EMAIL_STATUS.DELAYED,
  'email.delivered': HIRING_EMAIL_STATUS.DELIVERED,
  'email.opened': HIRING_EMAIL_STATUS.OPENED,
  'email.clicked': HIRING_EMAIL_STATUS.CLICKED,
  'email.bounced': HIRING_EMAIL_STATUS.BOUNCED,
  'email.complained': HIRING_EMAIL_STATUS.COMPLAINED,
  'email.failed': HIRING_EMAIL_STATUS.FAILED,
};

// Events can arrive out of order, so a status only ever moves forward.
const STATUS_RANK: Record<HIRING_EMAIL_STATUS, number> = {
  SENT: 0,
  DELAYED: 1,
  DELIVERED: 2,
  OPENED: 3,
  CLICKED: 4,
  BOUNCED: 10,
  COMPLAINED: 10,
  FAILED: 10,
};

export const isStatusAhead = (
  next: HIRING_EMAIL_STATUS,
  current: HIRING_EMAIL_STATUS,
) => (STATUS_RANK[next] ?? 0) > (STATUS_RANK[current] ?? 0);
