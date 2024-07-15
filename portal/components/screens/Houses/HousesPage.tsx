"use client";
import { Mission } from "@prisma/client";
import { HousesList } from "./HousesList";
import { useEffect, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import dayjs from "dayjs";
import { MissionsList } from "./MissionsList";
import { MissionDetails } from "./MissionDetails";

export const HousesPage = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setloading] = useState<boolean>(true);

  useEffect(() => {
    PortalSdk.getData("/api/missions?month=" + dayjs().format("YYYY-MM"), null)
      .then((data) => {
        setMissions(data?.data?.missions || []);
        setloading(false);
      })
      .catch((err) => {
        setloading(false);
        console.log(err);
      });
  }, []);

  return (
    <div className="grid grid-cols-5 gap-4">
      <div className="col-span-2">
        <HousesList missions={missions} loading={loading} />
      </div>
      <div className="col-span-2">
        <MissionsList missions={missions} loading={loading} />
      </div>
      <div className="col-span-1">
        <MissionDetails />
      </div>
    </div>
  );
};
