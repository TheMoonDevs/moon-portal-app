"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { User } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { personalData } from "@/prisma/UserScehmaInterfaces";
import { Spinner } from "@/components/elements/Loaders";

export const AdminUserPersonalData = ({
  user,
  loading,
  setUser,
  updateField,
  updateOverlap,
  saveUser,
}: {
  user: User;
  loading: boolean;
  setUser: Dispatch<SetStateAction<User>>;
  updateField: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  updateOverlap: (index: number, field: string, value: any) => void;
  saveUser: () => void;
}) => {
  return (
    <LandscapeCard className="items-start justify-start">
      <div className="flex mb-8 w-full gap-4 items-center justify-between">
        <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
          Personal DATA
        </p>
        <button
          onClick={saveUser}
          className="flex flex-row items-center py-1 gap-3 bg-green-100 text-green-800 rounded-lg px-2"
        >
          {loading && <Spinner className="w-6 h-6  text-green-600" />}
          {!loading && <span className="material-icons">done_all</span>}
          Save User
        </button>
      </div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="flex flex-row items-start justify-start gap-4">
          {/* Left Column */}
          <div className="flex flex-col grow gap-4 items-start justify-start">
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Date of Birth</p>
              <DatePicker
                value={dayjs((user?.personalData as any)?.dateOfBirth)}
                onChange={(newValue) =>
                  setUser((u) => ({
                    ...u,
                    personalData: {
                      ...(u.personalData as JsonObject),
                      dateOfBirth: newValue?.format("YYYY-MM-DD"),
                    },
                  }))
                }
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Phone</p>
              <input
                id="personalData.phone"
                type="text"
                value={(user?.personalData as personalData)?.phone}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Address</p>
              <input
                id="personalData.address"
                type="text"
                value={(user?.personalData as personalData)?.address}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
          </div>
          {/* Right Column */}
          <div className="flex flex-col grow gap-4 items-start justify-start ml-12">
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">City</p>
              <input
                id="personalData.city"
                type="text"
                value={(user?.personalData as personalData)?.city}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Work Hour Overlap</p>
              <input
                id="personalData.workHourOverlap"
                type="text"
                value={(user?.personalData as personalData)?.workHourOverlap}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
          </div>
        </div>
      </LocalizationProvider>
    </LandscapeCard>
  );
};
