import { FocusEvent, SetStateAction, useRef, useState } from "react";
import Link from "next/link";
import { Directory } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Popover, Tooltip } from "@mui/material";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useQuickLinkDirectory } from "../../../hooks/useQuickLinkDirectory";
import { useUser } from "@/utils/hooks/useUser";
import {
  addRecentDirectories,
  setPopoverElementWithData,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppSelector, useAppDispatch } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";


interface IDirectoryItemProps {
  directory: Directory;
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
  ) => Promise<void>;
  setExpandedDirs: (value: SetStateAction<string[]>) => void;
  handleAddChildDirectory: (parentId: string) => void;
  handleDeleteDirectory: (
    directory: Directory,
    parentId: string | null,
    rootSlug?: string
  ) => Promise<void>;
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [newDirectoryName, setNewDirectoryName] = useState<string>("");
  const { directories, rootDirectories, activeDirectoryId } =
    useQuickLinkDirectory(true);
  const { user } = useUser();

  let path: string;

  const isDepartment =
    rootSlug ===
    rootDirectories.find((rootDir) => rootDir.id === "DEPARTMENT")?.slug;
  const isCommonResources =
    rootSlug ===
    rootDirectories.find((rootDir) => rootDir.id === "COMMON_RESOURCES")?.slug;

  const dirTimestampString = directory.parentDirId
    ? `-${new Date(directory.timestamp).getTime().toString().slice(-5)}`
    : "";

  path = `/quicklinks${rootSlug}/${directory.slug}${dirTimestampString}`;
  // const onlyPath = path.split("?")[0];

  const isExpanded = isDirectoryExpanded(directory.id);
  const isCurrentPage = activeDirectoryId === directory.id;

  const handleAfterDirNameChanged = async (
    e: FocusEvent<HTMLInputElement> | any
  ) => {
    if (!newDirectoryName) return setEditable({ id: "", isEditable: false });
    const newDirectorySlug = newDirectoryName.toLowerCase().replace(/ /g, "-");
    await handleDirectoryUpdate(e, directory, directory.parentDirId, {
      title: newDirectoryName,
      slug: newDirectorySlug,
    });
    router.replace(
      `/quicklinks${rootSlug}/${newDirectorySlug}${dirTimestampString}`
    );
  };

  const handleFolderIconChange = (event: any) => {
    dispatch(
      setPopoverElementWithData({
        element: event.currentTarget,
        anchorId: "emoji-set",
        data: {
          selectedDirectory: directory,
          parentDirectoryId: directory.parentDirId,
        },
      })
    );
  };

  const userId = useAppSelector((state) => state.auth.user?.id);
  const recentDirs = useAppSelector((state) => state.quicklinks.recentDirectories)
  //console.log("recentDirs:", recentDirs);
  // Add recent directory
  const addRecentDirectory = async (userId: string, directoryId: string) => {
    try {
      const data = {
        userId: userId,
        directoryId: directoryId,
      };
      const response = await QuicklinksSdk.createData(
        `/api/quicklinks/recent-directory`,
        data
      );

      if (response.error) {
        throw new Error(response.error);
      }

      dispatch(addRecentDirectories(directoryId));
    } catch (error: any) {
      console.error("Failed to add recent directory:", error);
    }
  };

  return (
    <div key={directory.id}>
      <div className="flex justify-between items-center group gap-4 ml-3">
        <div className="flex items-center cursor-pointer gap-1">
          <span
            id="emoji-set"
            className="material-symbols-outlined !text-base hover:bg-neutral-200  rounded pb-1"
            onClick={handleFolderIconChange}>
            {!directory.logo
              ? isExpanded
                ? "folder_open"
                : "folder"
              : directory.logo}
          </span>
          <div
            onClick={() => {
              // dispatch(setActiveDirectoryId(directory.id));
              toggleDirectory(directory.id);
              if (editable.id !== directory.id)
                setEditable({ id: "", isEditable: false });
              if (userId) {
                addRecentDirectory(userId, directory.id); // Add recent directory on click
              }
            }}
            className="flex items-center cursor-pointer gap-1">
            <Link
              href={path}
              className={`${isCurrentPage ? "font-extrabold" : ""} `}>
              {editable.isEditable === true &&
              editable.id === directory.id &&
              directory.slug !== "common-resources" ? (
                <input
                  autoFocus
                  type="text"
                  value={newDirectoryName}
                  className="focus:outline-none w-24"
                  onChange={(e) => setNewDirectoryName(e.target.value)}
                  onBlur={handleAfterDirNameChanged}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAfterDirNameChanged(e);
                    }
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
                  }}>
                  {directory.title}
                </h3>
              )}
            </Link>
            <span className="invisible group-hover:visible material-icons-outlined cursor-pointer hover:opacity-50 opacity-20">
              {isExpanded ? `expand_less` : `expand_more`}
            </span>
          </div>
        </div>
        <div className="flex gap-1 items-center cursor-pointer">
          {(directory.parentDirId || user?.isAdmin) && (
            <div className="group">
              <Tooltip title="Folder settings" enterDelay={500}>
                <span
                  id="edit-folder"
                  // onClick={handleElementHasPopoverClicked}
                  onClick={(e) => {
                    dispatch(
                      setPopoverElementWithData({
                        element: e.currentTarget,
                        anchorId: "edit-folder",
                        data: {
                          selectedDirectory: directory,
                          parentDirectoryId: directory.parentDirId,
                          rootSlug: rootSlug,
                        },
                      })
                    );
                  }}
                  className="material-icons-outlined !text-base opacity-0 group-hover:opacity-50 peer-hover:opacity-50 hover:scale-110 transition-all">
                  more_vert
                </span>
              </Tooltip>
              <Tooltip title="Create Folder" enterDelay={500}>
                <span
                  className="material-icons-outlined !text-base opacity-0 group-hover:opacity-50 hover:scale-110 transition-all"
                  onClick={() => {
                    setExpandedDirs((prev) => [...prev, directory.id]);
                    handleAddChildDirectory(directory.id);
                  }}>
                  add
                </span>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      <ul
        className={`ml-4 mt-2 transition-all duration-300 overflow-hidden border-l-2  ${
          isExpanded
            ? "max-h-[1000px]  border-gray-200"
            : "max-h-0 overflow-hidden  border-neutral-100"
        }`}>
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
