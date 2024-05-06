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
import { IconCloudUpload } from "@tabler/icons-react";
import { Group, rem } from "@mantine/core";
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
    <div className="border-2 border-dashed border-gray-400 rounded-xl m-4 p-2 cursor-pointer ">
      <Dropzone
        onDrop={handleDrop}
        radius="md"
        accept={[MIME_TYPES.pdf]}
        maxSize={30 * 1024 ** 2}
        className="py-8"
      >
        {files.length > 0 ? (
          <div className="flex justify-center items-center font-semibold text-gray-500">
            {files.map((file, index) => (
              <div key={index}>{file.path}</div>
            ))}
          </div>
        ) : (
          <div style={{ pointerEvents: "none" }}>
            <Group justify="center">
              <Dropzone.Idle>
                <IconCloudUpload
                  style={{ width: rem(20), height: rem(40) }}
                  stroke={1.5}
                />
              </Dropzone.Idle>
            </Group>
            <div className="flex justify-center items-center font-semibold text-gray-500">
              <Dropzone.Idle>Drop your documents here, or</Dropzone.Idle>
            </div>
          </div>
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
