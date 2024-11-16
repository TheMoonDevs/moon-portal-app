'use client';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Autocomplete, TextField, Chip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

const SkillsForm = () => {
  const { setValue, watch } = useFormContext();
  const [inputValue, setInputValue] = useState('');
  const [fetchedSkills, setFetchedSkills] = useState<string[]>([]);
  const expertiseValues = watch('expertise');

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

  const handleSelectionChange = (
    event: React.SyntheticEvent,
    newValue: string | null,
  ) => {
    if (newValue && !expertiseValues.includes(newValue)) {
      const updatedItems = [...expertiseValues, newValue];
      setValue('expertise', updatedItems);
    }
    setInputValue('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (
      event.key === 'Enter' &&
      inputValue.trim() &&
      !expertiseValues.includes(inputValue.trim())
    ) {
      const updatedItems = [...expertiseValues, inputValue.trim()];
      setValue('expertise', updatedItems);
      setInputValue('');
      event.preventDefault();
    }
  };

  const handleDelete = (itemToDelete: string) => {
    const updatedItems = expertiseValues.filter(
      (item: string) => item !== itemToDelete,
    );
    setValue('expertise', updatedItems);
  };

  return (
    <div className="h-[400px]">
      <Autocomplete
        freeSolo
        options={fetchedSkills}
        value={null}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
        onChange={(event, newValue) =>
          handleSelectionChange(event, newValue as string)
        }
        disabled={fetchedSkills.length === 0}
        className="!focus:outline-none !focus:ring-1 !focus:ring-gray-500 !rounded-lg !border !border-gray-300 !shadow-sm"
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <li
              key={key}
              {...otherProps}
              style={{
                backgroundColor: expertiseValues.includes(option)
                  ? '#F3F4F6'
                  : 'inherit',
              }}
            >
              {option}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search or Add Skills"
            InputLabelProps={{ style: { color: '#4B5563' } }}
            variant="outlined"
            onKeyDown={handleKeyPress}
          />
        )}
      />

      <div className="flex flex-wrap gap-2 p-6">
        {expertiseValues.length > 0 ? (
          expertiseValues.map((item: string, index: number) => (
            <Chip
              label={item}
              key={index}
              size="medium"
              onDelete={() => handleDelete(item)}
            />
          ))
        ) : (
          <div className="my-10 flex h-full w-full flex-col items-center justify-center text-gray-500">
            <span className="material-symbols-outlined !text-8xl !opacity-80">
              psychology
            </span>
            <span className="mt-2 text-center text-lg">No Skills Added</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillsForm;
