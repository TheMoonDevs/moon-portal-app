/* eslint-disable @next/next/no-img-element */
"use client";

import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { useAppSelector } from "@/utils/redux/store";
// import Image from "next/image";

const ReferralHeader = () => {
  const { user } = useAuthSession();
  const fetchedReferralData = useAppSelector(
    (state) => state.db.fetchedReferralData
  );
  return (
    <section className="hidden lg:flex justify-between items-center w-full h-[15%] md:h-full pb-0">
      <div className="flex flex-col gap-2 mt-2">
        <span className="text-4xl font-semibold">
          {fetchedReferralData.length} Referrals
        </span>
        <span className="text-sm font-thin text-midGrey">
          Total People Referred
        </span>
      </div>
      {/* <div className=" border-black border flex items-center justify-end gap-5 py-1 px-3">
        <span className="text-md max-w-25 truncate font-semibold tracking-widest">
          {user?.name}
        </span>
        <img
          src={user?.avatar as string}
          alt={user?.name as string}
          className="w-10 h-10 rounded-full object-cover"
          width={40}
          height={40}
        />
      </div> */}
    </section>
  );
};

export default ReferralHeader;
