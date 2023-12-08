"use client";
import { useSession } from "next-auth/react";
import { DbUser } from "../services/models/User";
import { useEffect, useMemo, useState } from "react";
import { PortalSdk } from "../services/PortalSdk";

export const useUser = (newfetch?: boolean) => {
  const { data, status } = useSession();
  const user: DbUser = useMemo(() => (data?.user as DbUser) || {}, [data]);
  const [fetchedUser, setFetchedUser] = useState<DbUser>({} as DbUser);

  useEffect(() => {
    if (!user._id || !newfetch) return;
    if (!newfetch && user._id) {
      setFetchedUser(user);
      return;
    }
    //console.log("fetching user", user._id);
    PortalSdk.getData("/api/users/users?id=" + user._id, null)
      .then((data) => {
        if (data?.users?.length === 0) return;
        // console.log("fetched user", data.users[0]);
        setFetchedUser(data.users[0]);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [user, newfetch]);

  return {
    user: newfetch ? fetchedUser : user,
    status,
    data,
  };
};
