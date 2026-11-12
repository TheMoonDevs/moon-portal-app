'use client';

import Link from 'next/link';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { GOAL_STATUS } from '@/lib/workspace/goalCalendar';
import { isCoreProject } from '@/lib/workspace/projectLabel';
import { isTarget, PERIOD_NOUN } from '@/lib/workspace/projects';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon } from '../Admin/shared/AdminUI';
import { PanelHead } from './GoalDayPanel';
import { wholeText } from './GoalsWeek';
import { doneOn, type GoalRow, type WorkIndex, workOn } from './model';
import { Bar, EffortTag, fmtDay, fmtNum, ProjectLogo, STATE_META } from './ui';

const PERIOD_NOW: Record<string, string> = {
  day: 'today',
  week: 'this week',
  fortnight: 'these 2 weeks',
  month: 'this month',
  quarter: 'this quarter',
};

/** Tasks finished each day, as bars; a bar opens its day. */
const DoneBars = ({
  days,
  counts,
  today,
  color,
  onOpenDay,
}: {
  days: string[];
  counts: number[];
  today: string;
  color: string;
  onOpenDay: (day: string) => void;
}) => {
  const max = Math.max(1, ...counts);
  const wide = days.length <= 7;
  return (
    <div className="flex h-20 items-end gap-[3px]">
      {days.map((d, i) => (
        <button
          key={d}
          type="button"
          onClick={() => onOpenDay(d)}
          title={`${fmtDay(d, { weekday: 'short' })}: ${counts[i]} done`}
          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
        >
          {wide && counts[i] > 0 && (
            <span className="text-[10px] tabular-nums text-neutral-400">
              {counts[i]}
            </span>
          )}
          <span
            className={cn(
              'w-full rounded-[3px] transition-opacity group-hover:opacity-80',
              !counts[i] && 'bg-white/[0.06] auto-light:bg-black/[0.06]',
            )}
            style={{
              height: counts[i]
                ? `${Math.max(8, (counts[i] / max) * 100)}%`
                : 3,
              ...(counts[i] ? { backgroundColor: color } : {}),
            }}
          />
          {wide && (
            <span
              className={cn(
                'text-[10px]',
                d === today
                  ? 'font-semibold text-white auto-light:text-neutral-950'
                  : 'text-neutral-500',
              )}
            >
              {fmtDay(d, {
                weekday: 'narrow',
                day: undefined,
                month: undefined,
              })}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

/** Adds to a target goal's progress by hand: "+ 120". */
const AddProgress = ({
  onAdd,
}: {
  onAdd: (amount: number) => Promise<void>;
}) => {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const amount = Number(value);
  const submit = async () => {
    if (!Number.isFinite(amount) || !amount) return;
    setBusy(true);
    try {
      await onAdd(amount);
      setValue('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mt-2.5 flex items-center gap-1.5"
    >
      <label className="flex h-7 flex-1 items-center gap-1 rounded-lg bg-white/[0.04] px-2 text-xs text-neutral-400 ring-1 ring-inset ring-white/[0.07] focus-within:ring-white/25 auto-light:bg-white auto-light:ring-black/10">
        <Icon name="add" className="text-[14px]" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.-]/g, ''))}
          inputMode="decimal"
          placeholder="Add progress"
          aria-label="Add progress"
          className="min-w-0 flex-1 bg-transparent tabular-nums text-neutral-100 outline-none placeholder:text-neutral-500 auto-light:text-neutral-900"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !amount}
        className="h-7 rounded-lg bg-white px-2.5 text-xs font-medium text-neutral-950 disabled:opacity-40 auto-light:bg-neutral-900 auto-light:text-white"
      >
        {busy ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
};

/**
 * One project in the sidebar: the tasks it finished over the days shown,
 * day by day, those still open, and each of its goals with where it
 * stands now, its days as dots and how its periods went. People who may
 * change its goals edit or add them here, and add progress to a target.
 * Links to the project's Goals tab.
 */
export const GoalProjectPanel = ({
  projectId,
  rows,
  days,
  rangeLabel,
  done,
  today,
  onClose,
  onOpenDay,
  onEditGoal,
  onNewGoal,
  onAddProgress,
}: {
  projectId: string;
  /** Every goal row; the project's are picked out. */
  rows: GoalRow[];
  /** The days the page shows (the week, or the month). */
  days: string[];
  rangeLabel: string;
  done: WorkIndex;
  today: string;
  onClose: () => void;
  onOpenDay: (day: string) => void;
  onEditGoal: (row: GoalRow) => void;
  onNewGoal: () => void;
  onAddProgress: (row: GoalRow, amount: number) => Promise<void>;
}) => {
  const mine = rows.filter((r) => r.project.id === projectId);
  const first = mine[0];
  if (!first) return null;
  const { project, company, effort, color } = first;
  const counts = days.map((d) => doneOn(done, projectId, d));
  const open = days.flatMap((d) => workOn(done, projectId, d).open);
  const total = counts.reduce((n, c) => n + c, 0);
  const goalDone = mine.reduce(
    (n, r) =>
      n +
      days.reduce((m, d) => m + (r.days.get(d)?.state === 'done' ? 1 : 0), 0),
    0,
  );

  return (
    <div className="flex flex-col">
      <PanelHead
        kicker={company?.name ?? 'Project'}
        title={isCoreProject(project) ? `${project.name} (Core)` : project.name}
        lead={<ProjectLogo project={project} size={44} className="mt-0.5" />}
        onClose={onClose}
      >
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EffortTag effort={effort} />
          <Link
            href={`${APP_ROUTES.projects}/${project.id}?view=goals`}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-neutral-300 ring-1 ring-inset ring-white/10 hover:bg-white/[0.06] auto-light:text-neutral-700 auto-light:ring-black/10 auto-light:hover:bg-black/[0.04]"
          >
            Open project
            <Icon name="arrow_outward" className="text-[13px]" />
          </Link>
        </div>
      </PanelHead>

      <div className="flex flex-col gap-7 px-5 pb-6 pt-5">
        <section>
          <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
            Tasks done · {rangeLabel}
          </h3>
          <p className="mb-3 mt-1 text-[30px] font-semibold tabular-nums leading-none tracking-tight text-white auto-light:text-neutral-950">
            {total}
          </p>
          <DoneBars
            days={days}
            counts={counts}
            today={today}
            color={color}
            onOpenDay={onOpenDay}
          />
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Every task finished in the project, goal or not
            {goalDone
              ? ` · ${goalDone} goal day${goalDone === 1 ? '' : 's'} done`
              : ''}
            .
          </p>
        </section>

        {open.length > 0 && (
          <section>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              Still to do · {open.length}
            </h3>
            <ul className="flex flex-col gap-1">
              {open.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'size-[5px] shrink-0 rounded-full',
                      t.day < today ? 'bg-rose-400' : 'bg-amber-300',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-neutral-200 auto-light:text-neutral-800">
                    {t.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-neutral-500">
                    {fmtDay(t.day, { weekday: 'short', month: undefined })}
                  </span>
                </li>
              ))}
              {open.length > 8 && (
                <li className="text-[11px] text-neutral-500">
                  +{open.length - 8} more
                </li>
              )}
            </ul>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              Goals
            </h3>
            {project.canEdit && (
              <button
                type="button"
                onClick={onNewGoal}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-neutral-300 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-600 auto-light:hover:bg-black/[0.04] auto-light:hover:text-neutral-950"
              >
                <Icon name="add" className="text-[14px]" />
                New goal
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-2.5">
            {mine.map((r) => {
              const p = r.goal.progress;
              const target = isTarget(r.goal);
              const status = GOAL_STATUS[r.status];
              const over = r.periods.filter(
                (x) =>
                  x.met !== null &&
                  x.to >= days[0] &&
                  x.from <= days[days.length - 1],
              );
              return (
                <li
                  key={r.key}
                  className="rounded-xl bg-white/[0.03] px-3.5 py-3 auto-light:bg-black/[0.025]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn('size-2 shrink-0 rounded-full', status.dot)}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-100 auto-light:text-neutral-900">
                      {r.label}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[11px] font-medium',
                        status.text,
                      )}
                    >
                      {status.label}
                    </span>
                    {project.canEdit && (
                      <button
                        type="button"
                        onClick={() => onEditGoal(r)}
                        aria-label={`Edit ${r.label}`}
                        title="Edit goal"
                        className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.08] hover:text-white auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-950"
                      >
                        <Icon name="edit" className="text-[15px]" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Bar
                      percent={p.percent}
                      color={p.percent >= 100 ? '#34d399' : color}
                      className="flex-1"
                    />
                    <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                      {fmtNum(p.done)}/{fmtNum(p.target)}{' '}
                      {target ? 'in total' : PERIOD_NOW[r.goal.period]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-[3px]">
                    {days.map((d) => {
                      const c = r.days.get(d);
                      const meta =
                        c && c.state !== 'none'
                          ? STATE_META[c.state as keyof typeof STATE_META]
                          : null;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => onOpenDay(d)}
                          title={`${fmtDay(d, { weekday: 'short' })} · ${meta?.label ?? 'Nothing due'}`}
                          className="flex size-3 items-center justify-center"
                        >
                          <span
                            className={cn(
                              'rounded-full',
                              meta
                                ? cn('size-2', meta.dot)
                                : 'size-1 bg-white/10 auto-light:bg-black/10',
                              c?.state === 'planned' && 'opacity-50',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-neutral-500">
                    {wholeText(r)}
                    {!target &&
                      over.length > 0 &&
                      ` · ${over.filter((x) => x.met).length}/${over.length} ${PERIOD_NOUN[r.goal.period]}s met`}
                  </p>
                  {target &&
                    !r.goal.achievedAt &&
                    !r.goal.parts?.length &&
                    project.canUpdate && (
                      <AddProgress onAdd={(n) => onAddProgress(r, n)} />
                    )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
};
