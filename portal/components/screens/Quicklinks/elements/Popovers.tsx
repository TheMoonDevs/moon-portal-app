import type { DirectoryList } from '@db/client';
import { Popover } from '@mui/material';
import type { EmojiClickData } from 'emoji-picker-react';
import EmojiPicker from 'emoji-picker-react';
import type { FocusEvent } from 'react';

import { useQuicklinksPopover } from '@/utils/hooks/useQuicklinksPopover';
import { handleDeleteDirectory } from '@/utils/redux/quicklinks/quicklinks.thunks';
import { setModal } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch } from '@/utils/redux/store';

export const PopoverEmojis = ({
  handleDirectoryUpdate,
}: {
  handleDirectoryUpdate: (
    event: FocusEvent<HTMLInputElement | Element> | MouseEvent,
    directory: DirectoryList,
    parentId: string | null,
    updateInfo: Partial<DirectoryList>,
  ) => Promise<void>;
}) => {
  const { handleClose, anchorElement, data, openEmojiSet } =
    useQuicklinksPopover();

  return (
    <Popover
      open={openEmojiSet}
      anchorEl={anchorElement}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <EmojiPicker
        open={openEmojiSet}
        autoFocusSearch
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
        height={300}
        onEmojiClick={(emojiData: EmojiClickData, event: MouseEvent) => {
          handleDirectoryUpdate(
            event,
            data.selectedDirectory,
            data.parentDirectoryId,
            {
              logo: emojiData.emoji,
            },
          );
          handleClose();
        }}
      />
    </Popover>
  );
};

export const PopoverFolderEdit = () => {
  const { handleClose, anchorElement, data, openFolderEditor } =
    useQuicklinksPopover();
  const dispatch = useAppDispatch();
  console.log(data);
  return (
    <Popover
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      open={openFolderEditor}
      onClose={handleClose}
      anchorEl={anchorElement}
      className="!rounded-md"
    >
      <ul className="peer flex w-[200px] flex-col gap-2 rounded-md p-2">
        <li
          className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 hover:bg-neutral-200"
          onClick={() => {
            dispatch(
              setModal({
                type: 'create-folder',
                data: {
                  selectedDirectory: { ...data.selectedDirectory, root: null },
                },
              }),
            );
            handleClose();
          }}
        >
          <span className="material-icons-outlined !text-base !text-neutral-500 transition-all group-hover:scale-110">
            add
          </span>
          <span className="text-sm">Add folder</span>
        </li>
        <li
          className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 hover:bg-neutral-200"
          onClick={(e) => {
            dispatch(
              setModal({
                type: 'rename-folder',
                data: { selectedDirectory: data.selectedDirectory },
              }),
            );
            handleClose();
          }}
        >
          <span className="material-icons-outlined !text-base !text-neutral-500 transition-all group-hover:scale-110">
            edit
          </span>
          <span className="text-sm">Rename</span>
        </li>
        <li
          className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 hover:bg-neutral-200"
          onClick={() => {
            dispatch(
              setModal({
                type: 'move-folder',
                data: {
                  selectedDirectory: data.selectedDirectory,
                  isParent: data.selectedDirectory.parentDirId === null,
                },
              }),
            );
            handleClose();
          }}
        >
          <span className="material-icons-outlined !text-base !text-neutral-500 transition-all group-hover:scale-110">
            drive_file_move
          </span>
          <span className="text-sm">Move To</span>
        </li>
        <li
          className="group flex cursor-pointer items-center gap-2 rounded-md p-1 px-3 text-red-600 hover:bg-neutral-200"
          onClick={() => {
            dispatch(
              handleDeleteDirectory({
                directory: data.selectedDirectory,
                parentId: data.selectedDirectory.parentDirId,
              }),
            );
            handleClose();
          }}
        >
          <span className="material-icons-outlined !text-base !text-red-500 transition-all group-hover:scale-110">
            delete
          </span>
          <span className="text-sm">Delete</span>
        </li>
        {/* 
                  <li className="flex items-center gap-2 group hover:bg-neutral-200 rounded-md p-1 px-3 cursor-pointer">
                    <span className="material-icons-outlined !text-neutral-500 !text-base group-hover:scale-110 transition-all">
                      move_up
                    </span>
                    <span className="text-sm">Move up</span>
                  </li>
                  <li className="flex items-center gap-2 group hover:bg-neutral-200 rounded-md p-1 px-3 cursor-pointer">
                    <span className="material-icons-outlined !text-neutral-500 !text-base group-hover:scale-110 transition-all">
                      move_down
                    </span>
                    <span className="text-sm">Move down</span>
                  </li>
                  <li className="flex items-center gap-2 group hover:bg-neutral-200 rounded-md p-1 px-3 cursor-pointer">
                    <span className="material-icons-outlined !text-neutral-500 !text-base group-hover:scale-110 transition-all">
                      drive_file_move
                    </span>
                    <span className="text-sm">Move To</span>
                  </li> */}
        {/* {data && !data.isFirst && (
          <li
            className="flex items-center gap-2 group hover:bg-neutral-200 rounded-md p-1 px-3 cursor-pointer"
            onClick={() => {
              handleMoveDirectory(data.selectedDirectory, "UP");
              handleClose();
            }}
          >
            <span className="material-icons-outlined !text-neutral-500 !text-base group-hover:scale-110 transition-all">
              move_up
            </span>
            <span className="text-sm">Move up</span>
          </li>
        )}
        {data && !data.isLast && (
          <li
            className="flex items-center gap-2 group hover:bg-neutral-200 rounded-md p-1 px-3 cursor-pointer"
            onClick={() => {
              handleMoveDirectory(data.selectedDirectory, "DOWN");
              handleClose();
            }}
          >
            <span className="material-icons-outlined !text-neutral-500 !text-base group-hover:scale-110 transition-all">
              move_down
            </span>
            <span className="text-sm">Move down</span>
          </li>
        )}
        <li
          className="flex items-center gap-2 group hover:bg-neutral-200 rounded-md p-1 px-3 cursor-pointer"
          onClick={() => {
            handleMoveToDirectory(
              data.selectedDirectory,
              data.parentDirectoryId
            );
            handleClose();
          }}
        >
          <span className="material-icons-outlined !text-neutral-500 !text-base group-hover:scale-110 transition-all">
            drive_file_move
          </span>
          <span className="text-sm">Move To</span>
        </li>
        <li
          className="flex items-center gap-2 group hover:bg-neutral-200 text-red-600 rounded-md p-1 px-3 cursor-pointer"
          onClick={() => {
            handleDeleteDirectory(
              data.selectedDirectory,
              data.parentDirectoryId
            );
            handleClose();
          }}
        >
          <span className="material-icons-outlined  !text-red-500 !text-base   group-hover:scale-110 transition-all">
            delete
          </span>
          <span className="text-sm">Delete</span>
        </li> */}
      </ul>
    </Popover>
  );
};
