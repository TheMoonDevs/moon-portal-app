'use client';

import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../../Admin/shared/AdminUI';
import { TASK_STATUS_META } from '../../Admin/Workspace/shared';
import type { MyTask } from './PointList';

/*
 * The person's open tasks beside the day: the ones for this day first, then
 * late ones, then the rest. A task is a work point, so "+" puts it on the
 * day; ticking it off finishes the task.
 */

export type TaskProject = {
  id: string;
  name: string;
  color?: string | null;
};

const dayOf = (t: MyTask) => t.forDate || t.dueDate?.slice(0, 10) || null;

const whenLabel = (t: MyTask, date: string) => {
  const day = dayOf(t);
  if (!day) return null;
  const today = dayjs().format('YYYY-MM-DD');
  if (day < today)
    return { text: `Late · ${dayjs(day).format('D MMM')}`, late: true };
  if (day === date) return { text: 'This day', late: false };
  if (day === today) return { text: 'Today', late: false };
  return { text: dayjs(day).format('ddd D MMM'), late: false };
};

const TaskRow = ({
  task,
  project,
  date,
  onDay,
  after,
  onAdd,
  onDone,
  onFollowUp,
}: {
  task: MyTask;
  project?: TaskProject;
  date: string;
  onDay: boolean;
  /** The task it follows on from. */
  after?: { title: string; status: string } | null;
  onAdd: () => Promise<unknown>;
  onDone: () => Promise<unknown>;
  onFollowUp: (title: string) => Promise<boolean>;
}) => {
  const [busy, setBusy] = useState<'add' | 'done' | null>(null);
  const [following, setFollowing] = useState(false);
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const addFollowUp = async () => {
    const title = next.trim();
    if (!title || saving) return;
    setSaving(true);
    const made = await onFollowUp(title);
    setSaving(false);
    if (made) {
      setNext('');
      setFollowing(false);
    }
  };
  const when = whenLabel(task, date);
  const run = (kind: 'add' | 'done', fn: () => Promise<unknown>) => {
    setBusy(kind);
    fn().finally(() => setBusy(null));
  };
  return (
    <div>
      <div className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
        <button
          type="button"
          aria-label="Mark the task done"
          title="Mark the task done"
          disabled={!!busy}
          onClick={() => run('done', onDone)}
          className="mt-0.5 text-[18px] text-neutral-600 hover:text-emerald-400"
        >
          {busy === 'done' ? (
            <Spin className="size-4" />
          ) : (
            <Icon name="radio_button_unchecked" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          {after && (
            <p
              className="flex min-w-0 items-center gap-1 text-[11px] text-neutral-500"
              title="Follows on from this task"
            >
              <Icon name="subdirectory_arrow_right" className="text-[12px]" />
              <span className="truncate">After {after.title}</span>
              {after.status === 'DONE' && (
                <Icon name="check" className="text-[12px] text-emerald-400" />
              )}
            </p>
          )}
          <p className="text-sm leading-6 text-neutral-100">{task.title}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-500">
            {project && (
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color || '#a3a3a3' }}
                />
                <span className="truncate">{project.name}</span>
              </span>
            )}
            {when && (
              <span className={cn(when.late && 'text-rose-300')}>
                {when.text}
              </span>
            )}
            {task.status !== 'TODO' && (
              <span>{TASK_STATUS_META[task.status]?.label ?? task.status}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label="Add a follow-up task"
          title="Add a follow-up task: the next step after this one"
          onClick={() => setFollowing((v) => !v)}
          className={cn(
            'mt-0.5 size-7 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.08] hover:text-white',
            // Only on hover (or focus) on wider screens, so titles keep the room.
            following
              ? 'flex bg-white/[0.08] text-white'
              : 'flex md:hidden md:group-focus-within:flex md:group-hover:flex',
          )}
        >
          <Icon name="add" className="text-[16px]" />
        </button>
        {onDay ? (
          <span
            title="Already a point on this day"
            className="mt-1 text-[16px] text-emerald-400/70"
          >
            <Icon name="playlist_add_check" />
          </span>
        ) : (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run('add', onAdd)}
            title="Put it on this day"
            className="mt-0.5 flex h-7 shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 text-[11px] font-medium text-neutral-300 hover:bg-white/[0.08] hover:text-white md:hidden md:group-focus-within:flex md:group-hover:flex"
          >
            {busy === 'add' ? (
              <Spin className="size-3" />
            ) : (
              <Icon name="event_available" className="text-[14px]" />
            )}
            Day
          </button>
        )}
      </div>
      {following && (
        <div className="mb-1 ml-9 mr-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
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
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
          />
          {saving && <Spin className="size-3" />}
        </div>
      )}
    </div>
  );
};

export const TasksPanel = ({
  tasks,
  projects,
  date,
  onDayIds,
  previous = [],
  onAdd,
  onChanged,
}: {
  tasks: MyTask[] | null;
  projects: TaskProject[];
  /** Tasks the open ones follow on from, when not open themselves. */
  previous?: { id: string; title: string; status: string }[];
  date: string;
  /** Tasks already points on this day. */
  onDayIds: Set<string>;
  onAdd: (taskIds: string[]) => Promise<number>;
  onChanged: () => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  const today = dayjs().format('YYYY-MM-DD');
  const projectOf = (id: string) => projects.find((p) => p.id === id);

  const all = tasks ?? [];
  const forDay = all.filter((t) => dayOf(t) === date);
  const late = all.filter((t) => {
    const d = dayOf(t);
    return !!d && d < today && d !== date;
  });
  const rest = all
    .filter((t) => !forDay.includes(t) && !late.includes(t))
    .sort((a, b) => (dayOf(a) ?? '9999').localeCompare(dayOf(b) ?? '9999'));
  const missing = forDay.filter((t) => !onDayIds.has(t.id));

  const done = async (task: MyTask) => {
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, { status: 'DONE' });
      toast.success(`Done: ${task.title}`);
      onChanged();
    } catch {
      toast.error('Could not update the task.');
    }
  };
  const { user } = useUser();
  const afterOf = (t: MyTask) => {
    if (!t.followsId) return null;
    return (
      all.find((x) => x.id === t.followsId) ??
      previous.find((x) => x.id === t.followsId) ??
      null
    );
  };
  const followUp = async (task: MyTask, title: string) => {
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
      toast.error(
        (err as any)?.response?.data?.error ?? 'Could not add the follow-up.',
      );
      return false;
    }
  };
  const add = async (ids: string[]) => {
    const added = await onAdd(ids);
    if (added)
      toast.success(
        added === 1 ? 'Added to the day' : `${added} added to the day`,
      );
  };

  const section = (title: string, list: MyTask[], extra?: React.ReactNode) =>
    list.length > 0 && (
      <div>
        <div className="mb-1 flex items-center gap-2 px-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {title}
          </h4>
          <span className="text-[11px] text-neutral-600">{list.length}</span>
          {extra}
        </div>
        {list.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            project={projectOf(t.projectId)}
            date={date}
            onDay={onDayIds.has(t.id)}
            after={afterOf(t)}
            onAdd={() => add([t.id])}
            onDone={() => done(t)}
            onFollowUp={(title) => followUp(t, title)}
          />
        ))}
      </div>
    );

  const SHOW = 8;
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-white">Your tasks</h3>
        <span className="text-[11px] text-neutral-500">{all.length} open</span>
      </div>
      {!tasks ? (
        <div className="flex justify-center py-6">
          <Spin className="size-4" />
        </div>
      ) : all.length === 0 ? (
        <p className="px-2 pb-2 text-sm text-neutral-500">
          Nothing assigned to you right now. Points you add in a project become
          tasks.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {section(
            date === today
              ? 'For today'
              : `For ${dayjs(date).format('ddd D MMM')}`,
            forDay,
            missing.length > 1 && (
              <button
                type="button"
                onClick={() => add(missing.map((t) => t.id))}
                className="ml-auto text-[11px] font-medium text-sky-300 hover:text-sky-200"
              >
                Add all {missing.length}
              </button>
            ),
          )}
          {section('Late', late)}
          {section('Other open tasks', showAll ? rest : rest.slice(0, SHOW))}
          {rest.length > SHOW && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="px-2 text-left text-xs text-neutral-500 hover:text-neutral-300"
            >
              {showAll ? 'Show fewer' : `Show all ${rest.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
