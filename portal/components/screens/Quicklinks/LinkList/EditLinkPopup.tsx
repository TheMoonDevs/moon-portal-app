import { CircularProgress } from "@mui/material";
import { useRef, useState } from "react";
import { Modal, Tooltip } from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { FormFields } from "./LinkActions";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  setAllQuicklinks,
  setToast,
  updateQuicklink,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";

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
  }>({ image: "", logo: "", imageFile: null, logoFile: null });
  const dispatch = useAppDispatch();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (type === "image" && imageInputRef.current) {
        setPreviewImage({
          ...previewImage,
          image: URL.createObjectURL(file),
          imageFile: file,
        });
      } else if (type === "logo") {
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
      formData.append("file", file);

      const response = await fetch("/api/quicklinks/link/upload-img", {
        method: "POST",
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });
      const data = await response.json();

      if (response.ok) {
        return data.fileInfo.fileUrl;
      } else {
        console.error("Failed to upload file:", data.message);
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);

      const imageUploadUrl = previewImage.imageFile
        ? await handleFileUpload(previewImage.imageFile, "image")
        : fields.image;

      const logoUploadUrl = previewImage.logoFile
        ? await handleFileUpload(previewImage.logoFile, "logo")
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
          toastMsg: "Link updated!",
          toastSev: "success",
        })
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
          toastMsg: "Error updating link, please try again",
          toastSev: "error",
        })
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
    >
      <div className="relative bg-white rounded-lg shadow-xl max-w-md mx-auto my-12 border border-gray-200 outline-none">
        <button
          className="absolute -top-3 -right-3 z-10 border-2 border-gray-300  px-1  flex items-center justify-center rounded-full text-gray-500 focus:outline-none  bg-gray-200 hover:bg-gray-100"
          onClick={handleCloseModal}
        >
          <span className="material-symbols-outlined !text-base">close</span>
        </button>

        <input
          type="file"
          ref={imageInputRef}
          className="hidden"
          onChange={(e) => handleFileChange(e, "image")}
        />
        <input
          type="file"
          ref={logoInputRef}
          className="hidden"
          onChange={(e) => handleFileChange(e, "logo")}
        />

        {/* Cover Image */}
        {(fields.image || previewImage.image) && (
          <div
            className="w-full h-48 relative rounded-t-lg overflow-hidden cursor-pointer group"
            onClick={() => imageInputRef.current?.click()}
          >
            <Image
              src={previewImage.image || fields.image}
              alt="cover image"
              layout="fill"
              objectFit="cover"
              className={`w-full h-48 border-b-2 object-cover border-gray-200 ${
                imageLoading ? "blur-[2px]" : ""
              }`}
            />
            {imageLoading && (
              <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <CircularProgress sx={{ color: "whitesmoke" }} />
              </div>
            )}
            <Tooltip title="Edit Profile Image">
              <div
                className="group-hover:flex hidden absolute top-2 left-2 w-2 h-auto cursor-pointer  justify-center items-center gap-1 py-2 px-4 shadow-sm text-sm font-medium text-gray-600 border-2 border-gray-400
              bg-opacity-80 hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black hover:bg-gray-200 bg-gray-200 rounded-full"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  edit
                </span>
              </div>
            </Tooltip>
          </div>
        )}

        {/* Logo */}
        {(fields.logo || previewImage.logo) && (
          <div className="relative mb-2 flex justify-center">
            <div
              className="w-28 h-28 -mt-12  relative rounded-full border-4 border-black bg-white cursor-pointer "
              onClick={() => logoInputRef.current?.click()}
            >
              <Image
                src={previewImage.logo || fields.logo}
                alt="logo"
                layout="fill"
                objectFit="cover"
                className={`rounded-full p-1 ${
                  logoLoading ? "blur-[2px]" : ""
                }`}
              />
              {logoLoading && (
                <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 rounded-full">
                  <CircularProgress sx={{ color: "whitesmoke" }} />
                </div>
              )}
              <Tooltip title="Edit Logo">
                <div className="w-7 h-7 absolute bottom-2 right-0 z-10 p-1 flex items-center justify-center rounded-full text-gray-600  focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 cursor-pointer border-[2px] border-gray-600 bg-gray-200  ">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "15px" }}
                  >
                    edit
                  </span>
                </div>
              </Tooltip>
            </div>
          </div>
        )}

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
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
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
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700"
              >
                URL
              </label>
              <Link
                href={fields.url}
                className="text-xs text-gray-500 flex justify-center items-center gap-1"
                target="_blank"
              >
                Visit Link
                <span
                  className="material-symbols-outlined "
                  style={{ fontSize: "12px" }}
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
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <>
                <span className="material-symbols-outlined !text-base">
                  task_alt
                </span>{" "}
                Save
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
