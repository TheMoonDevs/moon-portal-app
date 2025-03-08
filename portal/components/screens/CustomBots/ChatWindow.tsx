'use client';

import { useState, useEffect, useRef } from 'react';
import { ButtonSCN } from '@/components/elements/Button';
import { Send, RefreshCw, User, Bot, GitPullRequest } from 'lucide-react';
import { Skeleton } from '@mui/material';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/elements/Tab';
import { PortalSdk } from '@/utils/services/PortalSdk';
import useSWR from 'swr';
import { UPDATEFROM } from '@prisma/client';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Badge } from '@/components/elements/badge';

type RequestMessage = {
  id: string;
  message: string;
  updateType: string;
  updateFrom: UPDATEFROM;
  createdAt: string;
  githubUrl?: string;
};

type ClientRequest = {
  id: string;
  title: string;
  requestStatus: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: requestMessages,
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

  useEffect(() => {
    if (requestMessages) {
      setUpdates(requestMessages.requestMessages);
      setRequestStatus(requestMessages.requestStatus);
    }
  }, [isValidating]);

  useEffect(() => {
    scrollToBottom();
  }, [updates]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessage: RequestMessage = {
      id: crypto.randomUUID(),
      message: message.trim(),
      updateType: 'text',
      updateFrom: UPDATEFROM.CLIENT,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI Update
    setUpdates((prev) => [...prev, newMessage]);
    setMessage('');
    scrollToBottom();

    setSending(true);
    try {
      await PortalSdk.postData('/api/custom-bots/client-requests/chat', {
        originClientRequestId: clientRequest.id,
        clientId: clientId,
        message: newMessage.message,
      });

      mutate(); // Refresh SWR cache
    } catch (error) {
      toast.error('Failed to send message.');
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
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

  // Mapping of REQUESTSTATUS to badge variant and color
  const statusVariantMapping: Record<
    string,
    { variant: string; color: string }
  > = {
    UN_ASSIGNED: { variant: 'secondary', color: '#a4a7ae' }, // Gray
    IN_DEVELOPMENT: { variant: 'default', color: '#3b82f6' }, // Blue
    IN_REVIEW: { variant: 'warning', color: '#f59e0b' }, // Amber
    CLOSED: { variant: 'error', color: '#ef4444' }, // Red
    COMPLETED: { variant: 'success', color: '#10b981' }, // Green
  };

  // Format date separators
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
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            {clientRequest.title}
            <Badge
              variant={
                statusVariantMapping[requestStatus]?.variant ||
                ('default' as any)
              }
              style={{
                backgroundColor: statusVariantMapping[requestStatus]?.color,
                marginLeft: '0.5rem',
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
            updates?.map((update, index) => (
              <>
                {renderDateSeparator(
                  update.createdAt,
                  updates[index - 1]?.createdAt,
                )}

                {update.updateFrom === UPDATEFROM.SYSTEM ? (
                  <div
                    key={update.id}
                    className="my-2 text-center text-xs text-gray-600"
                  >
                    {update.message} •{' '}
                    {dayjs(update.createdAt).format('h:mm A')}
                  </div>
                ) : (
                  <div
                    key={update.id}
                    className={`flex items-start gap-3 ${
                      update.updateFrom === UPDATEFROM.CLIENT
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
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
                          : update.updateFrom}
                      </p>
                      <p>{update.message}</p>
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
              </>
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
          ) : updates?.filter(
              (update) => update.updateFrom === UPDATEFROM.SYSTEM,
            ).length > 0 ? (
            updates
              ?.filter((update) => update.updateFrom === UPDATEFROM.SYSTEM)
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
            <div className="flex gap-2">
              <textarea
                placeholder="Type your message..."
                className="w-full resize-none rounded-lg border p-2 outline-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && sendMessage()
                }
                disabled={sending}
              />
              <ButtonSCN
                onClick={sendMessage}
                disabled={!message.trim() || sending}
              >
                <Send className="my-auto h-4 w-4" />
              </ButtonSCN>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}
