'use client';

import * as Popover from '@radix-ui/react-popover';
import dayjs from 'dayjs';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import {
  addDays,
  goalRule,
  runCovering,
  runsFrom,
  toDay,
} from '@/lib/workspace/projects';

import { Icon } from '../../Admin/shared/AdminUI';
import type { PickerOption } from './Picker';
import { PickerList } from './Picker';
import type { Day, DayGoal, DayProject, DayTask } from './useDay';

/*
 * A task's goal on the day sheet. A task linked to a goal shows a star after
 * its notes count: muted while open, gold once done. The star opens what it
 * counts towards, the run day it counts for (a task done early can count for
 * next week), and lets it be linked to another goal or unlinked. A task with
 * no goal can be linked from its menu.
 */

export type GoalOfTask = {
  project: DayProject;
  goal: DayGoal;
  part: { id: string; label: string; target: number } | null;
};

/** The goal a task is linked to, if its project still has it. */
export function goalOfTask(
  task: DayTask,
  projects: DayProject[],
): GoalOfTask | null {
  if (!task.goalId || !task.projectId) return null;
  const project = projects.find((p) => p.id === task.projectId);
  const goal = project?.goals?.find((g) => g.id === task.goalId);
  if (!project || !goal) return null;
  const part = goal.parts?.find((p) => p.id === task.goalPartId) ?? null;
  return { project, goal, part };
}

const makesRuns = (goal: DayGoal) => goal.kind !== 'target' && goal.makeTasks;

/** The run days a task linked to this goal could count for. */
function runChoices(link: GoalOfTask, base: string) {
  const rule = goalRule(link.goal, link.part?.target ?? link.goal.target);
  const current = runCovering(rule, base);
  const ahead = runsFrom(rule, addDays(base, 1), 4);
  const runs = Array.from(new Set([...(current ? [current] : []), ...ahead]));
  return { rule, runs };
}

const goalLine = (goal: DayGoal) =>
  goal.kind === 'target'
    ? `Target of ${goal.target.toLocaleString()}`
    : `${goal.target} a ${goal.period}`;

/** The goals a task can be linked to: its own project's first. */
function goalOptions(task: DayTask, projects: DayProject[]): PickerOption[] {
  const sorted = [...projects].sort(
    (a, b) => Number(b.id === task.projectId) - Number(a.id === task.projectId),
  );
  return sorted.flatMap((project) =>
    (project.goals ?? []).flatMap((goal) => {
      const group =
        project.id === task.projectId
          ? `${project.name} (this task's project)`
          : project.name;
      const units = goal.parts?.length
        ? goal.parts.map((part) => ({
            id: `goal:${project.id}:${goal.id}:${part.id}`,
            label: `${goal.title}: ${part.label}`,
          }))
        : [{ id: `goal:${project.id}:${goal.id}:`, label: goal.title }];
      return units.map((u) => ({
        ...u,
        hint: goalLine(goal),
        group,
        color: project.color ?? null,
        icon: goal.kind === 'target' ? 'flag' : 'event_repeat',
      }));
    }),
  );
}

const shortRun = (day: string) => {
  const today = toDay();
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return dayjs(day).format('ddd D MMM');
};

/** The star itself, inline after a task's words and notes count. */
export const GoalStarIcon = ({
  done,
  className,
}: {
  done: boolean;
  className?: string;
}) => (
  <Icon
    name="star"
    filled={done}
    className={cn(
      'text-[14px]',
      done
        ? 'text-amber-400 auto-light:text-amber-500'
        : 'text-neutral-500 auto-light:text-neutral-400',
      className,
    )}
  />
);

