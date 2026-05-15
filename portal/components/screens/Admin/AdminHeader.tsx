import type { User } from '@db/client';
import Image from 'next/image';

export const AdminHeader = ({ user }: { user: User }) => {
  return (
    <div className="flex w-full items-center gap-4 bg-neutral-800 p-4 shadow-md">
      <div className="size-12 overflow-hidden rounded-full border-2 border-neutral-600">
        <Image
          src={user.avatar || ''}
          alt={user.name || 'User Avatar'}
          width={60}
          height={60}
          className="size-full object-cover"
        />
      </div>
      <div className="text-left">
        <p className="text-lg font-medium text-white">{user.name}</p>
        <p className="text-xs text-neutral-400">{user.userType}</p>
      </div>
    </div>
  );
};
