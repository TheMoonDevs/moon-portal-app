'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { CircularProgress } from '@mui/material';
import { Pointer, Reply } from '@prisma/client';
import { usePathname } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import ChatCard from './ChatCard';
import { ReplyBox } from './ReplyBox';

type PointerWithReplies = Pointer & { replies: Reply[] };

const fetcher = (url: string) =>
  PortalSdk.getData(url, null).then((res) => res.data);

const Pointers = () => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { user } = useUser();
  const path = usePathname();
  const { mutate } = useSWRConfig();

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const targetUserId = path ? (path.split('/').pop() ?? null) : null;

  const {
    data: pointers,
    error,
    isValidating,
  } = useSWR(
    targetUserId ? `/api/pointers?userId=${targetUserId}` : null,
    fetcher,
    { refreshInterval: 3000 },
  );

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [pointers]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    setIsSending(true);
    try {
      await PortalSdk.postData('/api/pointers', {
        userId: user?.id,
        targetUserId,
        content: inputValue,
      });
      setInputValue('');
      mutate(`/api/pointers?userId=${targetUserId}`);
    } catch (error) {
      console.error(error);
      toast.error('Error sending message.');
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, user?.id, targetUserId, mutate]);

  if (error) {
    toast.error('Error fetching messages.');
  }

  return (
    <div className="h-full">
      <div
        className="no-scrollbar h-[600px] max-h-[800px] overflow-y-auto rounded-lg border border-neutral-300 bg-neutral-50 p-3 pb-5 text-neutral-700"
        ref={chatContainerRef}
      >
        {isValidating && !pointers ? (
          <div className="flex h-full w-full items-center justify-center">
            <CircularProgress size={24} />
          </div>
        ) : pointers && pointers.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center text-neutral-400">
            No Messages Found!
          </div>
        ) : (
          pointers?.map((pointer: PointerWithReplies, index: number) => (
            <div key={pointer.id} className="flex flex-col gap-2">
              <ChatCard pointer={pointer} index={index} />
            </div>
          ))
        )}
      </div>
      <ReplyBox
        inputValue={inputValue}
        handleInputChange={handleInputChange}
        handleReplySend={handleSendMessage}
        isSending={isSending}
      />
      <Toaster richColors duration={3000} closeButton position="bottom-left" />
    </div>
  );
};

export default Pointers;
