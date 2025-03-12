
'use client';
import { Button } from "@/components/ui/button";
import { CommandEmpty } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prettySinceTime } from "@/utils/helpers/prettyprint";
import { useUser } from "@/utils/hooks/useUser";
import { Skeleton } from "@mui/material";
import { BotProject, ClientRequest, REQUESTSTATUS } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import NewRequestCreation from "./NewRequestCreation";
import { CirclePlusIcon } from "lucide-react";
import ChatWindow from "./ChatWindow";
import { ClientBotProvider } from "./ClientBotProvider";
import Sidebar from "./Sidebar";
import { toast } from "sonner";

export const RequestPage = () => {


    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const { user } = useUser();
    const router = useRouter();

    const [tab, setTab] = useState("requests");
    const params = useParams<{
        project_id?: string;
        request_id?: string;
    }>();
    const projectParamId = params?.project_id;
    const requestParamId = params?.request_id;

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
            const request = project?.clientRequests.find((r: any) => r.id === requestParamId);
            setSelectedRequest(request);
        }
    }, [projectParamId, requestParamId, projects]);

    const [openNewRequestDialog, setOpenNewRequestDialog] = useState(false);


    if (!user || !selectedProject || !selectedRequest || isLoading) {
        return (
            <div className="flex flex-col h-screen justify-center items-center p-8">
                <Skeleton variant="rectangular" className="w-[200px] rounded-full" height={20} />
            </div>
        )
    }


    return (
        <ClientBotProvider botProjectId={selectedProject?.id} clientId={user?.id}>
            <div className="grid grid-cols-6 w-full relative h-[90vh]">
                <div className="col-span-1">
                    <Sidebar
                        selectedProject={selectedProject}
                        onSelectRequest={(request) => {
                            setSelectedRequest(request);
                            router.push(`/custom-bots/project/${selectedProject?.id}/request/${request?.id}`);
                        }}
                        onNewRequest={(project) => {
                            const openRequests = project?.clientRequests?.filter(
                                (request) =>
                                    request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
                                    request?.requestStatus !== REQUESTSTATUS.CLOSED,
                            );
                            if (openRequests?.length < 3) {
                                setOpenNewRequestDialog(true);
                            } else {
                                toast.warning(
                                    'At the moment we only support 3 concurrent requests. You can create new requests once your open requests are resolved.',
                                );
                            }
                        }}
                        onOpenConfig={(project: any) => {
                            //setSelectedProject(project);
                            // updateSearchParams({ project: project?.id, view: 'project' });
                            // setIsConfigModalOpen(true);
                        }}
                    />
                </div>
                <div className="p-4 col-span-3 h-full">
                    <ChatWindow clientId={user.id} clientRequest={selectedRequest} />
                </div>
            </div>
            <Dialog onOpenChange={setOpenNewRequestDialog} open={openNewRequestDialog}>
                <DialogContent>
                    <NewRequestCreation
                        clientId={user.id}
                        project={selectedProject}
                        onRequestCreated={(newRequest) => {
                            router.push(`/custom-bots/project/${selectedProject.id}/request/${newRequest.id}`);
                        }}
                    />
                </DialogContent>
            </Dialog>

        </ClientBotProvider>
    )

}