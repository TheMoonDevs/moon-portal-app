"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { User } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";

export const AdminUserWorkData = ({
  user,
  setUser,
  updateField,
  updateOverlap,
}: {
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
  updateField: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  updateOverlap: (index: number, field: string, value: any) => void;
}) => {
  return (
    <LandscapeCard className="items-start justify-start">
      <div className="flex flex-col mb-8 gap-4 items-center justify-start">
        <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
          WORK DATA
        </p>
      </div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="flex flex-row items-start justify-start gap-8">
          {/* Left Column */}
          <div className="flex flex-col grow gap-4 items-start justify-start">
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Joining Date</p>
              <DatePicker
                value={dayjs((user?.workData as any)?.joining)}
                onChange={(newValue) =>
                  setUser((u) => ({
                    ...u,
                    workData: {
                      ...(u.workData as JsonObject),
                      joining: newValue?.format("YYYY-MM-DD"),
                    },
                  }))
                }
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Work Hours Per Week</p>
              <input
                id="workData.workHours"
                type="text"
                value={(user?.workData as any)?.workHours}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Position Public</p>
              <input
                id="workData.positionPublic"
                type="text"
                value={(user?.workData as any)?.positionPublic}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
          </div>
          {/* Right Column */}
          <div className="flex flex-col grow gap-4 items-start justify-start ml-12">
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Position Internal</p>
              <input
                id="workData.positionInternal"
                type="text"
                value={(user?.workData as any)?.positionInternal}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Grade</p>
              <input
                id="workData.grade"
                type="number"
                value={(user?.workData as any)?.grade}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Grade Tag</p>
              <input
                id="workData.gradeTag"
                type="text"
                value={(user?.workData as any)?.gradeTag}
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
