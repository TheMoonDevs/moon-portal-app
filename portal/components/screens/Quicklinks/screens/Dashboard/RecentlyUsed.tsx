import React from 'react';
import { Directory, ParentDirectory } from '@prisma/client';
import { CircularProgress } from '@mui/material';
import { useAppSelector } from '@/utils/redux/store';
import { useRouter } from 'next/navigation';
import { useQuickLinkDirectory } from '../../hooks/useQuickLinkDirectory';

const getUsageIntensity = (
  clickCount: number,
  minClicks: number,
  maxClicks: number
) => {
  if (maxClicks === minClicks) {
    return 'Low';
  }
  const totalRange = maxClicks - minClicks;
  const highLimit = minClicks + (2 / 3) * totalRange;
  const mediumLimit = minClicks + (1 / 3) * totalRange;

  if (clickCount >= highLimit) return 'High';
  if (clickCount >= mediumLimit) return 'Medium';
  return 'Low';
};

const getParentDirTitle = (
  parentDirId: string | null,
  parentDirs: ParentDirectory[]
) => {
  const parentDir = parentDirs.find((dir) => dir.id === parentDirId);
  return parentDir ? parentDir.title : null;
};

const RecentlyUsed = ({ loading }: { loading: boolean }) => {
  const { directories, parentDirs, selectedRootDir, rootDirectories } =
    useQuickLinkDirectory(true);
  const router = useRouter();

  if (loading) {
    return (
      <div className='w-full flex justify-center h-52 items-center'>
        <CircularProgress color='inherit' />
      </div>
    );
  }

  if (directories?.length === 0 && !loading) {
    return (
      <div className='w-full flex justify-center h-52 items-center'>
        Nothing to show
      </div>
    );
  }

  const sortedDirectories = [...directories]
    ?.sort((a, b) => b.clickCount - a.clickCount)
    ?.slice(0, 10);

  const clickCounts = sortedDirectories?.map(
    (directory) => directory.clickCount
  );
  const minClicks = Math.min(...clickCounts);
  const maxClicks = Math.max(...clickCounts);

  const handleDirectoryClick = (directory: Directory) => {
    const findDirectoryById = (id: string) =>
      [...parentDirs, ...sortedDirectories].find((dir) => dir.id === id);

    const getRootSlug = (dir: Directory): string => {
      let currentDir: Directory | ParentDirectory = dir;

      while ('parentDirId' in currentDir && currentDir.parentDirId) {
        const parentDir = findDirectoryById(currentDir.parentDirId);
        if (!parentDir) break;

        if ('type' in parentDir) {
          return (
            rootDirectories
              .find((rootDir) => rootDir.id === parentDir.type)
              ?.slug.slice(1) || ''
          );
        }

        currentDir = parentDir;
      }

      return (
        rootDirectories
          .find((rootDir) => rootDir.id === 'COMMON_RESOURCES')
          ?.slug.slice(1) || ''
      );
    };

    const getFullPath = (dir: Directory): string[] => {
      const pathSegments: string[] = [];
      let currentDir: Directory | ParentDirectory = dir;
      const rootSlug = getRootSlug(dir);

      while ('parentDirId' in currentDir && currentDir.parentDirId) {
        const parentDir = findDirectoryById(currentDir.parentDirId);
        if (!parentDir) break;

        if (
          'type' in parentDir &&
          (parentDir.type === 'DEPARTMENT' ||
            parentDir.type === 'COMMON_RESOURCES')
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
      : '';

    const path = `/quicklinks/${pathSegments.join('/')}${dirTimestampString}`;
    router.push(path);
  };

  return (
    <div className='py-4'>
      <div className='grid grid-cols-1 gap-x-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2'>
        {sortedDirectories?.map((directory: Directory) => {
          const usageIntensity = getUsageIntensity(
            directory.clickCount,
            minClicks,
            maxClicks
          );
          const parentDirTitle = getParentDirTitle(
            directory.parentDirId,
            parentDirs
          );

          return (
            <div
              onClick={() => handleDirectoryClick(directory)}
              key={directory.id}
              className='flex items-center cursor-pointer mb-4 p-2 border rounded hover:bg-gray-100 transition-colors duration-200'
            >
              <div className='flex items-center justify-center w-12 h-12 bg-gray-200 rounded-md mr-4'>
                <span className='material-symbols-outlined text-md'>
                  {!directory.logo ? 'folder' : directory.logo}
                </span>
              </div>

              <div className='flex-1'>
                <div className='text-xl font-semibold mb-1'>
                  {directory.title}
                </div>
              </div>
              <div className='flex items-center gap-4'>
                {parentDirTitle && (
                  <div className='flex items-center justify-center bg-gray-200 px-3 py-1 rounded'>
                    <p className='text-sm text-gray-600'>in {parentDirTitle}</p>
                  </div>
                )}
                <div
                  className={`flex items-center px-3 py-1 rounded text-sm font-bold ${
                    usageIntensity === 'High'
                      ? 'bg-gradient-to-r from-red-50 to-red-200 text-red-800'
                      : usageIntensity === 'Medium'
                      ? 'bg-gradient-to-r from-yellow-50 to-yellow-200 text-yellow-800'
                      : 'bg-gradient-to-r from-blue-50 to-blue-200 text-blue-800'
                  }`}
                >
                  <span
                    className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      usageIntensity === 'High'
                        ? 'bg-red-800'
                        : usageIntensity === 'Medium'
                        ? 'bg-yellow-800'
                        : 'bg-blue-800'
                    }`}
                  />
                  {usageIntensity}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlyUsed;
