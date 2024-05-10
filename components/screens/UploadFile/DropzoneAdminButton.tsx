"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/elements/Button";
import { RootState, useAppDispatch } from "@/utils/redux/store";
import { User } from "@prisma/client";
import { useAppSelector } from "@/utils/redux/store";
import { Dropzone, FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import {
  addFileFromAdmin,
  removeFileFromAdmin,
} from "@/utils/redux/filesUpload/fileUploadAdmin.slice";
import { useUser } from "@/utils/hooks/useUser";

export default function DropzoneAdminButton() {
  const dispatch = useAppDispatch();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedUserObj, setSelectedUserObj] = useState<User | null>(null);
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  const files = useAppSelector(
    (state: RootState) => state.filesUploadAdmin.files
  );
  const handleDrop = (droppedFiles: FileWithPath[]) => {
    console.log(droppedFiles);
    // Add the new file
    dispatch(addFileFromAdmin(droppedFiles));
  };
  const handleSubmit = async () => {
    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file, file.path);
      });
      let userId;
      if (selectedUserObj) {
        userId = selectedUserObj.id;
      } else if (user) {
        userId = user.id;
      } else {
        console.error("No user selected or logged in");
        return;
      }

      formData.append("userId", userId);
      try {
        const response = await fetch(`api/upload/file-upload`, {
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
          className="material-symbols-outlined absolute px-2 -top-5 -right-2 cursor-pointer text-white bg-[rgba(0,0,0,0.5)] rounded-full p-[0.1rem]"
          style={{ fontSize: "1rem" }}
          onClick={() =>
            dispatch(
              removeFileFromAdmin({
                path: file.path,
                lastModified: file.lastModified,
              })
            )
          }
        >
          X
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
  useEffect(() => {
    setIsLoading(true); // Set loading state to true before fetching data

    const fetchUsers = async () => {
      try {
        const response = await fetch(`api/users`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setUsers(data?.data?.user as User[]);
        setIsLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center  md:mt-4">
      <div className="w-full  space-y-4">
        <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm ">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Upload User File</h3>
          </div>
          <div className="md:my-4 py-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400">
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
              className="group relative flex h-48 cursor-pointer items-center justify-center "
              multiple
            >
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
            </Dropzone>
            <div className="ml-4 flex gap-4 flex-wrap">{previews}</div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium bg-white text-gray-700 "
                htmlFor="user"
              >
                Select a user
              </label>
              <div className="flex gap-4 justify-between">
                <select
                  className="w-2/3 rounded-md border bg-white border-gray-300 py-2 px-3 pr-10 text-base focus:border-indigo-500  focus:ring-indigo-500 sm:text-sm "
                  id="user"
                  onChange={(e) => {
                    const selectedUserId = e.target.value;
                    const selectedUser = users.find(
                      (user) => user.id === selectedUserId
                    );
                    setSelectedUser(selectedUserId);
                    setSelectedUserObj(selectedUser || null);
                  }}
                >
                  <option value="" selected>
                    Select your option
                  </option>
                  {isLoading ? (
                    <option disabled>Loading...</option>
                  ) : users && users.length > 0 ? (
                    users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No users found</option>
                  )}
                </select>
                <Button
                  className="w-1/3 rounded-md  py-2 px-4 text-sm font-medium text-white bg-black   focus:outline-none  "
                  type="submit"
                  onClick={handleSubmit}
                >
                  Upload File
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
