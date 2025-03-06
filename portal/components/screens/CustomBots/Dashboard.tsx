'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/utils/hooks/useUser';
import { PlusCircle, MessageSquare } from 'lucide-react';
import { ButtonSCN } from '@/components/elements/Button';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import NewRequestCreation from './NewRequestCreation';
import NewProjectCreation from './NewProjectCreation';
import ProjectConfigModal from './ProjectConfigModal';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams: any = useSearchParams();
  const requestParam = searchParams.get('request');
  const projectParam = searchParams.get('project');
  const viewParam = searchParams.get('view'); // expected values: "request", "newRequest", "newProject", "project"

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isProjectConfigModalOpen, setIsProjectConfigModalOpen] =
    useState(false);

  // Helper function to update search params using URLSearchParams API.
  const updateSearchParams = (params: Record<string, string | null>) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        currentParams.delete(key);
      } else {
        currentParams.set(key, value);
      }
    });
    router.replace(`?${currentParams.toString()}`);
  };

  // SWR to fetch the latest updated request if none is specified.
  const { data: latestRequest } = useSWR(
    user && !requestParam
      ? `/api/custom-bots/client-requests/latest-request?clientId=${user.id}`
      : null,
    async (url) => {
      const res = await fetch(url, {});
      if (!res.ok) throw new Error('Failed to fetch latest request');
      return res.json();
    },
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (requestParam && requestParam !== 'new') {
      (async () => {
        try {
          const res = await fetch(
            `/api/custom-bots/client-requests/${requestParam}`,
            {},
          );
          const data = await res.json();
          setSelectedRequest(data);
        } catch (err) {
          toast.error('Failed to load selected request.');
          console.error(err);
        }
      })();
    } else if (requestParam === 'new') {
      setSelectedRequest(null);
    } else if (!requestParam && latestRequest) {
      setSelectedRequest(latestRequest);
      updateSearchParams({
        request: latestRequest.id,
        view: 'request',
        project: latestRequest.botProjectId,
      });
    }
  }, [requestParam, latestRequest]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with increased width */}
      <div className="flex w-80 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Bot Projects</h2>
          <div className="flex gap-2">
            <ButtonSCN
              variant="ghost"
              size="icon"
              onClick={() =>
                updateSearchParams({
                  project: 'new',
                  view: 'newProject',
                  request: 'null',
                })
              }
              title="New Project"
            >
              <PlusCircle style={{ height: '1.25rem', width: '1.25rem' }} />
            </ButtonSCN>
          </div>
        </div>
        <Sidebar
          clientId={user.id}
          onSelectRequest={(request) => {
            setSelectedRequest(request);
            updateSearchParams({
              request: request.id,
              view: 'request',
              project: request.botProjectId,
            });
          }}
          onNewRequest={(project) => {
            setSelectedProject(project);
            updateSearchParams({
              request: 'new',
              view: 'newRequest',
              project: project.id,
            });
          }}
          onOpenConfig={(project) => {
            setSelectedProject(project);
            updateSearchParams({ project: project.id, view: 'project' });
            setIsProjectConfigModalOpen(true);
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {viewParam === 'newRequest' ? (
          <NewRequestCreation
            clientId={user.id}
            project={selectedProject}
            onRequestCreated={(newRequest) => {
              setSelectedRequest(newRequest);
              updateSearchParams({ request: newRequest.id, view: 'request' });
            }}
          />
        ) : viewParam === 'newProject' ? (
          <NewProjectCreation
            clientId={user.id}
            onProjectCreated={(newProject) => {
              setSelectedProject(newProject);
              updateSearchParams({ project: newProject.id, view: 'project' });
            }}
          />
        ) : selectedRequest ? (
          <ChatWindow clientId={user.id} clientRequest={selectedRequest} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>
              {latestRequest
                ? 'Loading latest request...'
                : 'No requests available. Create a new request or project.'}
            </p>
          </div>
        )}
      </div>

      <ProjectConfigModal
        isOpen={isProjectConfigModalOpen}
        onClose={() => setIsProjectConfigModalOpen(false)}
        projectId={selectedProject?.id || ''}
      />
    </div>
  );
}
