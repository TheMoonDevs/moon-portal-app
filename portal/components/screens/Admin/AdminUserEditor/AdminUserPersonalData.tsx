'use client';

import type { JsonObject } from '@db/runtime';
import Link from 'next/link';

import {
  DateInput,
  Field,
  Icon,
  Panel,
  PanelHeader,
  TextInput,
} from '../shared/AdminUI';
import type { UserSectionProps } from './types';

export const AdminUserPersonalData = ({
  user,
  setUser,
  updateField,
}: UserSectionProps) => {
  const personalData = (user?.personalData || {}) as Record<string, unknown>;
  const govtId = (personalData.govtId as string) ?? '';

  return (
    <Panel>
      <PanelHeader
        title="Personal details"
        description="Contact information kept for internal records only."
        icon="badge"
      />
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="personalData.phone">
          <TextInput
            id="personalData.phone"
            value={(personalData.phone as string) ?? ''}
            onChange={updateField}
            placeholder="+91 90000 00000"
          />
        </Field>

        <Field label="Date of birth" htmlFor="personalData.dateOfBirth">
          <DateInput
            id="personalData.dateOfBirth"
            value={(personalData.dateOfBirth as string) ?? ''}
            onChange={(event) =>
              setUser((previous) => ({
                ...previous,
                personalData: {
                  ...(previous.personalData as JsonObject),
                  dateOfBirth: event.target.value,
                },
              }))
            }
          />
        </Field>

        <Field
          label="Address"
          htmlFor="personalData.address"
          className="sm:col-span-2"
        >
          <TextInput
            id="personalData.address"
            value={(personalData.address as string) ?? ''}
            onChange={updateField}
            placeholder="Street, area…"
          />
        </Field>

        <Field label="City" htmlFor="personalData.city">
          <TextInput
            id="personalData.city"
            value={(personalData.city as string) ?? ''}
            onChange={updateField}
            placeholder="Bengaluru"
          />
        </Field>

        <Field
          label="Work hour overlap"
          htmlFor="personalData.workHourOverlap"
          hint="Hours this person overlaps with the core team."
        >
          <TextInput
            id="personalData.workHourOverlap"
            value={(personalData.workHourOverlap as string) ?? ''}
            onChange={updateField}
            placeholder="4 hours (IST 2pm–6pm)"
          />
        </Field>

        <Field
          label="Government ID"
          htmlFor="personalData.govtId"
          className="sm:col-span-2"
          hint="Link to the stored identity document."
        >
          <div className="flex items-center gap-2">
            <TextInput
              id="personalData.govtId"
              type="url"
              value={govtId}
              onChange={updateField}
              placeholder="https://…"
            />
            {govtId && (
              <Link
                href={govtId}
                target="_blank"
                rel="noreferrer"
                title="Open document"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[18px] text-neutral-400 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                <Icon name="open_in_new" />
              </Link>
            )}
          </div>
        </Field>
      </div>
    </Panel>
  );
};
