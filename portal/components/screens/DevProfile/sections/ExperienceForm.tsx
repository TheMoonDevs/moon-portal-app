'use client';
import Input from '@/components/elements/Input';
import Textarea from '@/components/elements/Textarea';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import Label from '@/components/elements/Label';
import { Autocomplete, TextField, SelectChangeEvent } from '@mui/material';
import { PortalSdk } from '@/utils/services/PortalSdk';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { WORKEXPERIENCE } from '@prisma/client';
import ExperienceCard from './ExperienceCard';
import { formatDate } from '.';

const defaultFields = {
  startDate: null as dayjs.Dayjs | null,
  endDate: null as dayjs.Dayjs | null,
  company: '',
  position: '',
  description: '',
  technologies: [] as string[],
};

const ExperienceForm = () => {
  const { getValues, setValue, watch } = useFormContext();
  const [fetchedSkills, setFetchedSkills] = useState<string[]>([]);
  const [workExperience, setWorkExperience] = useState(defaultFields);
  const workExperienceValues = watch('workExperience');
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const fetchSkills = async () => {
    try {
      const res = await PortalSdk.getData('/api/dev-profile/skills', null);
      setFetchedSkills(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleSkillsChange = (
    event: React.SyntheticEvent,
    newValue: string[],
  ) => {
    setWorkExperience({ ...workExperience, technologies: newValue });
  };

  const setFormattedWorkExperience = (experience: WORKEXPERIENCE) => {
    setWorkExperience({
      startDate: experience.startDate
        ? dayjs(experience.startDate, 'DD/MM/YYYY')
        : null,
      endDate: experience.endDate
        ? dayjs(experience.endDate, 'DD/MM/YYYY')
        : null,
      company: experience.company,
      position: experience.position,
      description: experience.description,
      technologies: experience.technologies,
    });
  };

  const handleAddExperience = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (
      !workExperience.startDate ||
      !workExperience.endDate ||
      !workExperience.company ||
      !workExperience.position ||
      !workExperience.description ||
      workExperience.technologies.length === 0
    ) {
      toast.error('Please fill in all the fields to add work experience.');
      return;
    }

    const formattedData = {
      ...workExperience,
      startDate: formatDate(workExperience.startDate),
      endDate: formatDate(workExperience.endDate),
    };

    const updatedExperiences = [...(getValues('workExperience') || [])];
    if (isEditing && editIndex !== null) {
      updatedExperiences[editIndex] = formattedData;
    } else {
      updatedExperiences.push(formattedData);
    }

    setValue('workExperience', updatedExperiences);
    setWorkExperience(defaultFields);
    setIsEditing(false);
    setEditIndex(null);
  };

  const handleEditExperience = (index: number) => {
    const experienceToEdit = workExperienceValues[index];
    setFormattedWorkExperience(experienceToEdit);
    setIsEditing(true);
    setEditIndex(index);
  };

  const handleDeleteExperience = (index: number) => {
    const updatedExperiences = [...workExperienceValues];
    updatedExperiences.splice(index, 1);
    setValue('workExperience', updatedExperiences);
  };

  const handleCancelEdit = () => {
    setWorkExperience(defaultFields);
    setIsEditing(false);
    setEditIndex(null);
  };

  return (
    <div
      className={`flex h-full w-full ${workExperienceValues.length === 0 ? 'items-center' : 'items-start'} gap-4 max-sm:flex-col`}
    >
      <form className="flex w-1/2 flex-col gap-2 max-sm:w-full">
        <Input
          id="company"
          label="Company"
          value={workExperience.company}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setWorkExperience({ ...workExperience, company: e.target.value })
          }
        />
        <Input
          id="position"
          label="Position"
          value={workExperience.position}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setWorkExperience({ ...workExperience, position: e.target.value })
          }
        />
        <Textarea
          id="description"
          label="Description"
          customClass="!h-24"
          value={workExperience.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setWorkExperience({
              ...workExperience,
              description: e.target.value,
            })
          }
        />
        <div className="mb-4 flex gap-2">
          <div className="flex w-1/2 flex-col gap-1">
            <Label htmlFor="startDate" label="Start Date" />{' '}
            <DatePicker
              value={workExperience.startDate}
              onChange={(newValue) =>
                setWorkExperience({ ...workExperience, startDate: newValue })
              }
              sx={styles}
              className="!focus:outline-none !focus:ring-1 !focus:ring-gray-500 !border !border-gray-300 !shadow-sm"
              format="DD-MM-YYYY"
            />
          </div>
          <div className="flex w-1/2 flex-col gap-1">
            <Label htmlFor="endDate" label="End Date" />{' '}
            <DatePicker
              value={workExperience.endDate}
              onChange={(newValue) =>
                setWorkExperience({ ...workExperience, endDate: newValue })
              }
              sx={styles}
              format="DD-MM-YYYY"
              className="!focus:outline-none !focus:ring-1 !focus:ring-gray-500 !border !border-gray-300 !shadow-sm"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-multiple-chip" label="Technologies used" />
          <Autocomplete
            id="skills"
            multiple
            size="small"
            options={fetchedSkills}
            value={workExperience.technologies}
            onChange={handleSkillsChange}
            renderInput={(params) => <TextField {...params} />}
            isOptionEqualToValue={(option, value) => option === value}
            disabled={fetchedSkills.length === 0}
            className="!focus:outline-none !focus:ring-1 !focus:ring-gray-500 !rounded-lg !border !border-gray-300 !shadow-sm"
          />
        </div>
        <div className="mt-4 flex w-full items-center justify-between gap-4">
          <button
            className="w-full cursor-pointer rounded-lg bg-black p-4 text-sm text-white transition duration-300 ease-in-out"
            onClick={handleAddExperience}
          >
            {isEditing ? 'Update Experience' : 'Add To List'}
          </button>
          {isEditing && (
            <button
              className="w-full cursor-pointer rounded-lg bg-gray-500 p-4 text-sm text-white transition duration-300 ease-in-out"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="flex h-full w-1/2 flex-col gap-4 max-sm:w-full">
        {workExperienceValues.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-500">
            <span className="material-symbols-outlined !text-8xl !opacity-80">
              work_outline
            </span>
            <span className="mt-2 text-center text-lg">
              No Experience Added
            </span>
          </div>
        ) : (
          <div className="no-scrollbar flex max-h-[550px] w-full flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2 shadow-inner">
            {workExperienceValues.map(
              (experience: WORKEXPERIENCE, index: number) => (
                <ExperienceCard
                  key={index}
                  experience={experience}
                  onDelete={() => handleDeleteExperience(index)}
                  onEdit={() => handleEditExperience(index)}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperienceForm;

export const styles = {
  border: '1px solid #737373',
  height: '40px',
  borderRadius: '8px',
  width: '100%',
  backgroundColor: '#fff',
  '& .MuiPaper-root': {
    '& .MuiPickersLayout-root': {
      '& MuiDateCalendar-root': {
        backgroundColor: '#1f1f1f !important',
        height: '40px',
      },
    },
  },
  '& .MuiDateCalendar-root': {
    backgroundColor: '#1f1f1f !important',
    height: '40px',
  },
  '& .MuiInputBase-input': {
    padding: '8px',
  },
  '& .MuiButtonBase-root': {},
};
