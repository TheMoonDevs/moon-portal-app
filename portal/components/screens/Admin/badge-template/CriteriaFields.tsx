import React from 'react';
import { InputField, TextAreaField } from './TextFields';
import ToolTip from '@/components/elements/ToolTip';

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
    >
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
        <>
          <InputField
            id='criteriaLogic'
            type='text'
            title="Specify the logic for awarding this badge, e.g., 'After completing 2 weeks from the date of joining' or '6 months from the date of joining'"
            label='Add Criteria Logic'
            placeholder='Criteria logic after which the badge is awarded, e.g., 2 weeks, 6 months'
            value={formData.criteriaLogic}
            onChange={handleChange}
          />
        </>
      );

    case 'STREAK':
      return (
        <>
          <div>
            <label
              htmlFor='streakType'
              className='text-white font-semibold mb-2 flex items-center gap-2'
            >
              Streak Type
              <ToolTip title='Specify the type of streak, e.g., Worklogs-based, select from the list.'>
                <span
                  className='material-symbols-outlined'
                  style={{ fontSize: '1rem' }}
                >
                  info
                </span>
              </ToolTip>
            </label>
            <select
              id='streakType'
              value={formData.streakType}
              onChange={handleChange}
              title='Specify the type of streak, e.g., Worklogs-based'
              className='p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:ring-2 focus:ring-white transition w-full'
            >
              <option value=''>Select Streak Type</option>
              {streakTypeTags.map((tag) => (
                <option value={tag.value} key={`${tag.value}`}>
                  {tag.label}
                </option>
              ))}
            </select>
          </div>
          <InputField
            id='streakCount'
            label='Number of Days for Streak'
            type='number'
            title='Specify the number of days for streak, e.g - 10'
            placeholder='e.g., 10'
            value={formData.streakCount}
            onChange={handleChange}
          />
        </>
      );

    case 'CUSTOM':
      return null;

    default:
      return null;
  }
};

export default CriteriaFields;
