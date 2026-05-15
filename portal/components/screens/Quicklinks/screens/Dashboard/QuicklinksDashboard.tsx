'use client';
import { useMediaQuery } from '@mui/material';

import media from '@/styles/media';

import FolderSection from './FolderSection';
import LinksSection from './LinksSection';

export const QuicklinksDashboard = () => {
  const isTablet = useMediaQuery(media.tablet);
  return (
    <>
      <div className="flex w-full gap-10">
        <div className={`w-[65%] ${isTablet && 'w-full'}`}>
          <LinksSection />
        </div>
        <div className={`mt-[10px] w-[35%] ${isTablet && 'hidden'}`}>
          <FolderSection />
        </div>
      </div>
    </>
  );
};
