"use client";
import { cn } from "@/app/lib/utils";
import Image from "next/image";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import Tooltip from "@mui/material/Tooltip";

import { MenuItem, TextField, Select, Checkbox } from "@mui/material";

interface FormData {
  title: string;
  details: string;
  location: string;
  startDate: Date | null;
  repeat: string;
  startTime: string | Date | null;
  endTime: string | Date | null;
  allDay: boolean;
  endRepeat: Date | null;
  endDate: Date | null;
}

const today = new Date();



const GoogleCalendaCard: React.FC = () => {
  

  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl mb-5 p-4 md:p-8 shadow-input bg-black/90">
      <div className="flex justify-center items-center space-x-4 md:space-x-6">
        <Image
          src="/logo/logo_white.png"
          alt="Moon Portal Logo"
          width={40}
          height={40}
          className="w-12 h-12 rounded pointer-events-none"
        />
        <div className="text-white text-2xl font-normal">X</div>
        <Image
          src="/icons/google-calendar.svg"
          alt="Google Calendar Icon"
          width={40}
          height={40}
          className="w-12 h-12 rounded pointer-events-none"
        />
      </div>

      <h2 className="font-bold mt-3 text-center text-xl text-white">
        Invite Link Generator
      </h2>
      <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-3 h-[1px] w-full" />

      
    </div>
  );
};
export default GoogleCalendaCard;

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
