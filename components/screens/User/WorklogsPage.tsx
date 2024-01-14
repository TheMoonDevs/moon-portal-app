"use client";

import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import Link from "next/link";

export const WorklogsPage = () => {
  const { user } = useUser(false);

  if (!user?.workData) return null;
  return (
    <div className="flex flex-col">
      <div className="absolute left-0 right-0 top-0 bg-white flex flex-row gap-3 py-3 items-center justify-between border-b border-neutral-400">
        <Link href={APP_ROUTES.home}>
          <div className="cursor-pointer rounded-lg px-2 text-neutral-900 hover:text-neutral-700">
            <span className="icon_size material-icons">arrow_back</span>
          </div>
        </Link>
        <h1 className="uppercase tracking-widest">Your Work Logs</h1>
        <div className="text-xl rounded-lg px-2 text-neutral-900 hover:text-neutral-700">
          <span className="icon_size material-icons">add_circle_outline</span>
        </div>
      </div>
      {user.workData?.worklogPubLink && (
        <iframe
          src={user.workData?.worklogPubLink}
          style={{
            width: "100%",
            height: "100vh",
            border: "none",
          }}
        ></iframe>
      )}
      <Link
        href={user?.workData?.worklogLink || ""}
        rel="noopener noreferrer"
        target="_blank"
      >
        <div className="bg-black w-[2em] h-[2em] flex flex-row items-center justify-center rounded-[50%] text-2xl p-2 absolute bottom-[3em] right-[1em]">
          <span className="icon_size material-icons text-white">edit</span>
        </div>
      </Link>
    </div>
  );
};
