"use client";

import QuicklinksHeader from "@/components/screens/Quicklinks/global/QuicklinkHeader";
import QuicklinksSidebar from "@/components/screens/Quicklinks/global/QuicklinksSidebar/QuicklinkSidebar";
import { CreateLinkModal } from "../CreateLinkModal";
import { useAppSelector } from "@/utils/redux/store";
import { QuicklinksToast } from "../elements/QuicklinksToast";
import {
  setParentDirsList,
  setDirectoryList,
  setRootDirList,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { useStore } from "react-redux";
import { useRef } from "react";
import { ParentDirectory, Directory } from "@prisma/client";

const ROOT_DIRECTORIES: Directory[] = [
  {
    id: "root-my-dashboard",
    title: "My Dashboard",
    parentDirId: null,
    slug: "/dashboard",
    logo: "dashboard",
  },
  {
    id: "COMMON_RESOURCES",
    title: "Team Resources",
    parentDirId: null,
    slug: "/common-resources",
    logo: "stack",
  },
  {
    id: "DEPARTMENT",
    title: "Departments",
    parentDirId: null,
    slug: "/department",
    logo: "groups",
  },
];

export const QuicklinksLayout = ({
  children,
  response,
}: {
  children: React.ReactNode;
  response: {
    departments: ParentDirectory[];
    directories: Directory[];
  };
}) => {
  const store = useStore();
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setParentDirsList(response.departments));
    store.dispatch(setDirectoryList(response.directories));
    store.dispatch(setRootDirList(ROOT_DIRECTORIES));
    initialize.current = true;
  }
  const { toast } = useAppSelector((state) => state.quicklinks);
  return (
    <main className="flex min-h-screen ">
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
