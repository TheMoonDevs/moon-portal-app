"use client";

import ToolTip from "@/components/elements/ToolTip";
import { handleDeleteDirectory } from "@/utils/redux/quicklinks/quicklinks.thunks";
import { setIsFolderSectionOpen, setModal } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { DirectoryList } from "@prisma/client";

const DirectoryActionBar = ({
  selectedDir,
  setSelectedDir,
  handleToggleFavorite,
  handleShareLink,
}: {
  selectedDir: DirectoryList | null;
  setSelectedDir: (dir: DirectoryList | null) => void;
  handleToggleFavorite: (directory: DirectoryList) => void;
  handleShareLink: (directory: DirectoryList) => void;
}) => {
  const dispatch = useAppDispatch();
  if (!selectedDir) return null;

  return (
    <div className="w-full p-2 px-2 rounded-2xl bg-neutral-100 flex gap-6 max-sm:flex-col max-sm:h-full">
    <div className="flex items-center gap-2">
        <span
          onClick={() => setSelectedDir(null)}
          className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
        >
          close
        </span>
        <span className=" !text-neutral-500 hover:scale-110 transition-all cursor-pointer md:hidden ">
          {selectedDir?.title}
        </span>
      </div>
      <span className=" !text-neutral-500 hover:scale-110 transition-all cursor-pointer max-sm:hidden">
        {selectedDir?.title}
      </span>
      <div className="flex items-center gap-6">
        <ToolTip title="Rename">
          <span
            onClick={() => { 
              dispatch(
                setModal({
                  type: "rename-folder",
                  data: { selectedDirectory: selectedDir },
                })
              );
              dispatch(
                setIsFolderSectionOpen(false)
              );
            }
            }
            className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
          >
            edit_square
          </span>
        </ToolTip>

        {(selectedDir as any).isFavorite ? (
          <ToolTip title="Remove Favourite">
            <span
              onClick={() => handleToggleFavorite(selectedDir)}
              className="material-icons !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
            >
              star
            </span>
          </ToolTip>
        ) : (
          <ToolTip title="Mark as Favourite">
            <span
              onClick={() => handleToggleFavorite(selectedDir)}
              className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
            >
              star
            </span>
          </ToolTip>
        )}
        <ToolTip title="Move to">
          <span
            onClick={() => {
              dispatch(
                setModal({
                  type: "move-folder",
                  data: {
                    selectedDirectory: selectedDir,
                    isParent: selectedDir.parentDirId === null,
                  },
                })
              );
              dispatch(
                setIsFolderSectionOpen(false)
              );
            }}
            className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
          >
            drive_file_move
          </span>
        </ToolTip>
        <ToolTip title="Archive">
          <span
            onClick={() => {
              dispatch(
                handleDeleteDirectory({
                  directory: selectedDir,
                  parentId: selectedDir.parentDirId,
                })
              );
            }}
            className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
          >
            archive
          </span>
        </ToolTip>
        <ToolTip title="Link">
          <span
            onClick={() => handleShareLink(selectedDir)}
            className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
          >
            link
          </span>
        </ToolTip>
      </div>
    </div>
  );
};

export default DirectoryActionBar;
