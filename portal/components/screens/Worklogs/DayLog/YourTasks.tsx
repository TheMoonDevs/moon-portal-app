'use client';

import * as Popover from '@radix-ui/react-popover';
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
  PERSONAL_ID,
  PlaceDot,
  placeOf,
  rowIcon,
  rowStatus,
  StateDot,
  StatusIcon,
} from './sheetParts';
import type { TaskAction } from './TaskActions';
import { canAssign, TaskActionDialogs } from './TaskActions';
import type { DayCompany, DayProject, DayTask } from './useDay';

/*
 * The person's upcoming tasks beside the day: the ones not on today or
 * left from before (those are on the day's sheet), in the order they were
 * added or by their day, and the archived ones to bring back. A task can be
 * given a day, ticked off, or followed by a next step.
 */

type Task = DayTask & {
  followsId?: string | null;
  dueDate?: string | null;
  planId?: string | null;
  meetBookingId?: string | null;
  assigneeIds?: string[];
};

/**
 * The part of the portal a task came from, for grouping Upcoming:
 * meetings, goals, plans, follow-ups, the person's own, and Claude's.
 */
type Section = 'meetings' | 'goals' | 'plans' | 'followups' | 'own' | 'claude';
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'meetings', label: 'Meetings', icon: 'videocam' },
  { key: 'goals', label: 'Goals', icon: 'flag' },
  { key: 'plans', label: 'Plans', icon: 'map' },
  { key: 'followups', label: 'Follow-ups', icon: 'subdirectory_arrow_right' },
  { key: 'own', label: 'Your tasks', icon: 'checklist' },
  { key: 'claude', label: 'Added by Claude', icon: 'smart_toy' },
];
const sectionOf = (t: Task): Section =>
  t.meetBookingId || t.madeBy === 'meet'
    ? 'meetings'
    : t.scheduleId || t.goalId
      ? 'goals'
      : t.planId
        ? 'plans'
        : t.followsId
          ? 'followups'
          : t.madeBy && t.madeBy !== 'person'
            ? 'claude'
            : 'own';

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

type RowMove = 'done' | 'todo' | 'doing' | 'archived';

const menuItem =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-white/[0.06] disabled:opacity-40 disabled:hover:bg-transparent auto-light:hover:bg-black/[0.06]';

