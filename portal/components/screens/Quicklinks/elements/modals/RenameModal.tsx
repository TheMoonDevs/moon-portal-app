'use client';

import { Modal, TextField } from '@mui/material';
import { useEffect, useState } from 'react';

import { Spinner } from '@/components/elements/Loaders';
import { handleDirectoryUpdate } from '@/utils/redux/quicklinks/quicklinks.thunks';
import { setModal } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

const RenameModal = () => {
  const dispatch = useAppDispatch();
  const { modal, isLoading } = useAppSelector((state) => state.quicklinksUi);
  const selectedDirectory = modal.data && modal.data.selectedDirectory;
  const name = selectedDirectory && selectedDirectory.title;
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setNewName(name);
  }, [name]);

  if (!(modal.type === 'rename-folder')) return null;
  const handleRename = async () => {
    try {
      dispatch(
        handleDirectoryUpdate({
          directory: selectedDirectory,
          parentId: selectedDirectory.parentDirId,
          updateInfo: {
            title: newName,
            slug: newName.toLowerCase().replace(/ /g, '-'),
          },
        }),
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Modal
      onClose={() => dispatch(setModal({ type: null, data: null }))}
      open={modal.type === 'rename-folder'}
      className="flex items-center justify-center rounded-lg p-5 text-black shadow-lg drop-shadow-sm"
    >
      <div className="w-fit rounded-2xl bg-white p-6 outline-none max-sm:w-[95%]">
        <h1 className="mb-6 text-2xl font-semibold">Rename</h1>
        <TextField
          onChange={(e) => setNewName(e.target.value)}
          className="w-[500px] max-sm:w-full"
          required
          value={newName}
          id="outlined-required"
          autoFocus
        />
        <div className="ml-auto mt-5 flex w-fit gap-2">
          <button
            className="cursor-pointer rounded-xl px-3 py-2 text-gray-800 hover:border hover:border-gray-500"
            onClick={() => dispatch(setModal({ type: null, data: null }))}
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={newName === '' || isLoading}
            className="cursor-pointer rounded-xl bg-gray-900 px-6 text-sm text-white disabled:opacity-50"
          >
            {isLoading ? <Spinner className="size-6 text-neutral-600" /> : 'OK'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RenameModal;
