"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { PortalSdk } from "../services/PortalSdk";
import { APP_ROUTES, LOCAL_STORAGE } from "../constants/appInfo";
import { useRouter } from "next/navigation";
import { User } from "@prisma/client";

export const useUser = (newfetch?: boolean) => {
  const { data, status } = useSession();
  const router = useRouter();
  const user = useMemo(() => (data?.user as User) || {}, [data]);
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<User | null>(null);

  //sync to local storage (if null)
  useEffect(() => {
    //console.log("fetching from session", user);
    if (user?.id && status == "authenticated") {
      const _user = localStorage.getItem(LOCAL_STORAGE.user);
      if (!_user)
        localStorage.setItem(LOCAL_STORAGE.user, JSON.stringify(user));
    }
  }, [status, user]);

  // fetch from local storage
  useEffect(() => {
    //if (newfetch) return;
    let _user: any = localStorage.getItem(LOCAL_STORAGE.user);
    //console.log("fetching from local storage", _user);
    if (_user) {
      _user = JSON.parse(_user);
      if (_user?.id) setFetchedUser(_user);
      if (_user?.id) setLocalUser(_user);
    }
  }, []);

  useEffect(() => {
    if (!localUser?.id || !newfetch) return;
    if (!newfetch && localUser.id) {
      setFetchedUser(localUser);
      return;
    }
    //console.log("fetching user", user.id);
    PortalSdk.getData("/api/user?id=" + localUser.id, null)
      .then((data) => {
        if (data?.users?.length === 0) return;
        // console.log("fetched user", data.users[0]);

        if (data?.data?.user?.[0]) {
          localStorage.setItem(
            LOCAL_STORAGE.user,
            JSON.stringify(data?.data?.user?.[0] || {})
          );
        }
        setFetchedUser(data?.data?.user?.[0]);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [localUser, newfetch]);

  return {
    user: fetchedUser?.id ? fetchedUser : localUser?.id ? localUser : user,
    status: fetchedUser?.id != null ? "authenticated" : status,
    data,
    signOutUser: () => {
      localStorage.removeItem(LOCAL_STORAGE.user);
      signOut({
        callbackUrl: APP_ROUTES.login,
      });
    },
  };
};
