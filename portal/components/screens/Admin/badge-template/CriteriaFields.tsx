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
            type='text'
            placeholder='e.g., Worklogs-based'
            value={formData.streakType}
            onChange={handleChange}
          />
          <InputField
            id='streakCount'
            label='Number of Days for Streak'
            type='number'
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
