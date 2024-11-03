"use client";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import ArchiveDirectoryItem from "./ArchiveDirectoryItem";

const ArchiveDirectory = () => {
  const { parentDirs } = useQuickLinkDirectory();
  return (
    <div>
      <QuicklinkHeaderWrapper title="Archived" icon="archive" />

      <div className="flex flex-row flex-wrap gap-5 items-center mt-10  max-sm:px-10  max-sm:mt-5">
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
