import React, { useState, useEffect } from "react";
import { Spinner } from "@/components/elements/Loaders";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Tooltip } from "@mui/material";
import { HOUSEID, Mission, User } from "@prisma/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { setMissionDetailsOpen } from "@/utils/redux/missions/selectedMission.slice";
import { RootState, useAppSelector } from "@/utils/redux/store";

interface House {
  id: HOUSEID;
  name: string;
  description: string;
  image: string;
  background: string;
}

export const HOUSES_LIST: House[] = [
  {
    id: HOUSEID.MANAGEMENT,
    name: "Management",
    description: "Management House",
    image: `images/houses/${HOUSEID.MANAGEMENT}.png`,
    background: `linear-gradient(180deg, #D40000, #000000)`,
  },
  {
    id: HOUSEID.GROWTH,
    name: "Growth",
    description: "Growth House",
    image: `images/houses/${HOUSEID.GROWTH}.png`,
    background: `linear-gradient(180deg, #540907, #060405)`,
  },
  {
    id: HOUSEID.EXECUTIVE,
    name: "Executive",
    description: "Executive House",
    image: `images/houses/${HOUSEID.EXECUTIVE}.png`,
    background: `linear-gradient(180deg, #0A95A8, #10303C)`,
  },
  {
    id: HOUSEID.PRODUCT_TECH,
    name: "Product",
    description: "Product House",
    image: `images/houses/${HOUSEID.PRODUCT_TECH}.png`,
    background: `linear-gradient(180deg, #62368D, #291643)`,
  },
];

function sumHousePoints(missions: Mission[], targetHouse: HOUSEID): number {
  return missions.reduce((total, mission) => {
    if (mission.house === targetHouse) {
      return total + mission.housePoints;
    }
    return total;
  }, 0);
}

interface HousesListProps {
  currentHouseIndex: number;
  setCurrentHouseIndex: (index: number) => void;
}

export const HousesList = ({
  currentHouseIndex,
  setCurrentHouseIndex,
}: HousesListProps) => {
  const [houseMembers, setHouseMembers] = useState<User[]>([]);
  const [houseMembersLoading, setHouseMembersLoading] = useState<boolean>(true);
  const { missions } = useAppSelector(
    (state: RootState) => state.selectedMission
  );

  useEffect(() => {
    PortalSdk.getData("/api/users", null)
      .then((data) => {
        setHouseMembers(data.data.user);
        setHouseMembersLoading(false)
      })
      .catch((err) => {
        console.error(err);
      });
  }, [missions]);

  const toggleHouse = (index: number) => {
    setCurrentHouseIndex(currentHouseIndex === index ? -1 : index);
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {HOUSES_LIST.map((house, index) => (
        <div
          key={house.id}
          style={{
            background: house.background,
          }}
          onClick={() =>{ 
            toggleHouse(index)
           
          }}
          className="flex flex-col border border-neutral-200 text-white rounded-xl overflow-hidden transition-all duration-300 ease-in-out"
        >
          <div className="relative">
            <div className="absolute top-9 right-4 cursor-pointer z-10">
              {currentHouseIndex === index ? (
                <ChevronUp size={24} />
              ) : (
                <ChevronDown size={24} />
              )}
            </div>
            <div
              className={`flex flex-row items-center gap-2 p-4 px-8 border-b border-white/20 transition-all duration-300 ease-in-out ${
                currentHouseIndex === index
                  ? ""
                  : "items-center justify-between"
              }`}
            >
              <img
                src={house.image}
                alt={house.name}
                className={`object-cover object-center  transition-all duration-300 ease-in-out  ${
                  currentHouseIndex === index
                    ? "h-48 w-48 rounded-full"
                    : "h-16 w-[35%] overflow-y-hidden "
                }`}
              />
              <div
                className={`p-4 transition-all duration-300 ease-in-out ${
                  currentHouseIndex === index
                    ? ""
                    : "flex items-center justify-between flex-1"
                }`}
              >
                <h3 className="text-xl font-regular tracking-widest uppercase">
                  {house.name}
                </h3>
                {currentHouseIndex === index ? (
                  <div className="flex flex-col ">
                    <h1 className="text-[3em] font-bold">
                      {houseMembersLoading ? (
                        <Spinner />
                      ) : (
                        sumHousePoints(missions || [], house.id)
                      )}
                    </h1>
                    <div>
                      <p className="text-sm">House Members</p>
                      {houseMembersLoading ? (
                        <div className="w-12 h-12 bg-gray-300 animate-pulse rounded-full mt-2 pt-2"></div>
                      ) : (
                        <div className="flex flex-wrap gap-2 mt-2 overflow-x-auto">
                          {houseMembers
                            .filter((member) => member.house === house.id)
                            .map((member) => (
                              <div key={member.id}>
                                <Tooltip title={member.name || ""}>
                                  <img
                                    src={member.avatar || ""}
                                    alt={member.name || ""}
                                    className="w-12 h-12 rounded-full"
                                  />
                                </Tooltip>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="mr-2">HP:</span>
                    <span className="text-2xl font-bold">
                      {houseMembersLoading ? (
                        <Spinner />
                      ) : (
                        sumHousePoints(missions || [], house.id)
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {currentHouseIndex === index && (
            <div className="p-4">
              <p className="text-sm ">{house.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
