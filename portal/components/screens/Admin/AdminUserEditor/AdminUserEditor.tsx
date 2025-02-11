"use client";

import { ChangeEvent, useEffect, useState } from "react";
import dayjs from "dayjs";
import { LoaderScreen } from "@/components/elements/Loaders";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminHeader } from "../AdminHeader";
import { useToast } from "@/components/elements/Toast";
import { PortalSdk } from "@/utils/services/PortalSdk";
import {
  HOUSEID,
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
import { APP_ROUTES, TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";
import Link from "next/link";
const initialUserState: User = {
  id: "",
  name: "",
  username: "",
  password: "",
  passphrase: "",
  email: "",
  avatar: "",
  house: HOUSEID.PRODUCT_TECH,
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
  slackId: "",
  thirdPartyData: null,
  banner: "",
  description: "",
  positionTitle: "",
};

const sidebarItems = [
  { name: "AdminUserBasicData", label: "Basic Details", icon: "group" },
  {
    name: "AdminUserWorkData",
    label: "Work Details",
    icon: "notifications",
  },
  { name: "AdminUserPayData", label: "Payment Details", icon: "badge" },
  { name: "AdminUserPersonalData", label: "Personal Details", icon: "event" },
];

export const AdminUserEditor = () => {
  const query = useSearchParams();
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUserState);
  const [activeComponent, setActiveComponent] = useState("AdminUserBasicData");

  const renderComponent = () => {
    switch (activeComponent) {
      case "AdminUserBasicData":
        return (
          <AdminUserBasicData
            user={user}
            setUser={setUser}
            saveUser={saveUser}
            updateField={updateField}
            loading={loading}
            updateOverlap={updateOverlap}
            updateTextareaField={updateTextareaField}
          />
        );
      case "AdminUserWorkData":
        return (
          <AdminUserWorkData
            user={user}
            setUser={setUser}
            saveUser={saveUser}
            loading={loading}
            updateOverlap={updateOverlap}
            updateField={updateField}
          />
        );
      case "AdminUserPayData":
        return (
          <AdminUserPayData
            user={user}
            saveUser={saveUser}
            loading={loading}
            setUser={setUser}
            updateOverlap={updateOverlap}
            updateField={updateField}
          />
        );
      case "AdminUserPersonalData":
        return (
          <AdminUserPersonalData
            user={user}
            setUser={setUser}
            saveUser={saveUser}
            loading={loading}
            updateOverlap={updateOverlap}
            updateField={updateField}
          />
        );
      default:
        return (
          <AdminUserBasicData
            user={user}
            setUser={setUser}
            saveUser={saveUser}
            updateField={updateField}
            loading={loading}
            updateOverlap={updateOverlap}
            updateTextareaField={updateTextareaField}
          />
        );
    }
  };

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
    } else {
      setUser(initialUserState);
      router.refresh();
    }
  }, [query, router]);

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
            },
          ) || [],
      },
    }));
  };

  const updateField = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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

  const updateTextareaField = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setUser((u) => ({
      ...u,
      [id]: value,
    }));
  };

  const saveUser = () => {
    setLoading(true);
    fetch("/api/user", {
      method: user.id.length > 0 ? "PUT" : "POST",
      body: JSON.stringify(user),
      headers: {
        tmd_portal_api_key: TMD_PORTAL_API_KEY,
      },
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
    <div className="flex h-screen bg-neutral-700">
      <div className="flex w-64 flex-col justify-between bg-neutral-900 p-5">
        <Link href={APP_ROUTES.home}>
          <img
            src="/logo/logo_white.png"
            alt="Company Logo"
            className="mx-auto w-32 cursor-pointer"
          />
        </Link>
        <div className="mt-10 flex flex-col gap-4">
          <Link
            href={APP_ROUTES.admin}
            className={`} flex items-center gap-2 rounded-lg p-2 text-white hover:bg-neutral-800`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Go to Dashboard
          </Link>
          <Link
            href={APP_ROUTES.userEditor}
            className={`} flex items-center gap-2 rounded-lg p-2 text-white hover:bg-neutral-800`}
          >
            <span className="material-symbols-outlined">person_add</span>
            Add new User
          </Link>
          {sidebarItems.map((item) => (
            <button
              key={item.name}
              className={`flex items-center gap-2 rounded-lg p-2 text-white hover:bg-neutral-800 ${
                activeComponent === item.name ? "bg-neutral-800" : ""
              }`}
              onClick={() => setActiveComponent(item.name)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5">
        {/* <AdminHeader /> */}
        <div className="flex flex-1 justify-center overflow-y-auto">
          {renderComponent()}
        </div>
      </div>
    </div>
  );
};
