import { AGREEMENT_STATUS, SIGNER_STATUS } from '@/models/agreements';

import type { PillTone } from '../shared/AdminUI';

/* How agreement and signer states read in the Agreements tab. */

export const STATUS_META: Record<
  AGREEMENT_STATUS,
  { label: string; tone: PillTone; icon: string }
> = {
  [AGREEMENT_STATUS.SENT]: {
    label: 'Out for signing',
    tone: 'warning',
    icon: 'pending',
  },
  [AGREEMENT_STATUS.COMPLETED]: {
    label: 'Signed',
    tone: 'positive',
    icon: 'task_alt',
  },
  [AGREEMENT_STATUS.DECLINED]: {
    label: 'Declined',
    tone: 'danger',
    icon: 'block',
  },
  [AGREEMENT_STATUS.VOIDED]: {
    label: 'Withdrawn',
    tone: 'neutral',
    icon: 'cancel',
  },
  [AGREEMENT_STATUS.EXPIRED]: {
    label: 'Expired',
    tone: 'neutral',
    icon: 'timer_off',
  },
};

export const SIGNER_META: Record<
  SIGNER_STATUS,
  { label: string; tone: PillTone }
> = {
  [SIGNER_STATUS.WAITING]: { label: 'Signs later', tone: 'neutral' },
  [SIGNER_STATUS.PENDING]: { label: 'Sent', tone: 'info' },
  [SIGNER_STATUS.VIEWED]: { label: 'Opened', tone: 'purple' },
  [SIGNER_STATUS.SIGNED]: { label: 'Signed', tone: 'positive' },
  [SIGNER_STATUS.DECLINED]: { label: 'Declined', tone: 'danger' },
};

export const when = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

export const day = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/** Whether a row still waits on the company's signature. */
export const waitsOnCompany = (row: {
  status: AGREEMENT_STATUS;
  signers: Array<{ company: boolean; status: SIGNER_STATUS }>;
}) =>
  row.status === AGREEMENT_STATUS.SENT &&
  row.signers.some(
    (s) =>
      s.company &&
      (s.status === SIGNER_STATUS.PENDING || s.status === SIGNER_STATUS.VIEWED),
  );
