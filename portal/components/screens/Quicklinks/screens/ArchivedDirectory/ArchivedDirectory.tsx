import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";

const ArchivedDirectory = () => {
  const { parentDirs, directories, rootDirectories } = useQuickLinkDirectory();

  return (
    <div>
      <QuicklinkHeaderWrapper>
        <h1 className="text-3xl font-bold flex items-center gap-4">
          <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
            archive
          </span>{" "}
          <span>Archived Directories</span>
        </h1>
      </QuicklinkHeaderWrapper>
      <div className="flex flex-row flex-wrap gap-5 items-center mt-10">
        {[
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1, 2, 3, 4, 5, 6, 7, 8, 9,
          10, 11, 12, 13,
        ].map((el, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center"
          >
            <span className="material-icons !text-9xl">folder</span>
            <p className="text-md -mt-3">parent/child{index}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArchivedDirectory;
