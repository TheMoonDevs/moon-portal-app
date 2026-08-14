'use client';

import {
  HOUSEID,
  USERINDUSTRY,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  USERVERTICAL,
} from '@db/client';
import { getCountryDataList } from 'countries-list';
import { useMemo, useState } from 'react';
import TimezoneSelect from 'react-timezone-select';

import {
  Field,
  Icon,
  NativeSelect,
  Panel,
  PanelHeader,
  TextArea,
  TextInput,
  ToggleSwitch,
  UserAvatar,
} from '../shared/AdminUI';
import type { UserSectionProps } from './types';

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
  updateTextareaField,
}: UserSectionProps) => {
  const countryData = useMemo(() => getCountryDataList(), []);
  const [showPasscode, setShowPasscode] = useState(false);

  const passcode = `${user.username || ''}${user.password || ''}`;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          title="Identity"
          description="How this person appears across the portal."
          icon="person"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field
            label="Passcode"
            htmlFor="passcode"
            hint="First 3 characters become the username, the rest the password."
            className="sm:col-span-2"
          >
            <div className="flex gap-2">
              <TextInput
                id="passcode"
                type={showPasscode ? 'text' : 'password'}
                autoComplete="off"
                value={passcode}
                onChange={(event) =>
                  setUser((previous) => ({
                    ...previous,
                    username: event.target.value.substring(0, 3),
                    password: event.target.value.substring(3),
                  }))
                }
              />
              <button
                type="button"
                onClick={() => setShowPasscode((value) => !value)}
                aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[18px] text-neutral-400 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                <Icon name={showPasscode ? 'visibility_off' : 'visibility'} />
              </button>
            </div>
          </Field>

          <Field label="Display name" htmlFor="name">
            <TextInput
              id="name"
              value={user.name || ''}
              onChange={updateField}
              placeholder="Jane Doe"
            />
          </Field>

          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              value={user.email || ''}
              onChange={updateField}
              placeholder="jane@themoondevs.com"
            />
          </Field>

          <Field label="Position title" htmlFor="positionTitle">
            <TextInput
              id="positionTitle"
              value={user.positionTitle || ''}
              onChange={updateField}
              placeholder="Senior Engineer"
            />
          </Field>

          <Field label="Slack ID" htmlFor="slackId">
            <TextInput
              id="slackId"
              value={user.slackId || ''}
              onChange={updateField}
              placeholder="U01ABC23DEF"
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            className="sm:col-span-2"
          >
            <TextArea
              id="description"
              value={user.description || ''}
              onChange={updateTextareaField}
              placeholder="A short bio shown on the profile…"
            />
          </Field>

          <Field
            label="Avatar URL"
            htmlFor="avatar"
            className="sm:col-span-2"
            hint="Paste a direct image link; the preview updates as you type."
          >
            <div className="flex items-center gap-3">
              <UserAvatar src={user.avatar} name={user.name} size={40} />
              <TextInput
                id="avatar"
                value={user.avatar || ''}
                onChange={updateField}
                placeholder="https://…"
              />
            </div>
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Classification"
          description="Determines what this account can see and where it belongs."
          icon="category"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="userType">
            <NativeSelect
              id="userType"
              value={user.userType || ''}
              onChange={updateField}
            >
              {Object.values(USERTYPE).map((type) => (
                <option key={type} value={type}>
                  {titleCase(type)}
                </option>
              ))}
            </NativeSelect>
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

          {user.userType === USERTYPE.MEMBER && (
            <>
              <Field label="Role" htmlFor="role">
                <NativeSelect
                  id="role"
                  value={user.role || ''}
                  onChange={updateField}
                >
                  {Object.values(USERROLE).map((role) => (
                    <option key={role} value={role}>
                      {titleCase(role)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Vertical" htmlFor="vertical">
                <NativeSelect
                  id="vertical"
                  value={user.vertical || ''}
                  onChange={updateField}
                >
                  {Object.values(USERVERTICAL).map((vertical) => (
                    <option key={vertical} value={vertical}>
                      {titleCase(vertical)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="House" htmlFor="house">
                <NativeSelect
                  id="house"
                  value={user.house || ''}
                  onChange={updateField}
                >
                  {Object.values(HOUSEID).map((house) => (
                    <option key={house} value={house}>
                      {titleCase(house)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          )}

          {user.userType === USERTYPE.CLIENT && (
            <Field label="Industry" htmlFor="industry">
              <NativeSelect
                id="industry"
                value={user.industry || ''}
                onChange={updateField}
              >
                {Object.values(USERINDUSTRY).map((industry) => (
                  <option key={industry} value={industry}>
                    {titleCase(industry)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}

          <Field label="Admin access" className="sm:col-span-2">
            <ToggleSwitch
              checked={!!user.isAdmin}
              onChange={(value) =>
                setUser((previous) => ({ ...previous, isAdmin: value }))
              }
              label="Full admin"
              description="Grants every permission unless denied in Access & policies."
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Location"
          description="Used for overlap hours and regional formatting."
          icon="public"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
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

          <Field label="Country" htmlFor="country">
            <NativeSelect
              id="country"
              value={user.country || ''}
              onChange={updateField}
            >
              <option value="">Select a country…</option>
              {countryData.map((country) => (
                <option key={country.iso2} value={country.iso2}>
                  {country.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Panel>
    </div>
  );
};
