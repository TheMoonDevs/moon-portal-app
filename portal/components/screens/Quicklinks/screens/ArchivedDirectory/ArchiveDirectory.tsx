"use client";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import ArchiveDirectoryItem from "./ArchiveDirectoryItem";

const ArchiveDirectory = () => {
  const { parentDirs } = useQuickLinkDirectory();
  return (
    <div>
      <QuicklinkHeaderWrapper>
        <h1 className="text-3xl font-bold flex items-center gap-4">
          <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
            archive
          </span>{" "}
          <span>Archive</span>
        </h1>
      </QuicklinkHeaderWrapper>
      <div className="flex flex-row flex-wrap gap-5 items-center mt-10">
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
