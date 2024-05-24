"use client";

import QuicklinksHeader from "@/components/screens/Quicklinks/global/QuicklinkHeader";
import QuicklinksSidebar from "@/components/screens/Quicklinks/global/QuicklinksSidebar/QuicklinkSidebar";
import { CreateLinkModal } from "../CreateLinkModal";
import { useAppSelector } from "@/utils/redux/store";
import { QuicklinksToast } from "../elements/QuicklinksToast";
import {
  setDepartmentList,
  setDirectoryList,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { useStore } from "react-redux";
import { useRef } from "react";
import { Department, Directory } from "@prisma/client";

export const QuicklinksLayout = ({
  children,
  response,
}: {
  children: React.ReactNode;
  response: {
    departments: Department[];
    directories: Directory[];
  };
}) => {
  const store = useStore();
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setDepartmentList(response.departments));
    store.dispatch(setDirectoryList(response.directories));
    initialize.current = true;
  }
  const { toast } = useAppSelector((state) => state.quicklinks);
  return (
    <main className="flex gap-4">
      <QuicklinksSidebar />
      <div className="relative my-8 pr-8 pl-4 w-full">
        <QuicklinksHeader />

        <div className="w-full relative h-screen mb-20">{children}</div>
        <CreateLinkModal />
        <QuicklinksToast
          severity={toast.toastSev}
          message={toast.toastMsg}
          position={{
            vertical: "top",
            horizontal: "center",
          }}
        />
      </div>
    </main>
  );
};
