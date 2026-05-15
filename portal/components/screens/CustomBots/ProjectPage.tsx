'use client';
import type { BotProject, ClientRequest } from '@db/client';
import { Skeleton } from '@mui/material';
import { CirclePlusIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/utils/hooks/useUser';

import NewRequestCreation from './NewRequestCreation';

export const ProjectPage = () => {
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const { user } = useUser();
  const router = useRouter();

  const [tab, setTab] = useState('requests');
  const params = useParams<{
    project_id?: string;
  }>();
  const projectParamId = params?.project_id;

  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(
    `/api/custom-bots/bot-project?clientId=${user?.id}`,
    async (url) => await fetch(url).then((res) => res.json()),
  );

  useEffect(() => {
    if (projectParamId) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      setSelectedProject(project);
    }
  }, [projectParamId, projects]);

  if (isLoading || !projects || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <Skeleton
          variant="rectangular"
          className="w-[200px] rounded-full"
          height={20}
        />
      </div>
    );
  }

  return (
    <div className="mt-14 flex w-full flex-col items-center justify-center p-8">
      <div className="container w-[600px]">
        <Tabs defaultValue="requests" className="w-full">
          <div className="jsutify-between col-span-2 flex w-full items-end pb-4">
            {selectedProject ? (
              <div>
                <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
                <p className="text-xs">
                  {(selectedProject as BotProject).githubRepoName}
                </p>
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center"></div>
            )}
            <TabsList className="ml-auto">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="bots">Bots</TabsTrigger>
            </TabsList>
            <Dialog>
              <DialogTrigger className="ml-4 flex">
                <Button className="flex items-center gap-2 p-2 text-sm">
                  <CirclePlusIcon size={24} />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <NewRequestCreation
                  clientId={user.id}
                  project={selectedProject}
                  onRequestCreated={(newRequest) => {
                    router.push(
                      `/custom-bots/project/${selectedProject.id}/request/${newRequest.id}`,
                    );
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
          <TabsContent value="requests">
            <div className="flex min-h-[70vh] flex-col gap-2 rounded-xl bg-neutral-50 p-2 shadow-md">
              {(selectedProject?.clientRequests as ClientRequest[])?.map(
                (request) => (
                  <div
                    key={request.id}
                    onClick={() => {
                      router.push(
                        `/custom-bots/project/${selectedProject.id}/request/${request.id}`,
                      );
                    }}
                    className="flex cursor-pointer items-center rounded-xl p-4 hover:bg-white hover:shadow-md"
                  >
                    <div>
                      <h4 className="text-md font-bold text-neutral-700">
                        {request.title}
                      </h4>
                      <p className="text-xs text-neutral-400">
                        {request.requestDir}
                      </p>
                    </div>
                  </div>
                ),
              )}
              {selectedProject?.clientRequests?.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center">
                  <h4 className="text-lg text-neutral-900">
                    No requests found.
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Click new request to get started.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="bots">
            <div className="flex h-screen flex-col gap-2 rounded-xl bg-neutral-100 p-2"></div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
