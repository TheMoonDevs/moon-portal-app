"use client";

import { FocusEvent, useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  addNewDirectory,
  deleteDirectory,
  deleteParentDir,
  setToast,
  updateDirectory,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { usePathname, useRouter } from "next/navigation";
import { Directory, ParentDirectory } from "@prisma/client";
import { revalidateRoot } from "@/utils/actions";
import { ToastSeverity } from "@/components/elements/Toast";
import { DirectoryItem } from "./DirectoryItem";
import { useQuickLinkDirectory } from "../../../hooks/useQuickLinkDirectory";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { PopoverEmojis, PopoverFolderEdit } from "../../../elements/Popovers";
import { MoveModal } from "../../../elements/Movemodal";

export const DirectoryTree = ({
  mainDirectory,
  selectedDir,
}: {
  mainDirectory: any[];
  selectedDir?: string;
}) => {
  const dispatch = useAppDispatch();
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);
  const [editable, setEditable] = useState({
    id: "",
    isEditable: false,
  });
  const pathName = usePathname();
  const { rootDirectories, parentDirs, directories } = useQuickLinkDirectory();
  const [showModal, setShowModal] = useState(false);
  const [currDirectory, setCurrDirectory] = useState({} as Directory);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    if (!selectedDir) return;

    const addParentsToExpanded = (
      array: string[],
      dirId?: string | null
    ): string[] => {
      if (!dirId) return array;

      const _thisDir =
        directories.find((dir) => dir.id === dirId) ||
        parentDirs.find((dir) => dir.id === dirId);
      let _array = array;
      if (_thisDir) {
        _array = _array.includes(_thisDir.id)
          ? _array
          : [..._array, _thisDir.id];
      }
      if (_thisDir && "parentDirId" in _thisDir) {
        return addParentsToExpanded(_array, _thisDir.parentDirId);
      } else return _array;
    };

    const newExpandedDirs = addParentsToExpanded([selectedDir], selectedDir);

    setExpandedDirs((prevExpandedDirs) => {
      const mergedExpandedDirs = new Set([
        ...prevExpandedDirs,
        ...newExpandedDirs,
      ]);
      return Array.from(mergedExpandedDirs);
    });
  }, [selectedDir, parentDirs, directories]);

  const handleDirectoryUpdate = async (
    e: FocusEvent<HTMLInputElement | Element> | MouseEvent,
    directory: Directory,
    parentId: string | null,
    updateInfo: Partial<Directory>
  ) => {
    e.preventDefault();
    setEditable((prev) => {
      return {
        ...prev,
        isEditable: false,
      };
    });
    let apiPath = "/api/quicklinks/directory";
    if (!parentId) {
      apiPath = `/api/quicklinks/parent-directory`;
    }
    const updatedDirectory = {
      ...directory,
      ...updateInfo,
    };

    try {
      dispatch(updateDirectory(updatedDirectory));
      const response = await QuicklinksSdk.updateData(
        apiPath,
        updatedDirectory
      );
      dispatch(
        setToast({ toastMsg: "Done!", toastSev: ToastSeverity.success })
      );
      revalidateRoot();
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );
      dispatch(updateDirectory(directory));
      console.log(error);
    }
  };

  const handleAddChildDirectory = async (parentDirId: string) => {
    const newDirectory = {
      title: `Untitled`,
      logo: ``,
      slug: `untitled`,
      parentDirId,
    };

    try {
      const response = await QuicklinksSdk.createData(
        "/api/quicklinks/directory",
        newDirectory
      );

      // revalidateRoot();
      dispatch(addNewDirectory(response.data.directory));
      dispatch(
        setToast({
          toastMsg: "New directory has been created!",
          toastSev: ToastSeverity.success,
        })
      );
      // console.log("New directory added:", response);
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );
      console.error("Error adding new directory:", error);
    }
    // console.log("Add child directory to parent:", parentDirId);
  };

  const toggleDirectory = (id: string) => {
    if (expandedDirs.includes(id)) {
      setExpandedDirs((prev) => prev.filter((dir) => dir !== id));
    } else {
      setExpandedDirs((prev) => [...prev, id]);
    }
  };

  const isDirectoryExpanded = (id: string) => {
    return expandedDirs.includes(id);
  };

  const router = useRouter();
  const { activeDirectoryId } = useAppSelector((state) => state.quicklinks);

  const handleMoveToDialog = (
    directory: Directory,
    parentId: string | null
  ) => {
    if (!parentId) {
      setIsParent(true);
    } else {
      setIsParent(false);
    }
    setCurrDirectory(directory);
    setShowModal(true);
  };

  const handleDeleteDirectory = async (
    directory: Directory,
    parentId: string | null,
    rootSlug?: string
  ) => {
    let apiPath = "/api/quicklinks/directory";
    if (!parentId) {
      apiPath = `/api/quicklinks/parent-directory`;
    }
    try {
      const response = await QuicklinksSdk.deleteData(
        `${apiPath}?id=${directory.id}`
      );
      if (!parentId) dispatch(deleteParentDir(response.data.newParentDirs.id));
      else dispatch(deleteDirectory(response.data.directory.id));

      if (directory.id === activeDirectoryId) {
        //if any sub-dir is deleted redirect to its parent.
        const parentDir = directories.find(
          (dir) => dir.id === directory.parentDirId
        );
        if (parentDir) {
          const timeString =
            parentDir &&
            new Date(parentDir.timestamp).getTime().toString().slice(-5);
          router.replace(
            `/quicklinks${rootSlug}/${parentDir?.slug}-${timeString}`
          );
          return;
        }

        const rootParentDir = parentDirs.find(
          (dir) => dir.id === directory?.parentDirId
        );

        // If last sub-dir is deleted - e.g. IT in Management Department, then redirect to Management
        if (rootParentDir) {
          router.replace(`/quicklinks${rootSlug}`);
          return;
        }

        //If the department or common resources itself is deleted - e.g. Management
        // const currentRootDirId = rootDirectories.find(
        //   (dir) => dir.slug === rootSlug
        // )?.id;
        // console.log(currentRootDirId, rootSlug);
        // const url =
        //   parentDirs.length > 0
        //     ? `/quicklinks${rootSlug}/${
        //         parentDirs.find((dir) => dir.type === currentRootDirId)?.slug
        //       }`
        //     : `/quicklinks/dashboard`;
        // console.log(url);
        // router.replace(url);
        router.replace(APP_ROUTES.quicklinksDashboard);
      }
    } catch (error) {
      console.log(error);
      revalidateRoot();
    }
  };

  // Filter root directories (those with null parentDirId)
  // const rootDirectories = mainDirectory.filter(
  //   (directory) => !directory.parentDirId
  // );
  // console.log("rootDirectories:", rootDirectories);
  return (
    <>
      {mainDirectory.map((directory: Directory | ParentDirectory) => (
        <div key={directory.id} className="!py-2 !border-gray-200">
          <DirectoryItem
            directory={directory as Directory}
            toggleDirectory={toggleDirectory}
            isDirectoryExpanded={isDirectoryExpanded}
            pathName={pathName as string}
            rootSlug={
              "type" in directory
                ? rootDirectories.find((_dir) => _dir.id === directory.type)
                    ?.slug || directory.slug
                : directory.slug
            }
            editable={editable}
            setEditable={setEditable}
            handleDirectoryUpdate={handleDirectoryUpdate}
            setExpandedDirs={setExpandedDirs}
            handleAddChildDirectory={handleAddChildDirectory}
            handleDeleteDirectory={handleDeleteDirectory}
          />
        </div>
      ))}
      <PopoverEmojis handleDirectoryUpdate={handleDirectoryUpdate} />
      <PopoverFolderEdit
        handleDeleteDirectory={handleDeleteDirectory}
        handleMoveToDirectory={handleMoveToDialog}
      />
      {showModal && (
        <MoveModal
          currentDirectory={currDirectory}
          isParent={isParent}
          onCancel={() => setShowModal(false)}
          onMove={() => setShowModal(false)}
        />
      )}
    </>
  );
};
