"use client";

import React, { useEffect } from 'react';
import { useAppSelector } from "@/utils/redux/store";
import useSWR, { mutate } from 'swr';
import { Skeleton, Tooltip, Box } from "@mui/material";
import NextLink from 'next/link';
import { APP_BASE_URL } from '@/utils/constants/appInfo';

interface Directory {
  id: string;
  fullPath: string;
  parentChildPath: string;
  directoryName: string;
  logos: string[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function RecentlyUsedLink() {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const recentDirectories = useAppSelector((state) => state.quicklinks.recentDirectories);

  const { data, error, isLoading } = useSWR(
    userId ? `/api/quicklinks/recent-directory/fetch?userId=${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (userId) {
      mutate(`/api/quicklinks/recent-directory/fetch?userId=${userId}`);
    }
  }, [recentDirectories, userId]);

  const directories: Directory[] = data?.data?.directories || [];
  const loading = isLoading || !data;

  const removeEmojiFromPath = (path: string) => {
    return path.replace(/^[^/]+\s/, '');
  };

  return (
    <div className="p-4 rounded-sm my-4">
      <h2 className="uppercase tracking-[0.5rem] m-2 text-base font-normal text-gray-500">
        Recently Used Folders
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          <>
            <Skeleton variant="rectangular" width="100%" height={100} />

          </>
        ) : directories.length > 0 ? (
          directories.map((dir: Directory, index: number) => (
            <div key={index}>
              <Tooltip title={dir.parentChildPath} placement="top">
                <NextLink href={`${APP_BASE_URL}/quicklinks/${removeEmojiFromPath(dir.fullPath)}`} passHref>
                  <Box
                    component="a"
                    className="block p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out transform hover:scale-105"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-lg">{dir.logos[0]}</span>
                      <span className="hover:text-blue-500">{dir.directoryName}</span>
                    </span>
                  </Box>
                </NextLink>
              </Tooltip>
            </div>
          ))
        ) : (
          <div>No recent folders</div>
        )}
      </div>
    </div>
  );
}

export default RecentlyUsedLink;
