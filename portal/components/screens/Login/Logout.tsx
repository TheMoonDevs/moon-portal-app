import React from 'react';

import { GreyButton } from '@/components/elements/Button';

export const Logout = ({ user, signOut }: any) => {
  const confirmLogout = () => {
    signOut();
  };

  return (
    <div className="mb-5 flex flex-col items-center">
      {user && (
        <div className="mb-5 mt-3 flex flex-row items-center gap-4">
          <div className="rounded-full p-1">
            <img
              src={user?.avatar}
              alt={user?.name + ' avatar'}
              className="size-12 rounded-full object-cover object-center"
            />
          </div>
          <div className="text-left">
            <h4 className="text-xl text-neutral-100">{user?.name}</h4>
            <p className="text-center text-xs text-neutral-400">
              {user?.email}
            </p>
          </div>
        </div>
      )}
      <GreyButton onClick={confirmLogout}>Sign out</GreyButton>
    </div>
  );
};
