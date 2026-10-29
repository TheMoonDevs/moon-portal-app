'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { BrandKit } from '@/lib/brandKit';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Field,
  NativeSelect,
  TextArea,
  TextInput,
} from '../Admin/shared/AdminUI';
import { ImageField } from '../Admin/shared/ImageField';
import {
  BrandKitEditor,
  BrandKitSummary,
} from '../Admin/Workspace/BrandKitEditor';
import {
  BRAND_COLORS,
  EFFORT_META,
  errorText,
  PROJECT_STATUS_META,
} from '../Admin/Workspace/shared';
import type { ProjectData } from './types';

const draftOf = (project: ProjectData['project']) => ({
  name: project.name,
  description: project.description ?? '',
  aliases: (project.aliases ?? []).join(', '),
  status: project.status as string,
  color: project.color ?? '#0ea5e9',
  logo: project.logo ?? '',
  effort: (project.effort ?? 'MEDIUM') as string,
  parentId: project.parentId ?? '',
});

/**
 * The project's details (name, description, logo, color, status…) and its
 * brand kit, for anyone who may edit the project. Goals and people have
 * their own sections on the project page.
 */
export const ProjectDetailsDialog = ({
  open,
  onOpenChange,
  data,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProjectData;
  onSaved: () => void;
}) => {
  const { project } = data;
  const [draft, setDraft] = useState(() => draftOf(project));
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState(false);

  // Fill the form when it opens, not when the project reloads behind it
  // (saving the brand kit reloads it), so unsaved edits are kept.
  const latest = useRef(project);
  latest.current = project;
  useEffect(() => {
    if (open) setDraft(draftOf(latest.current));
  }, [open]);

  const set = <K extends keyof typeof draft>(key: K, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const kit = project.brandKit as BrandKit | null | undefined;

  // The usual colors, then the brand kit's own.
  const colors = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...BRAND_COLORS,
      ...(kit?.colors ?? []).map((c) => c.hex.slice(0, 7)),
      draft.color,
    ].filter((c) => {
      const key = c.toLowerCase();
      if (!c || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [kit, draft.color]);

  // A project cannot sit under itself or one of its own sub-projects.
  const parents = useMemo(() => {
    const tree = data.tree ?? [];
    const under = new Set([project.id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const p of tree)
        if (p.parentId && under.has(p.parentId) && !under.has(p.id)) {
          under.add(p.id);
          grew = true;
        }
    }
    return tree.filter(
      (p) => p.companyId === project.companyId && !under.has(p.id),
    );
  }, [data.tree, project.id, project.companyId]);

  const save = async () => {
    if (!draft.name.trim()) return toast.error('Give the project a name.');
    setSaving(true);
    try {
      await PortalSdk.patchData(`/api/projects/${project.id}`, {
        ...draft,
        aliases: draft.aliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        logo: draft.logo || null,
        parentId: draft.parentId || null,
      });
      toast.success('Project updated');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminModal
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        icon="tune"
        title="Project details"
        description="Changes show for everyone on the project."
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
              loading={saving}
              onClick={save}
            >
              Save
            </AdminButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" required className="md:col-span-2">
            <TextInput
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
            label="Short names"
            hint="Comma separated, e.g. AMZ. Tasks that use them land in this project."
            className="md:col-span-2"
          >
            <TextInput
              value={draft.aliases}
              onChange={(e) => set('aliases', e.target.value)}
              placeholder="AMZ"
            />
          </Field>
          <Field label="Logo" hint="Optional. A square image works best.">
            <ImageField
              value={draft.logo}
              onChange={(url) => set('logo', url)}
            />
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  onClick={() => set('color', color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'size-7 rounded-full border-2 transition-transform hover:scale-110',
                    draft.color.toLowerCase() === color.toLowerCase()
                      ? 'border-white'
                      : 'border-transparent',
                  )}
                />
              ))}
            </div>
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
            className="md:col-span-2"
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
          <div className="-mx-5 -mb-4 md:col-span-2">
            <BrandKitSummary kit={kit} onOpen={() => setBranding(true)} />
          </div>
        </div>
      </AdminModal>
      <BrandKitEditor
        open={branding}
        onOpenChange={setBranding}
        name={project.name}
        endpoint={`/api/projects/${project.id}`}
        initial={kit}
        onSaved={onSaved}
      />
    </>
  );
};
