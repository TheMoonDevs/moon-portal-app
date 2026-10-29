'use client';

import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../../Admin/shared/AdminUI';
import type { Place } from './sheetParts';
import {
  DoingDot,
  PlaceDot,
  placeOf,
  rowStatus,
  StatusIcon,
} from './sheetParts';
import type { DayCompany, DayProject, DayTask } from './useDay';

/*
 * The person's tasks beside the day: the ones pending today, the ones
 * pending from before, the next seven days, the rest folded away, and the
 * archived ones to bring back. A task can be put on the open day, ticked
 * off, or followed by a next step.
 */

type Task = DayTask & { followsId?: string | null; dueDate?: string | null };

const dayOf = (t: Task) => t.forDate || t.dueDate?.slice(0, 10) || null;

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
  date: string;
  canPlan: boolean;
  after?: { title: string; status: string } | null;
  onPlan: () => Promise<unknown>;
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
  const onDay = task.forDate === date;
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
              <StatusIcon status={status} />
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
            {status === 'doing' && !archived && <DoingDot />}
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
            {onFollowUp && (
              <button
                type="button"
                aria-label="Add a follow-up task"
                title="Add a follow-up task: the next step after this one"
                onClick={() => setFollowing((v) => !v)}
                className={cn(
                  'mt-0.5 size-7 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.08] hover:text-white auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950',
                  following
                    ? 'flex bg-white/[0.08] text-white auto-light:bg-black/[0.08] auto-light:text-neutral-950'
                    : 'flex md:hidden md:group-focus-within:flex md:group-hover:flex',
                )}
              >
                <Icon name="add" className="text-[16px]" />
              </button>
            )}
            {onDay ? (
              <span
                title="On this day"
                className="mt-1 text-[16px] text-emerald-400/70 auto-light:text-emerald-600/70"
              >
                <Icon name="playlist_add_check" />
              </span>
            ) : (
              canPlan && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run('plan', onPlan)}
                  title={`Plan it for ${dayjs(date).format('ddd D MMM')}`}
                  className="mt-0.5 flex h-7 shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 text-[11px] font-medium text-neutral-300 hover:bg-white/[0.08] hover:text-white auto-light:border-black/10 auto-light:text-neutral-700 auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950 md:hidden md:group-focus-within:flex md:group-hover:flex"
                >
                  {busy === 'plan' ? (
                    <Spin className="size-3" />
                  ) : (
                    <Icon name="event_available" className="text-[14px]" />
                  )}
                  Day
                </button>
              )
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
  const [showOthers, setShowOthers] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { tasks, archived, projects, today } = data;
  const all = tasks ?? [];
  const week = dayjs(today).add(7, 'day').format('YYYY-MM-DD');

  const pendingToday = all.filter((t) => dayOf(t) === today);
  const pendingBefore = all
    .filter((t) => {
      const d = dayOf(t);
      return !!d && d < today;
    })
    .sort((a, b) => dayOf(a)!.localeCompare(dayOf(b)!));
  const future = all
    .filter((t) => {
      const d = dayOf(t);
      return !!d && d > today && d <= week;
    })
    .sort((a, b) => dayOf(a)!.localeCompare(dayOf(b)!));
  const others = all.filter(
    (t) =>
      !pendingToday.includes(t) &&
      !pendingBefore.includes(t) &&
      !future.includes(t),
  );

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
  const plan = async (task: Task) => {
    try {
      await PortalSdk.patchData(`/api/me/day/tasks/${task.id}`, {
        forDate: date,
      });
      onChanged();
    } catch {
      toast.error('Could not plan it.');
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
      onPlan={() => plan(t)}
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

  // The next seven days, a subtitle for each.
  const futureDays = Array.from(new Set(future.map((t) => dayOf(t)!)));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 auto-light:border-black/10 auto-light:bg-white">
      {!tasks ? (
        <div className="flex justify-center py-6">
          <Spin className="size-4" />
        </div>
      ) : all.length === 0 && archived.length === 0 ? (
        <p className="px-2 pb-2 text-sm text-neutral-500">
          Nothing pending. Tasks you write on a day, and tasks assigned to you,
          show here.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {pendingToday.length > 0 && (
            <div>
              {heading('Pending today', pendingToday.length)}
              {pendingToday.map((t) => row(t))}
            </div>
          )}
          {pendingBefore.length > 0 && (
            <div>
              {heading('Pending from before', pendingBefore.length)}
              {pendingBefore.map((t) => row(t))}
            </div>
          )}
          {future.length > 0 && (
            <div>
              {heading('Future', future.length)}
              {futureDays.map((d) => (
                <div key={d}>
                  <p className="mt-1 px-2 text-[11px] text-neutral-500">
                    {dayjs(d).diff(dayjs(today), 'day') === 1
                      ? 'Tomorrow'
                      : dayjs(d).format('dddd, D MMM')}
                  </p>
                  {future.filter((t) => dayOf(t) === d).map((t) => row(t))}
                </div>
              ))}
            </div>
          )}
          {others.length > 0 && (
            <div>
              {heading('Others', others.length, {
                open: showOthers,
                onToggle: () => setShowOthers((v) => !v),
              })}
              {showOthers && others.map((t) => row(t))}
            </div>
          )}
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
