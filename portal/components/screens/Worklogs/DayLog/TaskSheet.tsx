'use client';

import * as Popover from '@radix-ui/react-popover';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import type { PointStatus } from '@/lib/worklogs/timeline';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';

import { Icon } from '../../Admin/shared/AdminUI';
import type { PickerOption } from './Picker';
import { Picker } from './Picker';
import type { TaskRowStatus } from './sheetParts';
import {
  LineInput,
  PlaceChip,
  placeInput,
  placeOf,
  placeOptions,
  readablePoints,
  rowStatus,
  statusForKey,
  StatusIcon,
} from './sheetParts';
import type { Day, DayPoint, DayTask, TaskMove } from './useDay';

/*
 * The day's tasks on one sheet, written like the steps of a plan: Enter
 * adds the next task, Backspace on an empty one takes it out, the arrows
 * move between them. A task's details (where it is, its history and the
 * work points under it, Claude's too) open with the chevron on its right.
 */

const STATUS_KEYS = Object.keys(POINT_STATUSES) as PointStatus[];

const isOpen = (t: DayTask) =>
  !['DONE', 'ARCHIVED', 'IGNORED'].includes(t.status);

/** A task's menu: its status, archiving, and taking it out. */
const RowMenu = ({
  status,
  onMove,
  onRemove,
}: {
  status: TaskRowStatus;
  onMove: (to: TaskMove) => void;
  onRemove?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const item =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]';
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Task options"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-500 opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-neutral-200 focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800 max-md:opacity-100"
        >
          <Icon name="more_horiz" className="text-[18px]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className="auto-theme z-[1300] w-56 rounded-xl border border-white/10 bg-neutral-900 p-1 text-sm text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Status
          </p>
          <button
            type="button"
            onClick={() => {
              onMove('todo');
              setOpen(false);
            }}
            className={cn(
              item,
              !status && 'bg-white/[0.06] auto-light:bg-black/[0.06]',
            )}
          >
            <StatusIcon status={null} className="text-[16px]" />
            To do
          </button>
          {STATUS_KEYS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onMove(s);
                setOpen(false);
              }}
              className={cn(
                item,
                status === s && 'bg-white/[0.06] auto-light:bg-black/[0.06]',
              )}
            >
              <StatusIcon status={s} className="text-[16px]" />
              {POINT_STATUSES[s].label}
            </button>
          ))}
          <div className="my-1 border-t border-white/[0.07] auto-light:border-black/10" />
          <button
            type="button"
            onClick={() => {
              onMove('archived');
              setOpen(false);
            }}
            className={item}
          >
            <Icon
              name="inventory_2"
              className="text-[16px] text-neutral-400 auto-light:text-neutral-500"
            />
            Archive
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-rose-300 hover:bg-rose-500/10 auto-light:text-rose-700"
            >
              <Icon name="delete" className="text-[16px]" />
              Take it out
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

/** One work point in a task's history: the person's own carry their icon. */
const PointRow = ({
  point,
  moveOptions,
  onMove,
}: {
  point: DayPoint;
  moveOptions: PickerOption[];
  onMove?: (option: PickerOption) => void;
}) => {
  const mine = point.by === 'person';
  return (
    <li className="group/point flex items-start gap-2 py-0.5 text-[13px] leading-5">
      {mine ? (
        <span
          title="You did this"
          className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-300 auto-light:text-sky-700"
        >
          <Icon name="person" filled className="text-[11px]" />
        </span>
      ) : point.status ? (
        <StatusIcon status={point.status} className="mt-[3px] text-[14px]" />
      ) : (
        <span className="mx-1.5 mt-[9px] size-1 shrink-0 rounded-full bg-neutral-600 auto-light:bg-neutral-400" />
      )}
      <span className="min-w-0 flex-1 text-neutral-300 auto-light:text-neutral-700">
        {point.text ||
          (point.status ? POINT_STATUSES[point.status].label : 'Updated')}
      </span>
      {onMove && moveOptions.length > 0 && (
        <Picker
          options={moveOptions}
          onPick={onMove}
          placeholder="Move it under another task…"
          empty="No tasks match"
          align="end"
          trigger={
            <button
              type="button"
              title="Move it under another task"
              className="shrink-0 rounded px-1 text-neutral-600 opacity-0 hover:text-neutral-300 focus:opacity-100 group-hover/point:opacity-100 auto-light:text-neutral-400 auto-light:hover:text-neutral-700 max-md:opacity-100"
            >
              <Icon name="swap_vert" className="text-[14px]" />
            </button>
          }
        />
      )}
    </li>
  );
};

