"use client";

import { Button, Menu, MenuItem } from "@mui/material";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";
import QuicklinkSearchBar from "./QuicklinkSearchBar";
import Avatar from "boring-avatars";
import { useUser } from "@/utils/hooks/useUser";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { setToggleSidebar } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice"; 
import { useState } from "react";

const QuicklinksGlobalHeader = () => {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const isCollapsed = useAppSelector((state) => state.quicklinksUi.isCollapsed);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className="flex flex-col w-full fixed top-0 z-[1]">
      <div className="grid grid-cols-[1fr_1.5fr_1fr] items-center justify-between px-4 w-full bg-white h-[56px]">
        <h1 className="flex items-center gap-4">
          <span 
            className="material-symbols-outlined cursor-pointer hover:bg-neutral-100 p-2 rounded-full transition-colors"
            onClick={() => dispatch(setToggleSidebar(!isCollapsed))}
          >
            {isCollapsed ? "menu" : "menu_open"}
          </span>
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
              className="!bg-zinc-900 !text-sm !rounded-lg !capitalize !shadow-none hover:!bg-neutral-700 !text-neutral-100 !tracking-wider !py-[0.6rem]"
              onClick={() => dispatch(setIsCreateLinkModalOpen(true))}
            >
              Quicklink
            </Button>
            <div onClick={handleClick} className="cursor-pointer">
              {user?.avatar ? (
                <img
                  src={user?.avatar}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <Avatar name={user?.name || ""} size="40" variant="beam" />
              )}
            </div>

            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              className="m-2 p-2"
            >
              <MenuItem onClick={handleClose}>
                <Link href={APP_ROUTES.home} passHref>
                  Go to Dashboard
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link href={APP_ROUTES.login} passHref>
                  Logout
                </Link>
              </MenuItem>
            </Menu>
          </div>
        </div>
      </div>
      <div className="h-[20px]" />
    </div>
  );
};

export default QuicklinksGlobalHeader;
