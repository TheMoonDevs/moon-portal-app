"use client";

import React, { useEffect, useState } from 'react';
import { useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
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

function RecentlyUsedLink() {
  const recentDirectories = useAppSelector((state) => state.quicklinks.recentDirectories);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDirectories = async () => {
      setLoading(true);
      try {
        if (recentDirectories.length > 0) {
          const data = { directoryIds: recentDirectories };
          const response = await QuicklinksSdk.createData(
            `/api/quicklinks/recent-directory/fetch`,
            data
          );

          if (response.error) {
            throw new Error(response.error);
          }
          console.log("response:", response.data);
          setDirectories(response.data.directories);
        }
      } catch (error) {
        console.error('Failed to fetch directories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectories();
  }, [recentDirectories]);

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
            <Skeleton variant="rectangular" width="100%" height={100} />
            <Skeleton variant="rectangular" width="100%" height={100} />
          </>
        ) : directories.length > 0 ? (
          directories.map((dir, index) => (
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
