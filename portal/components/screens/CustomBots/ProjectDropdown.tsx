'use client';
import type { BotProject } from '@db/client';
import { Skeleton } from '@mui/material';
import { CommandInput } from 'cmdk';
import { ChevronRight, ChevronsUpDown, CirclePlusIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';

import NewProjectCreation from './NewProjectCreation';

export const ProjectDropdown = () => {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { user } = useUser();
  const router = useRouter();

  const params = useParams<{
    project_id?: string;
  }>();
  const projectParamId = params?.project_id;

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [search, setSearch] = useState('');
  const {
    data: projects,
    error,
    isLoading,
  } = useSWR<BotProject[], any, string>(
    `/api/custom-bots/bot-project?clientId=${user?.id}`,
    async (url) => await fetch(url).then((res) => res.json()),
  );

  useEffect(() => {
    if (projectParamId) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      setSelectedProject(project);
      setValue(projectParamId);
    } else {
      setSelectedProject(null);
      setValue('');
    }
  }, [projectParamId, projects]);

  if (isLoading || !projects || !user) {
    return (
      <Skeleton
        variant="rectangular"
        className="w-[200px] rounded-full"
        height={40}
      />
    );
  }
  return (
    <Dialog>
      <div className="ml-4 flex items-center justify-between text-sm">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex w-[200px] items-center justify-between rounded-lg border border-neutral-100 p-2 px-4"
            >
              {value
                ? projects.find((_project) => _project.id === value)?.name
                : 'Select project...'}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput
                // value={search}
                // onInputCapture={(e) => {
                //     setSearch(e.target.value)
                // }}
                className="p-2 outline-none"
                placeholder="Search projects..."
              />
              <CommandList>
                <CommandEmpty>No projects found.</CommandEmpty>
                <CommandGroup>
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.id}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? '' : currentValue);
                        setOpen(false);
                        if (selectedProject?.id !== currentValue) {
                          setSelectedProject(
                            projects.find(
                              (_project) => _project.id === currentValue,
                            ),
                          );
                          router.push(`/custom-bots/project/${currentValue}`);
                        }
                      }}
                      className={`${value === project.id ? 'font-bold' : ''}`}
                    >
                      <ChevronRight
                        className={cn(
                          'h-4 w-4',
                          value === project.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {project.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <DialogTrigger className="flex w-full">
                  <Button
                    onClick={() => setOpen(false)}
                    variant={'ghost'}
                    className="mx-1 mb-1 flex flex-1 justify-start gap-2 px-2 text-sm opacity-50"
                  >
                    <CirclePlusIcon className="size-4" />
                    New Project
                  </Button>
                </DialogTrigger>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <DialogContent>
        <NewProjectCreation
          clientId={user?.id}
          onProjectCreated={(newProject) => {
            setSelectedProject(newProject);
            router.push(`/custom-bots/project/${newProject.id}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
