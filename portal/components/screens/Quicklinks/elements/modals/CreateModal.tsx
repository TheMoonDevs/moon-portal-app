"use client";

import { Spinner } from "@/components/elements/Loaders";
import { handleAddChildDirectory } from "@/utils/redux/quicklinks/quicklinks.thunks";
import { setModal } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Modal, TextField } from "@mui/material";
import { useState } from "react";

const CreateDirectoryModal = () => {
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const { modal } = useAppSelector((state) => state.quicklinksUi);
  const selectedDirectory = modal.data && modal.data.selectedDirectory;
  const [isLoading, setIsLoading] = useState(false);

  if (!(modal.type === "create-folder")) return null;

  const handleNameChange = async () => {
    setIsLoading(true); //  needs re-test
    try {
      if (selectedDirectory.root) {
        dispatch(
          handleAddChildDirectory({
            parentDirId: null,
            title: name,
            rootType: selectedDirectory.root,
          })
        );
      } else {
        dispatch(
          handleAddChildDirectory({
            parentDirId: selectedDirectory.id,
            title: name,
            rootType: selectedDirectory.tabType || selectedDirectory.root,
          })
        );
      }
    } catch (error) {
      console.log(error);
    } finally{
      setIsLoading(false)
    }
  };
  return (
    <Modal
      onClose={() => {
        dispatch(setModal({ type: null, data: null }));
        setName("");
      }}
      open={modal.type === "create-folder"}
      className=" text-black p-5 rounded-lg shadow-lg drop-shadow-sm flex items-center justify-center"
    >
      <div className="bg-white w-fit p-6 rounded-2xl outline-none">
        <h1 className="mb-6 font-semibold text-2xl">
          {selectedDirectory.root === "DEPARTMENT"
            ? "Add New Department"
            : selectedDirectory.root === "COMMON_RESOURCES" &&
              "Add New Team Folder"}
          {selectedDirectory.tabType !== null && "New Folder"}
        </h1>
        <TextField
          onChange={(e) => setName(e.target.value)}
          className="w-[500px]"
          required
          value={name}
          id="outlined-required"
          autoFocus
        />
        <div className="flex mt-5 gap-2 ml-auto w-fit">
          <button
            className="px-3 py-2 hover:border hover:border-gray-500 text-gray-800 rounded-xl cursor-pointer"
            onClick={() => {
              dispatch(setModal({ type: null, data: null }));
              setName("");
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleNameChange}
            disabled={name === "" || isLoading}
            className="px-6 text-sm  bg-gray-900 text-white rounded-xl cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Spinner className="w-6 h-6 text-neutral-600" /> : 'OK'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateDirectoryModal;
