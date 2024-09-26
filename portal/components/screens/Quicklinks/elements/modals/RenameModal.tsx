"use client";

import { handleDirectoryUpdate } from "@/utils/redux/quicklinks/quicklinks.thunks";
import { setModal } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Modal, TextField } from "@mui/material";
import { useEffect, useState } from "react";

const RenameModal = () => {
  const dispatch = useAppDispatch();
  const { modal } = useAppSelector((state) => state.quicklinksUi);
  const selectedDirectory = modal.data && modal.data.selectedDirectory;
  const name = selectedDirectory && selectedDirectory.title;
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setNewName(name);
  }, [name]);

  if (!(modal.type === "rename-folder")) return null;
  const handleRename = async () => {
    try {
      dispatch(
        handleDirectoryUpdate({
          directory: selectedDirectory,
          parentId: selectedDirectory.parentDirId,
          updateInfo: {
            title: newName,
            slug: newName.toLowerCase().replace(/ /g, "-"),
          },
        })
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Modal
      onClose={() => dispatch(setModal({ type: null, data: null }))}
      open={modal.type === "rename-folder"}
      className=" text-black p-5 rounded-lg shadow-lg drop-shadow-sm flex items-center justify-center"
    >
      <div className="bg-white w-fit p-6 rounded-2xl outline-none">
        <h1 className="mb-6 font-semibold text-2xl">Rename</h1>
        <TextField
          onChange={(e) => setNewName(e.target.value)}
          className="w-[500px]"
          required
          value={newName}
          id="outlined-required"
          autoFocus
        />
        <div className="flex mt-5 gap-2 ml-auto w-fit">
          <button
            className="px-3 py-2 hover:border hover:border-gray-500 text-gray-800 rounded-xl cursor-pointer"
            onClick={() => dispatch(setModal({ type: null, data: null }))}
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={newName === ""}
            className="px-6 text-sm  bg-gray-900 text-white rounded-xl cursor-pointer disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RenameModal;
