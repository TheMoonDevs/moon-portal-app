'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  RefreshCw,
  User,
  Bot,
  GitPullRequest,
  FilePlus,
  FileText,
  Mail,
  Instagram,
  Slack,
  Twitter,
  Youtube,
  Settings,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { Skeleton } from '@mui/material';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/elements/Tab';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Badge } from '@/components/elements/badge';
import useSWR from 'swr';
import { UPDATEFROM } from '@prisma/client';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { ButtonSCN } from '@/components/elements/Button';
import { useClientBots } from './ClientBotProvider';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

type RequestMessage = {
  id: string;
  message: string;
  updateType: string;
  updateFrom: UPDATEFROM;
  createdAt: string;
  githubUrl?: string;
  media?: {
    mediaName: string;
    mediaType: string;
    mediaFormat: string;
    mediaUrl: string;
  }[];
};

type ClientRequest = {
  id: string;
  title: string;
  requestStatus: string;
  mentionedClientBotIds: string[];
};

type AttachedMedia = {
  file: File;
  preview: string;
};

type BotTemplate = {
  id: string;
  clientId?: string;
  type: string;
  name: string;
  requiredKeys: Array<{
    mode: Array<'DEV' | 'PROD' | 'STAGING'>;
    isOptional: boolean;
    key: string;
    placeholder: string;
  }>;
};

type BotVariable = {
  mode: Array<'DEV' | 'PROD' | 'STAGING'>;
  key: string;
  value: string;
  isOptional: boolean;
};

