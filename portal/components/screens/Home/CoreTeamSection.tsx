/* eslint-disable @next/next/no-img-element */
import { PortalSdk } from "@/utils/services/PortalSdk";
import { USERROLE, USERTYPE, User } from "@prisma/client";
import { useEffect, useState } from "react";
import { UserProfileDrawer } from "@/components/screens/Home/ProfileDrawer";
import {
  selectMember,
  setMembers,
} from "@/utils/redux/coreTeam/coreTeam.slice";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";

export const CoreTeamSection = () => {
  const dispatch = useAppDispatch();
  const coreTeam = useAppSelector((state: RootState) => state.coreTeam.members);

  useEffect(() => {
    PortalSdk.getData(
      "/api/user?role=" + USERROLE.CORETEAM + "&userType=" + USERTYPE.MEMBER,
      null
    )
      .then((data) => {
        dispatch(setMembers(data?.data?.user));
        console.log(coreTeam);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [dispatch]);

  const handleOpenSlideIn = (user: User) => {
    dispatch(selectMember(user));
  };

  return (
    <section className="bg-white m-4 mt-6 px-0 border-neutral-400 rounded-xl shadow-md overflow-hidden">
      <div className="flex flex-col items-stretch justify-center">
        {coreTeam.map((user) => (
          <div
            key={user.id}
            onClick={() => handleOpenSlideIn(user)}
            className="flex flex-row gap-1 items-center justify-between px-2 py-3 cursor-pointer hover:bg-black/5 border-b border-neutral-200">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-neutral-400">
                <img
                  src={
                    user?.avatar ||
                    "https://via.placeholder.com/150?background=000000&text=" +
                      user?.name?.charAt(0)
                  }
                  alt={user?.name || ""}
                  className="w-8 h-8 object-cover object-center rounded-full"
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-neutral-900 line-clamp-1">
                  {user.name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[8px] border rounded-lg p-2">
                {user.vertical && user.vertical?.length > 2
                  ? user.vertical?.substring(0, 3).toUpperCase()
                  : user.vertical}
              </span>
            </div>
          </div>
        ))}
      </div>
      <UserProfileDrawer />
    </section>
  );
};
