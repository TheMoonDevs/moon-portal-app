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
  Icon,
  Pill,
  Segmented,
  Spin,
  UserAvatar,
} from '../../Admin/shared/AdminUI';
import { AvatarStack, errorText } from '../../Admin/Workspace/shared';
import type { Person } from '../types';
import { SectionShell, Stat } from './SectionShell';

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

type Show = 'open' | 'done' | 'all';
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
 * it to someone else, and it goes on that person's day sheet for today.
 */
const NewTask = ({
  projectId,
  me,
  people,
  onAdded,
}: {
  projectId: string;
  me: Who;
  /** The project's people first, then the rest of the company. */
  people: Who[];
  onAdded: (task: Task) => void;
}) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<Who>(me);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setAssignee(me), [me]);

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
        forDate: dayjs().format('YYYY-MM-DD'),
      });
      onAdded(res?.data?.task);
      setTitle('');
      if (assignee.id !== me.id)
        toast.success(
          `Added to ${assignee.name?.split(' ')[0] || 'their'}’s day`,
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
    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-1.5 pl-4 pr-1.5 focus-within:border-white/20">
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
        className="h-9 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
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
                ? 'bg-sky-500/15 text-sky-200 hover:bg-sky-500/20'
                : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white',
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
          className="w-64 border-white/10 bg-neutral-900 p-1.5 text-neutral-200"
        >
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Assign to…"
            className="mb-1 h-8 w-full rounded-lg bg-white/[0.05] px-2.5 text-sm outline-none placeholder:text-neutral-500"
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
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/[0.06]',
                  p.id === assignee.id && 'bg-white/[0.06]',
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
                  <Icon name="check" className="text-[16px] text-sky-300" />
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
/*                                  A task row                                */
/* -------------------------------------------------------------------------- */

const TaskRow = ({
  task,
  points,
  userOf,
  canTick,
  onTick,
}: {
  task: Task;
  points: Point[];
  userOf: (id: string) => Who | undefined;
  canTick: boolean;
  onTick: (task: Task) => void;
}) => {
  const [open, setOpen] = useState(false);
  const done = task.status === 'DONE';
  const underWay = UNDER_WAY.includes(task.status);
  const people = (task.assigneeIds ?? []).map(userOf).filter(Boolean) as Who[];
  const last = [...points].reverse().find((p) => p.text);
  const today = dayjs().format('YYYY-MM-DD');
  const late = !done && !!task.forDate && task.forDate < today;

  return (
    <li className="rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/[0.1]">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <button
          type="button"
          disabled={!canTick || done || task.status === 'IGNORED'}
          onClick={() => onTick(task)}
          title={done ? 'Done' : canTick ? 'Mark done' : undefined}
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
            canTick && !done && 'hover:text-emerald-300',
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
              'text-[20px]',
              done
                ? 'text-emerald-400'
                : underWay
                  ? 'text-sky-400'
                  : 'text-neutral-600',
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={cn(
              'flex items-center gap-2 text-sm font-medium',
              done ? 'text-neutral-400' : 'text-neutral-100',
            )}
          >
            {underWay && (
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-sky-400" />
              </span>
            )}
            <span className="min-w-0">{task.title}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
            {done && task.completedAt ? (
              <span>
                Done {dayLabel(task.completedAt as unknown as string)}
              </span>
            ) : (
              task.forDate && (
                <span className={cn(late && 'text-amber-300/80')}>
                  for {dayLabel(task.forDate)}
                </span>
              )
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
              <span className="min-w-0 max-w-full truncate text-neutral-400">
                · {last.text}
              </span>
            )}
          </p>
        </button>
        {people.length > 0 ? (
          <AvatarStack users={people} max={3} />
        ) : (
          <span className="text-[11px] text-neutral-600">Nobody</span>
        )}
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
            <div className="border-t border-white/[0.05] px-4 py-3 pl-11">
              {task.description && (
                <p className="mb-3 whitespace-pre-wrap text-sm text-neutral-400">
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
                          <p className="flex flex-wrap items-center gap-1.5 text-neutral-200">
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
/*                                  Section                                   */
/* -------------------------------------------------------------------------- */

/**
 * The project's tasks and the work logged on them. Worklogs and tasks are
 * one thing: what people log are work points under a task.
 */
export const TasksInActionSection = ({
  projectId,
  tasks,
  people,
  companyUsers,
  canAdd,
  canTick,
  onSaved,
}: {
  projectId: string;
  tasks: Task[];
  /** The project's leads and team. */
  people: Person[];
  /** Everyone in the company, to give a task to. */
  companyUsers: Person[];
  canAdd: boolean;
  canTick: boolean;
  onSaved: () => void;
}) => {
  const { user } = useUser();
  const [show, setShow] = useState<Show>('open');
  const [whose, setWhose] = useState<Whose>('everyone');
  const [data, setData] = useState<Data | null>(null);
  const [local, setLocal] = useState<Task[]>(tasks);

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
  const finished = scoped.filter((t) => !isOpen(t));

  const byRecent = (a: Task, b: Task) =>
    lastActive(b, pointsOf.get(b.id) ?? []).localeCompare(
      lastActive(a, pointsOf.get(a.id) ?? []),
    );
  const byDay = (a: Task, b: Task) =>
    (a.forDate ?? '9999').localeCompare(b.forDate ?? '9999') || byRecent(a, b);

  const groups: { key: string; title: string; icon: string; tasks: Task[] }[] =
    [];
  if (show !== 'done') {
    groups.push({
      key: 'under-way',
      title: 'Under way',
      icon: 'progress_activity',
      tasks: open.filter((t) => UNDER_WAY.includes(t.status)).sort(byRecent),
    });
    groups.push({
      key: 'to-do',
      title: 'To do',
      icon: 'radio_button_unchecked',
      tasks: open.filter((t) => t.status === 'TODO').sort(byDay),
    });
  }
  if (show !== 'open')
    groups.push({
      key: 'done',
      title: 'Done',
      icon: 'check_circle',
      tasks: [...finished].sort(byRecent),
    });

  const monthAgo = dayjs().subtract(30, 'day');
  const doneLately = live.filter(
    (t) =>
      t.status === 'DONE' &&
      t.completedAt &&
      dayjs(t.completedAt as unknown as string).isAfter(monthAgo),
  ).length;
  const working = new Set(
    live.filter(isOpen).flatMap((t) => t.assigneeIds ?? []),
  ).size;

  const tick = async (task: Task) => {
    setLocal((all) =>
      all.map((t) =>
        t.id === task.id ? { ...t, status: TASK_STATUS.DONE } : t,
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

  const shown = groups.filter((g) => g.tasks.length);

  return (
    <SectionShell
      icon="bolt"
      title="Tasks in Action"
      description="Every task in this project and the work logged on it. Add one for yourself, or switch who it is for."
      actions={
        <>
          <Segmented<Whose>
            value={whose}
            onChange={setWhose}
            options={[
              { value: 'everyone', label: 'Everyone' },
              { value: 'mine', label: 'Mine' },
            ]}
          />
          <Segmented<Show>
            value={show}
            onChange={setShow}
            options={[
              { value: 'open', label: 'Open', count: open.length },
              { value: 'done', label: 'Done', count: finished.length },
              { value: 'all', label: 'All' },
            ]}
          />
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open" value={live.filter(isOpen).length} />
        <Stat
          label="Under way"
          value={live.filter((t) => UNDER_WAY.includes(t.status)).length}
        />
        <Stat label="Done" value={doneLately} hint="last 30 days" />
        <Stat label="People on open tasks" value={working} />
      </div>

      {canAdd && me && (
        <NewTask
          projectId={projectId}
          me={me}
          people={assignable}
          onAdded={(task) => {
            if (task) setLocal((all) => [...all, task]);
            onSaved();
          }}
        />
      )}

      {shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center">
          <p className="text-sm text-neutral-300">
            {show === 'done' ? 'Nothing finished yet' : 'No open tasks'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            {canAdd
              ? 'Write one above. It lands on today’s worklog of whoever it is for.'
              : 'Tasks people add to this project, and the work they log on them, show here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {shown.map((group) => (
            <div key={group.key}>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Icon name={group.icon} className="text-[16px]" />
                {group.title}
                <span className="text-neutral-600">{group.tasks.length}</span>
              </h3>
              <ul className="flex flex-col gap-2">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    points={pointsOf.get(task.id) ?? []}
                    userOf={userOf}
                    canTick={canTick}
                    onTick={tick}
                  />
                ))}
              </ul>
            </div>
          ))}
          {!data && (
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <Spin className="size-3" /> Loading work points…
            </p>
          )}
        </div>
      )}
    </SectionShell>
  );
};
