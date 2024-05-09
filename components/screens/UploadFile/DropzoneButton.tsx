"use client";
import React, { useRef } from "react";
import { Button } from "@/components/elements/Button";
import { RootState, useAppDispatch } from "@/utils/redux/store";
import { useSelector } from "react-redux";
import {
  addFile,
  removeFile,
} from "@/utils/redux/filesUpload/filesUpload.slice";
import { Dropzone, FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { useUser } from "@/utils/hooks/useUser";

export function DropzoneButton() {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const files = useSelector((state: RootState) => state.filesUpload.files);
  const openRef = useRef<() => void>(null);
  const handleDrop = (droppedFiles: any[]) => {
    // Remove previously uploaded file
    if (files.length > 0) {
      dispatch(removeFile(0));
    }
    // Add the new file
    dispatch(addFile(droppedFiles[0]));
  };

  // const handleRemove = (index: number) => {
  //   dispatch(removeFile(index));
  // };

  const handleUpload = async () => {
    if (files.length > 0) {
      const file = files[0] as FileWithPath;
      const formData = new FormData();
      formData.append("file", file);
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
        } else {
          // Handle error
          console.error("Failed to upload file:", response.statusText);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        // Handle error
      }
    }
  };

  return (
    <div className=" rounded-xl md:my-4 md:mx-3 p-2 cursor-pointer ">
      <Dropzone
        onDrop={handleDrop}
        radius="md"
        accept={[
          MIME_TYPES.pdf,
          MIME_TYPES.jpeg,
          MIME_TYPES.png,
          MIME_TYPES.svg,
          MIME_TYPES.doc,
        ]}
        maxSize={30 * 1024 ** 2}
        className="group relative flex h-48 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400"
      >
        {files.length > 0 ? (
          <div className="flex justify-center items-center font-semibold text-gray-500">
            {files.map((file, index) => (
              <div key={index}>{file.path}</div>
            ))}
          </div>
        ) : (
          <>
            <div className="pointer-events-none space-y-1 text-center">
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
                Drop your documents here, or click to upload
              </Dropzone.Idle>
            </div>
            <input
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              type="file"
            />
          </>
        )}
        <p
          className="cursor-pointer text-blue-500 underline underline-offset-2 flex justify-center items-center my-2"
          onClick={() => openRef.current?.()}
        >
          click to browse
        </p>
      </Dropzone>
      {files.length > 0 && (
        <div className="flex justify-center items-center">
          <Button onClick={handleUpload}>Upload File</Button>
        </div>
      )}
    </div>
  );
}
