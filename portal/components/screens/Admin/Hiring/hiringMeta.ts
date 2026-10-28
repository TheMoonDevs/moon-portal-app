import type { JobApplication, JobOpening } from '@db/client';

import {
  type APPLICATION_STAGE,
  FORM_FIELD_TYPE,
  type HIRING_EMAIL_STATUS,
} from '@/models/hiring';

import type { PillTone } from '../shared/AdminUI';

export type StageCounts = Record<APPLICATION_STAGE, number> & {
  total: number;
};

export type OpeningRow = JobOpening & { counts: StageCounts };
export type ApplicationRow = JobApplication;

export const STAGE_META: Record<
  APPLICATION_STAGE,
  { label: string; tone: PillTone; icon: string; color: string }
> = {
  APPLIED: { label: 'Applied', tone: 'info', icon: 'inbox', color: '#0ea5e9' },
  SHORTLISTED: {
    label: 'Shortlisted',
    tone: 'purple',
    icon: 'star',
    color: '#a855f7',
  },
  TASK: {
    label: 'Task',
    tone: 'warning',
    icon: 'assignment',
    color: '#f59e0b',
  },
  TASK_REVIEW: {
    label: 'Task review',
    tone: 'info',
    icon: 'rate_review',
    color: '#6366f1',
  },
  INTERVIEW: {
    label: 'Interview',
    tone: 'warning',
    icon: 'forum',
    color: '#f97316',
  },
  OFFER: {
    label: 'Offer',
    tone: 'positive',
    icon: 'handshake',
    color: '#14b8a6',
  },
  HIRED: {
    label: 'Hired',
    tone: 'positive',
    icon: 'verified',
    color: '#10b981',
  },
  REJECTED: {
    label: 'Rejected',
    tone: 'danger',
    icon: 'block',
    color: '#f43f5e',
  },
};

export const EMAIL_STATUS_META: Record<
  HIRING_EMAIL_STATUS,
  { label: string; tone: PillTone; icon: string; hint: string }
> = {
  SENT: {
    label: 'Sent',
    tone: 'neutral',
    icon: 'send',
    hint: 'Handed to the email service.',
  },
  DELAYED: {
    label: 'Delayed',
    tone: 'warning',
    icon: 'schedule',
    hint: 'Their mail server hasn’t accepted it yet. It will keep trying.',
  },
  DELIVERED: {
    label: 'Delivered',
    tone: 'info',
    icon: 'mark_email_unread',
    hint: 'In their inbox.',
  },
  OPENED: {
    label: 'Opened',
    tone: 'positive',
    icon: 'mark_email_read',
    hint: 'They opened it.',
  },
  CLICKED: {
    label: 'Clicked',
    tone: 'positive',
    icon: 'ads_click',
    hint: 'They opened it and clicked a link.',
  },
  BOUNCED: {
    label: 'Bounced',
    tone: 'danger',
    icon: 'unsubscribe',
    hint: 'Their address rejected it. Check the email address.',
  },
  COMPLAINED: {
    label: 'Marked as spam',
    tone: 'danger',
    icon: 'report',
    hint: 'They marked it as spam.',
  },
  FAILED: {
    label: 'Failed',
    tone: 'danger',
    icon: 'error',
    hint: 'It was not sent.',
  },
};

export const OPENING_STATUS_META: Record<
  string,
  { label: string; tone: PillTone; hint: string }
> = {
  DRAFT: {
    label: 'Draft',
    tone: 'neutral',
    hint: 'Only your team can see it. The apply link does not work yet.',
  },
  OPEN: {
    label: 'Open',
    tone: 'positive',
    hint: 'Anyone with the link can apply.',
  },
  CLOSED: {
    label: 'Closed',
    tone: 'warning',
    hint: 'The apply page says applications are closed.',
  },
  ARCHIVED: {
    label: 'Archived',
    tone: 'neutral',
    hint: 'Hidden from the hiring tab.',
  },
};

/** Common questions HR can add with one click. */
export const QUESTION_PRESETS: Array<{
  label: string;
  type: FORM_FIELD_TYPE;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}> = [
  { label: 'Resume / CV', type: FORM_FIELD_TYPE.FILE, required: true },
  { label: 'Phone number', type: FORM_FIELD_TYPE.PHONE },
  { label: 'LinkedIn profile', type: FORM_FIELD_TYPE.URL },
  { label: 'Portfolio or GitHub', type: FORM_FIELD_TYPE.URL },
  { label: 'Years of experience', type: FORM_FIELD_TYPE.NUMBER },
  { label: 'Current location', type: FORM_FIELD_TYPE.SHORT_TEXT },
  {
    label: 'Notice period',
    type: FORM_FIELD_TYPE.SELECT,
    options: ['Immediate', '15 days', '30 days', '60 days', '90 days'],
  },
  { label: 'Expected salary', type: FORM_FIELD_TYPE.SHORT_TEXT },
  { label: 'Why do you want to join us?', type: FORM_FIELD_TYPE.LONG_TEXT },
];

export const applyUrl = (slug: string) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/apply/${slug}`;

/** The hiring team's preview of an opening's task page, as a candidate sees it. */
export const taskPreviewUrl = (openingId: string) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/task/preview/${openingId}`;

export const timeAgo = (value?: string | Date | null) => {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
};
