"use client";

import { useState } from "react";

import { Tooltip } from "@mui/material";
import { usePwaUpdate } from "@/utils/hooks/usePwaUpdate";

export const UpdatePWA = ({ children }: { children: React.ReactNode }) => {
  const { handleUpdate, updateAvailable } = usePwaUpdate();
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      {updateAvailable && isOpen && (
        <div className="fixed z-50 flex items-center md:gap-8 bg-black text-white mx-1 rounded-[10px]">
          <div className="absolute max-h-52 max-w-[250px] h-full w-full overflow-hidden z-0 blur-lg rounded-lg animated-border-box-glow"></div>

          <div className="fixed top-0 sm:right-0 sm:bottom-0 sm:top-auto right-0 left-0 sm:left-auto z-50 flex items-center md:gap-8 gap-4 bg-black text-white p-4 mx-auto sm:mx-0 w-fit animated-border-box backdrop-blur-md animate-fadeInTopDown md:animate-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo_white.png"
              alt="logo"
              className="w-8 h-w-8 md:h-10 md:w-10"
            />
            <div>
              <h1 className="text-sm md:text-base !ms-0">
                New version {process.env.NEXT_PUBLIC_APP_VERSION} available!{" "}
              </h1>
              <p className="text-xs mt-2 text-neutral-400">
                <span className="sm:block">
                  Please click on reload button or reopen
                </span>
                <span> the app to update.</span>
              </p>
            </div>
            <div className="flex md:gap-4 gap-2">
              <Tooltip title="Reload" placement="bottom">
                <button onClick={() => handleUpdate()}>
                  <span className="material-symbols-outlined bg-neutral-800 rounded-full p-2 md:px-3 !text-md md:!text-xl hover:scale-110 transition-all delay-75">
                    refresh
                  </span>
                </button>
              </Tooltip>
              <Tooltip title="Close" placement="bottom">
                <button onClick={() => setIsOpen(false)}>
                  <span className="material-symbols-outlined bg-neutral-800 rounded-full p-2 md:px-3 !text-md md:!text-xl hover:scale-110 transition-all delay-75">
                    close
                  </span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
