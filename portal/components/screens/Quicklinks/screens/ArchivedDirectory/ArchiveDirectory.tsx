'use client';
import { useMediaQuery } from '@mui/material';

import media from '@/styles/media';

import QuicklinkHeaderWrapper from '../../global/QuicklinkHeaderWrapper';
import { useQuickLinkDirectory } from '../../hooks/useQuickLinkDirectory';
import ArchiveDirectoryItem from './ArchiveDirectoryItem';

const ArchiveDirectory = () => {
  const { parentDirs } = useQuickLinkDirectory();
  const isTablet = useMediaQuery(media.tablet);
  return (
    <div>
      <QuicklinkHeaderWrapper title="Archived" icon="archive" />

      <div
        className={`mt-10 flex flex-row flex-wrap items-center gap-5 ${isTablet && 'mt-5 px-10'} max-sm:px-5`}
      >
        {parentDirs.map((parentDirectory, index) => (
          <ArchiveDirectoryItem
            key={parentDirectory.id}
            directory={parentDirectory}
          />
        ))}
      </div>
    </div>
  );
};

export default ArchiveDirectory;
