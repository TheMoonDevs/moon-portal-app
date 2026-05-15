import { CircularProgress } from '@mui/material';
import React, { useState } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleOnDeleteConfirmation = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onCancel}
        ></div>
        <div className="z-10 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">{title}</h2>
          <p className="mb-6">{message}</p>
          <div className="flex justify-end">
            <button
              className="mr-2 flex items-center justify-center gap-2 rounded bg-red-500 px-4 py-2 text-white"
              onClick={handleOnDeleteConfirmation}
            >
              {isLoading && <CircularProgress size={16} />}
              Confirm
            </button>
            <button
              className="rounded bg-gray-300 px-4 py-2 text-gray-700"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
