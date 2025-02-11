/* eslint-disable @next/next/no-img-element */
"use client";
import { useUser } from "@/utils/hooks/useUser";
import {
  setEditModalOpen,
  updateMember,
} from "@/utils/redux/coreTeam/coreTeam.slice";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Box, Button, IconButton, Modal } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import React, { useState, useCallback, useEffect } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { toast, Toaster } from "sonner";
import { TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";
import InputField from "@/components/elements/InputField";
import { User } from "@prisma/client";
import { setReduxUser } from "@/utils/redux/auth/auth.slice";
import { Spinner } from "@/components/elements/Loaders";

interface IPersonalData {
  phone: string;
  address: string;
  city: string;
  dateOfBirth: Dayjs | null;
}

interface IPayData {
  upiId: string;
  walletAddress: string;
}

const EditUser = () => {
  const { user } = useUser();
  const dispatch = useAppDispatch();
  const isEditModalOpen = useAppSelector(
    (state: RootState) => state.coreTeam.isEditModalOpen
  );
  console.log("user:", user);

  const personalData = (user?.personalData as unknown as IPersonalData) || {};
  const payData = (user?.payData as unknown as IPayData) || {};

  const [basicData, setBasicData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    description: user?.description || "",
    positionTitle: user?.positionTitle || "",
    avatar: user?.avatar || undefined,
    banner: user?.banner || undefined,
  });

  const [userPayData, setUserPayData] = useState({
    upiId: payData.upiId || "",
    walletAddress: payData.walletAddress || "",
  });

  const [userPersonalData, setUserPersonalData] = useState({
    phone: personalData.phone || "",
    address: personalData.address || "",
    city: personalData.city || "",
    dateOfBirth: personalData.dateOfBirth || null,
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [bannerLoading, setBannerLoading] = useState<boolean>(false);

  // File handlers
  const handleFileUpload = async (
    file: File,
    fileType: "avatar" | "banner"
  ) => {
    fileType === "avatar" ? setAvatarLoading(true) : setBannerLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user?.id || "");
    formData.append(
      "folderName",
      fileType === "avatar" ? "userAvatars" : "userBanners"
    );

    try {
      const response = await fetch("/api/upload/file-upload", {
        method: "POST",
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });
      if (!response.ok)
        throw new Error(`Failed to upload ${fileType}: ${response.statusText}`);
      const data = await response.json();
      fileType === "avatar" ? setAvatarLoading(false) : setBannerLoading(false);
      return data.fileInfo[0].fileUrl;
    } catch (error) {
      fileType === "avatar" ? setAvatarLoading(false) : setBannerLoading(false);
      toast.error(`Error uploading ${fileType}`);
      return "";
    }
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "avatar" | "banner"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadedUrl = await handleFileUpload(file, fileType);
    setBasicData((prev) => ({
      ...prev,
      [`${fileType}`]: uploadedUrl,
    }));
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const updatedData = {
      id: user?.id,
      ...basicData,
      payData,
      personalData: {
        ...personalData,
        dateOfBirth: personalData.dateOfBirth ? personalData.dateOfBirth : null,
      },
      updatedAt: user?.updatedAt,
    };

    try {
      const res = await PortalSdk.putData("/api/user", updatedData);
      dispatch(setReduxUser(res.data.user));
      dispatch(updateMember(res.data.user));
      toast.success("User updated successfully");
      // resetForm();
      dispatch(setEditModalOpen(false));
    } catch (error) {
      toast.error("Error updating user info");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Modal
        open={isEditModalOpen}
        onClose={() => dispatch(setEditModalOpen(false))}
        aria-labelledby="edit-user-modal"
        disableEnforceFocus
      >
        <Box
          className="w-full max-w-2xl bg-white rounded-lg fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-lg overflow-y-auto no-scrollbar outline-none max-h-[80vh] max-sm:max-h-[100vh] max-sm:z-9999 max-sm:pb-20"
          sx={{
            // maxHeight: '80vh',
            position: "relative",
            overflowY: "auto",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* Banner */}
          <div className="relative h-[200px] mb-10">
            {bannerLoading ? (
              <div className="absolute w-full h-full object-cover rounded-t-lg bg-gray-300 animate-pulse" />
            ) : (
              <img
                src={basicData.banner || "/images/gradientBanner.jpg"}
                className="absolute w-full h-full object-cover rounded-t-lg"
                alt="Profile Banner"
              />
            )}
            <IconButton
              onClick={() => dispatch(setEditModalOpen(false))}
              className="absolute top-4 left-[92%] bg-white hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-300 max-sm:left-[88%]"
              sx={{ backgroundColor: "white !important" }}
            >
              <span
                className="material-symbols-outlined text-black text-lg transform transition-transform duration-300 hover:rotate-90"
                style={{ fontSize: "20px" }}
              >
                close
              </span>
            </IconButton>
            <label className="absolute bottom-2 right-4 bg-white rounded-full flex items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined bg-white rounded-full p-[6px] cursor-pointe !text-base">
                add_a_photo
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => handleImageChange(e, "banner")}
              />
            </label>

            {/* Avatar */}
            <div className="rounded-full absolute -bottom-14 left-1/2 transform -translate-x-1/2 border-4 w-24 h-24 border-white">
              {avatarLoading ? (
                <div className="object-cover rounded-full w-full h-full bg-white">
                  <div className="rounded-full w-full h-full bg-gray-300 animate-pulse" />
                </div>
              ) : (
                <img
                  src={basicData.avatar || "/icons/placeholderAvatar.svg"}
                  alt="Avatar"
                  className="object-cover rounded-full w-full h-full bg-white"
                />
              )}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-[2px] flex items-center justify-center cursor-pointer">
                <span
                  className="material-symbols-outlined bg-white rounded-full p-[4px]"
                  style={{ fontSize: "16px" }}
                >
                  add_a_photo
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, "avatar")}
                />
              </label>
            </div>
          </div>

          {/* Form */}
          <div className="p-8 pb-0">
            <InputField
              id="name"
              label="Name"
              value={basicData.name}
              onChange={(e) =>
                setBasicData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <InputField
              id="email"
              label="Email"
              type="email"
              value={basicData.email}
              onChange={(e) =>
                setBasicData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <InputField
              id="positionTitle"
              label="Position Title"
              value={basicData.positionTitle}
              onChange={(e) =>
                setBasicData((prev) => ({
                  ...prev,
                  positionTitle: e.target.value,
                }))
              }
            />
            <InputField
              id="description"
              label="Description"
              textarea
              value={basicData.description}
              onChange={(e) =>
                setBasicData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
            <InputField
              id="phone"
              label="Phone"
              value={userPersonalData.phone}
              onChange={(e) =>
                setUserPersonalData((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
            />
            <InputField
              id="address"
              label="Address"
              value={userPersonalData.address}
              onChange={(e) =>
                setUserPersonalData((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
            />
            <div className="flex items-center gap-2 max-sm:flex-col max-sm:mb-4">
              <div className="flex-1 mt-4 max-sm:w-full max-sm:mt-0">
                <InputField
                  id="city"
                  label="City"
                  value={userPersonalData.city}
                  onChange={(e) =>
                    setUserPersonalData((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex-1 max-sm:w-full">
                <label className="block text-sm font-medium mb-1">
                  Date of Birth
                </label>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={dayjs(userPersonalData.dateOfBirth) || ""}
                    onChange={(date) =>
                      setUserPersonalData((prev) => ({
                        ...prev,
                        dateOfBirth: date as Dayjs,
                      }))
                    }
                  />
                </LocalizationProvider>
              </div>
            </div>

            <InputField
              id="upiId"
              label="UPI ID"
              value={userPayData.upiId}
              onChange={(e) =>
                setUserPayData((prev) => ({ ...prev, upiId: e.target.value }))
              }
            />
            <InputField
              id="walletAddress"
              label="Wallet Address"
              value={userPayData.walletAddress}
              onChange={(e) =>
                setUserPayData((prev) => ({
                  ...prev,
                  walletAddress: e.target.value,
                }))
              }
            />
          </div>

          {/* Footer */}
          <div className="p-4 mx-4">
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpdate}
              className="!bg-black hover:!bg-neutral-800"
              sx={{ py: 1, width: "100%" }}
            >
              {isUpdating ? (
                <Spinner className="w-6 h-6  text-green-600" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </Box>
      </Modal>
      <Toaster richColors duration={3000} closeButton position="bottom-right" />
    </>
  );
};

export default EditUser;
