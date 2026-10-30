'use client';

import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../../Admin/shared/AdminUI';
import { DateBadge, DatePopover } from './DatePopover';
import type { Place } from './sheetParts';
import {
  PlaceDot,
  placeOf,
  rowIcon,
  rowStatus,
  StateDot,
  StatusIcon,
} from './sheetParts';
import type { DayCompany, DayProject, DayTask } from './useDay';

/*
 * The person's upcoming tasks beside the day: the ones not on today or
 * left from before (those are on the day's sheet), in the order they were
 * added or by their day, and the archived ones to bring back. A task can be
 * given a day, ticked off, or followed by a next step.
 */

type Task = DayTask & { followsId?: string | null; dueDate?: string | null };

const dayOf = (t: Task) => t.forDate || t.dueDate?.slice(0, 10) || null;

type Sort = 'added' | 'day';
const SORT_KEY = 'worklogs.yourTasks.sort';

/** Tasks not on today or before: on a later day, or on none yet. */
export const upcomingOf = <T extends Task>(tasks: T[], today: string) =>
  tasks.filter((t) => {
    const d = dayOf(t);
    return !d || d > today;
  });

const addedAt = (t: Task) => t.createdAt ?? '';

const sortUpcoming = (tasks: Task[], sort: Sort) =>
  tasks
    .slice()
    .sort((a, b) =>
      sort === 'day'
        ? (dayOf(a) ?? '9999').localeCompare(dayOf(b) ?? '9999') ||
          addedAt(a).localeCompare(addedAt(b))
        : addedAt(a).localeCompare(addedAt(b)),
    );

const TaskRow = ({
  task,
  place,
  date,
  canPlan,
  after,
  onPlan,
  onMove,
  onFollowUp,
  archived,
}: {
  task: Task;
  place: Place;
  /** The day open on the page, offered first when picking a day. */
  date: string;
  canPlan: boolean;
  after?: { title: string; status: string } | null;
  onPlan: (date: string | null) => Promise<unknown>;
  onMove: (to: 'done' | 'todo') => Promise<unknown>;
  onFollowUp?: (title: string) => Promise<boolean>;
  archived?: boolean;
}) => {
  const [busy, setBusy] = useState<'plan' | 'move' | null>(null);
  const [following, setFollowing] = useState(false);
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const run = (kind: 'plan' | 'move', fn: () => Promise<unknown>) => {
    setBusy(kind);
    fn().finally(() => setBusy(null));
  };
  const addFollowUp = async () => {
    const title = next.trim();
    if (!title || saving || !onFollowUp) return;
    setSaving(true);
    const made = await onFollowUp(title);
    setSaving(false);
    if (made) {
      setNext('');
      setFollowing(false);
    }
  };
  const day = dayOf(task);
  const status = rowStatus(task);
  return (
    <div>
      <div className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.03] auto-light:hover:bg-black/[0.03]">
        {archived ? (
          <span className="mt-0.5 text-[18px]">
            <StatusIcon status="archived" />
          </span>
        ) : (
          <button
            type="button"
            aria-label="Mark the task done"
            title="Mark the task done"
            disabled={!!busy}
            onClick={() => run('move', () => onMove('done'))}
            className="mt-0.5 text-[18px] hover:opacity-80"
          >
            {busy === 'move' ? (
              <Spin className="size-4" />
            ) : (
              <StatusIcon status={rowIcon(status)} />
            )}
          </button>
        )}
        <div className="min-w-0 flex-1">
          {after && (
            <p
              className="flex min-w-0 items-center gap-1 text-[11px] text-neutral-500"
              title="Follows on from this task"
            >
              <Icon name="subdirectory_arrow_right" className="text-[12px]" />
              <span className="truncate">After {after.title}</span>
              {after.status === 'DONE' && (
                <Icon
                  name="check"
                  className="text-[12px] text-emerald-400 auto-light:text-emerald-600"
                />
              )}
            </p>
          )}
          <p
            className={cn(
              'text-sm font-medium leading-6 text-neutral-100 auto-light:text-neutral-900',
              archived && 'text-neutral-500 auto-light:text-neutral-500',
            )}
          >
            {task.title}
            {!archived && <StateDot status={status} />}
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-neutral-500">
            <PlaceDot place={place} />
            <span className="truncate">{place.name}</span>
          </p>
        </div>
        {archived ? (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run('move', () => onMove('todo'))}
            title="Bring it back as a task to do"
            className="mt-0.5 flex h-7 shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 text-[11px] font-medium text-neutral-300 hover:bg-white/[0.08] hover:text-white auto-light:border-black/10 auto-light:text-neutral-700 auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950"
          >
            {busy === 'move' ? (
              <Spin className="size-3" />
            ) : (
              <Icon name="unarchive" className="text-[14px]" />
            )}
            Restore
          </button>
        ) : (
          <>
            {
              <DatePopover
                value={task.forDate ?? null}
                extra={[
                  { label: 'Today', date: dayjs().format('YYYY-MM-DD') },
                  ...(canPlan ? [{ label: 'The open day', date }] : []),
                ]}
                onPick={(d) => run('plan', () => onPlan(d))}
                trigger={
                  <button
                    type="button"
                    disabled={!!busy}
                    aria-label={day ? 'Change its day' : 'Give it a day'}
                    title={
                      day
                        ? `For ${dayjs(day).format('dddd D MMMM')}`
                        : 'Give it a day'
                    }
                    className={cn(
                      'mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-white/[0.08] hover:text-white data-[state=open]:flex data-[state=open]:bg-white/[0.08] auto-light:text-neutral-500 auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950 auto-light:data-[state=open]:bg-black/[0.08]',
                      day
                        ? 'flex'
                        : 'flex md:hidden md:group-focus-within:flex md:group-hover:flex',
                    )}
                  >
                    {busy === 'plan' ? (
                      <Spin className="size-3" />
                    ) : day ? (
                      <DateBadge
                        date={day}
                        className="text-neutral-200 auto-light:text-neutral-800"
                      />
                    ) : (
                      <Icon name="calendar_month" className="text-[17px]" />
                    )}
                  </button>
                }
              />
            }
            {onFollowUp && (
              <button
                type="button"
                aria-label="Add a follow-up task"
                title="Add a follow-up task: the next step after this one"
                onClick={() => setFollowing((v) => !v)}
                className={cn(
                  'mt-0.5 size-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.08] hover:text-white auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950',
                  following
                    ? 'flex bg-white/[0.08] text-white auto-light:bg-black/[0.08] auto-light:text-neutral-950'
                    : 'flex md:hidden md:group-focus-within:flex md:group-hover:flex',
                )}
              >
                <Icon name="add" className="text-[17px]" />
              </button>
            )}
          </>
        )}
      </div>
      {following && (
        <div className="mb-1 ml-9 mr-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 auto-light:border-black/10 auto-light:bg-black/[0.03]">
          <Icon
            name="subdirectory_arrow_right"
            className="text-[14px] text-neutral-500"
          />
          <input
            autoFocus
            value={next}
            onChange={(e) => setNext(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addFollowUp();
              if (e.key === 'Escape') setFollowing(false);
            }}
            placeholder="Next step after this…"
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none auto-light:text-neutral-900 auto-light:placeholder:text-neutral-400"
          />
          {saving && <Spin className="size-3" />}
        </div>
      )}
    </div>
  );
};

