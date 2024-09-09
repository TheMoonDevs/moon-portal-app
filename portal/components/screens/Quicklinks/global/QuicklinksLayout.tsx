"use client";

import QuicklinksSidebar from "@/components/screens/Quicklinks/global/QuicklinksSidebar/QuicklinkSidebar";
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
import { CreateLinkPopup } from "../CreateLinkPopup";
import CreateLinkOnPaste from "../CreateLinkOnPaste";

// BAD PATTERN OF SLUG IS USED, WE CANT CHANGE IT BECAUSE IT IS USED IN THE MULTIPLE COMPONENTS
const ROOT_DIRECTORIES: Omit<Directory, "timestamp">[] = [
  {
    id: "root-my-dashboard",
    title: "My Dashboard",
    parentDirId: null,
    slug: "/dashboard",
    logo: "dashboard",
    clickCount: 0,
    position: 10,
  },
  {
    id: "COMMON_RESOURCES",
    title: "Team Resources",
    parentDirId: null,
    slug: "/common-resources",
    logo: "stack",
    clickCount: 0,
    position: 20,
  },
  {
    id: "DEPARTMENT",
    title: "Departments",
    parentDirId: null,
    slug: "/department",
    logo: "groups",
    clickCount: 0,
    position: 20,
  },
];

export const QuicklinksLayout = ({
  children,
  response,
}: {
  children: React.ReactNode;
  response: {
    parentDirs: ParentDirectory[];
    directories: Directory[];
  };
}) => {
  const store = useStore();
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setParentDirsList(response.parentDirs));
    store.dispatch(setDirectoryList(response.directories));
    store.dispatch(setRootDirList(ROOT_DIRECTORIES));
    initialize.current = true;
  }
  const { toast } = useAppSelector((state) => state.quicklinks);
  return (
    <main className="flex min-h-screen ">
      <QuicklinksSidebar />
      <div className="relative my-8 pr-8 pl-2 w-full">
        <div className="w-full relative h-screen mb-20">{children}</div>
        <CreateLinkPopup />
        <CreateLinkOnPaste /> {/* Remove this to revert back to the old UI */}
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
