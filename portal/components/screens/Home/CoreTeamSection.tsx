/* eslint-disable @next/next/no-img-element */
import type { User } from '@db/client';
import { USERROLE, USERTYPE } from '@db/client';
import dayjs from 'dayjs';
import { useEffect } from 'react';

import ToolTip from '@/components/elements/ToolTip';
import { UserProfileDrawer } from '@/components/screens/Home/ProfileDrawer';
import { getBuffLevelAndTitle } from '@/utils/helpers/badges';
import {
  selectMember,
  setCoreTeamMembers,
  setTrialCandidates,
} from '@/utils/redux/coreTeam/coreTeam.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';
interface CoreTeamSectionProps {
  userRoles: USERROLE;
}

export const CoreTeamSection = ({ userRoles }: CoreTeamSectionProps) => {
  const dispatch = useAppDispatch();
  const currentMonth = dayjs().format('MMMM');

  const coreTeam = useAppSelector((state: RootState) =>
    userRoles === USERROLE.CORETEAM
      ? state.coreTeam.coreTeamMembers
      : state.coreTeam.trialCandidates,
  );
  useEffect(() => {
    PortalSdk.getData(
      '/api/user?role=' +
        userRoles +
        '&userType=' +
        USERTYPE.MEMBER +
        '&status=ACTIVE&cache=true' +
        `&month=${currentMonth}`,
      null,
    )
      .then((data) => {
        if (userRoles === USERROLE.CORETEAM) {
          dispatch(setCoreTeamMembers(data?.data?.user));
        } else if (userRoles === USERROLE.TRIAL_CANDIDATE) {
          dispatch(setTrialCandidates(data?.data?.user));
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, [dispatch, userRoles]);

  const handleOpenSlideIn = (user: User) => {
    dispatch(selectMember(user));
  };

  return (
    <section className="m-4 mt-6 overflow-hidden rounded-xl border-neutral-400 bg-white px-0 shadow-md">
      <div className="flex flex-col items-stretch justify-center">
        {coreTeam.map((user) => {
          const badge = (user as any).buffBadge;
          return (
            <div
              key={user.id}
              onClick={() => handleOpenSlideIn(user)}
              className="flex cursor-pointer flex-row items-center justify-between gap-1 border-b border-neutral-200 px-2 py-3 hover:bg-black/5"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-neutral-400">
                  <img
                    src={
                      user?.avatar ||
                      `https://via.placeholder.com/150?text=${
                        user?.name?.charAt(0) || 'U'
                      }`
                    }
                    alt={user?.name?.charAt(0) || ''}
                    className="size-8 rounded-full object-cover object-center"
                  />
                </div>
                <div className="text-left">
                  <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
                    {user.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                {(user as any).buffBadge?.length > 0 ? (
                  <ToolTip title={badge[0].title} arrow={true}>
                    <img
                      src={getBuffLevelAndTitle(badge[0].points).src}
                      alt={badge[0].title.charAt(0)}
                      className="size-8 rounded-full shadow-md"
                    />
                  </ToolTip>
                ) : (
                  <span className="rounded-lg border p-2 text-[8px]">
                    {user.vertical && user.vertical?.length > 2
                      ? user.vertical?.substring(0, 3).toUpperCase()
                      : user.vertical}
                  </span>
                )}
              </div>
            </div>
          );
        })}{' '}
      </div>
      <UserProfileDrawer />
    </section>
  );
};
