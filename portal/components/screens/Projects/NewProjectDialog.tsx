'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { leadsAbove } from '@/lib/workspace/projectProgress';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Field,
  Icon,
  NativeSelect,
  TextArea,
  TextInput,
} from '../Admin/shared/AdminUI';
import { ColorPicker, errorText } from '../Admin/Workspace/shared';

export type TreeProject = {
  id: string;
  companyId: string;
  name: string;
  parentId?: string | null;
  leadIds?: string[] | null;
};

/** What happened: the project was made, or a request was sent. */
export type NewProjectResult =
  | { kind: 'created'; projectId: string }
  | { kind: 'requested'; requestId: string };

/**
 * Starts a project, or a sub-project under `parentId`. Company owners and
 * leads of the parent (or a project above it) create it at once; for
 * anyone else it goes to them as a request, and the dialog says so before
 * it is sent.
 */
export const NewProjectDialog = ({
  open,
  onOpenChange,
  projects,
  companyId: initialCompany,
  parentId: initialParent = null,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Projects to pick a parent from, across the companies offered. */
  projects: TreeProject[];
  companyId?: string | null;
  parentId?: string | null;
  onDone: (result: NewProjectResult) => void;
}) => {
  const { user } = useUser();
  const { companies, can } = useWorkspace();
  const offered = companies.filter((c) => can(c.company.id, 'projects:create'));
  const [companyId, setCompanyId] = useState('');
  const [parentId, setParentId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState('#0ea5e9');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const parent = projects.find((p) => p.id === initialParent);
    setCompanyId(
      parent?.companyId ?? initialCompany ?? offered[0]?.company.id ?? '',
    );
    setParentId(parent?.id ?? '');
    setName('');
    setDescription('');
    setNote('');
    setColor('#0ea5e9');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialParent, initialCompany]);

  const inCompany = useMemo(
    () => projects.filter((p) => p.companyId === companyId),
    [projects, companyId],
  );
  const parent = inCompany.find((p) => p.id === parentId) ?? null;
  const direct =
    can(companyId, 'projects:approve') ||
    (!!user && !!parent && leadsAbove(inCompany, parent.id).has(user.id));
  const companyName =
    offered.find((c) => c.company.id === companyId)?.company.name ?? '';

  const save = async () => {
    if (!name.trim()) return toast.error('Give the project a name.');
    setSaving(true);
    try {
      const res = await PortalSdk.postData('/api/projects', {
        companyId,
        name: name.trim(),
        description: description.trim() || null,
        color,
        parentId: parentId || null,
        note: note.trim() || null,
      });
      if (res?.data?.project) {
        toast.success(parent ? 'Sub-project created' : 'Project created');
        onDone({ kind: 'created', projectId: res.data.project.id });
      } else {
        toast.success('Request sent');
        onDone({ kind: 'requested', requestId: res?.data?.request?.id });
      }
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
      icon={parent ? 'account_tree' : 'create_new_folder'}
      title={parent ? `New sub-project of ${parent.name}` : 'New project'}
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton
            tone="primary"
            size="sm"
            icon={direct ? 'add' : 'send'}
            loading={saving}
            onClick={save}
          >
            {direct ? 'Create' : 'Send request'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className={
            direct
              ? 'flex items-start gap-2.5 rounded-xl bg-emerald-400/[0.07] px-3 py-2.5 text-xs text-emerald-200/90'
              : 'flex items-start gap-2.5 rounded-xl bg-amber-300/[0.08] px-3 py-2.5 text-xs text-amber-100/90'
          }
        >
          <Icon
            name={direct ? 'check_circle' : 'hourglass_top'}
            className="mt-px text-[16px]"
          />
          <span>
            {direct
              ? parent && !can(companyId, 'projects:approve')
                ? `You lead ${parent.name}, so this is created right away.`
                : 'This is created right away, with you as its lead.'
              : parent
                ? `This goes to the owners of ${companyName} and the leads of ${parent.name} to approve. Once approved, you lead it.`
                : `This goes to the owners of ${companyName} to approve. Once approved, you lead it.`}
          </span>
        </div>

        {offered.length > 1 && !initialParent && (
          <Field label="Company">
            <NativeSelect
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setParentId('');
              }}
            >
              {offered.map((c) => (
                <option key={c.company.id} value={c.company.id}>
                  {c.company.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field label="Name" required>
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={parent ? 'Lyrics videos' : 'Music channel'}
          />
        </Field>
        <Field
          label="Part of"
          hint="Optional. Leads of the project above can add sub-projects without asking."
        >
          <NativeSelect
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Nothing, a top-level project</option>
            {inCompany.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What it is about"
          />
        </Field>
        {!direct && (
          <Field label="Why it's needed" hint="Shown to whoever approves it.">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="We post anime OSTs every week and they need their own goals."
            />
          </Field>
        )}
        <Field label="Color">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>
    </AdminModal>
  );
};
