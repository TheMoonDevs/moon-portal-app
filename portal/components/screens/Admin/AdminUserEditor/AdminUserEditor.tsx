'use client';

import type { User } from '@db/client';
import { USERSTATUS } from '@db/client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { isSuperAdminEmail } from '@/lib/permissions/superAdmin';
import { APP_ROUTES, TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { EditorTab } from '../shared/AdminEditorShell';
import { AdminEditorShell } from '../shared/AdminEditorShell';
import {
  AdminButton,
  ConfirmDialog,
  formatDate,
  Icon,
  Panel,
  Pill,
  SkeletonRows,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { AdminUserBasicData } from './AdminUserBasicData';
import { AdminUserPermissions } from './AdminUserPermissions';
import { AdminUserReach } from './AdminUserReach';
import { AdminUserRoles } from './AdminUserRoles';

const initialUserState: User = {
  id: '',
  name: '',
  username: '',
  code: '',
  email: '',
  linkedEmails: [],
  avatar: '',
  positionTitle: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  status: USERSTATUS.ACTIVE,
  isAdmin: false,
  roleKeys: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const TABS: EditorTab[] = [
  { id: 'basic', label: 'Profile', icon: 'person' },
  { id: 'access', label: 'Access', icon: 'lock' },
];

const statusTone = (status?: string | null) => {
  switch (status) {
    case 'ACTIVE':
      return 'positive' as const;
    case 'INACTIVE':
      return 'warning' as const;
    case 'BLOCKED':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
};

export const AdminUserEditor = () => {
  const router = useRouter();
  const query = useSearchParams();
  const userId = query?.get('id') ?? null;
  const { user: me } = useUser();
  const { canPortal } = useWorkspace();

  const [user, setUser] = useState<User>(initialUserState);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [fetching, setFetching] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* --------------------------------- loading -------------------------------- */

  useEffect(() => {
    if (!userId) {
      setUser(initialUserState);
      setSavedSnapshot(JSON.stringify(initialUserState));
      setFetching(false);
      return;
    }

    setFetching(true);
    PortalSdk.getData(`/api/user?id=${userId}`, null)
      .then(({ data }) => {
        if (data?.user?.length > 0) {
          setUser(data.user[0]);
          setSavedSnapshot(JSON.stringify(data.user[0]));
        } else {
          toast.error('We could not find that user');
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error('Failed to load the user');
      })
      .finally(() => setFetching(false));
  }, [userId]);

  const isDirty = useMemo(
    () => JSON.stringify(user) !== savedSnapshot,
    [user, savedSnapshot],
  );

  /* -------------------------------- mutations ------------------------------- */

  const updateField = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { id, value } = event.target;
      setUser((previous) => ({ ...previous, [id]: value }));
    },
    [],
  );

  const saveUser = useCallback(async () => {
    setSaving(true);
    try {
      // Plain fetch: PortalSdk.putData treats a 409 as the signed-in user's
      // own record, and this may be someone else.
      const res = await fetch('/api/user', {
        method: user.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify(user),
      }).then((r) => r.json());
      if (res?.latestUser) throw res;
      const saved = res?.data?.user;
      if (!saved) throw res;
      toast.success(user.id ? 'Saved' : 'User created and emailed their code');
      setUser(saved);
      setSavedSnapshot(JSON.stringify(saved));
      // Keep a freshly created user addressable if the page is reloaded.
      if (!userId && saved.id) {
        window.history.replaceState(
          null,
          '',
          `${APP_ROUTES.userEditor}?id=${saved.id}`,
        );
      }
    } catch (error: any) {
      if (error?.latestUser) {
        toast.warning('Someone else just saved this user. Reloaded it.');
        setUser(error.latestUser);
        setSavedSnapshot(JSON.stringify(error.latestUser));
      } else {
        toast.error(errorText(error));
      }
    } finally {
      setSaving(false);
    }
  }, [user, userId]);

  const deleteUser = useCallback(async () => {
    setDeleting(true);
    try {
      await PortalSdk.deleteData(`/api/user?id=${user.id}`, { id: user.id });
      toast.success(`${user.name || 'User'} deleted`);
      setSavedSnapshot(JSON.stringify(user));
      router.push(`${APP_ROUTES.admin}?tab=users`);
    } catch (error) {
      toast.error(errorText(error));
      setDeleting(false);
    }
  }, [user, router]);

  const canDelete =
    !!user.id &&
    canPortal('users:delete') &&
    user.id !== me?.id &&
    !isSuperAdminEmail(user.email) &&
    !(user.linkedEmails ?? []).some((e) => isSuperAdminEmail(e)) &&
    (!user.isAdmin || !!me?.isAdmin);

  /* Guard against losing edits on accidental navigation away. */
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  /* --------------------------------- render --------------------------------- */

  const sectionProps = { user, setUser, updateField };

  const renderSection = () => {
    if (fetching) {
      return (
        <Panel>
          <SkeletonRows rows={6} />
        </Panel>
      );
    }
    switch (activeTab) {
      case 'access':
        return (
          <div className="flex flex-col gap-4">
            <AdminUserRoles user={user} setUser={setUser} />
            <AdminUserReach user={user} />
            <AdminUserPermissions user={user} />
          </div>
        );
      default:
        return (
          <AdminUserBasicData
            {...sectionProps}
            onAvatarSaved={(avatar, updatedAt) => {
              // Saved on the server already: keep other unsaved edits.
              const patch = updatedAt ? { avatar, updatedAt } : { avatar };
              setUser((previous) => ({ ...previous, ...patch }));
              setSavedSnapshot((snapshot) =>
                snapshot
                  ? JSON.stringify({ ...JSON.parse(snapshot), ...patch })
                  : snapshot,
              );
            }}
          />
        );
    }
  };

  const isNew = !userId;

  return (
    <>
      <AdminEditorShell
        backHref={`${APP_ROUTES.admin}?tab=users`}
        backLabel="Users"
        title={isNew ? 'New user' : user.name || user.username || 'User'}
        description={
          isNew
            ? 'They get an email with their sign-in code.'
            : `@${user.username} · joined ${formatDate(user.createdAt)}`
        }
        media={
          !isNew && <UserAvatar src={user.avatar} name={user.name} size={48} />
        }
        meta={
          !isNew && (
            <>
              {user.status && (
                <Pill tone={statusTone(user.status)}>{user.status}</Pill>
              )}
              {(user.roleKeys ?? []).map((key) => (
                <Pill key={key}>{key.replace(/-/g, ' ')}</Pill>
              ))}
              {user.isAdmin && (
                <Pill tone="warning" icon="shield_person">
                  Admin
                </Pill>
              )}
            </>
          )
        }
        actions={
          <>
            {isDirty && !fetching && (
              <span className="hidden items-center gap-1.5 text-xs text-amber-400 sm:flex">
                <Icon name="edit" className="text-[15px]" />
                Unsaved changes
              </span>
            )}
            {canDelete && (
              <AdminButton
                tone="ghost"
                icon="delete"
                onClick={() => setConfirmDelete(true)}
                disabled={fetching}
              >
                Delete
              </AdminButton>
            )}
            <AdminButton
              tone="primary"
              icon="check"
              onClick={saveUser}
              loading={saving}
              disabled={fetching || !isDirty}
            >
              {isNew ? 'Create user' : 'Save changes'}
            </AdminButton>
          </>
        }
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {renderSection()}
      </AdminEditorShell>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${user.name || 'this user'}?`}
        message="They lose access straight away and leave every company. Their worklogs stay, so company history keeps its numbers. This cannot be undone."
        loading={deleting}
        onConfirm={deleteUser}
      />

      <Toaster
        theme="dark"
        richColors
        position="bottom-right"
        duration={2500}
        closeButton
      />
    </>
  );
};
