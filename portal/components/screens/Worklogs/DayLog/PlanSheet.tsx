'use client';

import { useMemo } from 'react';

import type { TaskRowStatus } from './sheetParts';
import { movedOn, placeOf, rowStatus } from './sheetParts';
import type { SheetGroup } from './TaskSheet';
import { TaskSheet } from './TaskSheet';
import type { Day, DayTask, PlaceInput } from './useDay';

/*
 * The worklog's Plan mode: the day as a short checklist in two parts, To do
 * on top in the order it was put in, and Finished at the bottom, struck
 * through. Each task is its check, its words and its menu, written like the
 * Default sheet (Enter adds the next task, Backspace on an empty one takes
 * it out). Cmd/Ctrl+Up and Down move a task, and the order is kept for the
 * day.
 */

/** Closed on this day: off the To do list, into Finished. */
const FINISHED: TaskRowStatus[] = ['done', 'not_done', 'failed', 'archived'];

/**
 * The day's tasks in plan order: placed ones as placed, and each one not
 * placed yet (just written, or new to the day) right after the task before
 * it on the day.
 */
export function planSorted(tasks: DayTask[], order: string[]): DayTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t] as const));
  const out: DayTask[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const t = byId.get(id);
    if (t && !seen.has(id)) {
      out.push(t);
      seen.add(id);
    }
  }
  tasks.forEach((t, i) => {
    if (seen.has(t.id)) return;
    const before = tasks
      .slice(0, i)
      .reverse()
      .find((x) => seen.has(x.id));
    const at = before ? out.indexOf(before) + 1 : 0;
    out.splice(at, 0, t);
    seen.add(t.id);
  });
  return out;
}

export const PlanSheet = ({
  day,
  shown,
  editable,
  tagged,
  newPlace,
}: {
  day: Day;
  /** The day's tasks under the picked company tab. */
  shown: DayTask[];
  editable: boolean;
  /** Each task shows its project in front: "Project - task". */
  tagged: boolean;
  /** Where a new task goes when written at the end (the picked tab). */
  newPlace: PlaceInput | null;
}) => {
  const sorted = useMemo(
    () => planSorted(day.tasks, day.planOrder),
    [day.tasks, day.planOrder],
  );
  const shownIds = useMemo(() => new Set(shown.map((t) => t.id)), [shown]);
  const finished = (t: DayTask) =>
    !t.draft &&
    !movedOn(t, day.date, day.today) &&
    FINISHED.includes(rowStatus(t, day.points, day.date));
  const lines = sorted.filter((t) => shownIds.has(t.id));
  const todo = lines.filter((t) => !finished(t));
  const done = lines.filter(finished);

  /** One place up or down among the To do tasks shown, saved for the day. */
  const moveRow = (id: string, by: -1 | 1) => {
    if (!editable) return;
    const index = todo.findIndex((t) => t.id === id);
    const other = todo[index + by];
    if (index < 0 || !other || other.draft) return;
    const ids = sorted.map((t) => t.id);
    const a = ids.indexOf(id);
    const b = ids.indexOf(other.id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    day.saveOrder(ids.filter((x) => !day.tasks.find((t) => t.id === x)?.draft));
  };

  const groups: SheetGroup[] = [
    {
      key: 'plan-todo',
      title: done.length ? 'To do' : undefined,
      tasks: todo,
      add: { place: newPlace, placeholder: 'Add a task' },
    },
    ...(done.length
      ? [
          {
            key: 'plan-finished',
            title: 'Finished',
            tasks: done,
            quiet: true,
            strike: true,
          },
        ]
      : []),
  ];

  return (
    <div className="py-1">
      {!lines.length && !editable && (
        <p className="px-2 pb-1 pt-2 text-sm text-neutral-500">
          Nothing on this day.
        </p>
      )}
      <TaskSheet
        day={day}
        groups={groups}
        editable={editable}
        showPoints={false}
        plain
        onMoveRow={moveRow}
        lead={
          tagged
            ? (t) => {
                const place = placeOf(t, day.projects, day.companies);
                return place.kind === 'none' ? null : (
                  <span className="max-w-[40%] shrink-0 truncate text-sm font-medium leading-6 text-neutral-500 auto-light:text-neutral-400">
                    {place.name} -
                  </span>
                );
              }
            : undefined
        }
      />
    </div>
  );
};
