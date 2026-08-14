'use client';

import type { User } from '@db/client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ResourceDefinition } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  CheckBox,
  EmptyState,
  Icon,
  Panel,
  PanelHeader,
  Pill,
  SearchInput,
  SkeletonRows,
} from '../shared/AdminUI';

interface AdminUserPermissionsProps {
  user: User;
}

interface CatalogData {
  wildcard: string;
  resources: ResourceDefinition[];
  allPermissions: string[];
}

/**
 * Admin panel for viewing and editing the access policies granted to a user.
 * Enforcement happens server-side; a checked box means the permission is in
 * effect. Boxes carrying a "default" badge come from the user's role and can be
 * unchecked to REMOVE (deny) them. For an admin every box starts checked;
 * unchecking one disables that capability for them.
 */
export const AdminUserPermissions = ({ user }: AdminUserPermissionsProps) => {
  const userId = user?.id ?? '';
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  // The set of permissions currently switched ON (the desired effective set).
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Baseline = what the user's role (or admin status) grants before overrides.
  const [baseline, setBaseline] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState<boolean>(!!user?.isAdmin);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      PortalSdk.getData('/api/permissions/catalog', null),
      PortalSdk.getData(`/api/user/permissions?userId=${userId}`, null),
    ])
      .then(([catalogRes, permsRes]) => {
        if (cancelled) return;
        setCatalog(catalogRes?.data ?? null);
        setChecked(new Set<string>(permsRes?.data?.effective ?? []));
        setBaseline(new Set<string>(permsRes?.data?.baseline ?? []));
        setIsAdmin(!!permsRes?.data?.isAdmin);
      })
      .catch((err) => {
        console.error('Failed to load permissions', err);
        toast.error('Failed to load permissions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = (permission: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  const toggleResourceAll = (resource: ResourceDefinition, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      resource.actions.forEach((action) => {
        const p = `${resource.key}:${action}`;
        if (on) next.add(p);
        else next.delete(p);
      });
      return next;
    });
  };

  const save = () => {
    if (!userId) return;
    setSaving(true);
    PortalSdk.putData('/api/user/permissions', {
      userId,
      effective: Array.from(checked),
    })
      .then((res) => {
        setChecked(new Set<string>(res?.data?.effective ?? []));
        setBaseline(new Set<string>(res?.data?.baseline ?? []));
        setIsAdmin(!!res?.data?.isAdmin);
        toast.success('Policies updated');
      })
      .catch((err) => {
        console.error('Failed to save permissions', err);
        toast.error(
          typeof err?.message === 'string'
            ? err.message
            : 'Failed to save policies',
        );
      })
      .finally(() => setSaving(false));
  };

  // Denials = baseline permissions the admin has switched off.
  const deniedList = useMemo(
    () =>
      Array.from(baseline)
        .filter((p) => !checked.has(p))
        .sort(),
    [baseline, checked],
  );
  // Extra grants = on permissions that are not part of the baseline.
  const grantList = useMemo(
    () =>
      Array.from(checked)
        .filter((p) => !baseline.has(p))
        .sort(),
    [checked, baseline],
  );

  const visibleResources = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!catalog) return [];
    if (!term) return catalog.resources;
    return catalog.resources.filter((resource) =>
      [resource.key, resource.label, resource.description, ...resource.actions]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [catalog, search]);

  if (!userId) {
    return (
      <Panel>
        <EmptyState
          icon="lock"
          title="Save this user first"
          description="Access policies can be granted once the account exists."
        />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          title="Access & policies"
          description="A checked box means the permission is in effect."
          icon="lock"
          actions={
            <AdminButton
              size="sm"
              tone="primary"
              icon="check"
              onClick={save}
              loading={saving}
              disabled={loading}
            >
              Save policies
            </AdminButton>
          }
        />

        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search resources or actions…"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <Pill tone="positive" icon="check">
              {checked.size} in effect
            </Pill>
            {grantList.length > 0 && (
              <Pill tone="info">{grantList.length} extra</Pill>
            )}
            {deniedList.length > 0 && (
              <Pill tone="danger">{deniedList.length} denied</Pill>
            )}
            <span>
              Boxes tagged{' '}
              <span className="rounded bg-white/10 px-1 text-[10px] uppercase text-neutral-300">
                default
              </span>{' '}
              come from the role — uncheck one to remove it.
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-start gap-2 border-b border-white/[0.07] bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-200">
            <Icon name="shield_person" className="text-[18px]" />
            This user is a full admin, so every permission is on by default.
            Uncheck any box to disable that specific capability for them.
          </div>
        )}

        {loading ? (
          <SkeletonRows rows={4} />
        ) : !catalog ? (
          <EmptyState
            icon="error"
            title="No catalog available"
            description="The permission catalog could not be loaded."
          />
        ) : visibleResources.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="No resources match your search"
            description="Try another resource or action name."
          />
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {visibleResources.map((resource) => {
              const allOn = resource.actions.every((action) =>
                checked.has(`${resource.key}:${action}`),
              );
              return (
                <div
                  key={resource.key}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                        {resource.label}
                        <span className="font-mono text-[11px] text-neutral-600">
                          {resource.key}
                        </span>
                      </h3>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {resource.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleResourceAll(resource, !allOn)}
                      className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-neutral-100"
                    >
                      <CheckBox checked={allOn} size="sm" />
                      All
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {resource.actions.map((action) => {
                      const permission = `${resource.key}:${action}`;
                      const isOn = checked.has(permission);
                      const isBaseline = baseline.has(permission);
                      // A baseline permission switched off = an explicit denial.
                      const isDenied = isBaseline && !isOn;
                      return (
                        <button
                          key={permission}
                          type="button"
                          onClick={() => toggle(permission)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                            isOn
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                              : isDenied
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                                : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-neutral-100',
                          )}
                        >
                          <CheckBox checked={isOn} size="sm" />
                          <span className="font-mono">{action}</span>
                          {isBaseline && !isAdmin && (
                            <span
                              title="Granted by the user's role"
                              className="rounded bg-white/10 px-1 text-[10px] uppercase text-neutral-300"
                            >
                              default
                            </span>
                          )}
                          {isDenied && (
                            <span
                              title="This default is being removed"
                              className="rounded bg-rose-500/25 px-1 text-[10px] uppercase text-rose-100"
                            >
                              denied
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {(grantList.length > 0 || deniedList.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {grantList.length > 0 && (
            <Panel>
              <PanelHeader
                title="Extra grants"
                description="Permissions beyond what the role provides."
                icon="add_circle"
              />
              <div className="flex flex-wrap gap-1.5 p-4">
                {grantList.map((permission) => (
                  <code
                    key={permission}
                    className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs text-emerald-200"
                  >
                    {permission}
                  </code>
                ))}
              </div>
            </Panel>
          )}
          {deniedList.length > 0 && (
            <Panel>
              <PanelHeader
                title="Removed / denied"
                description="Role defaults switched off for this user."
                icon="do_not_disturb_on"
              />
              <div className="flex flex-wrap gap-1.5 p-4">
                {deniedList.map((permission) => (
                  <code
                    key={permission}
                    className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-xs text-rose-200"
                  >
                    {permission}
                  </code>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUserPermissions;
