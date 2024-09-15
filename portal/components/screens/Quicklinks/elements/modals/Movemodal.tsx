import React, { useState } from "react";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import {
  Directory,
  DirectoryList,
  ParentDirectory,
  ROOTTYPE,
} from "@prisma/client";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";

import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { ToastSeverity } from "@/components/elements/Toast";
import { Modal, Popover, Tooltip } from "@mui/material";
import { toast } from "sonner";
import { updateDirectory } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import {
  setModal,
  setToast,
} from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";

export const MoveModal = () => {
  const { modal } = useAppSelector((state) => state.quicklinksUi);
  const isParent = modal.data && modal.data.isParent;
  const currentDirectory = modal.data && modal.data.selectedDirectory;
  const { parentDirs } = useQuickLinkDirectory();
  const dispatch = useAppDispatch();
  const rootTypes = Object.values(ROOTTYPE);
  const [selectedParentDirectory, setSelectedParentDirectory] =
    useState<DirectoryList | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRootType, setSelectedRootType] = useState<ROOTTYPE>(
    ROOTTYPE.DEPARTMENT
  );
  const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null);
  const open = Boolean(anchorEl);
  const filteredDirectories = parentDirs.filter(
    (dir) =>
      dir.tabType === selectedRootType &&
      !dir.isArchive &&
      dir.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRootTypeSelection = (type: ROOTTYPE) => {
    setSelectedRootType(type);
    setAnchorEl(null);
  };

  const handleMove = async () => {
    let updatedDirectory = {};
    let apiPath = "/api/quicklinks/directory";
    if (isParent) {
      apiPath = `/api/quicklinks/parent-directory`;
      updatedDirectory = {
        ...currentDirectory,
        type: selectedRootType,
      } as DirectoryList;
    } else {
      if (!selectedParentDirectory) {
        toast.error("Please Select a ParentDirectory");
        return;
      }
      updatedDirectory = {
        ...currentDirectory,
        parentDirId: selectedParentDirectory.id,
      } as DirectoryList;
    }

    try {
      dispatch(updateDirectory(updatedDirectory));
      const res = await QuicklinksSdk.updateData(apiPath, updatedDirectory);
      dispatch(
        setToast({ toastMsg: "Done!", toastSev: ToastSeverity.success })
      );
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );
      dispatch(updateDirectory(currentDirectory));
      console.log(error);
    }

    dispatch(setModal({ type: null, data: null }));
  };

  if (!(modal.type === "move-folder")) return null;

  return (
    <Modal
      onClose={() => dispatch(setModal({ type: null, data: null }))}
      open={modal.type === "move-folder"}
      className=" text-black p-5 rounded-lg shadow-lg drop-shadow-sm flex items-center justify-center"
    >
      <div className="bg-white w-2/5 p-6 rounded-2xl outline-none">
        <h2 className="text-xl font-bold mb-2">Move Folder</h2>
        <p className="mb-4">
          Move{" "}
          <span className="font-bold text-blue-500 underline">
            {currentDirectory.title}
          </span>{" "}
          to:
        </p>
        <div className="relative flex items-center bg-neutral-100 rounded-md px-2 w-full">
          <Tooltip title="Select Root Type">
            <div
              className="flex items-center w-full cursor-pointer justify-between"
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-gray-500 p-2">
                  groups
                </span>
                <span>{selectedRootType}</span>
              </div>
              <span className="material-icons-outlined text-gray-500 p-2">
                {open ? "arrow_drop_up" : "arrow_drop_down"}
              </span>
            </div>
          </Tooltip>
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            closeAfterTransition
            classes={{
              paper: "bg-white mb-4 py-2 rounded-md !shadow-md", // Adjust the width here
            }}
            style={{ width: anchorEl?.clientWidth }} // Ensures the Popover takes the full width of the select
          >
            <ul className="flex flex-col gap-2 mb-2">
              {rootTypes.map((type) => (
                <div
                  onClick={(e) => handleRootTypeSelection(type)}
                  key={type}
                  className="flex items-center justify-between hover:bg-neutral-200 p-2 cursor-pointer"
                >
                  <li className="text-gray-500 text-sm">{type}</li>
                </div>
              ))}
            </ul>
          </Popover>
        </div>

        {!isParent && (
          <>
            <div className="relative w-full mb-3 mt-4">
              <input
                className="w-full p-2 outline-none border-b-2 border-neutral-300 pr-10" // Added padding-right to make space for the icon
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="material-icons-outlined absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                search
              </span>
            </div>

            <ul className="list-none p-0 h-60 overflow-y-auto">
              {filteredDirectories.map((dir) => (
                <li
                  key={dir.id}
                  onClick={() => setSelectedParentDirectory(dir)}
                  className={`p-2 mr-2 cursor-pointer rounded hover:bg-neutral-100 ${
                    selectedParentDirectory?.id === dir.id
                      ? "bg-neutral-200"
                      : ""
                  }`}
                >
                  {dir.logo} {dir.title}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex mt-5 gap-10">
          <button
            className="w-full px-5 py-3 border border-gray-500 text-gray-800 rounded-xl cursor-pointer"
            onClick={() => dispatch(setModal({ type: null, data: null }))}
          >
            Cancel
          </button>
          <button
            className="w-full px-5 py-3 bg-gray-900 text-white rounded-xl cursor-pointer disabled:opacity-50"
            onClick={handleMove}
            disabled={isParent ? !selectedRootType : !selectedParentDirectory}
          >
            Move
          </button>
        </div>
      </div>
    </Modal>
  );
};
