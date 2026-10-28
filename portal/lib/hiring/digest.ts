import { fromHeader, sendEmail, senderAddress } from '@/lib/email/resend';
import { db } from '@/lib/mongodb/db-client';
import { localClock } from '@/lib/push/dayReminders';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';
import { MEMBER_STATUS } from '@/models/workspace';

import { hiringEmailSettings } from './email';
import { escapeHtml } from './emailTemplates';
import { taskDueAt } from './tasks';

/*
 * The hiring digest: every other morning each hiring lead gets one email
 * covering every opening they lead, with how many tasks wait for review,
 * how many applicants wait to be screened, and links straight to them.
 * Run by /api/cron/hiring-digest (see vercel.json) each morning; it sends on
 * every other day, counted in DIGEST_TIMEZONE, so the rhythm holds across
 * month ends. Leads with nothing to review or screen get no email.
 */

const DIGEST_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata';
const EVERY_DAYS = 2;
/** Names listed per section before "and N more". */
const LIST_LIMIT = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export const portalOrigin = () =>
  (
    process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://portal.themoondevs.com'
  ).replace(/\/$/, '');

/** Whether `date` (YYYY-MM-DD) is a digest day. */
export const isDigestDay = (date: string) =>
  Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS) % EVERY_DAYS === 0;

const openingLink = (
  origin: string,
  o: Pick<JobOpening, 'id' | 'companyId'>,
  stage?: APPLICATION_STAGE,
) =>
  `${origin}/admin?tab=hiring&company=${o.companyId}&opening=${o.id}${stage ? `&stage=${stage}` : ''}`;

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
  /** Sent their task back, oldest first. */
  review: Person[];
  /** New applicants, oldest first so nobody waits longest. */
  screen: Person[];
  /** Task emailed, not sent back yet. */
  waitingOnTask: number;
  pastDue: number;
  interview: number;
  /** Since the last digest. */
  newApplicants: number;
  newTasks: number;
}

export interface LeadDigest {
  lead: { id: string; name: string; email: string };
  openings: OpeningDigest[];
  totals: { review: number; screen: number; waitingOnTask: number };
}

/** What each hiring lead's digest would say right now. */
export async function buildDigests(now = new Date()): Promise<LeadDigest[]> {
  const origin = portalOrigin();
  const since = now.getTime() - EVERY_DAYS * DAY_MS;

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
        submittedAt: true,
        taskSentAt: true,
        taskSubmission: true,
      },
    }) as Promise<JobApplication[]>,
    db.user.findMany({ where: { id: { in: leadIds } } }) as Promise<
      Array<{ id: string; name?: string | null; email?: string | null }>
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
  const person = (a: JobApplication, at: unknown): Person => ({
    name: a.name,
    href: applicantLink(origin, a),
    when: daysAgo(at, now),
  });

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
      const review = inStage(APPLICATION_STAGE.TASK_REVIEW).sort(
        (a, b) =>
          time(a.taskSubmission?.submittedAt) -
          time(b.taskSubmission?.submittedAt),
      );
      const screen = inStage(APPLICATION_STAGE.APPLIED).sort(
        (a, b) => time(a.submittedAt) - time(b.submittedAt),
      );
      const waiting = inStage(APPLICATION_STAGE.TASK).filter(
        (a) => !a.taskSubmission,
      );
      return {
        opening,
        company: companyName.get(opening.companyId) ?? '',
        review: review.map((a) => person(a, a.taskSubmission?.submittedAt)),
        screen: screen.map((a) => person(a, a.submittedAt)),
        waitingOnTask: waiting.length,
        pastDue: waiting.filter((a) => {
          const due = taskDueAt(opening.task, a.taskSentAt);
          return !!due && due < now;
        }).length,
        interview: inStage(APPLICATION_STAGE.INTERVIEW).length,
        newApplicants: screen.filter((a) => time(a.submittedAt) >= since)
          .length,
        newTasks: review.filter(
          (a) => time(a.taskSubmission?.submittedAt) >= since,
        ).length,
      };
    });
    const totals = {
      review: rows.reduce((n, r) => n + r.review.length, 0),
      screen: rows.reduce((n, r) => n + r.screen.length, 0),
      waitingOnTask: rows.reduce((n, r) => n + r.waitingOnTask, 0),
    };
    if (!totals.review && !totals.screen) continue;
    // Most to do first.
    rows.sort(
      (a, b) =>
        b.review.length * 2 +
        b.screen.length -
        (a.review.length * 2 + a.screen.length),
    );
    digests.push({
      lead: { id: lead.id, name: lead.name ?? '', email: lead.email },
      openings: rows,
      totals,
    });
  }
  return digests;
}

/* -------------------------------- the email ------------------------------- */

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

export function digestSubject({ totals }: LeadDigest) {
  const parts = [
    totals.review && `${plural(totals.review, 'task')} to review`,
    totals.screen && `${plural(totals.screen, 'applicant')} to screen`,
  ].filter(Boolean);
  return `Hiring: ${parts.join(', ')}`;
}

const openingTitle = (r: OpeningDigest) =>
  r.company ? `${r.opening.title} · ${r.company}` : r.opening.title;

/** One line per state that isn't a list of names. */
const otherLines = (r: OpeningDigest) =>
  [
    r.waitingOnTask &&
      `${plural(r.waitingOnTask, 'candidate')} working on the task${r.pastDue ? ` (${r.pastDue} past the due date)` : ''}`,
    r.interview && `${r.interview} in interview`,
  ].filter((line): line is string => !!line);

const newLine = (r: OpeningDigest) => {
  const parts = [
    r.newApplicants && `${r.newApplicants} applied`,
    r.newTasks && `${plural(r.newTasks, 'task')} sent back`,
  ].filter(Boolean);
  return parts.length ? `Since the last digest: ${parts.join(', ')}.` : '';
};

