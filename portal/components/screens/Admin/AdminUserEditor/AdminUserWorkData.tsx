"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { User } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { Spinner } from "@/components/elements/Loaders";

export const AdminUserWorkData = ({
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
    <LandscapeCard className="@shadow-lg !h-[90vh] !w-full items-start justify-start !rounded-xl !bg-gray-900 !p-6">
      <div className="mb-6 flex w-full items-center justify-between border-b border-gray-700 pb-4">
        {" "}
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
          WORK DATA
        </p>
        <button
          onClick={saveUser}
          className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white shadow-md transition hover:bg-green-700"
        >
          {loading && <Spinner className="h-6 w-6 text-green-600" />}
          {!loading && <span className="material-icons">done_all</span>}
          Save User
        </button>
      </div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="grid w-full grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="flex flex-col gap-6 text-white shadow-lg">
            <div className="flex flex-col gap-2">
              {" "}
              <p className="text-sm font-medium">Work Hours Per Week</p>
              <input
                id="workData.workHours"
                type="text"
                value={(user?.workData as any)?.workHours}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="text-sm font-medium">Position Public</p>
              <input
                id="workData.positionPublic"
                type="text"
                value={(user?.workData as any)?.positionPublic}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="text-sm font-medium">Joining Date</p>
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
                sx={{
                  border: "1px solid #737373",
                  borderRadius: "4px",
                  width: "100%",
                  backgroundColor: "#262626",
                  "& .MuiPaper-root": {
                    "& .MuiPickersLayout-root": {
                      "& MuiDateCalendar-root": {
                        backgroundColor: "#1f1f1f !important",
                      },
                    },
                  },
                  "& .MuiDateCalendar-root": {
                    backgroundColor: "#1f1f1f !important",
                  },
                  "& .MuiInputBase-input": {
                    color: "white !important",
                  },
                  "& .MuiButtonBase-root": {
                    color: "white !important",
                  },
                }}
              />
            </div>
          </div>
          {/* Right Column */}
          <div className="flex flex-col gap-6 text-white shadow-lg">
            <div className="flex flex-col gap-2">
              {" "}
              <p className="text-sm font-medium">Position Internal</p>
              <input
                id="workData.positionInternal"
                type="text"
                value={(user?.workData as any)?.positionInternal}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="text-sm font-medium">Grade</p>
              <input
                id="workData.grade"
                type="number"
                value={(user?.workData as any)?.grade}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="text-sm font-medium">Grade Tag</p>
              <input
                id="workData.gradeTag"
                type="text"
                value={(user?.workData as any)?.gradeTag}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </LocalizationProvider>
    </LandscapeCard>
  );
};
