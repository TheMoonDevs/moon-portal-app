'use client';

import type { Task, TaskSchedule, User } from '@db/client';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { describeSchedule } from '@/lib/workspace/projects';
import { TASK_STATUS } from '@/models/workspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminButton, Icon, UserAvatar } from '../../Admin/shared/AdminUI';
import type { ProjectRow } from '../../Admin/Workspace/AdminProjects';
import { ProjectSchedules } from '../../Admin/Workspace/ProjectSchedules';
import { errorText } from '../../Admin/Workspace/shared';
import type { Person } from '../types';
import { SectionShell } from './SectionShell';

const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];
const STRIP_DAYS = 14;

/** The day a task is planned for: its scheduled day, else its due day. */
const dayOf = (t: Task) => t.forDate || t.dueDate || null;

type Group = { key: string; label: string; tone?: string; tasks: Task[] };

const groupTasks = (tasks: Task[]): Group[] => {
  const today = dayjs().format('YYYY-MM-DD');
  const weekEnd = dayjs().add(7, 'day').format('YYYY-MM-DD');
  const groups: Group[] = [
    { key: 'overdue', label: 'Overdue', tone: 'text-rose-300', tasks: [] },
    { key: 'today', label: 'Today', tone: 'text-amber-200', tasks: [] },
    { key: 'week', label: 'Next 7 days', tasks: [] },
    { key: 'later', label: 'Later', tasks: [] },
    { key: 'none', label: 'No date', tasks: [] },
  ];
  const at = (key: string) => groups.find((g) => g.key === key)!.tasks;
  for (const t of tasks) {
    const day = dayOf(t);
    if (!day) at('none').push(t);
    else if (day < today) at('overdue').push(t);
    else if (day === today) at('today').push(t);
    else if (day <= weekEnd) at('week').push(t);
    else at('later').push(t);
  }
  groups.forEach((g) =>
    g.tasks.sort((a, b) => (dayOf(a) ?? '').localeCompare(dayOf(b) ?? '')),
  );
  return groups.filter((g) => g.tasks.length);
};

const TaskRow = ({
  task,
  canEdit,
  onToggle,
  personById,
}: {
  task: Task;
  canEdit: boolean;
  onToggle: (task: Task) => void;
  personById: Map<string, Pick<Person, 'id' | 'name' | 'avatar'>>;
}) => {
  const isDone = task.status === 'DONE';
  const d = dayOf(task);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
    >
      <button
        type="button"
        disabled={!canEdit}
        aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
        onClick={() => onToggle(task)}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          isDone
            ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
            : 'border-neutral-600 enabled:hover:border-emerald-400',
        )}
      >
        {isDone && <Icon name="check" className="text-[13px]" />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            isDone ? 'text-neutral-500 line-through' : 'text-neutral-100',
          )}
        >
          {task.title}
        </p>
        <p className="flex items-center gap-2 text-[11px] text-neutral-500">
          {d && <span>{dayjs(d).format('ddd, D MMM')}</span>}
          {task.size === 'MAJOR' && (
            <span className="rounded bg-violet-500/15 px-1.5 text-violet-300">
              Major
            </span>
          )}
          {task.scheduleId && (
            <span className="flex items-center gap-0.5">
              <Icon name="event_repeat" className="text-[12px]" /> Repeats
            </span>
          )}
          {task.status === 'IN_PROGRESS' && (
            <span className="text-sky-300">In progress</span>
          )}
          {task.status === 'IN_REVIEW' && (
            <span className="text-amber-300">In review</span>
          )}
        </p>
      </div>
      <div className="flex -space-x-1.5">
        {(task.assigneeIds ?? []).slice(0, 3).map((id) => {
          const u = personById.get(id);
          return (
            <UserAvatar
              key={id}
              src={u?.avatar}
              name={u?.name}
              size={22}
              className="ring-2 ring-neutral-950"
            />
          );
        })}
      </div>
    </motion.li>
  );
};

