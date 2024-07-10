/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Drawer, Box } from "@mui/material";
import { closeSlideIn, updateSelectedUser } from "@/utils/redux/userProfileDrawer/userProfileDrawer.slice";
import { RootState } from "@/utils/redux/store";
import { useUser } from "@/utils/hooks/useUser";
import { User, WorkLogs } from "@prisma/client";
import Link from "next/link";
import { updateAvatarUrl } from "@/utils/redux/onboarding/onboarding.slice";
import {
  addFilesToPreview,
  resetPreview,
  setUploadedFiles,
} from "@/utils/redux/filesUpload/fileUpload.slice";
import { FileWithPath } from "@mantine/dropzone";
import { WorklogSummaryView } from "../Worklogs/WorklogSummary/WorklogSummaryView";
import { PortalSdk } from "@/utils/services/PortalSdk";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { LoadingSkeleton } from "@/components/elements/LoadingSkeleton";
import { APP_ROUTES } from "@/utils/constants/appInfo";

interface LoggedInUser {
  user: User;
}

export interface PayData {
  walletAddress?: string;
  upiId?: string;
  stipendAmount?: string;
  stipendCurrency?: string;
  payMethod?: string;
  stipendWalletAddress?: string;
}

export const UserProfileDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector(
    (state: RootState) => state.userProfileDrawer.isDrawerOpen
  );
  const selectedUser = useSelector(
    (state: RootState) => state.userProfileDrawer.selectedUser
  );
  const loggedinUser = useUser() as LoggedInUser;
  const payData = loggedinUser?.user?.payData as PayData;
  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const { loading, setLoading } = useAsyncState();

  const handleClose = () => {
    dispatch(closeSlideIn());
  };

  const fetchWorklogData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await PortalSdk.getData(
        `/api/user/worklogs/summary?userId=${selectedUser?.id}`,
        null
      );
      setWorklogSummary(response.data.workLogs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, selectedUser?.id]);

  useEffect(() => {
    if (isOpen && selectedUser) {
      fetchWorklogData();
    }
  }, [fetchWorklogData, isOpen, selectedUser]);

  if (!selectedUser) return null;

  const translateUserVertical = (vertical: string): string => {
    const verticalMap: { [key: string]: string } = {
      DEV: "Developer",
      DESIGN: "Designer",
      MARKETING: "Marketing",
      COMMUNITY: "Community Manager",
      FINANCE: "Finance Specialist",
      LEGAL: "Legal Specialist",
      HR: "Human Resources",
      OPERATIONS: "Operations",
    };
    return verticalMap[vertical] || "Unknown Vertical";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      dispatch(addFilesToPreview([file as FileWithPath]));
      UploadAvatar(file as FileWithPath);
    }
  };

  
  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      dispatch(addFilesToPreview([file as FileWithPath]));
      UploadBanner(file as FileWithPath);
    }
  };

  const truncateAddress = (
    address: string | undefined,
    visibleChars: number = 4
  ): string => {
    if (!address) return "Not Available";
    if (address.length <= visibleChars * 2) return address;
    return `${address.slice(0, visibleChars)}...${address.slice(
      -visibleChars
    )}`;
  };

  const UploadAvatar = async (file: FileWithPath) => {
    const formData = new FormData();
    formData.append("file", file, file.path);
    if (loggedinUser) {
      formData.append("userId", loggedinUser.user.id);
    }
    formData.append("folderName", "userAvatars");
    try {
      const response = await fetch("/api/upload/file-upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const userResponse = await PortalSdk.putData("/api/user", {
          ...loggedinUser.user, 
          avatar: data.fileInfo[0].fileUrl,
        })
        console.log(userResponse);
        
        dispatch(updateSelectedUser({
          ...selectedUser,
          avatar: data.fileInfo[0].fileUrl,
        }));
        setUploadedFiles([data.fileInfo]);


      } else {
        console.error("Failed to upload file:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const UploadBanner = async (file: FileWithPath) => {
    const formData = new FormData();
    formData.append("file", file, file.path);
    if (loggedinUser) {
      formData.append("userId", loggedinUser.user.id);
    }
    formData.append("folderName", "userBanners");
    try {
      const response = await fetch("/api/upload/file-upload", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        const userResponse = await PortalSdk.putData("/api/user", {
          ...loggedinUser.user, 
          banner: data.fileInfo[0].fileUrl,
        })
        dispatch(updateSelectedUser({
          ...selectedUser,
          banner: data.fileInfo[0].fileUrl,
        }));
        setUploadedFiles([data.fileInfo]);
      } else {
        console.error("Failed to upload file:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };


  return (
    <Drawer anchor="right" open={isOpen} onClose={handleClose}>
      <Box
        sx={{
          width: 400,
          height: "100%",
          overflowX: "hidden",
          overflowY: "scroll",
        }}
        role="presentation"
      >
        <div className="h-[120px] relative">
          <img
            src={selectedUser?.banner || "/images/gradientBanner.jpg"}
            className="absolute w-full h-full object-cover"
            alt="Profile Banner"
          />
          {loggedinUser.user.id === selectedUser?.id && (
            <label className="absolute top-2 -right-2 bg-white rounded-full flex items-center justify-center cursor-pointer">
              <span
              className="material-symbols-outlined absolute top-2 right-2 bg-white rounded-full p-[6px] cursor-pointer"
              style={{ fontSize: "16px" }}
            >
              add_a_photo 
            </span>
            <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleBannerChange}
                  className="hidden"
                />
            </label>
          )}
          <div className="rounded-full absolute -bottom-[3.25rem] left-5 border-4 w-24 h-24 border-white">
            <img
              src={selectedUser?.avatar || "/icons/placeholderAvatar.svg"}
              alt={selectedUser?.name || ""}
              className="object-center rounded-full w-full h-full bg-white"
            />
            {loggedinUser.user.id === selectedUser?.id && (
              <label className="absolute top-2 -right-2 bg-white rounded-full p-[2px] flex items-center justify-center cursor-pointer">
                <span
                  className="material-symbols-outlined bg-white rounded-full p-[4px]"
                  style={{ fontSize: "16px" }}
                >
                  add_a_photo
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
        <div className="flex flex-col px-5 pb-2">
          <div className="flex pt-16 justify-between items-center">
            <h3 className="font-bold text-2xl">{selectedUser?.name}</h3>
            <p className="text-sm text-gray-500 font-semibold capitalize">
              {selectedUser?.timezone}
            </p>
          </div>
          <p className="text-sm py-1">
            @{selectedUser?.username + selectedUser?.password}{" "}
          </p>
          <div className="flex gap-3 text-black font-bold text-xs py-2">
            <div className="rounded-md border-2 border-gray-300 px-2 py-1 capitalize">
              {translateUserVertical(selectedUser?.vertical || "")}
            </div>
            <div className="rounded-md border-2 border-gray-300 px-2 py-1 capitalize">
              {selectedUser?.userType?.toLowerCase()}
            </div>
            <div className="rounded-md border-2 border-gray-300 px-2 py-1 capitalize">
              {selectedUser?.role?.toLowerCase()}
            </div>
          </div>
          <div className="flex gap-4 py-2">
            <Link
              href={`https://slack.com/app_redirect?channel=${selectedUser?.slackId}`}
              target="_blank"
              className="bg-black text-white px-3 py-2 rounded-lg text-sm flex gap-2 items-center hover:bg-gray-800 transition duration-300"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px" }}
              >
                chat
              </span>
              Message
            </Link>
            {loggedinUser.user.id === selectedUser?.id && (
              <button className="text-black border px-3 py-2 rounded-lg border-gray-300 flex items-center gap-2 hover:bg-gray-200 transition duration-300">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
                >
                  edit_square
                </span>
                Edit Profile
              </button>
            )}
          </div>
          <p className="text-sm py-4 ">
            {selectedUser?.description ||
              "This is the Seleted user's description or bio that will be displayed here and every user will have a unique bio or description that will show off their personality and their work."}
          </p>
          {!loading ? (
            <div className="flex gap-1 flex-col">
              <h6 className="font-bold pb-2">Worklogs</h6>
              <div className="border-2 border-gray-300 rounded-xl h-[310px] relative p-3 overflow-y-hidden">
                <div className="bottom-8 px-2 h-full overflow-hidden">
                  <WorklogSummaryView
                    worklogSummary={worklogSummary.slice(0, 5)}
                  />
                </div>
                <Link
                  href={`${APP_ROUTES.userWorklogSummary}/${selectedUser?.id}`}
                  className="absolute bottom-2 right-2 bg-white rounded-md border-gray-300 border-2 py-1 px-2 text-sm hover:bg-gray-200 transition duration-300"
                >
                  View Full Summary
                </Link>
              </div>
            </div>
          ) : (
            <LoadingSkeleton /> 
          )}
          <div className="py-4">
            <h6 className="font-bold pb-2">Engagements</h6>
            <ul className="flex flex-col gap-3 pt-2">
              <li className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 border-gray-300 border-2 rounded-xl flex font-bold items-center justify-center">
                  1
                </div>
                This is the First Engagement
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 border-gray-300 border-2 rounded-xl flex items-center justify-center font-bold">
                  2
                </div>
                This is the Second Engagement
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 border-gray-300 border-2 rounded-xl flex items-center justify-center font-bold">
                  3
                </div>
                This is the Third Engagement
              </li>
            </ul>
          </div>
          <div className="pb-4">
            <h6 className="font-bold pb-2">Missions/Task</h6>
            <ul className="flex flex-col gap-1 p-3 border-2 mt-1 border-gray-300 rounded-xl list-none">
              <li className="flex items-center pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500 text-sm">
                Task 1 or mission 1
              </li>
              <li className="flex items-center pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500 text-sm">
                Task 2 or mission 2
              </li>
              <li className="flex items-center pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500 text-sm">
                Task 3 or mission 3
              </li>
            </ul>
          </div>
          {loggedinUser.user.id === selectedUser?.id && (
            <div className="flex flex-col gap-1 pb-4">
              <h6 className="font-bold pb-2">Payment Details</h6>
              <div className="flex flex-col gap-3 border-2 border-gray-300 rounded-xl p-4 shadow-lg bg-white">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-600">
                    account_balance_wallet
                  </span>
                  <p className="text-sm font-bold text-gray-700">
                    UPI ID:{" "}
                    <span className="text-gray-900">
                      {payData?.upiId || "No UPI Available"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-600">
                    account_balance
                  </span>
                  <p className="text-sm font-bold text-gray-700">
                    Wallet Address:{" "}
                    <span className="text-gray-900">
                      {truncateAddress(payData?.walletAddress) ||
                        "Not Available"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-600">
                    attach_money
                  </span>
                  <p className="text-sm font-bold text-gray-700">
                    Pay Out:{" "}
                    <span className="text-gray-900">
                      {payData?.stipendAmount || "Not Available"}{" "}
                      {payData?.stipendCurrency || ""}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Box>
    </Drawer>
  );
};
