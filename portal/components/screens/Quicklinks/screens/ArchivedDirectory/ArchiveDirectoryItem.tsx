import type { DirectoryList } from '@db/client';
import { Modal } from '@mui/material';
import { useState } from 'react';

import { ToastSeverity } from '@/components/elements/Toast';
import { revalidateRoot } from '@/utils/actions';
import { updateDirectory } from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import { setToast } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

import { useQuickLinkDirectory } from '../../hooks/useQuickLinkDirectory';

const ArchiveDirectoryItem = ({
  directory,
  // isParent,
  parent,
}: {
  directory: DirectoryList;
  // isParent?: boolean;
  parent?: DirectoryList;
}) => {
  const dispatch = useAppDispatch();

  const { directories } = useQuickLinkDirectory();

  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  const name = !parent
    ? `${(directory as DirectoryList).tabType?.toLocaleLowerCase()} / ${
        directory.title
      }`
    : `${parent?.title} / ${directory.title}`;

  const handleRestore = async () => {
    setShowRestoreModal(false);

    const updatedDirectory = {
      ...directory,
      isArchive: false,
    };

    try {
      dispatch(updateDirectory(updatedDirectory));
      const response = await QuicklinksSdk.updateData(
        `/api/quicklinks/directory-list`,
        updatedDirectory,
      );
      dispatch(
        setToast({ toastMsg: 'Done!', toastSev: ToastSeverity.success }),
      );

      revalidateRoot();
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: 'Something went wrong. Please try again.',
          toastSev: ToastSeverity.error,
        }),
      );
      dispatch(updateDirectory(directory));
      console.log(error);
    }
  };

  const onCancel = () => setShowRestoreModal(false);

  return (
    <>
      {directory.isArchive && (
        <button
          className="flex cursor-pointer flex-col items-center justify-center rounded-md p-2 transition-all hover:bg-gray-200"
          onClick={() => {
            setShowRestoreModal(true);
          }}
        >
          <span
            className="material-symbols-outlined !font-extralight"
            style={{ fontSize: '4rem' }}
          >
            folder
          </span>
          <p className="text-md mt-3">{name}</p>
        </button>
      )}
      {directories
        .filter(
          (subdirectory: DirectoryList) =>
            subdirectory.parentDirId === directory.id,
        )
        .map((subdirectory: DirectoryList) => (
          <ArchiveDirectoryItem
            key={subdirectory.id}
            directory={subdirectory}
            parent={directory}
          />
        ))}
      <Modal
        onClose={onCancel}
        open={showRestoreModal}
        className="flex items-center justify-center rounded-lg p-5 text-black shadow-lg drop-shadow-sm"
      >
        <div className="rounded-md bg-white p-4">
          <h1>Do you want to restore {name}?</h1>
          <div className="mt-5 flex gap-10">
            <button
              className="w-full cursor-pointer rounded-xl border border-gray-500 p-2 text-lg text-gray-800 transition-all hover:bg-gray-300"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="w-full cursor-pointer rounded-xl bg-gray-900 px-5 py-3 text-white transition-all hover:bg-gray-600 disabled:opacity-50"
              onClick={handleRestore}
            >
              Restore
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ArchiveDirectoryItem;
