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
  const [selectedParentDirectory, setSelectedParentDirectory] =
    useState<ParentDirectory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { parentDirs } = useQuickLinkDirectory();
  const [selectedRootType, setSelectedRootType] = useState<ROOTTYPE>(
    ROOTTYPE.DEPARTMENT
  );

  const dispatch = useAppDispatch();
  const rootTypes = Object.values(ROOTTYPE);

  const filteredDirectories = parentDirs.filter(
    (dir) =>
      dir.type === selectedRootType &&
      dir.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMove = async () => {
    if (selectedParentDirectory) {
      let updatedDirectory = {};
      let apiPath = "/api/quicklinks/directory";
      if (isParent) {
        apiPath = `/api/quicklinks/parent-directory`;
        updatedDirectory = {
          ...currentDirectory,
          type: selectedRootType,
        } as ParentDirectory;
      } else {
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
    }

    onMove();
  };

  return (
    <ReactPortal>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white p-5 rounded-lg w-96 shadow-lg z-50">
        <h2 className="text-xl font-bold mb-2">Move List</h2>
        <p className="mb-4">Move {currentDirectory.title} to:</p>
        <select
          className="w-full p-2 mb-3 bg-gray-700 border-none text-white rounded appearance-none bg-no-repeat bg-right pr-8"
          style={{
            backgroundImage:
              'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
            backgroundSize: ".65em auto",
            backgroundPosition: "right .7em top 50%",
          }}
          value={selectedRootType}
          onChange={(e) => {
            setSelectedRootType(e.target.value as ROOTTYPE);
            setSelectedParentDirectory(null);
          }}
        >
          {rootTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {!isParent && (
          <>
            <input
              className="w-full p-2 mb-3 bg-gray-700 border-none text-white rounded"
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
                    selectedParentDirectory?.id === dir.id ? "bg-gray-600" : ""
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
            className="px-5 py-2 border border-pink-500 text-pink-500 rounded cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 bg-pink-500 text-white rounded cursor-pointer disabled:opacity-50"
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
