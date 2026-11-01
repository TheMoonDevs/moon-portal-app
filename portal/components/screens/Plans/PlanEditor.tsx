'use client';

import type { User } from '@db/client';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { PLAN_STATUS_META } from '@/lib/workspace/plans';
import { PLAN_STATUS } from '@/models/workspace';

import {
  AdminButton,
  Icon,
  IconAction,
  Segmented,
} from '../Admin/shared/AdminUI';
import { AvatarStack, PeoplePicker } from '../Admin/Workspace/shared';
import { findProject, GrowingText, ProjectOptions } from './planBits';
import { StepsEditor } from './StepsEditor';
import type { Person, PlanView, ProjectChoice } from './types';
import { isPast, stepCount } from './types';

/* -------------------------------------------------------------------------- */
/*                                  The plan                                  */
/* -------------------------------------------------------------------------- */

export const PlanEditor = ({
  plan,
  projects,
  people,
  canEdit,
  canDelete,
  selectedStepId,
  onSelectStep,
  onChange,
  onDelete,
  onBack,
  fresh,
  extra,
  newStepProjectId,
  stepProjects,
  companyName,
  lockLink,
  addsTasksIn,
  onMakeTask,
}: {
  /** Whether they can add tasks in a project. */
  addsTasksIn: (projectId?: string | null) => boolean;
  /** Makes a task step's task. */
  onMakeTask: (stepId: string) => Promise<boolean>;
  plan: PlanView;
  /** The plan's company's projects. */
  projects: ProjectChoice[];
  /** The projects its steps can name; all of `projects` for a grand plan. */
  stepProjects?: ProjectChoice[];
  /** Shown when plans of several companies are listed together. */
  companyName?: string;
  /** Keep the project link as it is, e.g. on that project's page. */
  lockLink?: boolean;
  people: Person[];
  canEdit: boolean;
  canDelete: boolean;
  selectedStepId: string | null;
  onSelectStep: (id: string | null) => void;
  onChange: (change: (plan: PlanView) => PlanView) => void;
  onDelete: () => void;
  onBack?: () => void;
  /** Just created: put the cursor in the title. */
  fresh?: boolean;
  /** Shown under the steps, e.g. the plan's scheduled tasks. */
  extra?: ReactNode;
  /** The project new steps are for, e.g. on that project's page. */
  newStepProjectId?: string;
}) => {
  const canName = stepProjects ?? projects;
  const linkedProject = plan.projectId
    ? findProject(projects, plan.projectId)
    : undefined;
  const [pickingPeople, setPickingPeople] = useState(false);
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const personById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const count = stepCount(plan);
  const owner = personById.get(plan.ownerId);
  const members = (plan.memberIds ?? [])
    .map((id) => personById.get(id))
    .filter(Boolean) as Person[];

  const set = <K extends keyof PlanView>(key: K, value: PlanView[K]) =>
    onChange((p) => ({ ...p, [key]: value }));
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-4 sm:px-8">
        <div className="mb-3 flex items-center gap-2">
          {onBack && (
            <IconAction icon="arrow_back" label="All plans" onClick={onBack} />
          )}
          <Segmented
            value={plan.status}
            onChange={(status) => canEdit && set('status', status)}
            options={Object.values(PLAN_STATUS).map((s) => ({
              value: s,
              label: PLAN_STATUS_META[s].label,
            }))}
            className={cn(!canEdit && 'pointer-events-none opacity-70')}
          />
          {companyName && (
            <span className="hidden items-center gap-1 truncate text-xs text-neutral-500 sm:flex">
              <Icon name="domain" className="text-[14px]" />
              {companyName}
            </span>
          )}
          <div className="flex-1" />
          {canDelete && (
            <IconAction
              icon="delete"
              label="Delete plan"
              tone="danger"
              onClick={onDelete}
            />
          )}
        </div>

        <GrowingText
          value={plan.title}
          selectOnMount={fresh}
          onChange={(title) => set('title', title)}
          placeholder="Name the plan"
          disabled={!canEdit}
          className="text-2xl font-semibold leading-tight text-white placeholder:text-neutral-600"
        />

        {/* Who and by when. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-400">
          <label
            className="flex items-center gap-1.5"
            title={
              plan.projectId
                ? 'Linked to this project: new steps stay in it and the projects under it. Pick None to make it a grand plan.'
                : 'A grand plan: its steps can be for any of the company’s projects. Pick a project to link it.'
            }
          >
            <Icon
              name={plan.projectId ? 'link' : 'hub'}
              className="text-[15px] text-neutral-500"
            />
            <span className="text-neutral-500">Project</span>
            <select
              value={plan.projectId ?? ''}
              disabled={!canEdit || lockLink}
              onChange={(e) => set('projectId', e.target.value || null)}
              className="max-w-[200px] cursor-pointer truncate rounded-md bg-transparent px-1 py-0.5 font-medium text-neutral-200 hover:bg-white/[0.05] focus:outline-none disabled:cursor-default disabled:hover:bg-transparent [&>option]:bg-neutral-900"
            >
              <option value="">None (grand plan)</option>
              {plan.projectId && !linkedProject && (
                <option value={plan.projectId}>A project</option>
              )}
              <ProjectOptions projects={projects} />
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <Icon name="person" className="text-[15px] text-neutral-500" />
            <span className="text-neutral-500">Owner</span>
            <select
              value={plan.ownerId}
              disabled={!canEdit}
              onChange={(e) => set('ownerId', e.target.value)}
              className="cursor-pointer bg-transparent font-medium text-neutral-200 focus:outline-none [&>option]:bg-neutral-900"
            >
              {!owner && <option value={plan.ownerId}>Someone</option>}
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <Icon name="flag" className="text-[15px] text-neutral-500" />
            <span className="text-neutral-500">By</span>
            <input
              type="date"
              value={plan.endOn ?? ''}
              disabled={!canEdit}
              onChange={(e) => set('endOn', e.target.value || null)}
              className={cn(
                'bg-transparent font-medium [color-scheme:dark] focus:outline-none',
                plan.endOn ? 'text-neutral-200' : 'text-neutral-500',
                plan.status !== PLAN_STATUS.DONE &&
                  isPast(plan.endOn) &&
                  'text-rose-300',
              )}
            />
          </label>
          <div className="relative flex items-center gap-1.5">
            <Icon name="group" className="text-[15px] text-neutral-500" />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setPickingPeople((v) => !v)}
              className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-white/[0.05]"
            >
              {members.length ? (
                <AvatarStack users={members as unknown as User[]} max={5} />
              ) : (
                <span className="text-neutral-500">Add people</span>
              )}
            </button>
            {pickingPeople && (
              <div className="absolute left-0 top-8 z-20 w-72 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-2xl">
                <PeoplePicker
                  users={people as unknown as User[]}
                  value={plan.memberIds ?? []}
                  onChange={(ids) => set('memberIds', ids)}
                />
                <AdminButton
                  size="sm"
                  tone="ghost"
                  className="mt-2 w-full"
                  onClick={() => setPickingPeople(false)}
                >
                  Done
                </AdminButton>
              </div>
            )}
          </div>
          {count.total > 0 && (
            <span className="flex items-center gap-1.5">
              <Icon name="checklist" className="text-[15px] text-neutral-500" />
              {count.done}/{count.total} steps done
            </span>
          )}
        </div>

        <GrowingText
          value={plan.notes ?? ''}
          onChange={(notes) => set('notes', notes)}
          placeholder="Ideas, thoughts, links… a plan can be just this."
          disabled={!canEdit}
          className="mt-5 min-h-[60px] text-sm leading-relaxed text-neutral-300 placeholder:text-neutral-600"
        />

        {/* Steps */}
        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Steps
        </h3>
        <StepsEditor
          plan={plan}
          projects={canName}
          people={people}
          canEdit={canEdit}
          selectedStepId={selectedStepId}
          onSelectStep={onSelectStep}
          onChange={onChange}
          newStepProjectId={newStepProjectId}
          addsTasksIn={addsTasksIn}
          onMakeTask={onMakeTask}
        />
        {extra}
      </div>
    </div>
  );
};

export { StepPanel } from './StepDetails';
