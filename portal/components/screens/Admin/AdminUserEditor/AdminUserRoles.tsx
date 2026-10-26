'use client';

import type { Role } from '@db/client';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  CheckBox,
  EmptyState,
  Field,
  Panel,
  PanelHeader,
  SkeletonRows,
  ToggleSwitch,
} from '../shared/AdminUI';
import type { UserSectionProps } from './types';

/**
 * Portal roles and full admin. Changes are saved with the rest of the user.
 * Roles you could not hand out yourself are shown but locked.
 */
export const AdminUserRoles = ({
  user,
  setUser,
}: Pick<UserSectionProps, 'user' | 'setUser'>) => {
  const { user: me } = useUser();
  const { canPortal } = useWorkspace();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const canRead = canPortal('permissions:read');
  const canGrant = canPortal('permissions:grant');
  const isSelf = !!me?.id && me.id === user.id;

  useEffect(() => {
    if (!canRead) return;
    PortalSdk.getData('/api/roles', null)
      .then((res) => setRoles(res?.data?.roles ?? []))
      .catch(() => setRoles([]));
  }, [canRead]);

  if (!canRead) return null;

  const held = user.roleKeys ?? [];
  const toggle = (key: string) =>
    setUser((previous) => {
      const current = previous.roleKeys ?? [];
      return {
        ...previous,
        roleKeys: current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key],
      };
    });

  const locked = (role: Role) =>
    isSelf || !canGrant || (role.permissions ?? []).some((p) => !canPortal(p));

  return (
    <Panel>
      <PanelHeader
        title="Portal roles"
        description="What they can manage across the portal. Saved with the rest of the page."
        icon="badge"
      />
      <div className="flex flex-col gap-4 p-4">
        {isSelf && (
          <p className="text-xs text-amber-300">
            You cannot change your own access.
          </p>
        )}
        {!roles ? (
          <SkeletonRows rows={3} />
        ) : roles.length === 0 ? (
          <EmptyState icon="badge" title="No portal roles yet" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => {
              const on = held.includes(role.key);
              const disabled = locked(role);
              return (
                <button
                  key={role.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(role.key)}
                  title={
                    disabled && !isSelf
                      ? 'You can only give roles within your own access'
                      : undefined
                  }
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                    on
                      ? 'border-white/25 bg-white/[0.07]'
                      : 'border-white/[0.07] hover:border-white/15',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <CheckBox checked={on} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm text-neutral-100">
                      {role.name}
                    </span>
                    {role.description && (
                      <span className="block text-xs text-neutral-500">
                        {role.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {me?.isAdmin && !isSelf && (
          <Field label="Full admin">
            <ToggleSwitch
              checked={!!user.isAdmin}
              onChange={(value) =>
                setUser((previous) => ({ ...previous, isAdmin: value }))
              }
              label="Everything, everywhere"
              description="Admins can do anything except create companies."
            />
          </Field>
        )}
      </div>
    </Panel>
  );
};