export function digestText(d: LeadDigest, origin = portalOrigin()) {
  const out: string[] = [
    `Hi ${firstName(d.lead.name)},`,
    `Here's where your openings stand: ${digestSubject(d).replace(/^Hiring: /, '')}.`,
  ];
  for (const r of d.openings) {
    const block = [openingTitle(r), newLine(r)].filter(Boolean);
    const list = (
      people: Person[],
      label: string,
      stage: APPLICATION_STAGE,
    ) => {
      if (!people.length) return;
      block.push(`${label} (${people.length}):`);
      for (const p of people.slice(0, LIST_LIMIT))
        block.push(`- ${p.name}, ${p.when}: ${p.href}`);
      if (people.length > LIST_LIMIT)
        block.push(
          `- and ${people.length - LIST_LIMIT} more: ${openingLink(origin, r.opening, stage)}`,
        );
    };
    list(r.review, 'Tasks to review', APPLICATION_STAGE.TASK_REVIEW);
    list(r.screen, 'To screen', APPLICATION_STAGE.APPLIED);
    block.push(...otherLines(r));
    if (!r.review.length && !r.screen.length)
      block.push('Nothing waiting on you here.');
    block.push(`Open: ${openingLink(origin, r.opening)}`);
    out.push(block.join('\n'));
  }
  out.push('You get this every other morning for the openings you lead.');
  return out.join('\n\n');
}

export function digestHtml(d: LeadDigest, origin = portalOrigin()) {
  const e = escapeHtml;
  const link = (href: string, text: string) =>
    `<a href="${e(href)}" style="color:#2563eb;text-decoration:none">${e(text)}</a>`;
  const stat = (n: number, label: string) =>
    `<td style="padding:12px;background:#f4f4f5;border-radius:10px;text-align:center;width:33%"><div style="font-size:22px;font-weight:700;color:#18181b">${n}</div><div style="font-size:12px;color:#71717a">${e(label)}</div></td>`;

  const sections = d.openings.map((r) => {
    const list = (
      people: Person[],
      label: string,
      stage: APPLICATION_STAGE,
    ) => {
      if (!people.length) return '';
      const items = people
        .slice(0, LIST_LIMIT)
        .map(
          (p) =>
            `<li style="margin:0 0 4px">${link(p.href, p.name)} <span style="color:#a1a1aa">· ${e(p.when)}</span></li>`,
        )
        .join('');
      const more =
        people.length > LIST_LIMIT
          ? `<li style="margin:0 0 4px">${link(openingLink(origin, r.opening, stage), `and ${people.length - LIST_LIMIT} more`)}</li>`
          : '';
      return `<p style="margin:12px 0 4px;font-weight:600">${link(openingLink(origin, r.opening, stage), `${label} (${people.length})`)}</p><ul style="margin:0;padding-left:20px">${items}${more}</ul>`;
    };
    const fresh = newLine(r);
    const others = otherLines(r);
    return `<div style="border-top:1px solid #e4e4e7;padding:20px 0 4px">
<p style="margin:0;font-size:16px;font-weight:700">${link(openingLink(origin, r.opening), r.opening.title)}${r.company ? ` <span style="font-weight:400;color:#a1a1aa">· ${e(r.company)}</span>` : ''}</p>
${fresh ? `<p style="margin:4px 0 0;color:#71717a;font-size:13px">${e(fresh)}</p>` : ''}
${list(r.review, 'Tasks to review', APPLICATION_STAGE.TASK_REVIEW)}
${list(r.screen, 'To screen', APPLICATION_STAGE.APPLIED)}
${others.length ? `<p style="margin:12px 0 0;color:#52525b;font-size:14px">${others.map(e).join('<br>')}</p>` : ''}
${!r.review.length && !r.screen.length ? '<p style="margin:8px 0 0;color:#a1a1aa;font-size:14px">Nothing waiting on you here.</p>' : ''}
</div>`;
  });

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px 28px;color:#18181b;font-size:15px;line-height:1.6">
<p style="margin:0 0 16px">Hi ${e(firstName(d.lead.name))}, here's where your openings stand.</p>
<table role="presentation" width="100%" cellspacing="6" cellpadding="0" style="margin:0 -6px 12px"><tr>${stat(d.totals.review, 'tasks to review')}${stat(d.totals.screen, 'to screen')}${stat(d.totals.waitingOnTask, 'working on the task')}</tr></table>
${sections.join('')}
</div><p style="max-width:560px;margin:16px auto 0;text-align:center;color:#a1a1aa;font-size:12px;line-height:1.5">You get this every other morning for the openings you lead.</p></body></html>`;
}

/* -------------------------------- sending -------------------------------- */

export interface DigestRun {
  date: string;
  digestDay: boolean;
  sent: Array<{ to: string; subject: string; id?: string; error?: string }>;
  /** Filled for a dry run: what each lead would get. */
  preview?: Array<{ to: string; subject: string; text: string }>;
}

/**
 * Sends today's digests when today is a digest day (or `force`). A dry run
 * sends nothing and returns what would go out. Sending twice on one day
 * never sends twice: each email's idempotency key is the lead and the date.
 */
export async function runHiringDigest({
  now = new Date(),
  force = false,
  dryRun = false,
} = {}): Promise<DigestRun> {
  const { date } = localClock(DIGEST_TIMEZONE, now);
  const digestDay = isDigestDay(date);
  const run: DigestRun = { date, digestDay, sent: [] };
  if (!digestDay && !force && !dryRun) return run;

  const digests = await buildDigests(now);
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
    run.sent.push({ to: d.lead.email, subject, ...result });
  }
  return run;
}
