'use client';

import type { TaskSchedule, User } from '@db/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { describeSchedule } from '@/lib/workspace/projects';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Field,
  Icon,
  NativeSelect,
  ToggleSwitch,
} from '../Admin/shared/AdminUI';
import {
  emptyScheduleDraft,
  type ScheduleDraft,
  scheduleDraftPayload,
  ScheduleFields,
  scheduleToDraft,
} from '../Admin/Workspace/ScheduleFields';
import { AvatarStack, errorText } from '../Admin/Workspace/shared';
import type { Person, PlanView, ProjectChoice } from './types';
import { shortDay } from './types';

/*
 * Scheduled tasks set up in a plan: repeating work that creates its own
 * tasks in a project, like "Post 3 shorts every Monday". They are not steps.
 */

const ScheduleModal = ({
  plan,
  schedule,
  projects: allProjects,
  canAddTo,
  people,
  open,
  onOpenChange,
  onSaved,
}: {
  plan: PlanView;
  /** The one being edited; null to add one. */
  schedule: TaskSchedule | null;
  projects: ProjectChoice[];
  canAddTo: (projectId: string) => boolean;
  people: Person[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [projectId, setProjectId] = useState('');
  const [draft, setDraft] = useState<ScheduleDraft>(emptyScheduleDraft);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  // New ones go in projects where they can add tasks.
  const projects = schedule
    ? allProjects
    : allProjects.filter((p) => canAddTo(p.id));

  useEffect(() => {
    if (!open) return;
    setProjectId(
      schedule?.projectId ??
        plan.steps.find((s) => s.projectId && canAddTo(s.projectId))
          ?.projectId ??
        projects[0]?.id ??
        '',
    );
    setDraft(schedule ? scheduleToDraft(schedule) : emptyScheduleDraft);
    setActive(schedule?.active ?? true);
    // Fill the form when it opens, not on every change behind it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schedule]);

  const project = projects.find((p) => p.id === projectId);

  const save = async () => {
    if (!projectId) return toast.error('Pick a project for it.');
    if (!draft.title.trim()) return toast.error('Give the task a title.');
    setSaving(true);
    try {
      const payload = scheduleDraftPayload(draft);
      if (schedule)
        await PortalSdk.patchData(`/api/schedules/${schedule.id}`, {
          ...payload,
          active,
        });
      else
        await PortalSdk.postData('/api/schedules', {
          ...payload,
          projectId,
          planId: plan.id,
        });
      toast.success(
        schedule ? 'Saved' : 'Scheduled. Its tasks will show up on their days.',
      );
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!schedule) return;
    setRemoving(true);
    try {
      await PortalSdk.deleteData(`/api/schedules/${schedule.id}`, {});
      toast.success('Stopped. Tasks it already made stay.');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      icon="event_repeat"
      title={schedule ? 'Scheduled task' : 'Schedule a task'}
      description="It creates itself in the project on the days you pick."
      footer={
        <>
          {schedule && (
            <AdminButton
              tone="ghost"
              size="sm"
              icon="delete"
              loading={removing}
              onClick={remove}
              className="mr-auto text-rose-300"
            >
              Stop it
            </AdminButton>
          )}
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton tone="primary" size="sm" loading={saving} onClick={save}>
            {schedule ? 'Save' : 'Schedule it'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Project" required>
          <NativeSelect
            value={projectId}
            disabled={!!schedule}
            onChange={(e) => {
              setProjectId(e.target.value);
              // Goals belong to a project.
              setDraft((d) => ({ ...d, goal: '' }));
            }}
          >
            {!projectId && <option value="">Pick a project</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <ScheduleFields
          draft={draft}
          onChange={setDraft}
          goals={project?.goals ?? []}
          users={people as unknown as User[]}
        />
        {schedule && (
          <ToggleSwitch
            checked={active}
            onChange={setActive}
            label={active ? 'On' : 'Paused'}
          />
        )}
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
  /** Whether they can add (and change) tasks in a project. */
  canAddTo: (projectId: string) => boolean;
  onSaved: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskSchedule | null>(null);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const canAdd = canEdit && projects.some((p) => canAddTo(p.id));
  if (!plan.schedules.length && !canAdd) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Scheduled tasks
      </h3>
      <div className="mt-2 flex flex-col">
        {plan.schedules.map((s) => {
          const project = projectById.get(s.projectId);
          const who = (s.assigneeIds ?? [])
            .map((id) => personById.get(id))
            .filter(Boolean) as unknown as User[];
          return (
            <button
              key={s.id}
              type="button"
              disabled={!canEdit || !canAddTo(s.projectId)}
              onClick={() => {
                setEditing(s);
                setOpen(true);
              }}
              className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03] disabled:cursor-default"
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
                  {s.title}
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
                  <span>{describeSchedule(s)}</span>
                  <span>
                    {s.active ? `next ${shortDay(s.nextRunOn)}` : 'Paused'}
                  </span>
                </p>
              </div>
              {who.length > 0 && <AvatarStack users={who} max={3} />}
            </button>
          );
        })}
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:text-neutral-300"
        >
          <Icon name="add" className="text-[18px]" />
          Schedule a repeating task
        </button>
      )}
      <ScheduleModal
        plan={plan}
        schedule={editing}
        projects={projects}
        canAddTo={canAddTo}
        people={people}
        open={open}
        onOpenChange={setOpen}
        onSaved={onSaved}
      />
    </div>
  );
};
