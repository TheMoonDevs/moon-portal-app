'use client';
import { Button, CircularProgress, IconButton } from '@mui/material';

interface ReplyBoxProps {
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleReplySend: () => void;
  isSending: boolean;
  isReplying?: boolean;
  isChatCard?: boolean;
}

export const ReplyBox: React.FC<ReplyBoxProps> = ({
  inputValue,
  handleInputChange,
  handleReplySend,
  isSending,
  isReplying = false,
  isChatCard,
}) => {
  return (
    <div
      className={`transition-max-height duration-300 ease-in-out mt-4 ${
        isReplying ? 'max-h-60' : 'max-h-0'
      } ${isChatCard && 'overflow-hidden'}`}
    >
      <div className='flex items-center bg-neutral-100 p-3 rounded-lg border border-neutral-300 gap-2'>
        <textarea
          className='flex-grow w-full p-3 rounded-lg bg-neutral-50 text-neutral-700 border-none focus:outline-none resize-none h-16'
          value={inputValue}
          onChange={handleInputChange}
          placeholder='Type a message...'
          disabled={isSending}
        />
        <IconButton
          onClick={handleReplySend}
          disabled={!inputValue.trim() || isSending}
          title='Send Message'
          className={`ml-2 transition-colors text-[#414bea] ${
            !inputValue.trim() ? 'text-neutral-400' : 'text-blue-500'
          }`}
        >
          {isSending ? (
            <CircularProgress size={16} />
          ) : (
            <span className='material-symbols-outlined'>send</span>
          )}
        </IconButton>
      </div>
    </div>
  );
};