/** Everything a task in Your tasks can do, behind its three dots. */
const RowActions = ({
  status,
  date,
  canPlan,
  hasDay,
  disabled,
  assignable,
  onMove,
  onPlan,
  onFollowUp,
  onAction,
}: {
  status: ReturnType<typeof rowStatus>;
  date: string;
  canPlan: boolean;
  hasDay: boolean;
  disabled: boolean;
  assignable: boolean;
  onMove: (to: RowMove) => void;
  onPlan: (date: string | null) => void;
  onFollowUp?: () => void;
  onAction: (action: TaskAction) => void;
}) => {
  const [open, setOpen] = useState(false);
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const item = (
    icon: string,
    label: string,
    onClick: () => void,
    opts: { disabled?: boolean; title?: string; danger?: boolean } = {},
  ) => (
    <button
      type="button"
      disabled={opts.disabled}
      title={opts.title}
      onClick={() => {
        setOpen(false);
        // After the menu closes, so a dialog it opens keeps the focus.
        setTimeout(onClick, 0);
      }}
      className={menuItem}
    >
      <Icon
        name={icon}
        className="text-[16px] text-neutral-400 auto-light:text-neutral-500"
      />
      {label}
    </button>
  );
  const rule = (
    <div className="my-1 border-t border-white/[0.07] auto-light:border-black/10" />
  );
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Task actions"
          title="Actions"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.08] hover:text-white data-[state=open]:bg-white/[0.08] data-[state=open]:text-white auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950 auto-light:data-[state=open]:bg-black/[0.08] auto-light:data-[state=open]:text-neutral-950"
        >
          <Icon name="more_vert" className="text-[18px]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className="auto-theme z-[1300] w-56 rounded-xl border border-white/10 bg-neutral-900 p-1 text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10"
        >
          {status === 'done'
            ? item('radio_button_unchecked', 'Open it again', () =>
                onMove('todo'),
              )
            : item('check_circle', 'Mark done', () => onMove('done'))}
          {status !== 'doing' &&
            status !== 'done' &&
            item('clock_loader_40', 'Start it (doing)', () => onMove('doing'))}
          {rule}
          {item('today', 'Plan for today', () => onPlan(today))}
          {item('event', 'Plan for tomorrow', () => onPlan(tomorrow))}
          {canPlan &&
            date !== today &&
            date !== tomorrow &&
            item(
              'event_available',
              `Plan for ${dayjs(date).format('ddd D MMM')}`,
              () => onPlan(date),
            )}
          {hasDay && item('event_busy', 'Clear its day', () => onPlan(null))}
          {rule}
          {onFollowUp &&
            item('subdirectory_arrow_right', 'Add a follow-up', onFollowUp)}
          {item('person_add', 'Assign to…', () => onAction('assign'), {
            disabled: !assignable,
            title: assignable
              ? undefined
              : 'Personal tasks and tasks in no project stay yours',
          })}
          {item('description', 'Add info…', () => onAction('info'))}
          {rule}
          {item('inventory_2', 'Archive', () => onMove('archived'))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const TaskRow = ({
  task,
  place,
  date,
  canPlan,
  after,
  onPlan,
  onMove,
  onFollowUp,
  onAction,
  assignable,
  archived,
}: {
  task: Task;
  place: Place;
  /** The day open on the page, offered first when picking a day. */
  date: string;
  canPlan: boolean;
  after?: { title: string; status: string } | null;
  onPlan: (date: string | null) => Promise<unknown>;
  onMove: (to: RowMove) => Promise<unknown>;
  onFollowUp?: (title: string) => Promise<boolean>;
  /** Assign to (when it can be) or Add info. */
  onAction: (action: TaskAction) => void;
  assignable: boolean;
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
            <RowActions
              status={status}
              date={date}
              canPlan={canPlan}
              hasDay={!!day}
              disabled={!!busy}
              onMove={(to) => run('move', () => onMove(to))}
              onPlan={(d) => run('plan', () => onPlan(d))}
              onFollowUp={onFollowUp ? () => setFollowing(true) : undefined}
              onAction={onAction}
              assignable={assignable}
            />
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

  const [acting, setActing] = useState<{
    task: Task;
    action: TaskAction;
  } | null>(null);
  const personal = (id?: string | null) =>
    id === PERSONAL_ID || companies.some((c) => c.id === id && c.isPersonal);

  const move = async (task: Task, to: RowMove) => {
    try {
      await PortalSdk.postData('/api/me/day/points', {
        taskId: task.id,
        status: to,
        text: '',
      });
      if (to === 'done') toast.success(`Done: ${task.title}`);
      if (to === 'archived') toast.success(`Archived: ${task.title}`);
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
      onAction={(action) => setActing({ task: t, action })}
      assignable={canAssign(t, personal)}
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
            {SECTIONS.map((section) => {
              const list = upcoming.filter((t) => sectionOf(t) === section.key);
              if (!list.length) return null;
              return (
                <div key={section.key} className="mt-2 first:mt-0">
                  <p className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-[11px] font-medium text-neutral-400 auto-light:text-neutral-500">
                    <Icon name={section.icon} className="text-[14px]" />
                    {section.label}
                    <span className="tabular-nums text-neutral-600 auto-light:text-neutral-400">
                      {list.length}
                    </span>
                  </p>
                  {list.map((t) => row(t))}
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <p className="px-2 pb-1 text-sm text-neutral-500">
                Nothing upcoming. Tasks for later days, and tasks with no day
                yet, show here.
              </p>
            )}
            <NewTaskRow onAdded={onChanged} />
          </div>
          <TaskActionDialogs
            task={acting?.task ?? null}
            action={acting?.action ?? null}
            onClose={() => setActing(null)}
            onDone={onChanged}
          />
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
