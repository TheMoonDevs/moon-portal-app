'use client';

import { useState } from 'react';

import { Tooltip } from '@mui/material';
import { usePwaUpdate } from '@/utils/hooks/usePwaUpdate';

export const UpdatePWA = ({ children }: { children: React.ReactNode }) => {
  const { handleUpdate, updateAvailable } = usePwaUpdate();
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      {isOpen && updateAvailable && (
        <div className="fixed z-50 mx-1 flex items-center rounded-[10px] bg-black text-white md:gap-8">
          <div className="animated-border-box-glow absolute z-0 h-full max-h-52 w-full max-w-[250px] overflow-hidden rounded-lg blur-lg"></div>
          <div className="fixed left-4 right-4 top-2 z-50 rounded-lg bg-black p-1 sm:bottom-2 sm:left-auto sm:right-2 sm:top-auto">
            <div className="animated-border-box mx-auto flex w-fit animate-fadeInTopDown items-center gap-4 bg-black p-4 text-white backdrop-blur-md sm:mx-0 md:animate-none md:gap-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/logo_white.png"
                alt="logo"
                className="h-w-8 w-8 md:h-12 md:w-12"
              />
              <div>
                <h1 className="!ms-0 text-sm md:text-base">
                  New version {process.env.NEXT_PUBLIC_APP_VERSION} available!{' '}
                </h1>
                <p className="mt-1 text-xs text-neutral-400">
                  <span className="sm:block">
                    Please click on reload button or reopen
                  </span>
                  <span> the app to update.</span>
                </p>
              </div>
              <div className="flex gap-2 md:gap-4">
                <Tooltip title="Reload" placement="bottom">
                  <button onClick={() => handleUpdate()}>
                    <span className="material-symbols-outlined !text-md rounded-full bg-neutral-800 p-2 transition-all delay-75 hover:scale-110 md:px-3 md:!text-xl">
                      refresh
                    </span>
                  </button>
                </Tooltip>
                <Tooltip title="Close" placement="bottom">
                  <button onClick={() => setIsOpen(false)}>
                    <span className="material-symbols-outlined !text-md rounded-full bg-neutral-800 p-2 transition-all delay-75 hover:scale-110 md:px-3 md:!text-xl">
                      close
                    </span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
