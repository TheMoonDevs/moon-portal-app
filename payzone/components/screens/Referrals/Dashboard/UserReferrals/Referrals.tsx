"use client";

import useAsyncState from "@/utils/hooks/useAsyncState";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { MyServerApi } from "@/utils/service/MyServerApi";
import { CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import Header from "../ReferralHeader";
import { IReferralData } from "../Admin/TotalReferrals";
import { UserReferralTable } from "./UserReferralTable";
import { setFetchedReferralData } from "@/utils/redux/db/db.slice";
import { useAuthSession } from "@/utils/hooks/useAuthSession";

const Referrals = () => {
  const { user } = useAuthSession();
  const { loading, setLoading } = useAsyncState();
  const [copied, setCopied] = useState(false);
  const dispatch = useAppDispatch();
  const fetchedReferralData = useAppSelector(
    (state) => state.db.fetchedReferralData
  );

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = (await MyServerApi.getReferralsByUserId(
          user?.id
        )) as IReferralData;

        dispatch(setFetchedReferralData(response?.data?.referrals));
        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    };
    fetchReferrals();
  }, [setLoading, user, dispatch]);

  return (
    <>
      {/* {user?.isAdmin ? (
        <ComingSoon />
      ) : ( */}
      <>
        {loading ? (
          <div className="flex justify-center items-center h-full w-full">
            <CircularProgress sx={{ color: "#0AFF7C" }} />
          </div>
        ) : (
          <div className="p-5 h-full flex flex-col">
            {fetchedReferralData?.length > 0 ? (
              <div className="p-5 px-2">
                {/* <Header totalReferrals={fetchedReferralData?.length} /> */}
                <UserReferralTable
                  data={fetchedReferralData}
                  setCopied={setCopied}
                  copied={copied}
                  user={user}
                />
              </div>
            ) : (
              <h1 className="text-lg text-center pt-5">No referrals found</h1>
            )}
          </div>
        )}
      </>
      {/* )} */}
    </>
  );
};

export default Referrals;
