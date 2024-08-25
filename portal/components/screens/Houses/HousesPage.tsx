"use client";
import { HousesList } from "./HousesList";
import { useEffect, useState } from "react";
import { MissionsList } from "./MissionsList";
import { MissionDetails } from "./MissionDetails";
import { User } from "@prisma/client";
import { RootState, useAppSelector } from "@/utils/redux/store";
import { PortalSdk } from "@/utils/services/PortalSdk";

export const HousesPage = () => {
  const [loading, setloading] = useState<boolean>(true);
  // This state is created to show first house mission on mount and to alternate between house missions
  const [currentHouseIndex, setCurrentHouseIndex] = useState<number>(0);
  const [houseMembers, setHouseMembers] = useState<User[]>([]);
  const [houseMembersLoading, setHouseMembersLoading] = useState<boolean>(true);
  const { missions } = useAppSelector(
    (state: RootState) => state.selectedMission
  );
  useEffect(() => {
    PortalSdk.getData("/api/users", null)
      .then((data) => {
        setHouseMembers(data.data.user);
        setHouseMembersLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [missions]);

  return (
    <div className="grid grid-cols-5 gap-4 max-h-[96vh] ">
      <div className="col-span-2">
        <HousesList
          setCurrentHouseIndex={setCurrentHouseIndex}
          currentHouseIndex={currentHouseIndex}
          houseMembers={houseMembers}
          houseMembersLoading={houseMembersLoading}
        />
      </div>
      <div className="col-span-2">
        <MissionsList
          loading={loading}
          currentHouseIndex={currentHouseIndex}
          houseMembers={houseMembers}
        />
      </div>
      <div className="col-span-1">
        <MissionDetails loading={loading} />
      </div>
    </div>
  );
};
