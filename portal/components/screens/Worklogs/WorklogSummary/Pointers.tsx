'use client';
import type { Pointer, Reply } from '@db/client';
import { CircularProgress } from '@mui/material';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';

import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

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
        className="h-screen-minus-340 overflow-y-auto rounded-lg p-3 text-neutral-700"
        ref={chatContainerRef}
      >
        {isValidating && !pointers ? (
          <div className="flex size-full items-center justify-center">
            <CircularProgress size={24} />
          </div>
        ) : pointers && pointers.length === 0 ? (
          <div className="flex size-full flex-col items-center text-neutral-400">
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
