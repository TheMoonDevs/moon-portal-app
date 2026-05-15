import type { DirectoryList } from '@db/client';
import { ROOTTYPE } from '@db/client';
import { Modal, Popover, Tooltip } from '@mui/material';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Spinner } from '@/components/elements/Loaders';
import { ToastSeverity } from '@/components/elements/Toast';
import { updateDirectory } from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import {
  setModal,
  setToast,
} from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

import { useQuickLinkDirectory } from '../../hooks/useQuickLinkDirectory';

export const MoveModal = () => {
  const { modal } = useAppSelector((state) => state.quicklinksUi);
  const isParent = modal.data && modal.data.isParent;
  const currentDirectory = modal.data && modal.data.selectedDirectory;
  const { parentDirs } = useQuickLinkDirectory();
  const dispatch = useAppDispatch();
  const rootTypes = Object.values(ROOTTYPE);
  const [selectedParentDirectory, setSelectedParentDirectory] =
    useState<DirectoryList | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRootType, setSelectedRootType] = useState<ROOTTYPE>(
    ROOTTYPE.DEPARTMENT,
  );
  const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const open = Boolean(anchorEl);
  const filteredDirectories = parentDirs.filter(
    (dir) =>
      dir.tabType === selectedRootType &&
      !dir.isArchive &&
      dir.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleRootTypeSelection = (type: ROOTTYPE) => {
    setSelectedRootType(type);
    setAnchorEl(null);
  };

  const handleMove = async () => {
    setIsMoving(true);
    let updatedDirectory = {};
    let apiPath = '/api/quicklinks/directory';
    if (isParent) {
      apiPath = `/api/quicklinks/parent-directory`;
      updatedDirectory = {
        ...currentDirectory,
        type: selectedRootType,
      } as DirectoryList;
    } else {
      if (!selectedParentDirectory) {
        toast.error('Please Select a ParentDirectory');
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
        setToast({ toastMsg: 'Done!', toastSev: ToastSeverity.success }),
      );
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: 'Something went wrong. Please try again.',
          toastSev: ToastSeverity.error,
        }),
      );
      dispatch(updateDirectory(currentDirectory));
      console.log(error);
    } finally {
      setIsMoving(false);
    }

    dispatch(setModal({ type: null, data: null }));
  };

  if (!(modal.type === 'move-folder')) return null;

  return (
    <Modal
      onClose={() => dispatch(setModal({ type: null, data: null }))}
      open={modal.type === 'move-folder'}
      className="flex items-center justify-center rounded-lg p-5 text-black shadow-lg drop-shadow-sm"
    >
      <div className="w-2/5 rounded-2xl bg-white p-6 outline-none max-sm:w-[95%]">
        <h2 className="mb-2 text-xl font-bold">Move Folder</h2>
        <p className="mb-4">
          Move{' '}
          <span className="font-bold text-blue-500 underline">
            {currentDirectory.title}
          </span>{' '}
          to:
        </p>
        <div className="relative flex w-full items-center rounded-md bg-neutral-100 px-2">
          <Tooltip title="Select Root Type">
            <div
              className="flex w-full cursor-pointer items-center justify-between"
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined p-2 text-gray-500">
                  groups
                </span>
                <span>{selectedRootType}</span>
              </div>
              <span className="material-icons-outlined p-2 text-gray-500">
                {open ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
            </div>
          </Tooltip>
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            closeAfterTransition
            classes={{
              paper: 'bg-white mb-4 py-2 rounded-md !shadow-md', // Adjust the width here
            }}
            style={{ width: anchorEl?.clientWidth }} // Ensures the Popover takes the full width of the select
          >
            <ul className="mb-2 flex flex-col gap-2">
              {rootTypes.map((type) => (
                <div
                  onClick={(e) => handleRootTypeSelection(type)}
                  key={type}
                  className="flex cursor-pointer items-center justify-between p-2 hover:bg-neutral-200"
                >
                  <li className="text-sm text-gray-500">{type}</li>
                </div>
              ))}
            </ul>
          </Popover>
        </div>

        {!isParent && (
          <>
            <div className="relative mb-3 mt-4 w-full">
              <input
                className="w-full border-b-2 border-neutral-300 p-2 pr-10 outline-none" // Added padding-right to make space for the icon
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="material-icons-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
            </div>

            <ul className="h-60 list-none overflow-y-auto p-0">
              {filteredDirectories.map((dir) => (
                <li
                  key={dir.id}
                  onClick={() => setSelectedParentDirectory(dir)}
                  className={`mr-2 cursor-pointer rounded p-2 hover:bg-neutral-100 ${
                    selectedParentDirectory?.id === dir.id
                      ? 'bg-neutral-200'
                      : ''
                  }`}
                >
                  {dir.logo} {dir.title}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-5 flex gap-10">
          <button
            className="w-full cursor-pointer rounded-xl border border-gray-500 px-5 py-3 text-gray-800"
            onClick={() => dispatch(setModal({ type: null, data: null }))}
          >
            Cancel
          </button>
          <button
            className="w-full cursor-pointer rounded-xl bg-gray-900 px-5 py-3 text-white disabled:opacity-50"
            onClick={handleMove}
            disabled={
              isParent
                ? !selectedRootType
                : !selectedParentDirectory || isMoving
            }
          >
            {isMoving ? (
              <Spinner className="size-6 text-neutral-600" />
            ) : (
              'Move'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
