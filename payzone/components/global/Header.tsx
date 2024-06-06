"use client";

import Image from "next/image";
import { useState, useEffect } from 'react';

export const Header = ({ title } : { title : string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formattedDate = time.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
  });
  const formattedTime = time.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="flex justify-between items-center w-full pt-6 text-white">
      <div className="flex items-center w-auto gap-4">
        <Image src="/logo/logo_white.png" alt="" width={56} height={56} />
        <p className="text-sm tracking-[.2em]">
          THE <br /> MOON <br /> DEVS
        </p>
      </div>

      <p className="text-2xl tracking-[.2em]">{title}</p>

      <div className="flex flex-col items-end">
        <p className="text-2xl tracking-wider">{`${formattedDate}`}</p>
        <p className="text-sm tracking-wider">{`${formattedTime} IST`}</p>
      </div>
    </div>
  );
};
