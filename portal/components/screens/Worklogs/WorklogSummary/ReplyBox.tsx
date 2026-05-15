'use client';
import { CircularProgress } from '@mui/material';

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
      className={`transition-max-height mt-4 duration-300 ease-in-out ${
        isReplying ? 'max-h-60' : 'max-h-0'
      } ${isChatCard && 'overflow-hidden'}`}
    >
      <div className="relative">
        {' '}
        {/* Add relative positioning for the container */}
        <textarea
          className="h-24 w-full grow resize-none rounded-lg border-none bg-neutral-50 p-3 pr-14 text-neutral-700 focus:outline-none" // Add padding-right to accommodate the button
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter a comment"
          disabled={isSending}
        />
        <button
          onClick={handleReplySend}
          disabled={!inputValue.trim() || isSending}
          className={`absolute bottom-5 right-4 flex items-center justify-center rounded-md px-4 py-1 ${
            !inputValue.trim()
              ? 'bg-gray-100 text-neutral-400'
              : 'bg-[#6b4bf2] text-white'
          }`}
        >
          {isSending ? <CircularProgress size={16} color="inherit" /> : 'Send'}
        </button>
      </div>
    </div>
  );
};
