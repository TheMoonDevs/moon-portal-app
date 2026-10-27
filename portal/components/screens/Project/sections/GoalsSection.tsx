'use client';

import type { Task } from '@db/client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { PERIOD_LABELS } from '@/lib/workspace/projects';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  EmptyState,
  Icon,
} from '../../Admin/shared/AdminUI';
import type { ProjectRow } from '../../Admin/Workspace/AdminProjects';
import {
  type GoalDraft,
  GoalsEditor,
  goalsForSave,
} from '../../Admin/Workspace/GoalsEditor';
import { errorText } from '../../Admin/Workspace/shared';
import { SectionShell } from './SectionShell';

const PERIOD_WORD = { day: 'Today', week: 'This week', month: 'This month' };

const Ring = ({
  percent,
  color,
  size = 76,
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

const byHand = (manual?: number) =>
  manual ? ` · ${manual} added by hand` : '';

/** The project's standing targets and how this period is going. */
export const GoalsSection = ({
  project,
  tasks,
  canEdit,
  onSaved,
}: {
  project: ProjectRow;
  tasks: Task[];
  canEdit: boolean;
  onSaved: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<GoalDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [bumping, setBumping] = useState<string | null>(null);
  const goals = project.goals ?? [];
  const color = project.color || '#10b981';

  const save = async () => {
    setSaving(true);
    try {
      await PortalSdk.patchData(`/api/projects/${project.id}`, {
        goals: goalsForSave(draft),
      });
      toast.success('Goals saved');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const open = () => {
    setDraft(goals);
    setEditing(true);
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

  return (
    <SectionShell
      icon="track_changes"
      title="Goals"
      description="What the project must deliver, again and again. Finished tasks fill the goal they fit; use + for work no task tracks."
      actions={
        canEdit && (
          <AdminButton size="sm" icon="edit" onClick={open}>
            Edit goals
          </AdminButton>
        )
      }
    >
      {goals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10">
          <EmptyState
            icon="track_changes"
            title="No goals yet"
            description="Set a target like “2 songs released a week” and every task linked to it moves the needle."
            action={
              canEdit && (
                <AdminButton tone="primary" size="sm" icon="add" onClick={open}>
                  Add a goal
                </AdminButton>
              )
            }
          />
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {goals.map((goal, i) => {
            const p = project.goalProgress?.find((g) => g.goalId === goal.id);
            const percent = p?.percent ?? 0;
            const history = (project.goalHistory?.[goal.id] ?? []).filter(
              (h) => h.met !== null,
            );
            const open = tasks.filter(
              (t) =>
                t.goalId === goal.id &&
                ['TODO', 'IN_PROGRESS', 'IN_REVIEW'].includes(t.status),
            ).length;
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col gap-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Ring
                      percent={percent}
                      color={percent >= 100 ? '#10b981' : color}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
                      {percent}%
                    </span>
                  </div>
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
                      {byHand(p?.manual)}
                    </p>
                  </div>
                  {canEdit && !goal.parts?.length && (
                    <Stepper
                      manual={p?.manual ?? 0}
                      busy={bumping === `${goal.id}:`}
                      onChange={(add) => bump(goal.id, null, add)}
                    />
                  )}
                </div>

                {p?.parts && (
                  <div className="flex flex-col gap-2">
                    {p.parts.map((part) => (
                      <div key={part.id}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-300">{part.label}</span>
                          <span className="flex items-center gap-2 text-neutral-500">
                            {part.done}/{part.target}
                            {byHand(part.manual)}
                            {canEdit && (
                              <Stepper
                                manual={part.manual ?? 0}
                                busy={bumping === `${goal.id}:${part.id}`}
                                onChange={(add) => bump(goal.id, part.id, add)}
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

                <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] pt-3 text-xs text-neutral-500">
                  <span>
                    {open} open {open === 1 ? 'task' : 'tasks'} linked
                  </span>
                  {history.length > 0 && (
                    <span className="flex items-center gap-1">
                      {history.map((h) => (
                        <span
                          key={h.from}
                          title={`${h.from} to ${h.to}: ${h.done}/${h.target}`}
                          className={cn(
                            'size-2 rounded-full',
                            h.met ? 'bg-emerald-400' : 'bg-rose-400/80',
                          )}
                        />
                      ))}
                      <span className="ml-1">
                        {history.filter((h) => h.met).length}/{history.length}{' '}
                        met
                      </span>
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AdminModal
        open={editing}
        onOpenChange={setEditing}
        size="lg"
        icon="track_changes"
        title="Goals"
        description="Targets that repeat every day, week or month."
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              loading={saving}
              onClick={save}
            >
              Save goals
            </AdminButton>
          </>
        }
      >
        <GoalsEditor value={draft} onChange={setDraft} />
      </AdminModal>
    </SectionShell>
  );
};
