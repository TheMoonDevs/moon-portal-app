import React, { useState } from "react";
import { useQuickLinkDirectory } from "../hooks/useQuickLinkDirectory";
import { Directory, ParentDirectory, ROOTTYPE } from "@prisma/client";
import ReactPortal from "@/components/global/ReactPortal";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import {
  setToast,
  updateDirectory,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { ToastSeverity } from "@/components/elements/Toast";
import { revalidateRoot } from "@/utils/actions";
import { Popover, Tooltip } from "@mui/material";
import { toast } from "sonner";

interface MoveToModalProps {
  currentDirectory: Directory | ParentDirectory;
  isParent: boolean;
  onCancel: () => void;
  onMove: () => void;
}

export const MoveModal: React.FC<MoveToModalProps> = ({
  onMove,
  isParent,
  onCancel,
  currentDirectory,
}) => {
  const { parentDirs } = useQuickLinkDirectory();
  const dispatch = useAppDispatch();
  const rootTypes = Object.values(ROOTTYPE);
  const [selectedParentDirectory, setSelectedParentDirectory] =
    useState<ParentDirectory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRootType, setSelectedRootType] = useState<ROOTTYPE>(
    ROOTTYPE.DEPARTMENT
  );
  const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null);
  const open = Boolean(anchorEl);
  const filteredDirectories = parentDirs.filter(
    (dir) =>
      dir.type === selectedRootType &&
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
      } as ParentDirectory;
    } else {
      if (!selectedParentDirectory) {
        toast.error("Please Select a ParentDirectory");
        return;
      }
      updatedDirectory = {
        ...currentDirectory,
        parentDirId: selectedParentDirectory.id,
      } as Directory;
    }

    try {
      dispatch(updateDirectory(updatedDirectory));
      const res = await QuicklinksSdk.updateData(apiPath, updatedDirectory);
      dispatch(
        setToast({ toastMsg: "Done!", toastSev: ToastSeverity.success })
      );
      revalidateRoot();
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

    onMove();
  };

  return (
    <ReactPortal>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-black border-[1px] text-black p-5 rounded-lg w-96 shadow-lg drop-shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-2">Move Directory</h2>
        <p className="mb-4">Move {currentDirectory.title} to:</p>
        <div className="relative flex items-center bg-neutral-100 rounded-md">
          <Tooltip title="Select Root Type">
            <div
              className="flex items-center w-full cursor-pointer"
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <span className="material-icons-outlined text-gray-500 p-2">
                groups
              </span>
              {selectedRootType}
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
              paper: "bg-white mb-4 py-2 rounded-md !shadow-md",
            }}
          >
            <ul className=" flex flex-col gap-2  mb-2">
              {rootTypes.map((type) => (
                <div
                  onClick={(e) => handleRootTypeSelection(type)}
                  key={type}
                  className="flex items-center justify-between hover:bg-neutral-100 p-2 cursor-pointer"
                >
                  <li className=" text-gray-500 text-sm">{type}</li>
                </div>
              ))}
            </ul>
          </Popover>
        </div>
        {!isParent && (
          <>
            <input
              className="w-full p-2 mb-3 outline-none border-b-2 border-gray-600 "
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul className="list-none p-0 h-60 overflow-y-auto">
              {filteredDirectories.map((dir) => (
                <li
                  key={dir.id}
                  onClick={() => setSelectedParentDirectory(dir)}
                  className={`p-2 cursor-pointer rounded ${
                    selectedParentDirectory?.id === dir.id ? "bg-[#ececec]" : ""
                  }`}
                >
                  {dir.logo} {dir.title}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex justify-between mt-5">
          <button
            className="px-5 py-2 border border-gray-500 text-gray-800 rounded cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 bg-gray-700 text-white rounded cursor-pointer disabled:opacity-50"
            onClick={handleMove}
            disabled={isParent ? !selectedRootType : !selectedParentDirectory}
          >
            Move
          </button>
        </div>
      </div>
    </ReactPortal>
  );
};
