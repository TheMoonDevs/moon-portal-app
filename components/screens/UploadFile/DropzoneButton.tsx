"use client";
import React, { useRef } from "react";
import { Button } from "@/components/elements/Button";
import { RootState, useAppDispatch } from "@/utils/redux/store";
import { useSelector } from "react-redux";
import {
  FileWithPath,
  addFile,
  removeFile,
} from "@/utils/redux/filesUpload/filesUpload.slice";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconCloudUpload } from "@tabler/icons-react";
import { Group, rem } from "@mantine/core";
import { useUser } from "@/utils/hooks/useUser";

export function DropzoneButton() {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const files = useSelector((state: RootState) => state.filesUpload.files);
  const openRef = useRef<() => void>(null);
  const handleDrop = (droppedFiles: FileWithPath[]) => {
    console.log(droppedFiles);
    // Add the new file
    dispatch(addFile(droppedFiles));
  };

  const handleUpload = async () => {
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

  const previews = files.map((file: FileWithPath, index) => {
    const fileUrl = URL.createObjectURL(file);
    return (
      <div className="relative group" key={index}>
        <span
          className="material-symbols-outlined absolute -top-2 -right-2 cursor-pointer text-white bg-[rgba(0,0,0,0.5)] rounded-full p-1"
          style={{ fontSize: "1rem" }}
          onClick={() =>
            dispatch(
              removeFile({
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
            className="hover:text-blue-500 hover:underline"
          >
            {file.path}
          </a>
        )}
      </div>
    );
  });

  return (
    <div className="border-2 border-dashed border-gray-400 rounded-xl md:my-4 md:mx-3 p-2 ">
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
          MIME_TYPES.webp
        ]}
        maxSize={30 * 1024 ** 2}
        className="py-8 cursor-pointer"
        multiple
      >
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
        <p
          className="cursor-pointer text-blue-500 underline underline-offset-2 flex justify-center items-center my-2"
          onClick={() => openRef.current?.()}
        >
          click to browse
        </p>
      </Dropzone>
      <div className="flex gap-4 flex-wrap">{previews}</div>
      {files.length > 0 && (
        <div className="flex justify-center items-center">
          <Button onClick={handleUpload}>Upload File</Button>
        </div>
      )}
    </div>
  );
}
