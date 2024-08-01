/* eslint-disable @next/next/no-img-element */
"use client";

import { MobileBox } from "../Login/Login";
import Link from "next/link";
import { GreyButton } from "@/components/elements/Button";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useRouter } from "next/navigation";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { User } from "@prisma/client";
import { Spinner } from "@/components/elements/Loaders";

export const AdminUsers = ({users, loading} : {
  users: User[];
  loading: boolean;
}) => {
  const router = useRouter();
  return (
    <MobileBox>
      <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center mb-4">
        CLIENTS / MEMBER
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col grow gap-4 my-2 justify-start max-h-full overflow-y-auto scrollbar">
          {users.map((user) => (
            <Link
              key={user.id}
              className="flex flex-row gap-4 items-center justify-center border border-neutral-700 hover:bg-neutral-800 px-4 py-2 rounded-lg cursor-pointer"
              href={`${APP_ROUTES.userEditor}?id=${user.id}`}
              onClick={() => {
                console.log("clicked", user.id);
                //router.push(`${APP_ROUTES.userEditor}?id=${user.id}`);
              }}
            >
              <div className=" rounded-full p-1 ">
                <img
                  src={user?.avatar || undefined}
                  alt={user?.name || ""}
                  className="w-12 h-12 object-cover object-center rounded-full "
                />
              </div>
              <div>
                <p className="text-neutral-300">{user.name}</p>
                <p className="text-sm text-neutral-600">
                  {user.userType} | {user.username}-{user.password}
                </p>
              </div>
              <span className="material-icons text-neutral-400">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4 items-center justify-center">
        <Link href={APP_ROUTES.userEditor}>
          <GreyButton rightIcon={"add"}>Add New User</GreyButton>
        </Link>
      </div>
    </MobileBox>
  );
};
