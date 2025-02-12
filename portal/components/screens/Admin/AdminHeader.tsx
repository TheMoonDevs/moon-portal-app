import Image from 'next/image';
import { User } from '@prisma/client';

export const AdminHeader = ({ user }: { user: User }) => {
  return (
    <div className="flex w-full items-center gap-4  bg-neutral-800 p-4 shadow-md">
      <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-neutral-600">
        <Image
          src={user.avatar || ''}
          alt={user.name || 'User Avatar'}
          width={60}
          height={60}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="text-left">
        <p className="font-medium text-white text-lg">{user.name}</p>
        <p className="text-xs text-neutral-400">{user.userType}</p>
      </div>
    </div>
  );
};
