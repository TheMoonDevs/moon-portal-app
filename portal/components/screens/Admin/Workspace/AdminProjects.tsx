'use client';

import type { Project, User } from '@db/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  formatMetric,
  type GoalPeriodResult,
  type GoalProgress,
  metricLabel,
  PERIOD_LABELS,
  type ProjectStanding,
} from '@/lib/workspace/projects';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  CardSkeletons,
  ConfirmDialog,
  EmptyState,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  Pill,
  SearchInput,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import { ImageField } from '../shared/ImageField';
import { BrandKitEditor } from './BrandKitEditor';
import { type GoalDraft, GoalsEditor, goalsForSave } from './GoalsEditor';
import { ProjectRanking, ProjectResults } from './ProjectResults';
import { ProjectSchedules } from './ProjectSchedules';
import {
  AvatarStack,
  ColorPicker,
  CompanyMark,
  CompanyPicker,
  EFFORT_META,
  errorText,
  NeedsCompany,
  PeoplePicker,
  ProgressBar,
  PROJECT_STATUS_META,
} from './shared';

export type ProjectRow = Project & {
  progress: {
    total: number;
    done: number;
    major: number;
    majorDone: number;
    percent: number;
  };
  goalProgress: GoalProgress[];
  /** Recent periods of each goal, oldest first, by goal id. */
  goalHistory?: Record<string, GoalPeriodResult[]>;
  standings: (ProjectStanding & { metric: string; of: number })[];
};

const emptyDraft = {
  name: '',
  description: '',
  status: 'ACTIVE',
  color: '#0ea5e9',
  logo: '',
  effort: 'MEDIUM',
  parentId: '',
  goals: [] as GoalDraft[],
  leadIds: [] as string[],
  memberIds: [] as string[],
};

