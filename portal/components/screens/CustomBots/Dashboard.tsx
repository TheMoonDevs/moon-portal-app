"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/elements/Tab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/elements/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/elements/dialog";
import { Badge } from "@/components/elements/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/elements/Table";
import { AlertCircle, Plus, Trash, Settings, RefreshCw } from "lucide-react";
import { useUser } from "@/utils/hooks/useUser";
import { Button } from "@/components/elements/Button";
import Input from "@/components/elements/Input";
import Textarea from "@/components/elements/Textarea";
import {toast, Toaster} from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";

// Types based on your API structure
type BotProject = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  githubRepoName: string;
  githubRepoUrl: string;
  githubRepoBranch: string;
  prUrl: string;
  prNumber: number;
  projectConfiguration: Record<string, any>;
  clientRequests: ClientRequest[];
  createdAt: string;
  updatedAt: string;
};

type ClientRequest = {
  id: string;
  botProjectId: string;
  clientId: string;
  assigneeId: string | null;
  title: string;
  description: string;
  prUrl: string;
  prNumber: number;
  requestStatus: "UN_ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
};

export default function BotProjectPage() {
  const {user} = useUser()
  const clientId = user?.id
  const [projects, setProjects] = useState<BotProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<BotProject | null>(null);
  const [configKeys, setConfigKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProject, setNewProject] = useState({ projectName: "", projectDescription: "" });
  const [newRequest, setNewRequest] = useState({ requestTitle: "", requestDescription: "", assigneeId: "" });
  const [newConfigKey, setNewConfigKey] = useState("");
  const [newConfigValue, setNewConfigValue] = useState("");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [addConfigOpen, setAddConfigOpen] = useState(false);

  // Fetch bot projects
  useEffect(() => {
    if (!clientId) return;

    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const data = await PortalSdk.getData(`/api/custom-bots/bot-project?clientId=${clientId}`, {});
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0]);
          if (data[0].projectConfiguration) {
            setConfigKeys(Object.keys(data[0].projectConfiguration));
          }
        }
      } catch (error) {
        console.error("Error fetching bot projects:", error);
        toast.error("Failed to load bot projects")
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [clientId]);

  // Handle project selection
  const handleProjectSelect = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    setSelectedProject(project);
    
    // Fetch the latest config for the selected project
    try {
      const data = await PortalSdk.getData(`/api/custom-bots/bot-project/configs/${projectId}`, {});
      if (data.configs) {
        project.projectConfiguration = data.configs;
        setConfigKeys(Object.keys(data.configs));
      } else {
        setConfigKeys([]);
      }
    } catch (error) {
      console.error("Error fetching project configuration:", error);
      toast.error("Failed to load project configurations")
    }
  };

  // Create new bot project
  const handleCreateProject = async () => {
    if (!newProject.projectName || !clientId) return;
    
    try {
      const data = await PortalSdk.postData("/api/custom-bots/bot-project/create", {
        userId: clientId,
        projectName: newProject.projectName,
        projectDescription: newProject.projectDescription,
      });
      
      setProjects([...projects, data.botProject]);
      setCreateProjectOpen(false);
      setNewProject({ projectName: "", projectDescription: "" });
      toast.success("Bot project created successfully")
    } catch (error) {
      console.error("Error creating bot project:", error);
      toast.error("Failed to create bot project")
    }
  };

  // Create new client request
  const handleCreateRequest = async () => {
    if (!newRequest.requestTitle || !selectedProject) return;
    
    try {
      const data = await PortalSdk.postData("/api/custom-bots/client-requests/create", {
        requestTitle: newRequest.requestTitle,
        requestDescription: newRequest.requestDescription,
        clientId,
        botProjectId: selectedProject.id,
        assigneeId: newRequest.assigneeId || null,
      });
      
      // Update the selected project with the new request
      const updatedRequests = [...(selectedProject.clientRequests || []), data.bot];
      const updatedProject = { ...selectedProject, clientRequests: updatedRequests };
      setSelectedProject(updatedProject);
      
      // Update the projects list
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id ? updatedProject : p
      );
      setProjects(updatedProjects);
      
      setCreateRequestOpen(false);
      setNewRequest({ requestTitle: "", requestDescription: "", assigneeId: "" });
      toast.success("Client request created successfully")
    } catch (error) {
      console.error("Error creating client request:", error);
      toast.error("Failed to create client request")
    }
  };

  // Add or update configuration
  const handleAddConfig = async () => {
    if (!newConfigKey || !selectedProject) return;
    
    try {
      const data = await PortalSdk.putData("/api/custom-bots/bot-project/configs", {
        id: selectedProject.id,
        projectConfiguration: {
          [newConfigKey]: newConfigValue,
        },
      });
      
      // Update the selected project with the new configuration
      const updatedProject = { 
        ...selectedProject, 
        projectConfiguration: data.updatedProject.projectConfiguration 
      };
      setSelectedProject(updatedProject);
      
      // Update the projects list
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id ? updatedProject : p
      );
      setProjects(updatedProjects);
      setConfigKeys(Object.keys(data.updatedProject.projectConfiguration));
      
      setAddConfigOpen(false);
      setNewConfigKey("");
      setNewConfigValue("");
      toast.success("Configuration updated successfully")
    } catch (error) {
      console.error("Error updating configuration:", error);
      toast.error("Failed to update configurations")
    }
  };

  // Delete configuration key
  const handleDeleteConfig = async (key: string) => {
    if (!selectedProject) return;
    
    try {
      const data = await PortalSdk.deleteData("/api/custom-bots/bot-project/configs", {
        id: selectedProject.id,
        keysToDelete: [key],
      });
      
      // Update the selected project with the new configuration
      const updatedProject = { 
        ...selectedProject, 
        projectConfiguration: data.updatedProject.projectConfiguration 
      };
      setSelectedProject(updatedProject);
      
      // Update the projects list
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id ? updatedProject : p
      );
      setProjects(updatedProjects);
      setConfigKeys(Object.keys(data.updatedProject.projectConfiguration));
      toast.success("Configuration Key deleted successfully")
    } catch (error) {
      console.error("Error deleting configuration key:", error);
      toast.error("Failed to delete configuration key");
    }
  };

  // Refresh project data
  const refreshProjectData = async () => {
    if (!selectedProject) return;
    
    try {
      setIsLoading(true);
      const data = await PortalSdk.getData(`/api/custom-bots/bot-project?clientId=${clientId}`, {});
      setProjects(data);
      
      // Find and select the current project in the refreshed data
      const refreshedProject = data.find((p: BotProject) => p.id === selectedProject.id);
      if (refreshedProject) {
        setSelectedProject(refreshedProject);
        if (refreshedProject.projectConfiguration) {
          setConfigKeys(Object.keys(refreshedProject.projectConfiguration));
        }
      }
      toast.success("Project data refreshed")
    } catch (error) {
      console.error("Error refreshing project data:", error);
      toast.error("Failed to refresh project data");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UN_ASSIGNED": return "bg-gray-200 text-gray-800";
      case "IN_PROGRESS": return "bg-blue-200 text-blue-800";
      case "COMPLETED": return "bg-green-200 text-green-800";
      case "REJECTED": return "bg-red-200 text-red-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <p>Loading bot projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 space-y-6">
            <Toaster richColors position="top-right" duration={2000} closeButton theme="dark" />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bot Project Management</h1>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={refreshProjectData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Bot Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="projectName">Project Name</label>
                  <Input
                    id="projectName"
                    value={newProject.projectName}
                    onChange={(e) => setNewProject({ ...newProject, projectName: e.target.value })}
                    label="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="projectDescription">Description</label>
                  <Textarea
                    id="projectDescription"
                    value={newProject.projectDescription}
                    onChange={(e) => setNewProject({ ...newProject, projectDescription: e.target.value })}
                    label="Enter project description"
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleCreateProject}
                  disabled={!newProject.projectName}
                  className="w-full"
                >
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No Bot Projects Found</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6">Create your first bot project to get started</p>
            <Button onClick={() => setCreateProjectOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Project Selector */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Button
                      key={project.id}
                      variant={selectedProject?.id === project.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      {project.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Details and Management */}
          <div className="md:col-span-3">
            {selectedProject ? (
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="requests">Requests</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedProject.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Description</h3>
                        <p className="mt-1">{selectedProject.description || "No description provided"}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">GitHub Repository</h3>
                          <a 
                            href={selectedProject.githubRepoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-1 text-blue-600 hover:underline block truncate"
                          >
                            {selectedProject.githubRepoName}
                          </a>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Branch</h3>
                          <p className="mt-1">{selectedProject.githubRepoBranch}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Pull Request</h3>
                          <a 
                            href={selectedProject.prUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-1 text-blue-600 hover:underline block truncate"
                          >
                            {`#${selectedProject.prNumber}`}
                          </a>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Created</h3>
                          <p className="mt-1">
                            {new Date(selectedProject.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Stats</h3>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm font-medium text-gray-500">Total Requests</p>
                            <p className="text-2xl font-bold mt-1">
                              {selectedProject.clientRequests?.length || 0}
                            </p>
                          </div>
                          <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm font-medium text-gray-500">Config Keys</p>
                            <p className="text-2xl font-bold mt-1">
                              {configKeys.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Requests Tab */}
                <TabsContent value="requests">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Client Requests</CardTitle>
                      <Dialog open={createRequestOpen} onOpenChange={setCreateRequestOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            New Request
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Request</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label htmlFor="requestTitle">Request Title</label>
                              <Input
                                id="requestTitle"
                                label="Enter request title"
                                value={newRequest.requestTitle}
                                onChange={(e) => setNewRequest({ ...newRequest, requestTitle: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="requestDescription">Description</label>
                              <Textarea
                                id="requestDescription"
                                label="Enter request description"
                                value={newRequest.requestDescription}
                                onChange={(e) => setNewRequest({ ...newRequest, requestDescription: e.target.value })}
                                rows={4}
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="assigneeId">Assignee ID (Optional)</label>
                              <Input
                                id="assigneeId"
                                value={newRequest.assigneeId}
                                onChange={(e) => setNewRequest({ ...newRequest, assigneeId: e.target.value })}
                                label="Enter assignee ID"
                              />
                            </div>
                            <Button 
                              onClick={handleCreateRequest}
                              disabled={!newRequest.requestTitle}
                              className="w-full"
                            >
                              Create Request
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {selectedProject.clientRequests?.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead>PR</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedProject.clientRequests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell className="font-medium">{request.title}</TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(request.requestStatus)}>
                                    {request.requestStatus.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {request.assigneeId || "Unassigned"}
                                </TableCell>
                                <TableCell>
                                  <a 
                                    href={request.prUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    #{request.prNumber}
                                  </a>
                                </TableCell>
                                <TableCell>
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No requests found for this project</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setCreateRequestOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Request
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Configuration Tab */}
                <TabsContent value="config">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Project Configuration</CardTitle>
                      <Dialog open={addConfigOpen} onOpenChange={setAddConfigOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Config
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Configuration</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label htmlFor="configKey">Config Key</label>
                              <Input
                                id="configKey"
                                value={newConfigKey}
                                onChange={(e) => setNewConfigKey(e.target.value)}
                                label="Enter config key"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="configValue">Config Value</label>
                              <Input
                                id="configValue"
                                value={newConfigValue}
                                onChange={(e) => setNewConfigValue(e.target.value)}
                                label="Enter config value"
                              />
                            </div>
                            <Button 
                              onClick={handleAddConfig}
                              disabled={!newConfigKey}
                              className="w-full"
                            >
                              Save Configuration
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {configKeys.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Key</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead className="w-16">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {configKeys.map((key) => (
                              <TableRow key={key}>
                                <TableCell className="font-medium">{key}</TableCell>
                                <TableCell>
                                  {typeof selectedProject.projectConfiguration[key] === 'object' 
                                    ? JSON.stringify(selectedProject.projectConfiguration[key]) 
                                    : String(selectedProject.projectConfiguration[key])}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteConfig(key)}
                                  >
                                    <Trash className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8">
                          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No configuration found for this project</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setAddConfigOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Configuration
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No Project Selected</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Select a project from the sidebar or create a new one
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}