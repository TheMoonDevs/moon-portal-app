"use client";

import QuicklinksSidebar from "@/components/screens/Quicklinks/global/QuicklinksSidebar/QuicklinkSidebar";
import { useAppSelector, useAppDispatch } from "@/utils/redux/store";
import { QuicklinksToast } from "../elements/QuicklinksToast";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import {
  setParentDirsList,
  setDirectoryList,
  setRootDirList,
  setRecentDirectories,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { useEffect, useRef } from "react";
import { ParentDirectory, Directory } from "@prisma/client";
import { CreateLinkPopup } from "../CreateLinkPopup";

// BAD PATTERN OF SLUG IS USED, WE CANT CHANGE IT BECAUSE IT IS USED IN THE MULTIPLE COMPONENTS
const ROOT_DIRECTORIES: Omit<Directory, "timestamp">[] = [
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
    slug: "/common_resources",
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

const fetchRecentDirectories = async (userId: string | undefined): Promise<any> => {
  if (!userId) {
    console.error('User ID is required to fetch recent directories');
    return { error: 'User ID is required' };
  }

  try {
    // Use QuicklinksSdk.getData for the GET request
    const response = await QuicklinksSdk.getData(
      `/api/quicklinks/recent-directory?userId=${userId}`
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data.directoryIds;
  } catch (error: any) {
    console.error('Failed to fetch recent directories:', error);
    return { error: error.message };
  }
};

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
  const dispatch = useAppDispatch();
  const initialize = useRef(false);

  const userId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    if (!initialize.current && userId) {
      (async () => {
        let recentDir = await fetchRecentDirectories(userId);
        dispatch(setParentDirsList(response.parentDirs));
        dispatch(setDirectoryList(response.directories));
        dispatch(setRootDirList(ROOT_DIRECTORIES));
        dispatch(setRecentDirectories(recentDir));
        initialize.current = true;
      })();
    }
  }, [userId, response, dispatch]);

  const { toast } = useAppSelector((state) => state.quicklinks);

  return (
    <main className="flex min-h-screen">
      <QuicklinksSidebar />
      <div className="relative my-8 pr-8 pl-2 w-full">
        <div className="w-full relative h-screen mb-20">{children}</div>
        <CreateLinkPopup />
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
