import type { User } from '@db/client';
import Link from 'next/link';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { getDateInFormat, getTimeInFormat } from '@/utils/helpers/prettyprint';

export const DailySection = ({ user }: { user: User }) => {
  return (
    <div className="mx-2 my-1 flex flex-col gap-3 rounded-[1.15em] bg-white p-1">
      <div className="flex w-full flex-row justify-between border-b border-neutral-400 px-2 py-3 text-sm">
        <h4>
          It&apos;s &nbsp;
          <strong>{getTimeInFormat()}</strong> &nbsp; now.
        </h4>
        <Link
          href={APP_ROUTES.userWorklogs}
          className="flex items-center gap-2 border-l border-neutral-400 pl-2 text-xs hover:text-neutral-600"
        >
          <span className="icon_size material-icons text-neutral-800">
            edit_note
          </span>
          My worklogs
        </Link>
      </div>
      <div className="flex w-full flex-row items-center justify-between p-2 text-sm">
        <div className="pl-2">
          <h1 className="text-3xl font-black">{getDateInFormat('mmm')}</h1>
          <p className="text-xs">
            {getDateInFormat('dayname')} | {user?.timezone}
          </p>
        </div>
      </div>
    </div>
  );
};
