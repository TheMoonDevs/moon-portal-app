'use client';

import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { WorkData, WorkPoint } from '@/lib/people/types';
import { cn } from '@/lib/utils';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';

import { Icon } from '../Admin/shared/AdminUI';
import { colorFor, formatMs, type Period, timingOf } from './work';

/*
 * When work happened: one row per day, hours across, a bar for each task
 * from its first update to its last. Each update is a mark on the bar (the
 * start, notes, done), with what happened on hover; a task written down
 * during the day has a + where it came up. Bot work is striped; time spent
 * waiting for input is shaded.
 */

const HOUR = 3600000;
const LANE = 12;
const LANE_GAP = 4;

const MARK_COLOR: Record<string, string> = {
  done: '#34d399',
  doing: '#fbbf24',
  not_done: '#fb7185',
  blocked: '#fb7185',
  waiting: '#a78bfa',
};

/** A tooltip, placed on the page (not in the chart, which scrolls). */
type Tip = { x: number; y: number; lines: string[] };

type Bar = {
  point: WorkPoint;
  day: string;
  from: number;
  to: number;
  waits: { from: number; to: number }[];
  color: string;
  lane: number;
};

/** Lays out bars so overlapping ones sit in separate lanes. */
function pack(bars: Omit<Bar, 'lane'>[]): Bar[] {
  const lanes: number[] = [];
  return bars
    .sort((a, b) => a.from - b.from)
    .map((bar) => {
      let lane = lanes.findIndex((end) => end <= bar.from);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = bar.to + 5 * 60000;
      return { ...bar, lane };
    });
}

