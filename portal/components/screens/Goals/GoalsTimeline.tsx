'use client';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';
import { GOAL_STATUS } from '@/lib/workspace/goalCalendar';
import { isTarget, PERIOD_NOUN } from '@/lib/workspace/projects';

import { Icon } from '../Admin/shared/AdminUI';
import { Tip, TipRow, TipTitle } from '../Projects/Tip';
import { byProject, doneOver, type GoalRow, type WorkIndex } from './model';
import {
  Bar,
  card,
  EffortTag,
  fmtDay,
  fmtNum,
  ProjectLogo,
  STATE_META,
} from './ui';

const CELL = 22;

const PERIOD_NOW: Record<string, string> = {
  day: 'today',
  week: 'this week',
  fortnight: 'these 2 weeks',
  month: 'this month',
  quarter: 'this quarter',
};

/** The goal's name, standing and progress now. */
const GoalHead = ({ row }: { row: GoalRow }) => {
  const p = row.goal.progress;
  const target = isTarget(row.goal);
  const status = GOAL_STATUS[row.status];
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <Tip
          content={
            <>
              <TipTitle>{status.label}</TipTitle>
              {status.hint}
            </>
          }
        >
          <span
            className={cn(
              'size-2 shrink-0 cursor-help rounded-full',
              status.dot,
            )}
          />
        </Tip>
        <span className="truncate text-[13px] font-medium text-neutral-100 auto-light:text-neutral-900">
          {row.label}
        </span>
        {target && (
          <Icon name="flag" className="shrink-0 text-[13px] text-neutral-500" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Bar
          percent={p.percent}
          color={p.percent >= 100 ? '#34d399' : row.color}
          className="w-16 shrink-0"
        />
        <span className="truncate text-[11px] tabular-nums text-neutral-500">
          {fmtNum(p.done)}/{fmtNum(p.target)}{' '}
          {target ? 'in total' : (PERIOD_NOW[row.goal.period] ?? '')}
          {!target && ` · ${row.cadence}`}
        </span>
      </div>
    </div>
  );
};

/**
 * Every goal as a row of days, grouped by company and project: one square a
 * day, coloured by how it went, with the goal's periods underneath (green
 * met, red missed). The left column says where each goal stands now; a
 * project's name opens it in the sidebar, with the tasks it finished.
 * On wide screens it fills the screen and scrolls inside itself.
 */
export const GoalsTimeline = ({
  rows,
  days,
  done,
  today,
  selected,
  selectedProject,
  onSelect,
  onSelectProject,
}: {
  rows: GoalRow[];
  /** The days of the month shown. */
  days: string[];
  done: WorkIndex;
  today: string;
  selected: string | null;
  selectedProject: string | null;
  onSelect: (day: string) => void;
  onSelectProject: (projectId: string) => void;
}) => {
  const groups = byProject(rows);
  const grid: CSSProperties = {
    gridTemplateColumns: `repeat(${days.length}, ${CELL}px)`,
  };
  const at = (day: string) => days.indexOf(day);

  return (
    <div className={cn(card, 'flex flex-col overflow-hidden md:h-full')}>
      <div className="custom-scrollbar overflow-x-auto md:min-h-0 md:flex-1 md:overflow-auto">
        <div className="min-w-max">
          {/* Day numbers */}
          <div className="sticky top-0 z-10 flex border-b border-white/[0.06] bg-neutral-950/90 backdrop-blur auto-light:border-black/[0.06] auto-light:bg-white/90">
            <div className="sticky left-0 z-10 w-[230px] shrink-0 bg-neutral-950 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 auto-light:bg-white md:w-[290px]">
              Goal
            </div>
            <div className="grid gap-[3px] px-2 py-1.5" style={grid}>
              {days.map((d) => {
                const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelect(d)}
                    className={cn(
                      'flex flex-col items-center rounded-md text-[10px] tabular-nums leading-tight',
                      d === today
                        ? 'bg-white text-neutral-950 auto-light:bg-neutral-900 auto-light:text-white'
                        : d === selected
                          ? 'bg-white/[0.1] text-white auto-light:bg-black/[0.07] auto-light:text-neutral-950'
                          : wd === 0 || wd === 6
                            ? 'text-neutral-600 auto-light:text-neutral-400'
                            : 'text-neutral-400 auto-light:text-neutral-600',
                    )}
                  >
                    <span className="opacity-70">{'SMTWTFS'[wd]}</span>
                    {Number(d.slice(8, 10))}
                  </button>
                );
              })}
            </div>
          </div>

          {groups.map(({ project, rows: list }) => (
            <div
              key={project.id}
              className="border-b border-white/[0.05] last:border-0 auto-light:border-black/[0.05]"
            >
              <div className="sticky left-0 flex w-[300px] items-center gap-2 px-3 pb-1 pt-3 md:w-[520px]">
                <ProjectLogo project={project} size={20} />
                <button
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  aria-pressed={selectedProject === project.id}
                  className={cn(
                    'truncate text-xs font-semibold hover:text-white hover:underline auto-light:hover:text-neutral-950',
                    selectedProject === project.id
                      ? 'text-white underline auto-light:text-neutral-950'
                      : 'text-neutral-300 auto-light:text-neutral-700',
                  )}
                >
                  {project.name}
                </button>
                <span className="truncate text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  {list[0].company?.name}
                </span>
                {(() => {
                  const n = doneOver(done, project.id, days);
                  return n > 0 ? (
                    <span
                      title={`${n} task${n === 1 ? '' : 's'} finished this month`}
                      className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-400/10 px-1.5 text-[10px] font-medium tabular-nums text-emerald-300 auto-light:bg-emerald-50 auto-light:text-emerald-700"
                    >
                      <Icon name="check" className="text-[11px]" />
                      {n}
                    </span>
                  ) : null;
                })()}
                <EffortTag effort={list[0].effort} />
              </div>
              {list.map((row) => (
                <div
                  key={row.key}
                  className="group flex items-center hover:bg-white/[0.02] auto-light:hover:bg-black/[0.015]"
                >
                  <div className="sticky left-0 z-[1] flex w-[230px] shrink-0 items-center bg-neutral-950 py-1.5 pl-3 pr-2 group-hover:bg-[#0d0d0d] auto-light:bg-white auto-light:group-hover:bg-neutral-50 md:w-[290px]">
                    <span
                      className="mr-2 h-7 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <GoalHead row={row} />
                  </div>
                  <div className="flex flex-col gap-[3px] px-2 py-1.5">
                    <div className="grid gap-[3px]" style={grid}>
                      {days.map((d) => {
                        const c = row.days.get(d);
                        const state = c?.state ?? 'none';
                        const meta =
                          state === 'none'
                            ? null
                            : STATE_META[state as keyof typeof STATE_META];
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => onSelect(d)}
                            title={`${fmtDay(d, { weekday: 'short' })} · ${meta?.label ?? 'Nothing due'}${c && c.due > 1 ? ` · ${Math.min(c.done, c.due)}/${c.due}` : ''}`}
                            className={cn(
                              'group/cell flex h-[22px] items-center justify-center rounded-[5px]',
                              d === selected
                                ? 'bg-white/[0.08] auto-light:bg-black/[0.06]'
                                : 'hover:bg-white/[0.04] auto-light:hover:bg-black/[0.04]',
                            )}
                          >
                            <span
                              className={cn(
                                'rounded-full transition-transform group-hover/cell:scale-125',
                                meta
                                  ? cn('size-2.5', meta.dot)
                                  : 'size-1 bg-white/10 auto-light:bg-black/10',
                                state === 'planned' && 'opacity-50',
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                    {!isTarget(row.goal) && row.periods.length > 0 && (
                      <div className="grid gap-[3px]" style={grid}>
                        {row.periods.map((p) => {
                          const start = Math.max(
                            0,
                            at(p.from < days[0] ? days[0] : p.from),
                          );
                          const last =
                            p.to > days[days.length - 1]
                              ? days.length - 1
                              : at(p.to);
                          if (last < 0) return null;
                          return (
                            <Tip
                              key={p.from}
                              content={
                                <>
                                  <TipTitle>
                                    {p.from === p.to
                                      ? fmtDay(p.from, { weekday: 'short' })
                                      : `${fmtDay(p.from)} – ${fmtDay(p.to)}`}
                                  </TipTitle>
                                  <TipRow
                                    label={`Done this ${PERIOD_NOUN[row.goal.period]}`}
                                    value={`${p.done}/${p.target}`}
                                    color={
                                      p.met
                                        ? '#34d399'
                                        : p.met === false
                                          ? '#fb7185'
                                          : '#a3a3a3'
                                    }
                                  />
                                  {p.manual > 0 && (
                                    <TipRow
                                      label="Added by hand"
                                      value={p.manual}
                                    />
                                  )}
                                  <p className="mt-1 text-[11px] text-neutral-500">
                                    {p.met
                                      ? 'Met its target.'
                                      : p.met === false
                                        ? 'Ended short of its target.'
                                        : 'Still running.'}
                                  </p>
                                </>
                              }
                            >
                              <span
                                className={cn(
                                  'h-1 cursor-help rounded-full',
                                  p.met
                                    ? 'bg-emerald-400/80'
                                    : p.met === false
                                      ? 'bg-rose-400/70'
                                      : 'bg-white/20 auto-light:bg-black/15',
                                )}
                                style={{
                                  gridColumn: `${start + 1} / ${last + 2}`,
                                }}
                              />
                            </Tip>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="h-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
