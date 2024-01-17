"use client";
import React, { useEffect, useRef, useState } from "react";
import { USERTYPE } from "@prisma/client";
export enum LoginState {
  SELECT_USER_TYPE = "SELECT_USER_TYPE",
  LOGIN_CODE = "LOGIN_CODE",
}

export const MobileBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col items-center justify-start p-[20px] md:p-[40px] bg-black w-[95%] md:w-[350px] lg:w-1/4 h-[98%] md:h-4/5 shadow-md rounded-lg">
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

export const LoginPassCode = ({
  onPassCodeFilled,
}: {
  onPassCodeFilled: (passCode: string) => void;
}) => {
  const passParentRef = useRef<HTMLDivElement>(null);
  const [passCodes, setPassCodes] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  useEffect(() => {
    if (passCodes.every((code) => code !== "")) {
      onPassCodeFilled(passCodes.join(""));
    }
  }, [passCodes, onPassCodeFilled]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        setPassCodes((p) => {
          // replace last not empty string with empty string in p array
          let newPassCodes = [...p];
          for (let i = newPassCodes.length - 1; i >= 0; i--) {
            if (newPassCodes[i] !== "") {
              newPassCodes[i] = "";
              if (i > 0)
                (
                  passParentRef.current?.children[i - 1] as HTMLInputElement
                ).focus();
              break;
            }
          }
          return newPassCodes;
        });
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div className="flex flex-col mb-8 mt-auto items-center">
      <div ref={passParentRef} className="flex flex-row mt-8 gap-2 text-4xl ">
        {passCodes.map((code, index) => (
          <input
            type={index > 2 ? "number" : "text"}
            key={code + index}
            className="w-[1em] uppercase text-center border-b border-neutral-600 bg-transparent text-neutral-100 focus:outline-none focus:border-blue-600"
            placeholder=""
            autoFocus={index === 0 && code === ""}
            value={code}
            onChange={(e) => {
              if (e.target.value.length < 1) return;
              setPassCodes((p) => {
                let newPassCodes = [...p];
                newPassCodes[index] =
                  e.target.value.length > 1
                    ? e.target.value.substring(0, 1)
                    : e.target.value;
                return newPassCodes;
              });
              (e.target.nextSibling as HTMLInputElement)?.focus();
            }}
          />
        ))}
      </div>
      <p className="mt-4 text-neutral-400 text-xs text-center mt-4">
        Please enter your pass code.
      </p>
    </div>
  );
};
