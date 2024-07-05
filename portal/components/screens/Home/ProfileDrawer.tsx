/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Drawer, Box, Typography } from "@mui/material";
import { Pencil, CameraIcon, MessageCircle } from "lucide-react";
import { closeSlideIn } from "@/utils/redux/userProfileDrawer/userProfileDrawer.slice";
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
import dayjs from "dayjs";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { LoadingSkeleton } from "@/components/elements/LoadingSkeleton";

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
  const payData = JSON.stringify(loggedinUser.user.payData) as PayData;

  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const year = dayjs().year();
  let month = dayjs().month(dayjs().month()).format("MM");

  const { loading, setLoading } = useAsyncState();

  const handleClose = () => {
    dispatch(closeSlideIn());
  };

  const fetchWorklogData = useCallback(
    async (query: {
      year: string | number | undefined | null;
      month?: string | number | undefined | null;
    }) => {
      setLoading(true);
      try {
        const response = await PortalSdk.getData(
          `/api/user/worklogs/summary?userId=${selectedUser?.id}&year=${query.year}&month=${query.month}`,
          null
        );
        setWorklogSummary(response.data.workLogs);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    },
    [setLoading, selectedUser?.id]
  );

  useEffect(() => {
    fetchWorklogData({ year, month });
    // console.log(worklogSummary.map((wl) => wl.works));
  }, [fetchWorklogData, month, year]);

  if (!selectedUser) return null;

  // to translate the vertical of the user
  function translateUserVertical(vertical: string): string {
    const verticalMap: { [key in string]: string } = {
      DEV: "Developer",
      DESIGN: "Designer",
      MARKETING: "Marketing",
      COMMUNITY: "Community Manager",
      FINANCE: "Finance Specialist",
      LEGAL: "Finance Specialist",
      HR: "Human Resources",
      OPERATIONS: "Operations",
    };
    return verticalMap[vertical] || "Unknown Vertical";
  }

  // for slack redirect to conversation
  const openSlackConversation = () => {
    const slackUrl = `https://slack.com/app_redirect?channel=${selectedUser.slackId}`;
    window.open(slackUrl, "_blank");
  };

  // for uploading the avatar
  const UploadAvatar = async (file: FileWithPath) => {
    const formData = new FormData();

    formData.append("file", file, file.path);
    if (loggedinUser) {
      const userId = loggedinUser.user.id;
      formData.append("userId", userId);
    }
    formData.append("folderName", "userAvatars");
    try {
      const response = await fetch("/api/upload/file-upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        console.log("File uploaded successfully!");
        console.log("Uploaded file info:", data.fileInfo);

        // Update the avatar URL with the file's URL
        const avatarUrl = data.fileUrl;
        console.log(avatarUrl);
        dispatch(updateAvatarUrl(avatarUrl));
        setUploadedFiles([data.fileInfo]);
        dispatch(resetPreview());
      } else {
        console.error("Failed to upload file:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      dispatch(addFilesToPreview([file as FileWithPath]));
      UploadAvatar(file as FileWithPath);
    }
  };

  // to trucenate the wallet address of the user
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
        <div className="h-[100px]  relative">
          <img
            src={selectedUser?.banner|| "/images/GradientBg.jpg"}
            className="abolsute w-full h-full object-cover"
            alt="Profile Banner"
          />
          {loggedinUser.user.id === selectedUser.id && (
            <CameraIcon className="absolute top-2 right-2 bg-white rounded-full p-[2px]" />
          )}
          <div className="rounded-full absolute -bottom-[3.25rem] left-5 border-4 w-24 h-24 border-white ">
            <img
              src={selectedUser.avatar || "/icons/placeholderAvatar.svg"}
              alt={selectedUser.name || ""}
              className="  object-center rounded-full w-full h-full bg-white"
            />
            {loggedinUser.user.id === selectedUser.id && (
              <label className="absolute top-2 -right-2 bg-white rounded-full p-[2px]">
                <CameraIcon />
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
        <div className="flex flex-col px-5 gap-2 pb-3">
          <div className="flex pt-16 justify-between items-center">
            <Typography variant="h6">{selectedUser.name}</Typography>
            <Typography variant="body2">{selectedUser.timezone}</Typography>
          </div>
          <Typography variant="body2">
            @{selectedUser.username + selectedUser.password}
          </Typography>
          <div className="flex gap-3 text-black font-bold text-xs">
            <div className="rounded-lg border-2 border-gray-300  px-1 py-1  uppercase">
              {translateUserVertical(selectedUser.vertical || "")}
            </div>
            <div className="rounded-lg border-2 border-gray-300 px-1 py-1 ">
              {selectedUser.userType}
            </div>
            <div className="rounded-lg border-2 border-gray-300 px-1 py-1">
              {selectedUser.role}
            </div>{" "}
          </div>
          <div className="flex gap-4 py-2">
            <button
              onClick={openSlackConversation}
              className="bg-black text-white px-3 py-2 rounded-xl flex gap-2"
            >
              <MessageCircle />
              Message
            </button>
            {loggedinUser.user.id === selectedUser.id && (
              <button className="px-3 py-2  text-black border border-gray-300 rounded-xl flex gap-2">
                <Pencil /> Edit Profile
              </button>
            )}
          </div>
          <Typography>
            {
              selectedUser.description ||
                "This is the Seleted user's description or bio that will be displayed here and every user will have a unique bio or description that will show off their personality and their work."
            }
          </Typography>
          {!loading ? (
           <div className="flex gap-3 flex-col">
           <Typography variant="h6">Worklogs</Typography>
           <div className="border-2 border-gray-300 rounded-xl max-h-[300px] relative p-3">
             <WorklogSummaryView worklogSummary={worklogSummary.slice(0, 5)} />
             <Link
               href={`http://localhost:3000/user/worklogs/summary/${selectedUser.id}?year=${year}&month=${month}`}
               className="absolute bottom-2 right-2 bg-white rounded-xl border-gray-300 border-2 p-2"
             >
               View Full Summary
             </Link>
           </div>
         </div>
          ) : (
            <LoadingSkeleton />
          )}
          
          <div>
            <Typography variant="h6">Engagements</Typography>
            <ul className="flex flex-col gap-3 pt-2">
              <li className="flex items-center gap-3">
                <div className="w-12 h-12 border-gray-300 border-2 rounded-xl flex font-bold items-center justify-center">
                  1
                </div>
                This is the First Engagement
              </li>
              <li className="flex items-center gap-3">
                <div className="w-12 h-12 border-gray-300 border-2 rounded-xl flex items-center justify-center font-bold">
                  2
                </div>
                This is the Second Engagement
              </li>
              <li className="flex items-center gap-3">
                <div className="w-12 h-12 border-gray-300 border-2 rounded-xl flex items-center justify-center font-bold">
                  3
                </div>
                This is the Third Engagement
              </li>
            </ul>
          </div>
          <div>
            <Typography variant="h6">Mission/Tasks</Typography>
            <ul className="flex flex-col gap-2 mt-3 p-3 border-2 border-gray-300 rounded-xl list-none">
              <li className="flex items-center pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Task 1 or mission 1
              </li>
              <li className="flex items-center pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Task 2 or mission 2
              </li>
              <li className="flex items-center pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Task 3 or mission 3
              </li>
            </ul>
          </div>
          {loggedinUser.user.id === selectedUser.id && (
            <div className="flex flex-col gap-2 ">
              <Typography variant="h6">Payment Details</Typography>
              <div className="flex flex-col gap-2 border-2 border-gray-300 rounded-xl p-3">
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  UPI ID: {payData.upiId || "No UPI Available"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  Wallet Address:{" "}
                  {truncateAddress(payData?.walletAddress) || "Not Available"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  Pay Out: {payData.stipendAmount || "Not Available"}{" "}
                  {payData.stipendCurrency || ""}
                </Typography>
              </div>
            </div>
          )}
        </div>
      </Box>
    </Drawer>
  );
};
