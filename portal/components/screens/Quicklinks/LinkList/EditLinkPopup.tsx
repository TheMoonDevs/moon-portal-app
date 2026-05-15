import { CircularProgress } from '@mui/material';
import { Modal, Tooltip } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { updateQuicklink } from '@/utils/redux/quicklinks/slices/quicklinks.links.slice';
import { setToast } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

import type { FormFields } from './LinkActions';

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
  const [previewImage, setPreviewImage] = useState<{
    image: string | null;
    imageFile: File | null;
    logoFile: File | null;
    logo: string | null;
  }>({ image: '', logo: '', imageFile: null, logoFile: null });
  const dispatch = useAppDispatch();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (type === 'image' && imageInputRef.current) {
        setPreviewImage({
          ...previewImage,
          image: URL.createObjectURL(file),
          imageFile: file,
        });
      } else if (type === 'logo') {
        setPreviewImage({
          ...previewImage,
          logo: URL.createObjectURL(file),
          logoFile: file,
        });
      }
    }
  };

  // const handleFileUpload = async (file: File, type: string) => {
  //   try {
  //     if (type === "image") setImageLoading(true);
  //     if (type === "logo") setLogoLoading(true);
  //     const formData = new FormData();
  //     formData.append("file", file);

  //     const response = await fetch("/api/quicklinks/link/upload-img", {
  //       method: "POST",
  //       body: formData,
  //     });
  //     const data = await response.json();

  //     if (response.ok) {
  //       if (type === "image") {
  //         setFields({ ...fields, image: data.fileInfo.fileUrl });
  //       } else if (type === "logo") {
  //         setFields({ ...fields, logo: data.fileInfo.fileUrl });
  //       }
  //     } else {
  //       console.error("Failed to upload file:", data.message);
  //     }
  //   } catch (error) {
  //     console.error("Error uploading file:", error);
  //   } finally {
  //     if (type === "image") setImageLoading(false);
  //     if (type === "logo") setLogoLoading(false);
  //   }
  // };

  const handleFileUpload = async (file: File, type: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/quicklinks/link/upload-img', {
        method: 'POST',
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });
      const data = await response.json();

      if (response.ok) {
        return data.fileInfo.fileUrl;
      } else {
        console.error('Failed to upload file:', data.message);
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);

      const imageUploadUrl = previewImage.imageFile
        ? await handleFileUpload(previewImage.imageFile, 'image')
        : fields.image;

      const logoUploadUrl = previewImage.logoFile
        ? await handleFileUpload(previewImage.logoFile, 'logo')
        : fields.logo;

      const response = await QuicklinksSdk.updateData(`/api/quicklinks/link`, {
        linkId: fields.id,
        updateQuery: {
          title: fields.title,
          description: fields.description,
          url: fields.url,
          logo: logoUploadUrl,
          image: imageUploadUrl,
        },
      });
      // console.log(response);
      dispatch(
        setToast({
          showToast: true,
          toastMsg: 'Link updated!',
          toastSev: 'success',
        }),
      );
      const updatedLink = response.data.link;
      setFields(updatedLink);
      dispatch(updateQuicklink(updatedLink));
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
        }),
      );
    }
  };

  return (
    <Modal
      open={isModalOpen || loading}
      onClose={() => {
        if (!loading) {
          handleCloseModal();
          setPreviewImage({
            image: null,
            logo: null,
            imageFile: null,
            logoFile: null,
          });
        }
      }}
      aria-labelledby="edit-link-modal"
      aria-describedby="modal-modal-description"
      className="!max-sm:w-[90%]"
    >
      <div className="relative mx-auto my-12 max-w-md rounded-lg border border-gray-200 bg-white shadow-xl outline-none">
        <button
          className="absolute -right-3 -top-3 z-10 flex items-center justify-center rounded-full border-2 border-gray-300 bg-gray-200 px-1 text-gray-500 hover:bg-gray-100 focus:outline-none"
          onClick={handleCloseModal}
        >
          <span className="material-symbols-outlined !text-base">close</span>
        </button>

        <input
          type="file"
          ref={imageInputRef}
          className="hidden"
          onChange={(e) => handleFileChange(e, 'image')}
        />
        <input
          type="file"
          ref={logoInputRef}
          className="hidden"
          onChange={(e) => handleFileChange(e, 'logo')}
        />

        {/* Cover Image */}

        <div
          className="group relative h-48 w-full cursor-pointer overflow-hidden rounded-t-lg"
          onClick={() => imageInputRef.current?.click()}
        >
          <Image
            src={previewImage.image || fields.image || '/logo/logo.png'}
            alt="cover image"
            layout="fill"
            objectFit="cover"
            className={`h-48 w-full border-b-2 border-gray-200 object-cover ${
              imageLoading ? 'blur-[2px]' : ''
            }`}
          />
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <CircularProgress sx={{ color: 'whitesmoke' }} />
            </div>
          )}
          <Tooltip title="Edit Profile Image">
            <div className="absolute left-2 top-2 hidden h-auto w-2 cursor-pointer items-center justify-center gap-1 rounded-full border-2 border-gray-400 bg-gray-200 bg-opacity-80 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-200 hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 group-hover:flex">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px' }}
              >
                edit
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Logo */}

        <div className="relative mb-2 flex justify-center">
          <div
            className="relative -mt-12 size-28 cursor-pointer rounded-full border-4 border-black bg-white"
            onClick={() => logoInputRef.current?.click()}
          >
            <Image
              src={previewImage.logo || fields.logo || '/logo/logo.png'}
              alt="logo"
              layout="fill"
              objectFit="cover"
              className={`rounded-full p-1 ${logoLoading ? 'blur-[2px]' : ''}`}
            />
            {logoLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50">
                <CircularProgress sx={{ color: 'whitesmoke' }} />
              </div>
            )}
            <Tooltip title="Edit Logo">
              <div className="absolute bottom-2 right-0 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-gray-600 bg-gray-200 p-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '15px' }}
                >
                  edit
                </span>
              </div>
            </Tooltip>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={fields.title}
              onChange={(e) => setFields({ ...fields, title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              value={fields.description}
              onChange={(e) =>
                setFields({ ...fields, description: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700"
              >
                URL
              </label>
              <Link
                href={fields.url}
                className="flex items-center justify-center gap-1 text-xs text-gray-500"
                target="_blank"
              >
                Visit Link
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '12px' }}
                >
                  open_in_new
                </span>
              </Link>
            </div>
            <input
              id="url"
              type="text"
              value={fields.url}
              onChange={(e) => setFields({ ...fields, url: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <>
                <span className="material-symbols-outlined !text-base">
                  task_alt
                </span>{' '}
                Save
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
