"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import { ChangeEvent, Dispatch, SetStateAction, useMemo } from "react";
import TimezoneSelect from "react-timezone-select";
import { getCountryDataList } from "countries-list";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Spinner } from "@/components/elements/Loaders";
import { useSearchParams } from "next/navigation";
import {
  HOUSEID,
  USERINDUSTRY,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  USERVERTICAL,
  User,
} from "@prisma/client";

export const AdminUserBasicData = ({
  user,
  loading,
  setUser,
  updateField,
  updateOverlap,
  saveUser,
  updateTextareaField,
}: {
  user: User;
  loading: boolean;
  setUser: Dispatch<SetStateAction<User>>;
  updateField: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  updateOverlap: (index: number, field: string, value: any) => void;
  saveUser: () => void;
  updateTextareaField: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}) => {
  const query = useSearchParams();

  const countryData = useMemo(() => getCountryDataList(), []);

  return (
    <LandscapeCard className="@shadow-lg !h-[90vh] !w-full items-start justify-start overflow-y-scroll !rounded-xl !bg-gray-900 !p-6">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="mb-6 flex w-full items-center justify-between border-b border-gray-700 pb-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
            User Basic Data
          </p>
          <button
            onClick={saveUser}
            className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white shadow-md transition hover:bg-green-700"
          >
            {loading ? (
              <Spinner className="h-5 w-5 animate-spin text-white" />
            ) : (
              <span className="material-icons">done_all</span>
            )}
            <span className="ml-2">Save User</span>
          </button>
        </div>
        <div className="grid w-full grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="flex flex-col gap-6 text-white shadow-lg">
            <div className="flex flex-col gap-2">
              <label htmlFor="passcode" className="text-sm font-medium">
                Passcode
              </label>
              <input
                id="passcode"
                type="text"
                value={user.username + user.password}
                onChange={(e) => {
                  setUser((u) => ({
                    ...u,
                    username: e.target.value.substring(0, 3),
                    password: e.target.value.substring(3),
                  }));
                }}
                autoComplete="off"
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Display Name
              </label>
              <input
                id="name"
                type="text"
                value={user?.name || ""}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="text"
                value={user.email || ""}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={user.description || ""}
                onChange={updateTextareaField}
                className="max-h-40 w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="avatar" className="text-sm font-medium">
                Profile Pic
              </label>
              <input
                id="avatar"
                type="text"
                value={user.avatar || ""}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  id="userType"
                  value={user.userType || ""}
                  onChange={updateField}
                  className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {Object.values(USERTYPE).map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() +
                        type.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  id="status"
                  value={user.status || ""}
                  onChange={updateField}
                  className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {Object.values(USERSTATUS).map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() +
                        status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {user.userType === "MEMBER" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <select
                    id="role"
                    value={user.role || ""}
                    onChange={updateField}
                    className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.values(USERROLE).map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() +
                          role.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Vertical</label>
                  <select
                    id="vertical"
                    value={user.vertical || ""}
                    onChange={updateField}
                    className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.values(USERVERTICAL).map((vertical) => (
                      <option key={vertical} value={vertical}>
                        {vertical}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {user.userType === "CLIENT" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Industry</label>
                  <select
                    id="industry"
                    value={user.industry || ""}
                    onChange={updateField}
                    className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.values(USERINDUSTRY).map((industry) => (
                      <option key={industry} value={industry}>
                        {industry.charAt(0).toUpperCase() +
                          industry.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
              <label
                className="mb-1 text-sm text-gray-300"
                htmlFor="positionTitle"
              >
                Position Title
              </label>
              <input
                id="positionTitle"
                type="text"
                value={user.positionTitle || ""}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <p className="mb-1 text-sm text-gray-300">House</p>
              <select
                id="house"
                value={user.house || ""}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {Object.values(HOUSEID).map((house) => (
                  <option key={house} value={house}>
                    {house}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={user.isAdmin}
                onChange={updateField}
                className="h-5 w-5 rounded-md border border-gray-600 bg-neutral-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <label
                htmlFor="isAdmin"
                className="text-sm font-medium text-gray-300"
              >
                Is Admin
              </label>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm text-gray-300">Timezone</label>
              <TimezoneSelect
                inputId="timezone"
                value={user.timezone || ""}
                onChange={(timezone) => {
                  setUser((u) => ({
                    ...u,
                    timezone:
                      typeof timezone === "string" ? timezone : timezone.value,
                  }));
                }}
                className="w-full rounded-lg border !border-neutral-600 !bg-gray-800 text-gray-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm text-gray-300">Country</label>
              <select
                id="country"
                value={user.country || ""}
                onChange={updateField}
                className="w-full cursor-pointer rounded-lg border border-neutral-600 bg-gray-800 p-2 text-gray-200 focus:ring-2 focus:ring-blue-500"
              >
                <option key={"Select Country"} value={""}>
                  Select Country
                </option>
                {countryData.map((country) => (
                  <option key={country.iso2} value={country.iso2}>
                    {country?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm text-gray-300">Created At</label>
              <DatePicker
                className="w-full rounded-lg border border-neutral-600 bg-gray-800 p-2 text-gray-200 focus:ring-2 focus:ring-blue-500"
                value={user.createdAt ? dayjs(user.createdAt) : null}
                onChange={(newValue) => {
                  setUser((u) => ({
                    ...u,
                    createdAt: newValue ? (newValue.toDate() as any) : null,
                  }));
                }}
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

            <div className="flex flex-col">
              <label className="mb-1 text-sm text-gray-300">Updated At</label>
              <DatePicker
                className="w-full rounded-lg border border-neutral-600 bg-gray-800 p-2 text-gray-200 focus:ring-2 focus:ring-blue-500"
                value={user.updatedAt ? dayjs(user.updatedAt) : null}
                onChange={(newValue) => {
                  setUser((u) => ({
                    ...u,
                    updatedAt: newValue ? (newValue.toDate() as any) : null,
                  }));
                }}
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
        </div>
      </LocalizationProvider>
    </LandscapeCard>
  );
};
