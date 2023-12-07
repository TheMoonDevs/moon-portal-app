"use client";

/* eslint-disable @next/next/no-img-element */
import { DbUser, USERROLE } from "@/utils/services/models/User";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useEffect, useState } from "react";

export const TeamUsersList = () => {
  const [coreTeam, setCoreTeam] = useState<DbUser[]>([]);
  useEffect(() => {
    PortalSdk.getData("/api/users/users?role=" + USERROLE.CORETEAM, null)
      .then((data) => {
        console.log(data);
        setCoreTeam(data.users);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <div className="p-3">
      <div className="flex flex-col gap-4 items-start justify-start border border-neutral-700 rounded-xl overflow-hidden ">
        <h1 className="py-2 border-b border-black w-full text-neutral-800 tracking-[0.5em] uppercase text-xs text-center mb-1">
          CORE TEAM
        </h1>
        <div className=" px-2 rounded-lg overflow-x-auto w-full pb-3">
          <div className="flex flex-row flex-nowrap gap-4 items-center justify-start">
            {coreTeam.map((user) => (
              <div
                key={user._id}
                className="flex flex-col gap-1 items-center justify-center px-2 rounded-lg cursor-pointer"
              >
                <div className=" rounded-full ">
                  <img
                    src={user?.avatar}
                    alt={user?.name}
                    className="w-12 h-12 object-cover object-center rounded-full "
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-900 max-w-[10ch] line-clamp-1">
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
