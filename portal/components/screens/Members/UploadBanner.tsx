/* eslint-disable @next/next/no-img-element */
'use client';
import React, { useState } from 'react';
import { RootState, useAppDispatch } from '@/utils/redux/store';
import { useSelector } from 'react-redux';
import {
  addFilesToPreview,
  resetPreview,
  setUploadedFiles,
} from '@/utils/redux/filesUpload/fileUpload.slice';
import { FileWithPath } from '@mantine/dropzone';
import { useUser } from '@/utils/hooks/useUser';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

const UploadBanner = () => {
  const { user } = useUser();
  const [isFileUploading, setIsFileUploading] = useState<boolean>(false);
  // const dispatch = useAppDispatch();
  // news state will be required here for the banner uploads
  const BannerUrl = useSelector(
    (state: RootState) => state.onboardingForm.avatar,
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      // dispatch(addFilesToPreview([file as FileWithPath]));
      handleUpload(file as FileWithPath);
    }
  };

  const handleUpload = async (file: FileWithPath) => {
    setIsFileUploading(true);
    const formData = new FormData();

    formData.append('file', file, file.path);
    if (user) {
      const userId = user.id;
      formData.append('userId', userId);
    }
    formData.append('folderName', 'userBanners');
    try {
      const response = await fetch('/api/upload/file-upload', {
        method: 'POST',
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('File uploaded successfully!');
        console.log('Uploaded file info:', data.fileInfo);

        // Update the Banner URL with the file's URL
        const bannerUrl = data.fileInfo[0].fileUrl;
        console.log(bannerUrl);
        // again here new state logic will be required
        // dispatch(updateAvatarUrl(bannerUrl));
        setUploadedFiles([data.fileInfo]);
        // dispatch(resetPreview());
      } else {
        console.error('Failed to upload file:', response.statusText);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsFileUploading(false);
    }
  };

  return <div>UploadBanner</div>;
};

export default UploadBanner;
