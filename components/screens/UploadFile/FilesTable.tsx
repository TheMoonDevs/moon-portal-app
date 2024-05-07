"use client";
import React, { useEffect, useState } from "react";
import { FileUpload } from "@prisma/client";
import { useUser } from "@/utils/hooks/useUser";
import Image from "next/image";
import { Table } from "@mui/material";

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
const FilesTable = () => {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const { user } = useUser();
  if (!user) {
    throw new Error("User not found");
  }
  useEffect(() => {
    if (user) {
      const fetchFiles = async () => {
        try {
          const response = await fetch(
            `/api/upload/file-upload?userId=${user.id}`
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
          }
          const filesData = await response.json();
          setFiles(filesData);
        } catch (error) {
          console.error("Error fetching files:", error);
        }
      };

      fetchFiles();
    }
  }, [user]);

  return (
    <div className="overflow-x-auto mx-3 mt-6">
      <table className="rounded-xl table-auto min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-100">
            {user.isAdmin && <TableHeading>Name</TableHeading>}
            <TableHeading>Document Name</TableHeading>
            <TableHeading>Document URL</TableHeading>
            <TableHeading>Document Type</TableHeading>
            <TableHeading>Document Date</TableHeading>
            <TableHeading>Actions</TableHeading>
            {/* <TableHeading>File Size</TableHeading> */}
            {/* <TableHeading>Updated At</TableHeading> */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file) => (
            <tr key={file.id}>
              {user.isAdmin && (
                <TableCell className="flex gap-x-3 items-start">
                  <Image
                    src={user.avatar!}
                    width={24}
                    height={24}
                    className="rounded-full"
                    alt="Profile Picture"
                  />{" "}
                  <span>{user.name}</span>
                </TableCell>
              )}
              <TableCell>{file.fileName}</TableCell>
              <TableCell
                className="text-blue-400 cursor-pointer hover:underline underline-offset-2"
                onClick={() => window.open(file.fileUrl!, "_blank")}
              >
                {file.fileUrl && file.fileUrl.length > 40
                  ? `${file.fileUrl.substring(0, 40)}...`
                  : file.fileUrl}
              </TableCell>

              <TableCell>
                <span className="flex justify-center items-center w-1/3 bg-green-200 text-green-600 px-2 py-1 rounded-full text-xs">
                  {file.mimeType &&
                    file.mimeType.replace(
                      /(?:application|image|video|text)\/(.+)/,
                      (_, match) => match.toUpperCase()
                    )}
                </span>
              </TableCell>
              <TableCell>
                {file.createdAt &&
                  new Date(file.createdAt).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell className="cursor-pointer">
                <Image
                  src={`/icons/delete.svg`}
                  width={20}
                  height={20}
                  alt="Delete Icon"
                />
              </TableCell>
              {/* <TableCell>{file.fileSize}</TableCell>
              <TableCell>{file.updatedAt as any}</TableCell> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FilesTable;
