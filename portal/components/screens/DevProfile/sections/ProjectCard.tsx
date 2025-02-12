import React from 'react';
import { IconButton } from '@mui/material';
import { PROJECTS } from '@prisma/client';
import Link from 'next/link';

const ProjectCard = ({
  project,
  onDelete,
  onEdit,
}: {
  project: PROJECTS;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  return (
    <div className="flex w-full flex-col rounded-lg border border-gray-300 bg-white p-4 text-gray-800 shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="max-w-[200px] truncate text-lg font-semibold">
            {project.name}
          </h3>
          <Link
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex max-w-[200px] items-center gap-1 truncate text-sm text-blue-500"
          >
            Link to Project
            <span className="material-symbols-outlined !text-sm">
              open_in_new
            </span>
          </Link>
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
        {project.startDate} - {project.endDate || 'Present'}
      </div>
      <p className="mt-2 line-clamp-3 max-h-[4.5em] max-w-full overflow-hidden break-words text-[12px] text-gray-600">
        {project.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.technologies.map((tech: string, index: number) => (
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

export default ProjectCard;
