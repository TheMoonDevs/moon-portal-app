import { DevProfile } from '@prisma/client';
import dayjs from 'dayjs';
import { toast } from 'sonner';

export const defaultValues: DevProfile = {
  id: '',
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  avatar: '',
  bio: '',
  address: '',
  city: '',
  state: '',
  country: '',
  profession: '',
  availability: '',
  expertise: [],
  workExperience: [],
  projects: [],
  socialLinks: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fieldLabels: Record<string, string> = {
  avatar: 'Avatar',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  bio: 'Bio',
  address: 'Address',
  city: 'City',
  state: 'State',
  country: 'Country',
  profession: 'Profession',
};
export const stepFields = {
  0: [
    'firstName',
    'lastName',
    'email',
    'avatar',
    'bio',
    'address',
    'city',
    'state',
    'country',
  ],
  1: ['workExperience'],
  2: ['projects'],
  3: ['expertise'],
  4: ['socialLinks'],
};

export const hasUnfilledFieldsInStep = (
  formData: DevProfile,
  stepFields: Record<number, string[]>,
  activeStep: number,
) => {
  const fieldsToCheck = stepFields[activeStep] || [];
  const hasUnfilledFields = fieldsToCheck.some((field) => {
    const value = formData[field as keyof DevProfile];
    console.log(
      'value',
      field,
      value,
      Array.isArray(value) && value.length === 0,
    );
    return (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) // For arrays like `expertise`, `workExperience`, etc.
    );
  });

  return hasUnfilledFields;
};

export const validateStepFields = (
  step: number,
  data: DevProfile,
  suppressToast = false,
) => {
  switch (step) {
    case 0:
      const missingFieldsStep1 = Object.keys(fieldLabels).filter(
        (field) => !data[field as keyof DevProfile],
      );
      if (missingFieldsStep1.length > 0) {
        const missingLabels = missingFieldsStep1.map(
          (field) => fieldLabels[field],
        );
        if (!suppressToast) {
          toast.error(
            `Please fill out the missing fields in Personal Details: ${missingLabels.join(', ')}`,
          );
        }
        return false;
      }
      break;

    case 1:
      if (data.workExperience.length === 0) {
        if (!suppressToast) {
          toast.error(
            'Please add at least one work experience in Work Experience.',
          );
        }
        return false;
      }
      break;

    case 2:
      if (data.projects.length === 0) {
        if (!suppressToast) {
          toast.error('Please add at least one project in Projects.');
        }
        return false;
      }
      break;

    case 3:
      if (data.expertise.length === 0) {
        if (!suppressToast) {
          toast.error('Please add skills in Skills section.');
        }
        return false;
      }
      break;

    case 4:
      if (data.socialLinks.length === 0) {
        if (!suppressToast) {
          toast.error(
            'Please add at least one social link in Social Links section.',
          );
        }
        return false;
      }
      break;

    default:
      break;
  }
  return true;
};

export const formatDate = (date: dayjs.Dayjs | null) => {
  return date ? dayjs(date).format('DD/MM/YYYY') : '';
};

export const linkRegex = /^(https?|chrome):\/\/[^\s$.?#].[^\s]*$/gm;

export const areAllFieldsFilled = (formData: Record<string, any>) => {
  return Object.entries(formData).every(([key, value]) => {
    if (['createdAt', 'updatedAt', 'id', 'availability'].includes(key)) {
      return true;
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();

      return trimmedValue !== '';
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    const result = value !== null && value !== undefined;
    return result;
  });
};
