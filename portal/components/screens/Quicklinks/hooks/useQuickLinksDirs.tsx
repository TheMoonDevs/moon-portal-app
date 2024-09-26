import { useMemo } from "react";
import { useQuickLinkDirectory } from "./useQuickLinkDirectory";
import { DirectoryList } from "@prisma/client";

export const useQuickLinkDirs = (directoryId?: string | null) => {
  const { parentDirs, directories } = useQuickLinkDirectory();

  const thisDirectory =
    parentDirs.find((dir) => dir.id === directoryId) ||
    directories.find((dir) => dir.id === directoryId) ||
    null;
  const parentDirecotry =
    thisDirectory && "parentDirId" in thisDirectory
      ? parentDirs.find((dir) => dir.id === thisDirectory?.parentDirId)
      : null;

  const rootParentDirectory = useMemo(() => {
    const getParentDir = (dir?: DirectoryList | null): DirectoryList | null => {
      if (!dir) return null;

      if (dir.parentDirId && "parentDirId" in dir) {
        const _parentDir =
          directories.find((_dir) => _dir.id === dir.parentDirId) ||
          parentDirs.find((_dir) => _dir.id === dir.parentDirId);
        if (!_parentDir) return null;
        return getParentDir(_parentDir);
      } else {
        return dir;
      }
    };
    return getParentDir(thisDirectory);
  }, [thisDirectory, directories, parentDirs]);
  return {
    rootParentDirectory,
    rootParent: rootParentDirectory
      ? rootParentDirectory
      : parentDirecotry
      ? parentDirecotry
      : thisDirectory
      ? thisDirectory
      : null,
    thisDirectory,
    parentDirecotry,
  };
};
