"use client";

import { usePathname, useRouter } from "next/navigation";
import DirectoryActionBar from "./DirectoryActionBar";
import { useRef, useState } from "react";
import { DirectoryList, USERDIRECTORYTYPE } from "@prisma/client";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useUser } from "@/utils/hooks/useUser";

import { useAppDispatch } from "@/utils/redux/store";
import { ToastSeverity } from "@/components/elements/Toast";
import { toggleFavoriteDirectory } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import { setToast } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { useQuickLinkDirs } from "./hooks/useQuickLinksDirs";
import { useQuickLinkDirectory } from "./hooks/useQuickLinkDirectory";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { toast } from "sonner";
import { APP_BASE_URL } from "@/utils/constants/appInfo";

const ListOfDirectories = ({
  pathname = "",
  view = "gridView",
  directories,
}: {
  pathname?: string | null | undefined;
  view?: "listView" | "gridView";
  directories?: DirectoryList[];
}) => {
  const { parentDirs, directories: subDirectories } = useQuickLinkDirectory();

  // const filteredDirectories = directories.filter(
  //   (directory) =>
  //     directory.parentDirId === activeDirectoryId &&
  //     directory.isArchive === false
  // );

  const [selectedDir, setSelectedDir] = useState<DirectoryList | null>(null);
  const router = useRouter();
  const { user } = useUser();
  const { copied, copyToClipboard } = useCopyToClipboard();
  const dispatch = useAppDispatch();
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  if (!directories || directories.length === 0) return null;

  const handleToggleFavorite = async (directory: DirectoryList) => {
    dispatch(toggleFavoriteDirectory(directory));
    try {
      if (!user?.id) {
        throw new Error("User not logged in");
      }
      const response = await QuicklinksSdk.createData(
        `/api/quicklinks/directory-list/user-directory`,
        {
          directoryId: directory.id,
          userId: user?.id,
          directoryType: USERDIRECTORYTYPE.FAVORITED,
        }
      );
      if (response) {
        dispatch(
          setToast({
            toastMsg: response.statusText,
            toastSev: ToastSeverity.success,
          })
        );
      }
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );
      dispatch(toggleFavoriteDirectory(directory));
      console.log(error);
    }
  };

  const handleSingleClick = (directory: DirectoryList) => {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
    }
    clickTimeout.current = setTimeout(() => {
      setSelectedDir((prev) =>
        prev && prev?.id === directory.id ? null : directory
      );
    }, 250);
  };

  const handleDoubleClick = async (directory: DirectoryList) => {
    clearTimeout(clickTimeout.current!);
    if (!user?.id) return;
    try {
      const response = await QuicklinksSdk.createData(
        `/api/quicklinks/directory-list/user-directory`,
        {
          directoryId: directory.id,
          userId: user?.id,
          directoryType: USERDIRECTORYTYPE.OTHER,
        }
      );
      const href = getConstructedPath(directory);
      console.log("href", href);
      router.push(href || "/");
    } catch (error) {
      console.log(error);
    }
  };
  // Modified findParentRecursively function
  const findParentRecursively = (
    dir: DirectoryList
  ): DirectoryList | undefined => {
    // console.log("Current dir in recursion:", dir);

    // Check if the parent is a top-level parent (parentDirId is null)
    const parentDir = parentDirs.find(
      (parent) => parent.id === dir.parentDirId
    );

    if (parentDir?.parentDirId === null) {
      // console.log("Found top-level parent:", parentDir);
      return parentDir; // Return the top-level parent
    }

    // Otherwise, continue recursively up the tree to find the top-level parent
    const grandParentDir = subDirectories.find(
      (directory) => directory.id === dir.parentDirId
    );
    return findParentRecursively(grandParentDir as DirectoryList);
  };

  const getConstructedPath = (directory: DirectoryList): string | null => {
    console.log("Constructing path for:", directory);

    const rootPath = "/quicklinks";
    const basePath =
      directory.tabType === "DEPARTMENT" ? "/department" : "/common-resources";

    // console.log("Current directory:", directory);

    // If the directory itself is a top-level parent, construct path directly
    if (!directory.parentDirId) {
      // console.log("Directory is a top-level parent");
      return rootPath + basePath + "/" + directory.slug;
    }

    // Find the top-level parent, skipping the immediate parent
    const topLevelParentDir = findParentRecursively(directory);

    if (!topLevelParentDir) {
      // console.log("Top-level parent not found for", directory.slug);
      return null;
    }

    // Construct the path, including only the top-level parent and the current directory
    // console.log(
    //   "Constructing path with:",
    //   topLevelParentDir.slug,
    //   directory.slug
    // );

    return (
      rootPath +
      basePath +
      "/" +
      topLevelParentDir.slug +
      "/" +
      directory.slug +
      "-" +
      new Date(directory.timestamp as Date).getTime().toString().slice(-5)
    );
  };

  const handleShareLink = async (directory: DirectoryList) => {
    try {
      const linkURL = getConstructedPath(directory);
      if (!linkURL) {
        toast.error("Link can't be shared.");
        return;
      }
      await copyToClipboard(APP_BASE_URL + linkURL);
      toast.success("Copied link to clipboard.");
    } catch (error: any) {
      toast.error("Error copying link");
      console.error(error.message);
    }
  };

  return (
    <div className="w-full">
      <DirectoryActionBar
        selectedDir={selectedDir}
        setSelectedDir={setSelectedDir}
        handleToggleFavorite={handleToggleFavorite}
        handleShareLink={handleShareLink}
      />
      {/* <Divider /> */}
      {view === "gridView" && (
        <div className={` mt-2 flex gap-4 `}>
          {directories.length > 0 &&
            directories.map((directory) => {
              if (directory.isArchive) return null;
              const href = getConstructedPath(directory);
              return (
                <div
                  key={directory.id}
                  onClick={() => handleSingleClick(directory)}
                  onDoubleClick={() => handleDoubleClick(directory)}
                  className={`cursor-pointer pointer-events-auto rounded-2xl p-2 ${
                    selectedDir?.id === directory.id
                      ? "bg-blue-100"
                      : "bg-neutral-100 hover:bg-neutral-50"
                  }`}
                >
                  <div>
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className="material-symbols-outlined p-2 !font-extralight"
                        style={{ fontSize: "4rem" }}
                      >
                        folder
                      </span>

                      <h1>{directory.title}</h1>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {view === "listView" && (
        <div className={` mt-2 flex flex-col gap-4 `}>
          {directories.length > 0 &&
            directories.map((directory) => {
              if (directory.isArchive) return null;
              // const href = getConstructedPath(directory);

              return (
                <div
                  key={directory.id}
                  onClick={() => handleSingleClick(directory)}
                  onDoubleClick={() => handleDoubleClick(directory)}
                  className={`cursor-pointer pointer-events-auto rounded-2xl ${
                    selectedDir?.id === directory.id
                      ? "bg-blue-100"
                      : "bg-neutral-100 hover:bg-neutral-50"
                  }`}
                >
                  <div>
                    <div className="flex gap-1 items-center">
                      <span
                        className="material-symbols-outlined p-2 !font-extralight"
                        style={{ fontSize: "2rem" }}
                      >
                        folder
                      </span>

                      <h1>{directory.title}</h1>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default ListOfDirectories;
