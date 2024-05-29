"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

import TimezoneSelect from "react-timezone-select";
import { getCountryDataList } from "countries-list";
import dayjs from "dayjs";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Spinner } from "@/components/elements/Loaders";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminHeader } from "../AdminHeader";
import { useToast } from "@/components/elements/Toast";
import { PortalSdk } from "@/utils/services/PortalSdk";
import {
  USERINDUSTRY,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  USERVERTICAL,
  User,
} from "@prisma/client";
import { JsonArray, JsonObject } from "@prisma/client/runtime/library";
import { OVERLAPTYPE } from "@/prisma/dbExtras";

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
          WORK HOURS, JOINING DATE & OTHER USER DATA
        </p>
      </div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="flex flex-row items-start justify-start gap-4">
          <div className="flex flex-col grow gap-4 items-start justify-start">
            <div className="flex flex-row gap-4 items-center justify-start">
              <p>Joining Date</p>
              <DatePicker
                label="Controlled picker"
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
              <p>Work Hours Per Week</p>
              <input
                id="workData.workHours"
                type="text"
                value={(user?.workData as any)?.workHours}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            {/* <div className="flex flex-row gap-4 items-center justify-start">
              <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
                Work Overlap
              </p>
              <button
                className="bg-neutral-400 text-neutral-100 rounded-lg px-2"
                onClick={() =>
                  setUser((u) => ({
                    ...u,
                    workData: {
                      ...(u.workData as JsonObject),
                      overlap: [
                        ...((u?.workData as any)?.overlap as any),
                        {
                          scheduleType: OVERLAPTYPE.WEEKDAYS,
                          start: "00:00",
                          end: "00:00",
                        },
                      ],
                    },
                  }))
                }
              >
                Add Overlap
              </button>
            </div> */}
            {/* {(user.workData as any).overlap?.map(
              (overlap: any, index: number) => (
                <div
                  key={index}
                  className="flex flex-row gap-4 items-center justify-start"
                >
                  <select
                    id="scheduleType"
                    value={overlap.scheduleType}
                    onChange={(e) =>
                      updateOverlap(index, e.target.id, e.target.value)
                    }
                    className="border border-neutral-400 rounded-lg p-2"
                  >
                    {Object.values(OVERLAPTYPE).map((typevalue) => (
                      <option key={typevalue} value={typevalue}>
                        {typevalue.charAt(0).toUpperCase() +
                          typevalue.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <TimePicker
                    label="Start Time"
                    value={dayjs()
                      .set("hour", overlap.start.split(":")[0])
                      .set("minute", overlap.start.split(":")[1])
                      .set("second", 0)}
                    onChange={(newValue) =>
                      updateOverlap(index, "start", newValue?.format("HH:mm"))
                    }
                  />
                  <TimePicker
                    label="End Time"
                    value={dayjs()
                      .set("hour", overlap.end.split(":")[0])
                      .set("minute", overlap.end.split(":")[1])
                      .set("second", 0)}
                    onChange={(newValue) =>
                      updateOverlap(index, "end", newValue?.format("HH:mm"))
                    }
                  />
                  <button
                    onClick={() => {
                      setUser((u) => ({
                        ...u,
                        workData: {
                          ...(u.workData as JsonObject),
                          overlap: (
                            (u?.workData as any)?.overlap as any
                          ).filter((o: any, i: number) => i !== index),
                        },
                      }));
                    }}
                    className="bg-red-400 text-neutral-100 rounded-lg px-2"
                  >
                    Delete Overlap
                  </button>
                </div>
              )
            )} */}
            {/* <div className="flex flex-row gap-4 items-center justify-start">
              <p>Work Logs Link (Clickup)</p>
              <input
                id="workData.worklogLink"
                type="text"
                value={(user.workData as any)?.worklogLink || ""}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p>Work Logs Public Link (Clickup)</p>
              <input
                id="workData.worklogPubLink"
                type="text"
                value={(user.workData as any).worklogPubLink || ""}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p>Work Exp Link (Clickup)</p>
              <input
                id="workData.workExpLink"
                type="text"
                value={(user.workData as any).workExpLink || ""}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div> */}
          </div>
        </div>
      </LocalizationProvider>
    </LandscapeCard>
  );
};
