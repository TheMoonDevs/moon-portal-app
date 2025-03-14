import { Message, useChat } from '@ai-sdk/react';
import { TMD_PORTAL_API_KEY } from '../constants/appInfo';
import { RequestMessage, UPDATEFROM } from '@prisma/client';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import {
  AttachedMedia,
  ClientRequest,
} from '@/components/screens/CustomBots/ChatWindow';
import { JsonValue } from '@prisma/client/runtime/library';

interface UseVercelChatProps {
  clientId: string;
  clientRequest: ClientRequest;
}

export interface IAdditionalData {
  clientId: string;
  media: Array<{
    mediaName: string;
    mediaType: string;
    mediaFormat: string;
    mediaUrl: string;
  }>;
  metadata?: JsonValue | null;
  githubUrl?: string;
}

const useVercelChat = ({ clientId, clientRequest }: UseVercelChatProps) => {
  const {
    messages,
    error,
    append,
    setMessages,
    setInput,
    input,
    handleInputChange,
  } = useChat({
    api: '/api/chat',
    onResponse: async (response) =>
      console.log('response', await response.json()),
    onError: (error) => console.log('error', error),
  });
  const [requestStatus, setRequestStatus] = useState(
    clientRequest?.requestStatus,
  );
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSlashModal, setShowSlashModal] = useState(false);

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

  const handleCustomInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleInputChange(e);
    if (e.target.value.startsWith('/')) {
      setShowSlashModal(true);
    } else {
      setShowSlashModal(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Map API response to bot response format
  const mapApiResponseToBotResponse = (apiResponse: RequestMessage) => {
    const { id, message, createdAt, media, updateType, updateFrom, metadata } =
      apiResponse;
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
        },
      ],
    } as Message;
  };

  // Fetch updates for this client request
  const {
    data: requestMessagesUpdate,
    mutate,
    isLoading,
    isValidating,
  } = useSWR(
    `/api/custom-bots/client-requests/update?requestId=${clientRequest.id}`,
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
    if (!sending && requestMessagesUpdate && !isValidating) {
      setMessages(
        requestMessagesUpdate.requestMessages.map(mapApiResponseToBotResponse),
      );
      setRequestStatus(requestMessagesUpdate.requestStatus);
    }
  }, [requestMessagesUpdate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to save messages to the database
  const saveMessageToDB = async (endpoint: string, formData: FormData) => {
    await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
    });
  };

  // Helper function to save CLIENT message to the database
  const saveClientMessageToDB = async () => {
    console.log('saveClientMessageToDB', input);
    const formData = new FormData();
    formData.append('originClientRequestId', clientRequest.id);
    formData.append('clientId', clientId);
    formData.append('message', input);
    // Append media files
    attachedMedia?.forEach((mediaObj) =>
      formData.append('file', mediaObj.file),
    );
    formData.append('userId', clientId);
    formData.append('uploadedByUserId', clientId);
    // Save user message to database
    await saveMessageToDB('/api/custom-bots/client-requests/chat', formData);
  };

  // Append user message and handle bot response
  const dupAppend = async (options?: { context?: string }) => {
    console.log('dupAppend', options);
    const isChatbot = options?.context === 'chatbot';
    if (sending) {
      toast.error('Last message is being sent. Please wait.');
      return;
    }

    if (isChatbot) {
      try {
        const res = await append({
          id: crypto.randomUUID(),
          role: UPDATEFROM.CLIENT as any,
          content: input,
          createdAt: new Date(),
          annotations: [
            {
              clientId,
              media:
                attachedMedia?.map((m) => ({
                  mediaName: m.file.name,
                  mediaType: m.file.type,
                  mediaFormat: m.file.name.split('.').pop() || 'file',
                  mediaUrl: m.preview,
                })) || [],
            },
          ],
        });

        //reset
        setInput('');
        // attachedMedia.forEach((media) => URL.revokeObjectURL(media.preview));
        setAttachedMedia([]);

        if (!res) return;

        setSending(true);

        // save client message to db
        await saveClientMessageToDB();

        // Save bot response to database
        const vercelBotFormData = new FormData();
        vercelBotFormData.append('originClientRequestId', clientRequest.id);
        vercelBotFormData.append('clientId', clientId);
        vercelBotFormData.append('message', res);
        vercelBotFormData.append('storeBotResponse', 'true');
        await saveMessageToDB(
          '/api/custom-bots/client-requests/chat',
          vercelBotFormData,
        );
      } catch (error) {
        console.error(error);
      } finally {
        setSending(false);
      }
    } else {
      const tempId = crypto.randomUUID();
      try {
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
                media:
                  attachedMedia?.map((m) => ({
                    mediaName: m.file.name,
                    mediaType: m.file.type,
                    mediaFormat: m.file.name.split('.').pop() || 'file',
                    mediaUrl: m.preview,
                  })) || [],
                clientId,
              },
            ],
          },
        ]);
        setInput('');
        attachedMedia.forEach((media) => URL.revokeObjectURL(media.preview));
        setAttachedMedia([]);

        setSending(true);

        // save client message to db
        await saveClientMessageToDB();
      } catch (error) {
        console.error(error);
        // Remove message if an error occurs
        setMessages((ms) => ms.filter((m) => m.id !== tempId));
      } finally {
        setSending(false);
      }
    }
  };

  return {
    handleInputChange,
    input,
    dupAppend,
    mutate,
    requestStatus,
    setRequestStatus,
    messages,
    isLoading,
    sending,
    isValidating,
    handleFileChange,
    removeMedia,
    attachedMedia,
    messagesEndRef,
    setShowSlashModal,
    showSlashModal,
    handleCustomInputChange,
  };
};

export default useVercelChat;
