'use client';

import React from 'react';

import { Field, NativeSelect, TextInput } from '../shared/AdminUI';

interface CriteriaFieldsProps {
  criteriaType: string;
  formData: {
    criteriaLogic: string;
    streakType: string;
    streakTitle: string;
    streakCount: string;
    customTitle: string;
    customDescription: string;
  };
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
}

const streakTypeTags = [
  { value: 'WORKLOG_BASED', label: 'Worklog based' },
  { value: 'TASK_BASED', label: 'Task based' },
  { value: 'MISSION_BASED', label: 'Mission based' },
  { value: 'ARTICLE_BASED', label: 'Article based' },
];

const CriteriaFields: React.FC<CriteriaFieldsProps> = ({
  criteriaType,
  formData,
  handleChange,
}) => {
  switch (criteriaType) {
    case 'TIME_BASED':
      return (
        <Field
          label="Criteria logic"
          htmlFor="criteriaLogic"
          required
          hint="How long after joining the badge unlocks, e.g. 2 weeks or 6 months."
        >
          <TextInput
            id="criteriaLogic"
            value={formData.criteriaLogic}
            onChange={handleChange}
            placeholder="e.g. 6 months"
          />
        </Field>
      );

    case 'STREAK':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Streak type"
            htmlFor="streakType"
            required
            hint="What activity the streak counts."
          >
            <NativeSelect
              id="streakType"
              value={formData.streakType}
              onChange={handleChange}
            >
              <option value="">Select a streak type…</option>
              {streakTypeTags.map((tag) => (
                <option key={tag.value} value={tag.value}>
                  {tag.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Days for the streak"
            htmlFor="streakCount"
            required
            hint="Consecutive days needed to unlock the badge."
          >
            <TextInput
              id="streakCount"
              type="number"
              min={1}
              value={formData.streakCount}
              onChange={handleChange}
              placeholder="10"
            />
          </Field>
        </div>
      );

    case 'CUSTOM':
      return (
        <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-xs text-neutral-500">
          Custom badges are awarded manually — no automatic criteria is stored.
        </p>
      );

    default:
      return null;
  }
};

export default CriteriaFields;
