'use client';

import type { TaskSchedule, User } from '@db/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { describeGoalSchedule } from '@/lib/workspace/projects';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Field,
  Icon,
  NativeSelect,
} from '../Admin/shared/AdminUI';
import {
  type GoalDraft,
  GoalFields,
  goalForSave,
  newGoalDraft,
} from '../Admin/Workspace/GoalsEditor';
import { AvatarStack, errorText } from '../Admin/Workspace/shared';
import type { Person, PlanView, ProjectChoice } from './types';
import { shortDay } from './types';

/*
 * Repeating work set up in a plan, like "Post 3 shorts every Monday". It is
 * a repeating goal of a project that remembers the plan: the goal makes the
 * tasks, and they link to the plan. Goals are changed on their project.
 */

const NewGoalModal = ({
  plan,
  projects,
  people,
  open,
  onOpenChange,
  onSaved,
}: {
  plan: PlanView;
  /** Projects they can add goals to. */
  projects: ProjectChoice[];
  people: Person[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [projectId, setProjectId] = useState('');
  const [draft, setDraft] = useState<GoalDraft>(newGoalDraft('scheduled'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // The project the plan's steps are about, when it has one.
    const fromSteps = plan.steps.find(
      (s) => s.projectId && projects.some((p) => p.id === s.projectId),
    )?.projectId;
    setProjectId(fromSteps ?? projects[0]?.id ?? '');
    setDraft(newGoalDraft('scheduled'));
  }, [open, plan, projects]);

  const save = async () => {
    if (!projectId) return toast.error('Pick a project.');
    if (!draft.title.trim()) return toast.error('Say what repeats.');
    setSaving(true);
    try {
      await PortalSdk.postData(`/api/projects/${projectId}/goals`, {
        goal: { ...goalForSave(draft), kind: 'scheduled', planId: plan.id },
      });
      toast.success('Repeating goal added');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon="event_repeat"
      title="Repeating work"
      description="A repeating goal of a project: it makes its own dated tasks, linked to this plan."
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton tone="primary" size="sm" loading={saving} onClick={save}>
            Add
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Project">
          <NativeSelect
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <GoalFields
          goal={draft}
          users={people as unknown as User[]}
          onChange={(patch) =>
            setDraft((d) => ({ ...d, ...patch, kind: 'scheduled' }))
          }
        />
      </div>
    </AdminModal>
  );
};

export const PlanSchedules = ({
  plan,
  projects,
  people,
  canEdit,
  canAddTo,
  onSaved,
}: {
  plan: PlanView;
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  /** Whether they can add (and change) goals in a project. */
  canAddTo: (projectId: string) => boolean;
  onSaved: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const addable = projects.filter((p) => canAddTo(p.id));
  const canAdd = canEdit && addable.length > 0;
  if (!plan.schedules.length && !canAdd) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Repeating work
      </h3>
      <div className="mt-2 flex flex-col">
        {plan.schedules.map((s: TaskSchedule) => {
          const project = projectById.get(s.projectId);
          const goal = project?.goals.find((g) => g.id === s.goalId);
          const who = (s.assigneeIds ?? [])
            .map((id) => personById.get(id))
            .filter(Boolean) as unknown as User[];
          return (
            <Link
              key={s.id}
              href={`${APP_ROUTES.projects}/${s.projectId}?view=goals`}
              className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <Icon
                name="event_repeat"
                className={cn(
                  'mt-0.5 text-[18px]',
                  s.active ? 'text-sky-400' : 'text-neutral-600',
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm leading-6',
                    s.active ? 'text-neutral-100' : 'text-neutral-500',
                  )}
                >
                  {goal?.title ?? s.title}
                </p>
                <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-neutral-500">
                  {project && (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: project.color || '#525252' }}
                      />
                      {project.name}
                    </span>
                  )}
                  {goal && <span>{describeGoalSchedule(goal)}</span>}
                  <span>
                    {s.active ? `next ${shortDay(s.nextRunOn)}` : 'Paused'}
                  </span>
                </p>
              </div>
              {who.length > 0 && <AvatarStack users={who} max={3} />}
            </Link>
          );
        })}
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:text-neutral-300"
        >
          <Icon name="add" className="text-[18px]" />
          Add repeating work
        </button>
      )}
      <NewGoalModal
        plan={plan}
        projects={addable}
        people={people}
        open={open}
        onOpenChange={setOpen}
        onSaved={onSaved}
      />
    </div>
  );
};