export default function ChatWindow({
  clientId,
  clientRequest,
}: {
  clientId: string;
  clientRequest: ClientRequest;
}) {
  // Chat state
  const [updates, setUpdates] = useState<RequestMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [requestStatus, setRequestStatus] = useState(
    clientRequest?.requestStatus,
  );
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showSlashModal, setShowSlashModal] = useState(false);
  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [customVariables, setCustomVariables] = useState<BotVariable[]>([]);

  // Global add bot modal states (for selecting a template and filling variables)
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(
    null,
  );
  const [newClientBotName, setNewClientBotName] = useState('');
  const [botVariables, setBotVariables] = useState<BotVariable[]>([]);

  // Fetch client bot templates for the current client.
  const { data: templates } = useSWR<BotTemplate[]>(
    `/api/custom-bots/client-bots/template?clientId=${clientId}`,
    (url: string) => fetch(url).then((res) => res.json()),
  );

  // Fetch updates for this client request.
  const {
    data: requestMessagesUpdate,
    isValidating,
    isLoading,
    mutate,
  } = useSWR(
    `/api/custom-bots/client-requests/update?requestId=${clientRequest.id}`,
    (url) =>
      fetch(url)
        .then((res) => res.json())
        .catch((err) => {
          toast.error('Failed to fetch updates.');
          console.error('Fetch error:', err);
          return null;
        }),
  );

  // Get client bots from our global provider.
  const { clientBots, refreshClientBots, isLoading: clientBotsLoading } = useClientBots();

  // Update messages when new updates are fetched.
  useEffect(() => {
    if (!sending && requestMessagesUpdate && !isValidating) {
      setUpdates(requestMessagesUpdate.requestMessages);
      setRequestStatus(requestMessagesUpdate.requestStatus);
    }
  }, [isValidating, requestMessagesUpdate, sending]);

  useEffect(() => {
    scrollToBottom();
  }, [updates]);

  // Reload client data when specific operations are completed
  const reloadClientData = async () => {
    try {
      await refreshClientBots();
      await mutate();
    } catch (error) {
      console.error('Error reloading client data:', error);
    }
  };

  // When the message input starts with '/', show the slash modal.
  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.startsWith('/')) {
      setShowSlashModal(true);
    } else {
      setShowSlashModal(false);
    }
  };

  const sendMessage = async () => {
    if (sending) {
      toast.error('Last message is being sent. Please wait.');
      return;
    }
    if (!message.trim() && attachedMedia.length === 0) return;

    const tempId = crypto.randomUUID();
    const newMessage: RequestMessage = {
      id: tempId,
      message: message.trim() || 'Attached media',
      media: attachedMedia.map((m) => ({
        mediaName: m.file.name,
        mediaType: m.file.type,
        mediaFormat: m.file.name.split('.').pop() || 'file',
        mediaUrl: m.preview,
      })),
      updateType: 'text',
      updateFrom: UPDATEFROM.CLIENT,
      createdAt: new Date().toISOString(),
    };

    setUpdates((prev) => [...prev, newMessage]);
    setMessage('');
    attachedMedia.forEach((media) => URL.revokeObjectURL(media.preview));
    setAttachedMedia([]);
    scrollToBottom();

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('originClientRequestId', clientRequest.id);
      formData.append('clientId', clientId);
      formData.append('message', newMessage.message);
      attachedMedia.forEach((mediaObj) => {
        formData.append('file', mediaObj.file);
      });
      formData.append('userId', clientId);
      formData.append('uploadedByUserId', clientId);

      const res = await fetch('/api/custom-bots/client-requests/chat', {
        method: 'POST',
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });
      if (!res.ok) throw new Error('Failed to send message');
      await res.json();
      mutate();
    } catch (error) {
      setUpdates((prev) => prev.filter((msg) => msg.id !== tempId));
      toast.error('Failed to send message.');
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newMedia = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setAttachedMedia((prev) => [...prev, ...newMedia]);
      e.target.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setAttachedMedia((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessageIcon = (updateFrom: UPDATEFROM) => {
    switch (updateFrom) {
      case UPDATEFROM.CLIENT:
        return <User className="h-5 w-5" />;
      case UPDATEFROM.BOT:
        return <Bot className="h-5 w-5" />;
      case UPDATEFROM.SYSTEM:
        return <GitPullRequest className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getMessageClass = (updateFrom: UPDATEFROM) => {
    switch (updateFrom) {
      case UPDATEFROM.CLIENT:
        return 'bg-blue-500 text-white';
      case UPDATEFROM.BOT:
        return 'bg-gray-200 text-black';
      case UPDATEFROM.SYSTEM:
        return 'bg-gray-300 text-gray-700 text-center italic';
      default:
        return 'bg-gray-100 text-black';
    }
  };

  const statusVariantMapping: Record<
    string,
    { variant: string; color: string }
  > = {
    UN_ASSIGNED: { variant: 'secondary', color: '#a4a7ae' },
    IN_DEVELOPMENT: { variant: 'default', color: '#3b82f6' },
    IN_REVIEW: { variant: 'warning', color: '#f59e0b' },
    CLOSED: { variant: 'error', color: '#ef4444' },
    COMPLETED: { variant: 'success', color: '#10b981' },
  };

  const renderDateSeparator = (currentDate: string, prevDate?: string) => {
    if (!prevDate || !dayjs(currentDate).isSame(prevDate, 'day')) {
      return (
        <div className="my-2 text-center text-xs font-semibold text-gray-500">
          {dayjs(currentDate).format('DD MMM YYYY')}
        </div>
      );
    }
    return null;
  };

  // Returns an icon component based on the service type.
  const getTemplateIcon = (type?: string) => {
    switch (type) {
      case 'DISCORD':
        return <MessageCircle className="mr-2 h-5 w-5" />;
      case 'EMAIL':
        return <Mail className="mr-2 h-5 w-5" />;
      case 'INSTAGRAM':
        return <Instagram className="mr-2 h-5 w-5" />;
      case 'SLACK':
        return <Slack className="mr-2 h-5 w-5" />;
      case 'TELEGRAM':
        return <Send className="mr-2 h-5 w-5" />;
      case 'X':
        return <Twitter className="mr-2 h-5 w-5" />;
      case 'WHATSAPP':
        return <Phone className="mr-2 h-5 w-5" />;
      case 'YOUTUBE':
        return <Youtube className="mr-2 h-5 w-5" />;
      default:
        return <Settings className="mr-2 h-5 w-5" />; // For CUSTOM or undefined types.
    }
  };

  // --- Handlers for the slash modal ---
  // When user clicks a client bot from the slash modal, you could attach its info to the message.
  const handleSelectClientBot = async (botId: string) => {
    try {
      await PortalSdk.putData('/api/custom-bots/client-bots', {
        id: botId,
        clientRequestId: clientRequest.id,
      });
      toast.success('Bot added to this request successfully!');
      setShowSlashModal(false);
      await reloadClientData();
    } catch (error) {
      toast.error('Failed to add bot to request.');
      console.error('Error:', error);
    }
  };

  // Handle removing a client bot from the request (not deleting the bot itself)
  const handleRemoveClientBot = async (botId: string) => {
    try {
      await PortalSdk.deleteData(
        `/api/custom-bots/client-bots?id=${botId}&clientRequestId=${clientRequest.id}&removeOnly=true`,
        {},
      );
      toast.success('Bot removed from this request successfully!');
      await reloadClientData();
    } catch (error) {
      toast.error('Failed to remove bot from request.');
      console.error('Error removing bot from request:', error);
    }
  };

  // --- Handlers for the global Add ClientBot modal ---
  // When the user selects a template from the list, initialize botVariables from the template's requiredKeys.
  const handleSelectTemplate = (template: BotTemplate) => {
    setSelectedTemplate(template);
    const initialVariables = template.requiredKeys.map((req) => ({
      mode: req.mode, // default to all allowed modes; user can adjust if needed
      key: req.key,
      value: '',
      isOptional: req.isOptional,
    }));
    setBotVariables(initialVariables);
  };

  // Update a variable field by index.
  const handleVariableChange = (
    index: number,
    field: 'value' | 'mode' | 'isOptional',
    newValue: any,
  ) => {
    setBotVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: newValue } : v)),
    );
  };

  // Add a new empty custom variable
  const handleAddCustomVariable = () => {
    setCustomVariables((prev) => [
      ...prev,
      {
        mode: ['DEV', 'PROD', 'STAGING'],
        key: '',
        value: '',
        isOptional: false,
      },
    ]);
  };

  // Update a custom variable by index
  const handleCustomVariableChange = (
    index: number,
    field: 'key' | 'value' | 'mode' | 'isOptional',
    newValue: any,
  ) => {
    setCustomVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: newValue } : v)),
    );
  };

  // Remove a custom variable by index
  const handleRemoveCustomVariable = (index: number) => {
    setCustomVariables((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit new client bot including custom variables
  const handleSaveClientBot = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template.');
      return;
    }

    // Merge template-defined variables with custom ones
    const allVariables = [...botVariables, ...customVariables];

    // Ensure unique keys
    const keysSet = new Set();
    for (const varObj of allVariables) {
      if (!varObj.key.trim()) {
        toast.error(`Please provide a key name for all variables.`);
        return;
      }
      if (keysSet.has(varObj.key)) {
        toast.error(`Duplicate key found: ${varObj.key}`);
        return;
      }
      keysSet.add(varObj.key);
    }

    try {
      await PortalSdk.postData('/api/custom-bots/client-bots', {
        botProjectId: clientRequest.id,
        clientId,
        type: selectedTemplate.type,
        variables: allVariables,
        name: newClientBotName || selectedTemplate.name,
        clientRequestId: clientRequest.id,
      });
      toast.success('New Bot keys added successfully!');
      setShowAddBotModal(false);
      setSelectedTemplate(null);
      setBotVariables([]);
      setCustomVariables([]);
      await reloadClientData();
    } catch (error) {
      toast.error('Error creating client bot.');
      console.error(error);
    }
  };

  return (
    <div className="relative flex h-full max-h-screen min-h-screen flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="w-fit">
          <h2 className="flex flex-wrap items-center justify-start gap-2 font-semibold">
            {clientRequest.title}
            <Badge
              variant={
                (statusVariantMapping[requestStatus]?.variant as any) ||
                'default'
              }
              style={{
                backgroundColor: statusVariantMapping[requestStatus]?.color,
                fontSize: '0.75rem',
              }}
            >
              {requestStatus}
            </Badge>
          </h2>
          <p className="text-sm text-gray-500">
            Request ID: {clientRequest.id}
          </p>
        </div>
        <ButtonSCN
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`my-auto h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}
          />
          {isValidating ? 'Refreshing...' : 'Refresh'}
        </ButtonSCN>
      </div>

      {/* Button to open Add ClientBot modal manually (if not using slash) */}
      {/* <div className="border-b px-4 py-2">
        <ButtonSCN onClick={() => setShowAddBotModal(true)}>
          + Add New ClientBot
        </ButtonSCN>
      </div> */}

      {/* Chat Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="relative flex max-h-screen flex-1 flex-col overflow-y-auto"
      >
        <div className="w-full border-b px-4">
          <TabsList className="flex w-full justify-evenly gap-4">
            <TabsTrigger className="w-full" value="chat">
              Chat
            </TabsTrigger>
            <TabsTrigger className="w-full" value="history">
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="chat"
          className="h-full max-h-[70vh] flex-1 space-y-4 overflow-y-auto p-4"
        >
          {isLoading ? (
            <Skeleton variant="rectangular" width="100%" height={200} />
          ) : updates?.length > 0 ? (
            updates.map((update, index) => (
              <div key={update.id}>
                {renderDateSeparator(
                  update.createdAt,
                  updates[index - 1]?.createdAt,
                )}
                {update.updateFrom === UPDATEFROM.SYSTEM ? (
                  <div className="my-2 text-center text-xs text-gray-600">
                    {update.message} •{' '}
                    {dayjs(update.createdAt).format('h:mm A')}
                  </div>
                ) : (
                  <div
                    className={`flex items-start gap-3 ${update.updateFrom === UPDATEFROM.CLIENT ? 'justify-end' : 'justify-start'}`}
                  >
                    {update.updateFrom !== UPDATEFROM.CLIENT && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                        {getMessageIcon(update.updateFrom)}
                      </div>
                    )}
                    <div
                      className={`relative max-w-xs rounded-lg p-3 pb-4 sm:max-w-md ${getMessageClass(update.updateFrom)}`}
                    >
                      <p className="text-sm font-bold">
                        {update.updateFrom === UPDATEFROM.CLIENT
                          ? 'You'
                          : update.updateFrom === UPDATEFROM.COMMENT
                            ? 'Developer'
                            : update.updateFrom}
                      </p>
                      <p>{update.message}</p>
                      {update.media && (
                        <div className="mt-2 flex flex-wrap justify-evenly gap-2">
                          {update.media.map((m, idx) =>
                            m?.mediaType?.startsWith('image') ? (
                              <img
                                key={idx}
                                src={m.mediaUrl}
                                alt={m.mediaName}
                                className={`rounded object-cover ${update.updateFrom === UPDATEFROM.CLIENT ? 'max-h-60' : 'max-h-20'}`}
                              />
                            ) : (
                              <a key={idx} href={m.mediaUrl} target="_blank">
                                <span className="flex items-center gap-1">
                                  <FileText className="h-12 w-12 text-gray-600" />
                                  {m.mediaName}
                                </span>
                              </a>
                            ),
                          )}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-2 text-[10px] ${update.updateFrom === UPDATEFROM.CLIENT ? 'text-white' : 'text-gray-500'}`}
                      >
                        {dayjs(update.createdAt).format('h:mm A')}
                      </span>
                    </div>
                    {update.updateFrom === UPDATEFROM.CLIENT && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
                        {getMessageIcon(update.updateFrom)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500">
              No messages yet. Start the conversation!
            </div>
          )}
          <div ref={messagesEndRef} />
        </TabsContent>

        <TabsContent
          value="history"
          className="flex-1 space-y-4 overflow-y-auto p-4"
        >
          {isLoading ? (
            <Skeleton variant="rectangular" width="100%" height={200} />
          ) : updates.filter(
              (update) => update.updateFrom === UPDATEFROM.SYSTEM,
            ).length > 0 ? (
            updates
              .filter((update) => update.updateFrom === UPDATEFROM.SYSTEM)
              .map((update) => (
                <a
                  key={update.id}
                  href={update.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-lg bg-gray-100 p-4 hover:bg-gray-200"
                >
                  <p className="font-semibold">System Update</p>
                  <p>{update.message}</p>
                </a>
              ))
          ) : (
            <div className="text-center text-gray-500">
              No system updates yet.
            </div>
          )}
        </TabsContent>

        {activeTab === 'chat' && (
          <div className="absolute bottom-0 right-0 w-full border-t bg-white p-4">
            {attachedMedia.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedMedia.map((media, index) => (
                  <div key={index} className="relative">
                    {media.file.type.startsWith('image/') ? (
                      <img
                        src={media.preview}
                        alt={media.file.name}
                        className="h-16 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-100">
                        <FileText className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-xs text-white"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex h-fit items-end gap-2">
              <textarea
                placeholder="Type your message... (start with '/' to choose a ClientBot)"
                className="w-full resize-none rounded-lg border p-2 outline-none"
                value={message}
                onChange={handleTextAreaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    sendMessage();
                  }
                }}
                disabled={sending}
              />
              <ButtonSCN
                onClick={sendMessage}
                disabled={
                  (!message.trim() && attachedMedia.length === 0) || sending
                }
              >
                {!sending ? (
                  <Send className="my-auto h-4 w-4" />
                ) : (
                  <RefreshCw className="my-auto h-4 w-4 animate-spin" />
                )}
              </ButtonSCN>
              <ButtonSCN onClick={() => fileInputRef.current?.click()}>
                <FilePlus className="my-auto h-4 w-4" />
              </ButtonSCN>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}
      </Tabs>

      {/* Slash Modal: Opened when input starts with '/' */}
      {showSlashModal && (
        <div className="absolute bottom-20 left-4 z-20 w-11/12 max-w-md rounded-lg bg-white p-4 shadow-lg">
          <div className="flex flex-col gap-2">
            {clientBotsLoading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2">Loading bots...</span>
              </div>
            ) : clientBots && clientBots.length > 0 ? (
              <>
                <h2 className="text-sm">Bots used in this request</h2>
                {clientBots
                  .filter((bot) =>
                    bot.clientRequestIds.includes(clientRequest?.id),
                  )
                  .map((bot) => (
                    <div
                      key={`${bot.id}`}
                      className="flex items-center justify-between gap-2 rounded bg-gray-200 p-2"
                    >
                      <div className="flex items-center gap-2">
                        {getTemplateIcon(bot.type)} {bot.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveClientBot(bot.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                          <path
                            fillRule="evenodd"
                            d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                <h2 className="text-sm">Add your Bots to this request</h2>
                {clientBots
                  .filter(
                    (bot) =>
                      !bot.clientRequestIds.includes(clientRequest?.id),
                  )
                  .map((bot) => (
                    <div
                      key={`${bot.id}`}
                      className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-100"
                      onClick={() => handleSelectClientBot(bot.id)}
                    >
                      {getTemplateIcon(bot.type)} {bot.name}
                    </div>
                  ))}
              </>
            ) : (
              <div className="text-sm text-gray-500">No bots found.</div>
            )}
            <button
              className="mt-2 rounded bg-blue-500 p-2 text-white"
              onClick={() => {
                setShowSlashModal(false);
                setShowAddBotModal(true);
              }}
            >
              + Create New Bot
            </button>
          </div>
        </div>
      )}

      {/* Global Add ClientBot Modal */}
      {showAddBotModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-11/12 max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h4 className="mb-4 text-lg font-bold">Add New ClientBot</h4>
            {!selectedTemplate ? (
              // List available templates for selection
              <>
                <p className="mb-2">Select a template:</p>
                <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
                  {templates && templates.length > 0 ? (
                    templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-100"
                        onClick={() => handleSelectTemplate(tpl)}
                      >
                        {getTemplateIcon(tpl.type)} {tpl.name}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">
                      No templates available.
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="rounded bg-gray-200 px-4 py-2"
                    onClick={() => setShowAddBotModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              // Show form to fill in required keys from the selected template.
              <>
                <label className="block font-medium">Bot Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded border p-2"
                  placeholder={selectedTemplate.name}
                  value={newClientBotName || selectedTemplate.name || ''}
                  onChange={(e) => setNewClientBotName(e.target.value)}
                />
                <h5 className="my-2 font-semibold">Fill in variables</h5>
                {selectedTemplate.requiredKeys.map((req, index) => (
                  <div key={req.key} className="mb-4">
                    <label className="block font-medium">{req.key}</label>
                    <small className="block text-xs text-gray-500">
                      Example: {req.placeholder} (Modes: {req.mode.join(', ')})
                    </small>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      placeholder={req.placeholder}
                      value={botVariables[index]?.value || ''}
                      onChange={(e) =>
                        handleVariableChange(index, 'value', e.target.value)
                      }
                    />
                    <div className="mt-1">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={botVariables[index]?.isOptional}
                          onChange={(e) =>
                            handleVariableChange(
                              index,
                              'isOptional',
                              e.target.checked,
                            )
                          }
                        />
                        Optional
                      </label>
                    </div>
                  </div>
                ))}
                <div className="mb-4">
                  <h5 className="mb-2 font-semibold">Custom Variables</h5>
                  {customVariables.map((customVar, index) => (
                    <div key={index} className="mb-2 flex items-center gap-2">
                      <input
                        type="text"
                        className="w-1/3 rounded border p-2"
                        placeholder="Key"
                        value={customVar.key}
                        onChange={(e) =>
                          handleCustomVariableChange(
                            index,
                            'key',
                            e.target.value,
                          )
                        }
                      />
                      <input
                        type="text"
                        className="w-1/2 rounded border p-2"
                        placeholder="Value"
                        value={customVar.value}
                        onChange={(e) =>
                          handleCustomVariableChange(
                            index,
                            'value',
                            e.target.value,
                          )
                        }
                      />
                      <button
                        className="rounded bg-red-500 px-2 py-1 text-white"
                        onClick={() => handleRemoveCustomVariable(index)}
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button
                    className="mt-2 rounded bg-gray-300 p-2"
                    onClick={handleAddCustomVariable}
                  >
                    + Add Custom Variable
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded bg-gray-200 px-4 py-2"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setBotVariables([]);
                    }}
                  >
                    Back
                  </button>
                  <button
                    className="rounded bg-green-500 px-4 py-2 text-white"
                    onClick={handleSaveClientBot}
                  >
                    Save ClientBot
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
