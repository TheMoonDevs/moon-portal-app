"use client";

import Header from "../ReferralHeader";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { useEffect, useState } from "react";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { User, UserReferrals } from "@prisma/client";
import { CircularProgress } from "@mui/material";
import AddRecordModal from "../AddRecordModal";
import Toast, { toastSeverity } from "../Toast";
import { ReferralAdminTable } from "./ReferralAdminTable";
import { setFetchedReferralData } from "@/utils/redux/db/db.slice";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { toast } from "sonner";

export interface IReferralData {
  data: { referrals: UserReferrals[] };
}

const TotalReferrals = () => {
  const { user } = useAuthSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { loading, setLoading } = useAsyncState();
  // const [toast, setToast] = useState<{
  //   open: boolean;
  //   message: string;
  //   severity: toastSeverity;
  // }>({
  //   open: false,
  //   message: "",
  //   severity: "success",
  // });
  const dispatch = useAppDispatch();

  const fetchedReferralData = useAppSelector(
    (state) => state.db.fetchedReferralData
  );

  const handleClose = (event: any, reason: any) => {
    if (reason === "clickaway") {
      return;
    }
    // setToast((prevToast) => ({ ...prevToast, open: false }));
    toast.dismiss();
  };

  useEffect(() => {
    MyServerApi.getAll(SERVER_API_ENDPOINTS.getUsers)
      .then((data: any) => {
        setAllUsers(data?.data?.user as User[]);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchReferralData = async () => {
      try {
        const response = (await MyServerApi.getAllReferrals()) as IReferralData;
        // console.log(response);
        dispatch(setFetchedReferralData(response?.data?.referrals));
        setLoading(false);
      } catch (error) {
        console.log(error);

        setLoading(false);
      }
    };
    fetchReferralData();
  }, [user, setLoading, dispatch]);

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center h-full w-full">
          <CircularProgress sx={{ color: "#0AFF7C" }} />
        </div>
      ) : (
        <div className="p-5 h-full flex flex-col">
          {/* <Header totalReferrals={fetchedReferralData?.length} /> */}
          <ReferralAdminTable
            fetchedReferralData={fetchedReferralData}
            setIsModalOpen={setIsModalOpen}
            user={user}
            // setToast={setToast}
            allUsers={allUsers}
          />
          <AddRecordModal
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            users={allUsers}
          />
          {/* <Toast
            open={toast.open}
            handleClose={handleClose}
            message={toast.message}
            severity={toast.severity}
          /> */}
        </div>
      )}
    </>
  );
};

export default TotalReferrals;
