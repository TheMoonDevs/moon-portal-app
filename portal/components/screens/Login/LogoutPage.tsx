'use client';
import Image from 'next/image';

import { useUser } from '@/utils/hooks/useUser';

import { MobileBox } from './Login';
import { Logout } from './Logout';

export const LogoutPage = () => {
  const { status, user, signOutUser } = useUser(false);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-neutral-700 py-2 md:bg-neutral-900">
      <MobileBox>
        <div className="flex grow flex-col items-center justify-center gap-4">
          <div className="rounded-full p-4">
            <Image
              src="/logo/logo_white.png"
              alt="The Moon Devs"
              width={80}
              height={80}
            />
          </div>
          <p className="text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
            Sign out ?
          </p>
        </div>
        {status === 'authenticated' && (
          <Logout user={user} signOut={signOutUser} />
        )}
      </MobileBox>
    </div>
  );
};
