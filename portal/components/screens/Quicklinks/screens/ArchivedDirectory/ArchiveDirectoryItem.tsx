import { Directory, ParentDirectory } from "@prisma/client";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { useState } from "react";
import { Modal } from "@mui/material";
import {
  setToast,
  updateDirectory,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useAppDispatch } from "@/utils/redux/store";
import { ToastSeverity } from "@/components/elements/Toast";
import { revalidateRoot } from "@/utils/actions";

const ArchiveDirectoryItem = ({
  directory,
  // isParent,
  parent,
}: {
  directory: Directory | ParentDirectory;
  // isParent?: boolean;
  parent?: Directory | ParentDirectory;
}) => {
  const dispatch = useAppDispatch();

  const { directories } = useQuickLinkDirectory();

  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  const name = !parent
    ? `${(directory as ParentDirectory).type?.toLocaleLowerCase()} / ${
        directory.title
      }`
    : `${parent?.title} / ${directory.title}`;

  const handleRestore = async () => {
    setShowRestoreModal(false);
    let apiPath = "/api/quicklinks/directory";
    if (!parent) {
      apiPath = `/api/quicklinks/parent-directory`;
    }
    const updatedDirectory = {
      ...directory,
      isArchive: false,
    };

    try {
      dispatch(updateDirectory(updatedDirectory));
      const response = await QuicklinksSdk.updateData(
        apiPath,
        updatedDirectory
      );
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
      dispatch(updateDirectory(directory));
      console.log(error);
    }
  };

  const onCancel = () => setShowRestoreModal(false);

  return (
    <>
      {directory.isArchive && (
        <button
          className="flex flex-col items-center justify-center hover:bg-gray-200 transition-all rounded-md cursor-pointer"
          onClick={() => {
            setShowRestoreModal(true);
          }}
        >
          <span className="material-icons !text-9xl">folder</span>
          <p className="text-md -mt-3">{name}</p>
        </button>
      )}
      {directories
        .filter(
          (subdirectory: Directory) => subdirectory.parentDirId === directory.id
        )
        .map((subdirectory: Directory) => (
          <ArchiveDirectoryItem
            key={subdirectory.id}
            directory={subdirectory}
            parent={directory}
          />
        ))}
      <Modal
        onClose={onCancel}
        open={showRestoreModal}
        className=" text-black p-5 rounded-lg shadow-lg drop-shadow-sm flex items-center justify-center"
      >
        <div className="bg-white p-4 rounded-md">
          <h1>Do you want to restore {name}?</h1>
          <div className="flex mt-5 gap-10">
            <button
              className="w-full px-2 py-2 border border-gray-500 text-gray-800 rounded-xl text-lg cursor-pointer hover:bg-gray-300 transition-all"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="w-full px-5 py-3 bg-gray-900 text-white rounded-xl cursor-pointer disabled:opacity-50 hover:bg-gray-600 transition-all"
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
