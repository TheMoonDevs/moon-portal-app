import { useAppSelector } from "@/utils/redux/store";
import { Directory, ParentDirectory } from "@prisma/client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const useQuickLinkDirectory = (init?: boolean) => {
  const [currentDirectory, setCurrentDirectory] = useState<
    Directory | ParentDirectory | null
  >();
  const [selectedRootDir, setSelectedRoot] = useState<Directory>();
  const { parentDirs, directories, rootDirectories } = useAppSelector(
    (state) => state.quicklinks
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const directoryId = searchParams?.get("id");
  const rootSlug = "/quicklinks";

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
    if (!init || !directoryId) return;
    parentDirs?.map((dir) => {
      if (directoryId == dir.id) {
        setCurrentDirectory(dir);
      }
    });
    directories?.map((dir) => {
      if (directoryId == dir.id) {
        setCurrentDirectory(dir);
      }
    });
  }, [directoryId, parentDirs, directories, init]);

  return {
    selectedRootDir,
    setSelectedRoot,
    rootDirectories,
    currentDirectory,
    setCurrentDirectory,
    parentDirs,
    directories,
  };
};
