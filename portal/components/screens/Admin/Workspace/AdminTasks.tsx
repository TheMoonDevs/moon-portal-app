'use client';

import type { ProjectGoal, Task, User } from '@db/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { PERIOD_LABELS } from '@/lib/workspace/projects';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  DateInput,
  EmptyState,
  Field,
  formatDate,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  PanelHeader,
  Pill,
  Segmented,
  SkeletonRows,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import type { ProjectRow } from './AdminProjects';
import {
  AvatarStack,
  CompanyPicker,
  errorText,
  GoalPicker,
  NeedsCompany,
  PeoplePicker,
  ProgressBar,
  TASK_STATUS_META,
} from './shared';

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
/** Tasks taken off the board without being done. */
const SET_ASIDE = ['IGNORED', 'ARCHIVED'];
const ALL_STATUSES = [...STATUS_ORDER, ...SET_ASIDE];

const emptyDraft = {
  title: '',
  description: '',
  size: 'MINOR',
  status: 'TODO',
  dueDate: '',
  forDate: '',
  goal: '',
  assigneeIds: [] as string[],
};

const TaskForm = ({
  open,
  onOpenChange,
  projectId,
  goals,
  task,
  users,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  goals: ProjectGoal[];
  task: Task | null;
  users: User[];
  onSaved: () => void;
}) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      task
        ? {
            title: task.title,
            description: task.description ?? '',
            size: task.size,
            status: task.status,
            dueDate: task.dueDate ?? '',
            forDate: task.forDate ?? '',
            goal: task.goalId ? `${task.goalId}:${task.goalPartId ?? ''}` : '',
            assigneeIds: task.assigneeIds ?? [],
          }
        : emptyDraft,
    );
  }, [open, task]);

  const set = <K extends keyof typeof emptyDraft>(
    key: K,
    value: (typeof emptyDraft)[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Give the task a title.');
    setSaving(true);
    try {
      const { goal, ...rest } = draft;
      const [goalId, goalPartId] = goal.split(':');
      const payload = {
        ...rest,
        dueDate: draft.dueDate || null,
        forDate: (goalId && draft.forDate) || null,
        goalId: goalId || null,
        goalPartId: goalPartId || null,
      };
      if (task) await PortalSdk.patchData(`/api/tasks/${task.id}`, payload);
      else await PortalSdk.postData('/api/tasks', { ...payload, projectId });
      toast.success(task ? 'Task updated' : 'Task created');
      onSaved();
      onOpenChange(false);
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
      icon="task_alt"
      title={task ? 'Edit task' : 'New task'}
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
            {task ? 'Save' : 'Create task'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title" required>
          <TextInput
            autoFocus
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Design the pricing page"
          />
        </Field>
        <Field
          label="Size"
          hint="Major tasks count three times as much towards progress."
        >
          <Segmented
            value={draft.size}
            onChange={(v) => set('size', v)}
            options={[
              { value: 'MINOR', label: 'Minor', icon: 'radio_button_checked' },
              { value: 'MAJOR', label: 'Major', icon: 'stars' },
            ]}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <NativeSelect
              value={draft.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {ALL_STATUSES.map((key) => (
                <option key={key} value={key}>
                  {TASK_STATUS_META[key].label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Due date" hint="Optional">
            <DateInput
              value={draft.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
            />
          </Field>
        </div>
        {goals.length > 0 && (
          <Field label="Counts towards">
            <GoalPicker
              goals={goals}
              value={draft.goal}
              onChange={(goal) => set('goal', goal)}
            />
          </Field>
        )}
        {draft.goal && (
          <Field
            label="Planned for"
            hint="Optional. Doing it early? Pick the day it was planned for and it counts in that week's goal."
          >
            <DateInput
              value={draft.forDate}
              onChange={(e) => set('forDate', e.target.value)}
            />
          </Field>
        )}
        <Field label="Details">
          <TextArea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field label="People" hint="Everyone on the task gets its points.">
          <PeoplePicker
            users={users}
            value={draft.assigneeIds}
            onChange={(ids) => set('assigneeIds', ids)}
          />
        </Field>
      </div>
    </AdminModal>
  );
};

export const AdminTasks = ({
  users,
  selectedCompanyId,
  onSelectCompany,
  selectedProjectId,
  onSelectProject,
}: {
  users: User[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
}) => {
  const { companies, canInProject } = useWorkspace();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showSetAside, setShowSetAside] = useState(false);

  const companyId = selectedCompanyId;

  // Projects carry goal progress, so they are reloaded when tasks change.
  const loadProjects = useCallback(
    (pickFirst = false) => {
      if (!companyId) return;
      PortalSdk.getData(`/api/projects?companyId=${companyId}`, null)
        .then((res) => {
          const list: ProjectRow[] = res?.data?.projects ?? [];
          setProjects(list);
          if (pickFirst && !list.some((p) => p.id === selectedProjectId)) {
            onSelectProject(list[0]?.id ?? null);
          }
        })
        .catch((err) =>
          toast.error(errorText(err, 'Could not load projects.')),
        );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId],
  );

  useEffect(() => {
    loadProjects(true);
  }, [loadProjects]);

  const loadTasks = useCallback(async () => {
    if (!selectedProjectId) return setTasks([]);
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/tasks?projectId=${selectedProjectId}${showSetAside ? '&includeArchived=true' : ''}`,
        null,
      );
      setTasks(res?.data?.tasks ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load tasks.'));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, showSetAside]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const project = projects.find((p) => p.id === selectedProjectId) ?? null;
  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const canEdit = canInProject(project, 'tasks:edit');

  const counted = tasks.filter((t) => !SET_ASIDE.includes(t.status));
  const open = counted.filter((t) => t.status !== 'DONE');
  const setAside = tasks.filter((t) => SET_ASIDE.includes(t.status));
  const goalName = (task: Task) => {
    const goal = project?.goals?.find((g) => g.id === task.goalId);
    const part = goal?.parts?.find((p) => p.id === task.goalPartId);
    return goal ? (part ? part.label : goal.title) : null;
  };

  const setStatus = async (task: Task, status: string) => {
    setBusyId(task.id);
    // Update in place first so the list feels instant.
    setTasks((all) =>
      all.map((t) =>
        t.id === task.id ? { ...t, status: status as Task['status'] } : t,
      ),
    );
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, { status });
      loadProjects();
    } catch (err) {
      toast.error(errorText(err));
      loadTasks();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await PortalSdk.deleteData(`/api/tasks/${deleting.id}`, {});
      toast.success('Task deleted');
      setDeleting(null);
      loadTasks();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <CompanyPicker
          companies={companies}
          value={companyId}
          onChange={onSelectCompany}
        />
        {companyId && (
          <NativeSelect
            aria-label="Project"
            className="min-w-[200px]"
            value={selectedProjectId ?? ''}
            onChange={(e) => onSelectProject(e.target.value || null)}
          >
            {!projects.length && <option value="">No projects yet</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <div className="flex-1" />
        {canInProject(project, 'tasks:create') && (
          <AdminButton
            tone="primary"
            icon="add"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New task
          </AdminButton>
        )}
      </div>

      {!companyId ? (
        <NeedsCompany text="Choose a company to see its tasks." />
      ) : !project ? (
        <NeedsCompany text="Create a project first, then add tasks to it." />
      ) : (
        <>
          <Panel className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>
                <span className="text-sm font-semibold text-white">
                  {open.length}
                </span>{' '}
                open · {counted.length - open.length} done
              </span>
              <button
                type="button"
                onClick={() => setShowSetAside((v) => !v)}
                className="hover:text-neutral-200"
              >
                {showSetAside ? 'Hide set-aside tasks' : 'Show set-aside tasks'}
              </button>
            </div>
            {(project.goals ?? []).map((goal) => {
              const p = project.goalProgress?.find((g) => g.goalId === goal.id);
              return (
                <div key={goal.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-neutral-300">
                      {goal.target} {goal.title}{' '}
                      <span className="text-neutral-500">
                        {PERIOD_LABELS[goal.period]}
                      </span>
                    </span>
                    <span className="font-semibold text-neutral-200">
                      {p?.done ?? 0}/{goal.target}
                    </span>
                  </div>
                  <ProgressBar
                    percent={p?.percent ?? 0}
                    color={project.color}
                  />
                </div>
              );
            })}
          </Panel>

          {loading && !tasks.length ? (
            <SkeletonRows rows={4} />
          ) : tasks.length === 0 ? (
            <Panel>
              <EmptyState
                icon="checklist"
                title="No tasks yet"
                description="Add tasks as they come up, or schedule the ones that repeat."
              />
            </Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              {[...STATUS_ORDER, ...(showSetAside ? ['SET_ASIDE'] : [])].map(
                (status) => {
                  const meta =
                    status === 'SET_ASIDE'
                      ? { label: 'Set aside', icon: 'inventory_2' }
                      : TASK_STATUS_META[status];
                  const column =
                    status === 'SET_ASIDE'
                      ? setAside
                      : tasks.filter((t) => t.status === status);
                  return (
                    <Panel key={status} className="flex flex-col">
                      <PanelHeader
                        icon={meta.icon}
                        title={meta.label}
                        description={`${column.length}`}
                      />
                      <ul className="flex flex-col gap-2 p-3">
                        {column.length === 0 && (
                          <li className="px-2 py-3 text-center text-xs text-neutral-600">
                            Nothing here
                          </li>
                        )}
                        {column.map((task) => {
                          const assignees = (task.assigneeIds ?? [])
                            .map((id) => byId.get(id))
                            .filter(Boolean) as User[];
                          return (
                            <li
                              key={task.id}
                              className={cn(
                                'group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3',
                                busyId === task.id && 'opacity-60',
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <p
                                  className={cn(
                                    'flex-1 text-sm text-neutral-100',
                                    (task.status === 'DONE' ||
                                      SET_ASIDE.includes(task.status)) &&
                                      'text-neutral-500 line-through',
                                  )}
                                >
                                  {task.scheduleId && (
                                    <Icon
                                      name="event_repeat"
                                      className="mr-1 align-[-2px] text-[14px] text-neutral-500"
                                    />
                                  )}
                                  {task.title}
                                </p>
                                {task.size === 'MAJOR' && (
                                  <Pill tone="warning" icon="stars">
                                    Major
                                  </Pill>
                                )}
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                                  {assignees.length > 0 && (
                                    <AvatarStack users={assignees} max={3} />
                                  )}
                                  {goalName(task) && (
                                    <span className="flex items-center gap-1">
                                      <Icon
                                        name="flag"
                                        className="text-[13px]"
                                      />
                                      {goalName(task)}
                                    </span>
                                  )}
                                  {task.forDate && task.goalId && (
                                    <span className="flex items-center gap-1">
                                      <Icon
                                        name="event_upcoming"
                                        className="text-[13px]"
                                      />
                                      for {formatDate(task.forDate)}
                                    </span>
                                  )}
                                  {task.dueDate && (
                                    <span className="flex items-center gap-1">
                                      <Icon
                                        name="event"
                                        className="text-[13px]"
                                      />
                                      {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                </div>
                                {canEdit && (
                                  <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                    <NativeSelect
                                      aria-label="Move task"
                                      className="h-7 w-28 py-0 text-[11px]"
                                      value={task.status}
                                      onChange={(e) =>
                                        setStatus(task, e.target.value)
                                      }
                                    >
                                      {ALL_STATUSES.map((key) => (
                                        <option key={key} value={key}>
                                          {TASK_STATUS_META[key].label}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                    <IconAction
                                      icon="edit"
                                      label="Edit task"
                                      onClick={() => {
                                        setEditing(task);
                                        setFormOpen(true);
                                      }}
                                    />
                                    {canInProject(project, 'tasks:delete') && (
                                      <IconAction
                                        icon="delete"
                                        label="Delete task"
                                        tone="danger"
                                        onClick={() => setDeleting(task)}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </Panel>
                  );
                },
              )}
            </div>
          )}
        </>
      )}

      {project && (
        <TaskForm
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={project.id}
          goals={project.goals ?? []}
          task={editing}
          users={users}
          onSaved={() => {
            loadTasks();
            loadProjects();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.title ?? 'task'}”?`}
        loading={!!deleting && busyId === deleting.id}
        onConfirm={remove}
      />
    </div>
  );
};
