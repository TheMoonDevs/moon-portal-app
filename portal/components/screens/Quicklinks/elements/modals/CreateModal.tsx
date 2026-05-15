'use client';

import { Modal, TextField } from '@mui/material';
import { useState } from 'react';

import { Spinner } from '@/components/elements/Loaders';
import { handleAddChildDirectory } from '@/utils/redux/quicklinks/quicklinks.thunks';
import { setModal } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

const CreateDirectoryModal = () => {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const { modal, isLoading } = useAppSelector((state) => state.quicklinksUi);
  const selectedDirectory = modal.data && modal.data.selectedDirectory;

  if (!(modal.type === 'create-folder')) return null;

  const handleNameChange = async () => {
    try {
      if (selectedDirectory.root) {
        dispatch(
          handleAddChildDirectory({
            parentDirId: null,
            title: name,
            rootType: selectedDirectory.root,
          }),
        );
      } else {
        dispatch(
          handleAddChildDirectory({
            parentDirId: selectedDirectory.id,
            title: name,
            rootType: selectedDirectory.tabType || selectedDirectory.root,
          }),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <Modal
      onClose={() => {
        dispatch(setModal({ type: null, data: null }));
        setName('');
      }}
      open={modal.type === 'create-folder'}
      className="flex items-center justify-center rounded-lg p-5 text-black shadow-lg drop-shadow-sm"
    >
      <div className="w-fit rounded-2xl bg-white p-6 outline-none max-sm:w-full">
        <h1 className="mb-6 text-2xl font-semibold">
          {selectedDirectory.root === 'DEPARTMENT'
            ? 'Add New Department'
            : selectedDirectory.root === 'COMMON_RESOURCES' &&
              'Add New Team Folder'}
          {selectedDirectory.tabType !== null && 'New Folder'}
        </h1>
        <TextField
          onChange={(e) => setName(e.target.value)}
          className="w-[500px] max-sm:w-full"
          required
          value={name}
          id="outlined-required"
          autoFocus
        />
        <div className="ml-auto mt-5 flex w-fit gap-2">
          <button
            className="cursor-pointer rounded-xl px-3 py-2 text-gray-800 hover:border hover:border-gray-500"
            onClick={() => {
              dispatch(setModal({ type: null, data: null }));
              setName('');
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleNameChange}
            disabled={name === '' || isLoading}
            className="cursor-pointer rounded-xl bg-gray-900 px-6 text-sm text-white disabled:opacity-50"
          >
            {isLoading ? <Spinner className="size-6 text-neutral-600" /> : 'OK'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateDirectoryModal;
