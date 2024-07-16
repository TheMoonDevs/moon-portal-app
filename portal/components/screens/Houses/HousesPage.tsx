"use client";
import { Mission } from "@prisma/client";
import { HousesList } from "./HousesList";
import { useEffect, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import dayjs from "dayjs";
import { MissionsList } from "./MissionsList";
import { MissionDetails } from "./MissionDetails";
import { setSelectedMission } from "@/utils/redux/missions/selectedMission.slice";
import { useAppDispatch } from "@/utils/redux/store";

export const HousesPage = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setloading] = useState<boolean>(true);
  // This state is created to show first house mission on mount and to alternate between house missions
  const [currentHouseIndex, setCurrentHouseIndex] = useState<number>(0);
  const dispatch = useAppDispatch();

  useEffect(() => {
    PortalSdk.getData("/api/missions?month=" + dayjs().format("YYYY-MM"), null)
      .then((data) => {
        setMissions(data?.data?.missions || []);
        dispatch(setSelectedMission(data?.data?.missions[currentHouseIndex] || []))
        setloading(false);
      })
      .catch((err) => {
        setloading(false);
        console.log(err);
      });
  }, []);

  return (
    <div className="grid grid-cols-5 gap-4 max-h-[96vh] ">
      <div className="col-span-2">
        <HousesList
          missions={missions}
          loading={loading}
          setCurrentHouseIndex={setCurrentHouseIndex}
          currentHouseIndex={currentHouseIndex}
        />
      </div>
      <div className="col-span-2">
        <MissionsList
          missions={missions}
          loading={loading}
          currentHouseIndex={currentHouseIndex}
        />
      </div>
      <div className="col-span-1">
        <MissionDetails missions={missions} />
      </div>
    </div>
  );
};
