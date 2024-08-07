import React from 'react';
import { InputField, TextAreaField } from './TextFields';

interface CriteriaFieldsProps {
  criteriaType: string;
  formData: {
    awardTitle: string;
    awardDescription: string;
    awardDuration: string;
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
    case 'Time-based':
      return (
        <>
          <InputField
            id='awardDuration'
            type='text'
            label='Award Duration'
            placeholder='Award duration after which the badge is awarded, e.g., 2 weeks, 6 months'
            value={formData.awardDuration}
            onChange={handleChange}
          />
        </>
      );

    case 'Streak-based':
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

    case 'Custom':
      return null;

    default:
      return null;
  }
};

export default CriteriaFields;
