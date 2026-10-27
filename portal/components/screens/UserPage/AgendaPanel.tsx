'use client';

import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { AgendaData, PagePlan, PageProject } from '@/lib/people/types';
import { cn } from '@/lib/utils';
import { describeSchedule } from '@/lib/workspace/projects';
import { MEET_BOOKING_STATUS } from '@/models/meet';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon } from '../Admin/shared/AdminUI';
import {
  type AgendaItem,
  agendaItems,
  byTime,
  itemProjectId,
  itemTitle,
  KIND_META,
  today,
  upNext,
} from './agenda';

/* -------------------------------------------------------------------------- */
/*                                  Calendar                                  */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MonthGrid = ({
  month,
  items,
  selected,
  onSelect,
  onMonth,
}: {
  month: dayjs.Dayjs;
  items: AgendaItem[];
  selected: string | null;
  onSelect: (day: string | null) => void;
  onMonth: (m: dayjs.Dayjs) => void;
}) => {
  const t = today();
  const first = month.startOf('month');
  const gridStart = first.subtract((first.day() + 6) % 7, 'day');
  const weeks = Math.ceil(((first.day() + 6) % 7) + month.daysInMonth()) / 7;
  const cells = Array.from({ length: Math.ceil(weeks) * 7 }, (_, i) =>
    gridStart.add(i, 'day'),
  );
  const byDay = useMemo(() => {
    const out = new Map<string, Set<AgendaItem['kind']>>();
    for (const item of items) {
      if (!item.day) continue;
      const kinds = out.get(item.day) ?? new Set();
      kinds.add(item.kind);
      out.set(item.day, kinds);
    }
    return out;
  }, [items]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <p className="flex-1 text-sm font-semibold text-white">
          {month.format('MMMM YYYY')}
        </p>
        {!month.isSame(dayjs(), 'month') && (
          <button
            type="button"
            onClick={() => {
              onMonth(dayjs().startOf('month'));
              onSelect(null);
            }}
            className="rounded-md px-2 py-1 text-[11px] text-neutral-400 hover:bg-white/[0.06] hover:text-white"
          >
            Today
          </button>
        )}
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonth(month.subtract(1, 'month'))}
          className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white/[0.06] hover:text-white"
        >
          <Icon name="chevron_left" className="text-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonth(month.add(1, 'month'))}
          className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white/[0.06] hover:text-white"
        >
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <span
            key={i}
            className="pb-1 text-[10px] font-medium text-neutral-600"
          >
            {d}
          </span>
        ))}
        {cells.map((d) => {
          const key = d.format('YYYY-MM-DD');
          const inMonth = d.isSame(month, 'month');
          const kinds = byDay.get(key);
          const isToday = key === t;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(isSelected ? null : key)}
              className={cn(
                'relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors',
                isSelected
                  ? 'bg-white text-neutral-950'
                  : isToday
                    ? 'bg-white/[0.08] font-semibold text-white'
                    : inMonth
                      ? 'text-neutral-300 hover:bg-white/[0.05]'
                      : 'text-neutral-700 hover:bg-white/[0.03]',
                key < t && !isSelected && inMonth && 'text-neutral-500',
              )}
            >
              {d.date()}
              {kinds && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {(['meeting', 'task', 'step', 'repeat'] as const)
                    .filter((k) => kinds.has(k))
                    .map((k) => (
                      <span
                        key={k}
                        className={cn(
                          'size-1 rounded-full',
                          KIND_META[k].dot,
                          isSelected && 'opacity-80',
                        )}
                      />
                    ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    Items                                   */
/* -------------------------------------------------------------------------- */

const ItemRow = ({
  item,
  project,
  planTitle,
  showDay,
  canTick,
  onTick,
}: {
  item: AgendaItem;
  project?: PageProject;
  planTitle?: string;
  showDay: boolean;
  canTick: boolean;
  onTick: (taskId: string) => void;
}) => {
  const meta = KIND_META[item.kind];
  const t = today();
  const overdue = !!item.day && item.day < t && item.kind !== 'meeting';
  const sub: string[] = [];
  if (item.kind === 'meeting') {
    sub.push(
      `${dayjs(item.meeting.start).format('HH:mm')}–${dayjs(item.meeting.end).format('HH:mm')}`,
    );
    if (item.meeting.status !== MEET_BOOKING_STATUS.CONFIRMED)
      sub.push(
        item.meeting.status === MEET_BOOKING_STATUS.PENDING
          ? 'Needs your answer'
          : 'New time proposed',
      );
  }
  if (item.kind === 'step' && planTitle) sub.push(planTitle);
  if (item.kind === 'repeat') sub.push(describeSchedule(item.schedule));
  if (project) sub.push(project.name);
  if (showDay && item.day)
    sub.unshift(
      item.day === t
        ? 'Today'
        : item.day === dayjs().add(1, 'day').format('YYYY-MM-DD')
          ? 'Tomorrow'
          : dayjs(item.day).format('ddd D MMM'),
    );

  const href =
    item.kind === 'meeting'
      ? `${APP_ROUTES.meet}?booking=${item.meeting.id}`
      : item.kind === 'step'
        ? APP_ROUTES.plans
        : project
          ? `${APP_ROUTES.projects}/${project.id}?view=schedule`
          : null;

  const body = (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          'text-[13px] leading-5',
          item.kind === 'repeat' ? 'text-neutral-400' : 'text-neutral-100',
        )}
      >
        {itemTitle(item)}
      </p>
      {sub.length > 0 && (
        <p
          className={cn(
            'truncate text-[11px]',
            overdue ? 'text-rose-300/80' : 'text-neutral-500',
          )}
        >
          {sub.join(' · ')}
        </p>
      )}
    </div>
  );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="group flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
    >
      {item.kind === 'task' && canTick ? (
        <button
          type="button"
          onClick={() => onTick(item.task.id)}
          aria-label={`Mark “${item.task.title}” done`}
          title="Mark done"
          className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border border-neutral-600 text-transparent transition-colors hover:border-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
        >
          <Icon name="check" className="text-[12px]" />
        </button>
      ) : (
        <span className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center">
          {item.kind === 'meeting' ? (
            <Icon name="videocam" className="text-[16px] text-emerald-400" />
          ) : item.kind === 'repeat' ? (
            <Icon name="repeat" className="text-[15px] text-amber-300/80" />
          ) : item.kind === 'step' ? (
            <Icon name="flag" className="text-[15px] text-violet-300" />
          ) : (
            <span className={cn('size-2 rounded-full', meta.dot)} />
          )}
        </span>
      )}
      {href ? (
        <Link href={href} className="min-w-0 flex-1">
          {body}
        </Link>
      ) : (
        body
      )}
      {item.kind === 'meeting' && item.meeting.meetingUrl && (
        <a
          href={item.meeting.meetingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 shrink-0 rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-400/20"
        >
          Join
        </a>
      )}
    </motion.li>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    Plans                                   */
/* -------------------------------------------------------------------------- */

const PlanRow = ({
  plan,
  companyName,
}: {
  plan: PagePlan;
  companyName?: string;
}) => {
  const percent = plan.total ? Math.round((plan.done / plan.total) * 100) : 0;
  const ends = plan.endOn ? dayjs(plan.endOn) : null;
  return (
    <Link
      href={APP_ROUTES.plans}
      className="block rounded-xl p-2 transition-colors hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-100">
          {plan.title}
        </p>
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium',
            plan.status === 'ACTIVE'
              ? 'bg-sky-400/10 text-sky-300'
              : 'bg-white/[0.06] text-neutral-400',
          )}
        >
          {plan.status === 'ACTIVE' ? 'Active' : 'Idea'}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-violet-400"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-neutral-500">
          {plan.done}/{plan.total}
        </span>
      </div>
      <p className="mt-1 truncate text-[11px] text-neutral-500">
        {[
          companyName,
          plan.mine > 0 &&
            `${plan.mine} ${plan.mine === 1 ? 'step' : 'steps'} on you`,
          ends &&
            (ends.isBefore(dayjs(), 'day')
              ? `was due ${ends.format('D MMM')}`
              : `by ${ends.format('D MMM')}`),
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </Link>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    Panel                                   */
/* -------------------------------------------------------------------------- */

const Card = ({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      'rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3',
      className,
    )}
  >
    {title && (
      <div className="mb-1 flex items-center justify-between px-2 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </p>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const AgendaPanel = ({
  agenda,
  canTick,
  onTick,
}: {
  agenda: AgendaData | null;
  canTick: boolean;
  onTick: (taskId: string) => void;
}) => {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [selected, setSelected] = useState<string | null>(null);

  const monthItems = useMemo(() => {
    if (!agenda) return [];
    const from = month.startOf('month').subtract(7, 'day');
    const to = month.endOf('month').add(7, 'day');
    return agendaItems(
      agenda,
      from.format('YYYY-MM-DD'),
      to.format('YYYY-MM-DD'),
    );
  }, [agenda, month]);
  const buckets = useMemo(() => (agenda ? upNext(agenda) : []), [agenda]);

  const projectOf = (item: AgendaItem) => {
    const id = itemProjectId(item);
    return id ? agenda?.projects.find((p) => p.id === id) : undefined;
  };
  const planTitle = (item: AgendaItem) =>
    item.kind === 'step'
      ? agenda?.plans.find((p) => p.id === item.step.planId)?.title
      : undefined;
  const companyName = (id: string) =>
    agenda?.companies.find((c) => c.id === id)?.name;

  const dayItems = selected
    ? monthItems.filter((i) => i.day === selected).sort(byTime)
    : [];
  const meetingsAhead = (agenda?.meetings ?? []).length;

  const row = (item: AgendaItem, showDay: boolean) => (
    <ItemRow
      key={item.id}
      item={item}
      project={projectOf(item)}
      planTitle={planTitle(item)}
      showDay={showDay}
      canTick={canTick}
      onTick={onTick}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="p-1">
          <MonthGrid
            month={month}
            items={monthItems}
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              if (d && !dayjs(d).isSame(month, 'month'))
                setMonth(dayjs(d).startOf('month'));
            }}
            onMonth={setMonth}
          />
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/[0.05] px-1 pt-2.5">
            {(['task', 'step', 'repeat', 'meeting'] as const)
              .filter((k) => k !== 'meeting' || agenda?.meetings)
              .map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500"
                >
                  <span
                    className={cn('size-1.5 rounded-full', KIND_META[k].dot)}
                  />
                  {KIND_META[k].label}
                </span>
              ))}
          </div>
        </div>
      </Card>

      <Card
        title={selected ? dayjs(selected).format('dddd, D MMMM') : 'Up next'}
        action={
          selected ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[11px] text-neutral-500 hover:text-white"
            >
              Show all
            </button>
          ) : agenda?.meetings ? (
            <Link
              href={APP_ROUTES.meet}
              className="text-[11px] text-neutral-500 hover:text-white"
            >
              {meetingsAhead
                ? `${meetingsAhead} ${meetingsAhead === 1 ? 'meeting' : 'meetings'}`
                : 'Meetings'}
            </Link>
          ) : null
        }
      >
        {!agenda ? (
          <div className="flex flex-col gap-2 p-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-white/[0.03]"
              />
            ))}
          </div>
        ) : selected ? (
          dayItems.length ? (
            <ul className="flex flex-col">
              <AnimatePresence initial={false}>
                {dayItems.map((i) => row(i, false))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="px-2 py-6 text-center text-xs text-neutral-500">
              Nothing on this day.
            </p>
          )
        ) : buckets.length ? (
          <div className="flex flex-col gap-2">
            {buckets.map((b) => (
              <div key={b.key}>
                <p
                  className={cn(
                    'px-2 pb-0.5 pt-1.5 text-[11px] font-medium',
                    b.key === 'overdue'
                      ? 'text-rose-300/90'
                      : 'text-neutral-400',
                  )}
                >
                  {b.label}
                  <span className="ml-1.5 text-neutral-600">
                    {b.items.length}
                  </span>
                </p>
                <ul className="flex flex-col">
                  <AnimatePresence initial={false}>
                    {b.items
                      .slice(
                        0,
                        b.key === 'anytime' || b.key === 'later' ? 6 : 20,
                      )
                      .map((i) =>
                        row(
                          i,
                          b.key === 'week' ||
                            b.key === 'later' ||
                            b.key === 'overdue',
                        ),
                      )}
                  </AnimatePresence>
                </ul>
                {(b.key === 'anytime' || b.key === 'later') &&
                  b.items.length > 6 && (
                    <p className="px-2 pt-0.5 text-[11px] text-neutral-600">
                      +{b.items.length - 6} more
                    </p>
                  )}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-2 py-6 text-center text-xs text-neutral-500">
            Nothing coming up. Enjoy the quiet.
          </p>
        )}
      </Card>

      {agenda && agenda.plans.length > 0 && (
        <Card
          title="Plans"
          action={
            <Link
              href={APP_ROUTES.plans}
              className="text-[11px] text-neutral-500 hover:text-white"
            >
              All plans
            </Link>
          }
        >
          <div className="flex flex-col">
            {agenda.plans.slice(0, 6).map((p) => (
              <PlanRow
                key={p.id}
                plan={p}
                companyName={companyName(p.companyId)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
