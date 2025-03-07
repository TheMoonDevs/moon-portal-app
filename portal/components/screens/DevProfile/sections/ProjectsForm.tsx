import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import Textarea from '@/components/elements/Textarea';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Autocomplete, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { styles } from './ExperienceForm';
import { PROJECTS } from '@prisma/client';
import { toast } from 'sonner';
import { formatDate, linkRegex } from '.';
import ProjectCard from './ProjectCard';

const defaultFields = {
  name: '',
  link: '',
  startDate: null as dayjs.Dayjs | null,
  endDate: null as dayjs.Dayjs | null,
  description: '',
  technologies: [] as string[],
};

const ProjectsForm = () => {
  const { getValues, setValue, watch } = useFormContext();
  const [fetchedSkills, setFetchedSkills] = useState<string[]>([]);
  const [project, setProject] = useState(defaultFields);
  const projectsValues = watch('projects');
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
    setProject({ ...project, technologies: newValue });
  };

  const setFormattedProject = (project: PROJECTS) => {
    setProject({
      startDate: project.startDate
        ? dayjs(project.startDate, 'DD/MM/YYYY')
        : null,
      endDate: project.endDate ? dayjs(project.endDate, 'DD/MM/YYYY') : null,
      name: project.name,
      link: project.link,
      description: project.description,
      technologies: project.technologies,
    });
  };

  const handleAddProject = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (
      !project.startDate ||
      !project.endDate ||
      !project.link ||
      !project.name ||
      !project.description ||
      project.technologies.length === 0
    ) {
      toast.error('Please fill in all the fields to add project.');
      return;
    }

    if (!linkRegex.test(project.link)) {
      toast.error('Please provide a valid URL for the link.');
      return;
    }

    if (dayjs(project.endDate).isBefore(dayjs(project.startDate))) {
      toast.error('End date cannot be earlier than start date.');
      return;
    }

    if (dayjs(project.startDate).isAfter(dayjs())) {
      toast.error('Start date cannot be in the future.');
      return;
    }

    if (dayjs(project.endDate).isAfter(dayjs())) {
      toast.error('End date cannot be in the future.');
      return;
    }

    const formattedData = {
      ...project,
      startDate: formatDate(project.startDate),
      endDate: formatDate(project.endDate),
    };

    const updatedProjects = [...(getValues('projects') || [])];
    if (isEditing && editIndex !== null) {
      updatedProjects[editIndex] = formattedData;
    } else {
      updatedProjects.push(formattedData);
    }

    setValue('projects', updatedProjects);
    setProject(defaultFields);
    setIsEditing(false);
    setEditIndex(null);
    console.log(getValues());
  };

  const handleEditProject = (index: number) => {
    const projectToEdit = projectsValues[index];
    setFormattedProject(projectToEdit);
    setIsEditing(true);
    setEditIndex(index);
  };

  const handleDeleteProject = (index: number) => {
    const updatedProjects = [...projectsValues];
    updatedProjects.splice(index, 1);
    setValue('projects', updatedProjects);
  };

  const handleCancelEdit = () => {
    setProject(defaultFields);
    setIsEditing(false);
    setEditIndex(null);
  };

  return (
    <div
      className={`flex h-full w-full ${projectsValues.length === 0 ? 'items-center' : 'items-start'} gap-4 max-sm:flex-col`}
    >
      <div className="flex w-1/2 flex-col gap-2 max-sm:w-full">
        <Input
          id="name"
          label="Name"
          value={project.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setProject({ ...project, name: e.target.value })
          }
        />
        <Textarea
          id="description"
          label="Description"
          value={project.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setProject({ ...project, description: e.target.value })
          }
          customClass="!h-24"
        />
        <Input
          id="link"
          label="Hosted Link"
          value={project.link}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setProject({ ...project, link: e.target.value })
          }
        />

        <div className="mb-4 flex gap-2">
          <div className="flex w-1/2 flex-col gap-1">
            <Label htmlFor="startDate" label="Start Date" />{' '}
            <DatePicker
              value={project.startDate}
              onChange={(newValue) =>
                setProject({ ...project, startDate: newValue })
              }
              sx={styles}
              className="!focus:outline-none !focus:ring-1 !focus:ring-gray-500 !border !border-gray-300 !shadow-sm"
              format="DD-MM-YYYY"
            />
          </div>
          <div className="flex w-1/2 flex-col gap-1">
            <Label htmlFor="endDate" label="End Date" />{' '}
            <DatePicker
              value={project.endDate}
              onChange={(newValue) =>
                setProject({ ...project, endDate: newValue })
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
            freeSolo
            size="small"
            options={fetchedSkills}
            value={project.technologies}
            onChange={(event, newValue) => {
              const uniqueSkills = Array.from(new Set(newValue));
              setProject({ ...project, technologies: uniqueSkills });
            }}
            renderInput={(params) => (
              <TextField {...params} label="Search or Add Skills" />
            )}
            isOptionEqualToValue={(option, value) => option === value}
            disabled={fetchedSkills.length === 0}
            className="!focus:outline-none !focus:ring-1 !focus:ring-gray-500 !rounded-lg !border !border-gray-300 !shadow-sm"
          />
        </div>

        <div className="mt-4 flex w-full items-center justify-between gap-4">
          <button
            className="w-full cursor-pointer rounded-lg bg-black p-4 text-sm text-white transition duration-300 ease-in-out"
            onClick={handleAddProject}
          >
            {isEditing ? 'Update Project' : 'Add To List'}
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
      </div>
      <div className="flex h-full w-1/2 flex-col gap-4 max-sm:w-full">
        {projectsValues.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-500">
            <span className="material-symbols-outlined !text-8xl !opacity-80">
              terminal
            </span>
            <span className="mt-2 text-center text-lg">No Projects Added</span>
          </div>
        ) : (
          <div className="no-scrollbar flex max-h-[550px] w-full flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2 shadow-inner">
            {projectsValues.map((project: PROJECTS, index: number) => (
              <ProjectCard
                key={index}
                project={project}
                onDelete={() => handleDeleteProject(index)}
                onEdit={() => handleEditProject(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsForm;
