'use client';

import BoringAvatar from 'boring-avatars';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import TimezoneSelect from 'react-timezone-select';
import { toast, Toaster } from 'sonner';

import LogoutConfirmationDialog from '@/components/global/LogoutConfirmationDialog';
import PushSubscriptionToggleButton from '@/components/global/PushSubscriptionToggleButton';
import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { uploadAvatar } from '@/utils/helpers/uploads';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { CompanyMark } from '../Admin/Workspace/shared';
import { SignInAccountsSection } from './SignInAccountsSection';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'sign-in', label: 'Sign-in', icon: 'key' },
  { id: 'companies', label: 'Companies', icon: 'domain' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
];

const Card = ({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section
    id={id}
    className="scroll-mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
  >
    <h2 className="text-base font-bold text-neutral-900">{title}</h2>
    {description && (
      <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
    )}
    <div className="mt-4">{children}</div>
  </section>
);

const Label = ({ children }: { children: ReactNode }) => (
  <span className="mb-1 block text-xs font-semibold text-neutral-600">
    {children}
  </span>
);

const inputClass =
  'h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900';

const Avatar = ({
  src,
  name,
}: {
  src?: string | null;
  name?: string | null;
}) =>
  src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="size-16 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="size-16 shrink-0">
      <BoringAvatar
        size="100%"
        name={name || 'P'}
        variant="sunset"
        colors={['#000000', '#363636', '#b3b3b3']}
      />
    </div>
  );

const ProfileCard = () => {
  const { user, refetchUser } = useUser();
  const [form, setForm] = useState({
    name: '',
    positionTitle: '',
    avatar: '',
    timezone: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const { avatar } = await uploadAvatar(user.id, file);
      setForm((f) => ({ ...f, avatar }));
      await refetchUser();
      toast.success('Photo updated');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Fill the form once per person, so a refresh never wipes unsaved edits.
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      positionTitle: user.positionTitle ?? '',
      avatar: user.avatar ?? '',
      timezone:
        user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const dirty =
    !!user &&
    (form.name !== (user.name ?? '') ||
      form.positionTitle !== (user.positionTitle ?? '') ||
      form.avatar !== (user.avatar ?? '') ||
      form.timezone !== (user.timezone ?? ''));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await PortalSdk.putData('/api/user', { id: user.id, ...form });
      await refetchUser();
      toast.success('Profile saved');
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      id="profile"
      title="Profile"
      description="How you appear to the people you work with."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={form.avatar} name={form.name} />
          <div className="min-w-0 flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onUpload(file);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
            <p className="mt-1 text-xs text-neutral-500">
              PNG, JPG, WebP or GIF, up to 5 MB.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <Label>Name</Label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            <Label>Title</Label>
            <input
              className={inputClass}
              value={form.positionTitle}
              onChange={(e) =>
                setForm({ ...form, positionTitle: e.target.value })
              }
              placeholder="Product designer"
            />
          </label>
        </div>
        <div>
          <Label>Timezone</Label>
          <TimezoneSelect
            value={form.timezone}
            onChange={(tz) =>
              setForm({
                ...form,
                timezone: typeof tz === 'string' ? tz : tz.value,
              })
            }
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Card>
  );
};

const SignInCard = () => {
  const { user } = useUser();
  const [shown, setShown] = useState(false);
  const code = `${user?.username ?? ''}${user?.password ?? ''}`;

  return (
    <Card
      id="sign-in"
      title="Sign-in"
      description="Your code first, then any of these Google accounts."
    >
      <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2.5">
        <span className="text-sm text-neutral-600">Your sign-in code</span>
        <button
          onClick={() => setShown((v) => !v)}
          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-[0.3em] text-neutral-900"
          title={shown ? 'Hide' : 'Show'}
        >
          {shown ? code : '••••••'}
          <span className="material-symbols-outlined !text-base text-neutral-400">
            {shown ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      <SignInAccountsSection />
    </Card>
  );
};

const CompaniesCard = () => {
  const { companies, loading, canOpenAdmin } = useWorkspace();
  return (
    <Card
      id="companies"
      title="Companies"
      description="Where your worklogs and points count."
    >
      {loading && !companies.length ? (
        <div className="h-14 animate-pulse rounded-lg bg-neutral-50" />
      ) : companies.length === 0 ? (
        <p className="text-sm text-neutral-500">
          You are not in a company yet. Ask an admin to add you.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {companies.map(({ company, member }) => (
            <li
              key={company.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2"
            >
              <CompanyMark
                name={company.name}
                color={company.color}
                logo={company.logo}
                size={32}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {company.name}
              </span>
              <span className="text-xs capitalize text-neutral-500">
                {(member?.roleKeys ?? []).join(', ') || 'Viewer'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canOpenAdmin && (
        <Link
          href={APP_ROUTES.admin}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-neutral-900 hover:underline"
        >
          Open the admin console
          <span className="material-symbols-outlined !text-base">
            arrow_forward
          </span>
        </Link>
      )}
    </Card>
  );
};

const NotificationsCard = () => (
  <Card id="notifications" title="Notifications">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-neutral-900">Push notifications</p>
        <p className="text-sm text-neutral-500">
          Announcements and reminders on this device.
        </p>
      </div>
      <PushSubscriptionToggleButton type="switch" />
    </div>
  </Card>
);

const Settings = () => {
  const { user } = useUser();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [active, setActive] = useState(SECTIONS[0].id);

  // Highlight the section in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 pb-32 text-neutral-800">
      <div className="mx-auto flex max-w-4xl gap-8 px-4 pt-8 md:pl-24">
        <aside className="sticky top-8 hidden h-fit w-48 shrink-0 md:block">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
            Settings
          </p>
          <nav className="flex flex-col gap-0.5">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  active === section.id
                    ? 'bg-white font-semibold text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:bg-white/60',
                )}
              >
                <span className="material-symbols-outlined !text-lg">
                  {section.icon}
                </span>
                {section.label}
              </a>
            ))}
            <button
              onClick={() => setLogoutOpen(true)}
              className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-white/60"
            >
              <span className="material-symbols-outlined !text-lg">logout</span>
              Sign out
            </button>
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center gap-4 px-1">
            <Avatar src={user?.avatar} name={user?.name} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-neutral-900">
                {user?.name}
              </h1>
              <p className="truncate text-sm text-neutral-500">{user?.email}</p>
            </div>
          </div>

          <ProfileCard />
          <SignInCard />
          <CompaniesCard />
          <NotificationsCard />

          <button
            onClick={() => setLogoutOpen(true)}
            className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-medium text-rose-600 shadow-sm md:hidden"
          >
            Sign out
          </button>
        </main>
      </div>

      <LogoutConfirmationDialog
        open={logoutOpen}
        handleClose={() => setLogoutOpen(false)}
      />
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default Settings;
