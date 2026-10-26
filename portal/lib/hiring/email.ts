import {
  fromHeader,
  isResendConfigured,
  isResendWebhookConfigured,
  senderAddress,
} from '@/lib/email/resend';
import { HIRING_EMAIL_STATUS } from '@/models/hiring';

/*
 * Candidate emails go out from careers@<RESEND_DOMAIN> with the company's
 * name as the sender. Sending itself lives in lib/email/resend.
 */

const HIRING_SENDER = 'careers';

export function hiringEmailSettings() {
  return {
    configured: isResendConfigured(),
    from: senderAddress(HIRING_SENDER),
    tracksDelivery: isResendWebhookConfigured(),
  };
}

/** The From header for a company's candidate emails. */
export const hiringFrom = (companyName: string) =>
  fromHeader(senderAddress(HIRING_SENDER) ?? '', companyName);

/** Tag on every hiring email, so Resend's logs show where it came from. */
export const HIRING_EMAIL_TAGS = [{ name: 'source', value: 'portal-hiring' }];

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