export const DayTimeline = ({
  data,
  period,
}: {
  data: WorkData;
  period: Period;
}) => {
  const [focus, setFocus] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const projectColor = useMemo(() => {
    const byId = new Map(data.projects.map((p) => [p.id, p]));
    return (p: WorkPoint) => {
      const project = p.projectId ? byId.get(p.projectId) : undefined;
      return project ? colorFor(project.id, project.color) : '#737373';
    };
  }, [data.projects]);

  const { days, startHour, endHour, untimed } = useMemo(() => {
    const perDay = new Map<string, Omit<Bar, 'lane'>[]>();
    let untimedCount = 0;
    let minH = 24;
    let maxH = 0;
    for (const point of data.points) {
      const t = timingOf(point, now);
      if (!t) {
        untimedCount++;
        continue;
      }
      const waits: { from: number; to: number }[] = [];
      point.events.forEach((e, i) => {
        if (e.status !== 'waiting') return;
        const next = point.events[i + 1];
        waits.push({
          from: Date.parse(e.at),
          to: next ? Date.parse(next.at) : t.end,
        });
      });
      // A bar on each day the point was worked on, from that day's first
      // update to its last; a point carried over gets one bar per day.
      const byDay = new Map<string, number[]>();
      for (const e of point.events) {
        const d = dayjs(e.at).format('YYYY-MM-DD');
        byDay.set(d, [...(byDay.get(d) ?? []), Date.parse(e.at)]);
      }
      const isLive =
        t.end > Date.parse(point.events[point.events.length - 1].at);
      if (isLive) {
        const d = dayjs(t.end).format('YYYY-MM-DD');
        byDay.set(d, [...(byDay.get(d) ?? []), t.end]);
      }
      for (const [day, times] of Array.from(byDay.entries())) {
        if (day < period.from || day > period.to) continue;
        const from = Math.min(...times);
        const to = Math.max(...times);
        const list = perDay.get(day) ?? [];
        list.push({
          point,
          day,
          from,
          to: Math.max(to, from + 10 * 60000),
          waits,
          color: projectColor(point),
        });
        perDay.set(day, list);
        minH = Math.min(minH, dayjs(from).hour());
        maxH = Math.max(maxH, Math.min(24, dayjs(to).hour() + 1));
      }
    }
    const today = dayjs().format('YYYY-MM-DD');
    if (today >= period.from && today <= period.to && !perDay.has(today))
      perDay.set(today, []);
    // Keep a readable window: at least ten hours, padded by one each side.
    let start = Math.max(0, (minH === 24 ? 9 : minH) - 1);
    let end = Math.min(24, (maxH === 0 ? 19 : maxH) + 1);
    if (end - start < 10) {
      const grow = 10 - (end - start);
      start = Math.max(0, start - Math.ceil(grow / 2));
      end = Math.min(24, start + 10);
    }
    return {
      days: Array.from(perDay.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([day, bars]) => ({ day, bars: pack(bars) })),
      startHour: start,
      endHour: end,
      untimed: untimedCount,
    };
  }, [data.points, period, projectColor, now]);

  const span = (endHour - startHour) * HOUR;
  const x = (day: string, ms: number) => {
    const base = dayjs(day).startOf('day').valueOf() + startHour * HOUR;
    return Math.min(100, Math.max(0, ((ms - base) / span) * 100));
  };
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );
  const focused = data.points.find((p) => p.key === focus) ?? null;

  if (!days.length)
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-neutral-400">
        No timed points in this period.
      </div>
    );

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <div className="custom-scrollbar overflow-x-auto">
        <div className="min-w-[560px] px-4 pb-2 pt-3">
          {/* Hours */}
          <div className="relative ml-[72px] h-5">
            {hours.map((h, i) => (
              <span
                key={h}
                className={cn(
                  'absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-neutral-600',
                  i % 2 && hours.length > 13 && 'hidden sm:inline',
                )}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
              >
                {String(h % 24).padStart(2, '0')}
              </span>
            ))}
          </div>

          {days.map(({ day, bars }, row) => {
            const lanes = Math.max(1, ...bars.map((b) => b.lane + 1));
            const height = lanes * LANE + (lanes - 1) * LANE_GAP + 16;
            const isToday = day === dayjs().format('YYYY-MM-DD');
            return (
              <div
                key={day}
                className="flex items-stretch border-t border-white/[0.04]"
              >
                <div className="flex w-[72px] shrink-0 flex-col justify-center pr-2">
                  <p
                    className={cn(
                      'text-xs font-medium',
                      isToday ? 'text-white' : 'text-neutral-400',
                    )}
                  >
                    {isToday ? 'Today' : dayjs(day).format('ddd D')}
                  </p>
                  <p className="text-[10px] text-neutral-600">
                    {bars.length
                      ? `${new Set(bars.map((b) => b.point.key)).size} tasks`
                      : 'nothing yet'}
                  </p>
                </div>
                <div className="relative flex-1" style={{ height }}>
                  {hours.map((h, i) => (
                    <span
                      key={h}
                      className="absolute inset-y-0 w-px bg-white/[0.035]"
                      style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                    />
                  ))}
                  {isToday && (
                    <span
                      className="absolute inset-y-0 z-10 w-px bg-rose-400/70"
                      style={{ left: `${x(day, now)}%` }}
                    />
                  )}
                  {bars.map((bar, i) => {
                    const left = x(day, bar.from);
                    const width = Math.max(0.8, x(day, bar.to) - left);
                    const dim = focus && focus !== bar.point.key;
                    return (
                      <motion.button
                        key={`${bar.point.key}:${i}`}
                        type="button"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: dim ? 0.25 : 1 }}
                        transition={{
                          duration: 0.35,
                          delay: Math.min(row * 0.04 + i * 0.015, 0.5),
                        }}
                        onMouseEnter={() => setFocus(bar.point.key)}
                        onFocus={() => setFocus(bar.point.key)}
                        onClick={() =>
                          setFocus((f) =>
                            f === bar.point.key ? null : bar.point.key,
                          )
                        }
                        aria-label={bar.point.text}
                        className="absolute origin-left overflow-hidden rounded-[4px] ring-white/60 focus:outline-none focus-visible:ring-1"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          top: 8 + bar.lane * (LANE + LANE_GAP),
                          height: LANE,
                          minWidth: 6,
                          backgroundColor: bar.color,
                          backgroundImage: bar.point.byClaude
                            ? 'repeating-linear-gradient(135deg, rgba(10,10,11,.45) 0 3px, transparent 3px 6px)'
                            : undefined,
                          boxShadow:
                            bar.point.status === 'done'
                              ? undefined
                              : 'inset 0 0 0 1px rgba(255,255,255,.25)',
                        }}
                      >
                        {bar.waits.map((w, j) => {
                          const wl = Math.max(w.from, bar.from);
                          const wr = Math.min(w.to, bar.to);
                          if (wr <= wl) return null;
                          return (
                            <span
                              key={j}
                              className="absolute inset-y-0 bg-violet-950/70"
                              style={{
                                left: `${((wl - bar.from) / (bar.to - bar.from)) * 100}%`,
                                width: `${((wr - wl) / (bar.to - bar.from)) * 100}%`,
                              }}
                            />
                          );
                        })}
                      </motion.button>
                    );
                  })}
                  {bars.map((bar, i) => {
                    const top = 8 + bar.lane * (LANE + LANE_GAP) + LANE / 2;
                    const dim = focus && focus !== bar.point.key;
                    const dayEvents = bar.point.events.filter(
                      (e) => dayjs(e.at).format('YYYY-MM-DD') === day,
                    );
                    const created = bar.point.createdAt
                      ? Date.parse(bar.point.createdAt)
                      : NaN;
                    const addedToday =
                      !Number.isNaN(created) &&
                      dayjs(created).format('YYYY-MM-DD') === day;
                    const show = (el: HTMLElement, lines: string[]) => {
                      const r = el.getBoundingClientRect();
                      setTip({ x: r.left + r.width / 2, y: r.bottom, lines });
                    };
                    return (
                      <span key={`m:${bar.point.key}:${i}`}>
                        {addedToday && (
                          <button
                            type="button"
                            aria-label="Written down during the day"
                            onMouseEnter={(ev) =>
                              show(ev.currentTarget, [
                                `Written down ${dayjs(created).format('HH:mm')}`,
                                bar.point.text,
                              ])
                            }
                            onMouseLeave={() => setTip(null)}
                            onFocus={(ev) =>
                              show(ev.currentTarget, [
                                `Written down ${dayjs(created).format('HH:mm')}`,
                                bar.point.text,
                              ])
                            }
                            onBlur={() => setTip(null)}
                            className="absolute z-20 flex size-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sky-400 text-[11px] font-bold leading-none text-neutral-950 transition-opacity"
                            style={{
                              left: `${x(day, created)}%`,
                              top,
                              opacity: dim ? 0.25 : 1,
                            }}
                          >
                            +
                          </button>
                        )}
                        {dayEvents.map((e, j) => {
                          const left = x(day, Date.parse(e.at));
                          const lines = [
                            `${dayjs(e.at).format('HH:mm')} · ${
                              e.status
                                ? POINT_STATUSES[e.status].label
                                : e.by === 'claude'
                                  ? 'Update from Claude'
                                  : 'Note'
                            }`,
                            ...(e.note ? [e.note] : []),
                            bar.point.text,
                          ];
                          return (
                            <button
                              key={`${e.at}:${j}`}
                              type="button"
                              aria-label={lines.join('. ')}
                              onMouseEnter={(ev) => {
                                setFocus(bar.point.key);
                                show(ev.currentTarget, lines);
                              }}
                              onMouseLeave={() => setTip(null)}
                              onFocus={(ev) => show(ev.currentTarget, lines)}
                              onBlur={() => setTip(null)}
                              className="absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-neutral-950 transition-opacity"
                              style={{
                                left: `${left}%`,
                                top,
                                opacity: dim ? 0.25 : 1,
                                backgroundColor: e.status
                                  ? MARK_COLOR[e.status]
                                  : e.by === 'claude'
                                    ? '#fdba74'
                                    : '#e5e5e5',
                              }}
                            />
                          );
                        })}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {tip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[1400] max-w-[280px] -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-[11px] leading-4 text-neutral-200 shadow-xl shadow-black/40"
            style={{
              left: Math.min(window.innerWidth - 150, Math.max(150, tip.x)),
              top: tip.y + 8,
            }}
          >
            <p className="font-medium text-white">{tip.lines[0]}</p>
            {tip.lines.slice(1).map((l, k) => (
              <p
                key={k}
                className={cn(
                  k === tip.lines.length - 2
                    ? 'truncate text-neutral-500'
                    : 'text-neutral-300',
                )}
              >
                {l}
              </p>
            ))}
          </div>,
          document.body,
        )}

      {/* The point under the pointer, or a key to the chart */}
      <div className="flex min-h-[52px] items-center gap-3 border-t border-white/[0.06] px-4 py-2.5">
        {focused ? (
          <FocusedPoint
            point={focused}
            color={projectColor(focused)}
            data={data}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-[3px] bg-neutral-400" />
              Hands-on
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-5 rounded-[3px] bg-neutral-400"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg, rgba(10,10,11,.45) 0 3px, transparent 3px 6px)',
                }}
              />
              By bot
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-[3px] bg-violet-950 ring-1 ring-inset ring-violet-400/30" />
              Waiting for input
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-[3px] ring-1 ring-inset ring-white/40" />
              Not done yet
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              <span className="size-2 rounded-full bg-emerald-400" />
              An update (hover for it)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-3.5 items-center justify-center rounded-full bg-sky-400 text-[11px] font-bold leading-none text-neutral-950">
                +
              </span>
              Written down during the day
            </span>
            {untimed > 0 && (
              <span className="text-neutral-600">
                {untimed} {untimed === 1 ? 'point has' : 'points have'} no times
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FocusedPoint = ({
  point,
  color,
  data,
}: {
  point: WorkPoint;
  color: string;
  data: WorkData;
}) => {
  const t = timingOf(point);
  const project = data.projects.find((p) => p.id === point.projectId);
  const task = [...data.tasks, ...data.doneTasks].find(
    (x) => x.id === point.taskId,
  );
  const company = project
    ? undefined
    : data.companies.find((c) => c.id === point.companyId && !c.isPersonal);
  return (
    <>
      <span
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-neutral-100">
          {point.byClaude && (
            <Icon
              name="smart_toy"
              className="mr-1 align-[-2px] text-[14px] text-orange-300"
            />
          )}
          {point.text}
        </p>
        <p className="truncate text-[11px] text-neutral-500">
          {(company
            ? `${company.name} › General`
            : [project?.name, task?.title].filter(Boolean).join(' › ')) ||
            'Not on a project'}
          {point.status && ` · ${POINT_STATUSES[point.status].label}`}
        </p>
      </div>
      {t && (
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold tabular-nums text-white">
            {formatMs(t.end - t.start)}
          </p>
          <p className="text-[10px] tabular-nums text-neutral-500">
            {dayjs(t.start).format('HH:mm')} –{' '}
            {t.finished ? dayjs(t.end).format('HH:mm') : 'now'}
          </p>
        </div>
      )}
    </>
  );
};
