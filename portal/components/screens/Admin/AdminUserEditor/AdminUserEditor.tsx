'use client';

import type { User } from '@db/client';
import {
  HOUSEID,
  USERINDUSTRY,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  USERVERTICAL,
} from '@db/client';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { APP_ROUTES, TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { EditorTab } from '../shared/AdminEditorShell';
import { AdminEditorShell } from '../shared/AdminEditorShell';
import {
  AdminButton,
  formatDate,
  Icon,
  Panel,
  Pill,
  SkeletonRows,
  UserAvatar,
} from '../shared/AdminUI';
import { AdminUserBasicData } from './AdminUserBasicData';
import { AdminUserPayData } from './AdminUserPayData';
import { AdminUserPermissions } from './AdminUserPermissions';
import { AdminUserPersonalData } from './AdminUserPersonalData';
import { AdminUserWorkData } from './AdminUserWorkData';

const initialUserState: User = {
  id: '',
  name: '',
  username: '',
  password: '',
  passphrase: '',
  email: '',
  avatar: '',
  house: HOUSEID.PRODUCT_TECH,
  userType: USERTYPE.MEMBER,
  role: USERROLE.CORETEAM,
  vertical: USERVERTICAL.DEV,
  industry: USERINDUSTRY.OTHERS,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  country: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: USERSTATUS.ACTIVE,
  isAdmin: false,
  workData: {
    joining: dayjs().format('YYYY-MM-DD'),
    overlap: [],
  },
  personalData: null,
  payData: null,
  slackId: '',
  thirdPartyData: null,
  banner: '',
  description: '',
  positionTitle: '',
};

const TABS: EditorTab[] = [
  { id: 'basic', label: 'Basic', icon: 'person' },
  { id: 'work', label: 'Work', icon: 'work' },
  { id: 'pay', label: 'Payments', icon: 'payments' },
  { id: 'personal', label: 'Personal', icon: 'badge' },
  { id: 'access', label: 'Access & policies', icon: 'lock' },
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
  const query = useSearchParams();
  const userId = query?.get('id') ?? null;

  const [user, setUser] = useState<User>(initialUserState);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [fetching, setFetching] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

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
      const rawId = event.target.id;
      const path = rawId.includes('.') ? rawId.split('.') : rawId;
      const target = event.target;
      const value =
        target instanceof HTMLInputElement
          ? target.type === 'checkbox'
            ? target.checked
            : target.type === 'date'
              ? new Date(target.value).toISOString()
              : target.value
          : target.value;

      if (Array.isArray(path)) {
        setUser((previous) => ({
          ...previous,
          [path[0]]: {
            ...((previous[path[0] as keyof User] as Record<string, unknown>) ??
              {}),
            [path[1]]: value,
          },
        }));
      } else {
        setUser((previous) => ({ ...previous, [path]: value }));
      }
    },
    [],
  );

  const updateTextareaField = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const { id, value } = event.target;
      setUser((previous) => ({ ...previous, [id]: value }));
    },
    [],
  );

  const saveUser = useCallback(() => {
    setSaving(true);
    fetch('/api/user', {
      method: user.id.length > 0 ? 'PUT' : 'POST',
      body: JSON.stringify(user),
      headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          toast.success('User saved');
          setUser(data.data.user);
          setSavedSnapshot(JSON.stringify(data.data.user));
          // Keep a freshly created user addressable if the page is reloaded.
          if (!userId && data.data.user?.id) {
            window.history.replaceState(
              null,
              '',
              `${APP_ROUTES.userEditor}?id=${data.data.user.id}`,
            );
          }
        } else if (data.latestUser) {
          toast.warning('Outdated user data — reloaded the latest. Try again.');
          setUser(data.latestUser);
          setSavedSnapshot(JSON.stringify(data.latestUser));
        } else {
          toast.error('Something went wrong');
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error('Something went wrong');
      })
      .finally(() => setSaving(false));
  }, [user, userId]);

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

  const sectionProps = { user, setUser, updateField, updateTextareaField };

  const renderSection = () => {
    if (fetching) {
      return (
        <Panel>
          <SkeletonRows rows={6} />
        </Panel>
      );
    }
    switch (activeTab) {
      case 'work':
        return <AdminUserWorkData {...sectionProps} />;
      case 'pay':
        return <AdminUserPayData {...sectionProps} />;
      case 'personal':
        return <AdminUserPersonalData {...sectionProps} />;
      case 'access':
        return <AdminUserPermissions user={user} />;
      default:
        return <AdminUserBasicData {...sectionProps} />;
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
            ? 'Create a member or client account.'
            : `@${user.username} · joined ${formatDate(user.createdAt)}`
        }
        media={
          !isNew && <UserAvatar src={user.avatar} name={user.name} size={48} />
        }
        meta={
          !isNew && (
            <>
              <Pill tone={user.userType === 'CLIENT' ? 'info' : 'purple'}>
                {user.userType}
              </Pill>
              {user.status && (
                <Pill tone={statusTone(user.status)}>{user.status}</Pill>
              )}
              {user.role && user.userType === 'MEMBER' && (
                <Pill>{String(user.role).replace(/_/g, ' ')}</Pill>
              )}
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
