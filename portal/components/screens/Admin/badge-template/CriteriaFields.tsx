import React from 'react';
import { InputField, TextAreaField } from './TextFields';

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
          <InputField
            id='streakType'
            label='Streak Type'
            title='Specify the type of streak, e.g - Worklogs-based'
            type='text'
            placeholder='e.g., Worklogs-based'
            value={formData.streakType}
            onChange={handleChange}
          />
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
