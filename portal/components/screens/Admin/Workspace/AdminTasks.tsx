'use client';

import type { Task, User } from '@db/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
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
  NeedsCompany,
  PeoplePicker,
  ProgressBar,
  TASK_STATUS_META,
} from './shared';

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const emptyDraft = {
  title: '',
  description: '',
  size: 'MINOR',
  status: 'TODO',
  dueDate: '',
  assigneeIds: [] as string[],
};

const TaskForm = ({
  open,
  onOpenChange,
  projectId,
  task,
  users,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
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
      const payload = { ...draft, dueDate: draft.dueDate || null };
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
              {STATUS_ORDER.map((key) => (
                <option key={key} value={key}>
                  {TASK_STATUS_META[key].label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Due date">
            <DateInput
              value={draft.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Details">
          <TextArea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field label="Assignees">
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
  const { companies, can } = useWorkspace();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const companyId = selectedCompanyId;

  useEffect(() => {
    if (!companyId) return;
    PortalSdk.getData(`/api/projects?companyId=${companyId}`, null)
      .then((res) => {
        const list: ProjectRow[] = res?.data?.projects ?? [];
        setProjects(list);
        if (!list.some((p) => p.id === selectedProjectId)) {
          onSelectProject(list[0]?.id ?? null);
        }
      })
      .catch((err) => toast.error(errorText(err, 'Could not load projects.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadTasks = useCallback(async () => {
    if (!selectedProjectId) return setTasks([]);
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/tasks?projectId=${selectedProjectId}`,
        null,
      );
      setTasks(res?.data?.tasks ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load tasks.'));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const project = projects.find((p) => p.id === selectedProjectId) ?? null;
  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const canEdit = !!companyId && can(companyId, 'tasks:edit');

  const done = tasks.filter((t) => t.status === 'DONE');
  const weight = (list: Task[]) =>
    list.reduce((sum, t) => sum + (t.size === 'MAJOR' ? 3 : 1), 0);
  const percent = tasks.length
    ? Math.round((weight(done) / weight(tasks)) * 100)
    : 0;

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
        {project && can(project.companyId, 'tasks:create') && (
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
          <Panel className="p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
              <span>
                {done.length} of {tasks.length} tasks done
              </span>
              <span className="text-sm font-semibold text-white">
                {percent}%
              </span>
            </div>
            <ProgressBar
              percent={percent}
              color={project.color}
              className="h-2"
            />
          </Panel>

          {loading && !tasks.length ? (
            <SkeletonRows rows={4} />
          ) : tasks.length === 0 ? (
            <Panel>
              <EmptyState
                icon="checklist"
                title="No tasks yet"
                description="Break the project into major and minor tasks."
              />
            </Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              {STATUS_ORDER.map((status) => {
                const meta = TASK_STATUS_META[status];
                const column = tasks.filter((t) => t.status === status);
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
                                  task.status === 'DONE' &&
                                    'text-neutral-500 line-through',
                                )}
                              >
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
                                    {STATUS_ORDER.map((key) => (
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
                                  {can(task.companyId, 'tasks:delete') && (
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
              })}
            </div>
          )}
        </>
      )}

      {project && (
        <TaskForm
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={project.id}
          task={editing}
          users={users}
          onSaved={loadTasks}
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
