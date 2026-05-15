import type { DirectoryList } from '@db/client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAppSelector } from '@/utils/redux/store';

export const useQuickLinkDirectory = (init?: boolean) => {
  const [currentDirectory, setCurrentDirectory] =
    useState<DirectoryList | null>();
  const [selectedRootDir, setSelectedRoot] = useState<DirectoryList>();
  const { parentDirs, directories, rootDirectories, activeDirectoryId } =
    useAppSelector((state) => state.quicklinksDirectory);
  const pathname = usePathname();
  const rootSlug = '/quicklinks';

  useEffect(() => {
    if (!init) return;
    rootDirectories?.map((root) => {
      //console.log("pathname", pathname, rootSlug + root.slug);
      if (pathname?.startsWith(rootSlug + root.slug)) {
        setSelectedRoot(root);
      }
    });
  }, [pathname, rootDirectories, init]);

  useEffect(() => {
    if (!init || !activeDirectoryId) return;
    parentDirs?.map((dir) => {
      if (activeDirectoryId == dir.id) {
        setCurrentDirectory(dir);
      }
    });
    directories?.map((dir) => {
      if (activeDirectoryId == dir.id) {
        setCurrentDirectory(dir);
      }
    });
  }, [activeDirectoryId, parentDirs, directories, init]);

  return {
    selectedRootDir,
    setSelectedRoot,
    rootDirectories,
    currentDirectory,
    setCurrentDirectory,
    parentDirs,
    directories,
    activeDirectoryId,
  };
};
