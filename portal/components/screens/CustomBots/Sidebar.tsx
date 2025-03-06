'use client';

import { useCallback, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@mui/material';
import { ButtonSCN } from '@/components/elements/Button';
import { PortalSdk } from '@/utils/services/PortalSdk';
import useSWR from 'swr';
import { toast } from 'sonner';
import { BotProject, ClientRequests } from '@prisma/client';
import { usePathname } from 'next/navigation';

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequests[];
}

export default function Sidebar({
  clientId,
  onSelectRequest,
  onNewRequest,
  onOpenConfig,
}: {
  clientId: string;
  onSelectRequest: (request: ClientRequests) => void;
  onNewRequest: (project: BotProjectWithRequests) => void;
  onOpenConfig: (project: BotProject) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get a new searchParams string by merging the current
  // searchParams with a provided key/value pair
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({});

  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(
    `/api/custom-bots/bot-project?clientId=${clientId}`,
    async (url) => await PortalSdk.getData(url, {}),
  );

  if (error) {
    toast.error('Failed to load projects.');
    console.error(error);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  const toggleProject = (projectId: string) => {
    // toggle the search param of the project id
    router.push(pathname + '?' + createQueryString('project', projectId));
    setExpandedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  return (
    <div className="h-screen max-h-screen flex-1 overflow-y-auto">
      {projects?.length > 0 ? (
        projects.map((project: BotProjectWithRequests | any) => (
          <div key={project.id} className="mb-2">
            <div
              className={`flex cursor-pointer items-center justify-between px-4 py-2 ${
                project.id === searchParams?.get('project')
                  ? 'bg-gray-200'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => toggleProject(project.id)}
            >
              <div className="flex items-center">
                {expandedProjects[project.id] ? (
                  <ChevronDown
                    style={{
                      marginRight: '0.5rem',
                      height: '1rem',
                      width: '1rem',
                    }}
                  />
                ) : (
                  <ChevronRight
                    style={{
                      marginRight: '0.5rem',
                      height: '1rem',
                      width: '1rem',
                    }}
                  />
                )}
                <span className="truncate font-medium">{project.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* New Request button (passes the current project) */}
                <ButtonSCN
                  variant="ghost"
                  size="icon"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onNewRequest(project); // Pass the entire project
                  }}
                  title="New Request"
                  style={{ padding: '0.25rem', marginRight: '0.25rem' }}
                >
                  <PlusCircle style={{ height: '1rem', width: '1rem' }} />
                </ButtonSCN>
                <ButtonSCN
                  variant="ghost"
                  size="icon"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onOpenConfig(project); // Pass the project for config handling
                  }}
                  title="Project Configurations"
                  style={{ padding: '0.25rem' }}
                >
                  <Settings style={{ height: '1rem', width: '1rem' }} />
                </ButtonSCN>
              </div>
            </div>

            {expandedProjects[project.id] && (
              <div className="mb-2 ml-3 mt-1 space-y-1">
                {project.clientRequests.length > 0 ? (
                  project.clientRequests.map((request: ClientRequests) => (
                    <div
                      key={request.id}
                      className={`flex cursor-pointer items-center rounded-sm px-4 py-2 text-sm ${request.id === searchParams?.get('request') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                      onClick={() => onSelectRequest(request)}
                    >
                      <MessageSquare
                        style={{
                          marginRight: '0.5rem',
                          height: '1rem',
                          width: '1rem',
                          color: '#4c4c4c',
                        }}
                      />
                      <span className="flex-1 truncate">{request.title}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    No requests
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-muted-foreground">
          <p>No bot projects found</p>
          <ButtonSCN
            style={{ marginTop: '0.5rem' }}
            onClick={() =>
              onNewRequest({
                id: '',
                name: 'New Project',
                clientRequests: [],
              } as any)
            }
          >
            Create First Request
          </ButtonSCN>
        </div>
      )}
    </div>
  );
}
