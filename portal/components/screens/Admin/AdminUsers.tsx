/* eslint-disable @next/next/no-img-element */
"use client";

import { MobileBox } from "../Login/Login";
import Link from "next/link";
import { GreyButton } from "@/components/elements/Button";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useRouter } from "next/navigation";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { User, USERTYPE } from "@prisma/client";
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
    <div className="relative flex !h-screen w-full items-center justify-center gap-6">
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.5em] text-neutral-400">
            Loading Please Wait...
          </p>
          <Spinner />
        </div>
      ) : (
        <>
          <div className="absolute right-0 top-0 flex flex-col items-center justify-center gap-4 ">
            <Link href={APP_ROUTES.userEditor}>
              <GreyButton rightIcon={"add"}>Add New User</GreyButton>
            </Link>
          </div>
          <>
            {["CLIENT", "MEMBER"].map((type) => {
              const filteredUsers = users.filter(
                (user) =>
                  user.userType === USERTYPE[type as keyof typeof USERTYPE],
              );

              if (filteredUsers.length === 0) return null;

              return (
                <MobileBox key={type} customClass="!w-full mt-6 ">
                  <p className="mb-4 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
                    {type === "CLIENT" ? "CLIENTS" : "MEMBERS"}
                  </p>
                  <div className="custom-scrollbar my-2 flex max-h-full w-[90%] grow flex-col justify-start gap-4 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <Link
                        key={user.id}
                        className="flex flex-row items-center justify-between rounded-lg border border-neutral-700 px-4 py-2 hover:bg-neutral-800"
                        href={`${APP_ROUTES.userEditor}?id=${user.id}`}
                      >
                        <div className="flex cursor-pointer flex-row items-center justify-center gap-4 rounded-lg px-4 py-2 hover:bg-neutral-800">
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
                        </div>
                        <span className="material-icons text-neutral-400">
                          chevron_right
                        </span>
                      </Link>
                    ))}
                  </div>
                </MobileBox>
              );
            })}
          </>
        </>
      )}
    </div>
  );
};
