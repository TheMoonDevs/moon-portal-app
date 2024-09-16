import React, { useState } from 'react';
import { Avatar, CircularProgress } from '@mui/material';
import { Pointer, Reply } from '@prisma/client';
import { RootState, useAppSelector } from '@/utils/redux/store';
import { prettySinceTime } from '@/utils/helpers/prettyprint';
import { Toaster, toast } from 'sonner';
import { ReplyBox } from './ReplyBox';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { useUser } from '@/utils/hooks/useUser';

const ChatCard = ({
  pointer,
  index,
}: {
  pointer: Pointer & { replies: Reply[] };
  index: number;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const coreTeam = useAppSelector((state: RootState) => state.coreTeam.members);
  const member = coreTeam.find((member) => member.id === pointer.userId);
  const { user } = useUser();

  const createdAt =
    typeof pointer.createdAt === 'string'
      ? pointer.createdAt
      : new Date(pointer.createdAt).toISOString();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleReplySend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await PortalSdk.putData('/api/pointers', {
        pointerId: pointer.id,
        reply: {
          userId: user?.id,
          content: inputValue,
        },
      });
      setInputValue('');
      setIsReplying(false);
    } catch (error) {
      console.error(error);
      toast.error('Error sending message.');
    } finally {
      setIsSending(false);
    }
  };

  const toggleReplyBox = () => {
    setIsReplying(!isReplying);
  };

  const toggleReplies = () => {
    setShowComments(!showComments);
  };

  return (
    <div className='p-4 mb-4 bg-white border rounded-lg shadow-md flex flex-col'>
      <div className='flex items-center gap-3 mb-4'>
        <Avatar
          alt={member?.name || 'User Avatar'}
          src={member?.avatar || undefined}
          sx={{ width: 40, height: 40 }}
        />
        <div className='flex-1 gap-1'>
          <p className='font-semibold text-lg text-gray-900'>
            {member?.name || 'Unknown User'}
          </p>
          <p className='text-xs text-gray-400'>{prettySinceTime(createdAt)}</p>
        </div>
      </div>
      <p className='text-gray-600 mb-4 text-base font-medium'>
        {pointer.content}
      </p>
      <div className='flex flex-row items-center justify-between'>
        <div className='flex items-center gap-2'>
          <button
            onClick={toggleReplyBox}
            className='self-start text-neutral-700 font-semibold tracking-wider text-sm underline'
          >
            REPLY
          </button>
          <button
            onClick={toggleReplies}
            className='self-start text-neutral-700 font-semibold tracking-wider text-sm underline'
          >
            {showComments ? 'HIDE COMMENTS' : 'SHOW COMMENTS'}
          </button>
        </div>
        <p className='text-neutral-400'>#{index + 1}</p>
      </div>

      {/* Display Reply Box */}
      {(isReplying || showComments) && (
        <ReplyBox
          inputValue={inputValue}
          handleInputChange={handleInputChange}
          handleReplySend={handleReplySend}
          isSending={isSending}
          isReplying={isReplying}
          isChatCard={true}
        />
      )}

      {/* Show comments section */}
      {showComments && (
        <div
          className='mt-4 max-h-40 overflow-y-auto space-y-4'
          style={{ maxHeight: '200px' }}
        >
          {pointer.replies.length > 0 ? (
            pointer.replies.map((reply) => {
              const replyMember = coreTeam.find((m) => m.id === reply.userId);
              return (
                <div key={reply.id} className='p-2 border-b border-gray-200'>
                  <div className='flex items-center gap-3'>
                    <Avatar
                      alt={replyMember?.name || 'User Avatar'}
                      src={replyMember?.avatar || undefined}
                      sx={{ width: 30, height: 30 }}
                    />
                    <div>
                      <p className='text-sm font-semibold text-gray-900'>
                        {replyMember?.name || 'Unknown User'}
                      </p>
                      <p className='text-xs text-gray-400'>
                        {prettySinceTime(reply.createdAt.toString())}
                      </p>
                    </div>
                  </div>
                  <p className='text-gray-600 mt-2 text-base'>
                    {reply.content}
                  </p>
                </div>
              );
            })
          ) : (
            <p className='text-gray-500 text-sm'>No comments yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatCard;
