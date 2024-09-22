/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Drawer, Box, Fab, IconButton, useMediaQuery } from "@mui/material";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { useUser } from "@/utils/hooks/useUser";
import { User, USERROLE, USERVERTICAL, WorkLogs } from "@prisma/client";
import Link from "next/link";
import { updateAvatarUrl } from "@/utils/redux/onboarding/onboarding.slice";
import {
  closeDrawer,
  openDrawer,
  selectMember,
  updateMember,
  setEditModalOpen,
} from "@/utils/redux/coreTeam/coreTeam.slice";
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
import { APP_ROUTES, TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";
import { setReduxUser } from "@/utils/redux/auth/auth.slice";
import media from "@/styles/media";
import DrawerComponent from "@/components/elements/DrawerComponent";
import dayjs from "dayjs";
import { ArrayHelper } from "@/utils/helpers/array";
import Image from "next/image";
import ToolTip from "@/components/elements/ToolTip";
import ReactActivityCalendar from "./ActivityCalendar";
import EditUser from "./EditUser";

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

const roleImageMap: Record<USERROLE, string> = {
  CORETEAM: "/images/status/coreteam.jpeg",
  ASSOCIATE: "/images/status/associate.jpeg",
  FREELANCER: "/images/status/freelancer.jpeg",
  INTERN: "/images/status/intern.jpeg",
  TRIAL_CANDIDATE: "/images/status/trial.jpeg",
};

const verticalImageMap: Record<USERVERTICAL, string> = {
  DEV: "/images/roles/developer.jpeg",
  DESIGN: "/images/roles/Designer.jpeg",
  MARKETING: "/images/roles/marketing.jpeg",
  COMMUNITY: "/images/roles/community.jpeg",
  FINANCE: "/images/roles/finance.jpeg",
  LEGAL: "/images/roles/legal.jpeg",
  HR: "/images/roles/hr.jpeg",
  OPERATIONS: "/images/roles/operations.jpeg",
};

const getUserRoleImage = (role: USERROLE | null) =>
  role ? roleImageMap[role] || "/images/default.jpeg" : "/images/default.jpeg";

const getUserVerticalImage = (vertical: USERVERTICAL | null) =>
  vertical
    ? verticalImageMap[vertical] || "/images/default.jpeg"
    : "/images/default.jpeg";

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

const truncateAddress = (
  address: string | undefined,
  visibleChars: number = 4
): string => {
  if (!address) return "Not Available";
  if (address.length <= visibleChars * 2) return address;
  return `${address.slice(0, visibleChars)}...${address.slice(-visibleChars)}`;
};

export const UserProfileDrawer: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(
    (state: RootState) => state.coreTeam.isDrawerOpen
  );
  const selectedUser = useAppSelector(
    (state: RootState) => state.coreTeam.selectedMember
  );
  const isMobile = useMediaQuery(media.largeMobile);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [bannerLoading, setBannerLoading] = useState<boolean>(false);
  const loggedinUser = useUser() as LoggedInUser;
  const payData = loggedinUser?.user?.payData as PayData;
  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const { loading, setLoading } = useAsyncState();
  const handleClose = () => {
    dispatch(closeDrawer());
  };

  const fetchWorklogData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await PortalSdk.getData(
        `/api/user/worklogs/summary?userId=${
          selectedUser?.id
        }&year=${dayjs().year()}&month=${dayjs()
          .month(dayjs().month())
          .format("MM")}`,
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

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "avatar" | "banner"
  ) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      dispatch(addFilesToPreview([file as FileWithPath]));
      uploadFile(file as FileWithPath, fileType);
    }
  };

  const uploadFile = async (
    file: FileWithPath,
    fileType: "avatar" | "banner"
  ) => {
    fileType === "avatar" ? setAvatarLoading(true) : setBannerLoading(true);
    const formData = new FormData();
    formData.append("file", file, file.path);
    if (loggedinUser) {
      formData.append("userId", loggedinUser.user.id);
    }
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

      if (response.ok) {
        const data = await response.json();
        const userResponse = await PortalSdk.putData("/api/user", {
          id: loggedinUser.user.id,
          [fileType]: data.fileInfo[0].fileUrl,
        });

        console.log(userResponse);
        dispatch(setReduxUser(userResponse?.data?.user));
        dispatch(
          updateMember({
            ...selectedUser,
            [fileType]: data.fileInfo[0].fileUrl,
          })
        );
        setUploadedFiles([data.fileInfo]);
      } else {
        fileType === "avatar"
          ? setAvatarLoading(false)
          : setBannerLoading(false);
        console.error("Failed to upload file:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      fileType === "avatar" ? setAvatarLoading(false) : setBannerLoading(false);
    } finally {
      fileType === "avatar" ? setAvatarLoading(false) : setBannerLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    handleFileChange(event, "avatar");

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    handleFileChange(event, "banner");

  return (
    <>
      <DrawerComponent isOpen={isOpen} handleClose={handleClose}>
        <div className="h-[120px] relative">
          {bannerLoading ? (
            <div className="w-full h-full bg-gray-300 animate-pulse" />
          ) : (
            <img
              src={selectedUser?.banner || "/images/gradientBanner.jpg"}
              className="absolute w-full h-full object-cover"
              alt="Profile Banner"
            />
          )}
          {loggedinUser.user.id === selectedUser?.id && (
            <label className="absolute top-2 -right-2 bg-white rounded-full flex items-center justify-center cursor-pointer">
              <span
                className="material-symbols-outlined absolute top-0 right-2 bg-white rounded-full p-[6px] cursor-pointer"
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
            {avatarLoading ? (
              <div className="bg-white rounded-full">
                <div className="rounded-full w-24 h-24 bg-gray-300 animate-pulse" />
              </div>
            ) : (
              <img
                src={selectedUser?.avatar || "/icons/placeholderAvatar.svg"}
                alt={selectedUser?.name?.charAt(0) || ""}
                className="object-cover rounded-full w-full h-full bg-white"
              />
            )}

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
                  onChange={handleAvatarChange}
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
          <p className="text-sm py-1 text-gray-700">
            @{selectedUser?.username + selectedUser?.password}{" "}
            {selectedUser.positionTitle && `- ${selectedUser.positionTitle}`}
          </p>
          <div className="flex gap-4 py-2 w-full">
            <Link
              href={`${APP_ROUTES.userWorklogSummary}/${selectedUser?.id}`}
              target="_blank"
              className="bg-black text-white px-4 py-2 rounded-lg text-sm flex justify-center gap-2 items-center hover:bg-gray-800 transition duration-300 border border-gray-300 flex-grow shadow-md"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px" }}
              >
                work_history
              </span>
              Worklogs
            </Link>
            <Link
              href={`https://slack.com/app_redirect?channel=${selectedUser?.slackId}`}
              target="_parent"
              className="text-black px-4 py-2 rounded-lg text-sm flex gap-2 items-center justify-center hover:bg-gray-200 transition duration-300 border border-gray-300 flex-grow shadow-md"
            >
              <Image
                src="/images/thirdparty/slack-new.svg"
                alt="slack"
                width={16}
                height={16}
              />
              Message
            </Link>
            {loggedinUser.user.id === selectedUser?.id && (
              <ToolTip title="Edit Profile">
                <button
                  className="text-black border p-2 rounded-lg border-gray-300 flex items-center justify-center gap-2 hover:bg-gray-200 transition duration-300 flex-grow-0 w-auto shadow-md"
                  onClick={() => {
                    dispatch(setEditModalOpen(true));
                    dispatch(closeDrawer());
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px" }}
                  >
                    edit_square
                  </span>
                </button>
              </ToolTip>
            )}
          </div>
          {selectedUser?.description && (
            <>
              <h6 className="font-bold py-2">
                About {selectedUser?.name || "User"}
              </h6>
              <p className="text-sm pb-4">
                {selectedUser?.description || "Description not available."}
              </p>
            </>
          )}
          <h6 className="font-bold py-2"> Profile</h6>
          <div className="flex gap-6 pb-4 items-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 shadow-lg">
                <img
                  src={getUserVerticalImage(selectedUser?.vertical)}
                  alt="user-vertical"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 text-center text-xs font-bold capitalize">
                {translateUserVertical(selectedUser?.vertical || "")}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 shadow-lg">
                <img
                  src={getUserRoleImage(selectedUser?.role)}
                  alt="user-role"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 text-center text-xs font-bold capitalize">
                {selectedUser?.role?.toLowerCase()}
              </div>
            </div>
          </div>

          {/* <div className="py-4">
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
        </div> */}
          {/* <div className="pb-4">
          <h6 className="font-bold pb-2">Missions/Task</h6>
          <ul className="flex flex-col gap-1 p-3 border-2 mt-1 border-gray-300 rounded-xl list-none">
            <li className="flex items-center pl-5 relative before:content-["•"] before:absolute before:left-0 before:text-gray-500 text-sm">
              Task 1 or mission 1
            </li>
            <li className="flex items-center pl-5 relative before:content-["•"] before:absolute before:left-0 before:text-gray-500 text-sm">
              Task 2 or mission 2
            </li>
            <li className="flex items-center pl-5 relative before:content-["•"] before:absolute before:left-0 before:text-gray-500 text-sm">
              Task 3 or mission 3
            </li>
          </ul>
        </div> */}
          {loggedinUser.user.id === selectedUser?.id && (
            <div className="flex flex-col gap-1 pb-4">
              <h6 className="font-bold pb-2">Payment Details</h6>
              <div className="relative flex flex-col gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg shadow-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-white pb-2 mb-2">
                  <span className="material-symbols-outlined text-2xl">
                    account_balance_wallet
                  </span>
                  <p className="text-sm font-bold">
                    UPI ID:{" "}
                    <span className="font-normal">
                      {payData?.upiId || "N/A"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-between border-b border-white pb-2 mb-2">
                  <span className="material-symbols-outlined text-2xl">
                    account_balance
                  </span>
                  <p className="text-sm font-bold">
                    Wallet Address:{" "}
                    <span className="font-normal">
                      {truncateAddress(payData?.walletAddress) || "N/A"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-2xl">
                    attach_money
                  </span>
                  <p className="text-sm font-bold">
                    Pay Out:{" "}
                    <span className="font-normal">
                      {payData?.stipendAmount || "N/A"}{" "}
                      {payData?.stipendCurrency || ""}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="w-full">
            <h6 className="font-bold pb-2">
              Contributions ({dayjs().format("MMM YYYY")})
            </h6>
            <ReactActivityCalendar
              worklogSummary={worklogSummary}
              loading={loading}
            />
          </div>

          {!loading ? (
            <div className="flex gap-1 flex-col">
              <h6 className="font-bold pb-2">Last worked on</h6>
              <div className="h-[310px] relative overflow-y-hidden">
                <div className="bottom-8 h-full overflow-y-scroll">
                  <WorklogSummaryView
                    workLogUser={selectedUser}
                    worklogSummary={ArrayHelper.reverseSortByDate(
                      worklogSummary,
                      "date"
                    ).slice(0, 5)}
                    isDrawer={true}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-transparent to-white flex flex-col justify-end">
                    <p className="font-semibold text-xs text-neutral-500 text-center p-2"></p>
                  </div>
                </div>
                {/* <Link
                href={`${APP_ROUTES.userWorklogSummary}/${selectedUser?.id}`}
                className="absolute bottom-2 right-2 bg-white rounded-md border-gray-300 border-2 py-1 px-2 text-sm hover:bg-gray-200 transition duration-300"
              >
                View Full Summary
              </Link> */}
              </div>
            </div>
          ) : (
            <LoadingSkeleton />
          )}
        </div>
      </DrawerComponent>
      <EditUser />
    </>
  );
};
