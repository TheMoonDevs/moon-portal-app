"use client";
import React, { useEffect, useRef, useState } from "react";


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
            className="w-[1em] uppercase text-center border-b border-neutral-600 bg-transparent text-neutral-100 focus:outline-none focus:border-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            }} />
        ))}
      </div>
      <p className="mt-4 text-neutral-400 text-xs text-center">
        Please enter your pass code.
      </p>
    </div>
  );
};
