'use client';
import React from 'react';
import { USERTYPE } from '@prisma/client';
import { cn } from '@/lib/utils';
export enum LoginState {
  SELECT_USER_TYPE = 'SELECT_USER_TYPE',
  LOGIN_CODE = 'LOGIN_CODE',
}

export const MobileBox = ({
  children,
  customClass,
}: {
  children: React.ReactNode;
  customClass?: string;
}) => {
  return (
    <div
      className={cn(
        'relative flex w-[95%] flex-col items-center justify-start rounded-lg bg-black shadow-md md:w-[350px] lg:w-1/4',
        customClass,
      )}
    >
      {children}
    </div>
  );
};

export const LoginButtons = ({
  onSelectUserType,
}: {
  onSelectUserType: (type: USERTYPE) => void;
}) => {
  return (
    <div className="mt-auto w-3/4">
      <p className="text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
        Sign in as
      </p>
      <div className="x mt-1 flex w-full flex-col gap-4">
        <button
          onClick={() => onSelectUserType(USERTYPE.MEMBER)}
          className="group mt-4 flex flex-row justify-center gap-3 rounded-lg bg-neutral-800 px-5 py-2 font-bold text-white shadow-md hover:bg-neutral-700"
        >
          {/* <span className="material-icons font-bold text-neutral-500 group-hover:text-white">
            chevron_left
          </span> */}
          Member
        </button>
        <div className="flex items-center gap-4">
          <div className="h-px w-full bg-neutral-700"></div>
          <div className="text-gray-400">or</div>
          <div className="h-px w-full bg-neutral-700"></div>
        </div>
        <button
          onClick={() => onSelectUserType(USERTYPE.CLIENT)}
          className="group flex flex-row justify-center gap-3 rounded-lg bg-blue-600 px-5 py-2 font-bold text-white shadow-md hover:bg-blue-700"
        >
          Client
          {/* <span className="material-icons font-bold text-blue-300 group-hover:text-white">
            chevron_right
          </span> */}
        </button>
      </div>
    </div>
  );
};
