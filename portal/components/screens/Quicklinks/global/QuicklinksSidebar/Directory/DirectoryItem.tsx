import { FocusEvent, SetStateAction, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/quicklinks.slice";
import { Directory } from "@prisma/client";

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
  // newDirectoryName: string;
  // setNewDirectoryName: (value: string) => void;
  setEditable: (
    value: SetStateAction<{ id: string; isEditable: boolean }>
  ) => void;
  handleDirectoryUpdate: (
    event: FocusEvent<HTMLInputElement | Element>,
    directory: Directory,
    parentId: string | null,
    updateInfo: Partial<Directory>
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
  // newDirectoryName,
  // setNewDirectoryName,
  setEditable,
  handleDirectoryUpdate,
  setExpandedDirs,
  handleAddChildDirectory,
  handleDeleteDirectory,
}: IDirectoryItemProps) => {
  const dispatch = useAppDispatch();
  const { directories, parentDirs, rootDirectories, activeDirectoryId } =
    useAppSelector((state) => state.quicklinks);
  const [newDirectoryName, setNewDirectoryName] = useState<string>("");

  let path: string;

  const isDepartment =
    rootSlug ===
    rootDirectories.find((rootDir) => rootDir.id === "DEPARTMENT")?.slug;
  const isCommonResources =
    rootSlug ===
    rootDirectories.find((rootDir) => rootDir.id === "COMMON_RESOURCES")?.slug;

  path = `/quicklinks${rootSlug}/${directory.slug}${
    directory.parentDirId
      ? `-${new Date(directory.timestamp).getTime().toString().slice(-5)}`
      : ""
  }`;
  // const onlyPath = path.split("?")[0];

  const isExpanded = isDirectoryExpanded(directory.id);
  const isCurrentPage = activeDirectoryId === directory.id;

  //console.log("isCurrentPage:", isCurrentPage, pathName, onlyPath);

  return (
    <div key={directory.id}>
      <div className="flex justify-between items-center group gap-4 ml-3">
        <div
          className="flex items-center cursor-pointer gap-1"
          onClick={() => toggleDirectory(directory.id)}
        >
          <div
            onClick={() => {
              // dispatch(setActiveDirectoryId(directory.id));
              if (editable.id !== directory.id)
                setEditable({ id: "", isEditable: false });
            }}
          >
            <Link
              href={path}
              className={`${isCurrentPage ? "font-extrabold" : ""} `}
            >
              {editable.isEditable === true &&
              editable.id === directory.id &&
              directory.slug !== "common-resources" ? (
                <input
                  type="text"
                  value={newDirectoryName}
                  className="focus:outline-none w-24"
                  onChange={(e) => setNewDirectoryName(e.target.value)}
                  onBlur={(e) => {
                    if (!newDirectoryName)
                      return setEditable({ id: "", isEditable: false });
                    handleDirectoryUpdate(e, directory, directory.parentDirId, {
                      title: newDirectoryName,
                      slug: newDirectoryName.toLowerCase().replace(/ /g, "-"),
                    });
                  }}
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
                  {directory.title}
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
                  rootSlug={
                    isCommonResources || isDepartment
                      ? `${rootSlug}/${directory.slug}`
                      : rootSlug
                  }
                  editable={editable}
                  // newDirectoryName={newDirectoryName}
                  // setNewDirectoryName={setNewDirectoryName}
                  setEditable={setEditable}
                  handleDirectoryUpdate={handleDirectoryUpdate}
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
