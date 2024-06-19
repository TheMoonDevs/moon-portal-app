import { CircularProgress, IconButton } from '@mui/material';
import { useState } from 'react';
import { Modal } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';
import { FormFields } from './LinkActions';
import { useAppDispatch } from '@/utils/redux/store';
import { setToast } from '@/utils/redux/quicklinks/quicklinks.slice';

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
  const dispatch = useAppDispatch();

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
          // logo: fields.logo,
          // image: fields.image,
        },
      });
      console.log(response);
      setLoading(false);
      handleCloseModal();
      dispatch(
        setToast({
          showToast: true,
          toastMsg: "Link updated successfully",
          toastSev: "success",
        })
      );
    } catch (error) {
      console.log(error);
      setLoading(false);
      dispatch(
        setToast({
          showToast: true,
          toastMsg: "Error updating link, please try again",
          toastSev: "error",
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
          className='absolute top-2 right-2 z-10 bg-gray-600 p-1 flex items-center justify-center rounded-full text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2'
          onClick={handleCloseModal}
        >
          <span className='material-symbols-outlined'>close</span>
        </button>

        {/* Cover Image */}
        {fields.logo && (
          <div className='w-full h-48 relative rounded-t-lg overflow-hidden'>
            <Image
              src={fields.logo}
              alt='cover image'
              layout='fill'
              objectFit='cover'
              className='w-full h-48 border-b-2 border-gray-200'
            />
          </div>
        )}

        {/* Logo */}
        {fields.image && (
          <div className='relative -mt-12 mb-2 flex justify-center'>
            <div className='w-28 h-28 relative rounded-full border-4 border-gray-400 overflow-hidden bg-white'>
              <Image
                src={fields.image}
                alt='logo'
                layout='fill'
                objectFit='cover'
              />
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
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} color='inherit' />
            ) : (
              'Make it So'
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
