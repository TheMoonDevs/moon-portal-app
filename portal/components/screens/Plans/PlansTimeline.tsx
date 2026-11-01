'use client';

import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { isTarget } from '@/lib/workspace/projects';
import { PLAN_STATUS, type ProjectGoal } from '@/models/workspace';

import { Icon } from '../Admin/shared/AdminUI';
import type { PlansData, PlanView, StepView } from './types';
import { shortDay, stepKind } from './types';

/*
 * When no plan is open: how the plans work out, day by day, as a calendar
 * grid (a column per week, a row per weekday). Each day counts the tasks due
 * then, the runs of repeating goals and the plans that end; under it, a lane
 * per plan shows its weeks.
 */

type Item = {
  day: string;
  type: 'task' | 'goal' | 'end';
  plan: PlanView;
  step?: StepView;
  title: string;
  done: boolean;
};

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
const parse = (day: string) => new Date(`${day}T00:00:00`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
/** The Monday of the week `d` is in. */
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** The days a repeating goal's tasks are for, between `from` and `to`. */
const goalDays = (goal: ProjectGoal, from: Date, to: Date) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const on =
      goal.period === 'day'
        ? true
        : goal.period === 'week'
          ? goal.days?.length
            ? !!goal.days?.includes(d.getDay())
            : d.getDay() === 1
          : d.getDate() === (goal.monthDay || 1);
    if (on) out.push(iso(d));
  }
  return out;
};

/** Everything dated in the open plans, from `from` to `to`. */
const itemsOf = (data: PlansData, from: Date, to: Date): Item[] => {
  const goals = new Map(
    data.projects.flatMap((p) => (p.goals ?? []).map((g) => [g.id, g])),
  );
  const today = parse(iso(new Date()));
  const items: Item[] = [];
  for (const plan of data.plans) {
    if (plan.status === PLAN_STATUS.DONE || plan.status === PLAN_STATUS.DROPPED)
      continue;
    const end = plan.endOn ? parse(plan.endOn) : to;
    for (const step of plan.steps) {
      const kind = stepKind(step);
      if (kind === 'task') {
        const day = step.task?.dueDate?.slice(0, 10) || step.dueOn;
        if (day)
          items.push({
            day,
            type: 'task',
            plan,
            step,
            title: step.task?.title ?? step.text,
            done: !!step.done,
          });
      } else if (kind === 'goal' && step.goalId) {
        const goal = goals.get(step.goalId);
        if (!goal || isTarget(goal)) continue;
        // Repeating goals: from today to the plan's end.
        const start = today > from ? today : from;
        const stop = end < to ? end : to;
        for (const day of goalDays(goal, start, stop))
          items.push({
            day,
            type: 'goal',
            plan,
            step,
            title: goal.title,
            done: false,
          });
      }
    }
    if (plan.endOn)
      items.push({
        day: plan.endOn,
        type: 'end',
        plan,
        title: `${plan.title} ends`,
        done: false,
      });
  }
  return items;
};

const shade = (n: number) =>
  n === 0
    ? 'bg-white/[0.04]'
    : n === 1
      ? 'bg-sky-500/30'
      : n <= 3
        ? 'bg-sky-500/55'
        : n <= 6
          ? 'bg-sky-400/80'
          : 'bg-sky-300';

