'use client';
import React, { useState } from 'react';
import { Avatar } from '@mui/material';
import { Pointer, Reply } from '@prisma/client';
import { RootState, useAppSelector } from '@/utils/redux/store';
import { prettySinceTime } from '@/utils/helpers/prettyprint';
import { Toaster, toast } from 'sonner';
import { ReplyBox } from './ReplyBox';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { useUser } from '@/utils/hooks/useUser';
import ToolTip from '@/components/elements/ToolTip';
import EmojiPicker, {
  EmojiClickData,
  SuggestionMode,
} from 'emoji-picker-react';

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
  const [isOpenEmoji, setIsOpenEmoji] = useState(false);
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

  const handleReplySend = async (emoji?: string) => {
    const contentToSend = emoji || inputValue;
    if (!contentToSend.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await PortalSdk.putData('/api/pointers', {
        pointerId: pointer.id,
        reply: {
          userId: user?.id,
          content: contentToSend,
        },
      });
      setInputValue('');
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
    <div className="mb-4 flex flex-col rounded-lg border bg-white p-4 shadow-md">
      <div className="flex flex-row items-start justify-between">
        <div className="mb-2 flex items-center gap-2 text-gray-600">
          <Avatar
            alt={member?.name || 'User Avatar'}
            src={member?.avatar || undefined}
            sx={{ width: 30, height: 30 }}
          />
          <div className="flex flex-1 flex-col">
            <div className="text-sm font-semibold text-gray-800">
              {member?.name || 'Unknown User'}
            </div>
            <p className="text-xs text-gray-400">
              {prettySinceTime(createdAt)}
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-400">#{index + 1}</p>
      </div>
      <p className="mb-4 text-base font-semibold leading-relaxed text-gray-800">
        {pointer.content}
      </p>

      {/* <div className="flex flex-row items-center justify-between"> */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleReplyBox}
          className="self-start text-xs font-bold text-gray-400 underline decoration-1 underline-offset-2"
        >
          REPLY
        </button>
        {pointer.replies.length > 0 && (
          <button
            onClick={toggleReplies}
            className="self-start text-xs font-bold text-gray-400"
          >
            {showComments ? 'HIDE COMMENTS' : 'SHOW COMMENTS'}
          </button>
        )}
        <ToolTip title="Emoji" arrow={true}>
          <span
            className="material-symbols-outlined cursor-pointer font-bold text-gray-400"
            style={{ fontSize: '16px' }}
            onClick={() => setIsOpenEmoji(!isOpenEmoji)}
          >
            add_reaction
          </span>
        </ToolTip>
      </div>
      <EmojiPopOver
        open={isOpenEmoji}
        handleClose={() => setIsOpenEmoji(false)}
        onEmojiSelect={handleReplySend}
      />

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
      <div
        className={`overflow-y-scroll transition-all duration-500 ease-in-out ${
          showComments ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {pointer.replies.length > 0 ? (
          pointer.replies.map((reply) => {
            const replyMember = coreTeam.find((m) => m.id === reply.userId);
            return (
              <div key={reply.id} className="border-b border-gray-200 p-2">
                <div className="flex items-center gap-2">
                  <Avatar
                    alt={replyMember?.name || 'User Avatar'}
                    src={replyMember?.avatar || undefined}
                    sx={{ width: 24, height: 24 }}
                  />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      {replyMember?.name || 'Unknown User'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {prettySinceTime(reply.createdAt.toString())}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-base text-gray-600">{reply.content}</p>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">No comments yet.</p>
        )}
      </div>
    </div>
  );
};

export default ChatCard;

const EmojiPopOver = ({
  open,
  handleClose,
  onEmojiSelect,
}: {
  open: boolean;
  handleClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}) => {
  return (
    <EmojiPicker
      open={open}
      autoFocusSearch={false}
      suggestedEmojisMode={SuggestionMode.FREQUENT}
      skinTonesDisabled
      lazyLoadEmojis
      className="mt-4"
      previewConfig={{ showPreview: false }}
      height={300}
      onEmojiClick={(emojiData: EmojiClickData, event: MouseEvent) => {
        onEmojiSelect(emojiData.emoji);
        handleClose();
      }}
    />
  );
};
