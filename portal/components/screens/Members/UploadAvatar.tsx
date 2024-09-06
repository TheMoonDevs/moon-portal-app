/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState } from "react";
import { Button } from "@/components/elements/Button";
import { RootState, useAppDispatch } from "@/utils/redux/store";
import { useSelector } from "react-redux";
import {
  addFilesToPreview,
  resetPreview,
  setUploadedFiles,
} from "@/utils/redux/filesUpload/fileUpload.slice";
import { CircularProgress } from "@mui/material";
import { updateAvatarUrl } from "@/utils/redux/onboarding/onboarding.slice";
import { FileWithPath } from "@mantine/dropzone";
import { useUser } from "@/utils/hooks/useUser";
import { TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";

export function UploadAvatar() {
  const { user } = useUser();
  const [isFileUploading, setIsFileUploading] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const avatarUrl = useSelector(
    (state: RootState) => state.onboardingForm.avatar
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      dispatch(addFilesToPreview([file as FileWithPath]));
      handleUpload(file as FileWithPath);
    }
  };

  const handleUpload = async (file: FileWithPath) => {
    setIsFileUploading(true);
    const formData = new FormData();

    formData.append("file", file, file.path);
    if (user) {
      const userId = user.id;
      formData.append("userId", userId);
    }
    formData.append("folderName", "userAvatars");
    try {
      const response = await fetch("/api/upload/file-upload", {
        method: "POST",
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("File uploaded successfully!");
        console.log("Uploaded file info:", data.fileInfo);

        // Update the avatar URL with the file's URL
        const avatarUrl = data.fileInfo[0].fileUrl;
        console.log(avatarUrl);
        dispatch(updateAvatarUrl(avatarUrl));
        setUploadedFiles([data.fileInfo]);
        dispatch(resetPreview());
      } else {
        console.error("Failed to upload file:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsFileUploading(false);
    }
  };

  return (
    <div className="flex gap-4 items-center my-4">
      {avatarUrl ? (
        <div className="flex items-center">
          <img
            src={avatarUrl}
            alt="Profile photo"
            className="rounded-full h-12 w-12 object-cover"
          />
          <label className="ml-4 flex items-center cursor-pointer">
            <span className="flex items-center border p-2 rounded-lg text-sm text-gray-500">
              {isFileUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <CircularProgress size={20} color="inherit" />
                  <span className="text-gray-400 text-sm font-light">
                    Uploading....
                  </span>
                </div>
              ) : (
                "Click to replace"
              )}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="flex gap-2 justify-center items-center">
          <img
            src={avatarUrl ? avatarUrl : "/icons/placeholderAvatar.svg"}
            alt="Profile photo"
            className="rounded-full w-10 h-10"
          />
          <label className="flex items-center cursor-pointer">
            <span className="flex items-center border p-2 rounded-lg text-sm text-gray-500">
              {isFileUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <CircularProgress size={20} color="inherit" />
                  <span className="text-gray-400 text-sm font-light">
                    Uploading....
                  </span>
                </div>
              ) : (
                "Upload Avatar"
              )}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
}
