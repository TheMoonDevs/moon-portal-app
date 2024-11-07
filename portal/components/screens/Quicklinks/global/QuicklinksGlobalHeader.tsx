"use client";

import { Button, Menu, MenuItem, useMediaQuery } from "@mui/material";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";
import QuicklinkSearchBar from "./QuicklinkSearchBar";
import Avatar from "boring-avatars";
import { useUser } from "@/utils/hooks/useUser";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setHamburgerOpen, setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { setToggleSidebar } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice"; 
import { useState } from "react";
import media from "@/styles/media";

const QuicklinksGlobalHeader = () => {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const {isCollapsed, isHamburgerOpen} = useAppSelector((state) => state.quicklinksUi);
  const isTablet = useMediaQuery(media.tablet);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isSidebar = isCollapsed || isHamburgerOpen 

  return (
    <div className="fixed top-0 z-[1] flex w-full flex-col">
      <div className={`grid h-[56px] w-full grid-cols-[1fr_1.5fr_1fr] items-center justify-between bg-white px-4 ${isTablet && 'grid-cols-[1fr_1fr] max-sm:px-2'}`}>
        <h1 className="flex items-center gap-4 max-sm:gap-2">
          <span
            className="material-symbols-outlined cursor-pointer rounded-full p-2 transition-colors hover:bg-neutral-100"
            onClick={() => {
              !isTablet
                ? dispatch(setToggleSidebar(!isCollapsed))
                : dispatch(setHamburgerOpen(!isHamburgerOpen));
            }}
          >
            {isSidebar ? 'menu' : 'menu_open'}
          </span>
          <span className="text-2xl font-semibold max-sm:text-xl">QUICKLINKS</span>
        </h1>
        <div className={`${isTablet && 'hidden'}`}>
          <QuicklinkSearchBar />
        </div>
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
            <div onClick={handleClick} className={`cursor-pointer ${isTablet && 'hidden'}`}>
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
