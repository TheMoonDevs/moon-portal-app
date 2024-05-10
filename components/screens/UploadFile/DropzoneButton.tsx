"use client";
import React, { useState } from "react";
import { Button } from "@/components/elements/Button";
import { RootState, useAppDispatch } from "@/utils/redux/store";
import { useSelector } from "react-redux";

import { Dropzone, FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { useUser } from "@/utils/hooks/useUser";
import {
  addFilesToPreview,
  removeFilesFromPreview,
  resetPreview,
} from "@/utils/redux/filesUpload/fileUpload.slice";
import { CircularProgress } from "@mui/material";

export function DropzoneButton() {
  const [isFileUploading, setIsFileUploading] = useState<boolean>(false);

  const dispatch = useAppDispatch();
  const { user } = useUser();
  const files = useSelector((state: RootState) => state.filesUpload.files);
  const handleDrop = (droppedFiles: FileWithPath[]) => {
    // console.log(droppedFiles);
    // Add the new file
    dispatch(addFilesToPreview(droppedFiles));
  };

  const handleUpload = async () => {
    setIsFileUploading(true);
    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file, file.path);
      });
      if (user) {
        const userId = user.id;
        formData.append("userId", userId);
      }
      try {
        const response = await fetch("/api/upload/file-upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          // Handle success, maybe show a success message
          console.log("File uploaded successfully!");
          dispatch(resetPreview());
          setIsFileUploading(false);
        } else {
          // Handle error
          setIsFileUploading(false);
          console.error("Failed to upload file:", response.statusText);
        }
      } catch (error) {
        setIsFileUploading(false);
        console.error("Error uploading file:", error);
        // Handle error
      }
    }
  };

  const previews = files.map((file: FileWithPath, index) => {
    const fileUrl = URL.createObjectURL(file);
    return (
      <div className="relative group" key={index}>
        <span
          className="material-symbols-outlined absolute -top-5 -right-2 cursor-pointer text-white bg-[rgba(0,0,0,0.5)] rounded-full p-[0.1rem]"
          style={{ fontSize: "1rem" }}
          onClick={() =>
            dispatch(
              removeFilesFromPreview({
                path: file.path,
                lastModified: file.lastModified,
              })
            )
          }
        >
          close
        </span>
        {file.type === "image/png" || file.type === "image/jpeg" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            style={{ height: "100px", aspectRatio: "1/1" }}
            alt={file.path}
            key={index}
            src={fileUrl}
            onLoad={() => URL.revokeObjectURL(fileUrl)}
          />
        ) : (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 hover:underline border-2 border-gray-300 rounded-lg p-3 "
          >
            {file.path}
          </a>
        )}
      </div>
    );
  });

  return (
    <div className=" border-2 border-dashed border-gray-300 rounded-xl md:my-4 md:mx-3 p-2 bg-gray-50 transition-colors hover:border-gray-400">
      <Dropzone
        onDrop={handleDrop}
        radius="md"
        accept={[
          MIME_TYPES.pdf,
          MIME_TYPES.doc,
          MIME_TYPES.docx,
          MIME_TYPES.jpeg,
          MIME_TYPES.png,
          MIME_TYPES.xls,
          MIME_TYPES.xlsx,
          MIME_TYPES.svg,
          MIME_TYPES.webp,
        ]}
        maxSize={30 * 1024 ** 2}
        className="group relative flex h-48 cursor-pointer items-center justify-center rounded-lg "
        multiple
      >
        <div className="pointer-events-none flex flex-col gap-2 text-center">
          <svg
            className="mx-auto h-8 w-8 text-gray-400 group-hover:text-gray-500 "
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <Dropzone.Idle>
            Drop your documents here, or{" "}
            <span className="underline italic text-blue-500">
              click to upload
            </span>
          </Dropzone.Idle>
        </div>
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          type="file"
        />
      </Dropzone>
      <div className="flex gap-4 flex-wrap">{previews}</div>
      {files.length > 0 && (
        <div className="flex justify-center items-center">
          <Button onClick={handleUpload} disabled={isFileUploading}>
            {isFileUploading ? (
              <div className="flex items-center justify-center gap-2">
                <CircularProgress size={20} color="inherit" />
                <span>Uploading...</span>
              </div>
            ) : (
              "Upload File"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
