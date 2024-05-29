"use client";

import { FocusEvent, useEffect, useState } from "react";

import { useAppDispatch } from "@/utils/redux/store";
import {
  addNewDirectory,
  deleteDirectory,
  setToast,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { usePathname } from "next/navigation";
import { Directory, ParentDirectory } from "@prisma/client";
import { revalidateRoot } from "@/utils/actions";
import { ToastSeverity } from "@/components/elements/Toast";
import { DirectoryItem } from "./DirectoryItem";
import { useQuickLinkDirectory } from "../useQuickLinkDirectory";

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
  const [newDirectoryName, setNewDirectoryName] = useState<string>("");
  const pathName = usePathname();
  const { rootDirectories, parentDirs, directories } = useQuickLinkDirectory();

  useEffect(() => {
    if (!selectedDir) return;

    // recursive parents expander
    const addParentsToExpaned = (
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
        return addParentsToExpaned(_array, _thisDir.parentDirId);
      } else return _array;
    };

    const array = addParentsToExpaned([selectedDir], selectedDir);
    //console.log("expanded", array);

    //QL-TODO - if a different parent tree is open, we do not wish to close it,
    // bu following the current logic it is closing.
    setExpandedDirs(array);
  }, [selectedDir, parentDirs, directories]);

  const handleDirectoryNameChange = async (
    e: FocusEvent<HTMLInputElement | Element>,
    id: string,
    parentId: string | null
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
      apiPath = `/api/quicklinks/department`;
    }
    try {
      const response = await QuicklinksSdk.updateData(apiPath, {
        directoryId: id,
        newTitle: newDirectoryName,
        newSlug: newDirectoryName.toLowerCase().replace(/ /g, "-"),
      });
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

      revalidateRoot();
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
  const handleDeleteDirectory = async (id: string, parentId: string | null) => {
    let apiPath = "/api/quicklinks/directory";
    if (!parentId) {
      apiPath = `/api/quicklinks/department`;
    }
    try {
      const response = await QuicklinksSdk.deleteData(`${apiPath}?id=${id}`);
      dispatch(deleteDirectory(response.data.directory.id));
    } catch (error) {
      console.log(error);
      revalidateRoot();
    }
  };

  const isDirectoryPage = () => {};

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
            directory={directory}
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
            newDirectoryName={newDirectoryName}
            setNewDirectoryName={setNewDirectoryName}
            setEditable={setEditable}
            handleDirectoryNameChange={handleDirectoryNameChange}
            setExpandedDirs={setExpandedDirs}
            handleAddChildDirectory={handleAddChildDirectory}
            handleDeleteDirectory={handleDeleteDirectory}
          />
        </div>
      ))}
    </>
  );
};
