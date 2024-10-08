"use client";

import { Button } from "@mui/material";
import QuicklinkSearchBar from "./QuicklinkSearchBar";
import Avatar from "boring-avatars";
import { useUser } from "@/utils/hooks/useUser";
import Image from "next/image";
import { useAppDispatch } from "@/utils/redux/store";
import { setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";

const QuicklinksGlobalHeader = () => {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  return (
    <div className="flex flex-col w-full  fixed top-0 z-[1]">
      <div className="grid grid-cols-[1fr_1.5fr_1fr] items-center justify-between px-6  w-full bg-white  h-[56px]">
        <h1 className="flex items-center gap-4">
          <span className="material-symbols-outlined">menu</span>
          <span className="text-2xl font-semibold">QUICKLINKS</span>
        </h1>
        <QuicklinkSearchBar />
        <div className="flex justify-end">
          <div className="flex gap-4 items-center">
            <Button
              startIcon={
                <span className="material-icons !text-sm !font-thin text-neutral-100">
                  add
                </span>
              }
              variant="contained"
              className="!bg-zinc-900 !text-sm !rounded-lg  !capitalize !shadow-none hover:!bg-neutral-700  !text-neutral-100 !tracking-wider !py-[0.6rem]"
              onClick={() => dispatch(setIsCreateLinkModalOpen(true))}
            >
              Quicklink
            </Button>

            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user?.avatar || ""}
                alt="avatar"
                width={40}
                height={40}
                className="rounded-full cursor-pointer"
              />
            ) : (
              <Avatar name={user?.name || ""} size="40" variant="beam" />
            )}
          </div>
        </div>
      </div>
      <div className="h-[20px]"></div>
    </div>
  );
};

export default QuicklinksGlobalHeader;
