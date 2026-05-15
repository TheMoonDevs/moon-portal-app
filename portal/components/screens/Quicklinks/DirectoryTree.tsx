'use client';
import type { DirectoryList } from '@db/client';
import { useRouter } from 'next/navigation';

import { useQuickLinkDirectory } from './hooks/useQuickLinkDirectory';
import { useQuickLinkDirs } from './hooks/useQuickLinksDirs';

interface DirectoryTreeProps {
  directories: DirectoryList[];
  currentDirId: string;
  activeDirectoryId: string;
  getConstructedPath: (directory: DirectoryList) => string | null;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  directories,
  currentDirId,
  activeDirectoryId,
  getConstructedPath,
}) => {
  const router = useRouter();
  const currentDirectory = directories.find((dir) => dir.id === currentDirId);
  if (!currentDirectory) return null;
  const childDirectories = directories.filter(
    (dir) => dir.parentDirId === currentDirId,
  );
  const getDepth = (dirId: string): number => {
    const dir = directories.find((d) => d.id === dirId);
    if (!dir || !dir.parentDirId) return 0;
    return 1 + getDepth(dir.parentDirId);
  };

  const maxDepth = getDepth(activeDirectoryId);
  const currDepth = getDepth(currentDirId);

  const handleGotoDirectory = () => {
    const href = getConstructedPath(currentDirectory);
    router.push(href || '/');
  };

  if (currDepth > maxDepth) return;

  return (
    <div className="ml-2 p-2 pb-0">
      <div
        className="flex items-center rounded-2xl p-1 px-2 hover:cursor-pointer hover:bg-neutral-200 hover:transition-all"
        onClick={handleGotoDirectory}
      >
        <span className="material-symbols-outlined mr-2">folder</span>
        <span>{currentDirectory.title}</span>
      </div>
      {childDirectories.map((childDir) => (
        <DirectoryTree
          key={childDir.id}
          directories={directories}
          currentDirId={childDir.id}
          activeDirectoryId={activeDirectoryId}
          getConstructedPath={getConstructedPath}
        />
      ))}
    </div>
  );
};

interface RecursiveDirectoryTreeProps {}

const RecursiveDirectoryTree: React.FC<RecursiveDirectoryTreeProps> = () => {
  const { directories, parentDirs, activeDirectoryId } =
    useQuickLinkDirectory(true);
  const { rootParentDirectory } = useQuickLinkDirs(activeDirectoryId);

  const getConstructedPath = (directory: DirectoryList): string | null => {
    const rootPath = '/quicklinks';
    const basePath =
      directory.tabType === 'DEPARTMENT' ? '/department' : '/common-resources';
    if (!directory.parentDirId) {
      return rootPath + basePath + '/' + directory.slug;
    }

    const topLevelParentDir = rootParentDirectory;

    if (!topLevelParentDir) {
      return null;
    }
    return (
      rootPath +
      basePath +
      '/' +
      topLevelParentDir.slug +
      '/' +
      directory.slug +
      '-' +
      new Date(directory.timestamp as Date).getTime().toString().slice(-5)
    );
  };

  console.log(rootParentDirectory?.id as string);
  console.log(activeDirectoryId);
  if (!rootParentDirectory || !activeDirectoryId) return;
  if ((rootParentDirectory?.id as string) === (activeDirectoryId as string))
    return;
  return (
    <div className="mt-3">
      <h1 className="mb-2 text-xl font-semibold">Directory Tree</h1>
      <div className="rounded-2xl bg-neutral-50 py-2">
        <DirectoryTree
          directories={[...directories, ...parentDirs]}
          currentDirId={rootParentDirectory?.id as string}
          activeDirectoryId={activeDirectoryId as string}
          getConstructedPath={getConstructedPath}
        />
      </div>
    </div>
  );
};

export default RecursiveDirectoryTree;