/** When the project's work is due, and the tasks that repeat on their own. */
export const ScheduleSection = ({
  project,
  tasks,
  people,
  companyUsers,
  canCreate,
  canEdit,
  canDelete,
  onTasksChange,
}: {
  project: ProjectRow;
  tasks: Task[];
  people: Person[];
  companyUsers: User[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onTasksChange: () => void;
}) => {
  const [day, setDay] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<TaskSchedule[] | null>(null);
  const [managing, setManaging] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [local, setLocal] = useState<Task[]>(tasks);

  useEffect(() => setLocal(tasks), [tasks]);

  const loadSchedules = useCallback(() => {
    PortalSdk.getData(`/api/schedules?projectId=${project.id}`, null)
      .then((res) => setSchedules(res?.data?.schedules ?? []))
      .catch(() => setSchedules([]));
  }, [project.id]);

  useEffect(loadSchedules, [loadSchedules]);

  const personById = useMemo(
    () =>
      new Map<string, Pick<Person, 'id' | 'name' | 'avatar'>>(
        [...companyUsers, ...people].map((u) => [u.id, u]),
      ),
    [companyUsers, people],
  );

  const open = local.filter((t) => OPEN.includes(t.status));
  const done = local
    .filter((t) => t.status === 'DONE')
    .sort((a, b) =>
      String(b.completedAt ?? '').localeCompare(String(a.completedAt ?? '')),
    )
    .slice(0, 10);

  const strip = useMemo(
    () =>
      Array.from({ length: STRIP_DAYS }, (_, i) => {
        const d = dayjs().add(i, 'day');
        const key = d.format('YYYY-MM-DD');
        return {
          key,
          d,
          count: open.filter((t) => dayOf(t) === key).length,
        };
      }),
    [open],
  );

  const shown = day ? open.filter((t) => dayOf(t) === day) : open;
  const groups = groupTasks(shown);

  const toggle = async (task: Task) => {
    const status =
      task.status === TASK_STATUS.DONE ? TASK_STATUS.TODO : TASK_STATUS.DONE;
    setLocal((all) =>
      all.map((t) => (t.id === task.id ? { ...t, status } : t)),
    );
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, { status });
      onTasksChange();
    } catch (err) {
      setLocal(tasks);
      toast.error(errorText(err, 'Could not update the task.'));
    }
  };

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await PortalSdk.postData('/api/tasks', {
        projectId: project.id,
        title: title.trim(),
        dueDate: due || day || null,
      });
      setTitle('');
      setDue('');
      onTasksChange();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setAdding(false);
    }
  };

  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      canEdit={canEdit}
      onToggle={toggle}
      personById={personById}
    />
  );

  return (
    <SectionShell
      icon="calendar_month"
      title="Task Schedule"
      description="What is due and when, plus the work that repeats on its own."
    >
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {strip.map(({ key, d, count }) => {
          const selected = day === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setDay(selected ? null : key)}
              className={cn(
                'relative flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2.5 transition-colors',
                selected
                  ? 'border-white bg-white text-neutral-950'
                  : 'border-white/[0.07] bg-white/[0.02] text-neutral-300 hover:border-white/20',
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-medium uppercase',
                  selected ? 'text-neutral-600' : 'text-neutral-500',
                )}
              >
                {key === strip[0].key ? 'Today' : d.format('ddd')}
              </span>
              <span className="text-lg font-semibold leading-none">
                {d.format('D')}
              </span>
              <span className="mt-1 flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'size-1.5 rounded-full',
                      selected ? 'bg-neutral-900' : 'bg-sky-400',
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {canCreate && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
              className="mb-4 flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1.5 pl-3 focus-within:border-white/20"
            >
              <Icon name="add" className="text-[18px] text-neutral-500" />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  day
                    ? `Add a task for ${dayjs(day).format('ddd, D MMM')}`
                    : 'Add a task…'
                }
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
              />
              {!day && (
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  aria-label="Due"
                  className="h-8 rounded-lg bg-white/[0.05] px-2 text-xs text-neutral-300 outline-none [color-scheme:dark]"
                />
              )}
              <AdminButton
                type="submit"
                size="sm"
                tone="primary"
                loading={adding}
                disabled={!title.trim()}
              >
                Add
              </AdminButton>
            </form>
          )}

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-neutral-500">
              {day
                ? `Nothing planned for ${dayjs(day).format('dddd, D MMM')}.`
                : 'No open tasks. Nice.'}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((g) => (
                <div key={g.key}>
                  <p
                    className={cn(
                      'mb-1 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500',
                      g.tone,
                    )}
                  >
                    {g.label}
                    <span className="font-normal text-neutral-600">
                      {g.tasks.length}
                    </span>
                  </p>
                  <ul>
                    <AnimatePresence initial={false}>
                      {g.tasks.map(row)}
                    </AnimatePresence>
                  </ul>
                </div>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
              >
                Recently done
                <Icon
                  name={showDone ? 'expand_less' : 'expand_more'}
                  className="text-[16px]"
                />
              </button>
              {showDone && <ul className="mt-1">{done.map(row)}</ul>}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Icon
                name="event_repeat"
                className="text-[18px] text-neutral-400"
              />
              Repeats
            </p>
            <button
              type="button"
              onClick={() => setManaging(true)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              {canCreate ? 'Manage' : 'View'}
            </button>
          </div>
          {!schedules ? (
            <div className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
          ) : schedules.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Nothing repeats yet. Add weekly releases or daily shorts so they
              land on the list by themselves.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {schedules.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    'rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2',
                    !s.active && 'opacity-50',
                  )}
                >
                  <p className="truncate text-sm text-neutral-100">{s.title}</p>
                  <p className="text-[11px] text-neutral-500">
                    {describeSchedule(s)}
                    {s.active
                      ? ` · next ${dayjs(s.nextRunOn).format('D MMM')}`
                      : ' · paused'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <ProjectSchedules
        project={managing ? project : null}
        users={companyUsers}
        canEdit={canCreate}
        canDelete={canDelete}
        onOpenChange={(open) => !open && setManaging(false)}
        onSaved={() => {
          loadSchedules();
          onTasksChange();
        }}
      />
    </SectionShell>
  );
};
