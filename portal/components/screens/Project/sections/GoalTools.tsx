'use client';

import type { Task } from '@db/client';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ProjectGoal } from '@/models/workspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../../Admin/shared/AdminUI';
import { errorText } from '../../Admin/Workspace/shared';
import { Tip } from '../../Projects/Tip';
import { Picker, type PickerOption } from '../../Worklogs/DayLog/Picker';

/*
 * The small tools on a goal's card: its ID to copy (Claude can tick a goal
 * by it, e.g. "x1y2 is done until Nov 14"), and a button to link one of the
 * project's tasks to it.
 */

const SET_ASIDE = ['ARCHIVED', 'IGNORED'];
const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

const chip =
  'flex h-7 items-center gap-1 rounded-full border border-white/10 px-2 text-[11px] text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white';

export const GoalIdChip = ({ goal }: { goal: ProjectGoal }) => (
  <Tip content="Copy this goal's ID. Tell Claude “<ID> is done until Nov 14” to tick it off up to a day.">
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(goal.id)
          .then(() => toast.success('Goal ID copied'))
          .catch(() => toast.error('Could not copy it'));
      }}
      className={chip}
    >
      <span className="font-mono">{goal.id}</span>
      <Icon name="content_copy" className="text-[13px]" />
    </button>
  </Tip>
);

export const LinkTaskButton = ({
  goal,
  goals,
  tasks,
  onLinked,
}: {
  goal: ProjectGoal;
  /** All the project's goals, to say where a task is linked now. */
  goals: ProjectGoal[];
  tasks: Task[];
  onLinked: () => void;
}) => {
  const [busy, setBusy] = useState(false);

  const options = useMemo<PickerOption[]>(() => {
    const title = new Map(goals.map((g) => [g.id, g.title]));
    const pickable = tasks
      .filter((t) => !SET_ASIDE.includes(t.status) && t.goalId !== goal.id)
      // Open tasks first, then the latest.
      .sort(
        (a, b) =>
          Number(!OPEN.includes(a.status)) - Number(!OPEN.includes(b.status)) ||
          String(b.forDate ?? b.createdAt ?? '').localeCompare(
            String(a.forDate ?? a.createdAt ?? ''),
          ),
      )
      .slice(0, 200);
    const parts = goal.parts?.length ? goal.parts : [null];
    return parts.flatMap((part) =>
      pickable.map((t) => ({
        id: `${t.id}|${part?.id ?? ''}`,
        label: t.title,
        hint: [
          t.status === 'DONE' ? 'Done' : null,
          t.forDate ? `for ${dayjs(t.forDate).format('ddd D MMM')}` : null,
          t.goalId ? `now on ${title.get(t.goalId) ?? 'another goal'}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        group: part ? `Link to ${part.label}` : undefined,
        icon: t.status === 'DONE' ? 'check_circle' : 'radio_button_unchecked',
      })),
    );
  }, [tasks, goal, goals]);

  const link = async (option: PickerOption) => {
    const [taskId, partId] = option.id.split('|');
    setBusy(true);
    try {
      await PortalSdk.patchData(`/api/tasks/${taskId}`, {
        goalId: goal.id,
        goalPartId: partId || null,
      });
      toast.success(`Linked to ${goal.title}`);
      onLinked();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Picker
      options={options}
      onPick={link}
      align="end"
      placeholder="Find a task of this project…"
      empty="No task to link"
      trigger={
        <button
          type="button"
          title="Link a task to this goal"
          disabled={busy}
          className={chip}
        >
          {busy ? (
            <Spin className="size-3" />
          ) : (
            <Icon name="add_link" className="text-[14px]" />
          )}
          Link task
        </button>
      }
    />
  );
};
