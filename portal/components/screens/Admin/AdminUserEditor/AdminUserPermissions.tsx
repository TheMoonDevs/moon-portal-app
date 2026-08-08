'use client';

import type { User } from '@db/client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ResourceDefinition } from '@/lib/permissions';
import { PortalSdk } from '@/utils/services/PortalSdk';

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

  if (!userId) {
    return (
      <div className="w-full max-w-3xl rounded-lg bg-neutral-800 p-6 text-neutral-200">
        <h2 className="text-lg font-semibold text-white">Access & Policies</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Save this user first, then reopen this tab to grant access policies.
        </p>
      </div>
    );
  }

  return (
    <div className="flex size-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-lg bg-neutral-800 p-6 text-neutral-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Access &amp; Policies
          </h2>
          <p className="text-sm text-neutral-400">
            A checked box means the permission is in effect. Boxes tagged{' '}
            <span className="rounded bg-neutral-700 px-1 text-[10px] uppercase">
              default
            </span>{' '}
            come from the role — uncheck one to remove it.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {isAdmin && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          This user is a full admin, so every permission is on by default.
          Uncheck any box to disable that specific capability for them.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading policies…</p>
      ) : !catalog ? (
        <p className="text-sm text-neutral-400">No catalog available.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {catalog.resources.map((resource) => {
            const allOn = resource.actions.every((a) =>
              checked.has(`${resource.key}:${a}`),
            );
            return (
              <div
                key={resource.key}
                className="rounded-lg border border-neutral-700 bg-neutral-900/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">
                      {resource.label}{' '}
                      <span className="font-mono text-xs text-neutral-500">
                        {resource.key}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {resource.description}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={allOn}
                      onChange={(e) =>
                        toggleResourceAll(resource, e.target.checked)
                      }
                    />
                    All
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resource.actions.map((action) => {
                    const permission = `${resource.key}:${action}`;
                    const isOn = checked.has(permission);
                    const isBaseline = baseline.has(permission);
                    // A baseline permission switched off = an explicit denial.
                    const isDenied = isBaseline && !isOn;
                    return (
                      <label
                        key={permission}
                        className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
                          isOn
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : isDenied
                              ? 'border-red-500/60 bg-red-500/10 text-red-300'
                              : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => toggle(permission)}
                        />
                        <span className="font-mono text-xs">{action}</span>
                        {isBaseline && !isAdmin && (
                          <span
                            title="Granted by the user's role"
                            className="rounded bg-neutral-700 px-1 text-[10px] uppercase text-neutral-300"
                          >
                            default
                          </span>
                        )}
                        {isDenied && (
                          <span
                            title="This default is being removed"
                            className="rounded bg-red-500/30 px-1 text-[10px] uppercase text-red-200"
                          >
                            denied
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(grantList.length > 0 || deniedList.length > 0) && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {grantList.length > 0 && (
            <div className="rounded border border-neutral-700 bg-neutral-900/60 p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-emerald-400">
                Extra grants
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grantList.map((p) => (
                  <code
                    key={p}
                    className="rounded bg-neutral-700 px-1.5 py-0.5 font-mono text-xs text-neutral-200"
                  >
                    {p}
                  </code>
                ))}
              </div>
            </div>
          )}
          {deniedList.length > 0 && (
            <div className="rounded border border-red-500/40 bg-red-500/5 p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-red-400">
                Removed / denied
              </p>
              <div className="flex flex-wrap gap-1.5">
                {deniedList.map((p) => (
                  <code
                    key={p}
                    className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-xs text-red-200"
                  >
                    {p}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUserPermissions;
