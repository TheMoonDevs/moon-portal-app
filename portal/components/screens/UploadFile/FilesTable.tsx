'use client';
import type { FileUpload, User } from '@db/client';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Button } from '@/components/elements/Button';
import ConfirmationModal from '@/components/elements/DeleteModal'; // Import the ConfirmationModal component
import TableLoader from '@/components/elements/TableLoader';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import {
  deleteUploadedFile,
  setUploadedFiles,
} from '@/utils/redux/filesUpload/fileUpload.slice';
import { useAppSelector } from '@/utils/redux/store';

interface TableProps extends React.HTMLProps<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

const TableHeading: React.FC<TableProps> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
};

const TableCell: React.FC<TableProps> = ({ children, className, ...rest }) => {
  const defaultClassName = 'px-6 py-4 whitespace-nowrap';

  const combinedClassName = className
    ? `${defaultClassName} ${className}`
    : defaultClassName;

  return (
    <td className={combinedClassName} {...rest}>
      {children}
    </td>
  );
};

const FilesTable = ({ users }: { users?: User[] }) => {
  const { user } = useUser();
  const searchTerm = useAppSelector((state) => state.searchTerm.term);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileUpload | null>(null);
  const isMountedRef = useRef(false);

  const dispatch = useDispatch();
  const { uploadedFiles } = useAppSelector((state) => state.filesUpload);
  if (!user) {
    throw new Error('User not found');
  }

  const handleDelete = async (file: FileUpload) => {
    setFileToDelete(file);
    setShowConfirmationModal(true);
  };

  const confirmDelete = async () => {
    if (user && fileToDelete) {
      try {
        const response = await fetch('/api/upload/file-upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
          body: JSON.stringify({
            id: fileToDelete.id,
          }),
        });
        console.log(response);
        if (response.ok) {
          console.log('File deleted successfully!');
          dispatch(deleteUploadedFile(fileToDelete));
        } else {
          console.error('Failed to delete file:', response.statusText);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    setShowConfirmationModal(false);
    setFileToDelete(null);
  };

  const cancelDelete = () => {
    setShowConfirmationModal(false);
    setFileToDelete(null);
  };

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (!user) return;
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        let response;

        if (!user.isAdmin) {
          response = await fetch(`/api/upload/file-upload?userId=${user.id}`);
        } else {
          response = await fetch('/api/upload/file-upload');
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.statusText}`);
        }
        const filesData = await response.json();

        dispatch(setUploadedFiles(filesData));
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setIsLoading(false); // Set loading state to false after fetching data
      }
    };

    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const filteredFiles = searchTerm
    ? uploadedFiles.filter((file) =>
        file.fileName?.toLowerCase().startsWith(searchTerm.toLowerCase()),
      )
    : uploadedFiles;

  if (filteredFiles.length === 0 && searchTerm) {
    return (
      <div className="mt-4 text-center text-lg font-semibold">
        No document found
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-6">
        <TableLoader />
      </div>
    );
  }
  return (
    <div className="mx-3 mt-6 overflow-x-auto">
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this file?"
      />
      <table className="min-w-full table-auto divide-y divide-gray-200 rounded-xl">
        <thead>
          <tr className="bg-gray-100">
            {/* {user.isAdmin && <TableHeading>Name</TableHeading>} */}
            <TableHeading>Document Name</TableHeading>
            <TableHeading>Document URL</TableHeading>
            {user.isAdmin && <TableHeading>OWNER</TableHeading>}
            <TableHeading>Document Type</TableHeading>
            <TableHeading>Document Date</TableHeading>
            <TableHeading>Actions</TableHeading>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredFiles.map((file) => (
            <tr key={file.id}>
              <TableCell>{file.fileName}</TableCell>
              <TableCell
                className="cursor-pointer text-blue-400 underline-offset-2 hover:underline"
                onClick={() => window.open(file.fileUrl!, '_blank')}
              >
                {file.fileUrl && file.fileUrl.length > 40
                  ? `${file.fileUrl.substring(0, 40)}...`
                  : file.fileUrl}
              </TableCell>
              {user.isAdmin && (
                <TableCell className="flex flex-col items-start gap-y-3">
                  {(() => {
                    const owner = users?.find((u) => u.id === file.userId);
                    const issuer = users?.find(
                      (u) => u.id === file.uploadedByUserId,
                    );

                    return (
                      <>
                        <div className="flex gap-x-3">
                          <Image
                            src={owner?.avatar || '/images/avatar.png'}
                            width={24}
                            height={24}
                            className="rounded-full"
                            alt="Profile Picture"
                          />{' '}
                          <span>{owner?.name || 'Unknown user'}</span>
                        </div>
                        {file.uploadedByUserId && (
                          <div className="flex gap-x-2">
                            <span className="text-xs">Issued by</span>
                            <Image
                              src={issuer?.avatar || '/images/avatar.png'}
                              width={20}
                              height={20}
                              className="rounded-full"
                              alt="Profile Picture"
                            />{' '}
                            <span className="text-xs">
                              {issuer?.name || 'Unknown user'}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </TableCell>
              )}
              <TableCell>
                <span className="flex w-3/4 items-center justify-center rounded-full bg-green-200 px-2 py-1 text-xs text-green-600">
                  {file.mimeType &&
                    file.mimeType.replace(
                      /(?:application|image|video|text)\/(.+)/,
                      (_: string, match: string) => match.toUpperCase(),
                    )}
                </span>
              </TableCell>
              <TableCell>
                {file.createdAt &&
                  new Date(file.createdAt).toLocaleDateString('en-GB')}
              </TableCell>
              <TableCell className="cursor-pointer">
                <Button
                  className="rounded-md border border-gray-400 bg-transparent px-2 py-1 text-black hover:bg-gray-300"
                  alt="Delete Button"
                  onClick={() => handleDelete(file)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </Button>
              </TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FilesTable;
