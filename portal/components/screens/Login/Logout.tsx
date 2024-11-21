import React, { useState } from "react";
import { GreyButton } from "@/components/elements/Button";

export const Logout = ({ user, signOut, passphrase }: any) => {
  const [showWarning, setShowWarning] = useState(false);

  const handleLogout = () => {
    setShowWarning(true);
  };

  const confirmLogout = () => {
    signOut();
  };

  return (
    <div className="mb-5 flex flex-col items-center">
      {user && (
        <div className="flex flex-row items-center mt-3 mb-5 gap-4">
          <div className=" rounded-full p-1 ">
            <img
              src={user?.avatar}
              alt={user?.name + " avatar"}
              className="w-12 h-12 object-cover object-center rounded-full "
            />
          </div>
          <div className="text-left">
            <h4 className="text-xl text-neutral-100">{user?.name}</h4>
            <p className="text-neutral-400 text-xs text-center">
              {user?.email}
            </p>
          </div>
        </div>
      )}
      <GreyButton onClick={handleLogout}>Sign out</GreyButton>

      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-neutral-800 p-6 rounded-2xl max-w-md">
            <h2 className="text-xl text-red-600 mb-4">
              Warning: Save Your Passphrase
            </h2>
            <p className="text-neutral-400 mb-4">
              Before logging out, please ensure you have saved your passphrase.
              Losing this passphrase will make all your private data
              inaccessible.
            </p>
            <div className="bg-neutral-700 p-2 rounded mb-4">
              <p className="text-neutral-100 font-mono">{passphrase}</p>
            </div>
            <div className="flex justify-end gap-4">
              <GreyButton onClick={() => setShowWarning(false)}>
                Cancel
              </GreyButton>
              <GreyButton onClick={confirmLogout}>
                I've saved my passphrase
              </GreyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
