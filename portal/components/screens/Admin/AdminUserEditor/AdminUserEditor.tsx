"use client";

import { ChangeEvent, useEffect, useState } from "react";
import dayjs from "dayjs";
import { LoaderScreen } from "@/components/elements/Loaders";
import { useSearchParams } from "next/navigation";
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
import { AdminUserWorkData } from "./AdminUserWorkData";
import { AdminUserBasicData } from "./AdimUserBasicData";
import { AdminUserPayData } from "./AdminUserPayData";
import { AdminUserPersonalData } from "./AdminUserPersonalData";

export const AdminUserEditor = () => {
  const query = useSearchParams();
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  const [user, setUser] = useState<User>({
    id: "",
    name: "",
    username: "",
    password: "",
    email: "",
    avatar: "",
    userType: USERTYPE.MEMBER,
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
    personalData: null, // Add the missing property
    payData: null, // Add the missing property
  });

  useEffect(() => {
    const id = query?.get("id");
    if (id) {
      setLoading(true);

      PortalSdk.getData(`/api/user?id=${id}`, null)
        .then(({ data, status }) => {
          console.log(data);
          if (data.user.length > 0) setUser(data.user[0]);
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
        ...(u.workData as JsonObject),
        overlap:
          ((u?.workData as JsonObject)?.overlap as JsonArray)?.map(
            (overlap: any, i: number) => {
              if (i === index) {
                return {
                  ...overlap,
                  [field]: value,
                };
              }
              return overlap;
            }
          ) || [],
      },
    }));
  };

  const updateField = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let id: string | string[] = e.target.id;
    id = id.indexOf(".") > -1 ? id.split(".") : id;
    let _value =
      e.target instanceof HTMLInputElement
        ? e.target.type == "checkbox"
          ? e.target.checked
          : e.target.type == "date"
          ? new Date(e.target.value).toISOString()
          : e.target.value
        : e.target instanceof HTMLSelectElement
        ? e.target.value
        : "";

    if (id instanceof Array) {
      setUser((u) => ({
        ...u,
        [id[0]]: {
          ...(u[id[0] as keyof typeof u] as Record<string, any>),
          [id[1]]: _value,
        },
      }));
    } else {
      setUser((u) => ({
        ...u,
        [id as keyof typeof user]: _value,
      }));
    }
  };

  const saveUser = () => {
    setLoading(true);
    fetch("/api/user", {
      method: user.id.length > 0 ? "PUT" : "POST",
      body: JSON.stringify(user),
    })
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        if (data.status === "success")
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
  const user_id = query?.get("id");
  const showLoader = user_id && !user?.id;

  if (showLoader) return <LoaderScreen text="Loading User Data" />;

  return (
    <div className="flex flex-row flex-wrap gap-4 items-center justify-center py-10 bg-neutral-100">
      <AdminHeader />
      <AdminUserBasicData
        user={user}
        setUser={setUser}
        saveUser={saveUser}
        updateField={updateField}
        loading={loading}
        updateOverlap={updateOverlap}
      />
      <AdminUserWorkData
        user={user}
        setUser={setUser}
        saveUser={saveUser}
        loading={loading}
        updateOverlap={updateOverlap}
        updateField={updateField}
      />
      <AdminUserPayData
        user={user}
        saveUser={saveUser}
        loading={loading}
        setUser={setUser}
        updateOverlap={updateOverlap}
        updateField={updateField}
      />
      <AdminUserPersonalData
        user={user}
        setUser={setUser}
        saveUser={saveUser}
        loading={loading}
        updateOverlap={updateOverlap}
        updateField={updateField}
      />
    </div>
  );
};
