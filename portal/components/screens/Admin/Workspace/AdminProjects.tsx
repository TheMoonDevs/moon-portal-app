'use client';

import type { Project, User } from '@db/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  CardSkeletons,
  ConfirmDialog,
  DateInput,
  EmptyState,
  Field,
  formatDate,
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
import {
  AvatarStack,
  ColorPicker,
  CompanyMark,
  CompanyPicker,
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
};

const emptyDraft = {
  name: '',
  description: '',
  status: 'ACTIVE',
  color: '#0ea5e9',
  logo: '',
  startDate: '',
  dueDate: '',
  leadIds: [] as string[],
  memberIds: [] as string[],
};

const ProjectForm = ({
  open,
  onOpenChange,
  companyId,
  project,
  users,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  project: ProjectRow | null;
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
            startDate: project.startDate ?? '',
            dueDate: project.dueDate ?? '',
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

  const save = async () => {
    if (!draft.name.trim()) return toast.error('Give the project a name.');
    setSaving(true);
    try {
      const payload = {
        ...draft,
        logo: draft.logo || null,
        startDate: draft.startDate || null,
        dueDate: draft.dueDate || null,
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
        <Field label="Start date">
          <DateInput
            value={draft.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="Due date">
          <DateInput
            value={draft.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
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
  const { companies, can } = useWorkspace();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archiving, setArchiving] = useState<ProjectRow | null>(null);
  const [branding, setBranding] = useState<ProjectRow | null>(null);
  const [busy, setBusy] = useState(false);

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
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => {
            const meta =
              PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.ACTIVE;
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
                    <p className="line-clamp-2 text-xs text-neutral-500">
                      {project.description || 'No description'}
                    </p>
                  </div>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-400">
                    <span>
                      {project.progress.done}/{project.progress.total} tasks
                      {project.progress.major > 0 &&
                        ` · ${project.progress.majorDone}/${project.progress.major} major`}
                    </span>
                    <span className="font-semibold text-neutral-200">
                      {project.progress.percent}%
                    </span>
                  </div>
                  <ProgressBar
                    percent={project.progress.percent}
                    color={project.color}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    {team.length > 0 && <AvatarStack users={team} />}
                    {project.dueDate && (
                      <span className="flex items-center gap-1">
                        <Icon name="event" className="text-[14px]" />
                        {formatDate(project.dueDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <IconAction
                      icon="checklist"
                      label="Open tasks"
                      onClick={() => onOpenTasks(project.id)}
                    />
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
                    {can(project.companyId, 'projects:delete') && (
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
      )}

      {companyId && (
        <ProjectForm
          open={formOpen}
          onOpenChange={setFormOpen}
          companyId={companyId}
          project={editing}
          users={users}
          onSaved={load}
        />
      )}
      <BrandKitEditor
        open={!!branding}
        onOpenChange={(open) => !open && setBranding(null)}
        name={branding?.name ?? 'Project'}
        endpoint={`/api/projects/${branding?.id}`}
        initial={branding?.brandKit}
        onSaved={load}
      />
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
