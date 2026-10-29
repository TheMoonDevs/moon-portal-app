'use client';

import type { Task, User } from '@db/client';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  describeGoalSchedule,
  type GoalProgress,
  PERIOD_LABELS,
} from '@/lib/workspace/projects';
import type { ProjectGoal } from '@/models/workspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  EmptyState,
  Icon,
  TextInput,
  UserAvatar,
} from '../../Admin/shared/AdminUI';
import type { ProjectRow } from '../../Admin/Workspace/AdminProjects';
import {
  type GoalDraft,
  GoalFields,
  goalForSave,
  KIND_META,
  newGoalDraft,
} from '../../Admin/Workspace/GoalsEditor';
import { errorText } from '../../Admin/Workspace/shared';
import { Tip, TipProvider, TipRow, TipTitle } from '../../Projects/Tip';
import type { Person } from '../types';
import { SectionShell } from './SectionShell';

const PERIOD_WORD = { day: 'Today', week: 'This week', month: 'This month' };
const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

type PersonLite = Pick<Person, 'id' | 'name' | 'avatar'>;

const fmt = (n: number) => Intl.NumberFormat('en').format(n);

/** "Fri 30", or "today" / "tomorrow". */
const forDay = (day?: string | null) => {
  if (!day) return null;
  const d = dayjs(day);
  if (d.isSame(dayjs(), 'day')) return 'today';
  if (d.isSame(dayjs().add(1, 'day'), 'day')) return 'tomorrow';
  return d.format(d.isSame(dayjs(), 'year') ? 'ddd D' : 'D MMM YYYY');
};

const Ring = ({
  percent,
  color,
  size = 72,
}: {
  percent: number;
  color: string;
  size?: number;
}) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={7}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * Math.min(100, percent)) / 100 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
};

/** − and + for progress no task tracks; − only takes back what + added. */
const Stepper = ({
  manual,
  busy,
  onChange,
}: {
  manual: number;
  busy: boolean;
  onChange: (add: number) => void;
}) => (
  <span className="inline-flex shrink-0 items-center gap-1">
    {[
      { add: -1, icon: 'remove', label: 'Take back one added by hand' },
      { add: 1, icon: 'add', label: 'Add one done outside tasks' },
    ].map((b) => (
      <button
        key={b.add}
        type="button"
        title={b.label}
        aria-label={b.label}
        disabled={busy || (b.add < 0 && manual <= 0)}
        onClick={() => onChange(b.add)}
        className="flex size-6 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <Icon name={b.icon} className="text-[14px]" />
      </button>
    ))}
  </span>
);

/** Who it is for: its people, or the whole team. */
const ForWhom = ({
  goal,
  people,
}: {
  goal: ProjectGoal;
  people: Map<string, PersonLite>;
}) => {
  const mine = (goal.assigneeIds ?? [])
    .map((id) => people.get(id))
    .filter((p): p is PersonLite => !!p);
  return (
    <Tip
      content={
        mine.length
          ? `For ${mine.map((p) => p.name).join(', ')}.`
          : 'For the whole project team: its tasks go to everyone on the project, and whoever finishes one gets the credit.'
      }
    >
      <span className="flex cursor-help items-center gap-1.5 text-[11px] text-neutral-500">
        {mine.length ? (
          <span className="flex -space-x-1.5">
            {mine.slice(0, 3).map((p) => (
              <UserAvatar
                key={p.id}
                src={p.avatar}
                name={p.name}
                size={18}
                className="ring-2 ring-neutral-950"
              />
            ))}
          </span>
        ) : (
          <>
            <Icon name="groups" className="text-[14px]" /> Whole team
          </>
        )}
      </span>
    </Tip>
  );
};

