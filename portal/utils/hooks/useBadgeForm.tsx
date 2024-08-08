import { useState } from 'react';

type CriteriaType = 'TIME_BASED' | 'STREAK' | 'CUSTOM';

const initialFormData = {
  criteriaType: '' as CriteriaType | '',
  imageFile: null as File | null,
  badgeName: '',
  badgeDescription: '',
  streakType: '',
  streakTitle: '',
  streakCount: '',
  criteriaLogic: '',
  customTitle: '',
  customDescription: '',
};

const useBadgeForm = () => {
  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { id, value, type } = e.target;
    if (type === 'file') {
      const input = e.target as HTMLInputElement;
      const file = input.files ? input.files[0] : null;
      setFormData((prev) => ({ ...prev, [id]: file }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const resetForm = () => setFormData(initialFormData);

  const getCriteria = () => {
    const criteria = {
      TIME_BASED: {
        criteriaLogic: formData.criteriaLogic,
      },
      STREAK: {
        streakType: formData.streakType,
        streakCount: formData.streakCount,
      },
      CUSTOM: null,
    };

    return criteria[formData.criteriaType as CriteriaType] || {};
  };

  return {
    formData,
    handleChange,
    resetForm,
    getCriteria,
    setFormData,
  };
};

export default useBadgeForm;
