"use client";

import { Breadcrumbs, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuickLinkDirectory } from "../hooks/useQuickLinkDirectory";
import { useCallback, useEffect, useState } from "react";
import { Directory, ParentDirectory, ROOTTYPE } from "@prisma/client";
import { useQuickLinkDirs } from "../hooks/useQuickLinksDirs";
import { useAppDispatch } from "@/utils/redux/store";
import { setPopoverElementWithData } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
export const BreadCrumbs = ({
  rootType,
  path,
}: {
  rootType?: ROOTTYPE;
  path?: string;
}) => {
  const { directories, parentDirs, activeDirectoryId } =
    useQuickLinkDirectory(true);
  const [breadcrumbPath, setBreadcrumbPath] = useState<Array<any> | []>([]);
  const { rootParentDirectory } = useQuickLinkDirs(activeDirectoryId);
  const dispatch = useAppDispatch();

  const getDirectoryById = useCallback(
    (directoryId: string) => {
      const directory =
        directories.find((dir) => dir.id === directoryId) ||
        parentDirs.find((dir) => dir.id === directoryId);
      return directory;
    },
    [directories, parentDirs]
  );

  // Function to get parents recursively
  const loadBreadcrumb = useCallback(
    (directoryId: string | null) => {
      if (!directoryId) return [];
      const parents = [];
      let currentDirectory = getDirectoryById(directoryId);

      // Traverse up the directory tree until the root (no parent)
      while (currentDirectory) {
        parents.push(currentDirectory); // Add the current directory to the list
        if (!currentDirectory.parentDirId) break; // Stop if there's no parent
        currentDirectory = getDirectoryById(currentDirectory.parentDirId);
      }

      // Return parents in reverse order so the root is first
      return parents.reverse();
    },
    [getDirectoryById]
  );

  useEffect(() => {
    console.log("activeDirectoryId", activeDirectoryId);
    const breadcrumb = loadBreadcrumb(activeDirectoryId);
    setBreadcrumbPath(breadcrumb);
  }, [activeDirectoryId, loadBreadcrumb, rootParentDirectory]);

  console.log(breadcrumbPath);

  return (
    <Breadcrumbs aria-label="breadcrumb" maxItems={2} className="!text-lg">
      {breadcrumbPath?.map((dir, index) => {
        const last = index === breadcrumbPath.length - 1;
        const to =
          dir.title === rootParentDirectory?.title
            ? `/quicklinks/${
                rootType === ROOTTYPE.COMMON_RESOURCES
                  ? "common-resources"
                  : "department"
              }/${rootParentDirectory?.slug}`
            : `/quicklinks/${
                rootType === ROOTTYPE.COMMON_RESOURCES
                  ? "common-resources"
                  : "department"
              }/${rootParentDirectory?.slug}/${dir.slug}-${new Date(
                dir.timestamp
              )
                .getTime()
                .toString()
                .slice(-5)}`;

        return last ? (
          <div
            key={dir.id}
            onClick={(e) => {
              dispatch(
                setPopoverElementWithData({
                  element: e.currentTarget,
                  anchorId: "edit-folder",
                  data: {
                    selectedDirectory: dir,
                    parentDirectoryId: dir.parentDirId,
                    rootSlug:
                      rootType === ROOTTYPE.COMMON_RESOURCES
                        ? "common-resources"
                        : "department",
                  },
                })
              );
            }}
            className="hover:bg-neutral-100  cursor-pointer flex items-center gap-2  py-1 px-2 rounded-xl"
          >
            <span className="text-neutral-700">{dir.title}</span>
            <span className="material-symbols-outlined">
              arrow_drop_down_circle
            </span>
          </div>
        ) : (
          <Link key={dir.id} href={to} replace prefetch={false}>
            {dir.title}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};
