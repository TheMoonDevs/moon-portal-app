'use client';

import type { Task } from '@db/client';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TASK_STATUS } from '@/models/workspace';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  ConfirmDialog,
  Icon,
  Pill,
  Segmented,
  Spin,
  UserAvatar,
} from '../../Admin/shared/AdminUI';
import { AvatarStack, errorText } from '../../Admin/Workspace/shared';
import { DatePopover, shortDay } from '../../Worklogs/DayLog/DatePopover';
import type { Person } from '../types';
import { ActivityChart, mondayOf } from './ActivityChart';

type Point = {
  id: string;
  taskId: string;
  userId: string;
  date: string;
  text: string;
  status: string | null;
  by: string;
  at: string;
};
type Data = { points: Point[]; users: Person[] };
type Who = Pick<Person, 'id' | 'name' | 'avatar'>;

type Whose = 'everyone' | 'mine';

const UNDER_WAY = ['IN_PROGRESS', 'IN_REVIEW'];
const OPEN = ['TODO', ...UNDER_WAY];

const POINT_STATUS: Record<
  string,
  {
    label: string;
    tone: 'info' | 'positive' | 'warning' | 'danger' | 'neutral';
  }
> = {
  doing: { label: 'Doing', tone: 'info' },
  done: { label: 'Done', tone: 'positive' },
  not_done: { label: 'Not done', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'danger' },
  blocked: { label: 'Blocked', tone: 'danger' },
  waiting: { label: 'Waiting', tone: 'warning' },
};

const dayLabel = (date?: string | null) => {
  if (!date) return '';
  const d = dayjs(date);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  if (d.isSame(dayjs().add(1, 'day'), 'day')) return 'Tomorrow';
  return d.format(d.isSame(dayjs(), 'year') ? 'ddd D MMM' : 'D MMM YYYY');
};

const isOpen = (t: Task) => OPEN.includes(t.status);

/** The statuses a task can be set to here. */
const STATUS_CHOICES: { value: string; label: string; icon: string }[] = [
  { value: 'TODO', label: 'To do', icon: 'radio_button_unchecked' },
  { value: 'IN_PROGRESS', label: 'In progress', icon: 'progress_activity' },
  { value: 'IN_REVIEW', label: 'In review', icon: 'rate_review' },
  { value: 'DONE', label: 'Done', icon: 'check_circle' },
  { value: 'IGNORED', label: 'Not doing', icon: 'block' },
];

type TaskFields = Partial<
  Pick<Task, 'title' | 'description' | 'status' | 'assigneeIds' | 'forDate'>
>;

/** Newest work first: when it was finished, or last touched. */
const lastActive = (t: Task, points: Point[]) =>
  points.at(-1)?.at ??
  (t.completedAt as unknown as string) ??
  (t.updatedAt as unknown as string) ??
  '';

/* -------------------------------------------------------------------------- */
/*                                 Add a task                                 */
/* -------------------------------------------------------------------------- */

/**
 * A line to write a new task on. It is the writer's own unless they switch
 * it to someone else. It has no day unless one is picked on its "for" chip,
 * which puts it on that person's day sheet for that day.
 */
