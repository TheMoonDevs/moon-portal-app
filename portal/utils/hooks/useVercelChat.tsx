import { Message, useChat } from '@ai-sdk/react';
import { RequestMessage, UPDATEFROM } from '@prisma/client';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AttachedMedia,
  ClientRequest,
} from '@/components/screens/CustomBots/ChatWindow';
import { JsonValue } from '@prisma/client/runtime/library';
import { PortalSdk } from '../services/PortalSdk';

interface UseVercelChatProps {
  clientId: string;
  clientRequest: ClientRequest;
}

export interface IMediaPayloadType {
  mediaName: string;
  mediaType: string;
  mediaFormat: string;
  mediaUrl: string;
}

export interface IAdditionalData {
  clientId: string;
  media: IMediaPayloadType[];
  metadata?: JsonValue | null;
  githubUrl?: string;
}

type AgentType = 'BUILDBOT' | 'MICROFOX';
type ContextType = 'chatbot' | 'server';
type ServerStatusType = 'pending' | 'success' | 'error' | 'idle';

const useVercelChat = ({ clientId, clientRequest }: UseVercelChatProps) => {
  const {
    messages,
    error,
    append,
    setMessages,
    setInput,
    input,
    status,
    handleInputChange,
  } = useChat({
    api: '/api/chat',
    onResponse: async (response) => {
      try {
        // NOTE: THIS STORING OF BOT MESSAGES CAN ALSO BE
        // DONE ON THE BACKEND /API/CHAT INSIDE onFinish()
        const botResponse = await response.json();

        // Save bot response to database
        await PortalSdk.postData(
          '/api/custom-bots/client-requests/chat?messageType=chatbot',
          {
            originClientRequestId: clientRequest.id,
            clientId,
            message: botResponse.content,
            // CHANGE THIS: AGENT TYPE SHOULD COME FROM SERVER WITH BOT RESPONSE
            // This could be either in data or annotations
            agentType: botResponse.data[0].agentType,
          },
        );
      } catch (error) {
        console.log('error', error);
      }
    },
    onError: (error) => console.log('error', error),
  });

  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const [context, setContext] = useState<ContextType>('server');
  const [agentType, setAgentType] = useState<AgentType>();
  const [serverMessageStatus, setServerMessageStatus] =
    useState<ServerStatusType>('idle');

  const messageStatus = useMemo(
    () => (context === 'chatbot' ? status : serverMessageStatus),
    [context, status, serverMessageStatus],
  );

  // Mapper function to convert API response to bot response format
  const mapApiResponseToBotResponse = useCallback(
    (apiResponse: RequestMessage) => {
      const {
        id,
        message,
        createdAt,
        media,
        updateType,
        updateFrom,
        metadata,
      } = apiResponse;
      return {
        id,
        role: updateFrom as any,
        content: message,
        createdAt: createdAt,
        annotations: [
          {
            media,
            clientId,
            metadata,
            updateType,
            githubUrl: apiResponse.githubUrl,
            agentType: apiResponse.agentType,
          },
        ],
      } as Message;
    },
    [],
  );

  // Fetch updates for this client request
  const {
    data: requestMessagesUpdate,
    mutate,
    isLoading,
    isValidating,
  } = useSWR(
    `/api/custom-bots/client-requests/chat/update?requestId=${clientRequest.id}`,
    async (url) => {
      try {
        const res = await fetch(url);
        return res.json();
      } catch (err) {
        toast.error('Failed to fetch updates.');
        console.error('Fetch error:', err);
        return null;
      }
    },
  );

  // Initialize messages when updates are fetched
  useEffect(() => {
    if (
      !(messageStatus === 'pending' || messageStatus === 'streaming') &&
      requestMessagesUpdate &&
      !isValidating
    ) {
      setMessages(
        requestMessagesUpdate.requestMessages.map(mapApiResponseToBotResponse),
      );
      // setRequestStatus(requestMessagesUpdate.requestStatus);
    }
  }, [requestMessagesUpdate]);

  const { data: prUpdates } = useSWR(
    `/api/custom-bots/client-requests/chat/pr-updates?requestId=${clientRequest.id}`,
    async (url) => {
      try {
        const res = await fetch(url);
        return res.json();
      } catch (err) {
        toast.error('Failed to fetch updates.');
        console.error('Fetch error:', err);
        return null;
      }
    },
    { refreshInterval: 1000 },
  );

  useEffect(() => {
    if (prUpdates) {
      setMessages(prUpdates.requestMessages.map(mapApiResponseToBotResponse));
    }
  }, [prUpdates]);

  // Append user message and handle bot response
  const customAppend = useCallback(
    async (options: {
      context?: ContextType;
      agentType?: AgentType;
      data?: {
        mediaPayload?: Array<{
          mediaName: string;
          mediaType: string;
          mediaFormat: string;
          mediaUrl: string;
        }>;
      };
    }) => {
      const messageContext = options?.context || context;
      const requestedAgentType = agentType || options?.agentType;
      const mediaPayload = options?.data?.mediaPayload;

      // if (sending) {
      //   toast.error('Last message is being sent. Please wait.');
      //   return;
      // }

      if (messageContext === 'chatbot') {
        try {
          append({
            id: crypto.randomUUID(),
            role: UPDATEFROM.CLIENT as any,
            content: input,
            createdAt: new Date(),
            annotations: [
              {
                clientId,
                media: mediaPayload || [],
                ...(requestedAgentType && { requestedAgentType }),
              },
            ],
          });

          // save client message to db
          await PortalSdk.postData('/api/custom-bots/client-requests/chat', {
            originClientRequestId: clientRequest.id,
            clientId,
            message: input,
            mediaPayload,
          });

          //reset
          setInput('');
          // attachedMedia.forEach((media) => URL.revokeObjectURL(media.preview));
          setAttachedMedia([]);
        } catch (error) {
          console.error(error);
        }
      } else {
        const tempId = crypto.randomUUID();
        try {
          setServerMessageStatus('pending');
          // Append user message locally
          setMessages((ms) => [
            ...ms,
            {
              id: tempId,
              role: UPDATEFROM.CLIENT as any,
              content: input,
              createdAt: new Date(),
              annotations: [
                {
                  media: mediaPayload || [],
                  clientId,
                },
              ],
            },
          ]);
          setInput('');
          attachedMedia.forEach((media) => URL.revokeObjectURL(media.preview));
          setAttachedMedia([]);
          // save client message to db
          await PortalSdk.postData('/api/custom-bots/client-requests/chat', {
            originClientRequestId: clientRequest.id,
            clientId,
            message: input,
            mediaPayload,
          });
          setServerMessageStatus('success');
        } catch (error) {
          console.error(error);
          setServerMessageStatus('error');
          // Remove message if an error occurs
          setMessages((ms) => ms.filter((m) => m.id !== tempId));
        } finally {
          setServerMessageStatus('idle');
        }
      }
    },
    [input, context, agentType],
  );

  return {
    input,
    customAppend,
    mutate,
    messages,
    messageStatus,
    isLoading,
    isValidating,
    setAttachedMedia,
    attachedMedia,
    handleInputChange,
    context,
    setContext,
    agentType,
    setAgentType,
  };
};

export default useVercelChat;
