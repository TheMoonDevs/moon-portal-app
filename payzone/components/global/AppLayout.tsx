"use client";

import { useAuthSession } from "@/utils/hooks/useAuthSession";

export const AppLayout = ({ children }: any) => {
  useAuthSession(true);

  return <>{children}</>;
};