const NewTask = ({
  projectId,
  me,
  people,
  defaultDay,
  onAdded,
}: {
  projectId: string;
  me: Who;
  /** The day being looked at, when it isn't today: new tasks go on it. */
  defaultDay?: string | null;
  /** The project's people first, then the rest of the company. */
  people: Who[];
  onAdded: (task: Task) => void;
}) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<Who>(me);
  const [forDate, setForDate] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setAssignee(me), [me]);
  useEffect(() => setForDate(defaultDay ?? null), [defaultDay]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => !q || p.name?.toLowerCase().includes(q));
  }, [people, search]);

  const add = async () => {
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const res = await PortalSdk.postData('/api/tasks', {
        projectId,
        title: text,
        assigneeIds: [assignee.id],
        forDate,
      });
      onAdded(res?.data?.task);
      setTitle('');
      if (assignee.id !== me.id)
        toast.success(
          forDate
            ? `Added to ${assignee.name?.split(' ')[0] || 'their'}’s day`
            : `Added for ${assignee.name?.split(' ')[0] || 'them'}`,
        );
      input.current?.focus();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const forSomeoneElse = assignee.id !== me.id;

  return (
    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-1.5 pl-4 pr-1.5 focus-within:border-white/20 auto-light:border-black/10 auto-light:bg-black/[0.03] auto-light:focus-within:border-black/25">
      {saving ? (
        <Spin className="size-4" />
      ) : (
        <Icon name="add" className="text-[20px] text-neutral-500" />
      )}
      <input
        ref={input}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add();
        }}
        maxLength={200}
        placeholder={
          forSomeoneElse
            ? `Add a task for ${assignee.name?.split(' ')[0] || 'them'}…`
            : 'Add a task for yourself…'
        }
        className="h-9 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500 auto-light:text-neutral-950"
      />
      <DatePopover
        value={forDate}
        onPick={setForDate}
        trigger={
          <button
            type="button"
            title={forDate ? 'Change its day' : 'Give it a day'}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2 text-xs transition-colors',
              forDate
                ? 'bg-white/[0.06] text-neutral-200 hover:bg-white/[0.1] auto-light:bg-black/[0.06] auto-light:text-neutral-800 auto-light:hover:bg-black/[0.1]'
                : 'text-neutral-500 hover:bg-white/[0.06] hover:text-white auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950',
            )}
          >
            <Icon name="event" className="text-[16px]" />
            for {forDate ? shortDay(forDate) : '—'}
          </button>
        }
      />
      <Popover
        open={picking}
        onOpenChange={(open) => {
          setPicking(open);
          if (!open) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Who it is for"
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs transition-colors',
              forSomeoneElse
                ? 'bg-sky-500/15 text-sky-200 hover:bg-sky-500/20 auto-light:text-sky-700'
                : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-600 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950',
            )}
          >
            <UserAvatar src={assignee.avatar} name={assignee.name} size={22} />
            <span className="hidden max-w-[120px] truncate sm:inline">
              {forSomeoneElse ? assignee.name : 'Me'}
            </span>
            <Icon name="expand_more" className="text-[16px]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-64 border-white/10 bg-neutral-900 p-1.5 text-neutral-200 auto-light:border-black/[0.125] auto-light:bg-white auto-light:text-neutral-800"
        >
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Assign to…"
            className="mb-1 h-8 w-full rounded-lg bg-white/[0.05] px-2.5 text-sm outline-none placeholder:text-neutral-500 auto-light:bg-black/[0.05]"
          />
          <div className="custom-scrollbar max-h-64 overflow-y-auto">
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setAssignee(p);
                  setPicking(false);
                  setSearch('');
                  input.current?.focus();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]',
                  p.id === assignee.id &&
                    'bg-white/[0.06] auto-light:bg-black/[0.06]',
                )}
              >
                <UserAvatar src={p.avatar} name={p.name} size={22} />
                <span className="min-w-0 flex-1 truncate">
                  {p.name || 'Unnamed'}
                  {p.id === me.id && (
                    <span className="ml-1 text-neutral-500">(me)</span>
                  )}
                </span>
                {p.id === assignee.id && (
                  <Icon
                    name="check"
                    className="text-[16px] text-sky-300 auto-light:text-sky-700"
                  />
                )}
              </button>
            ))}
            {!matches.length && (
              <p className="px-2 py-3 text-center text-xs text-neutral-500">
                Nobody matches that.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                Edit a task                                 */
/* -------------------------------------------------------------------------- */

const chip =
  'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white/[0.04] auto-light:bg-black/[0.04] px-2.5 text-xs text-neutral-300 auto-light:text-neutral-700 transition-colors hover:bg-white/[0.08] auto-light:hover:bg-black/[0.08] hover:text-white auto-light:hover:text-neutral-950';

/** Who a task is for: any number of people, picked from a list. */
const AssigneePicker = ({
  value,
  people,
  userOf,
  onChange,
}: {
  value: string[];
  people: Who[];
  userOf: (id: string) => Who | undefined;
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const chosen = value.map(userOf).filter(Boolean) as Who[];
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => !q || p.name?.toLowerCase().includes(q));
  }, [people, search]);

  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" title="Who it is for" className={chip}>
          {chosen.length ? (
            <AvatarStack users={chosen} max={3} />
          ) : (
            <Icon name="person_add" className="text-[16px]" />
          )}
          <span className="max-w-[140px] truncate">
            {chosen.length === 0
              ? 'Nobody'
              : chosen.length === 1
                ? chosen[0].name || 'Unnamed'
                : `${chosen.length} people`}
          </span>
          <Icon name="expand_more" className="text-[16px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 border-white/10 bg-neutral-900 p-1.5 text-neutral-200 auto-light:border-black/[0.125] auto-light:bg-white auto-light:text-neutral-800"
      >
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Assign to…"
          className="mb-1 h-8 w-full rounded-lg bg-white/[0.05] px-2.5 text-sm outline-none placeholder:text-neutral-500 auto-light:bg-black/[0.05]"
        />
        <div className="custom-scrollbar max-h-64 overflow-y-auto">
          {matches.map((p) => {
            const on = value.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]',
                  on && 'bg-white/[0.06] auto-light:bg-black/[0.06]',
                )}
              >
                <UserAvatar src={p.avatar} name={p.name} size={22} />
                <span className="min-w-0 flex-1 truncate">
                  {p.name || 'Unnamed'}
                </span>
                {on && (
                  <Icon
                    name="check"
                    className="text-[16px] text-sky-300 auto-light:text-sky-700"
                  />
                )}
              </button>
            );
          })}
          {!matches.length && (
            <p className="px-2 py-3 text-center text-xs text-neutral-500">
              Nobody matches that.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Everything about a task, changed in place: each change saves on its own,
 * the title and notes when you leave them.
 */
const TaskEditor = ({
  task,
  people,
  userOf,
  canDelete,
  onUpdate,
  onDelete,
}: {
  task: Task;
  people: Who[];
  userOf: (id: string) => Who | undefined;
  canDelete: boolean;
  onUpdate: (fields: TaskFields) => void;
  onDelete: () => void;
}) => {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.description ?? '');

  useEffect(() => setTitle(task.title), [task.title]);
  useEffect(() => setNotes(task.description ?? ''), [task.description]);

  const saveTitle = () => {
    const text = title.trim();
    if (!text) return setTitle(task.title);
    if (text !== task.title) onUpdate({ title: text });
  };
  const saveNotes = () => {
    const text = notes.trim();
    if (text !== (task.description ?? '').trim())
      onUpdate({ description: text || null });
  };
  const status =
    STATUS_CHOICES.find((s) => s.value === task.status) ?? STATUS_CHOICES[0];

  return (
    <div className="mb-4 flex flex-col gap-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setTitle(task.title);
            e.currentTarget.blur();
          }
        }}
        maxLength={200}
        aria-label="Task title"
        className="h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-sm font-medium text-white outline-none focus:border-white/20 auto-light:border-black/[0.075] auto-light:bg-black/[0.03] auto-light:text-neutral-950 auto-light:focus:border-black/25"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className={cn(chip, 'relative cursor-pointer')}>
          <Icon name={status.icon} className="text-[16px]" />
          {status.label}
          <Icon name="expand_more" className="text-[16px]" />
          <select
            value={status.value}
            onChange={(e) =>
              onUpdate({ status: e.target.value as Task['status'] })
            }
            aria-label="Status"
            className="absolute inset-0 cursor-pointer opacity-0 [&>option]:bg-neutral-900 auto-light:[&>option]:bg-white"
          >
            {STATUS_CHOICES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <DatePopover
          value={task.forDate ?? null}
          onPick={(forDate) => onUpdate({ forDate })}
          clearable
          align="start"
          trigger={
            <button
              type="button"
              title={task.forDate ? 'Change its day' : 'Give it a day'}
              className={chip}
            >
              <Icon name="event" className="text-[16px]" />
              for {task.forDate ? shortDay(task.forDate) : '—'}
            </button>
          }
        />
        <AssigneePicker
          value={task.assigneeIds ?? []}
          people={people}
          userOf={userOf}
          onChange={(assigneeIds) => onUpdate({ assigneeIds })}
        />
        <div className="flex-1" />
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              chip,
              'bg-transparent text-neutral-500 hover:bg-rose-500/10 hover:text-rose-300 auto-light:hover:text-rose-700',
            )}
          >
            <Icon name="delete" className="text-[16px]" />
            Delete
          </button>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        rows={notes ? 3 : 1}
        placeholder="Add notes…"
        aria-label="Notes"
        className="w-full resize-y rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-neutral-300 outline-none placeholder:text-neutral-600 focus:border-white/20 auto-light:border-black/[0.075] auto-light:bg-black/[0.03] auto-light:text-neutral-700 auto-light:placeholder:text-neutral-400 auto-light:focus:border-black/25"
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  A task row                                */
/* -------------------------------------------------------------------------- */

