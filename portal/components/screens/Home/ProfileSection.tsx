/* eslint-disable @next/next/no-img-element */
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { User } from "@prisma/client";
import Link from "next/link";
import BoringAvatar from "boring-avatars";

export const ProfileSection = ({ user }: { user: User }) => {
  if (!user?.id) return null;
  return (
    <div className="flex flex-col items-start justify-start px-5 pt-4">
      <div className="flex flex-row items-center justify-start my-3 gap-4">
        <div className=" rounded-full p-1 ">
          {!user?.avatar || user?.avatar === "" ? (
            <div className="w-24 h-24 relative">
              <BoringAvatar
                size={"100%"}
                name={user?.name || "S"}
                variant="sunset"
                colors={["#000000", "#363636", "#b3b3b3"]}
              />
              <div className="absolute inset-0 text-5xl text-white flex items-center justify-center">
                <span>{user?.name?.substring(0, 1)}</span>
              </div>
            </div>
          ) : (
            <img
              src={user?.avatar || ""}
              alt={user?.name || ""}
              className="w-24 h-24 object-cover object-center rounded-full "
            />
          )}
        </div>
        <div className="text-left">
          <p className="font-bold text-black text-md">Hello, </p>
          <h4 className="text-xl text-neutral-900">{user?.name}</h4>
          <p className="text-neutral-500 text-xs">{user?.email}</p>
        </div>
      </div>
      <div className="absolute top-1 right-1">
        <Link href={APP_ROUTES.logout}>
          <button className="text-xs border border-neutral-400 rounded-lg px-2 text-neutral-900 hover:text-neutral-700">
            <span className="icon_size material-icons"></span>
            sign out
          </button>
        </Link>
      </div>
    </div>
  );
};
