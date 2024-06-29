import { CircularProgress } from '@mui/material';
import { useRef, useState } from 'react';
import { Modal, Tooltip } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';
import { FormFields } from './LinkActions';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import {
  setAllQuicklinks,
  setToast,
} from '@/utils/redux/quicklinks/quicklinks.slice';

export const EditLinkPopup = ({
  isModalOpen,
  handleCloseModal,
  fields,
  setFields,
}: {
  isModalOpen: boolean;
  handleCloseModal: () => void;
  fields: FormFields;
  setFields: React.Dispatch<React.SetStateAction<FormFields>>;
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [logoLoading, setLogoLoading] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { allQuicklinks } = useAppSelector((state) => state.quicklinks);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileUpload(file, type);
    }
  };

  const handleFileUpload = async (file: File, type: string) => {
    try {
      if (type === 'image') setImageLoading(true);
      if (type === 'logo') setLogoLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/quicklinks/link/upload-img', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        if (type === 'image') {
          setFields({ ...fields, image: data.fileInfo.fileUrl });
        } else if (type === 'logo') {
          setFields({ ...fields, logo: data.fileInfo.fileUrl });
        }
      } else {
        console.error('Failed to upload file:', data.message);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      if (type === 'image') setImageLoading(false);
      if (type === 'logo') setLogoLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      const response = await QuicklinksSdk.updateData(`/api/quicklinks/link`, {
        linkId: fields.id,
        updateQuery: {
          title: fields.title,
          description: fields.description,
          url: fields.url,
          logo: fields.logo,
          image: fields.image,
        },
      });
      console.log(response);
      dispatch(
        setToast({
          showToast: true,
          toastMsg: 'Link updated successfully',
          toastSev: 'success',
        })
      );
      const updatedLink = response.data.link;
      const updatedQuicklinks = allQuicklinks.map((link) =>
        link.id === updatedLink.id ? updatedLink : link
      );
      dispatch(setAllQuicklinks(updatedQuicklinks));
      setLoading(false);
      handleCloseModal();
    } catch (error) {
      console.log(error);
      setLoading(false);
      dispatch(
        setToast({
          showToast: true,
          toastMsg: 'Error updating link, please try again',
          toastSev: 'error',
        })
      );
    }
  };

  return (
    <Modal
      open={isModalOpen}
      onClose={() => {
        if (!loading) handleCloseModal();
      }}
      aria-labelledby='edit-link-modal'
      aria-describedby='modal-modal-description'
    >
      <div className='relative bg-white rounded-lg shadow-xl max-w-md mx-auto my-12 border border-gray-200 outline-none'>
        <button
          className='absolute -top-4 -right-4 z-10 border-2 border-gray-300 p-1 flex items-center justify-center rounded-full text-gray-500 focus:outline-none  bg-gray-200 hover:bg-gray-100'
          onClick={handleCloseModal}
        >
          <span className='material-symbols-outlined'>close</span>
        </button>

        <input
          type='file'
          ref={imageInputRef}
          className='hidden'
          onChange={(e) => handleFileChange(e, 'image')}
        />
        <input
          type='file'
          ref={logoInputRef}
          className='hidden'
          onChange={(e) => handleFileChange(e, 'logo')}
        />

        {/* Cover Image */}
        {fields.image && (
          <div
            className='w-full h-48 relative rounded-t-lg overflow-hidden cursor-pointer'
            onClick={() => imageInputRef.current?.click()}
          >
            <Image
              src={fields.image}
              alt='cover image'
              layout='fill'
              objectFit='cover'
              className={`w-full h-48 border-b-2 border-gray-200 ${
                imageLoading ? 'blur-[2px]' : ''
              }`}
            />
            {imageLoading && (
              <div className='absolute inset-0 flex justify-center items-center bg-black bg-opacity-50'>
                <CircularProgress sx={{ color: 'whitesmoke' }} />
              </div>
            )}
            <Tooltip title='Edit Profile Image'>
              <div
                className='absolute top-2 left-2 w-5 h-auto cursor-pointer flex justify-center items-center gap-1 py-2 px-4 shadow-sm text-sm font-medium text-gray-600 border-2 border-gray-400
              hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black hover:bg-gray-200 bg-gray-200 rounded-full'
              >
                <span
                  className='material-symbols-outlined'
                  style={{ fontSize: '16px' }}
                >
                  edit
                </span>
              </div>
            </Tooltip>
          </div>
        )}

        {/* Logo */}
        {fields.logo && (
          <div className='relative -mt-12 mb-2 flex justify-center'>
            <div
              className='w-28 h-28 relative rounded-full border-4 border-black bg-white cursor-pointer '
              onClick={() => logoInputRef.current?.click()}
            >
              <Image
                src={fields.logo}
                alt='logo'
                layout='fill'
                objectFit='cover'
                className={`rounded-full p-1 ${logoLoading ? 'blur-[2px]' : ''}`}
              />
              {logoLoading && (
                <div className='absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 rounded-full'>
                  <CircularProgress sx={{ color: 'whitesmoke' }} />
                </div>
              )}
              <Tooltip title='Edit Logo'>
                <div className='w-7 h-7 absolute bottom-2 right-0 z-10 p-1 flex items-center justify-center rounded-full text-gray-600  focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 cursor-pointer border-[2px] border-gray-600 bg-gray-200  '>
                  <span
                    className='material-symbols-outlined'
                    style={{ fontSize: '15px' }}
                  >
                    edit
                  </span>
                </div>
              </Tooltip>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4 p-6'>
          <div>
            <label
              htmlFor='title'
              className='block text-sm font-medium text-gray-700'
            >
              Title
            </label>
            <input
              id='title'
              type='text'
              value={fields.title}
              onChange={(e) => setFields({ ...fields, title: e.target.value })}
              className='mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm'
            />
          </div>
          <div>
            <label
              htmlFor='description'
              className='block text-sm font-medium text-gray-700'
            >
              Description
            </label>
            <input
              id='description'
              type='text'
              value={fields.description}
              onChange={(e) =>
                setFields({ ...fields, description: e.target.value })
              }
              className='mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm'
            />
          </div>
          <div>
            <div className='flex justify-between items-center'>
              <label
                htmlFor='url'
                className='block text-sm font-medium text-gray-700'
              >
                URL
              </label>
              <Link
                href={fields.url}
                className='text-xs text-gray-500 flex justify-center items-center gap-1'
                target='_blank'
              >
                Visit Link
                <span
                  className='material-symbols-outlined '
                  style={{ fontSize: '12px' }}
                >
                  open_in_new
                </span>
              </Link>
            </div>
            <input
              id='url'
              type='text'
              value={fields.url}
              onChange={(e) => setFields({ ...fields, url: e.target.value })}
              className='mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm'
            />
          </div>
          <button
            type='submit'
            className='w-full flex justify-center items-center gap-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} color='inherit' />
            ) : (
              <>
                <span className='material-symbols-outlined'>task_alt</span> Save
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
