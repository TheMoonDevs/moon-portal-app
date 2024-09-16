'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { CircularProgress } from '@mui/material';
import { Pointer, Reply } from '@prisma/client';
import { usePathname } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import ChatCard from './ChatCard';
import { ReplyBox } from './ReplyBox';

type PointerWithReplies = Pointer & { replies: Reply[] };

const Pointers = () => {
  const [inputValue, setInputValue] = useState('');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pointers, setPointers] = useState<PointerWithReplies[]>([]);
  const { user } = useUser();
  const path = usePathname();

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (path) {
      const pathSegments = path.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1];
      setTargetUserId(lastSegment);
    }
  }, [path]);

  useEffect(() => {
    if (targetUserId) {
      getPointers();
    }
  }, [targetUserId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [pointers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;
    setIsSending(true);
    try {
      await PortalSdk.postData('/api/pointers', {
        userId: user?.id,
        targetUserId,
        content: inputValue,
      });
      setInputValue('');
    } catch (error) {
      console.error(error);
      toast.error('Error sending message.');
    } finally {
      setIsSending(false);
    }
  };

  const getPointers = async () => {
    setIsLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/pointers?userId=${targetUserId}`,
        null
      );
      setPointers(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error fetching messages.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className='h-[500px] max-h-[600px] overflow-y-auto no-scrollbar p-3 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-700'
        ref={chatContainerRef}
      >
        {isLoading ? (
          <div className='h-full w-full flex items-center justify-center'>
            <CircularProgress size={24} />
          </div>
        ) : pointers.length === 0 ? (
          <div className='h-full w-full flex flex-col items-center text-neutral-400'>
            No Messages Found!
          </div>
        ) : (
          pointers.map((pointer: PointerWithReplies, index: number) => (
            <div key={pointer.id} className='flex flex-col gap-2'>
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
      <Toaster richColors duration={3000} closeButton position='bottom-left' />
    </>
  );
};

export default Pointers;
