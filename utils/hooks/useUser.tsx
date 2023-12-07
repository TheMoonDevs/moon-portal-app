"use client";
import { useSession } from "next-auth/react";
import { DbUser } from "../services/models/User";

export const useUser = () => {
  const { data, status } = useSession();
  const user: DbUser = (data?.user as DbUser) || {};

  return {
    user,
    status,
    data,
  };
};
