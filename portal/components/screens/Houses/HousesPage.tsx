"use client";
import { HousesList } from "./HousesList";
import { useState } from "react";
import { MissionsList } from "./MissionsList";
import { MissionDetails } from "./MissionDetails";

export const HousesPage = () => {
  const [loading, setloading] = useState<boolean>(true);
  // This state is created to show first house mission on mount and to alternate between house missions
  const [currentHouseIndex, setCurrentHouseIndex] = useState<number>(0);

  return (
    <div className="grid grid-cols-5 gap-4 max-h-[96vh] ">
      <div className="col-span-2">
        <HousesList
          setCurrentHouseIndex={setCurrentHouseIndex}
          currentHouseIndex={currentHouseIndex}
        />
      </div>
      <div className="col-span-2">
        <MissionsList
          loading={loading}
          currentHouseIndex={currentHouseIndex}
        />
      </div>
      <div className="col-span-1">
        <MissionDetails loading={loading} />
      </div>
    </div>
  );
};
