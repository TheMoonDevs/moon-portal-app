"use client";
import { useMediaQuery } from "@mui/material";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import ArchiveDirectoryItem from "./ArchiveDirectoryItem";
import media from "@/styles/media";

const ArchiveDirectory = () => {
  const { parentDirs } = useQuickLinkDirectory();
  const isTablet = useMediaQuery(media.tablet)
  return (
    <div>
      <QuicklinkHeaderWrapper title="Archived" icon="archive" />

      <div className={`flex flex-row flex-wrap gap-5 items-center mt-10  ${isTablet && 'px-10 mt-5'} max-sm:px-5`}>
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