/**
 * A line at the end of Upcoming to write a new task on. It has no day
 * unless one is picked; its project comes from its words, as on the sheet.
 */
const NewTaskRow = ({ onAdded }: { onAdded: () => void }) => {
  const [title, setTitle] = useState('');
  const [forDate, setForDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const add = async () => {
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await PortalSdk.postData('/api/me/day/tasks', {
        title: text,
        date: forDate,
      });
      setTitle('');
      onAdded();
    } catch (err) {
      toast.error((err as any)?.error ?? 'Could not add the task.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-1">
      {saving ? (
        <Spin className="size-4" />
      ) : (
        <Icon
          name="add"
          className="text-[18px] text-neutral-600 auto-light:text-neutral-400"
        />
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        maxLength={200}
        placeholder="Add a task"
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-neutral-100 placeholder:font-normal placeholder:text-neutral-600 focus:outline-none auto-light:text-neutral-900 auto-light:placeholder:text-neutral-400"
      />
      <DatePopover
        value={forDate}
        onPick={setForDate}
        extra={[{ label: 'Today', date: dayjs().format('YYYY-MM-DD') }]}
        trigger={
          <button
            type="button"
            aria-label={forDate ? 'Change its day' : 'Give it a day'}
            title={
              forDate
                ? `For ${dayjs(forDate).format('dddd D MMMM')}`
                : 'Give it a day'
            }
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.08] hover:text-white data-[state=open]:bg-white/[0.08] auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950"
          >
            {forDate ? (
              <DateBadge
                date={forDate}
                className="text-neutral-200 auto-light:text-neutral-800"
              />
            ) : (
              <Icon name="calendar_month" className="text-[17px]" />
            )}
          </button>
        }
      />
    </div>
  );
};

/** The person's tasks, read again whenever `version` changes. */
export function useYourTasks(version: number) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [archived, setArchived] = useState<Task[]>([]);
  const [projects, setProjects] = useState<DayProject[]>([]);
  const [today, setToday] = useState(dayjs().format('YYYY-MM-DD'));
  const load = useCallback(() => {
    PortalSdk.getData('/api/me/day/tasks', null)
      .then((res) => {
        setTasks(res?.data?.tasks ?? []);
        setArchived(res?.data?.archived ?? []);
        setProjects(res?.data?.projects ?? []);
        if (res?.data?.today) setToday(res.data.today);
      })
      .catch(() => setTasks([]));
  }, []);
  useEffect(load, [load, version]);
  return { tasks, archived, projects, today, reload: load };
}

export const YourTasks = ({
  data,
  companies,
  date,
  canPlan,
  onChanged,
}: {
  data: ReturnType<typeof useYourTasks>;
  companies: DayCompany[];
  date: string;
  /** Whether the open day can take tasks. */
  canPlan: boolean;
  onChanged: () => void;
}) => {
  const { user } = useUser();
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<Sort>('added');
  useEffect(() => {
    try {
      if (localStorage.getItem(SORT_KEY) === 'day') setSort('day');
    } catch {
      // Storage can be blocked; the choice then lasts for this visit.
    }
  }, []);
  const pickSort = (next: Sort) => {
    setSort(next);
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts for this visit.
    }
  };
  const { tasks, archived, projects, today } = data;
  const all = tasks ?? [];
  const upcoming = sortUpcoming(upcomingOf(all, today), sort);

  const placeFor = (t: Task) => placeOf(t, projects, companies);
  const afterOf = (t: Task) =>
    t.followsId ? (all.find((x) => x.id === t.followsId) ?? null) : null;

  const move = async (task: Task, to: 'done' | 'todo') => {
    try {
      await PortalSdk.postData('/api/me/day/points', {
        taskId: task.id,
        status: to,
        text: '',
      });
      if (to === 'done') toast.success(`Done: ${task.title}`);
      onChanged();
    } catch {
      toast.error('Could not update the task.');
    }
  };
  const plan = async (task: Task, forDate: string | null) => {
    try {
      await PortalSdk.patchData(`/api/me/day/tasks/${task.id}`, { forDate });
      if (forDate && forDate <= today)
        toast.success(
          `On ${forDate === today ? 'today' : dayjs(forDate).format('ddd D MMM')}: ${task.title}`,
        );
      onChanged();
    } catch {
      toast.error('Could not change its day.');
    }
  };
  const followUp = async (task: Task, title: string) => {
    try {
      await PortalSdk.postData('/api/tasks', {
        projectId: task.projectId,
        title,
        followsId: task.id,
        assigneeIds: user?.id ? [user.id] : [],
      });
      toast.success(`Follow-up added: ${title}`);
      onChanged();
      return true;
    } catch (err) {
      toast.error((err as any)?.error ?? 'Could not add the follow-up.');
      return false;
    }
  };

  const row = (t: Task, isArchived = false) => (
    <TaskRow
      key={t.id}
      task={t}
      place={placeFor(t)}
      date={date}
      canPlan={canPlan}
      after={afterOf(t)}
      archived={isArchived}
      onPlan={(d) => plan(t, d)}
      onMove={(to) => move(t, to)}
      onFollowUp={
        t.projectId && !isArchived ? (title) => followUp(t, title) : undefined
      }
    />
  );

  const heading = (
    title: string,
    count: number,
    fold?: { open: boolean; onToggle: () => void },
  ) => (
    <button
      type="button"
      disabled={!fold}
      onClick={fold?.onToggle}
      className="mb-1 flex w-full items-center gap-2 px-2 text-left disabled:cursor-default"
    >
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h4>
      <span className="text-[11px] text-neutral-600 auto-light:text-neutral-400">
        {count}
      </span>
      {fold && (
        <Icon
          name="expand_more"
          className={cn(
            'ml-auto text-[16px] text-neutral-500 transition-transform',
            fold.open && 'rotate-180',
          )}
        />
      )}
    </button>
  );

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 auto-light:border-black/10 auto-light:bg-white">
      {!tasks ? (
        <div className="flex justify-center py-6">
          <Spin className="size-4" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 px-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Upcoming
              </h4>
              <span className="text-[11px] text-neutral-600 auto-light:text-neutral-400">
                {upcoming.length}
              </span>
              <div
                role="group"
                aria-label="Sort by"
                className="ml-auto flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5 auto-light:bg-black/[0.04]"
              >
                {(
                  [
                    ['added', 'Added', 'Sort by when they were added'],
                    ['day', 'Day', 'Sort by their day, soonest first'],
                  ] as const
                ).map(([value, label, title]) => (
                  <button
                    key={value}
                    type="button"
                    title={title}
                    aria-pressed={sort === value}
                    onClick={() => pickSort(value)}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors',
                      sort === value
                        ? 'bg-white/[0.1] text-neutral-100 auto-light:bg-white auto-light:text-neutral-900 auto-light:shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-300 auto-light:hover:text-neutral-700',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {upcoming.map((t) => row(t))}
            {upcoming.length === 0 && (
              <p className="px-2 pb-1 text-sm text-neutral-500">
                Nothing upcoming. Tasks for later days, and tasks with no day
                yet, show here.
              </p>
            )}
            <NewTaskRow onAdded={onChanged} />
          </div>
          {archived.length > 0 && (
            <div>
              {heading('Archived', archived.length, {
                open: showArchived,
                onToggle: () => setShowArchived((v) => !v),
              })}
              {showArchived && archived.map((t) => row(t, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
