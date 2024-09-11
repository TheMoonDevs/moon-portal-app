import { Directory, ParentDirectory } from "@prisma/client";
import { CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";

const getParentDirTitle = (
  parentDirId: string | null,
  parentDirs: ParentDirectory[]
) => {
  const parentDir = parentDirs.find((dir) => dir.id === parentDirId);
  return parentDir ? parentDir.title : null;
};

const RecentlyUsedDirectoryList = ({
  sortedDirectories,
  parentDirs,
  handleDirectoryClick,
}: {
  sortedDirectories: Directory[];
  parentDirs: ParentDirectory[];
  handleDirectoryClick: (directory: Directory) => void;
}) => {
  return sortedDirectories?.map((directory: Directory) => {
    const parentDirTitle = getParentDirTitle(directory.parentDirId, parentDirs);

    return (
      <div
        onClick={() => handleDirectoryClick(directory)}
        key={directory.id}
        className="flex bg-neutral-50 p-4 items-center cursor-pointer hover:bg-gray-100 transition-colors duration-200 rounded-lg"
      >
        <div className="flex items-center justify-center  mr-2">
          {!directory.logo ? (
            <span className="material-symbols-outlined text-md">folder</span>
          ) : (
            directory.logo
          )}
        </div>

        <div className="flex-1">
          <div className="text-base font-semibold">{directory.title}</div>
        </div>

        <div className="flex items-center gap-4">
          {parentDirTitle && (
            <div className="flex items-center justify-center bg-gray-200 px-3 py-1 rounded-2xl">
              <p className="text-xs text-gray-600">in {parentDirTitle}</p>
            </div>
          )}
        </div>
      </div>
    );
  });
};

const RecentlyUsed = ({ loading }: { loading: boolean }) => {
  const { directories, parentDirs, selectedRootDir, rootDirectories } =
    useQuickLinkDirectory(true);
  const router = useRouter();

  if (loading) {
    return (
      <div className="w-full flex justify-center h-52 items-center">
        <CircularProgress color="inherit" />
      </div>
    );
  }

  if (directories?.length === 0 && !loading) {
    return (
      <div className="w-full flex justify-center h-52 items-center">
        Nothing to show
      </div>
    );
  }

  const sortedDirectories = [...directories]
    ?.sort((a, b) => b.clickCount - a.clickCount)
    ?.slice(0, 11);

  const handleDirectoryClick = (directory: Directory) => {
    const findDirectoryById = (id: string) =>
      [...parentDirs, ...sortedDirectories].find((dir) => dir.id === id);

    const getRootSlug = (dir: Directory): string => {
      let currentDir: Directory | ParentDirectory = dir;

      while ("parentDirId" in currentDir && currentDir.parentDirId) {
        const parentDir = findDirectoryById(currentDir.parentDirId);
        if (!parentDir) break;

        if ("type" in parentDir) {
          return (
            rootDirectories
              .find((rootDir) => rootDir.id === parentDir.type)
              ?.slug.slice(1) || ""
          );
        }

        currentDir = parentDir;
      }

      return (
        rootDirectories
          .find((rootDir) => rootDir.id === "COMMON_RESOURCES")
          ?.slug.slice(1) || ""
      );
    };

    const getFullPath = (dir: Directory): string[] => {
      const pathSegments: string[] = [];
      let currentDir: Directory | ParentDirectory = dir;
      const rootSlug = getRootSlug(dir);

      while ("parentDirId" in currentDir && currentDir.parentDirId) {
        const parentDir = findDirectoryById(currentDir.parentDirId);
        if (!parentDir) break;

        if (
          "type" in parentDir &&
          (parentDir.type === "DEPARTMENT" ||
            parentDir.type === "COMMON_RESOURCES")
        ) {
          pathSegments.unshift(parentDir.slug);
        }

        currentDir = parentDir;
      }

      return [rootSlug, ...pathSegments, dir.slug];
    };

    const pathSegments = getFullPath(directory);
    const dirTimestampString = directory.parentDirId
      ? `-${new Date(directory.timestamp).getTime().toString().slice(-5)}`
      : "";

    const path = `/quicklinks/${pathSegments.join("/")}${dirTimestampString}`;
    router.push(path);
  };

  return (
    <div className="mt-8">
      <div className="grid md:grid-cols-5 w-full gap-4 ">
        <RecentlyUsedDirectoryList
          sortedDirectories={sortedDirectories}
          parentDirs={parentDirs}
          handleDirectoryClick={handleDirectoryClick}
        />
      </div>
    </div>
  );
};

export default RecentlyUsed;
