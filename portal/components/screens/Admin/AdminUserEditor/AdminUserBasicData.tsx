'use client';

import { USERSTATUS } from '@db/client';
import { useRef, useState } from 'react';
import TimezoneSelect from 'react-timezone-select';
import { toast } from 'sonner';

import { uploadAvatar } from '@/utils/helpers/uploads';

import {
  Field,
  Icon,
  NativeSelect,
  Panel,
  PanelHeader,
  TextInput,
  UserAvatar,
} from '../shared/AdminUI';
import type { UserSectionProps } from './types';

const LinkedEmailsInput = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (emails: string[]) => void;
}) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const email = draft.trim().toLowerCase();
    if (!email.includes('@') || value.includes(email)) return;
    onChange([...value, email]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] py-0.5 pl-3 pr-1 text-xs text-neutral-200"
            >
              {email}
              <button
                type="button"
                aria-label={`Unlink ${email}`}
                onClick={() => onChange(value.filter((e) => e !== email))}
                className="flex size-5 items-center justify-center rounded-full text-[14px] text-neutral-500 hover:bg-white/10 hover:text-neutral-200"
              >
                <Icon name="close" />
              </button>
            </span>
          ))}
        </div>
      )}
      <TextInput
        type="email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Add a Google account and press Enter"
      />
    </div>
  );
};

const titleCase = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

/** react-timezone-select renders react-select, which needs explicit dark styles. */
const timezoneSelectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: '40px',
    backgroundColor: 'rgba(23,23,23,0.8)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: '0.5rem',
    boxShadow: 'none',
    ':hover': { borderColor: 'rgba(255,255,255,0.25)' },
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: '#f5f5f5',
  }),
  input: (base: Record<string, unknown>) => ({ ...base, color: '#f5f5f5' }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: '#525252',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.1)',
    zIndex: 30,
  }),
  option: (
    base: Record<string, unknown>,
    state: { isFocused: boolean; isSelected: boolean },
  ) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'rgba(255,255,255,0.14)'
      : state.isFocused
        ? 'rgba(255,255,255,0.06)'
        : 'transparent',
    color: '#e5e5e5',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: '#737373',
  }),
};

export const AdminUserBasicData = ({
  user,
  setUser,
  updateField,
  onAvatarSaved,
}: UserSectionProps & {
  /** Called after an upload has saved a new photo on the server. */
  onAvatarSaved?: (avatar: string, updatedAt?: string) => void;
}) => {
  const [showPasscode, setShowPasscode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const { avatar, updatedAt } = await uploadAvatar(user.id, file);
      onAvatarSaved?.(avatar, updatedAt);
      toast.success('Photo updated');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const passcode = `${user.username || ''}${user.password || ''}`;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          title="Profile"
          description="How this person appears across the portal."
          icon="person"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <TextInput
              id="name"
              value={user.name || ''}
              onChange={updateField}
              placeholder="Jane Doe"
            />
          </Field>

          <Field label="Title" htmlFor="positionTitle">
            <TextInput
              id="positionTitle"
              value={user.positionTitle || ''}
              onChange={updateField}
              placeholder="Senior Engineer"
            />
          </Field>

          <Field
            label="Photo"
            htmlFor="avatar"
            className="sm:col-span-2"
            hint={
              user.id
                ? 'Upload a PNG, JPG, WebP or GIF up to 5 MB. It saves straight away. You can also paste a link.'
                : 'Create the user first to upload a photo, or paste a link now.'
            }
          >
            <div className="flex items-center gap-3">
              <UserAvatar src={user.avatar} name={user.name} size={48} />
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
                disabled={!user.id || uploading}
                onClick={() => fileRef.current?.click()}
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm text-neutral-200 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
              >
                <Icon name="upload" />
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <TextInput
                id="avatar"
                value={user.avatar || ''}
                onChange={updateField}
                placeholder="or paste https://…"
              />
            </div>
          </Field>

          <Field label="Timezone" htmlFor="timezone">
            <TimezoneSelect
              inputId="timezone"
              value={user.timezone || ''}
              onChange={(timezone) =>
                setUser((previous) => ({
                  ...previous,
                  timezone:
                    typeof timezone === 'string' ? timezone : timezone.value,
                }))
              }
              styles={timezoneSelectStyles}
            />
          </Field>

          <Field label="Status" htmlFor="status">
            <NativeSelect
              id="status"
              value={user.status || ''}
              onChange={updateField}
            >
              {Object.values(USERSTATUS).map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Sign-in"
          description="A six-character code, then any of their Google accounts."
          icon="key"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field
            label="Sign-in code"
            htmlFor="passcode"
            hint="Six letters or numbers. It is emailed to them when you create the account."
          >
            <div className="flex gap-2">
              <TextInput
                id="passcode"
                type={showPasscode ? 'text' : 'password'}
                autoComplete="off"
                maxLength={6}
                value={passcode}
                onChange={(event) => {
                  const code = event.target.value.toUpperCase();
                  setUser((previous) => ({
                    ...previous,
                    username: code.substring(0, 3),
                    password: code.substring(3),
                  }));
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasscode((value) => !value)}
                aria-label={showPasscode ? 'Hide code' : 'Show code'}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[18px] text-neutral-400 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                <Icon name={showPasscode ? 'visibility_off' : 'visibility'} />
              </button>
            </div>
          </Field>

          <Field label="Main email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              value={user.email || ''}
              onChange={updateField}
              placeholder="jane@company.com"
            />
          </Field>

          <Field
            label="Other Google accounts"
            hint="They can sign in with their code plus any of these accounts."
            className="sm:col-span-2"
          >
            <LinkedEmailsInput
              value={user.linkedEmails ?? []}
              onChange={(linkedEmails) =>
                setUser((prev) => ({ ...prev, linkedEmails }))
              }
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
};