export const GoalLink = ({
  task,
  day,
  editable,
  open,
  picking,
  onOpenChange,
  onPicking,
}: {
  task: DayTask;
  day: Day;
  editable: boolean;
  open: boolean;
  /** Showing the list of goals to link it to. */
  picking: boolean;
  onOpenChange: (open: boolean) => void;
  onPicking: (picking: boolean) => void;
}) => {
  const link = goalOfTask(task, day.projects);
  const done = task.status === 'DONE';
  const options = useMemo(
    () => (open ? goalOptions(task, day.projects) : []),
    [open, task, day.projects],
  );
  const base = task.forDate ?? day.today ?? toDay();
  const runs = link && makesRuns(link.goal) ? runChoices(link, base) : null;
  const countsFor =
    runs && task.forDate ? runCovering(runs.rule, task.forDate) : null;

  if (!link && !open) return null;

  const pickGoal = (o: PickerOption) => {
    const [, projectId, goalId, partId] = o.id.split(':');
    onOpenChange(false);
    day.linkGoal(
      task.id,
      { goalId, goalPartId: partId || null },
      projectId !== task.projectId ? projectId : undefined,
    );
  };

  const item =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]';

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {link ? (
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={`Counts towards ${link.goal.title}`}
            title={`Goal: ${link.goal.title}${link.part ? `: ${link.part.label}` : ''}`}
            onClick={() => onPicking(false)}
            className="pointer-events-auto ml-1 inline-flex align-[-2px] transition-transform hover:scale-110"
          >
            <GoalStarIcon done={done} />
          </button>
        </Popover.Trigger>
      ) : (
        <Popover.Anchor asChild>
          <span className="inline-block w-0" />
        </Popover.Anchor>
      )}
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="auto-theme z-[1300] w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 text-sm text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10"
        >
          {picking || !link ? (
            options.length ? (
              <PickerList
                options={options}
                onPick={pickGoal}
                placeholder="Link it to a goal…"
                empty="No goals match"
              />
            ) : (
              <p className="p-3 text-xs text-neutral-500">
                None of your projects has a goal yet. Goals are set on a
                project&apos;s page.
              </p>
            )
          ) : (
            <div className="p-1">
              <div className="flex items-start gap-2.5 px-2.5 pb-2 pt-2">
                <GoalStarIcon done={done} className="mt-0.5 text-[18px]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Counts towards
                  </p>
                  <p className="font-medium text-white auto-light:text-neutral-950">
                    {link.goal.title}
                    {link.part && (
                      <span className="text-neutral-400 auto-light:text-neutral-500">
                        {' '}
                        · {link.part.label}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {link.project.name} · {goalLine(link.goal)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {done
                      ? 'Done: it counts towards the goal.'
                      : 'The star turns gold when the task is done.'}
                  </p>
                </div>
              </div>
              {runs && runs.runs.length > 0 && (
                <div className="border-t border-white/[0.07] px-2.5 pb-2 pt-2 auto-light:border-black/10">
                  <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Counts for
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {runs.runs.map((run) => (
                      <button
                        key={run}
                        type="button"
                        disabled={!editable || run === countsFor}
                        onClick={() => {
                          onOpenChange(false);
                          day.linkGoal(task.id, {
                            goalId: link.goal.id,
                            goalPartId: link.part?.id ?? null,
                            runOn: run,
                          });
                        }}
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-xs tabular-nums',
                          run === countsFor
                            ? 'border-amber-400/40 bg-amber-400/10 text-amber-200 auto-light:text-amber-700'
                            : 'border-white/10 text-neutral-400 hover:bg-white/[0.06] disabled:hover:bg-transparent auto-light:border-black/10 auto-light:text-neutral-600 auto-light:hover:bg-black/[0.04]',
                        )}
                      >
                        {shortRun(run)}
                      </button>
                    ))}
                  </div>
                  {editable && (
                    <p className="pt-1.5 text-[11px] leading-4 text-neutral-500">
                      Done early for a later day? Pick that day: it takes the
                      place of the task the goal would make for it.
                    </p>
                  )}
                </div>
              )}
              {editable && (
                <div className="border-t border-white/[0.07] pt-1 auto-light:border-black/10">
                  <button
                    type="button"
                    onClick={() => onPicking(true)}
                    className={item}
                  >
                    <Icon
                      name="swap_horiz"
                      className="text-[16px] text-neutral-400 auto-light:text-neutral-500"
                    />
                    Link to another goal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      day.linkGoal(task.id, null);
                    }}
                    className={item}
                  >
                    <Icon
                      name="link_off"
                      className="text-[16px] text-neutral-400 auto-light:text-neutral-500"
                    />
                    Unlink from this goal
                  </button>
                </div>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
