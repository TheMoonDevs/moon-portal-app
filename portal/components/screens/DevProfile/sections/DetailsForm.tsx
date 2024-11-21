'use client';
import Textarea from '@/components/elements/Textarea';
import Input from '@/components/elements/Input';
import React, { useEffect, useRef, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useUser } from '@/utils/hooks/useUser';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { Spinner } from '@/components/elements/Loaders';
import { toast } from 'sonner';
import { DevProfile } from '@prisma/client';

const DetailsForm = ({
  methods,
}: {
  methods: UseFormReturn<DevProfile | any | undefined>;
}) => {
  const {
    setValue,
    getValues,
    register,
    formState: { errors },
  } = methods;
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useUser();

  const uploadAvatarImage = async (file: File) => {
    setIsUploadingImg(true);
    const formData = new FormData();
    formData.append('file', file);
    if (user && user.user) {
      formData.append('userId', user.user.id);
    }
    try {
      const response = await fetch('/api/upload/file-upload', {
        method: 'POST',
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });
      const data = await response.json();
      return data.fileInfo[0].fileUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image, please try again.');
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileUrl = await uploadAvatarImage(file);
      setValue('avatar', fileUrl);
      // toast.success('Avatar uploaded successfully, Click on update to save.');
    }
  };

  const openFileSelector = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="flex w-full flex-row items-start gap-10 py-4 max-sm:flex-col">
        <div className="flex w-1/3 flex-col items-center gap-4 max-md:w-1/2 max-sm:w-full">
          <img
            src={getValues('avatar') || '/user.png'}
            alt="logo"
            className="h-[150px] w-[150px] rounded-full object-cover"
          />
          <button
            className={`cursor-pointer rounded-lg bg-black px-4 py-2 text-xs text-white transition duration-300 ease-in-out ${isUploadingImg ? '!cursor-not-allowed opacity-50' : 'hover:bg-neutral-700'}`}
            onClick={!isUploadingImg ? openFileSelector : undefined}
          >
            {!isUploadingImg ? (
              'Change Avatar'
            ) : (
              <span className="flex items-center gap-2">
                Uploading... <Spinner className="h-4 w-4" />
              </span>
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarChange}
            accept="image/*"
          />
        </div>

        <div className="flex w-2/3 max-w-3xl flex-col gap-4 max-md:w-1/2 max-sm:w-full">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="firstName"
              label="First name"
              register={register}
              requiredMessage="First name is required"
              errors={errors}
              required
            />
            <Input
              id="lastName"
              label="Last name"
              register={register}
              requiredMessage="Last name is required"
              errors={errors}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="email"
              label="Email"
              register={register}
              requiredMessage="Email is required"
              errors={errors}
              required
            />
            <Input
              id="address"
              label="Address"
              register={register}
              errors={errors}
              requiredMessage="Address is required"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              id="city"
              label="City"
              register={register}
              errors={errors}
              requiredMessage="City is required"
            />
            <Input
              id="state"
              label="State"
              register={register}
              errors={errors}
              requiredMessage="State is required"
            />
            <Input
              id="country"
              label="Country"
              register={register}
              errors={errors}
              requiredMessage="Country is required"
            />
          </div>

          <Input
            id="profession"
            label="Profession"
            register={register}
            errors={errors}
            requiredMessage="Profession is required"
          />
          <Textarea
            id="bio"
            label="Bio"
            register={register}
            requiredMessage="Bio is required"
            errors={errors}
          />
        </div>
      </div>
    </>
  );
};

export default DetailsForm;
