"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import { MobileBox } from "../Login/Login";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  DbUser,
  OVERLAPTYPE,
  USERINDUSTRY,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  USERVERTICAL,
} from "@/utils/services/models/User";
import TimezoneSelect from "react-timezone-select";
import Select from "react-select";
import {
  getCountryData,
  countries,
  languages,
  TCountryCode,
  getCountryDataList,
} from "countries-list";
import dayjs from "dayjs";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Spinner } from "@/components/elements/Loaders";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminHeader } from "./AdminHeader";
import { useToast } from "@/components/elements/Toast";

export const AdminUserEditor = () => {
  const router = useRouter();
  const query = useSearchParams();
  const [loading, setLoading] = useState(false);
  const countryData = useMemo(() => getCountryDataList(), []);
  const { showToast } = useToast();

  const [user, setUser] = useState<DbUser>({
    _id: "",
    name: "",
    username: "",
    password: "",
    email: "",
    avatar: "",
    usertype: USERTYPE.MEMBER,
    role: USERROLE.CORETEAM,
    vertical: USERVERTICAL.DEV,
    industry: USERINDUSTRY.OTHERS,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    country: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    status: USERSTATUS.ACTIVE,
    isAdmin: false,
    workData: {
      joining: dayjs().format("YYYY-MM-DD"),
      overlap: [],
    },
  });

  useEffect(() => {
    const id = query?.get("id");
    if (id) {
      setLoading(true);
      fetch(`/api/users/users?id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          if (data.users.length > 0) setUser(data.users[0]);
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    }
  }, [query]);

  const updateOverlap = (index: number, field: string, value: any) => {
    setUser((u) => ({
      ...u,
      workData: {
        ...u.workData,
        overlap: u.workData.overlap.map((overlap: any, i: number) => {
          if (i === index) {
            return {
              ...overlap,
              [field]: value,
            };
          }
          return overlap;
        }),
      },
    }));
  };

  const updateField = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let _id: string | string[] = e.target.id;
    _id = _id.indexOf(".") > -1 ? _id.split(".") : _id;
    let _value =
      e.target instanceof HTMLInputElement
        ? e.target.type == "checkbox"
          ? e.target.checked
          : e.target.value
        : e.target instanceof HTMLSelectElement
        ? e.target.value
        : "";
    if (_id instanceof Array) {
      setUser((u) => ({
        ...u,
        [_id[0]]: {
          ...u[_id[0] as keyof DbUser],
          [_id[1]]: _value,
        },
      }));
    } else {
      setUser((u) => ({
        ...u,
        [_id as keyof DbUser]: _value,
      }));
    }
  };

  const saveUser = () => {
    setLoading(true);
    fetch("/api/users/users", {
      method: user._id.length > 0 ? "PUT" : "POST",
      body: JSON.stringify(user),
    })
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        showToast({
          id: "user-saved",
          message: "User Succesfully Saved",
          icon: "done_all",
          color: "green",
        });
        console.log(data);
      })
      .catch((err) => {
        setLoading(false);
        showToast({
          id: "user-not-saved",
          message: "Error saving user",
          icon: "close",
          color: "red",
        });
        console.log(err);
      });
  };

  return (
    <div className="flex flex-row flex-wrap gap-4 items-center justify-center py-10 bg-neutral-100">
      <AdminHeader />
      <LandscapeCard className="items-stretch justify-between">
        <div className="flex flex-row mb-8 w-full gap-4 items-center justify-between">
          <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
            ADD NEW CLIENT / MEMBER
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
                value={user?.name}
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
                value={user.email}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p>Profile Pic</p>
              <input
                id="avatar"
                type="text"
                value={user.avatar}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <div>
                <p>Type</p>
                <select
                  id="usertype"
                  value={user.usertype}
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
                  value={user.status}
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
            {user.usertype === USERTYPE.MEMBER && (
              <div className="flex flex-row gap-4 items-center justify-start">
                <div>
                  <p>Role</p>
                  <select
                    id="role"
                    value={user.role}
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
                    value={user.vertical}
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
            {user.usertype === USERTYPE.CLIENT && (
              <div className="flex flex-row gap-4 items-center justify-start">
                <div>
                  <p>Industry</p>
                  <select
                    id="role"
                    value={user.industry}
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
                value={user.timezone}
                onChange={(timezone) => {
                  setUser((u) => ({ ...u, timezone: timezone.value }));
                }}
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <h2>Country</h2>
              <select
                id="country"
                value={user.country}
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
      <LandscapeCard className="items-start justify-start">
        <div className="flex flex-col mb-8 gap-4 items-center justify-start">
          <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
            WORK HOURS, JOINING DATE & STATS
          </p>
        </div>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div className="flex flex-row items-start justify-start gap-4">
            <div className="flex flex-col grow gap-4 items-start justify-start">
              <div className="flex flex-row gap-4 items-center justify-start">
                <p>Joining Date</p>
                <DatePicker
                  label="Controlled picker"
                  value={dayjs(user.workData.joining)}
                  onChange={(newValue) =>
                    setUser((u) => ({
                      ...u,
                      workData: {
                        ...u.workData,
                        joining: newValue?.format("YYYY-MM-DD"),
                      },
                    }))
                  }
                />
              </div>
              <div className="flex flex-row gap-4 items-center justify-start">
                <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
                  Work Overlap
                </p>
                <button
                  className="bg-neutral-400 text-neutral-100 rounded-lg px-2"
                  onClick={() =>
                    setUser((u) => ({
                      ...u,
                      workData: {
                        ...u.workData,
                        overlap: [
                          ...u.workData.overlap,
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
              </div>
              {user.workData.overlap.map((overlap: any, index: number) => (
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
                          ...u.workData,
                          overlap: u.workData.overlap.filter(
                            (o: any, i: number) => i !== index
                          ),
                        },
                      }));
                    }}
                    className="bg-red-400 text-neutral-100 rounded-lg px-2"
                  >
                    Delete Overlap
                  </button>
                </div>
              ))}
              <div className="flex flex-row gap-4 items-center justify-start">
                <p>Work Logs Link (Clickup)</p>
                <input
                  id="workData.worklogLink"
                  type="text"
                  value={user.workData.worklogLink}
                  onChange={updateField}
                  className="border border-neutral-400 rounded-lg p-2"
                />
              </div>
              <div className="flex flex-row gap-4 items-center justify-start">
                <p>Work Exp Link (Clickup)</p>
                <input
                  id="workData.workExpLink"
                  type="text"
                  value={user.workData.workExpLink}
                  onChange={updateField}
                  className="border border-neutral-400 rounded-lg p-2"
                />
              </div>
            </div>
          </div>
        </LocalizationProvider>
      </LandscapeCard>
    </div>
  );
};
