import { useAppSelector } from "@/utils/redux/store";
import { Directory } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const useQuickLinkDirectory = () => {
  const [selectedRootDir, setSelectedRoot] = useState<Directory>();
  const { parentDirs, directories, rootDirectories } = useAppSelector(
    (state) => state.quicklinks
  );
  const pathname = usePathname();
  const rootSlug = "/quicklinks";

  useEffect(() => {
    rootDirectories?.map((root) => {
      //console.log("pathname", pathname, rootSlug + root.slug);
      if (pathname?.startsWith(rootSlug + root.slug)) {
        setSelectedRoot(root);
      }
    });
  }, [pathname, rootDirectories]);

  return {
    selectedRootDir,
    setSelectedRoot,
    rootDirectories,
    parentDirs,
    directories,
  };
};
