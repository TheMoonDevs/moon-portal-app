/* eslint-disable @next/next/no-img-element */
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { User } from "@prisma/client";
import Link from "next/link";

export const ProfileSection = ({ user }: { user: User }) => {
  if (!user?.id) return null;
  return (
    <div className="flex flex-col items-start justify-start px-5 pt-4">
      <div className="flex flex-row items-center justify-start my-3 gap-4">
        <div className=" rounded-full p-1 ">
          <img
            src={user?.avatar || ""}
            alt={user?.name || ""}
            className="w-24 h-24 object-cover object-center rounded-full "
          />
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
