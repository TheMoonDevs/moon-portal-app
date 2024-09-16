"use client";

import { handleDeleteDirectory } from "@/utils/redux/quicklinks/quicklinks.thunks";
import { setModal } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { DirectoryList } from "@prisma/client";
import { useEffect } from "react";

const DirectoryActionBar = ({
  selectedDir,
  setSelectedDir,
  handleToggleFavorite,
}: {
  selectedDir: DirectoryList | null;
  setSelectedDir: (dir: DirectoryList | null) => void;
  handleToggleFavorite: (directory: DirectoryList) => void;
}) => {
  const dispatch = useAppDispatch();
  if (!selectedDir) return null;
  return (
    <div className="w-full p-2 px-2 rounded-2xl bg-neutral-100 flex gap-6">
      <span
        onClick={() => setSelectedDir(null)}
        className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
      >
        close
      </span>
      <span className=" !text-neutral-500 hover:scale-110 transition-all cursor-pointer">
        {selectedDir?.title}
      </span>
      <div className="flex items-center gap-6">
        <span
          onClick={() =>
            dispatch(
              setModal({
                type: "rename-folder",
                data: { selectedDirectory: selectedDir },
                setSelectedDir: setSelectedDir,
              })
            )
          }
          className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
        >
          edit_square
        </span>

        {(selectedDir as any).isFavorite ? (
          <span
            onClick={() => handleToggleFavorite(selectedDir)}
            className="material-icons !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
          >
            star
          </span>
        ) : (
          <span
            onClick={() => handleToggleFavorite(selectedDir)}
            className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
          >
            star
          </span>
        )}

        <span
          onClick={() =>
            dispatch(
              setModal({
                type: "move-folder",
                data: {
                  selectedDirectory: selectedDir,
                  isParent: selectedDir.parentDirId === null,
                },
              })
            )
          }
          className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer"
        >
          drive_file_move
        </span>
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
          delete
        </span>
        <span className="material-symbols-outlined !text-neutral-500 hover:scale-110 transition-all cursor-pointer">
          link
        </span>
      </div>
    </div>
  );
};

export default DirectoryActionBar;
