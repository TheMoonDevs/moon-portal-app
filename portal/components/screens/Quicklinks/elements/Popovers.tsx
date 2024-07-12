import { useQuicklinksPopover } from "@/utils/hooks/useQuicklinksPopover";
import { Popover } from "@mui/material";
import { Directory } from "@prisma/client";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { FocusEvent } from "react";

export const PopoverEmojis = ({
  handleDirectoryUpdate,
}: {
  handleDirectoryUpdate: (
    event: FocusEvent<HTMLInputElement | Element> | MouseEvent,
    directory: Directory,
    parentId: string | null,
    updateInfo: Partial<Directory>
  ) => Promise<void>;
}) => {
  const { handleClose, anchorElement, data, openEmojiSet } =
    useQuicklinksPopover();

  return (
    <Popover
      open={openEmojiSet}
      anchorEl={anchorElement}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
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
            }
          );
          handleClose();
        }}
      />
    </Popover>
  );
};

export const PopoverFolderEdit = ({
  handleDeleteDirectory,
  handleMoveDirectory,
}: {
  handleDeleteDirectory: (
    directory: Directory,
    parentId: string | null,
    rootSlug?: string
  ) => Promise<void>;
  handleMoveDirectory: (
    directory: Directory,
    direction: "UP" | "DOWN"
  ) => Promise<void>;
}) => {
  const { handleClose, anchorElement, data, openFolderEditor } =
    useQuicklinksPopover();
  return (
    <Popover
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      open={openFolderEditor}
      onClose={handleClose}
      anchorEl={anchorElement}
      transformOrigin={{
        vertical: "center",
        horizontal: "left",
      }}
      className="!rounded-md"
    >
      <ul className=" flex flex-col gap-2 peer w-[200px] p-2 rounded-md">
        {/* <li
                    className="flex items-center gap-2 group hover:bg-neutral-200 rounded-md p-1 px-3 cursor-pointer"
                    onClick={(e) => {
                      // handlePopoverClose();
                      setEditable((prev) => {
                        return { id: directory.id, isEditable: true };
                      });
                      inputRef.current?.focus();
                    }}
                  >
                    <span className="material-icons-outlined !text-neutral-500 !text-base group-hover:scale-110 transition-all">
                      edit
                    </span>
                    <span className="text-sm">Rename</span>
                  </li>
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

        {data && !data.isFirst && (
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
          className="flex items-center gap-2 group hover:bg-neutral-200 text-red-600 rounded-md p-1 px-3 cursor-pointer"
          onClick={() => {
            handleDeleteDirectory(
              data.selectedDirectory,
              data.parentDirectoryId,
              data.rootSlug
            );
            handleClose();
          }}
        >
          <span className="material-icons-outlined  !text-red-500 !text-base   group-hover:scale-110 transition-all">
            delete
          </span>
          <span className="text-sm">Delete</span>
        </li>
      </ul>
    </Popover>
  );
};