const ProjectForm = ({
  open,
  onOpenChange,
  companyId,
  project,
  projects,
  users,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  project: ProjectRow | null;
  /** The company's projects, to pick a parent from. */
  projects: ProjectRow[];
  users: User[];
  onSaved: () => void;
}) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      project
        ? {
            name: project.name,
            description: project.description ?? '',
            status: project.status,
            color: project.color ?? '#0ea5e9',
            logo: project.logo ?? '',
            effort: project.effort ?? 'MEDIUM',
            parentId: project.parentId ?? '',
            goals: project.goals ?? [],
            leadIds: project.leadIds ?? [],
            memberIds: project.memberIds ?? [],
          }
        : emptyDraft,
    );
  }, [open, project]);

  const set = <K extends keyof typeof emptyDraft>(
    key: K,
    value: (typeof emptyDraft)[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  // A project cannot sit under itself or one of its own sub-projects.
  const parents = useMemo(() => {
    if (!project) return projects;
    const under = new Set([project.id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const p of projects)
        if (p.parentId && under.has(p.parentId) && !under.has(p.id)) {
          under.add(p.id);
          grew = true;
        }
    }
    return projects.filter((p) => !under.has(p.id));
  }, [project, projects]);

  const save = async () => {
    if (!draft.name.trim()) return toast.error('Give the project a name.');
    setSaving(true);
    try {
      const payload = {
        ...draft,
        logo: draft.logo || null,
        parentId: draft.parentId || null,
        goals: goalsForSave(draft.goals),
      };
      if (project)
        await PortalSdk.patchData(`/api/projects/${project.id}`, payload);
      else await PortalSdk.postData('/api/projects', { ...payload, companyId });
      toast.success(project ? 'Project updated' : 'Project created');
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
      size="lg"
      icon="folder_open"
      title={project ? 'Edit project' : 'New project'}
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
            {project ? 'Save' : 'Create project'}
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" required className="md:col-span-2">
          <TextInput
            autoFocus
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Website relaunch"
          />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <TextArea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field
          label="Logo"
          hint="Optional. A square image works best."
          className="md:col-span-2"
        >
          <ImageField value={draft.logo} onChange={(url) => set('logo', url)} />
        </Field>
        <Field label="Status">
          <NativeSelect
            value={draft.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {Object.entries(PROJECT_STATUS_META)
              .filter(([key]) => key !== 'ARCHIVED')
              .map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
          </NativeSelect>
        </Field>
        <Field label="Color">
          <ColorPicker value={draft.color} onChange={(c) => set('color', c)} />
        </Field>
        <Field label="Effort" hint="How much work it takes to keep going.">
          <NativeSelect
            value={draft.effort}
            onChange={(e) => set('effort', e.target.value)}
          >
            {Object.entries(EFFORT_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Part of"
          hint="Optional. A bigger project this one sits under."
        >
          <NativeSelect
            value={draft.parentId}
            onChange={(e) => set('parentId', e.target.value)}
          >
            <option value="">None</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Goals"
          hint="What the project must deliver, again and again. Tasks linked to a goal fill it up."
          className="md:col-span-2"
        >
          <GoalsEditor
            value={draft.goals}
            onChange={(goals) => set('goals', goals)}
          />
        </Field>
        <Field label="Leads">
          <PeoplePicker
            users={users}
            value={draft.leadIds}
            onChange={(ids) => set('leadIds', ids)}
          />
        </Field>
        <Field label="Team">
          <PeoplePicker
            users={users}
            value={draft.memberIds}
            onChange={(ids) => set('memberIds', ids)}
          />
        </Field>
      </div>
    </AdminModal>
  );
};

export const AdminProjects = ({
  users,
  selectedCompanyId,
  onSelectCompany,
  onOpenTasks,
}: {
  users: User[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
  onOpenTasks: (projectId: string) => void;
}) => {
  const { companies, can, canInProject } = useWorkspace();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archiving, setArchiving] = useState<ProjectRow | null>(null);
  const [branding, setBranding] = useState<ProjectRow | null>(null);
  const [resultsFor, setResultsFor] = useState<ProjectRow | null>(null);
  const [schedulesFor, setSchedulesFor] = useState<ProjectRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState<ProjectRow | null>(null);
  const [moveTo, setMoveTo] = useState('');

  const companyId = selectedCompanyId;

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/projects?companyId=${companyId}`,
        null,
      );
      setProjects(res?.data?.projects ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load projects.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setProjects([]);
    load();
  }, [load]);

  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  // Sub-projects follow their parent.
  const ordered = useMemo(() => {
    const out: ProjectRow[] = [];
    const add = (p: ProjectRow) => {
      if (out.includes(p)) return;
      out.push(p);
      projects.filter((c) => c.parentId === p.id).forEach(add);
    };
    projects
      .filter((p) => !p.parentId || !projectById.has(p.parentId))
      .forEach(add);
    projects.forEach(add);
    return out;
  }, [projects, projectById]);
  const filtered = ordered.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  // Companies a project can move to: any other where they can add projects.
  const moveTargets = companies.filter(
    (c) => c.company.id !== companyId && can(c.company.id, 'projects:create'),
  );

  const move = async () => {
    if (!moving || !moveTo) return;
    setBusy(true);
    try {
      const res = await PortalSdk.postData(`/api/projects/${moving.id}/move`, {
        companyId: moveTo,
      });
      const name = companies.find((c) => c.company.id === moveTo)?.company.name;
      const moved = res?.data?.moved ?? 1;
      toast.success(
        `Moved to ${name}${moved > 1 ? ` with ${moved - 1} sub-project${moved > 2 ? 's' : ''}` : ''}`,
      );
      setMoving(null);
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!archiving) return;
    setBusy(true);
    try {
      await PortalSdk.deleteData(`/api/projects/${archiving.id}`, {});
      toast.success('Project archived');
      setArchiving(null);
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
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
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects…"
          className="min-w-[200px] flex-1"
        />
        {companyId && can(companyId, 'projects:create') && (
          <AdminButton
            tone="primary"
            icon="add"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New project
          </AdminButton>
        )}
      </div>

      {!companyId ? (
        <NeedsCompany text="Choose a company to see its projects." />
      ) : loading && !projects.length ? (
        <CardSkeletons count={3} />
      ) : filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon="folder_off"
            title={search ? 'No projects match that search' : 'No projects yet'}
            description={
              search
                ? undefined
                : 'Projects group the tasks your team works on.'
            }
          />
        </Panel>
      ) : (
        <>
          {!search && (
            <ProjectRanking projects={projects} onOpen={setResultsFor} />
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => {
              const meta =
                PROJECT_STATUS_META[project.status] ??
                PROJECT_STATUS_META.ACTIVE;
              const team = [
                ...(project.leadIds ?? []),
                ...(project.memberIds ?? []),
              ]
                .filter((id, i, all) => all.indexOf(id) === i)
                .map((id) => byId.get(id))
                .filter(Boolean) as User[];
              return (
                <Panel key={project.id} className="flex flex-col gap-4 p-4">
                  <div className="flex items-start gap-3">
                    {project.logo ? (
                      <CompanyMark
                        name={project.name}
                        logo={project.logo}
                        size={32}
                      />
                    ) : (
                      <span
                        className="mt-1 size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color || '#0ea5e9' }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {project.name}
                      </p>
                      {project.parentId &&
                        projectById.has(project.parentId) && (
                          <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
                            <Icon
                              name="subdirectory_arrow_right"
                              className="text-[13px]"
                            />
                            Part of {projectById.get(project.parentId)!.name}
                          </p>
                        )}
                      <p className="line-clamp-2 text-xs text-neutral-500">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                  </div>
                  {(project.goals ?? []).length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                      {(project.goals ?? []).map((goal) => {
                        const p = project.goalProgress?.find(
                          (g) => g.goalId === goal.id,
                        );
                        const past = (
                          project.goalHistory?.[goal.id] ?? []
                        ).filter((h) => h.met !== null);
                        return (
                          <div key={goal.id}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-neutral-300">
                                {goal.target} {goal.title}{' '}
                                <span className="text-neutral-500">
                                  {PERIOD_LABELS[goal.period]}
                                </span>
                              </span>
                              <span
                                className={
                                  p && p.percent >= 100
                                    ? 'font-semibold text-emerald-400'
                                    : 'font-semibold text-neutral-200'
                                }
                              >
                                {p?.done ?? 0}/{goal.target}
                              </span>
                            </div>
                            <ProgressBar
                              percent={p?.percent ?? 0}
                              color={project.color}
                            />
                            {past.length > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                {past.map((h) => (
                                  <span
                                    key={h.from}
                                    title={`${h.from} to ${h.to}: ${h.done}/${h.target}, ${h.met ? 'met' : 'missed'}`}
                                    className={
                                      h.met
                                        ? 'size-1.5 rounded-full bg-emerald-400'
                                        : 'size-1.5 rounded-full bg-rose-400/80'
                                    }
                                  />
                                ))}
                                <span className="ml-1 text-[10px] text-neutral-500">
                                  {past.filter((h) => h.met).length}/
                                  {past.length} met
                                </span>
                              </div>
                            )}
                            {p?.parts && (
                              <p className="mt-1 truncate text-[11px] text-neutral-500">
                                {p.parts
                                  .map(
                                    (part) =>
                                      `${part.label} ${part.done}/${part.target}`,
                                  )
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    can(project.companyId, 'projects:edit') && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(project);
                          setFormOpen(true);
                        }}
                        className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-left text-xs text-neutral-500 hover:border-white/20 hover:text-neutral-300"
                      >
                        Set the goals, like “2 songs released a week”
                      </button>
                    )
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    {project.effort && EFFORT_META[project.effort] && (
                      <span className="inline-flex items-center gap-1">
                        <Icon
                          name={EFFORT_META[project.effort].icon}
                          className="text-[14px]"
                        />
                        {EFFORT_META[project.effort].label}
                      </span>
                    )}
                    <span>
                      {project.progress.total - project.progress.done} open{' '}
                      {project.progress.total - project.progress.done === 1
                        ? 'task'
                        : 'tasks'}
                    </span>
                    {(project.standings ?? []).slice(0, 2).map((st) => (
                      <button
                        key={st.metric}
                        type="button"
                        onClick={() => setResultsFor(project)}
                        className="rounded-full bg-white/[0.06] px-2 py-0.5 text-neutral-300 hover:bg-white/[0.1]"
                      >
                        #{st.rank} {metricLabel(st.metric)} ·{' '}
                        {formatMetric(st.metric, st.value)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      {team.length > 0 && <AvatarStack users={team} />}
                    </div>
                    <div className="flex items-center">
                      <IconAction
                        icon="checklist"
                        label="Open tasks"
                        onClick={() => onOpenTasks(project.id)}
                      />
                      <IconAction
                        icon="event_repeat"
                        label="Scheduled tasks"
                        onClick={() => setSchedulesFor(project)}
                      />
                      <IconAction
                        icon="insights"
                        label="Results"
                        onClick={() => setResultsFor(project)}
                      />
                      {can(project.companyId, 'projects:edit') &&
                        !project.isCore &&
                        moveTargets.length > 0 && (
                          <IconAction
                            icon="drive_file_move"
                            label="Move to another company"
                            onClick={() => {
                              setMoveTo(moveTargets[0].company.id);
                              setMoving(project);
                            }}
                          />
                        )}
                      {can(project.companyId, 'projects:edit') && (
                        <IconAction
                          icon="palette"
                          label="Brand kit"
                          onClick={() => setBranding(project)}
                        />
                      )}
                      {can(project.companyId, 'projects:edit') && (
                        <IconAction
                          icon="edit"
                          label="Edit project"
                          onClick={() => {
                            setEditing(project);
                            setFormOpen(true);
                          }}
                        />
                      )}
                      {can(project.companyId, 'projects:delete') &&
                        !project.isCore && (
                          <IconAction
                            icon="archive"
                            label="Archive project"
                            tone="danger"
                            onClick={() => setArchiving(project)}
                          />
                        )}
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      )}

      {companyId && (
        <ProjectForm
          open={formOpen}
          onOpenChange={setFormOpen}
          companyId={companyId}
          project={editing}
          projects={projects}
          users={users}
          onSaved={load}
        />
      )}
      <ProjectResults
        project={projects.find((p) => p.id === resultsFor?.id) ?? resultsFor}
        canEdit={!!resultsFor && can(resultsFor.companyId, 'projects:edit')}
        onOpenChange={(open) => !open && setResultsFor(null)}
        onSaved={load}
      />
      <ProjectSchedules
        project={
          projects.find((p) => p.id === schedulesFor?.id) ?? schedulesFor
        }
        users={users}
        canEdit={canInProject(schedulesFor, 'tasks:create')}
        canDelete={canInProject(schedulesFor, 'tasks:delete')}
        onOpenChange={(open) => !open && setSchedulesFor(null)}
        onSaved={load}
      />
      <BrandKitEditor
        open={!!branding}
        onOpenChange={(open) => !open && setBranding(null)}
        name={branding?.name ?? 'Project'}
        endpoint={`/api/projects/${branding?.id}`}
        initial={branding?.brandKit}
        onSaved={load}
      />
      <AdminModal
        open={!!moving}
        onOpenChange={(open) => !open && setMoving(null)}
        size="sm"
        icon="drive_file_move"
        title={`Move ${moving?.name ?? 'project'}`}
        description="Its goals, tasks, scheduled tasks, results and sub-projects go with it."
        footer={
          <>
            <AdminButton tone="ghost" size="sm" onClick={() => setMoving(null)}>
              Cancel
            </AdminButton>
            <AdminButton tone="primary" size="sm" loading={busy} onClick={move}>
              Move
            </AdminButton>
          </>
        }
      >
        <Field label="To">
          <CompanyPicker
            companies={moveTargets}
            value={moveTo}
            onChange={setMoveTo}
          />
        </Field>
      </AdminModal>
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.name ?? 'project'}?`}
        message="It is hidden from the team. Its tasks and worklog links are kept."
        confirmLabel="Archive"
        loading={busy}
        onConfirm={archive}
      />
    </div>
  );
};
