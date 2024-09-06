import {
  ICertificate,
  updateCertificateData,
} from "@/utils/redux/cerificatesUpload/certificate.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import UserSelect from "./UserSelect";
import { User } from "@prisma/client";
import {
  MyServerApi,
  PORTAL_SERVER,
  PORTAL_SERVER_API_URL,
} from "@/utils/service/MyServerApi";

interface EditCertificateModalProps {
  isOpen: boolean;
  certificateToEdit: ICertificate | null;
  onCancel: () => void;
}

const EditCertificateModal: React.FC<EditCertificateModalProps> = ({
  isOpen,
  certificateToEdit,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [updatedCertificate, setUpdatedCertificate] =
    useState<ICertificate | null>(certificateToEdit ? certificateToEdit : null);
  const { users } = useAppSelector((state) => state.certificatesUpload);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (certificateToEdit) {
      setUpdatedCertificate(certificateToEdit);
    }
  }, [certificateToEdit]);
  const handleSelectedUser = (user: User | null) => {
    if (user && updatedCertificate)
      setUpdatedCertificate({
        ...updatedCertificate,
        userId: user.id,
        userInfo: user,
      });
  };
  const handleEditCertificate = async (e: any) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      const response = await fetch(
        `${PORTAL_SERVER_API_URL}/upload/certificate-upload`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            [PORTAL_SERVER.headerField]: PORTAL_SERVER.apiKey,
          },
          body: JSON.stringify({
            certificate: updatedCertificate,
            deleteCertificateFromPrevId:
              certificateToEdit?.userId !== updatedCertificate?.userId
                ? certificateToEdit?.userId
                : null,
          }),
        }
      );
      dispatch(updateCertificateData(updatedCertificate as ICertificate));
      setIsLoading(false);
      onCancel();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;

  return (
    certificateToEdit && (
      <div className="fixed z-10 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen ">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={onCancel}
          ></div>
          <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-1/2 flex flex-col gap-6">
            <div>
              <label htmlFor="title">Certificate Name</label>
              <input
                type="text"
                placeholder="Certificate Name"
                name="title"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 "
                value={updatedCertificate?.title}
                onChange={(e) => {
                  if (updatedCertificate)
                    setUpdatedCertificate({
                      ...updatedCertificate,
                      title: e.target.value,
                    });
                }}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">
                Certificate File
              </label>
              <p className="text-wrap w-1/2 block">
                <a
                  href={updatedCertificate?.file.fileUrl}
                  className="text-wrap w-1/3 block text-blue-500 hover:underline"
                >
                  {updatedCertificate?.file.fileUrl.substring(0, 80) + "..."}
                </a>
              </p>
            </div>
            <UserSelect
              users={users}
              selectedUser={updatedCertificate?.userInfo?.name}
              handleSelectedUser={handleSelectedUser}
              placeholder={
                updatedCertificate?.userInfo?.name
                  ? updatedCertificate?.userInfo?.name
                  : "Select User"
              }
            />
            <div className="flex justify-end">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded mr-2 flex justify-center items-center gap-2"
                onClick={handleEditCertificate}
              >
                {isLoading && <CircularProgress size={16} />}
                Save
              </button>
              <button
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default EditCertificateModal;
