"use client";
import React from "react";
import { USERTYPE } from "@prisma/client";
export enum LoginState {
  SELECT_USER_TYPE = "SELECT_USER_TYPE",
  LOGIN_CODE = "LOGIN_CODE",
}

export const MobileBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col items-center justify-start p-[20px] md:p-[40px] bg-black w-[95%] md:w-[350px] lg:w-1/4 h-[98%] md:h-[85%] shadow-md rounded-lg">
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
    <div className="mt-auto">
      <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
        Sign in as
      </p>
      <div className="flex flex-row mt-1 gap-4 x">
        <button
          onClick={() => onSelectUserType(USERTYPE.MEMBER)}
          className="font-bold group flex flex-row gap-3 mt-4 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-5 rounded-lg shadow-md"
        >
          <span className="material-icons font-bold text-neutral-500 group-hover:text-white">
            chevron_left
          </span>
          Member
        </button>
        <button
          onClick={() => onSelectUserType(USERTYPE.CLIENT)}
          className="font-bold group flex flex-row gap-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 rounded-lg shadow-md"
        >
          Client
          <span className="material-icons font-bold text-blue-300 group-hover:text-white">
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );
};
