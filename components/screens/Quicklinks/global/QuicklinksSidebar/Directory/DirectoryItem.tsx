import { FocusEvent, SetStateAction } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/quicklinks.slice";
import { Directory } from "@prisma/client";
import { usePathname } from "next/navigation";

interface IDirectoryItemProps {
  directory: Directory | any;
  toggleDirectory: (id: string) => void;
  isDirectoryExpanded: (id: string) => boolean;
  rootSlug: string;
  pathName: string;
  editable: {
    id: string;
    isEditable: boolean;
  };
  newDirectoryName: string;
  setNewDirectoryName: (value: string) => void;
  setEditable: (
    value: SetStateAction<{ id: string; isEditable: boolean }>
  ) => void;
  handleDirectoryNameChange: (
    event: FocusEvent<HTMLInputElement | Element>,
    id: string,
    parentId: string | null
  ) => void;
  setExpandedDirs: (value: SetStateAction<string[]>) => void;
  handleAddChildDirectory: (parentId: string) => void;
  handleDeleteDirectory: (id: string, parentId: string | null) => void;
}

export const DirectoryItem = ({
  directory,
  toggleDirectory,
  isDirectoryExpanded,
  pathName,
  rootSlug,
  editable,
  newDirectoryName,
  setNewDirectoryName,
  setEditable,
  handleDirectoryNameChange,
  setExpandedDirs,
  handleAddChildDirectory,
  handleDeleteDirectory,
}: IDirectoryItemProps) => {
  const dispatch = useAppDispatch();
  const { directories, parentDirs, rootDirectories } = useAppSelector(
    (state) => state.quicklinks
  );

  let path: string;

  path = `/quicklinks${rootSlug}/${directory.slug}?id=${directory.id}`;

  const isExpanded = isDirectoryExpanded(directory.id);
  const isCurrentPage = path.startsWith(pathName) || pathName === path;

  //console.log("isCurrentPage:", isCurrentPage, pathName, path);

  return (
    <div key={directory.id}>
      <div className="flex justify-between items-center group gap-4 ml-3">
        <div
          className="flex items-center cursor-pointer gap-1"
          onClick={() => toggleDirectory(directory.id)}
        >
          <div onClick={() => dispatch(setActiveDirectoryId(path))}>
            <Link
              href={path}
              className={`${pathName === path ? "font-extrabold" : ""} `}
            >
              {editable.isEditable === true &&
              editable.id === directory.id &&
              directory.slug !== "common-resources" ? (
                <input
                  type="text"
                  value={newDirectoryName}
                  className="focus:outline-none w-24"
                  onChange={(e) => setNewDirectoryName(e.target.value)}
                  onBlur={(e) =>
                    handleDirectoryNameChange(
                      e,
                      directory.id,
                      directory.parentDirId
                    )
                  }
                />
              ) : (
                <h3
                  className={`${isCurrentPage ? "font-extrabold" : ""} `}
                  onDoubleClick={(e) => {
                    if (directory.slug !== "common-resources") {
                      setEditable((prev) => {
                        return {
                          id: directory.id,
                          isEditable: true,
                        };
                      });
                    }
                  }}
                >
                  {editable.id === directory.id
                    ? newDirectoryName
                    : directory.title}
                </h3>
              )}
            </Link>
          </div>
            <span className="invisible group-hover:visible material-icons-outlined cursor-pointer hover:opacity-50 opacity-20 ">
              {isExpanded ? `expand_less` : `expand_more`}
            </span>
        </div>
        <div className="flex gap-1 items-center cursor-pointer">
          <span
            className="material-icons-outlined !text-base opacity-0 group-hover:opacity-50 hover:scale-110 transition-all"
            onClick={() => {
              setExpandedDirs((prev) => [...prev, directory.id]);
              handleAddChildDirectory(directory.id);
            }}
          >
            add
          </span>
          {directory.parentDirId && (
            <span
              className="material-icons-outlined !text-base opacity-0 group-hover:opacity-50 text-red-600 hover:scale-110 transition-all"
              onClick={() =>
                handleDeleteDirectory(directory.id, directory.parentDirId)
              }
            >
              delete
            </span>
          )}
        </div>
      </div>

      <ul
        className={`ml-4 mt-2 transition-all duration-300 overflow-hidden border-l-2  ${
          isExpanded
            ? "max-h-[1000px]  border-gray-200"
            : "max-h-0 overflow-hidden  border-neutral-100"
        }`}
      >
        {directories
          .filter((subdirectory) => subdirectory.parentDirId === directory.id)
          .map((subdirectory) => {
            return (
              <li key={subdirectory.id}>
                <DirectoryItem
                  directory={subdirectory}
                  toggleDirectory={toggleDirectory}
                  isDirectoryExpanded={isDirectoryExpanded}
                  pathName={pathName}
                  rootSlug={rootSlug}
                  editable={editable}
                  newDirectoryName={newDirectoryName}
                  setNewDirectoryName={setNewDirectoryName}
                  setEditable={setEditable}
                  handleDirectoryNameChange={handleDirectoryNameChange}
                  setExpandedDirs={setExpandedDirs}
                  handleAddChildDirectory={handleAddChildDirectory}
                  handleDeleteDirectory={handleDeleteDirectory}
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
};
