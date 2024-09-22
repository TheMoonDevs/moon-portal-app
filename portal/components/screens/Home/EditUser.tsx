/* eslint-disable @next/next/no-img-element */
'use client';
import { useUser } from '@/utils/hooks/useUser';
import {
  setEditModalOpen,
  updateMember,
} from '@/utils/redux/coreTeam/coreTeam.slice';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { Box, IconButton, Modal, Button } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { JsonObject } from '@prisma/client/runtime/library';
import React, { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Spinner } from '@/components/elements/Loaders';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { toast, Toaster } from 'sonner';
import { setReduxUser } from '@/utils/redux/auth/auth.slice';

interface UpdatedUserData {
  id: string | undefined;
  name: string;
  email: string;
  description: string;
  positionTitle: string;
  payData: { upiId: string; walletAddress: string };
  personalData: {
    phone: string;
    address: string;
    city: string;
    dateOfBirth: string | null;
  };
  avatar?: string;
  banner?: string;
}

const EditUser = () => {
  const isEditModalOpen = useAppSelector(
    (state: RootState) => state.coreTeam.isEditModalOpen
  );
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [description, setDescription] = useState(user?.description || '');
  const [positionTitle, setPositionTitle] = useState(user?.positionTitle || '');
  const [upiId, setUpiId] = useState(
    ((user?.payData as JsonObject)?.upiId as string) || ''
  );
  const [walletAddress, setWalletAddress] = useState(
    ((user?.payData as JsonObject)?.walletAddress as string) || ''
  );
  const [phone, setPhone] = useState(
    ((user?.personalData as JsonObject)?.phone as string) || ''
  );
  const [address, setAddress] = useState(
    ((user?.personalData as JsonObject)?.address as string) || ''
  );
  const [city, setCity] = useState(
    ((user?.personalData as JsonObject)?.city as string) || ''
  );
  const [dateOfBirth, setDateOfBirth] = useState<dayjs.Dayjs | null>(
    dayjs(((user?.personalData as JsonObject)?.dateOfBirth as string) || null)
  );
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [avatarImage, setAvatarImage] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<
    string | undefined
  >(user?.avatar || undefined);
  const [uploadedBannerUrl, setUploadedBannerUrl] = useState<
    string | undefined
  >(user?.banner || undefined);

  const uploadFile = async (file: File, fileType: 'avatar' | 'banner') => {
    const formData = new FormData();
    formData.append('file', file);
    if (user) {
      formData.append('userId', user?.id);
    }
    formData.append(
      'folderName',
      fileType === 'avatar' ? 'userAvatars' : 'userBanners'
    );
    const response = await fetch('/api/upload/file-upload', {
      method: 'POST',
      body: formData,
      headers: {
        tmd_portal_api_key: TMD_PORTAL_API_KEY,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to upload ${fileType}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.fileInfo[0].fileUrl;
  };

  const handleBannerChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setBannerImage(file);
      const url = await uploadFile(file, 'banner');
      setUploadedBannerUrl(url);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarImage(file);
      const url = await uploadFile(file, 'avatar');
      setUploadedAvatarUrl(url);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const updatedData: UpdatedUserData = {
      avatar: uploadedAvatarUrl,
      banner: uploadedBannerUrl,
      id: user?.id,
      name,
      email,
      description,
      positionTitle,
      payData: {
        upiId,
        walletAddress,
      },
      personalData: {
        phone,
        address,
        city,
        dateOfBirth: dateOfBirth
          ? (dateOfBirth.format('YYYY-MM-DD') as string)
          : null,
      },
    };
    try {
      const res = await PortalSdk.putData('/api/user', updatedData);
      dispatch(setReduxUser(res.data.user));
      dispatch(updateMember(res.data.user));
      toast.success('User info updated successfully!');
    } catch (error) {
      console.error('Error updating user info:', error);
    } finally {
      setName('');
      setEmail('');
      setDescription('');
      setPositionTitle('');
      setUpiId('');
      setWalletAddress('');
      setPhone('');
      setAddress('');
      setCity('');
      setDateOfBirth(null);
      setBannerImage(null);
      setAvatarImage(null);
      setUploadedAvatarUrl(undefined);
      setUploadedBannerUrl(undefined);
      setIsUpdating(false);
      dispatch(setEditModalOpen(false));
    }
  };

  return (
    <>
      <Modal
        open={isEditModalOpen}
        onClose={() => dispatch(setEditModalOpen(false))}
        aria-labelledby='modal-modal-title'
        aria-describedby='modal-modal-description'
        disableEnforceFocus
      >
        <Box
          className='w-full max-w-2xl bg-white rounded-lg fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-lg overflow-y-auto no-scrollbar outline-none'
          sx={{
            maxHeight: '80vh',
            position: 'relative',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div className='relative h-[200px]'>
            <img
              src={
                uploadedBannerUrl
                  ? uploadedBannerUrl
                  : user?.banner || '/images/gradientBanner.jpg'
              }
              className='absolute w-full h-full object-cover rounded-t-lg'
              alt='Profile Banner'
            />
            <IconButton
              onClick={() => dispatch(setEditModalOpen(false))}
              className='absolute top-4 left-[92%] bg-white hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-300'
              sx={{ backgroundColor: 'white !important' }}
            >
              <span
                className='material-symbols-outlined text-black text-lg transform transition-transform duration-300 hover:rotate-90'
                style={{ fontSize: '20px' }}
              >
                close
              </span>
            </IconButton>
            <label className='absolute bottom-2 right-4 bg-white rounded-full flex items-center justify-center cursor-pointer'>
              <span
                className='material-symbols-outlined bg-white rounded-full p-[6px] cursor-pointer'
                style={{ fontSize: '16px' }}
              >
                add_a_photo
              </span>
              <input
                type='file'
                accept='image/jpeg,image/png'
                className='hidden'
                onChange={handleBannerChange}
              />
            </label>
            <div className='rounded-full absolute -bottom-14 left-1/2 transform -translate-x-1/2 border-4 w-24 h-24 border-white'>
              <img
                src={
                  uploadedAvatarUrl
                    ? uploadedAvatarUrl
                    : user?.avatar || '/icons/placeholderAvatar.svg'
                }
                alt={user?.name?.charAt(0) || ''}
                className='object-cover rounded-full w-full h-full bg-white'
              />
              <label className='absolute bottom-0 right-0 bg-white rounded-full p-[2px] flex items-center justify-center cursor-pointer'>
                <span
                  className='material-symbols-outlined bg-white rounded-full p-[4px]'
                  style={{ fontSize: '16px' }}
                >
                  add_a_photo
                </span>
                <input
                  type='file'
                  accept='image/jpeg,image/png'
                  className='hidden'
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
          </div>
          <div className='p-8'>
            <div className='mt-8'>
              <label htmlFor='name' className='block text-sm font-medium mb-1'>
                Name
              </label>
              <input
                type='text'
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='border rounded w-full p-2 mt-1 mb-4 shadow-sm focus:ring focus:ring-blue-300 transition duration-150'
              />
              <label htmlFor='email' className='block text-sm font-medium mb-1'>
                Email
              </label>
              <input
                type='email'
                id='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='border rounded w-full p-2 mt-1 mb-4 shadow-sm focus:ring focus:ring-blue-300 transition duration-150'
              />
              <label
                htmlFor='description'
                className='block text-sm font-medium mb-1'
              >
                Description
              </label>
              <textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className='border rounded w-full p-2 mt-1 mb-4 shadow-sm focus:ring focus:ring-blue-300 transition duration-150'
                rows={3}
              />
              <label htmlFor='phone' className='block text-sm font-medium mb-1'>
                Phone
              </label>
              <input
                type='text'
                id='phone'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className='border rounded w-full p-2 mb-4 shadow-sm focus:ring focus:ring-blue-300 transition duration-150'
              />
              <label
                htmlFor='address'
                className='block text-sm font-medium mb-1'
              >
                Address
              </label>
              <input
                type='text'
                id='address'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className='border rounded w-full p-2 mb-4 shadow-sm focus:ring focus:ring-blue-300 transition duration-150'
              />
              <div className='flex items-center gap-2'>
                <div className='flex-1 mt-4'>
                  {' '}
                  <label
                    htmlFor='city'
                    className='block text-sm font-medium mb-1'
                  >
                    City
                  </label>
                  <input
                    type='text'
                    id='city'
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className='border rounded w-full p-2 mb-4 shadow-sm focus:ring focus:ring-blue-300 transition duration-150 h-[56px]'
                  />
                </div>
                <div className='flex-1'>
                  {' '}
                  <label className='block text-sm font-medium mb-1'>
                    Date of Birth
                  </label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={dateOfBirth}
                      onChange={(newValue) => setDateOfBirth(newValue)}
                      sx={{ width: '100%' }}
                    />
                  </LocalizationProvider>
                </div>
              </div>
              <label
                htmlFor='positionTitle'
                className='block text-sm font-medium mb-1'
              >
                Position Title
              </label>
              <input
                type='text'
                id='positionTitle'
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                className='border rounded w-full p-2 mt-1 mb-4 shadow-sm focus:ring focus:ring-blue-300 transition duration-150'
              />
              <label className='block text-sm font-medium mb-1'>UPI ID</label>
              <input
                type='text'
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className='border rounded w-full p-2 shadow-sm focus:ring focus:ring-blue-300 transition duration-150 mb-4'
              />
              <label className='block text-sm font-medium mb-1'>
                Wallet Address
              </label>
              <input
                type='text'
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className='border rounded w-full p-2 shadow-sm focus:ring focus:ring-blue-300 transition duration-150 mb-4'
              />
            </div>
            <div className='mt-6'>
              <Button
                variant='contained'
                color='primary'
                onClick={handleUpdate}
                className='w-full capitalize'
              >
                {isUpdating ? (
                  <Spinner className='w-6 h-6  text-green-600' />
                ) : (
                  'Update User Info'
                )}
              </Button>
            </div>
          </div>
        </Box>
      </Modal>
      <Toaster richColors duration={3000} closeButton position='bottom-right' />
    </>
  );
};
export default EditUser;
