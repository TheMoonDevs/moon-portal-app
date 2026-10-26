'use client';

import type { CompanyMember, CompanyRole, User } from '@db/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  EmptyState,
  Field,
  formatDate,
  IconAction,
  NativeSelect,
  Panel,
  PanelHeader,
  Pill,
  SkeletonRows,
  TextArea,
  TextInput,
  UserAvatar,
} from '../shared/AdminUI';
import { ImageField } from '../shared/ImageField';
import { BrandKitEditor, BrandKitSummary } from './BrandKitEditor';
import { ColorPicker, CompanyMark, errorText, PeoplePicker } from './shared';

type MemberRow = CompanyMember & {
  user: Pick<User, 'id' | 'name' | 'avatar' | 'email' | 'status'> | null;
};

/* -------------------------------------------------------------------------- */
/*                               Company form                                 */
/* -------------------------------------------------------------------------- */

const CompanyForm = ({
  open,
  onOpenChange,
  initial,
  users,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    logo?: string | null;
  };
  users: User[];
  onSaved: (companyId: string) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>('#6366f1');
  const [logo, setLogo] = useState('');
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setColor(initial?.color ?? '#6366f1');
    setLogo(initial?.logo ?? '');
    setOwnerIds([]);
  }, [open, initial]);

  const save = async () => {
    if (!name.trim()) return toast.error('Give the company a name.');
    setSaving(true);
    try {
      const payload = { name, description, color, logo: logo || null };
      const res = initial
        ? await PortalSdk.patchData(`/api/companies/${initial.id}`, payload)
        : await PortalSdk.postData('/api/companies', {
            ...payload,
            ownerId: ownerIds[0],
          });
      toast.success(initial ? 'Company updated' : 'Company created');
      onSaved(res?.data?.company?.id ?? initial?.id);
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
      icon="domain_add"
      title={initial ? 'Edit company' : 'New company'}
      description={
        initial
          ? undefined
          : 'Only you can create companies. Default roles are added for you.'
      }
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
            {initial ? 'Save' : 'Create company'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" required>
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Studios"
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this company do?"
          />
        </Field>
        <Field label="Logo" hint="Optional. A square image works best.">
          <ImageField value={logo} onChange={setLogo} />
        </Field>
        <Field label="Color">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        {!initial && (
          <Field label="Owner" hint="You are added as an owner too.">
            <PeoplePicker
              users={users}
              value={ownerIds}
              onChange={setOwnerIds}
              max={1}
            />
          </Field>
        )}
      </div>
    </AdminModal>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 Members                                    */
/* -------------------------------------------------------------------------- */

const CompanyMembers = ({
  companyId,
  users,
}: {
  companyId: string;
  users: User[];
}) => {
  const { can, refresh } = useWorkspace();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('member');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([
        PortalSdk.getData(`/api/companies/${companyId}/members`, null),
        can(companyId, 'roles:read')
          ? PortalSdk.getData(`/api/companies/${companyId}/roles`, null)
          : Promise.resolve({ data: { roles: [] } }),
      ]);
      setMembers(m?.data?.members ?? []);
      setRoles(r?.data?.roles ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load members.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, can]);

  useEffect(() => {
    load();
  }, [load]);

  const memberIds = new Set(members.map((m) => m.userId));
  // Inactive people stay members but are hidden unless asked for.
  const isInactive = (m: MemberRow) =>
    !!m.user?.status && m.user.status !== 'ACTIVE';
  const inactiveCount = members.filter(isInactive).length;
  const shownMembers = showInactive
    ? members
    : members.filter((m) => !isInactive(m));
  const candidates = users.filter((u) => !memberIds.has(u.id));
  const roleName = (key: string) =>
    roles.find((r) => r.key === key)?.name ?? key;

  const addMembers = async () => {
    if (!newIds.length) return;
    setBusyId('add');
    try {
      for (const userId of newIds) {
        await PortalSdk.postData(`/api/companies/${companyId}/members`, {
          userId,
          roleKeys: [newRole],
        });
      }
      toast.success(newIds.length > 1 ? 'Members added' : 'Member added');
      setNewIds([]);
      setAdding(false);
      await load();
      refresh();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (member: MemberRow, roleKey: string) => {
    setBusyId(member.id);
    try {
      await PortalSdk.patchData(
        `/api/companies/${companyId}/members/${member.id}`,
        { roleKeys: [roleKey] },
      );
      toast.success('Role updated');
      await load();
      refresh();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async () => {
    if (!removing) return;
    setBusyId(removing.id);
    try {
      await PortalSdk.deleteData(
        `/api/companies/${companyId}/members/${removing.id}`,
        {},
      );
      toast.success('Member removed');
      setRemoving(null);
      await load();
      refresh();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel>
      <PanelHeader
        icon="group"
        title="Members"
        description={`${members.length - inactiveCount} ${members.length - inactiveCount === 1 ? 'person' : 'people'}`}
        actions={
          can(companyId, 'members:create') && (
            <AdminButton
              size="sm"
              icon="person_add"
              onClick={() => setAdding(true)}
            >
              Add people
            </AdminButton>
          )
        }
      />
      {loading ? (
        <SkeletonRows rows={3} />
      ) : members.length === 0 ? (
        <EmptyState
          icon="group_off"
          title="No members yet"
          description="Add the people who work for this company."
        />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {shownMembers.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 px-5 py-3"
            >
              <UserAvatar
                src={member.user?.avatar}
                name={member.user?.name}
                size={34}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-100">
                  {member.user?.name || 'Unknown user'}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {member.user?.email} · joined{' '}
                  {formatDate(member.joinedAt as string)}
                </p>
              </div>
              {can(companyId, 'members:edit') && roles.length > 0 ? (
                <NativeSelect
                  aria-label="Role"
                  className="h-8 w-36 text-xs"
                  value={member.roleKeys?.[0] ?? ''}
                  disabled={busyId === member.id}
                  onChange={(e) => changeRole(member, e.target.value)}
                >
                  {roles.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.name}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <div className="flex gap-1">
                  {(member.roleKeys ?? []).map((key) => (
                    <Pill
                      key={key}
                      tone={key === 'owner' ? 'purple' : 'neutral'}
                    >
                      {roleName(key)}
                    </Pill>
                  ))}
                </div>
              )}
              {can(companyId, 'members:delete') && (
                <IconAction
                  icon="person_remove"
                  label="Remove from company"
                  tone="danger"
                  loading={busyId === member.id}
                  onClick={() => setRemoving(member)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {inactiveCount > 0 && (
        <button
          type="button"
          onClick={() => setShowInactive((v) => !v)}
          className="w-full border-t border-white/[0.05] px-5 py-2.5 text-left text-xs text-neutral-500 hover:text-neutral-300"
        >
          {showInactive
            ? 'Hide inactive people'
            : `Show ${inactiveCount} inactive ${inactiveCount === 1 ? 'person' : 'people'}`}
        </button>
      )}

      <AdminModal
        open={adding}
        onOpenChange={setAdding}
        icon="person_add"
        title="Add people"
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setAdding(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              loading={busyId === 'add'}
              disabled={!newIds.length}
              onClick={addMembers}
            >
              Add {newIds.length || ''}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {roles.length > 0 && (
            <Field label="Role">
              <NativeSelect
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {roles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field label="People">
            <PeoplePicker
              users={candidates}
              value={newIds}
              onChange={setNewIds}
            />
          </Field>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.user?.name ?? 'this person'}?`}
        description="They lose access to this company’s projects and tasks. Their worklogs stay."
        message="You can add them back at any time."
        confirmLabel="Remove"
        loading={!!removing && busyId === removing.id}
        onConfirm={removeMember}
      />
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 Companies                                  */
/* -------------------------------------------------------------------------- */

export const AdminCompanies = ({
  users,
  selectedCompanyId,
  onSelectCompany,
}: {
  users: User[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
}) => {
  const { companies, loading, isSuperAdmin, can, refresh } = useWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => companies.find((c) => c.company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const archive = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await PortalSdk.deleteData(`/api/companies/${selected.company.id}`, {});
      toast.success('Company archived');
      setArchiving(false);
      await refresh();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          {companies.length} {companies.length === 1 ? 'company' : 'companies'}
        </p>
        {isSuperAdmin && (
          <AdminButton
            tone="primary"
            icon="add"
            onClick={() => setFormOpen(true)}
          >
            New company
          </AdminButton>
        )}
      </div>

      {!loading && companies.length === 0 ? (
        <Panel>
          <EmptyState
            icon="domain"
            title="No companies yet"
            description={
              isSuperAdmin
                ? 'Create the first company to start adding people and projects.'
                : 'You are not part of any company yet.'
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {companies.map(({ company, member }) => (
            <button
              key={company.id}
              onClick={() => onSelectCompany(company.id)}
              className={cn(
                'flex items-start gap-3 rounded-2xl border bg-neutral-900/40 p-4 text-left transition-colors hover:border-white/20',
                company.id === selectedCompanyId
                  ? 'border-white/30'
                  : 'border-white/[0.07]',
              )}
            >
              <CompanyMark
                name={company.name}
                color={company.color}
                logo={company.logo}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {company.name}
                </p>
                <p className="line-clamp-2 text-xs text-neutral-500">
                  {company.description || 'No description'}
                </p>
                {member && (
                  <Pill
                    className="mt-2"
                    tone={
                      member.roleKeys?.includes('owner') ? 'purple' : 'neutral'
                    }
                  >
                    {member.roleKeys?.join(', ')}
                  </Pill>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              title={
                <span className="flex items-center gap-2">
                  <CompanyMark
                    name={selected.company.name}
                    color={selected.company.color}
                    logo={selected.company.logo}
                    size={22}
                  />
                  {selected.company.name}
                </span>
              }
              description={`Created ${formatDate(selected.company.createdAt as string)}`}
              actions={
                <>
                  {can(selected.company.id, 'companies:edit') && (
                    <AdminButton
                      size="sm"
                      icon="edit"
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </AdminButton>
                  )}
                  {isSuperAdmin && (
                    <AdminButton
                      size="sm"
                      tone="danger"
                      icon="archive"
                      onClick={() => setArchiving(true)}
                    >
                      Archive
                    </AdminButton>
                  )}
                </>
              }
            />
            {selected.company.description && (
              <p className="px-5 py-4 text-sm text-neutral-400">
                {selected.company.description}
              </p>
            )}
            {can(selected.company.id, 'companies:edit') && (
              <BrandKitSummary
                kit={selected.company.brandKit}
                onOpen={() => setBrandOpen(true)}
              />
            )}
          </Panel>
          {can(selected.company.id, 'members:read') && (
            <CompanyMembers companyId={selected.company.id} users={users} />
          )}
        </div>
      )}

      <CompanyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        users={users}
        onSaved={async (id) => {
          await refresh();
          if (id) onSelectCompany(id);
        }}
      />
      <CompanyForm
        open={editing}
        onOpenChange={setEditing}
        users={users}
        initial={selected?.company}
        onSaved={() => refresh()}
      />
      {selected && (
        <BrandKitEditor
          open={brandOpen}
          onOpenChange={setBrandOpen}
          name={selected.company.name}
          endpoint={`/api/companies/${selected.company.id}`}
          initial={selected.company.brandKit}
          onSaved={() => refresh()}
        />
      )}
      <ConfirmDialog
        open={archiving}
        onOpenChange={setArchiving}
        title={`Archive ${selected?.company.name ?? 'company'}?`}
        description="It disappears from everyone’s workspace."
        message="Its people, projects and tasks are kept, so it can be restored later."
        confirmLabel="Archive"
        loading={busy}
        onConfirm={archive}
      />
    </div>
  );
};
