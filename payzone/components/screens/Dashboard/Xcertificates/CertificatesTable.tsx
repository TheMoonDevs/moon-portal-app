"use client";
import React, { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { PORTAL_SERVER, PORTAL_SERVER_API_URL } from "@/utils/service/MyServerApi";
import TableLoader from "@/components/elements/TableLoader";
import ConfirmationModal from "./DeleteModal";
import { User } from "@prisma/client";
import {
  ICertificate,
  IFile,
  deleteUploadedFile,
  setCertificates,
} from "@/utils/redux/cerificatesUpload/certificate.slice";
import { IconEdit } from "@tabler/icons-react";
import EditCertificateModal from "./EditCertificateInfo";
import { Tooltip } from "@mui/material";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { TMD_PAYZONE_API_KEY } from "@/utils/constants/appInfo";

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
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
};

const TableCell: React.FC<TableProps> = ({ children, className, ...rest }) => {
  const defaultClassName = "px-6 py-4 whitespace-nowrap";

  const combinedClassName = className
    ? `${defaultClassName} ${className}`
    : defaultClassName;

  return (
    <td className={combinedClassName} {...rest}>
      {children}
    </td>
  );
};

const CertificatesTable = () => {
  const { user } = useAuthSession();
  const searchTerm = useAppSelector((state) => state.searchTerm.term);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [certificateToEdit, setCertificateToEdit] =
    useState<ICertificate | null>(null);
  const isMountedRef = useRef(false);

  const dispatch = useAppDispatch();
  const { certificates } = useAppSelector((state) => state.certificatesUpload);
  const isAdminView = useAppSelector(
    (state) => state.certificatesUpload.isAdminView
  );
  const handleDelete = async (file: any) => {
    setFileToDelete(file);
    setShowConfirmationModal(true);
  };

  const confirmDelete = async () => {
    if (user && fileToDelete) {
      try {
        const response = await fetch(
          `${PORTAL_SERVER_API_URL}/upload/certificate-upload`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              [PORTAL_SERVER.headerField]: PORTAL_SERVER.apiKey,
            },
            body: JSON.stringify({
              id: fileToDelete.id,
              userId: fileToDelete.userId,
              fileName: fileToDelete.fileName,
            }),
          }
        );
        console.log(response);
        if (response.ok) {
          console.log("File deleted successfully!");
          dispatch(deleteUploadedFile(fileToDelete));
        } else {
          console.error("Failed to delete file:", response.statusText);
        }
      } catch (error) {
        console.error("Error deleting file:", error);
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
    if (!isMountedRef.current && user) {
      isMountedRef.current = true;
      return;
    }
    if (user) {
      const fetchFiles = async () => {
        try {
          setIsLoading(true);

          let response;

          if (!user.isAdmin) {
            response = await fetch(
              `${PORTAL_SERVER_API_URL}/upload/certificate-upload?userId=${user.id}`
            );
          } else {
            response = await fetch(
              `${PORTAL_SERVER_API_URL}/upload/certificate-upload`
            );
          }
          if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
          }
          const certificateData = await response.json();
          // console.log(certificateData);
          dispatch(setCertificates(certificateData));
        } catch (error) {
          console.error("Error fetching files:", error);
        } finally {
          setIsLoading(false); // Set loading state to false after fetching data
        }
      };

      fetchFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dispatch]);

  const handleEdit = (certificate: ICertificate) => {
    setCertificateToEdit(certificate);
    setShowEditModal(true);
  };

  const filteredCertificates = searchTerm
    ? certificates.filter((certificate: any) =>
      certificate.title?.toLowerCase().startsWith(searchTerm.toLowerCase())
    )
    : certificates;

  if (filteredCertificates.length === 0 && searchTerm) {
    return (
      <div className="text-center mt-4 font-semibold text-lg">
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
    <div className="overflow-x-auto mx-3 mt-6">
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this file?"
      />
      <EditCertificateModal
        certificateToEdit={certificateToEdit}
        isOpen={showEditModal}
        onCancel={() => setShowEditModal(false)}
      />
      <table className="rounded-xl table-auto min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-100">
            {/* {user?.isAdmin && <TableHeading>Name</TableHeading>} */}
            <TableHeading>Certificate Name</TableHeading>
            <TableHeading>Certificate URL</TableHeading>
            {user?.isAdmin && isAdminView && <TableHeading>OWNER</TableHeading>}
            <TableHeading>Certificate Type</TableHeading>
            <TableHeading>Certificate Date</TableHeading>
            {user?.isAdmin && isAdminView && (
              <TableHeading>Actions</TableHeading>
            )}
            {/* <TableHeading>File Size</TableHeading> */}
            {/* <TableHeading>Updated At</TableHeading> */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredCertificates.map((certificate: ICertificate) => (
            <tr key={certificate.id}>
              <TableCell>{certificate.title}</TableCell>
              <TableCell
                className="text-blue-400 cursor-pointer hover:underline underline-offset-2"
                onClick={() => window.open(certificate.file.fileUrl!, "_blank")}
              >
                {certificate.file.fileUrl &&
                  certificate.file.fileUrl.length > 40
                  ? `${certificate.file.fileUrl.substring(0, 40)}...`
                  : certificate.file.fileUrl}
              </TableCell>

              {user?.isAdmin && isAdminView && (
                <TableCell>
                  <span className="flex gap-2 items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={certificate.userInfo?.avatar as string}
                      alt={certificate.userInfo?.name as string}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{certificate.userInfo?.name}</span>
                  </span>
                </TableCell>
              )}

              <TableCell>
                <span className="flex justify-center certificates-center  bg-green-200 text-green-600 px-2 py-1 rounded-full text-xs">
                  {certificate.file.mimeType &&
                    certificate.file.mimeType.replace(
                      /(?:application|image|video|text)\/(.+)/,
                      (_: any, match: string) => match.toUpperCase()
                    )}
                </span>
              </TableCell>
              <TableCell>
                {certificate.createdAt &&
                  new Date(certificate.createdAt).toLocaleDateString("en-GB")}
              </TableCell>

              {user?.isAdmin && isAdminView && (
                <TableCell className="cursor-pointer flex gap-2">
                  <Tooltip title="Delete">
                    <button
                      className="border px-2 py-1 border-gray-400 bg-transparent text-black rounded-md hover:bg-gray-300"
                      onClick={() => handleDelete(certificate)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <button
                      className="border px-2 py-1 border-gray-400 bg-transparent text-black rounded-md hover:bg-gray-300"
                      onClick={() => handleEdit(certificate)}
                    >
                      <IconEdit />
                    </button>
                  </Tooltip>
                </TableCell>
              )}
              {/* <TableCell>{file.fileSize}</TableCell>
                  <TableCell>{file.updatedAt as any}</TableCell> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CertificatesTable;
