'use client';

import Link from 'next/link';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';

export const ClickupWorklogsPage = () => {
  const { user } = useUser(false);

  if (!user?.workData) return null;
  return (
    <div className="flex flex-col">
      <div className="absolute inset-x-0 top-0 flex flex-row items-center justify-between gap-3 border-b border-neutral-400 bg-white py-3">
        <Link href={APP_ROUTES.home}>
          <div className="cursor-pointer rounded-lg px-2 text-neutral-900 hover:text-neutral-700">
            <span className="icon_size material-icons">arrow_back</span>
          </div>
        </Link>
        <h1 className="uppercase tracking-widest">Your Work Logs</h1>
        <div className="rounded-lg px-2 text-xl text-neutral-900 hover:text-neutral-700">
          <span className="icon_size material-icons">add_circle_outline</span>
        </div>
      </div>
      {(user.workData as any)?.worklogPubLink && (
        <iframe
          src={(user.workData as any)?.worklogPubLink}
          style={{
            width: '100%',
            height: '100vh',
            border: 'none',
          }}
        ></iframe>
      )}
      <Link
        href={(user.workData as any)?.worklogLink || ''}
        rel="noopener noreferrer"
        target="_blank"
      >
        <div className="absolute bottom-[3em] right-[1em] flex size-[2em] flex-row items-center justify-center rounded-[50%] bg-black p-2 text-2xl">
          <span className="icon_size material-icons text-white">edit</span>
        </div>
      </Link>
    </div>
  );
};
