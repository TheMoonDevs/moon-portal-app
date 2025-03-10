'use client';

import { useState, useEffect, useRef } from 'react';
import { ButtonSCN } from '@/components/elements/Button';
import {
  Send,
  RefreshCw,
  User,
  Bot,
  GitPullRequest,
  FilePlus,
  FileText,
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
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import useSWR from 'swr';
import { UPDATEFROM } from '@prisma/client';

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
};

type AttachedMedia = {
  file: File;
  preview: string;
};

export default function ChatWindow({
  clientId,
  clientRequest,
}: {
  clientId: string;
  clientRequest: ClientRequest;
}) {
  const [updates, setUpdates] = useState<RequestMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [requestStatus, setRequestStatus] = useState(
    clientRequest?.requestStatus,
  );
  const [showCommandModal, setShowCommandModal] = useState(false);
  // State for attached media files with preview URLs
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Available slash commands
  const slashCommands = [
    { command: '/help', description: 'Show help information' },
    { command: '/upload', description: 'Trigger file upload' },
    { command: '/clear', description: 'Clear chat history' },
  ];

  const {
    data: requestMessagesUpdate,
    error,
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

  // Only update local state if no chat request is in progress.
  useEffect(() => {
    if (!sending && requestMessagesUpdate && !isValidating) {
      setUpdates(requestMessagesUpdate.requestMessages);
      setRequestStatus(requestMessagesUpdate.requestStatus);
    }
  }, [isValidating, requestMessagesUpdate, sending]);

  useEffect(() => {
    scrollToBottom();
  }, [updates]);

  const sendMessage = async () => {
    if (sending) {
      toast.error('Last Message is being sent. Please wait.');
      return;
    }
    if (!message.trim() && attachedMedia.length === 0) return;

    // Create optimistic message with a temporary id.
    const tempId = crypto.randomUUID();
    const newMessage: RequestMessage = {
      id: tempId,
      message: message.trim() || 'Attached media',
      media: attachedMedia.map((m) => ({
        mediaName: m.file.name,
        mediaType: m.file.type,
        mediaFormat: m.file.name.split('.').pop() || 'file',
        mediaUrl: m.preview, // temporary URL; final URL will come from API
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
      if (!res.ok) {
        throw new Error('Failed to send message');
      }
      await res.json();
      // Update messages from the API response.
      mutate();
    } catch (error) {
      // Roll back optimistic message if sending fails.
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

  return (
    <div className="flex h-full max-h-screen min-h-screen flex-col overflow-y-auto">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="w-fit">
          <h2 className="flex flex-wrap items-center justify-start gap-2 font-semibold">
            {clientRequest.title}
            <Badge
              variant={
                statusVariantMapping[requestStatus]?.variant ||
                ('default' as any)
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
                placeholder="Type your message..."
                className="w-full resize-none rounded-lg border p-2 outline-none"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setShowCommandModal(e.target.value.startsWith('/'));
                }}
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
                  <RefreshCw className={`my-auto h-4 w-4 animate-spin`} />
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
            {showCommandModal && (
              <div className="absolute bottom-16 left-4 z-10 rounded-lg bg-white p-4 shadow-lg">
                <h4 className="mb-2 font-bold">Commands</h4>
                <ul>
                  {slashCommands.map((cmd) => (
                    <li
                      key={cmd.command}
                      className="cursor-pointer p-2 hover:bg-gray-100"
                      onClick={() => {
                        setMessage(cmd.command + ' ');
                        setShowCommandModal(false);
                      }}
                    >
                      <span className="font-mono">{cmd.command}</span> -{' '}
                      {cmd.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