const span = (from: dayjs.Dayjs, to: dayjs.Dayjs) => {
  const minutes = Math.max(0, to.diff(from, 'minute'));
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
};

/**
 * How long a task has run: when it started on the left, when it ended (or
 * now) on the right, and the time between on the bar.
 */
const TimeSpan = ({ task, points }: { task: DayTask; points: DayPoint[] }) => {
  const finished = task.status === 'DONE' && !!task.completedAt;
  // A task not started yet has no span to show.
  const startIso =
    task.startedAt ?? points[0]?.at ?? (finished ? task.createdAt : null);
  if (!startIso) return null;
  const start = dayjs(startIso);
  const end = finished ? dayjs(task.completedAt) : dayjs();
  const sameDay = start.isSame(end, 'day');
  const label = (d: dayjs.Dayjs) =>
    sameDay ? d.format('HH:mm') : d.format('ddd HH:mm');
  return (
    <div className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-neutral-500">
      <span className="shrink-0">{label(start)}</span>
      <div className="relative flex h-4 min-w-0 flex-1 items-center">
        <span
          className={cn(
            'h-[2px] w-full rounded-full',
            finished
              ? 'bg-emerald-400/50 auto-light:bg-emerald-500/50'
              : 'bg-gradient-to-r from-amber-400/50 to-amber-400/10 auto-light:from-amber-500/60 auto-light:to-amber-500/10',
          )}
        />
        <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-1.5 text-neutral-400 auto-light:bg-white auto-light:text-neutral-600">
          {span(start, end)}
        </span>
      </div>
      <span className="shrink-0">{finished ? label(end) : 'now'}</span>
    </div>
  );
};

/** A task's details, under it when its chevron is open. */
const Details = ({
  task,
  day,
  points,
  editable,
  moveOptions,
  showPoints,
}: {
  task: DayTask;
  day: Day;
  points: DayPoint[];
  editable: boolean;
  moveOptions: PickerOption[];
  showPoints: boolean;
}) => {
  const [note, setNote] = useState('');
  const place = placeOf(task, day.projects, day.companies);
  const options = placeOptions(day.projects, day.companies);
  const saved = !task.draft;
  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    setNote('');
    day.addNote(task.id, text);
  };
  const facts: string[] = [];
  if (task.forDate && task.forDate !== day.date)
    facts.push(`Planned for ${dayjs(task.forDate).format('ddd D MMM')}`);
  if (task.madeBy && task.madeBy !== 'person') facts.push('Made by Claude');
  if (task.size === 'MAJOR') facts.push('Major task');

  return (
    <div className="ml-[13px] mt-1 border-l border-white/[0.07] pb-2 pl-4 auto-light:border-black/10">
      <TimeSpan task={task} points={points} />
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        <PlaceChip
          place={place}
          options={editable && saved ? options : undefined}
          onPick={(o) => day.place(task.id, placeInput(o))}
        />
        {facts.map((f) => (
          <span key={f}>{f}</span>
        ))}
        {editable && saved && isOpen(task) && (
          <label className="flex items-center gap-1 hover:text-neutral-300 auto-light:hover:text-neutral-700">
            <Icon name="event" className="text-[13px]" />
            <span>Plan for</span>
            <input
              type="date"
              value={task.forDate ?? ''}
              onChange={(e) =>
                e.target.value && day.planFor(task.id, e.target.value)
              }
              className="bg-transparent text-[11px] text-neutral-400 [color-scheme:dark] focus:outline-none auto-light:text-neutral-600 auto-light:[color-scheme:light]"
            />
          </label>
        )}
      </div>
      {showPoints && points.length > 0 && (
        <ul className="mt-1.5">
          {readablePoints(points).map((p) => (
            <PointRow
              key={p.id}
              point={p}
              moveOptions={moveOptions}
              onMove={
                editable ? (o) => day.movePoint(p.id, o.id.slice(5)) : undefined
              }
            />
          ))}
        </ul>
      )}
      {saved && (
        <div className="mt-1 flex items-center gap-2">
          <Icon
            name="subdirectory_arrow_right"
            className="text-[14px] text-neutral-600 auto-light:text-neutral-400"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Add a note on what happened"
            className="flex-1 bg-transparent text-[13px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none auto-light:text-neutral-800 auto-light:placeholder:text-neutral-400"
          />
        </div>
      )}
    </div>
  );
};

