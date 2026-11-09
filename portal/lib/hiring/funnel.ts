/**
 * The funnel for an opening: how many people reached each stage, where the
 * rest dropped off, and how long people spend in each stage. Built from the
 * stage history every application keeps. Client-safe.
 */
import type { JobApplication } from '@/models/hiring';
import { APPLICATION_STAGE } from '@/models/hiring';

/** The stages in the order people move through them. */
export const FUNNEL_STAGES: APPLICATION_STAGE[] = [
  APPLICATION_STAGE.APPLIED,
  APPLICATION_STAGE.SHORTLISTED,
  APPLICATION_STAGE.TASK,
  APPLICATION_STAGE.TASK_REVIEW,
  APPLICATION_STAGE.INTERVIEW,
  APPLICATION_STAGE.OFFER,
  APPLICATION_STAGE.HIRED,
];

const DAY_MS = 86_400_000;

export interface FunnelStage {
  stage: APPLICATION_STAGE;
  /** People who got this far (or further). */
  reached: number;
  /** People in this stage now. */
  now: number;
  /** Average days spent here by people who have moved on, or null. */
  avgDays: number | null;
}

export interface OpeningFunnel {
  total: number;
  stages: FunnelStage[];
  rejected: number;
  /** Where rejected people were when they were turned down. */
  rejectedAt: Partial<Record<APPLICATION_STAGE, number>>;
  /** People sent the task, and how many of them sent it back. */
  taskSent: number;
  taskReturned: number;
  /** Average days from applying to Hired, or null. */
  daysToHire: number | null;
}

const time = (value: unknown) => {
  const t = new Date(value as string).getTime();
  return Number.isFinite(t) ? t : null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildFunnel(
  applications: Array<
    Pick<
      JobApplication,
      'stage' | 'history' | 'submittedAt' | 'taskSentAt' | 'taskSubmission'
    >
  >,
  now = Date.now(),
): OpeningFunnel {
  const reached = new Map<APPLICATION_STAGE, number>();
  const nowIn = new Map<APPLICATION_STAGE, number>();
  const spent = new Map<APPLICATION_STAGE, { days: number; n: number }>();
  const rejectedAt: Partial<Record<APPLICATION_STAGE, number>> = {};
  let rejected = 0;
  let taskSent = 0;
  let taskReturned = 0;
  const hireDays: number[] = [];

  for (const a of applications) {
    const start = time(a.submittedAt) ?? now;
    const moves = (a.history ?? [])
      .filter((e) => e.type === 'STAGE_CHANGED' && e.to)
      .map((e) => ({ at: time(e.at) ?? start, from: e.from, to: e.to! }))
      .sort((x, y) => x.at - y.at);

    // How far along they got: the furthest funnel stage they were ever in.
    let furthest = 0;
    const consider = (stage?: APPLICATION_STAGE | null) => {
      const i = stage ? FUNNEL_STAGES.indexOf(stage) : -1;
      if (i > furthest) furthest = i;
    };
    consider(a.stage);
    moves.forEach((m) => consider(m.to));
    if (a.taskSentAt) consider(APPLICATION_STAGE.TASK);
    if (a.taskSubmission) consider(APPLICATION_STAGE.TASK_REVIEW);
    for (let i = 0; i <= furthest; i++)
      reached.set(FUNNEL_STAGES[i], (reached.get(FUNNEL_STAGES[i]) ?? 0) + 1);

    if (a.stage === APPLICATION_STAGE.REJECTED) {
      rejected += 1;
      const last = [...moves]
        .reverse()
        .find((m) => m.to === APPLICATION_STAGE.REJECTED);
      const from = last?.from ?? APPLICATION_STAGE.APPLIED;
      rejectedAt[from] = (rejectedAt[from] ?? 0) + 1;
    } else nowIn.set(a.stage, (nowIn.get(a.stage) ?? 0) + 1);

    // Time in each stage, for stages they have left.
    let stage: APPLICATION_STAGE = APPLICATION_STAGE.APPLIED;
    let since = start;
    for (const m of moves) {
      const days = Math.max(0, m.at - since) / DAY_MS;
      const current = spent.get(stage) ?? { days: 0, n: 0 };
      spent.set(stage, { days: current.days + days, n: current.n + 1 });
      stage = m.to;
      since = m.at;
      if (m.to === APPLICATION_STAGE.HIRED)
        hireDays.push(Math.max(0, m.at - start) / DAY_MS);
    }

    if (a.taskSentAt || a.taskSubmission) {
      taskSent += 1;
      if (a.taskSubmission) taskReturned += 1;
    }
  }

  return {
    total: applications.length,
    stages: FUNNEL_STAGES.map((stage) => {
      const s = spent.get(stage);
      return {
        stage,
        reached: reached.get(stage) ?? 0,
        now: nowIn.get(stage) ?? 0,
        avgDays: s?.n ? round1(s.days / s.n) : null,
      };
    }),
    rejected,
    rejectedAt,
    taskSent,
    taskReturned,
    daysToHire: hireDays.length
      ? round1(hireDays.reduce((x, y) => x + y, 0) / hireDays.length)
      : null,
  };
}
