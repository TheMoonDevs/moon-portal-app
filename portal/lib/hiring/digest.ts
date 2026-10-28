import { fromHeader, sendEmail, senderAddress } from '@/lib/email/resend';
import { db } from '@/lib/mongodb/db-client';
import { localClock } from '@/lib/push/dayReminders';
import type { JobApplication, JobOpening } from '@/models/hiring';
import {
  APPLICATION_STAGE,
  HIRING_DIGEST_FREQUENCY,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import {
  ACTIVE_MEET_STATUSES,
  MEET_BOOKING_STATUS,
  type MeetBooking,
} from '@/models/meet';
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
 * they lead: the tasks waiting for review and the interviews booked in the
 * next two weeks (each linked), and a count of everyone else per opening.
 * Run by /api/cron/hiring-digest (see vercel.json) each morning; each lead
 * picks how often in Settings → Hiring preferences (every 2 days by
 * default). Leads with nothing to review, screen or interview get no email
 * that morning, and the next one goes out once there is.
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

type Person = { name: string; href: string; sub: string };

type Interview = Person & {
  start: string;
  /** The candidate asked for this time and it needs the host's answer. */
  needsAnswer: boolean;
  joinUrl: string | null;
};

interface OpeningDigest {
  opening: JobOpening;
  /** Sent their task back, oldest first. */
  review: Person[];
  screen: number;
  /** Task emailed, not sent back yet. */
  onTask: number;
  pastDue: number;
  interview: number;
}

export interface LeadDigest {
  lead: {
    id: string;
    name: string;
    email: string;
    timezone: string;
    frequency: HIRING_DIGEST_FREQUENCY;
    sentOn: string | null;
  };
  openings: OpeningDigest[];
  /** Interviews booked in the next two weeks, soonest first. */
  interviews: Interview[];
  totals: { review: number; screen: number; onTask: number };
}

const INTERVIEW_WINDOW_DAYS = 14;

/** "Thu 29 Oct · 10:00–10:30" in `tz`. */
export function formatSlot(start: string, end: string, tz: string) {
  const day = new Date(start).toLocaleDateString('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  return `${day.replace(',', '')} · ${time(start)}–${time(end)}`;
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
  const [applications, leads, members, bookings] = await Promise.all([
    db.jobApplication.findMany({
      where: {
        openingId: { in: openings.map((o) => o.id) },
        stage: {
          in: [
            APPLICATION_STAGE.APPLIED,
            APPLICATION_STAGE.SHORTLISTED,
            APPLICATION_STAGE.TASK,
            APPLICATION_STAGE.TASK_REVIEW,
            APPLICATION_STAGE.INTERVIEW,
            APPLICATION_STAGE.OFFER,
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
        timezone?: string | null;
        hiringDigest?: string | null;
        hiringDigestSentOn?: string | null;
      }>
    >,
    db.companyMember.findMany({
      where: {
        companyId: { in: companyIds },
        userId: { in: leadIds },
        status: MEMBER_STATUS.ACTIVE,
      },
      select: { companyId: true, userId: true },
    }) as Promise<Array<{ companyId: string; userId: string }>>,
    db.meetBooking.findMany({
      where: {
        companyId: { in: companyIds },
        applicationId: { notIn: [null, ''] },
        status: { in: ACTIVE_MEET_STATUSES },
        end: { gt: now.toISOString() },
        start: {
          lt: new Date(
            now.getTime() + INTERVIEW_WINDOW_DAYS * DAY_MS,
          ).toISOString(),
        },
      },
    }) as Promise<MeetBooking[]>,
  ]);

  const isMember = new Set(members.map((m) => `${m.companyId}:${m.userId}`));
  const byOpening = new Map<string, JobApplication[]>();
  for (const a of applications) {
    const list = byOpening.get(a.openingId) ?? [];
    list.push(a);
    byOpening.set(a.openingId, list);
  }
  const applicationById = new Map(applications.map((a) => [a.id, a]));

  const time = (value: unknown) => new Date(String(value ?? '')).getTime() || 0;

  const digests: LeadDigest[] = [];
  for (const lead of leads) {
    if (!lead.email) continue;
    const timezone = lead.timezone || DIGEST_TIMEZONE;
    const led = openings.filter(
      (o) =>
        o.hiringLeadId === lead.id && isMember.has(`${o.companyId}:${lead.id}`),
    );
    const titleOf = new Map(led.map((o) => [o.id, o.title]));
    const rows: OpeningDigest[] = led.map((opening) => {
      const apps = byOpening.get(opening.id) ?? [];
      const inStage = (stage: APPLICATION_STAGE) =>
        apps.filter((a) => a.stage === stage);
      const onTask = inStage(APPLICATION_STAGE.TASK).filter(
        (a) => !a.taskSubmission,
      );
      return {
        opening,
        review: inStage(APPLICATION_STAGE.TASK_REVIEW)
          .sort(
            (a, b) =>
              time(a.taskSubmission?.submittedAt) -
              time(b.taskSubmission?.submittedAt),
          )
          .map((a) => ({
            name: a.name,
            href: applicantLink(origin, a),
            sub: `${opening.title} · sent ${daysAgo(a.taskSubmission?.submittedAt, now)}`,
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
    const interviews: Interview[] = bookings
      .flatMap((b) => {
        const a = applicationById.get(b.applicationId ?? '');
        if (!a || !titleOf.has(a.openingId)) return [];
        return [
          {
            name: a.name,
            href: applicantLink(origin, a),
            sub: `${formatSlot(b.start, b.end, timezone)} · ${titleOf.get(a.openingId)}`,
            start: b.start,
            needsAnswer: b.status === MEET_BOOKING_STATUS.PENDING,
            joinUrl:
              b.status === MEET_BOOKING_STATUS.CONFIRMED
                ? (b.meetingUrl ?? null)
                : null,
          },
        ];
      })
      .sort((a, b) => time(a.start) - time(b.start));

    const sum = (pick: (r: OpeningDigest) => number) =>
      rows.reduce((n, r) => n + pick(r), 0);
    const totals = {
      review: sum((r) => r.review.length),
      screen: sum((r) => r.screen),
      onTask: sum((r) => r.onTask),
    };
    if (!totals.review && !totals.screen && !interviews.length) continue;
    rows.sort(
      (a, b) => b.review.length - a.review.length || b.screen - a.screen,
    );
    digests.push({
      lead: {
        id: lead.id,
        name: lead.name ?? '',
        email: lead.email,
        timezone,
        frequency: isDigestFrequency(lead.hiringDigest)
          ? lead.hiringDigest
          : DEFAULT_DIGEST_FREQUENCY,
        sentOn: lead.hiringDigestSentOn ?? null,
      },
      openings: rows,
      interviews,
      totals,
    });
  }
  return digests;
}

/* -------------------------------- the email ------------------------------- */

export function digestSubject({ totals, interviews }: LeadDigest) {
  const parts = [
    totals.review && `${plural(totals.review, 'task')} to review`,
    interviews.length && plural(interviews.length, 'interview'),
    totals.screen && `${totals.screen} to screen`,
  ].filter(Boolean);
  return `Hiring: ${parts.join(', ')}`;
}

/** "8 to screen · 4 on task · 1 past due", leaving out zeros. */
const openingLine = (r: OpeningDigest) =>
  [
    r.screen && `${r.screen} to screen`,
    r.onTask && `${r.onTask} on task`,
    r.pastDue && `${r.pastDue} past due`,
    r.review.length && `${r.review.length} to review`,
    r.interview && `${r.interview} in interview`,
  ]
    .filter(Boolean)
    .join(' · ') || 'No one in progress';

export function digestText(d: LeadDigest, origin = portalOrigin()) {
  const section = (title: string, lines: string[]) =>
    lines.length ? [title, ...lines].join('\n') : '';
  return [
    `Hi ${firstName(d.lead.name)},`,
    section(
      `To review (${d.totals.review})`,
      d.openings.flatMap((r) =>
        r.review.map((p) => `- ${p.name}, ${p.sub}: ${p.href}`),
      ),
    ),
    section(
      `Interviews (${d.interviews.length})`,
      d.interviews.map(
        (i) =>
          `- ${i.name}, ${i.sub}${i.needsAnswer ? ' (needs your answer)' : ''}: ${i.href}`,
      ),
    ),
    section(
      'Openings',
      d.openings.map((r) => `- ${r.opening.title}: ${openingLine(r)}`),
    ),
    `${DIGEST_FREQUENCY_LABELS[d.lead.frequency]}. Change how often: ${origin}/settings#hiring`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

/*
 * The HTML follows the user page: a quiet dark card, small grey section
 * labels with a count, and two-line rows (name, then a grey line under it).
 * Greys only, with one green for what needs the lead.
 */
const C = {
  page: '#0a0a0a',
  card: '#141414',
  line: '#262626',
  text: '#fafafa',
  muted: '#a3a3a3',
  faint: '#737373',
  accent: '#4ade80',
};

/** Pipeline stages per opening, from grey (early) to bright green (late). */
const PIPELINE: Array<{
  label: string;
  shade: string;
  count: (r: OpeningDigest) => number;
}> = [
  { label: 'to screen', shade: '#525252', count: (r) => r.screen },
  { label: 'on task', shade: '#a3a3a3', count: (r) => r.onTask },
  { label: 'to review', shade: '#16a34a', count: (r) => r.review.length },
  { label: 'interview', shade: '#4ade80', count: (r) => r.interview },
];

export function digestHtml(d: LeadDigest, origin = portalOrigin()) {
  const e = escapeHtml;
  const label = (title: string, n?: number) =>
    `<tr><td style="padding:20px 0 6px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${C.muted}">${e(title)}${n === undefined ? '' : `<span style="color:${C.faint};letter-spacing:0;font-weight:400"> &nbsp;${n}</span>`}</td></tr>`;
  const row = (title: string, href: string | null, sub: string, aside = '') =>
    `<tr><td style="padding:7px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="font-size:14px;line-height:1.35">${href ? `<a href="${e(href)}" style="color:${C.text};text-decoration:none">${e(title)}</a>` : `<span style="color:${C.text}">${e(title)}</span>`}<div style="font-size:12px;color:${C.faint};margin-top:2px">${sub}</div></td>${aside ? `<td style="text-align:right;vertical-align:top;white-space:nowrap;padding-left:8px">${aside}</td>` : ''}</tr></table></td></tr>`;
  const pill = (text: string, href?: string | null) =>
    href
      ? `<a href="${e(href)}" style="display:inline-block;font-size:11px;padding:2px 8px;border-radius:6px;background:#14532d;color:${C.accent};text-decoration:none">${e(text)}</a>`
      : `<span style="font-size:11px;color:${C.accent}">${e(text)}</span>`;

  const stat = (n: number, text: string, first = false) =>
    `<td style="padding:0 0 0 ${first ? 0 : 16}px;vertical-align:top"><div style="font-size:11px;color:${C.muted}">${e(text)}</div><div style="font-size:22px;font-weight:600;color:${n ? C.text : C.faint};line-height:1.3">${n}</div></td>`;

  const review = d.openings.flatMap((r) =>
    r.review.map((p) => row(p.name, p.href, e(p.sub))),
  );
  const interviews = d.interviews.map((i) =>
    row(
      i.name,
      i.href,
      e(i.sub),
      i.joinUrl
        ? pill('Join', i.joinUrl)
        : i.needsAnswer
          ? pill('Needs your answer')
          : '',
    ),
  );
  // Each opening's pipeline as one thin bar, grey early on and greener as
  // candidates get further, with a dot of the same shade by each count.
  const progress = (r: OpeningDigest) => {
    const parts = PIPELINE.map((p) => ({ ...p, n: p.count(r) })).filter(
      (p) => p.n,
    );
    const total = parts.reduce((n, p) => n + p.n, 0);
    const bar = total
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 4px;border-radius:3px;overflow:hidden"><tr>${parts
          .map(
            (p) =>
              `<td style="height:6px;line-height:6px;font-size:0;background:${p.shade};width:${((p.n / total) * 100).toFixed(1)}%">&nbsp;</td>`,
          )
          .join('')}</tr></table>`
      : `<div style="margin:6px 0 4px;height:6px;border-radius:3px;background:${C.line}"></div>`;
    const legend = parts
      .map(
        (p) =>
          `<span style="white-space:nowrap"><span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${p.shade}"></span>&nbsp;${p.n} ${p.label}</span>`,
      )
      .join(' &nbsp; ');
    const pastDue = r.pastDue
      ? ` &nbsp; <span style="color:${C.muted}">${r.pastDue} past due</span>`
      : '';
    return bar + (legend || 'No one in progress') + pastDue;
  };
  const openings = d.openings.map((r) =>
    row(r.opening.title, openingLink(origin, r.opening), progress(r)),
  );

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head><body style="margin:0;padding:20px 10px;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${C.page}"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:${C.card};border:1px solid ${C.line};border-radius:14px"><tr><td style="padding:20px 20px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="font-size:16px;font-weight:600;color:${C.text}">Hiring<span style="font-weight:400;color:${C.faint}"> &nbsp;·&nbsp; ${e(firstName(d.lead.name))}</span></td></tr>
<tr><td style="padding-top:14px"><table role="presentation" cellspacing="0" cellpadding="0"><tr>${stat(d.totals.review, 'To review', true)}${stat(d.interviews.length, 'Interviews')}${stat(d.totals.screen, 'To screen')}${stat(d.totals.onTask, 'On task')}</tr></table></td></tr>
${review.length ? label('To review', review.length) + review.join('') : ''}
${interviews.length ? label('Interviews', interviews.length) + interviews.join('') : ''}
${label('Openings', openings.length)}${openings.join('')}
</table></td></tr></table>
<p style="max-width:480px;margin:12px auto 0;font-size:11px;color:${C.faint}">${e(DIGEST_FREQUENCY_LABELS[d.lead.frequency])} &nbsp;·&nbsp; <a href="${e(`${origin}/settings#hiring`)}" style="color:${C.faint}">Change how often</a></p>
</td></tr></table></body></html>`;
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
