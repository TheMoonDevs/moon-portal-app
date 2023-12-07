"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { GreyButton } from "@/components/elements/Button";
import { useUser } from "@/utils/hooks/useUser";
import { USERTYPE } from "@/utils/services/models/User";
import { TeamUsersList } from "./TeamUsersList";

export const TeamsPage = () => {
  return (
    <div className="home_bg min-h-screen">
      <TeamUsersList />
    </div>
  );
};
