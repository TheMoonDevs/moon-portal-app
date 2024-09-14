import React, { useState } from "react";

interface PassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (passphrase: string) => void;
  mode: "set" | "verify";
}

export const PassphraseModal: React.FC<PassphraseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
}) => {
  const [passphrase, setPassphrase] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(passphrase);
    setPassphrase("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h1 className="text-xl font-bold mt-2">Private Worklogs Setup</h1>
        <h2 className="text-sm mb-2">
          {mode === "set" ? "Set Your Passphrase" : "Verify Your Passphrase"}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="border-2 rounded-lg border-gray-300 p-2 mb-4 w-full"
            placeholder="Enter your passphrase"
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-gray-600 border-[1px] border-gray-600 hover:bg-gray-600 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mr-2 px-4 py-2 text-white bg-gray-600 border-[1px] border-gray-600 hover:bg-white hover:text-gray-600 rounded-lg transition-colors"
            >
              {mode === "set" ? "Set Passphrase" : "Verify Passphrase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
