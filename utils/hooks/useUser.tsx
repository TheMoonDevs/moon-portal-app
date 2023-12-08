"use client";
import { useSession, signOut } from "next-auth/react";
import { DbUser } from "../services/models/User";
import { useEffect, useMemo, useState } from "react";
import { PortalSdk } from "../services/PortalSdk";
import { APP_ROUTES, LOCAL_STORAGE } from "../constants/appInfo";
import { useRouter } from "next/navigation";

export const useUser = (newfetch?: boolean) => {
  const { data, status } = useSession();
  const router = useRouter();
  const user: DbUser = useMemo(() => (data?.user as DbUser) || {}, [data]);
  const [fetchedUser, setFetchedUser] = useState<DbUser>({} as DbUser);
  const [localUser, setLocalUser] = useState<DbUser>({} as DbUser);

  //sync to local storage (if null)
  useEffect(() => {
    //console.log("fetching from session", user);
    if (user?._id && status == "authenticated") {
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
      if (_user?._id) setFetchedUser(_user);
      if (_user?._id) setLocalUser(_user);
    }
  }, []);

  useEffect(() => {
    if (!localUser._id || !newfetch) return;
    if (!newfetch && localUser._id) {
      setFetchedUser(localUser);
      return;
    }
    //console.log("fetching user", user._id);
    PortalSdk.getData("/api/users/users?id=" + localUser._id, null)
      .then((data) => {
        if (data?.users?.length === 0) return;
        // console.log("fetched user", data.users[0]);
        localStorage.setItem(LOCAL_STORAGE.user, JSON.stringify(data.users[0]));
        setFetchedUser(data.users[0]);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [localUser, newfetch]);

  return {
    user: fetchedUser?._id ? fetchedUser : localUser?._id ? localUser : user,
    status: fetchedUser?._id != null ? "authenticated" : status,
    data,
    signOutUser: () => {
      localStorage.removeItem(LOCAL_STORAGE.user);
      signOut({
        callbackUrl: APP_ROUTES.login,
      });
    },
  };
};
