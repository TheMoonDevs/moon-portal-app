import { fromHeader, sendEmail, senderAddress } from '@/lib/email/resend';
import { db } from '@/lib/mongodb/db-client';
import { localClock } from '@/lib/push/dayReminders';
import type { JobApplication, JobOpening } from '@/models/hiring';
import {
  APPLICATION_STAGE,
  HIRING_DIGEST_FREQUENCY,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import { MEMBER_STATUS } from '@/models/workspace';

import {
  DEFAULT_DIGEST_FREQUENCY,
  DIGEST_FREQUENCY_LABELS,
  isDigestFrequency,
} from './digestFrequency';
import { hiringEmailSettings } from './email';
import { escapeHtml } from './emailTemplates';
import { taskDueAt } from './tasks';

/*
 * The hiring digest: each hiring lead gets one email covering every opening
 * they lead, with the tasks waiting for review (linked) and a count of
 * everyone else in the pipeline. Run by /api/cron/hiring-digest (see
 * vercel.json) each morning; each lead picks how often in Settings → Hiring
 * preferences (every 2 days by default). Leads with nothing to review or
 * screen get no email that morning, and the next one goes out once there is.
 */

const DIGEST_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

const EVERY_DAYS: Partial<Record<HIRING_DIGEST_FREQUENCY, number>> = {
  DAILY: 1,
  EVERY_2_DAYS: 2,
  EVERY_3_DAYS: 3,
};

/**
 * Whether a lead's digest is due on `date` (YYYY-MM-DD), given the day the
 * last one went out. Weekly goes on Mondays and monthly on the 1st.
 */
export function isDigestDue(
  frequency: HIRING_DIGEST_FREQUENCY,
  date: string,
  sentOn?: string | null,
) {
  if (sentOn === date) return false;
  const day = new Date(`${date}T00:00:00Z`);
  if (frequency === HIRING_DIGEST_FREQUENCY.WEEKLY)
    return day.getUTCDay() === 1;
  if (frequency === HIRING_DIGEST_FREQUENCY.MONTHLY)
    return day.getUTCDate() === 1;
  const every = EVERY_DAYS[frequency];
  if (!every) return false;
  if (!sentOn) return true;
  return (
    Math.round((day.getTime() - Date.parse(`${sentOn}T00:00:00Z`)) / DAY_MS) >=
    every
  );
}

export const portalOrigin = () =>
  (
    process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://portal.themoondevs.com'
  ).replace(/\/$/, '');

const openingLink = (origin: string, o: Pick<JobOpening, 'id' | 'companyId'>) =>
  `${origin}/admin?tab=hiring&company=${o.companyId}&opening=${o.id}`;

const applicantLink = (
  origin: string,
  a: Pick<JobApplication, 'id' | 'companyId' | 'openingId'>,
) =>
  `${origin}/admin?tab=hiring&company=${a.companyId}&opening=${a.openingId}&application=${a.id}`;

const daysAgo = (value: unknown, now: Date) => {
  const at = new Date(String(value ?? '')).getTime();
  if (Number.isNaN(at)) return '';
  const days = Math.floor((now.getTime() - at) / DAY_MS);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

type Person = { name: string; href: string; when: string };

interface OpeningDigest {
  opening: JobOpening;
  company: string;
  /** Sent their task back, oldest first: the only list with names. */
  review: Person[];
  /** The rest are counts. */
  screen: number;
  /** Task emailed, not sent back yet. */
  onTask: number;
  pastDue: number;
  interview: number;
}

type Totals = Record<'review' | 'screen' | 'onTask' | 'interview', number>;

export interface LeadDigest {
  lead: {
    id: string;
    name: string;
    email: string;
    frequency: HIRING_DIGEST_FREQUENCY;
    sentOn: string | null;
  };
  openings: OpeningDigest[];
  totals: Totals;
}

/** What each hiring lead's digest would say right now. */
export async function buildDigests(now = new Date()): Promise<LeadDigest[]> {
  const origin = portalOrigin();

  const openings: JobOpening[] = await db.jobOpening.findMany({
    where: {
      status: { in: [JOB_OPENING_STATUS.OPEN, JOB_OPENING_STATUS.CLOSED] },
      hiringLeadId: { notIn: [null, ''] },
    },
  });
  if (!openings.length) return [];

  const leadIds = Array.from(
    new Set(openings.map((o) => o.hiringLeadId as string)),
  );
  const companyIds = Array.from(new Set(openings.map((o) => o.companyId)));
  const [applications, leads, companies, members] = await Promise.all([
    db.jobApplication.findMany({
      where: {
        openingId: { in: openings.map((o) => o.id) },
        stage: {
          in: [
            APPLICATION_STAGE.APPLIED,
            APPLICATION_STAGE.TASK,
            APPLICATION_STAGE.TASK_REVIEW,
            APPLICATION_STAGE.INTERVIEW,
          ],
        },
      },
      select: {
        id: true,
        companyId: true,
        openingId: true,
        name: true,
        stage: true,
        taskSentAt: true,
        taskSubmission: true,
      },
    }) as Promise<JobApplication[]>,
    db.user.findMany({ where: { id: { in: leadIds } } }) as Promise<
      Array<{
        id: string;
        name?: string | null;
        email?: string | null;
        hiringDigest?: string | null;
        hiringDigestSentOn?: string | null;
      }>
    >,
    db.company.findMany({ where: { id: { in: companyIds } } }) as Promise<
      Array<{ id: string; name?: string | null }>
    >,
    db.companyMember.findMany({
      where: {
        companyId: { in: companyIds },
        userId: { in: leadIds },
        status: MEMBER_STATUS.ACTIVE,
      },
      select: { companyId: true, userId: true },
    }) as Promise<Array<{ companyId: string; userId: string }>>,
  ]);

  const companyName = new Map(companies.map((c) => [c.id, c.name ?? '']));
  const isMember = new Set(members.map((m) => `${m.companyId}:${m.userId}`));
  const byOpening = new Map<string, JobApplication[]>();
  for (const a of applications) {
    const list = byOpening.get(a.openingId) ?? [];
    list.push(a);
    byOpening.set(a.openingId, list);
  }

  const time = (value: unknown) => new Date(String(value ?? '')).getTime() || 0;

  const digests: LeadDigest[] = [];
  for (const lead of leads) {
    if (!lead.email) continue;
    const led = openings.filter(
      (o) =>
        o.hiringLeadId === lead.id && isMember.has(`${o.companyId}:${lead.id}`),
    );
    const rows: OpeningDigest[] = led.map((opening) => {
      const apps = byOpening.get(opening.id) ?? [];
      const inStage = (stage: APPLICATION_STAGE) =>
        apps.filter((a) => a.stage === stage);
      const onTask = inStage(APPLICATION_STAGE.TASK).filter(
        (a) => !a.taskSubmission,
      );
      return {
        opening,
        company: companyName.get(opening.companyId) ?? '',
        review: inStage(APPLICATION_STAGE.TASK_REVIEW)
          .sort(
            (a, b) =>
              time(a.taskSubmission?.submittedAt) -
              time(b.taskSubmission?.submittedAt),
          )
          .map((a) => ({
            name: a.name,
            href: applicantLink(origin, a),
            when: daysAgo(a.taskSubmission?.submittedAt, now),
          })),
        screen: inStage(APPLICATION_STAGE.APPLIED).length,
        onTask: onTask.length,
        pastDue: onTask.filter((a) => {
          const due = taskDueAt(opening.task, a.taskSentAt);
          return !!due && due < now;
        }).length,
        interview: inStage(APPLICATION_STAGE.INTERVIEW).length,
      };
    });
    const sum = (pick: (r: OpeningDigest) => number) =>
      rows.reduce((n, r) => n + pick(r), 0);
    const totals: Totals = {
      review: sum((r) => r.review.length),
      screen: sum((r) => r.screen),
      onTask: sum((r) => r.onTask),
      interview: sum((r) => r.interview),
    };
    if (!totals.review && !totals.screen) continue;
    // Most to review first, then most to screen.
    rows.sort(
      (a, b) => b.review.length - a.review.length || b.screen - a.screen,
    );
    digests.push({
      lead: {
        id: lead.id,
        name: lead.name ?? '',
        email: lead.email,
        frequency: isDigestFrequency(lead.hiringDigest)
          ? lead.hiringDigest
          : DEFAULT_DIGEST_FREQUENCY,
        sentOn: lead.hiringDigestSentOn ?? null,
      },
      openings: rows,
      totals,
    });
  }
  return digests;
}

/* -------------------------------- the email ------------------------------- */

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

/** One green, lighter to darker along the pipeline, like GitHub's graph. */
const ACCENT = '#216e39';

/** The pipeline columns every opening shows, in order. */
const COLUMNS: Array<{ key: keyof Totals; label: string; color: string }> = [
  { key: 'screen', label: 'To screen', color: '#9be9a8' },
  { key: 'onTask', label: 'On task', color: '#40c463' },
  { key: 'review', label: 'To review', color: '#30a14e' },
  { key: 'interview', label: 'Interview', color: '#216e39' },
];

const count = (r: OpeningDigest, key: keyof Totals) =>
  key === 'review' ? r.review.length : r[key];

export function digestSubject({ totals }: LeadDigest) {
  const parts = [
    totals.review && `${plural(totals.review, 'task')} to review`,
    totals.screen && `${totals.screen} to screen`,
  ].filter(Boolean);
  return `Hiring: ${parts.join(', ')}`;
}

export function digestText(d: LeadDigest, origin = portalOrigin()) {
  const out: string[] = [`Hi ${firstName(d.lead.name)},`];
  const toReview = d.openings.filter((r) => r.review.length);
  if (toReview.length) {
    const lines = ['Tasks to review:'];
    for (const r of toReview)
      for (const p of r.review)
        lines.push(`- ${p.name} (${r.opening.title}), ${p.when}: ${p.href}`);
    out.push(lines.join('\n'));
  }
  out.push(
    [
      'Your openings:',
      ...d.openings.map(
        (r) =>
          `- ${r.opening.title}: ${COLUMNS.filter((c) => count(r, c.key))
            .map((c) => `${count(r, c.key)} ${c.label.toLowerCase()}`)
            .join(', ')}${r.pastDue ? ` (${r.pastDue} past due)` : ''}`,
      ),
      `Hiring: ${origin}/admin?tab=hiring`,
    ].join('\n'),
  );
  out.push(
    `${DIGEST_FREQUENCY_LABELS[d.lead.frequency]}, for the openings you lead. Change how often: ${origin}/settings#hiring`,
  );
  return out.join('\n\n');
}

export function digestHtml(d: LeadDigest, origin = portalOrigin()) {
  const e = escapeHtml;
  const link = (href: string, text: string, style = '') =>
    `<a href="${e(href)}" style="color:${ACCENT};text-decoration:none;${style}">${e(text)}</a>`;
  const muted = (text: string) =>
    `<span style="color:#a1a1aa">${e(text)}</span>`;

  const tiles = COLUMNS.map(
    (c) =>
      `<td style="padding:10px 4px;background:#f4f4f5;border-radius:10px;text-align:center;width:25%;border-top:3px solid ${c.color}"><div style="font-size:22px;font-weight:700;line-height:1.2">${d.totals[c.key]}</div><div style="font-size:12px;color:#71717a">${c.label}</div></td>`,
  ).join('');

  const reviewRows = d.openings
    .flatMap((r) =>
      r.review.map(
        (p) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5">${link(p.href, p.name, 'font-weight:600')}<br>${muted(r.opening.title)}</td><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;font-size:13px">${muted(p.when)}</td></tr>`,
      ),
    )
    .join('');

  // One stacked bar per opening, segments sized by count.
  const bar = (r: OpeningDigest) => {
    const total = COLUMNS.reduce((n, c) => n + count(r, c.key), 0);
    if (!total)
      return `<div style="height:8px;border-radius:4px;background:#f4f4f5"></div>`;
    const cells = COLUMNS.filter((c) => count(r, c.key))
      .map(
        (c) =>
          `<td style="height:8px;background:${c.color};width:${(count(r, c.key) / total) * 100}%"></td>`,
      )
      .join('');
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:4px;overflow:hidden"><tr>${cells}</tr></table>`;
  };
  const openingRows = d.openings
    .map(
      (r) =>
        `<div style="padding:10px 0;border-bottom:1px solid #f4f4f5"><div style="font-size:14px;font-weight:600;margin:0 0 6px">${link(openingLink(origin, r.opening), r.opening.title, 'color:#18181b')}</div>${bar(r)}<div style="font-size:12px;color:#71717a;margin-top:6px">${COLUMNS.filter(
          (c) => count(r, c.key),
        )
          .map(
            (c) =>
              `<span style="white-space:nowrap"><span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${c.color}"></span> ${count(r, c.key)} ${c.label.toLowerCase()}</span>`,
          )
          .join(
            ' &nbsp; ',
          )}${r.pastDue ? ` &nbsp; <b style="color:#18181b">${r.pastDue} past due</b>` : ''}</div></div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;color:#18181b;font-size:15px;line-height:1.5">
<p style="margin:0 0 14px">Hi ${e(firstName(d.lead.name))}, here's your hiring at a glance.</p>
<table role="presentation" width="100%" cellspacing="6" cellpadding="0" style="margin:0 -6px 18px"><tr>${tiles}</tr></table>
${reviewRows ? `<p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${ACCENT}">Tasks to review</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px">${reviewRows}</table>` : ''}
<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#71717a">Your openings</p>
${openingRows}
</div><p style="max-width:560px;margin:16px auto 0;text-align:center;color:#a1a1aa;font-size:12px;line-height:1.5">${e(DIGEST_FREQUENCY_LABELS[d.lead.frequency])}, for the openings you lead. ${link(`${origin}/settings#hiring`, 'Change how often', 'color:#71717a;text-decoration:underline')}</p></body></html>`;
}

/* -------------------------------- sending -------------------------------- */

export interface DigestRun {
  date: string;
  sent: Array<{ to: string; subject: string; id?: string; error?: string }>;
  /** Filled for a dry run: what each lead would get today. */
  preview?: Array<{ to: string; subject: string; text: string }>;
}

/**
 * Sends the digests due today by each lead's chosen frequency (`force` sends
 * to every lead not set to off). A dry run sends nothing and returns what
 * would go out. Running twice on one day never sends twice: the day sent is
 * kept on the lead, and each email's idempotency key is the lead and date.
 */
export async function runHiringDigest({
  now = new Date(),
  force = false,
  dryRun = false,
} = {}): Promise<DigestRun> {
  const { date } = localClock(DIGEST_TIMEZONE, now);
  const run: DigestRun = { date, sent: [] };

  const digests = (await buildDigests(now)).filter(
    (d) =>
      d.lead.frequency !== HIRING_DIGEST_FREQUENCY.OFF &&
      (force || isDigestDue(d.lead.frequency, date, d.lead.sentOn)),
  );
  if (dryRun) {
    run.preview = digests.map((d) => ({
      to: d.lead.email,
      subject: digestSubject(d),
      text: digestText(d),
    }));
    return run;
  }

  const from = senderAddress('careers');
  if (!hiringEmailSettings().configured || !from) return run;
  for (const d of digests) {
    const subject = digestSubject(d);
    const result = await sendEmail(
      {
        from: fromHeader(from, 'Hiring digest'),
        to: d.lead.email,
        subject,
        text: digestText(d),
        html: digestHtml(d),
        tags: [{ name: 'source', value: 'portal-hiring-digest' }],
      },
      `hiring-digest-${d.lead.id}-${date}`,
    );
    if (result.id)
      await db.user.update({
        where: { id: d.lead.id },
        data: { hiringDigestSentOn: date },
      });
    run.sent.push({ to: d.lead.email, subject, ...result });
  }
  return run;
}
