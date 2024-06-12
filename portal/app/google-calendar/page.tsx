"use client";
import { Label } from "../../components/elements/Label";
import { Input } from "../../components/elements/Input";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { PageAccess } from "@/components/global/PageAccess";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/elements/DatePicker";
import { TimePicker } from "@/components/elements/TimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";

const GoogleCalendar = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted");
  };

  return (
    <div className="w-full min-h-screen bg-neutral-900 flex flex-col justify-between">
      <PageAccess isAuthRequired={true}>
        <Link
          href={APP_ROUTES.home}
          className="cursor-pointer invert rounded-lg p-2 pt-3 flex items-center gap-2 text-neutral-900 hover:text-neutral-700"
        >
          <span className="icon_size material-icons">arrow_back</span>
          <h1 className="uppercase tracking-[0.2em] font-mono text-xl">Back</h1>
        </Link>
        <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl mb-5 p-4 md:p-8 shadow-input  bg-black/90 ">
          <div className="flex justify-center items-center space-x-4 md:space-x-6">
            <Image
              src="/logo/logo_white.png"
              alt="Moon Portal Logo"
              width={40}
              height={40}
              className="w-12 h-12 rounded  pointer-events-none"
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

          <form className="my-3" onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
              <LabelInputContainer>
                <Label htmlFor="email">Title</Label>
                <Input id="text" placeholder="Add Title" type="text" />
              </LabelInputContainer>
            </div>
            <LabelInputContainer className="mb-4">
              <Label htmlFor="message">Details</Label>
              <Textarea placeholder="Add Details" id="message" />
            </LabelInputContainer>
            <LabelInputContainer>
              <Label htmlFor="email">Location</Label>
              <Input id="text" placeholder="Add Location" type="text" />
            </LabelInputContainer>

            <LabelInputContainer className="mb-4">
              <Label htmlFor="message">Date</Label>
              <DatePicker />
            </LabelInputContainer>
            <LabelInputContainer>
              <Label htmlFor="twitterpassword">Repeat</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue
                    placeholder="Repeat"
                    className="text-gray-500 font-semibold"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-repeat">Doesn&apos;t repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="anuualy">Anuualy</SelectItem>
                  <SelectItem value="weekend">Every Weekend</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex  justify-between item-center gap-3">
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <div className="w-[50%]">
                    <Label>Start Time</Label>
                    <TimePicker />
                  </div>
                  <div className="w-[50%]">
                    <Label>End Time</Label>
                    <TimePicker />
                  </div>
                </LocalizationProvider>
              </div>
            </LabelInputContainer>

            <button
              className="bg-gradient-to-br mt-3 relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] transition duration-300 ease-in-out hover:from-black hover:to-neutral-700"
              type="submit"
            >
              Generate Link &rarr;
              <BottomGradient />
            </button>

            <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent  h-[1px] w-full" />
          </form>
        </div>
      </PageAccess>
    </div>
  );
};
export default GoogleCalendar;

const BottomGradient = () => {
  return (
    <>
      <span className="block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent glow-blue" />
      <span className="block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent glow-blue" />
    </>
  );
};

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
