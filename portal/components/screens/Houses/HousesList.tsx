"use client";
import { Spinner } from "@/components/elements/Loaders";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Tooltip } from "@mui/material";
import { HOUSEID, Mission, User } from "@prisma/client";
import { useEffect, useState } from "react";

export const HOUSES_LIST = [
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

function sumHousePoints(missions: Mission[], targetHouse: string): number {
  return missions.reduce((total, mission) => {
    if (mission.house === targetHouse) {
      return total + mission.housePoints;
    }
    return total;
  }, 0);
}

export const HousesList = ({
  missions,
  loading,
}: {
  missions: Mission[];
  loading: boolean;
}) => {
  const [houseMembers, setHouseMembers] = useState<User[]>([]);
  const [houseMembersLoading, setHouseMembersLoading] = useState<boolean>(true);
  const [houses, setHouses] = useState(HOUSES_LIST);

  useEffect(() => {
    PortalSdk.getData("/api/users", null)
      .then((data) => {
        setHouseMembers(data.data.user);
        setHouseMembersLoading(false);
      })
      .catch((err) => {
        console.log(err);
      });
    // mutate houses and ass points and sort on basis of total missions completed.
  }, [missions]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {HOUSES_LIST.map((house) => (
        <div
          key={house.id}
          style={{
            background: house.background,
          }}
          className="flex flex-col gap-2  border border-neutral-200 text-white rounded-xl"
        >
          <div className="flex flex-row items-center gap-2 p-4 px-8 border-b border-white/20">
            <img
              src={house.image}
              alt={house.name}
              className="h-48 w-48 object-cover object-center circular "
            />
            <div className="p-4">
              <h3 className="text-xl font-regular tracking-widest uppercase">
                {house.name}
              </h3>

              <h1 className="text-[3em] font-bold">
                {loading ? <Spinner /> : sumHousePoints(missions, house.id)}
              </h1>
              <p className="text-sm">House Members</p>
              {houseMembersLoading ? (
                <div className="w-12 h-12 bg-gray-300 animate-pulse rounded-full mt-2 pt-2"></div>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2 mt-2 overflow-x-auto">
                    {houseMembers
                      .filter((member) => member.house === house.id)
                      .map((member) => (
                        <div key={member.id}>
                          <Tooltip title={member.name}>
                            <img
                              src={member.avatar || ""}
                              alt={member.name || ""}
                              className="w-12 h-12 rounded-full"
                            />
                          </Tooltip>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/*raghav */}
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm">{house.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
