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
  const sessionUser = useMemo(() => (data?.user as User) || {}, [data]);
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<User | null>(null);

  // fetch from local storage
  useEffect(() => {
    //if (newfetch) return;
    let _user: any = localStorage.getItem(LOCAL_STORAGE.user);
    //console.log("fetching from local storage", _user);
    if (_user) {
      _user = JSON.parse(_user);
      //if (_user?.id) setFetchedUser(_user);
      if (_user?.id) setLocalUser(_user);
      if (_user?.id) setFetchedUser(_user);
    }
  }, []);

  useEffect(() => {
    let _local_user: any = localStorage.getItem(LOCAL_STORAGE.user);
    //console.log("fetching from local storage", _user);
    if (_local_user) _local_user = JSON.parse(_local_user);
    if (!sessionUser?.id || !newfetch) return;
    // unless new fetch is demanded, default fetchedUser to LocalUser
    if (!newfetch && _local_user?.id) {
      setFetchedUser(_local_user);
      return;
    }
    //console.log("fetching user", sessionUser, newfetch, fetchedUser);
    PortalSdk.getData("/api/user?id=" + sessionUser.id, null)
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
  }, [newfetch, sessionUser]);

  return {
    user: fetchedUser?.id ? fetchedUser : localUser?.id ? localUser : null,
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