export const PlansTimeline = ({
  data,
  onOpen,
}: {
  data: PlansData;
  onOpen: (planId: string, stepId?: string) => void;
}) => {
  const today = iso(new Date());
  const [picked, setPicked] = useState<string | null>(null);

  const { weeks, items, byDay, lanes } = useMemo(() => {
    const now = parse(today);
    const first = mondayOf(addDays(now, -14));
    // Up to the last plan's end, between 16 and 39 weeks.
    const ends = data.plans
      .filter(
        (p) =>
          p.status !== PLAN_STATUS.DONE && p.status !== PLAN_STATUS.DROPPED,
      )
      .flatMap((p) => [
        p.endOn,
        ...p.steps.map((s) => s.task?.dueDate?.slice(0, 10) || s.dueOn),
      ])
      .filter(Boolean) as string[];
    const last = ends.length ? parse(ends.sort().at(-1)!) : now;
    const count = Math.min(
      39,
      Math.max(
        16,
        Math.ceil((last.getTime() - first.getTime()) / DAY_MS / 7) + 2,
      ),
    );
    const weeks = Array.from({ length: count }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => iso(addDays(first, w * 7 + d))),
    );
    const to = addDays(first, count * 7 - 1);
    const items = itemsOf(data, first, to).filter(
      (i) => i.day >= weeks[0][0] && i.day <= weeks.at(-1)![6],
    );
    const byDay = new Map<string, Item[]>();
    for (const i of items) byDay.set(i.day, [...(byDay.get(i.day) ?? []), i]);
    // A lane per plan with anything dated, soonest end first.
    const lanes = Array.from(new Set(items.map((i) => i.plan)))
      .sort((a, b) => (a.endOn ?? '9999').localeCompare(b.endOn ?? '9999'))
      .map((plan) => ({
        plan,
        weeks: weeks.map(
          (days) =>
            items.filter(
              (i) =>
                i.plan === plan && i.type !== 'end' && days.includes(i.day),
            ).length,
        ),
        endWeek: plan.endOn
          ? weeks.findIndex((days) => days.includes(plan.endOn!))
          : -1,
      }));
    return { weeks, items, byDay, lanes };
  }, [data, today]);

  const months = weeks.map((days, w) => {
    const d = parse(days[0]);
    const prev = w ? parse(weeks[w - 1][0]) : null;
    return !prev || prev.getMonth() !== d.getMonth()
      ? d.toLocaleDateString(undefined, { month: 'short' })
      : '';
  });

  // The picked day, else what is coming up in the next two weeks.
  const soon = iso(addDays(parse(today), 14));
  const shown = picked
    ? (byDay.get(picked) ?? [])
    : items
        .filter((i) => i.day >= today && i.day <= soon && !i.done)
        .sort((a, b) => a.day.localeCompare(b.day));

  const cell = 'size-[13px] rounded-[3px]';
  const projectColor = (step?: StepView) =>
    data.projects.find(
      (p) => p.id === (step?.task?.projectId || step?.projectId),
    )?.color || '#525252';

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8">
      <h2 className="text-lg font-semibold text-white">
        How the plans work out
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        Tasks due, repeating goals and plan ends, day by day, across the open
        plans shown. Pick a day to see it; pick a plan to open it.
      </p>

      {/* The calendar */}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] pl-8 text-[10px] text-neutral-500">
            {months.map((m, w) => (
              <span
                key={w}
                className="w-[13px] overflow-visible whitespace-nowrap"
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex w-7 flex-col gap-[3px] text-[10px] leading-[13px] text-neutral-500">
              {WEEKDAYS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            {weeks.map((days, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {days.map((day) => {
                  const list = byDay.get(day) ?? [];
                  const work = list.filter((i) => i.type !== 'end');
                  const late = work.some((i) => !i.done && day < today);
                  const ends = list.some((i) => i.type === 'end');
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setPicked(picked === day ? null : day)}
                      title={`${shortDay(day)}: ${
                        work.length
                          ? `${work.length} thing${work.length > 1 ? 's' : ''}`
                          : 'nothing'
                      }${ends ? ', a plan ends' : ''}`}
                      className={cn(
                        cell,
                        'relative transition-transform hover:scale-125',
                        late ? 'bg-rose-500/60' : shade(work.length),
                        day === today && 'ring-1 ring-white/70',
                        picked === day && 'ring-2 ring-sky-300',
                      )}
                    >
                      {ends && (
                        <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-amber-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-3 pl-8 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1">
              Less
              {[0, 1, 3, 6, 7].map((n) => (
                <span key={n} className={cn(cell, shade(n))} />
              ))}
              More
            </span>
            <span className="flex items-center gap-1">
              <span className={cn(cell, 'bg-rose-500/60')} /> Late
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-amber-300" /> Plan ends
            </span>
          </div>
        </div>
      </div>

      {/* What is on the picked day, or coming up */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {picked ? shortDay(picked) : 'Next two weeks'}
          </h3>
          {picked && (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-[11px] text-neutral-500 hover:text-neutral-300"
            >
              Show the next two weeks
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-col">
          {shown.slice(0, 40).map((i, n) => (
            <button
              key={`${i.plan.id}-${i.step?.id ?? 'end'}-${i.day}-${n}`}
              type="button"
              onClick={() => onOpen(i.plan.id, i.step?.id)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.04]"
            >
              <Icon
                name={
                  i.type === 'end'
                    ? 'flag'
                    : i.type === 'goal'
                      ? 'event_repeat'
                      : i.done
                        ? 'check_circle'
                        : 'radio_button_unchecked'
                }
                className={cn(
                  'text-[16px]',
                  i.type === 'end'
                    ? 'text-amber-300'
                    : i.type === 'goal'
                      ? 'text-amber-200/70'
                      : i.done
                        ? 'text-emerald-400'
                        : i.day < today
                          ? 'text-rose-300'
                          : 'text-sky-400/70',
                )}
              />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  i.done ? 'text-neutral-500 line-through' : 'text-neutral-200',
                )}
              >
                {i.title}
              </span>
              {i.step && (
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: projectColor(i.step) }}
                />
              )}
              <span className="max-w-[160px] shrink-0 truncate text-[11px] text-neutral-500">
                {i.plan.title}
              </span>
              {!picked && (
                <span className="w-14 shrink-0 text-right text-[11px] text-neutral-500">
                  {shortDay(i.day)}
                </span>
              )}
            </button>
          ))}
          {!shown.length && (
            <p className="px-2 py-3 text-xs text-neutral-500">
              {picked
                ? 'Nothing on this day.'
                : 'Nothing dated in the next two weeks. Give steps a date to see them here.'}
            </p>
          )}
        </div>
      </div>

      {/* A lane per plan */}
      {lanes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            By plan, week by week
          </h3>
          <div className="mt-2 overflow-x-auto pb-2">
            <div className="inline-flex flex-col gap-1.5">
              {lanes.map(({ plan, weeks: counts, endWeek }) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onOpen(plan.id)}
                  className="group flex items-center gap-[3px] text-left"
                >
                  <span className="w-40 shrink-0 truncate pr-2 text-xs text-neutral-300 group-hover:text-white">
                    {plan.title}
                  </span>
                  {counts.map((n, w) => (
                    <span
                      key={w}
                      className={cn(
                        cell,
                        shade(n),
                        w === endWeek && 'ring-1 ring-amber-300',
                      )}
                    />
                  ))}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
