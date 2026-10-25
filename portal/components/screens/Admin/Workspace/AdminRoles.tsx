'use client';

import type { CompanyRole } from '@db/client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  COMPANY_PERMISSION_RESOURCES,
  PERMISSION_RESOURCES,
  type ResourceDefinition,
} from '@/lib/permissions/catalog';
import { hasPermission } from '@/lib/permissions/matching';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  CheckBox,
  ConfirmDialog,
  EmptyState,
  Field,
  IconAction,
  Panel,
  PanelHeader,
  Pill,
  Segmented,
  SkeletonRows,
  TextInput,
} from '../shared/AdminUI';
import { CompanyPicker, errorText, NeedsCompany } from './shared';

const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  create: 'Add',
  edit: 'Edit',
  delete: 'Remove',
  grant: 'Give',
  revoke: 'Take away',
};

type Scope = 'portal' | 'company';

/** Portal and company roles share one shape. */
type AnyRole = Pick<
  CompanyRole,
  'id' | 'key' | 'name' | 'description' | 'permissions' | 'isSystem'
> & { memberCount?: number };

/** A grid of resources × actions; one click toggles one permission. */
const PermissionGrid = ({
  resources,
  value,
  onChange,
  readOnly,
  canGrant,
}: {
  resources: ResourceDefinition[];
  value: string[];
  onChange: (permissions: string[]) => void;
  readOnly?: boolean;
  canGrant: (permission: string) => boolean;
}) => {
  const toggle = (permission: string) => {
    if (readOnly || !canGrant(permission)) return;
    onChange(
      value.includes(permission)
        ? value.filter((p) => p !== permission)
        : [...value, permission],
    );
  };

  return (
    <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
      {resources.map((resource) => (
        <div
          key={resource.key}
          className="flex flex-wrap items-center gap-3 px-4 py-3"
        >
          <div className="min-w-[140px] flex-1">
            <p className="text-sm text-neutral-200">{resource.label}</p>
            {resource.scope === 'company' && resources.length > 5 && (
              <p className="text-[11px] text-neutral-600">In every company</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {resource.actions.map((action) => {
              const permission = `${resource.key}:${action}`;
              const checked = hasPermission(value, permission);
              const allowed = !readOnly && canGrant(permission);
              return (
                <button
                  type="button"
                  key={permission}
                  onClick={() => toggle(permission)}
                  disabled={!allowed}
                  title={
                    allowed ? undefined : 'You can only grant access you have'
                  }
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    checked
                      ? 'border-white/25 bg-white/[0.08] text-white'
                      : 'border-white/[0.07] text-neutral-500 hover:text-neutral-300',
                    !allowed && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <CheckBox checked={checked} size="sm" />
                  {ACTION_LABELS[action] ?? action}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminRoles = ({
  selectedCompanyId,
  onSelectCompany,
}: {
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
}) => {
  const { companies, can, canPortal } = useWorkspace();
  const portalAllowed = canPortal('permissions:read');
  const [scope, setScope] = useState<Scope>('company');
  const [roles, setRoles] = useState<AnyRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<AnyRole | null>(null);

  // People who only manage portal roles start on the portal side.
  useEffect(() => {
    if (portalAllowed && companies.length === 0) setScope('portal');
  }, [portalAllowed, companies.length]);

  const isPortal = scope === 'portal';
  const companyId = selectedCompanyId;
  const base = isPortal ? '/api/roles' : `/api/companies/${companyId}/roles`;
  const myPermissions =
    companies.find((c) => c.company.id === companyId)?.permissions ?? [];
  const canGrant = (permission: string) =>
    isPortal ? canPortal(permission) : hasPermission(myPermissions, permission);
  const allowed = {
    create: isPortal
      ? canPortal('permissions:grant')
      : !!companyId && can(companyId, 'roles:create'),
    edit: isPortal
      ? canPortal('permissions:grant')
      : !!companyId && can(companyId, 'roles:edit'),
    remove: isPortal
      ? canPortal('permissions:revoke')
      : !!companyId && can(companyId, 'roles:delete'),
  };
  const ready = isPortal || !!companyId;

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const res = await PortalSdk.getData(base, null);
      const list: AnyRole[] = res?.data?.roles ?? [];
      setRoles(list);
      setActiveKey((key) =>
        list.some((r) => r.key === key) ? key : (list[0]?.key ?? null),
      );
    } catch (err) {
      toast.error(errorText(err, 'Could not load roles.'));
    } finally {
      setLoading(false);
    }
  }, [base, ready]);

  useEffect(() => {
    setRoles([]);
    load();
  }, [load]);

  const active = roles.find((r) => r.key === activeKey) ?? null;
  useEffect(() => {
    setDraft(active?.permissions ?? []);
  }, [active]);

  const isDirty =
    !!active &&
    (draft.length !== active.permissions.length ||
      draft.some((p) => !active.permissions.includes(p)));
  const isOwner = !isPortal && active?.key === 'owner';
  const readOnly = !ready || !allowed.edit || isOwner;

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await PortalSdk.patchData(`${base}/${active.id}`, {
        permissions: draft,
      });
      toast.success(`${active.name} updated`);
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await PortalSdk.postData(base, {
        name: newName,
        permissions: isPortal
          ? []
          : ['companies:read', 'projects:read', 'tasks:read'].filter(canGrant),
      });
      toast.success('Role created');
      setCreating(false);
      setNewName('');
      await load();
      setActiveKey(res?.data?.role?.key ?? null);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await PortalSdk.deleteData(`${base}/${deleting.id}`, {});
      toast.success('Role deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {portalAllowed && (
          <Segmented<Scope>
            value={scope}
            onChange={setScope}
            options={[
              { value: 'company', label: 'Company roles', icon: 'domain' },
              { value: 'portal', label: 'Portal roles', icon: 'public' },
            ]}
          />
        )}
        {!isPortal && (
          <CompanyPicker
            companies={companies}
            value={companyId}
            onChange={onSelectCompany}
          />
        )}
        <div className="flex-1" />
        {ready && allowed.create && (
          <AdminButton
            tone="primary"
            icon="add"
            onClick={() => setCreating(true)}
          >
            New role
          </AdminButton>
        )}
      </div>

      {isPortal && (
        <p className="-mt-2 text-xs text-neutral-500">
          Portal roles apply everywhere. Give one to a person from their page in
          Users. Everyone can already write worklogs and see their companies.
        </p>
      )}

      {!ready ? (
        <NeedsCompany text="Choose a company to manage its roles." />
      ) : loading && !roles.length ? (
        <SkeletonRows rows={4} />
      ) : roles.length === 0 ? (
        <Panel>
          <EmptyState icon="badge" title="No roles" />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Panel className="h-fit p-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveKey(role.key)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                  role.key === activeKey
                    ? 'bg-white/[0.09] text-white'
                    : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200',
                )}
              >
                <span className="truncate">{role.name}</span>
                <span className="flex items-center gap-1.5">
                  {typeof role.memberCount === 'number' && (
                    <span className="text-[11px] text-neutral-600">
                      {role.memberCount}
                    </span>
                  )}
                  {role.isSystem && <Pill>Built-in</Pill>}
                </span>
              </button>
            ))}
          </Panel>

          {active && (
            <Panel>
              <PanelHeader
                icon="badge"
                title={active.name}
                description={
                  isOwner
                    ? 'Owners always have full access to the company.'
                    : active.description || undefined
                }
                actions={
                  <>
                    {!active.isSystem && allowed.remove && (
                      <IconAction
                        icon="delete"
                        label="Delete role"
                        tone="danger"
                        onClick={() => setDeleting(active)}
                      />
                    )}
                    {!readOnly && (
                      <AdminButton
                        size="sm"
                        tone="primary"
                        disabled={!isDirty}
                        loading={saving}
                        onClick={save}
                      >
                        Save
                      </AdminButton>
                    )}
                  </>
                }
              />
              <div className="p-4">
                <PermissionGrid
                  resources={
                    isPortal
                      ? PERMISSION_RESOURCES
                      : COMPANY_PERMISSION_RESOURCES
                  }
                  value={draft}
                  onChange={setDraft}
                  readOnly={readOnly}
                  canGrant={canGrant}
                />
              </div>
            </Panel>
          )}
        </div>
      )}
      <AdminModal
        open={creating}
        onOpenChange={setCreating}
        icon="badge"
        title="New role"
        size="sm"
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setCreating(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              loading={saving}
              disabled={!newName.trim()}
              onClick={create}
            >
              Create
            </AdminButton>
          </>
        }
      >
        <Field label="Name" hint="You can pick its permissions next.">
          <TextInput
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Designer"
          />
        </Field>
      </AdminModal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete the ${deleting?.name ?? ''} role?`}
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
};
