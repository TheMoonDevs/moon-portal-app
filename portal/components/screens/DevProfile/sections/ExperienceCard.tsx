'use client';
import { WORKEXPERIENCE } from '@prisma/client';
import React from 'react';
import { IconButton } from '@mui/material';

const ExperienceCard = ({
  experience,
  onDelete,
  onEdit,
}: {
  experience: WORKEXPERIENCE;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  return (
    <div className="flex w-full flex-col rounded-lg border border-gray-300 bg-white p-4 text-gray-800 shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="max-w-[200px] truncate text-lg font-semibold">
            {experience.position}
          </h3>
          <p className="max-w-[200px] truncate text-gray-500">
            {experience.company}
          </p>
        </div>
        <div className="flex space-x-2">
          <IconButton
            size="small"
            sx={{ color: 'gray' }}
            aria-label="edit"
            onClick={onEdit}
          >
            <span className="material-symbols-outlined !text-xl">
              edit_square
            </span>
          </IconButton>
          <IconButton
            size="small"
            sx={{ color: 'gray' }}
            aria-label="delete"
            onClick={onDelete}
          >
            <span className="material-symbols-outlined !text-xl">delete</span>
          </IconButton>
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-500">
        {experience.startDate} - {experience.endDate || 'Present'}
      </div>
      <p className="mt-2 line-clamp-3 max-h-[4.5em] max-w-full overflow-hidden break-words text-[12px] text-gray-600">
        {experience.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {experience.technologies.map((tech, index) => (
          <span
            key={index}
            className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-700"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ExperienceCard;