const TaskRow = ({
  task,
  points,
  userOf,
  people: assignable,
  canTick,
  canEdit,
  canDelete,
  showPeople,
  fullInfo,
  onTick,
  onUpdate,
  onDelete,
}: {
  task: Task;
  points: Point[];
  userOf: (id: string) => Who | undefined;
  /** Who it can be given to. */
  people: Who[];
  canTick: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Show who is on it. */
  showPeople: boolean;
  /** Show its points and latest note under the title. */
  fullInfo: boolean;
  onTick: (task: Task) => void;
  onUpdate: (task: Task, fields: TaskFields) => void;
  onDelete: (task: Task) => void;
}) => {
  const [open, setOpen] = useState(false);
  const done = task.status === 'DONE';
  const underWay = UNDER_WAY.includes(task.status);
  const people = (task.assigneeIds ?? []).map(userOf).filter(Boolean) as Who[];
  const last = [...points].reverse().find((p) => p.text);
  const today = dayjs().format('YYYY-MM-DD');
  const late = !done && !!task.forDate && task.forDate < today;
  const when =
    done && task.completedAt
      ? dayLabel(task.completedAt as unknown as string)
      : task.forDate
        ? dayLabel(task.forDate)
        : '';

  return (
    <li
      className={cn(
        'border-b border-white/[0.05] last:border-b-0 auto-light:border-black/[0.063]',
        open && 'bg-white/[0.02] auto-light:bg-black/[0.02]',
      )}
    >
      <div
        className={cn(
          'flex gap-2.5 px-2',
          fullInfo ? 'items-start py-2' : 'items-center py-1.5',
        )}
      >
        <button
          type="button"
          disabled={!canTick || done || task.status === 'IGNORED'}
          onClick={() => onTick(task)}
          title={done ? 'Done' : canTick ? 'Mark done' : undefined}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full',
            fullInfo && 'mt-px',
            canTick &&
              !done &&
              'hover:text-emerald-300 auto-light:hover:text-emerald-700',
          )}
        >
          <Icon
            name={
              done
                ? 'check_circle'
                : task.status === 'IGNORED'
                  ? 'block'
                  : 'radio_button_unchecked'
            }
            filled={done}
            className={cn(
              'text-[18px]',
              done
                ? 'text-emerald-400 auto-light:text-emerald-600'
                : underWay
                  ? 'text-sky-400 auto-light:text-sky-600'
                  : 'text-neutral-600 auto-light:text-neutral-400',
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title={task.title}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={cn(
              'flex items-center gap-2 text-[13px] leading-5',
              done
                ? 'text-neutral-500 line-through decoration-neutral-600 auto-light:decoration-neutral-400'
                : 'text-neutral-100 auto-light:text-neutral-900',
            )}
          >
            {underWay && (
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-sky-400" />
              </span>
            )}
            <span className={cn('min-w-0', !fullInfo && 'truncate')}>
              {task.title}
            </span>
            {task.flag && !fullInfo && (
              <span
                title={task.flag === 'blocked' ? 'Blocked' : 'Waiting'}
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  task.flag === 'blocked' ? 'bg-rose-400' : 'bg-amber-400',
                )}
              />
            )}
          </p>
          {fullInfo && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
              {when && (
                <span
                  className={cn(
                    late && 'text-amber-300/80 auto-light:text-amber-700/80',
                  )}
                >
                  {done ? 'Done' : 'for'} {when}
                </span>
              )}
              {task.flag && (
                <Pill tone={task.flag === 'blocked' ? 'danger' : 'warning'}>
                  {task.flag === 'blocked' ? 'Blocked' : 'Waiting'}
                </Pill>
              )}
              {points.length > 0 && (
                <span>
                  {points.length} {points.length === 1 ? 'point' : 'points'}
                </span>
              )}
              {last && !open && (
                <span className="min-w-0 max-w-full truncate text-neutral-400 auto-light:text-neutral-600">
                  · {last.text}
                </span>
              )}
            </p>
          )}
        </button>
        {!fullInfo && when && (
          <span
            className={cn(
              'shrink-0 text-[11px] tabular-nums text-neutral-500',
              late && 'text-amber-300/80 auto-light:text-amber-700/80',
            )}
          >
            {when}
          </span>
        )}
        {showPeople &&
          (people.length > 0 ? (
            <AvatarStack users={people} max={3} />
          ) : (
            <span className="text-[11px] text-neutral-600 auto-light:text-neutral-400">
              Nobody
            </span>
          ))}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-9 pt-1">
              {canEdit && (
                <TaskEditor
                  task={task}
                  people={assignable}
                  userOf={userOf}
                  canDelete={canDelete}
                  onUpdate={(fields) => onUpdate(task, fields)}
                  onDelete={() => onDelete(task)}
                />
              )}
              {!canEdit && task.description && (
                <p className="mb-3 whitespace-pre-wrap text-sm text-neutral-400 auto-light:text-neutral-600">
                  {task.description}
                </p>
              )}
              {points.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  Nothing logged on it yet.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {points.map((p) => {
                    const who = userOf(p.userId);
                    const meta = p.status ? POINT_STATUS[p.status] : null;
                    return (
                      <li key={p.id} className="flex items-start gap-2 text-sm">
                        <UserAvatar
                          src={who?.avatar}
                          name={who?.name}
                          size={20}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1.5 text-neutral-200 auto-light:text-neutral-800">
                            {p.text && <span>{p.text}</span>}
                            {meta && <Pill tone={meta.tone}>{meta.label}</Pill>}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {who?.name?.split(' ')[0] || 'Someone'}
                            {p.by !== 'person' && ` · via ${p.by}`} ·{' '}
                            {dayLabel(p.date)} {dayjs(p.at).format('h:mm A')}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Views                                    */
/* -------------------------------------------------------------------------- */

export type TaskLayout = 'board' | 'list' | 'timeline' | 'people';

export const TASK_LAYOUTS: {
  value: TaskLayout;
  label: string;
  icon: string;
}[] = [
  { value: 'board', label: 'Board', icon: 'view_kanban' },
  { value: 'list', label: 'List', icon: 'view_agenda' },
  { value: 'timeline', label: 'Timeline', icon: 'calendar_view_week' },
  { value: 'people', label: 'People', icon: 'group' },
];

const LAYOUT_KEY = 'portal:project-home-view';
const SPAN_KEY = 'portal:project-tasks-span';
const SHOW_KEY = 'portal:project-tasks-show';

/** A setting kept on this device. */
function useStored<T>(key: string, initial: T, valid: (v: unknown) => boolean) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return;
      const saved = JSON.parse(raw);
      if (valid(saved)) setValue(saved);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const pick = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };
  // `setValue` changes it for now only, without keeping it.
  return [value, pick, setValue] as const;
}

/** The view picked last time, on this device. */
export const useTaskLayout = () => {
  const [layout, setLayout] = useState<TaskLayout>('board');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY) as TaskLayout;
      if (TASK_LAYOUTS.some((l) => l.value === saved)) setLayout(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const pick = (next: TaskLayout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };
  return [layout, pick] as const;
};

/** How much time the tasks cover: one day, a week (Monday to Sunday) or a month. */
export type Span = 'day' | 'week' | 'month';

const SPANS: { value: Span; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const key = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

/** The first and last day of the span around a day. */
const rangeOf = (span: Span, anchor: string) => {
  const a = dayjs(anchor).startOf('day');
  if (span === 'day') return { from: a, to: a };
  if (span === 'week') {
    const from = mondayOf(a);
    return { from, to: from.add(6, 'day') };
  }
  return { from: a.startOf('month'), to: a.endOf('month').startOf('day') };
};

const rangeLabel = (span: Span, from: dayjs.Dayjs, to: dayjs.Dayjs) => {
  const thisYear = from.isSame(dayjs(), 'year');
  if (span === 'day') return dayLabel(key(from));
  if (span === 'month') return from.format(thisYear ? 'MMMM' : 'MMMM YYYY');
  const sameMonth = from.isSame(to, 'month');
  return `${from.format(sameMonth ? 'D' : 'D MMM')} – ${to.format(
    thisYear ? 'D MMM' : 'D MMM YYYY',
  )}`;
};

/** "This week", "Last week", "Next month"… for the span around today. */
const rangeHint = (span: Span, from: dayjs.Dayjs) => {
  const now = rangeOf(span, key(dayjs())).from;
  const diff = from.diff(now, span);
  if (span === 'day') return '';
  const unit = span === 'week' ? 'week' : 'month';
  if (diff === 0) return `This ${unit}`;
  if (diff === -1) return `Last ${unit}`;
  if (diff === 1) return `Next ${unit}`;
  return '';
};

/** The day a task is for: its day on the worklog, else when it is due. */
const dayOf = (t: Task) =>
  t.forDate ?? (t.dueDate ? String(t.dueDate).slice(0, 10) : null);

/** The day a finished task was finished. */
const doneDayOf = (t: Task) =>
  t.completedAt
    ? dayjs(t.completedAt as unknown as string).format('YYYY-MM-DD')
    : dayOf(t);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border border-dashed border-white/[0.08] px-3 py-4 text-center text-xs text-neutral-600 auto-light:border-black/10 auto-light:text-neutral-400">
    {children}
  </p>
);

const ColumnTitle = ({
  icon,
  title,
  count,
  tone,
}: {
  icon: string;
  title: string;
  count: number;
  tone?: string;
}) => (
  <h3
    className={cn(
      'mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500',
      tone,
    )}
  >
    <Icon name={icon} className="text-[16px]" />
    {title}
    <span className="text-neutral-600 auto-light:text-neutral-400">
      {count}
    </span>
  </h3>
);

/** A small chip for a task on the timeline, dragged to move it to a day. */
const TaskChip = ({
  task,
  userOf,
  showPeople,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  onPickDay,
}: {
  task: Task;
  userOf: (id: string) => Who | undefined;
  showPeople: boolean;
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  /** Without a mouse: pick its day instead of dragging. */
  onPickDay: (day: string | null) => void;
}) => {
  const done = task.status === 'DONE';
  const underWay = UNDER_WAY.includes(task.status);
  const who = (task.assigneeIds ?? []).map(userOf).filter(Boolean) as Who[];
  const body = (
    <>
      <span className="line-clamp-2 min-w-0 flex-1 text-left">
        {task.title}
      </span>
      {showPeople && who[0] && (
        <UserAvatar src={who[0].avatar} name={who[0].name} size={16} />
      )}
    </>
  );
  return (
    <li
      title={draggable ? `${task.title}\nDrag to a day to move it` : task.title}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] leading-tight',
        draggable && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
        done
          ? 'border-emerald-400/15 bg-emerald-400/[0.06] text-neutral-400 line-through decoration-neutral-600 auto-light:text-neutral-600 auto-light:decoration-neutral-400'
          : underWay
            ? 'border-sky-400/20 bg-sky-400/[0.07] text-neutral-100 auto-light:text-neutral-900'
            : 'border-white/[0.07] bg-white/[0.03] text-neutral-200 auto-light:border-black/[0.088] auto-light:bg-black/[0.03] auto-light:text-neutral-800',
      )}
    >
      {draggable ? (
        <DatePopover
          value={task.forDate ?? null}
          onPick={onPickDay}
          clearable
          align="start"
          trigger={
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-[inherit] items-center gap-1.5"
            >
              {body}
            </button>
          }
        />
      ) : (
        body
      )}
    </li>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Section                                   */
/* -------------------------------------------------------------------------- */

/**
 * The project's tasks and the work logged on them, for one day, a week
 * (Monday to Sunday) or a month, in one of four views: a board by status, a
 * list by day, a timeline to plan days on, or each person's work. Worklogs
 * and tasks are one thing: what people log are work points under a task.
 */
export const ProjectTasks = ({
  projectId,
  tasks,
  people,
  companyUsers,
  color,
  canAdd,
  canTick,
  canDelete,
  onSaved,
  layout,
  onLayout,
  onPoints,
}: {
  projectId: string;
  tasks: Task[];
  /** The project's leads and team. */
  people: Person[];
  /** Everyone in the company, to give a task to. */
  companyUsers: Person[];
  /** The project's color, for the activity chart. */
  color?: string | null;
  canAdd: boolean;
  /** Tick off and change tasks. */
  canTick: boolean;
  canDelete: boolean;
  onSaved: () => void;
  layout: TaskLayout;
  onLayout: (layout: TaskLayout) => void;
  /** The work points on the project's tasks, once loaded. */
  onPoints?: (data: Data) => void;
}) => {
  const { user } = useUser();
  const [whose, setWhose] = useState<Whose>('everyone');
  const [data, setData] = useState<Data | null>(null);
  const [local, setLocal] = useState<Task[]>(tasks);
  const [removing, setRemoving] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [span, setSpan, peekSpan] = useStored<Span>(SPAN_KEY, 'week', (v) =>
    SPANS.some((s) => s.value === v),
  );
  const [anchor, setAnchor] = useState(() => key(dayjs()));
  const [show, setShow] = useStored<{ people: boolean; info: boolean }>(
    SHOW_KEY,
    { people: false, info: false },
    (v) => !!v && typeof v === 'object',
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => setLocal(tasks), [tasks]);

  const loadPoints = () =>
    PortalSdk.getData(`/api/projects/${projectId}/points?days=365`, null)
      .then((res) => setData(res?.data ?? { points: [], users: [] }))
      .catch(() => setData({ points: [], users: [] }));

  useEffect(() => {
    setData(null);
    loadPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (data) onPoints?.(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const everyone = useMemo(() => {
    const out = new Map<string, Who>();
    for (const p of [...people, ...companyUsers, ...(data?.users ?? [])])
      if (p?.id && !out.has(p.id)) out.set(p.id, p);
    return out;
  }, [people, companyUsers, data]);
  const userOf = (id: string) => everyone.get(id);

  const me: Who | null = useMemo(
    () =>
      user
        ? (everyone.get(user.id) ?? {
            id: user.id,
            name: user.name ?? 'Me',
            avatar: user.avatar ?? null,
          })
        : null,
    [user, everyone],
  );

  // Me first, then the project's people, then the rest of the company.
  const assignable = useMemo(() => {
    if (!me) return [];
    const seen = new Set<string>([me.id]);
    const out: Who[] = [me];
    for (const p of [...people, ...companyUsers])
      if (p?.id && !seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    return out;
  }, [me, people, companyUsers]);

  const pointsOf = useMemo(() => {
    const out = new Map<string, Point[]>();
    for (const p of data?.points ?? [])
      out.set(p.taskId, [...(out.get(p.taskId) ?? []), p]);
    return out;
  }, [data]);

  const live = useMemo(
    () => local.filter((t) => t.status !== 'ARCHIVED' && !t.mergedInto),
    [local],
  );
  const mine = (t: Task) =>
    !!user &&
    ((t.assigneeIds ?? []).includes(user.id) || t.ownerId === user.id);
  const scoped = whose === 'mine' ? live.filter(mine) : live;
  const open = scoped.filter(isOpen);

  const today = key(dayjs());
  // The timeline plans weeks and months; a day is a week there.
  const viewSpan: Span =
    layout === 'timeline' && span === 'day' ? 'week' : span;
  const range = rangeOf(viewSpan, anchor);
  const from = key(range.from);
  const to = key(range.to);
  const isNow = today >= from && today <= to;

  /**
   * Whether a task belongs to the days shown: open ones for a day in them,
   * finished ones finished in them. Work under way with no day, or a day
   * gone by, is the current week's (or day's, or month's) work.
   */
  const inRange = (t: Task) => {
    if (t.status === 'DONE') {
      const d = doneDayOf(t);
      return !!d && d >= from && d <= to;
    }
    if (!isOpen(t)) return false;
    const d = dayOf(t);
    if (d && d >= from && d <= to) return true;
    return isNow && UNDER_WAY.includes(t.status) && (!d || d < from);
  };
  const shown = scoped.filter(inRange);
  const shownOpen = shown.filter(isOpen);
  const shownDone = shown.filter((t) => t.status === 'DONE');
  const overdue = open.filter((t) => {
    const d = dayOf(t);
    return !!d && d < today;
  });
  const unplanned = open.filter((t) => !dayOf(t));

  const byRecent = (a: Task, b: Task) =>
    lastActive(b, pointsOf.get(b.id) ?? []).localeCompare(
      lastActive(a, pointsOf.get(a.id) ?? []),
    );
  const byDay = (a: Task, b: Task) =>
    (dayOf(a) ?? '9999').localeCompare(dayOf(b) ?? '9999') || byRecent(a, b);

  const tick = async (task: Task) => {
    setLocal((all) =>
      all.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: TASK_STATUS.DONE,
              completedAt: new Date() as unknown as Task['completedAt'],
            }
          : t,
      ),
    );
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, { status: 'DONE' });
      onSaved();
      loadPoints();
    } catch (err) {
      setLocal(tasks);
      toast.error(errorText(err));
    }
  };

  const update = async (task: Task, fields: TaskFields) => {
    setLocal((all) =>
      all.map((t) => (t.id === task.id ? ({ ...t, ...fields } as Task) : t)),
    );
    try {
      const res = await PortalSdk.patchData(`/api/tasks/${task.id}`, fields);
      const saved: Task | undefined = res?.data?.task;
      if (saved)
        setLocal((all) => all.map((t) => (t.id === saved.id ? saved : t)));
      onSaved();
      if ('status' in fields) loadPoints();
    } catch (err) {
      setLocal((all) => all.map((t) => (t.id === task.id ? task : t)));
      toast.error(errorText(err));
    }
  };

  /** Moves a task to a day on the timeline, or off it (null). */
  const moveTo = (task: Task | undefined, day: string | null) => {
    setDragId(null);
    setOver(null);
    if (!task || (task.forDate ?? null) === day) return;
    update(task, { forDate: day });
    toast.success(
      day
        ? `Moved to ${dayLabel(day)}`
        : 'Moved to Unplanned: it has no day now',
    );
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await PortalSdk.deleteData(`/api/tasks/${removing.id}`, {});
      setLocal((all) => all.filter((t) => t.id !== removing.id));
      setRemoving(null);
      toast.success('Task deleted');
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const rows = (list: Task[], empty: string) =>
    list.length ? (
      <ul className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015] auto-light:border-black/[0.075] auto-light:bg-black/[0.015]">
        {list.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            points={pointsOf.get(task.id) ?? []}
            userOf={userOf}
            people={assignable}
            canTick={canTick}
            canEdit={canTick}
            canDelete={canDelete}
            showPeople={show.people}
            fullInfo={show.info}
            onTick={tick}
            onUpdate={update}
            onDelete={setRemoving}
          />
        ))}
      </ul>
    ) : (
      <Empty>{empty}</Empty>
    );

  /** Where a dragged task can be dropped: a day, or Unplanned (null). */
  const dropZone = (zone: string | null) => {
    const id = zone ?? 'unplanned';
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (over !== id) setOver(id);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setOver((o) => (o === id ? null : o));
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain') || dragId;
        moveTo(
          live.find((t) => t.id === taskId),
          zone,
        );
      },
    };
  };

  const chips = (list: Task[]) =>
    list.map((t) => (
      <TaskChip
        key={t.id}
        task={t}
        userOf={userOf}
        showPeople={show.people}
        draggable={canTick && isOpen(t)}
        dragging={dragId === t.id}
        onDragStart={() => setDragId(t.id)}
        onDragEnd={() => {
          setDragId(null);
          setOver(null);
        }}
        onPickDay={(day) => moveTo(t, day)}
      />
    ));

  /** The open tasks on a day, and the ones finished on it. */
  const onDay = (day: string) =>
    scoped.filter(
      (t) =>
        (isOpen(t) && dayOf(t) === day) ||
        (t.status === 'DONE' && doneDayOf(t) === day),
    );

  /** Unplanned and overdue work, at the end of the timeline. */
  const tray = (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        {...dropZone(null)}
        className={cn(
          'min-w-0 rounded-xl border border-dashed border-white/[0.1] p-1.5 transition-colors auto-light:border-black/[0.125]',
          over === 'unplanned' && 'border-sky-400/60 bg-sky-400/[0.06]',
        )}
      >
        <p className="mb-1.5 flex items-center gap-1 px-1 text-[11px] font-semibold text-neutral-400 auto-light:text-neutral-600">
          <Icon name="inbox" className="text-[14px]" />
          Unplanned
          <span className="font-normal text-neutral-600 auto-light:text-neutral-400">
            {unplanned.length}
          </span>
        </p>
        <ul className="flex flex-col gap-1">
          {chips([...unplanned].sort(byRecent))}
        </ul>
        {!unplanned.length && (
          <p className="px-1 pb-1 text-[11px] text-neutral-600 auto-light:text-neutral-400">
            Tasks with no day. Drop one here to take its day off.
          </p>
        )}
      </div>
      <div className="min-w-0 rounded-xl border border-dashed border-rose-400/20 p-1.5">
        <p className="mb-1.5 flex items-center gap-1 px-1 text-[11px] font-semibold text-rose-300/80 auto-light:text-rose-700/80">
          <Icon name="schedule" className="text-[14px]" />
          Overdue
          <span className="font-normal text-neutral-600 auto-light:text-neutral-400">
            {overdue.length}
          </span>
        </p>
        <ul className="flex flex-col gap-1">
          {chips([...overdue].sort(byDay))}
        </ul>
        {!overdue.length && (
          <p className="px-1 pb-1 text-[11px] text-neutral-600 auto-light:text-neutral-400">
            Nothing late.
          </p>
        )}
      </div>
      {canTick && (unplanned.length > 0 || overdue.length > 0) && (
        <p className="px-1 text-[10px] leading-snug text-neutral-600 auto-light:text-neutral-400">
          Drag a task onto a day to plan it, or tap it to pick one.
        </p>
      )}
    </div>
  );

  const dayCell = (
    d: dayjs.Dayjs,
    opts: { inMonth?: boolean; cap?: number },
  ) => {
    const k = key(d);
    const isToday = k === today;
    const weekend = d.day() === 0 || d.day() === 6;
    const list = onDay(k).sort(
      (a, b) =>
        Number(a.status === 'DONE') - Number(b.status === 'DONE') ||
        byRecent(a, b),
    );
    const cap = opts.cap ?? Infinity;
    return (
      <div
        key={k}
        {...dropZone(k)}
        className={cn(
          'min-w-0 rounded-xl p-1 transition-colors',
          opts.cap ? 'min-h-[96px]' : 'min-h-[160px]',
          isToday &&
            'bg-white/[0.04] ring-1 ring-white/10 auto-light:bg-black/[0.04] auto-light:ring-black/[0.125]',
          weekend && !isToday && 'bg-white/[0.015] auto-light:bg-black/[0.015]',
          opts.inMonth === false && 'opacity-40',
          over === k && 'bg-sky-400/[0.08] ring-1 ring-sky-400/50',
        )}
      >
        <p
          className={cn(
            'mb-1.5 px-1 text-[11px]',
            isToday
              ? 'font-semibold text-white auto-light:text-neutral-950'
              : 'text-neutral-500',
          )}
        >
          {opts.cap ? (
            <>
              {isToday ? 'Today ' : ''}
              <span
                className={cn(
                  !isToday && 'text-neutral-400 auto-light:text-neutral-600',
                )}
              >
                {d.format('D')}
              </span>
            </>
          ) : (
            <>
              {isToday ? 'Today' : d.format('ddd')}{' '}
              <span className="text-neutral-600 auto-light:text-neutral-400">
                {d.format('D')}
              </span>
            </>
          )}
        </p>
        <ul className="flex flex-col gap-1">{chips(list.slice(0, cap))}</ul>
        {list.length > cap && (
          <button
            type="button"
            onClick={() => {
              setAnchor(k);
              peekSpan('week');
            }}
            className="mt-1 px-1 text-[10px] text-neutral-500 hover:text-neutral-200 auto-light:hover:text-neutral-800"
          >
            +{list.length - cap} more
          </button>
        )}
      </div>
    );
  };

  const view = (() => {
    switch (layout) {
      case 'board': {
        const columns = [
          {
            key: 'todo',
            title: 'To do',
            icon: 'radio_button_unchecked',
            tasks: shownOpen.filter((t) => t.status === 'TODO').sort(byDay),
            empty: 'Nothing waiting',
          },
          {
            key: 'doing',
            title: 'Doing',
            icon: 'progress_activity',
            tasks: shownOpen
              .filter((t) => UNDER_WAY.includes(t.status))
              .sort(byRecent),
            empty: 'Nothing under way',
          },
          {
            key: 'done',
            title: 'Done',
            icon: 'check_circle',
            tasks: [...shownDone].sort(byRecent),
            empty: 'Nothing finished yet',
          },
        ];
        const outside = isNow
          ? open.filter(
              (t) =>
                t.status === 'TODO' && (!dayOf(t) || (dayOf(t) ?? '') < from),
            )
          : [];
        return (
          <div>
            <div className="grid gap-4 lg:grid-cols-3">
              {columns.map((c) => (
                <div key={c.key} className="min-w-0">
                  <ColumnTitle
                    icon={c.icon}
                    title={c.title}
                    count={c.tasks.length}
                  />
                  {rows(c.tasks, c.empty)}
                </div>
              ))}
            </div>
            {outside.length > 0 && (
              <button
                type="button"
                onClick={() => onLayout('timeline')}
                className="mt-3 flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-200 auto-light:hover:text-neutral-800"
              >
                <Icon name="inbox" className="text-[15px]" />
                {outside.length} more{' '}
                {outside.length === 1 ? 'task is' : 'tasks are'} overdue or have
                no day. Plan them on the timeline
                <Icon name="chevron_right" className="text-[15px]" />
              </button>
            )}
          </div>
        );
      }
      case 'list': {
        const sorted = [...shownOpen].sort(byDay);
        // A day's tasks for a day or a week; a week's for a month.
        const groupKey = (t: Task) => {
          const d = dayOf(t);
          if (!d || d < from) return 'now';
          return viewSpan === 'month' ? key(mondayOf(dayjs(d))) : d;
        };
        const groups = new Map<string, Task[]>();
        for (const t of sorted)
          groups.set(groupKey(t), [...(groups.get(groupKey(t)) ?? []), t]);
        const titleOf = (k: string) =>
          k === 'now'
            ? 'Under way'
            : viewSpan === 'month'
              ? `Week of ${dayjs(k).format('D MMM')}`
              : dayLabel(k);
        const extra = isNow
          ? [
              {
                key: 'late',
                title: 'Overdue',
                icon: 'schedule',
                tone: 'text-rose-300/80 auto-light:text-rose-700/80',
                tasks: open
                  .filter(
                    (t) => t.status === 'TODO' && (dayOf(t) ?? '9999') < from,
                  )
                  .sort(byDay),
              },
            ]
          : [];
        const all = [
          ...extra,
          ...Array.from(groups.entries()).map(([k, list]) => ({
            key: k,
            title: titleOf(k),
            icon: k === 'now' ? 'progress_activity' : 'today',
            tone:
              k === today
                ? 'text-neutral-200 auto-light:text-neutral-800'
                : undefined,
            tasks: list,
          })),
          ...(isNow
            ? [
                {
                  key: 'none',
                  title: 'No date',
                  icon: 'event_busy',
                  tone: undefined,
                  tasks: open.filter((t) => t.status === 'TODO' && !dayOf(t)),
                },
              ]
            : []),
        ].filter((g) => g.tasks.length);
        return (
          <div className="flex flex-col gap-6">
            {!all.length && <Empty>No open tasks in these days</Empty>}
            {all.map((g) => (
              <div key={g.key}>
                <ColumnTitle
                  icon={g.icon}
                  title={g.title}
                  count={g.tasks.length}
                  tone={g.tone}
                />
                {rows(g.tasks, '')}
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-300 auto-light:hover:text-neutral-700"
              >
                <Icon
                  name="chevron_right"
                  className={cn(
                    'text-[16px] transition-transform',
                    showDone && 'rotate-90',
                  )}
                />
                Done
                <span className="text-neutral-600 auto-light:text-neutral-400">
                  {shownDone.length}
                </span>
              </button>
              {showDone && (
                <div className="mt-2.5">
                  {rows([...shownDone].sort(byRecent), 'Nothing finished yet')}
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'timeline': {
        if (viewSpan === 'month') {
          const start = mondayOf(range.from);
          const weeks = Math.ceil((range.to.diff(start, 'day') + 1) / 7);
          return (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="custom-scrollbar -mx-1 overflow-x-auto px-1 pb-2">
                <div className="grid min-w-[700px] grid-cols-7 gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                    (d) => (
                      <p
                        key={d}
                        className="px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 auto-light:text-neutral-400"
                      >
                        {d}
                      </p>
                    ),
                  )}
                  {Array.from({ length: weeks * 7 }, (_, i) => {
                    const d = start.add(i, 'day');
                    return dayCell(d, {
                      inMonth: d.isSame(range.from, 'month'),
                      cap: 3,
                    });
                  })}
                </div>
              </div>
              {tray}
            </div>
          );
        }
        const days = Array.from({ length: 7 }, (_, i) =>
          range.from.add(i, 'day'),
        );
        return (
          <div className="custom-scrollbar -mx-1 overflow-x-auto px-1 pb-2">
            <div className="grid min-w-[900px] grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.25fr)] gap-1.5">
              {days.map((d) => dayCell(d, {}))}
              {tray}
            </div>
          </div>
        );
      }
      case 'people': {
        const ids = Array.from(
          new Set([
            ...people.map((p) => p.id),
            ...shownOpen.flatMap((t) => t.assigneeIds ?? []),
          ]),
        );
        const rowsOf = ids
          .map((id) => {
            const theirs = (t: Task) => (t.assigneeIds ?? []).includes(id);
            return {
              who: userOf(id),
              id,
              doing: shownOpen
                .filter((t) => theirs(t) && UNDER_WAY.includes(t.status))
                .sort(byRecent),
              todo: shownOpen
                .filter((t) => theirs(t) && t.status === 'TODO')
                .sort(byDay),
              done: shownDone.filter(theirs).length,
            };
          })
          .filter((r) => r.who)
          .sort(
            (a, b) =>
              b.doing.length - a.doing.length ||
              b.todo.length - a.todo.length ||
              b.done - a.done,
          );
        const nobody = shownOpen.filter((t) => !(t.assigneeIds ?? []).length);
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            {rowsOf.map((r) => (
              <div
                key={r.id}
                className="min-w-0 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3 auto-light:border-black/[0.075] auto-light:bg-black/[0.015]"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <UserAvatar
                    src={r.who!.avatar}
                    name={r.who!.name}
                    size={28}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-white auto-light:text-neutral-950">
                    {r.who!.name}
                  </p>
                  <span className="flex shrink-0 gap-3 text-[11px] tabular-nums text-neutral-500">
                    <span>
                      <b className="font-semibold text-sky-300 auto-light:text-sky-700">
                        {r.doing.length}
                      </b>{' '}
                      doing
                    </span>
                    <span>
                      <b className="font-semibold text-neutral-200 auto-light:text-neutral-800">
                        {r.todo.length}
                      </b>{' '}
                      to do
                    </span>
                    <span>
                      <b className="font-semibold text-emerald-300 auto-light:text-emerald-700">
                        {r.done}
                      </b>{' '}
                      done
                    </span>
                  </span>
                </div>
                {rows(
                  [...r.doing, ...r.todo].slice(0, 5),
                  'Nothing open in these days',
                )}
                {r.doing.length + r.todo.length > 5 && (
                  <p className="mt-2 text-[11px] text-neutral-500">
                    +{r.doing.length + r.todo.length - 5} more
                  </p>
                )}
              </div>
            ))}
            {nobody.length > 0 && (
              <div className="min-w-0 rounded-2xl border border-dashed border-white/[0.08] p-3 auto-light:border-black/10">
                <p className="mb-3 text-sm font-medium text-neutral-400 auto-light:text-neutral-600">
                  Nobody on it yet{' '}
                  <span className="text-neutral-600 auto-light:text-neutral-400">
                    {nobody.length}
                  </span>
                </p>
                {rows(nobody.sort(byDay).slice(0, 5), '')}
              </div>
            )}
          </div>
        );
      }
    }
  })();

  const hint = rangeHint(viewSpan, range.from);
  const step = (dir: 1 | -1) =>
    setAnchor(key(dayjs(anchor).add(dir, viewSpan)));

  return (
    <div>
      <ActivityChart
        points={data?.points ?? []}
        tasks={live}
        color={color}
        loading={!data}
        from={from}
        to={to}
        onPick={(day) => {
          // A look at one day; the kept view stays as it was.
          setAnchor(day);
          if (layout === 'timeline') {
            if (span === 'month') peekSpan('week');
          } else peekSpan('day');
        }}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented<TaskLayout>
          value={layout}
          onChange={onLayout}
          options={TASK_LAYOUTS}
        />
        <div className="flex-1" />
        <Segmented<Whose>
          value={whose}
          onChange={setWhose}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'mine', label: 'Mine' },
          ]}
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="What each task shows"
              className={cn(
                'flex h-10 items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-neutral-200 auto-light:border-black/[0.088] auto-light:text-neutral-600 auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-800',
                (show.people || show.info) &&
                  'text-neutral-200 auto-light:text-neutral-800',
              )}
            >
              <Icon name="tune" className="text-[16px]" />
              Show
              {(show.people || show.info) && (
                <span className="rounded bg-white/[0.08] px-1.5 py-px text-[10px] font-semibold auto-light:bg-black/[0.08]">
                  {Number(show.people) + Number(show.info)}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-60 border-white/10 bg-neutral-900 p-1.5 text-neutral-200 auto-light:border-black/[0.125] auto-light:bg-white auto-light:text-neutral-800"
          >
            {(
              [
                {
                  k: 'people',
                  label: 'People',
                  hint: 'Who is on each task',
                  icon: 'group',
                },
                {
                  k: 'info',
                  label: 'Full info',
                  hint: 'Its day, points and latest note',
                  icon: 'notes',
                },
              ] as const
            ).map((o) => {
              const on = show[o.k];
              return (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => setShow({ ...show, [o.k]: !on })}
                  className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]"
                >
                  <Icon
                    name={o.icon}
                    className="text-[18px] text-neutral-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{o.label}</span>
                    <span className="block text-[11px] text-neutral-500">
                      {o.hint}
                    </span>
                  </span>
                  <Icon
                    name={on ? 'check_box' : 'check_box_outline_blank'}
                    filled={on}
                    className={cn(
                      'text-[18px]',
                      on
                        ? 'text-sky-300 auto-light:text-sky-700'
                        : 'text-neutral-600 auto-light:text-neutral-400',
                    )}
                  />
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={`Previous ${viewSpan}`}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-600 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
          >
            <Icon name="chevron_left" className="text-[20px]" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={`Next ${viewSpan}`}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-600 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
          >
            <Icon name="chevron_right" className="text-[20px]" />
          </button>
        </div>
        <p className="text-sm font-semibold text-white auto-light:text-neutral-950">
          {rangeLabel(viewSpan, range.from, range.to)}
          {hint && (
            <span className="ml-2 text-xs font-normal text-neutral-500">
              {hint}
            </span>
          )}
        </p>
        {!isNow && (
          <button
            type="button"
            onClick={() => setAnchor(today)}
            className="h-7 rounded-lg border border-white/[0.08] px-2.5 text-xs text-neutral-300 hover:bg-white/[0.06] hover:text-white auto-light:border-black/10 auto-light:text-neutral-700 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
          >
            Today
          </button>
        )}
        <div className="flex-1" />
        <Segmented<Span>
          value={viewSpan}
          onChange={setSpan}
          options={
            layout === 'timeline'
              ? SPANS.filter((s) => s.value !== 'day')
              : SPANS
          }
        />
      </div>

      {canAdd && me && (
        <NewTask
          projectId={projectId}
          me={me}
          people={assignable}
          defaultDay={viewSpan === 'day' && from !== today ? from : null}
          onAdded={(task) => {
            if (task) setLocal((all) => [...all, task]);
            onSaved();
          }}
        />
      )}

      {view}
      {!data && (
        <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          <Spin className="size-3" /> Loading work points…
        </p>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Delete ${removing?.title ?? 'this task'}?`}
        message="The task goes away for everyone on the project."
        confirmLabel="Delete task"
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
};

export type { Point as TaskPoint, Data as TaskPointsData };
