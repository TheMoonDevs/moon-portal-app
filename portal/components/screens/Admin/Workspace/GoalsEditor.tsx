'use client';

import { PERIOD_LABELS } from '@/lib/workspace/projects';
import type { GoalPeriod, ProjectGoal } from '@/models/workspace';

import {
  AdminButton,
  IconAction,
  NativeSelect,
  TextInput,
} from '../shared/AdminUI';

export type GoalDraft = Omit<ProjectGoal, 'id' | 'parts'> & {
  id?: string;
  parts?: { id?: string; label: string; target: number }[];
};

const tempId = () => `new-${Math.random().toString(36).slice(2, 8)}`;

const NumberBox = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) => (
  <TextInput
    aria-label={label}
    type="number"
    min={1}
    value={value || ''}
    onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value))))}
    className="w-20 text-center"
  />
);

/**
 * Standing targets for a project: "2 songs released a week", or "9 shorts a
 * week split 3 / 3 / 3 across channels".
 */
export const GoalsEditor = ({
  value,
  onChange,
}: {
  value: GoalDraft[];
  onChange: (goals: GoalDraft[]) => void;
}) => {
  const update = (i: number, patch: Partial<GoalDraft>) =>
    onChange(value.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  return (
    <div className="flex flex-col gap-2">
      {value.map((goal, i) => {
        const parts = goal.parts ?? [];
        const total = parts.length
          ? parts.reduce((n, p) => n + (p.target || 0), 0)
          : goal.target;
        return (
          <div
            key={goal.id ?? i}
            className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              {parts.length ? (
                <span className="w-20 text-center text-sm font-semibold text-white">
                  {total}
                </span>
              ) : (
                <NumberBox
                  label="Target"
                  value={goal.target}
                  onChange={(target) => update(i, { target })}
                />
              )}
              <TextInput
                aria-label="Goal"
                value={goal.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="songs released"
                className="min-w-[160px] flex-1"
              />
              <NativeSelect
                aria-label="Every"
                value={goal.period}
                onChange={(e) =>
                  update(i, { period: e.target.value as GoalPeriod })
                }
                className="w-32"
              >
                {(Object.keys(PERIOD_LABELS) as GoalPeriod[]).map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABELS[p]}
                  </option>
                ))}
              </NativeSelect>
              <IconAction
                icon="delete"
                label="Remove goal"
                tone="danger"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              />
            </div>

            {parts.length > 0 && (
              <div className="flex flex-col gap-1.5 pl-2">
                {parts.map((part, k) => (
                  <div key={part.id ?? k} className="flex items-center gap-2">
                    <NumberBox
                      label="Part target"
                      value={part.target}
                      onChange={(target) =>
                        update(i, {
                          parts: parts.map((p, m) =>
                            m === k ? { ...p, target } : p,
                          ),
                        })
                      }
                    />
                    <TextInput
                      aria-label="Part"
                      value={part.label}
                      onChange={(e) =>
                        update(i, {
                          parts: parts.map((p, m) =>
                            m === k ? { ...p, label: e.target.value } : p,
                          ),
                        })
                      }
                      placeholder="Channel name"
                      className="flex-1"
                    />
                    <IconAction
                      icon="close"
                      label="Remove part"
                      onClick={() =>
                        update(i, { parts: parts.filter((_, m) => m !== k) })
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                update(i, {
                  parts: [
                    ...(parts.length
                      ? parts
                      : [{ id: tempId(), label: '', target: goal.target }]),
                    { id: tempId(), label: '', target: 1 },
                  ],
                })
              }
              className="self-start text-xs text-neutral-500 hover:text-neutral-300"
            >
              {parts.length
                ? '+ Add a part'
                : 'Split it (e.g. across channels)'}
            </button>
          </div>
        );
      })}
      <AdminButton
        size="sm"
        tone="ghost"
        icon="add"
        className="self-start"
        onClick={() =>
          onChange([...value, { title: '', target: 1, period: 'week' }])
        }
      >
        Add a goal
      </AdminButton>
    </div>
  );
};

/** Drops the temporary ids of new parts so the server assigns real ones. */
export const goalsForSave = (goals: GoalDraft[]) =>
  goals
    .filter((g) => g.title.trim())
    .map((g) => ({
      ...g,
      parts: g.parts
        ?.filter((p) => p.label.trim())
        .map((p) => ({
          ...p,
          id: p.id?.startsWith('new-') ? undefined : p.id,
        })),
    }));