/** Who finished the work that counted, most first. */
const Contributors = ({
  progress,
  people,
  when,
}: {
  progress?: GoalProgress;
  people: Map<string, PersonLite>;
  when: string;
}) => {
  const rows = progress?.contributors ?? [];
  if (!rows.length) return null;
  return (
    <Tip
      content={
        <>
          <TipTitle>Who moved it {when}</TipTitle>
          <div className="flex flex-col gap-0.5">
            {rows.map((r) => (
              <TipRow
                key={r.userId}
                label={people.get(r.userId)?.name ?? 'Someone'}
                value={`${r.done} done`}
              />
            ))}
          </div>
          {!!progress?.manual && (
            <p className="mt-1.5 text-[11px] text-neutral-500">
              Plus {progress.manual} added by hand.
            </p>
          )}
        </>
      }
    >
      <span className="flex cursor-help items-center -space-x-1.5">
        {rows.slice(0, 4).map((r) => {
          const p = people.get(r.userId);
          return (
            <UserAvatar
              key={r.userId}
              src={p?.avatar}
              name={p?.name}
              size={22}
              className="ring-2 ring-neutral-950"
            />
          );
        })}
      </span>
    </Tip>
  );
};

/* ------------------------------ repeating goal ----------------------------- */

const ScheduledGoal = ({
  goal,
  project,
  tasks,
  people,
  canEdit,
  canTick,
  busy,
  onBump,
  onTick,
  onEdit,
}: {
  goal: ProjectGoal;
  project: ProjectRow;
  tasks: Task[];
  people: Map<string, PersonLite>;
  canEdit: boolean;
  canTick: boolean;
  busy: string | null;
  onBump: (goalId: string, partId: string | null, add: number) => void;
  onTick: (task: Task) => void;
  onEdit: () => void;
}) => {
  const color = project.color || '#10b981';
  const p = project.goalProgress?.find((g) => g.goalId === goal.id);
  const percent = p?.percent ?? 0;
  const history = (project.goalHistory?.[goal.id] ?? []).filter(
    (h) => h.met !== null,
  );
  const coming = tasks
    .filter((t) => t.goalId === goal.id && OPEN.includes(t.status))
    .sort((a, b) =>
      (a.forDate ?? a.dueDate ?? '9').localeCompare(
        b.forDate ?? b.dueDate ?? '9',
      ),
    );
  const [all, setAll] = useState(false);
  const shown = all ? coming : coming.slice(0, 4);
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="flex items-center gap-4">
        <Tip
          content={
            <>
              <TipTitle>
                {p?.done ?? 0} of {goal.target}{' '}
                {PERIOD_WORD[goal.period].toLowerCase()}
              </TipTitle>
              Done tasks linked to this goal for days in this{' '}
              {goal.period === 'day' ? 'day' : goal.period}
              {p?.manual ? `, plus ${p.manual} added by hand` : ''}. Work done
              early counts for the day it was for.
            </>
          }
        >
          <span className="relative cursor-help">
            <Ring
              percent={percent}
              color={percent >= 100 ? '#10b981' : color}
            />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
              {percent}%
            </span>
          </span>
        </Tip>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            {PERIOD_WORD[goal.period]}
          </p>
          <p className="truncate text-lg font-semibold text-white">
            {goal.title}
          </p>
          <p className="text-sm text-neutral-400">
            <span
              className={cn(
                'font-semibold',
                percent >= 100 ? 'text-emerald-400' : 'text-white',
              )}
            >
              {p?.done ?? 0}
            </span>{' '}
            of {goal.target} {PERIOD_LABELS[goal.period]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {canEdit && (
            <button
              type="button"
              aria-label="Edit goal"
              onClick={onEdit}
              className="flex size-7 items-center justify-center rounded-full text-neutral-500 hover:bg-white/[0.08] hover:text-white"
            >
              <Icon name="edit" className="text-[16px]" />
            </button>
          )}
          {canEdit && !goal.parts?.length && (
            <Stepper
              manual={p?.manual ?? 0}
              busy={busy === `${goal.id}:`}
              onChange={(add) => onBump(goal.id, null, add)}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <Icon name="event_repeat" className="text-[14px]" />
          {goal.makeTasks === false
            ? 'Makes no tasks'
            : describeGoalSchedule(goal)}
        </span>
        <ForWhom goal={goal} people={people} />
      </div>

      {p?.parts && (
        <div className="flex flex-col gap-2">
          {p.parts.map((part) => (
            <div key={part.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-neutral-300">{part.label}</span>
                <span className="flex items-center gap-2 text-neutral-500">
                  {part.done}/{part.target}
                  {canEdit && (
                    <Stepper
                      manual={part.manual ?? 0}
                      busy={busy === `${goal.id}:${part.id}`}
                      onChange={(add) => onBump(goal.id, part.id, add)}
                    />
                  )}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (part.done / part.target) * 100)}%`,
                  }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {coming.length > 0 && (
        <ul className="-mx-2 flex flex-col">
          <AnimatePresence initial={false}>
            {shown.map((t) => {
              const late = !!t.forDate && t.forDate < today;
              return (
                <motion.li
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]"
                >
                  <button
                    type="button"
                    disabled={!canTick}
                    aria-label="Mark as done"
                    onClick={() => onTick(t)}
                    className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-neutral-600 transition-colors enabled:hover:border-emerald-400"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">
                    {t.title}
                  </span>
                  {t.forDate && (
                    <span
                      className={cn(
                        'shrink-0 text-[11px]',
                        late ? 'text-rose-300' : 'text-neutral-500',
                      )}
                    >
                      for {forDay(t.forDate)}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
          {coming.length > 4 && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="self-start px-2 pt-1 text-[11px] text-neutral-500 hover:text-neutral-200"
            >
              {all ? 'Show fewer' : `${coming.length - 4} more coming up`}
            </button>
          )}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.05] pt-3 text-xs text-neutral-500">
        <Contributors
          progress={p}
          people={people}
          when={PERIOD_WORD[goal.period].toLowerCase()}
        />
        {history.length > 0 ? (
          <Tip
            content={
              <>
                <TipTitle>
                  Past {goal.period === 'day' ? 'days' : `${goal.period}s`}
                </TipTitle>
                <div className="flex flex-col gap-0.5">
                  {history.map((h) => (
                    <TipRow
                      key={h.from}
                      color={h.met ? '#34d399' : '#fb7185'}
                      label={
                        h.from === h.to
                          ? dayjs(h.from).format('D MMM')
                          : `${dayjs(h.from).format('D MMM')} – ${dayjs(h.to).format('D MMM')}`
                      }
                      value={`${h.done}/${h.target}`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Green met the target, red fell short.
                </p>
              </>
            }
          >
            <span className="ml-auto flex cursor-help items-center gap-1">
              {history.map((h) => (
                <span
                  key={h.from}
                  className={cn(
                    'size-2 rounded-full',
                    h.met ? 'bg-emerald-400' : 'bg-rose-400/80',
                  )}
                />
              ))}
              <span className="ml-1">
                {history.filter((h) => h.met).length}/{history.length} met
              </span>
            </span>
          </Tip>
        ) : (
          <span className="ml-auto">
            First {goal.period === 'day' ? 'day' : goal.period}
          </span>
        )}
      </div>
    </div>
  );
};

/* -------------------------------- target goal ------------------------------ */

const TargetGoal = ({
  goal,
  project,
  people,
  canEdit,
  busy,
  onBump,
  onSetTotal,
  onEdit,
  onRaise,
}: {
  goal: ProjectGoal;
  project: ProjectRow;
  people: Map<string, PersonLite>;
  canEdit: boolean;
  busy: string | null;
  onBump: (goalId: string, partId: string | null, add: number) => void;
  onSetTotal: (goal: ProjectGoal, total: number) => void;
  onEdit: () => void;
  onRaise: () => void;
}) => {
  const color = project.color || '#f59e0b';
  const p = project.goalProgress?.find((g) => g.goalId === goal.id);
  const achieved = !!goal.achievedAt || !!p?.achieved;
  const done = p?.done ?? 0;
  const width = Math.min(100, (done / goal.target) * 100);
  const [setting, setSetting] = useState(false);
  const [total, setTotal] = useState('');

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-3xl border p-5',
        achieved
          ? 'border-amber-300/25 bg-amber-300/[0.04]'
          : 'border-white/[0.07] bg-white/[0.02]',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            achieved
              ? 'bg-amber-300/15 text-amber-300'
              : 'bg-white/[0.05] text-neutral-400',
          )}
        >
          <Icon name={achieved ? 'star' : 'emoji_events'} filled={achieved} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            {achieved
              ? `Reached ${goal.achievedAt ? dayjs(goal.achievedAt).format('D MMM YYYY') : ''}`
              : 'Target'}
          </p>
          <p className="truncate text-lg font-semibold text-white">
            {fmt(goal.target)} {goal.title}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            aria-label="Edit goal"
            onClick={onEdit}
            className="flex size-7 items-center justify-center rounded-full text-neutral-500 hover:bg-white/[0.08] hover:text-white"
          >
            <Icon name="edit" className="text-[16px]" />
          </button>
        )}
      </div>

      <Tip
        content={
          <>
            <TipTitle>
              {fmt(done)} of {fmt(goal.target)} {goal.title}
            </TipTitle>
            Everything done since{' '}
            {goal.since ? dayjs(goal.since).format('D MMM YYYY') : 'it was set'}
            : linked tasks
            {p?.manual ? ` and ${fmt(p.manual)} added by hand` : ''}.
            {achieved
              ? ' It is in the project’s record for good.'
              : ' When it is reached it goes into the project’s record.'}
          </>
        }
      >
        <div className="cursor-help">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {fmt(done)}
            </span>
            <span className="text-xs text-neutral-500">
              {Math.round(width)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: achieved ? '#fbbf24' : color }}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </Tip>

      <div className="flex flex-wrap items-center gap-2">
        <ForWhom goal={goal} people={people} />
        <Contributors progress={p} people={people} when="so far" />
        <span className="flex-1" />
        {canEdit && !setting && (
          <>
            <Stepper
              manual={p?.manual ?? 0}
              busy={busy === `${goal.id}:`}
              onChange={(add) => onBump(goal.id, null, add)}
            />
            <AdminButton
              size="sm"
              tone="ghost"
              onClick={() => {
                setTotal(String(done));
                setSetting(true);
              }}
            >
              Set total
            </AdminButton>
          </>
        )}
        {setting && (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.round(Number(total));
              if (Number.isFinite(n) && n >= 0) onSetTotal(goal, n);
              setSetting(false);
            }}
          >
            <TextInput
              autoFocus
              type="number"
              min={0}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="h-8 w-24 text-center"
            />
            <AdminButton size="sm" tone="primary" type="submit">
              Save
            </AdminButton>
          </form>
        )}
        {achieved && canEdit && (
          <AdminButton size="sm" icon="trending_up" onClick={onRaise}>
            Raise the bar
          </AdminButton>
        )}
      </div>
    </div>
  );
};

/* ---------------------------------- record --------------------------------- */

/** Targets reached, newest first: the project's record. */
const Record = ({ goals }: { goals: ProjectGoal[] }) => {
  const reached = goals
    .filter((g) => g.kind === 'target' && g.achievedAt)
    .sort((a, b) => (b.achievedAt ?? '').localeCompare(a.achievedAt ?? ''));
  if (!reached.length) return null;
  return (
    <div className="mt-10">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        <Icon name="military_tech" className="text-[16px] text-amber-300" />
        Record
      </h3>
      <div className="flex flex-wrap gap-2">
        {reached.map((g) => (
          <span
            key={g.id}
            className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-3 py-1.5 text-xs text-amber-100"
          >
            <Icon name="star" filled className="text-[14px] text-amber-300" />
            {fmt(g.target)} {g.title}
            <span className="text-amber-200/50">
              {dayjs(g.achievedAt).format('D MMM YYYY')}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

/* --------------------------------- section --------------------------------- */

/**
 * The project's goals. Repeating goals make their own dated tasks (the
 * coming ones are listed on the goal, ready to tick off) and are met or
 * missed each period. Targets add up until reached, then go into the
 * project's record.
 */
export const GoalsSection = ({
  project,
  tasks,
  people: team,
  companyUsers,
  canEdit,
  canTick,
  onSaved,
}: {
  project: ProjectRow;
  tasks: Task[];
  people: Person[];
  companyUsers: User[];
  canEdit: boolean;
  canTick: boolean;
  onSaved: () => void;
}) => {
  const [editing, setEditing] = useState<GoalDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [bumping, setBumping] = useState<string | null>(null);
  const [local, setLocal] = useState(tasks);
  useEffect(() => setLocal(tasks), [tasks]);

  const goals = project.goals ?? [];
  const repeating = goals.filter((g) => g.kind !== 'target');
  const targets = goals
    .filter((g) => g.kind === 'target')
    // Open targets first.
    .sort((a, b) => Number(!!a.achievedAt) - Number(!!b.achievedAt));

  const people = useMemo(
    () =>
      new Map<string, PersonLite>(
        [...companyUsers, ...team].map((u) => [u.id, u]),
      ),
    [companyUsers, team],
  );
  // Who can be on a goal: the project's people first, then the company.
  const pickable = useMemo(() => {
    const ids = new Set(team.map((p) => p.id));
    return [
      ...companyUsers.filter((u) => ids.has(u.id)),
      ...companyUsers.filter((u) => !ids.has(u.id)),
    ];
  }, [companyUsers, team]);

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return toast.error('Give the goal a title.');
    setSaving(true);
    try {
      const goal = goalForSave(editing);
      if (editing.id)
        await PortalSdk.patchData(
          `/api/projects/${project.id}/goals/${editing.id}`,
          { goal },
        );
      else
        await PortalSdk.postData(`/api/projects/${project.id}/goals`, {
          goal,
        });
      toast.success(editing.id ? 'Goal saved' : 'Goal added');
      setEditing(null);
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      await PortalSdk.deleteData(
        `/api/projects/${project.id}/goals/${editing.id}`,
        {},
      );
      toast.success('Goal removed');
      setRemoving(false);
      setEditing(null);
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  /** Adds (or takes back) progress done outside tasks. */
  const bump = async (goalId: string, partId: string | null, add: number) => {
    setBumping(`${goalId}:${partId ?? ''}`);
    try {
      await PortalSdk.postData(`/api/projects/${project.id}/goals/progress`, {
        goalId,
        partId,
        add,
      });
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBumping(null);
    }
  };

  const setTotal = async (goal: ProjectGoal, done: number) => {
    setBumping(`${goal.id}:`);
    try {
      await PortalSdk.postData(`/api/projects/${project.id}/goals/progress`, {
        goalId: goal.id,
        done,
      });
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBumping(null);
    }
  };

  const tick = async (task: Task) => {
    setLocal((all) => all.filter((t) => t.id !== task.id));
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, { status: 'DONE' });
      onSaved();
    } catch (err) {
      setLocal(tasks);
      toast.error(errorText(err));
    }
  };

  const heading = (icon: string, title: string, hint: string) => (
    <h3 className="mb-3 mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 first:mt-0">
      <Icon name={icon} className="text-[16px]" />
      {title}
      <Tip content={hint}>
        <span className="cursor-help text-neutral-600 hover:text-neutral-300">
          <Icon name="info" className="text-[14px]" />
        </span>
      </Tip>
    </h3>
  );

  return (
    <TipProvider delayDuration={120}>
      <SectionShell
        icon="track_changes"
        title="Goals"
        description="Repeating goals make their own dated tasks and are met or missed each period. Targets add up until they're reached and go into the project's record."
        actions={
          canEdit && (
            <AdminButton
              size="sm"
              tone="primary"
              icon="add"
              onClick={() => setEditing(newGoalDraft('scheduled'))}
            >
              New goal
            </AdminButton>
          )
        }
      >
        {goals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10">
            <EmptyState
              icon="track_changes"
              title="No goals yet"
              description="Set a repeating goal like “2 songs released a week”, or a target like “1,000 subscribers”."
              action={
                canEdit && (
                  <div className="flex gap-2">
                    <AdminButton
                      tone="primary"
                      size="sm"
                      icon="event_repeat"
                      onClick={() => setEditing(newGoalDraft('scheduled'))}
                    >
                      Repeating goal
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      icon="emoji_events"
                      onClick={() => setEditing(newGoalDraft('target'))}
                    >
                      Target
                    </AdminButton>
                  </div>
                )
              }
            />
          </div>
        ) : (
          <>
            {repeating.length > 0 && (
              <>
                {heading('event_repeat', 'Repeating', KIND_META.scheduled.hint)}
                <div className="grid items-start gap-4 md:grid-cols-2">
                  {repeating.map((goal) => (
                    <ScheduledGoal
                      key={goal.id}
                      goal={goal}
                      project={project}
                      tasks={local}
                      people={people}
                      canEdit={canEdit}
                      canTick={canTick}
                      busy={bumping}
                      onBump={bump}
                      onTick={tick}
                      onEdit={() => setEditing(goal)}
                    />
                  ))}
                </div>
              </>
            )}
            {targets.length > 0 && (
              <>
                {heading('emoji_events', 'Targets', KIND_META.target.hint)}
                <div className="grid items-start gap-4 md:grid-cols-2">
                  {targets.map((goal) => (
                    <TargetGoal
                      key={goal.id}
                      goal={goal}
                      project={project}
                      people={people}
                      canEdit={canEdit}
                      busy={bumping}
                      onBump={bump}
                      onSetTotal={setTotal}
                      onEdit={() => setEditing(goal)}
                      onRaise={() =>
                        setEditing({
                          ...newGoalDraft('target'),
                          title: goal.title,
                          target: goal.target * 10,
                          // The new bar keeps counting from the old start.
                          since: goal.since,
                          previousId: goal.id,
                          assigneeIds: goal.assigneeIds,
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
            <Record goals={goals} />
          </>
        )}

        <AdminModal
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          size="lg"
          icon={editing?.kind === 'target' ? 'emoji_events' : 'track_changes'}
          title={editing?.id ? 'Edit goal' : 'New goal'}
          description={KIND_META[editing?.kind ?? 'scheduled'].hint}
          footer={
            <>
              {editing?.id && (
                <AdminButton
                  tone="danger"
                  size="sm"
                  icon="delete"
                  className="mr-auto"
                  onClick={() => setRemoving(true)}
                >
                  Remove
                </AdminButton>
              )}
              <AdminButton
                tone="ghost"
                size="sm"
                onClick={() => setEditing(null)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                tone="primary"
                size="sm"
                loading={saving}
                onClick={save}
              >
                {editing?.id ? 'Save goal' : 'Add goal'}
              </AdminButton>
            </>
          }
        >
          {editing && (
            <GoalFields
              goal={editing}
              users={pickable}
              onChange={(patch) =>
                setEditing((g) => (g ? { ...g, ...patch } : g))
              }
            />
          )}
        </AdminModal>
        <ConfirmDialog
          open={removing}
          onOpenChange={setRemoving}
          title={`Remove ${editing?.title || 'this goal'}?`}
          message="Its tasks stay; they stop counting towards it, and it makes no new ones."
          confirmLabel="Remove goal"
          loading={saving}
          onConfirm={remove}
        />
      </SectionShell>
    </TipProvider>
  );
};
