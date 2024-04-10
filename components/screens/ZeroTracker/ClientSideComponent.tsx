'use client';

import media from '@/styles/media';
import { useMediaQuery } from '@mui/material';
import { ZeroTrackerPage } from './ZeroTracker';
import { Bottombar } from '@/components/global/Bottombar';

export default function ClientSideComponent() {
  const isTabletAndLaptop = useMediaQuery(media.moreTablet);
  return (
    <>
      <ZeroTrackerPage />
      {isTabletAndLaptop && <Bottombar visible={isTabletAndLaptop} />}
    </>
  );
}
