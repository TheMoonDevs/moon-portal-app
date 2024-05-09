import React from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
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
  if (!isOpen) return null;

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onCancel}
        ></div>
        <div className="bg-white rounded-lg shadow-lg p-6 z-10">
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          <p className="mb-6">{message}</p>
          <div className="flex justify-end">
            <button
              className="bg-red-500 text-white px-4 py-2 rounded mr-2"
              onClick={onConfirm}
            >
              Confirm
            </button>
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
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
