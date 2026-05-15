'use client';

import type { User } from '@db/client';
import { USERROLE, USERTYPE } from '@db/client';
import { useEffect, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

export const TeamUsersList = () => {
  const [coreTeam, setCoreTeam] = useState<User[]>([]);
  useEffect(() => {
    PortalSdk.getData(
      '/api/user?role=' + USERROLE.CORETEAM + '&userType=' + USERTYPE.MEMBER,
      null,
    )
      .then((data) => {
        setCoreTeam(data?.data?.user || []);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <div className="p-3">
      <div className="flex flex-col items-start justify-start gap-4 overflow-hidden rounded-xl border border-neutral-700">
        <h1 className="mb-1 w-full border-b border-black py-2 text-center text-xs uppercase tracking-[0.5em] text-neutral-800">
          CORE TEAM
        </h1>
        <div className="w-full overflow-x-auto rounded-lg px-2 pb-3">
          <div className="flex flex-row flex-nowrap items-center justify-start gap-4">
            {coreTeam.map((user) => (
              <div
                key={user.id}
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-2"
              >
                <div className="rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user?.avatar || undefined}
                    alt={user?.name || ''}
                    className="size-12 rounded-full object-cover object-center"
                  />
                </div>
                <div className="text-center">
                  <p className="line-clamp-1 max-w-[10ch] text-xs text-neutral-900">
                    {user.name}
                  </p>
                  {/* <p className="text-xs text-neutral-400">{user.usertype}</p> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
