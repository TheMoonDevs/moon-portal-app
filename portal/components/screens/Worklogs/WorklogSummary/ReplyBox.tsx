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
      <div className="relative"> {/* Add relative positioning for the container */}
        <textarea
          className='flex-grow w-full p-3 rounded-lg bg-neutral-50 text-neutral-700 border-none focus:outline-none resize-none h-24 pr-14' // Add padding-right to accommodate the button
          value={inputValue}
          onChange={handleInputChange}
          placeholder='Enter a comment'
          disabled={isSending}
        />
        <button
          onClick={handleReplySend}
          disabled={!inputValue.trim() || isSending}
          className={`absolute bottom-5 right-4 py-1 px-4 rounded-md ${
            !inputValue.trim() ? 'text-neutral-400 bg-gray-100' : 'bg-[#6b4bf2] text-white'
          }`}
        >
          {isSending ? (
            <CircularProgress size={16} color='inherit'/>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
};
