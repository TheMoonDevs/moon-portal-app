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
import { AdminUserWorkData } from "./AdminUserWorkData";

export const AdminUserBasicData = ({
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
  const query = useSearchParams();
  const user_id = query?.get("id");

  const countryData = useMemo(() => getCountryDataList(), []);

  return (
    <LandscapeCard className="items-stretch justify-between">
      <div className="flex flex-row mb-8 w-full gap-4 items-center justify-between">
        <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
          USER BASIC DATA
        </p>
        <button
          onClick={saveUser}
          className="flex flex-row items-center py-1 gap-3 bg-green-100 text-green-800 rounded-lg px-2"
        >
          {loading && (
            <Spinner className="w-3 h-3 fill-green-400 text-green-600" />
          )}
          {!loading && <span className="material-icons">done_all</span>}
          Save User
        </button>
      </div>
      <div className="flex flex-row items-start justify-start gap-4">
        <div className="flex flex-col grow gap-4 items-start justify-start">
          <div className="flex flex-row gap-4 items-center justify-start">
            <label htmlFor="name">Passcode</label>
            <input
              id="name"
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
              className="border border-neutral-400 rounded-lg p-2"
            />
          </div>
          <div className="flex flex-row gap-4 items-center justify-start">
            <label htmlFor="name">Display Name</label>
            <input
              id="name"
              type="text"
              value={user?.name || ""}
              onChange={updateField}
              autoComplete="off"
              className="border border-neutral-400 rounded-lg p-2"
            />
          </div>
          <div className="flex flex-row gap-4 items-center justify-start">
            <p>Email</p>
            <input
              id="email"
              type="text"
              value={user.email || ""}
              onChange={updateField}
              className="border border-neutral-400 rounded-lg p-2"
            />
          </div>
          <div className="flex flex-row gap-4 items-center justify-start">
            <p>Profile Pic</p>
            <input
              id="avatar"
              type="text"
              value={user.avatar || ""}
              onChange={updateField}
              className="border border-neutral-400 rounded-lg p-2"
            />
          </div>
          <div className="flex flex-row gap-4 items-center justify-start">
            <div>
              <p>Type</p>
              <select
                id="userType"
                value={user.userType || ""}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              >
                {Object.values(USERTYPE).map((typevalue) => (
                  <option key={typevalue} value={typevalue}>
                    {typevalue.charAt(0).toUpperCase() +
                      typevalue.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p>Status</p>
              <select
                id="status"
                value={user.status || ""}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              >
                {Object.values(USERSTATUS).map((typevalue) => (
                  <option key={typevalue} value={typevalue}>
                    {typevalue.charAt(0).toUpperCase() +
                      typevalue.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {user.userType === "MEMBER" && (
            <div className="flex flex-row gap-4 items-center justify-start">
              <div>
                <p>Role</p>
                <select
                  id="role"
                  value={user.role || ""}
                  onChange={updateField}
                  className="border border-neutral-400 rounded-lg p-2"
                >
                  {Object.values(USERROLE).map((typevalue) => (
                    <option key={typevalue} value={typevalue}>
                      {typevalue.charAt(0).toUpperCase() +
                        typevalue.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p>Vertical</p>
                <select
                  id="vertical"
                  value={user.vertical || ""}
                  onChange={updateField}
                  className="border border-neutral-400 rounded-lg p-2"
                >
                  {Object.values(USERVERTICAL).map((typevalue) => (
                    <option key={typevalue} value={typevalue}>
                      {typevalue.charAt(0).toUpperCase() +
                        typevalue.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p>is Admin</p>
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={user.isAdmin}
                  onChange={updateField}
                  className="border border-neutral-400 rounded-lg p-2"
                />
              </div>
            </div>
          )}
          {user.userType === "CLIENT" && (
            <div className="flex flex-row gap-4 items-center justify-start">
              <div>
                <p>Industry</p>
                <select
                  id="role"
                  value={user.industry || ""}
                  onChange={updateField}
                  className="border border-neutral-400 rounded-lg p-2"
                >
                  {Object.values(USERINDUSTRY).map((typevalue) => (
                    <option key={typevalue} value={typevalue}>
                      {typevalue.charAt(0).toUpperCase() +
                        typevalue.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col grow gap-4 items-start justify-start">
          <div className="flex flex-row gap-4 items-center justify-start">
            <p>Timezone</p>
            <TimezoneSelect
              inputId="timezone"
              value={user.timezone || ""}
              onChange={(timezone) => {
                setUser((u) => ({ ...u, timezone: timezone.value }));
              }}
            />
          </div>
          <div className="flex flex-row gap-4 items-center justify-start">
            <h2>Country</h2>
            <select
              id="country"
              value={user.country || ""}
              onChange={updateField}
              className="border border-neutral-400 rounded-lg p-2"
            >
              <option key={"Select Country"} value={""}>
                {"Select Country"}
              </option>
              {countryData.map((country) => (
                <option key={country.iso2} value={country.iso2}>
                  {country?.name}
                </option>
              ))}
            </select>
          </div>
          <p>Work-Overlap</p>
        </div>
      </div>
    </LandscapeCard>
  );
};
