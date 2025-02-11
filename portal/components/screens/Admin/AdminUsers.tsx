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

export const AdminUsers = ({
  users,
  loading,
}: {
  users: User[];
  loading: boolean;
}) => {
  const router = useRouter();
  return (
    <MobileBox customClass="!w-[50%]">
      <p className="mb-4 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
        CLIENTS / MEMBER
      </p>

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="scrollbar my-2 flex max-h-full w-[90%] grow flex-col justify-start gap-4 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-row items-center justify-between rounded-lg border border-neutral-700 px-4 py-2 hover:bg-neutral-800"
            >
              <Link
                className="flex cursor-pointer flex-row items-center justify-center gap-4 rounded-lg px-4 py-2 hover:bg-neutral-800"
                href={`${APP_ROUTES.userEditor}?id=${user.id}`}
                onClick={() => {
                  console.log("clicked", user.id);
                  //router.push(`${APP_ROUTES.userEditor}?id=${user.id}`);
                }}
              >
                <div className="rounded-full p-1">
                  <img
                    src={user?.avatar || undefined}
                    alt={user?.name || ""}
                    className="h-12 w-12 rounded-full object-cover object-center"
                  />
                </div>
                <div>
                  <p className="text-neutral-300">{user.name}</p>
                  <p className="text-sm text-neutral-600">
                    {user.userType} | {user.username}-{user.password}
                  </p>
                </div>
              </Link>
              <span className="material-icons text-neutral-400">
                chevron_right
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col items-center justify-center gap-4">
        <Link href={APP_ROUTES.userEditor}>
          <GreyButton rightIcon={"add"}>Add New User</GreyButton>
        </Link>
      </div>
    </MobileBox>
  );
};