export const TaskSheet = ({
  day,
  tasks,
  editable,
  showPoints,
}: {
  day: Day;
  /** The tasks shown, in order (the day's, or one project's). */
  tasks: DayTask[];
  editable: boolean;
  /** Work points: their count after each task, and the list under it. */
  showPoints: boolean;
}) => {
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState('');

  useEffect(() => {
    if (!focusId) return;
    const el = inputs.current.get(focusId);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      setFocusId(null);
    }
  }, [focusId, tasks]);

  const order = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const pointsOf = (id: string) => day.points.filter((p) => p.taskId === id);

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    task: DayTask,
    status: TaskRowStatus,
  ) => {
    const el = e.currentTarget;
    const key = statusForKey(e);
    if (key) {
      e.preventDefault();
      day.move(task.id, status === key ? 'todo' : key);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      day.flush(task.id);
      // The next task goes in the same place when it was put there by hand.
      const place =
        task.placedBy === 'user' && task.projectId
          ? { projectId: task.projectId }
          : task.placedBy === 'user' && task.companyId
            ? { companyId: task.companyId }
            : task.placedBy === 'personal'
              ? ({ personal: true } as const)
              : null;
      setFocusId(day.addDraft(task.id, place));
      return;
    }
    if (e.key === 'Backspace' && !task.title) {
      e.preventDefault();
      const index = order.indexOf(task.id);
      if (index > 0) setFocusId(order[index - 1]);
      day.remove(task.id);
      return;
    }
    if (e.key === 'ArrowUp' && el.selectionStart === 0) {
      const index = order.indexOf(task.id);
      if (index > 0) {
        e.preventDefault();
        setFocusId(order[index - 1]);
      }
    }
    if (e.key === 'ArrowDown' && el.selectionEnd === el.value.length) {
      const index = order.indexOf(task.id);
      if (index >= 0 && index < order.length - 1) {
        e.preventDefault();
        setFocusId(order[index + 1]);
      }
    }
  };

  const addFromInput = () => {
    const text = adding.trim();
    if (!text) return;
    const id = day.addDraft(null, null);
    day.editTitle(id, text);
    setAdding('');
  };

  // On today, the tasks left from earlier days come first, under their own
  // heading.
  const pendingIds = new Set(
    day.date === day.today
      ? tasks
          .filter((t) => t.forDate && t.forDate < day.date && isOpen(t))
          .map((t) => t.id)
      : [],
  );
  const firstToday = tasks.find((t) => !pendingIds.has(t.id))?.id;

  const heading = (text: string) => (
    <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
      {text}
    </p>
  );

  return (
    <div className="flex flex-col">
      {tasks.map((task, index) => {
        const points = pointsOf(task.id);
        const status = rowStatus(task, day.points, day.date);
        const shut = status === 'done' || status === 'archived';
        const expanded = open.has(task.id);
        const count = showPoints ? readablePoints(points).length : 0;
        const moveOptions: PickerOption[] = tasks
          .filter((t) => t.id !== task.id && !t.draft && t.title.trim())
          .map((t) => ({
            id: `task:${t.id}`,
            label: t.title,
            hint: placeOf(t, day.projects, day.companies).name,
            group: 'Tasks on this day',
          }));
        return (
          <div key={task.rowKey ?? task.id}>
            {index === 0 &&
              pendingIds.size > 0 &&
              heading('Pending from before')}
            {pendingIds.size > 0 && task.id === firstToday && heading('Today')}
            <div className="group rounded-lg px-2 py-1 transition-colors focus-within:bg-white/[0.04] hover:bg-white/[0.03] auto-light:focus-within:bg-black/[0.04] auto-light:hover:bg-black/[0.03]">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  disabled={!editable || (task.draft && !task.title.trim())}
                  aria-label={status === 'done' ? 'Mark not done' : 'Mark done'}
                  title="Done (Ctrl+Space)"
                  onClick={() =>
                    day.move(task.id, status === 'done' ? 'todo' : 'done')
                  }
                  className="mt-[3px] text-[18px] transition-transform active:scale-90"
                >
                  <StatusIcon status={status} />
                </button>
                <div className="grid min-w-0 flex-1">
                  <LineInput
                    value={task.title}
                    disabled={!editable}
                    inputRef={(el) => {
                      if (el) inputs.current.set(task.id, el);
                      else inputs.current.delete(task.id);
                    }}
                    onChange={(text) => day.editTitle(task.id, text)}
                    onKeyDown={(e) => onKey(e, task, status)}
                    onBlur={() => day.flush(task.id)}
                    placeholder="What are you working on?"
                    className={cn(
                      '[grid-area:1/1]',
                      'text-neutral-100 auto-light:text-neutral-900',
                      shut &&
                        'text-neutral-500 line-through decoration-neutral-600 auto-light:text-neutral-400 auto-light:decoration-neutral-300',
                    )}
                  />
                  {count > 0 && (
                    // The count sits right after the words: the words are
                    // laid out again unseen, so it lands where they end.
                    <span
                      aria-hidden
                      className="pointer-events-none whitespace-pre-wrap break-words text-sm leading-6 [grid-area:1/1]"
                    >
                      <span className="invisible">{task.title}</span>
                      <span
                        className={cn(
                          'ml-1.5 inline-block rounded px-1 align-[1px] text-[10px] font-medium tabular-nums leading-4',
                          shut
                            ? 'bg-white/[0.04] text-neutral-600 auto-light:bg-black/[0.04] auto-light:text-neutral-400'
                            : 'bg-white/[0.07] text-neutral-400 auto-light:bg-black/[0.06] auto-light:text-neutral-500',
                        )}
                      >
                        {count}
                      </span>
                    </span>
                  )}
                </div>
                {editable && !task.draft && (
                  <RowMenu
                    status={status}
                    onMove={(to) => day.move(task.id, to)}
                    onRemove={() => day.remove(task.id)}
                  />
                )}
                <button
                  type="button"
                  aria-label={expanded ? 'Hide details' : 'Show details'}
                  aria-expanded={expanded}
                  onClick={() => toggle(task.id)}
                  disabled={task.draft}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200 disabled:opacity-0 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800"
                >
                  <Icon
                    name="expand_more"
                    className={cn(
                      'text-[18px] transition-transform',
                      expanded && 'rotate-180',
                    )}
                  />
                </button>
              </div>
              {expanded && (
                <Details
                  task={task}
                  day={day}
                  points={points}
                  editable={editable}
                  moveOptions={moveOptions}
                  showPoints={showPoints}
                />
              )}
            </div>
          </div>
        );
      })}

      {editable && (
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1">
          <Icon
            name="add"
            className="text-[18px] text-neutral-600 auto-light:text-neutral-400"
          />
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFromInput()}
            onBlur={addFromInput}
            placeholder={tasks.length ? 'Add a task' : 'Write the first task'}
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none auto-light:text-neutral-900 auto-light:placeholder:text-neutral-400"
          />
        </div>
      )}
    </div>
  );
};
