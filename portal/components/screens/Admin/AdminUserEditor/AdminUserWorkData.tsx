'use client';

import type { JsonObject } from '@db/runtime';

import {
  DateInput,
  Field,
  Panel,
  PanelHeader,
  TextInput,
} from '../shared/AdminUI';
import type { UserSectionProps } from './types';

export const AdminUserWorkData = ({
  user,
  setUser,
  updateField,
}: UserSectionProps) => {
  const workData = (user?.workData || {}) as Record<string, unknown>;

  return (
    <Panel>
      <PanelHeader
        title="Work details"
        description="Engagement terms, seniority and joining date."
        icon="work"
      />
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field
          label="Work hours per week"
          htmlFor="workData.workHours"
          hint="Hours this person is expected to log each week."
        >
          <TextInput
            id="workData.workHours"
            value={(workData.workHours as string) ?? ''}
            onChange={updateField}
            placeholder="40"
          />
        </Field>

        <Field label="Joining date" htmlFor="workData.joining">
          <DateInput
            id="workData.joining"
            value={(workData.joining as string) ?? ''}
            onChange={(event) =>
              setUser((previous) => ({
                ...previous,
                workData: {
                  ...(previous.workData as JsonObject),
                  joining: event.target.value,
                },
              }))
            }
          />
        </Field>

        <Field
          label="Position (public)"
          htmlFor="workData.positionPublic"
          hint="Shown on public profiles and certificates."
        >
          <TextInput
            id="workData.positionPublic"
            value={(workData.positionPublic as string) ?? ''}
            onChange={updateField}
            placeholder="Software Engineer"
          />
        </Field>

        <Field
          label="Position (internal)"
          htmlFor="workData.positionInternal"
          hint="Used internally only."
        >
          <TextInput
            id="workData.positionInternal"
            value={(workData.positionInternal as string) ?? ''}
            onChange={updateField}
            placeholder="Engineer II"
          />
        </Field>

        <Field label="Grade" htmlFor="workData.grade">
          <TextInput
            id="workData.grade"
            type="number"
            value={(workData.grade as number) ?? ''}
            onChange={updateField}
            placeholder="3"
          />
        </Field>

        <Field label="Grade tag" htmlFor="workData.gradeTag">
          <TextInput
            id="workData.gradeTag"
            value={(workData.gradeTag as string) ?? ''}
            onChange={updateField}
            placeholder="A3"
          />
        </Field>
      </div>
    </Panel>
  );
};
