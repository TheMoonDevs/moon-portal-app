/* eslint-disable @next/next/no-img-element */
import type { User } from '@db/client';
import BoringAvatar from 'boring-avatars';
import Link from 'next/link';

import { APP_ROUTES } from '@/utils/constants/appInfo';

import { CompanyChips } from './CompaniesSection';

export const ProfileSection = ({ user }: { user: User }) => {
  if (!user?.id) return null;
  return (
    <div className="flex w-full flex-col items-center justify-between px-2 pt-4 md:static md:items-center">
      <div className="flex w-full items-center gap-2 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/portal-logo-ink.svg"
          alt=""
          className="size-6 object-contain"
        />
        <span className="text-xs font-bold tracking-[0.3em] text-neutral-900">
          PORTAL
        </span>
      </div>
      <div className="my-3 flex w-full flex-row items-center justify-start gap-4">
        <Link
          href={APP_ROUTES.settings}
          title="Your settings"
          className="rounded-full p-1"
        >
          {!user?.avatar || user?.avatar === '' ? (
            <div className="relative size-24">
              <BoringAvatar
                size={'100%'}
                name={user?.name || 'S'}
                variant="sunset"
                colors={['#000000', '#363636', '#b3b3b3']}
              />
              <div className="absolute inset-0 flex items-center justify-center text-5xl text-white">
                <span>{user?.name?.substring(0, 1)}</span>
              </div>
            </div>
          ) : (
            <img
              src={user?.avatar || ''}
              alt={user?.name || ''}
              className="size-16 cursor-pointer rounded-full object-cover object-center md:size-[4.5rem]"
            />
          )}
        </Link>
        <div className="min-w-0 text-left">
          <p className="text-md font-bold text-black">Hello, </p>
          <h4 className="text-xl text-neutral-900">{user?.name}</h4>
          {(user?.username || user?.positionTitle) && (
            <p className="text-xs text-neutral-500">
              {[user.username && `@${user.username}`, user.positionTitle]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <CompanyChips className="mt-2" />
        </div>
      </div>
    </div>
  );
};
