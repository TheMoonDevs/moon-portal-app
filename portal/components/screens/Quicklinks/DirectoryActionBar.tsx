'use client';

import type { DirectoryList } from '@db/client';

import ToolTip from '@/components/elements/ToolTip';
import { handleDeleteDirectory } from '@/utils/redux/quicklinks/quicklinks.thunks';
import {
  setIsFolderSectionOpen,
  setModal,
} from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch } from '@/utils/redux/store';

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
    <div className="flex w-full gap-6 rounded-2xl bg-neutral-100 p-2 max-sm:h-full max-sm:flex-col">
      <div className="flex items-center gap-2">
        <span
          onClick={() => setSelectedDir(null)}
          className="material-symbols-outlined cursor-pointer !text-neutral-500 transition-all hover:scale-110"
        >
          close
        </span>
        <span className="cursor-pointer !text-neutral-500 transition-all hover:scale-110 md:hidden">
          {selectedDir?.title}
        </span>
      </div>
      <span className="cursor-pointer !text-neutral-500 transition-all hover:scale-110 max-sm:hidden">
        {selectedDir?.title}
      </span>
      <div className="flex items-center gap-6">
        <ToolTip title="Rename">
          <span
            onClick={() => {
              dispatch(
                setModal({
                  type: 'rename-folder',
                  data: { selectedDirectory: selectedDir },
                }),
              );
              dispatch(setIsFolderSectionOpen(false));
            }}
            className="material-symbols-outlined cursor-pointer !text-neutral-500 transition-all hover:scale-110"
          >
            edit_square
          </span>
        </ToolTip>

        {(selectedDir as any).isFavorite ? (
          <ToolTip title="Remove Favourite">
            <span
              onClick={() => handleToggleFavorite(selectedDir)}
              className="material-icons cursor-pointer !text-neutral-500 transition-all hover:scale-110"
            >
              star
            </span>
          </ToolTip>
        ) : (
          <ToolTip title="Mark as Favourite">
            <span
              onClick={() => handleToggleFavorite(selectedDir)}
              className="material-symbols-outlined cursor-pointer !text-neutral-500 transition-all hover:scale-110"
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
                  type: 'move-folder',
                  data: {
                    selectedDirectory: selectedDir,
                    isParent: selectedDir.parentDirId === null,
                  },
                }),
              );
              dispatch(setIsFolderSectionOpen(false));
            }}
            className="material-symbols-outlined cursor-pointer !text-neutral-500 transition-all hover:scale-110"
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
                }),
              );
            }}
            className="material-symbols-outlined cursor-pointer !text-neutral-500 transition-all hover:scale-110"
          >
            archive
          </span>
        </ToolTip>
        <ToolTip title="Link">
          <span
            onClick={() => handleShareLink(selectedDir)}
            className="material-symbols-outlined cursor-pointer !text-neutral-500 transition-all hover:scale-110"
          >
            link
          </span>
        </ToolTip>
      </div>
    </div>
  );
};

export default DirectoryActionBar;
