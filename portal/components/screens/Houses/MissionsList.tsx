"use client";
import {
  setMissionDetailsOpen,
  setSelectedMission,
} from "@/utils/redux/missions/selectedMission.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { Mission } from "@prisma/client";
import { HOUSES_LIST } from "./HousesList";

export function calculateMissionStat(
  mission: Mission,
  statType: "balance" | "percentage" | "status"
): number | string {
  const totalMissionPoints = mission.indiePoints;

  if (!mission.tasks) {
    switch (statType) {
      case "balance":
        return totalMissionPoints;
      case "percentage":
        return 0;
      case "status":
        return ""; // No tasks, so mission not completed
    }
  }
 
  /* @ts-expect-error */
  const allTaskPoints = mission.tasks.reduce(
    (sum: number, task: any) => sum + task.indiePoints,
    0
  );
  const remainingBalance = totalMissionPoints - allTaskPoints;

  switch (statType) {
    case "balance":
      return remainingBalance;
    case "percentage":
      if (remainingBalance === totalMissionPoints) {
        return 0;
      }
      const completedPoints = totalMissionPoints - remainingBalance;
      const progress = (completedPoints / totalMissionPoints) * 100;
      return progress;
    case "status":
      return remainingBalance >= 0 ? "🟡" : remainingBalance === 0 ? "✅" : "";
    default:
      throw new Error("Invalid stat type");
  }
}

export const MissionsList = ({
  missions,
  loading,
  currentHouseIndex,
}: {
  missions: Mission[];
  loading: boolean;
  currentHouseIndex: number;
}) => {
  const dispatch = useAppDispatch();

  if (loading) {
    return <MissionsListSkeleton />;
  }

  return (
    <div className=" flex flex-col gap-4 my-4 shadow-xl h-[96vh] rounded-lg border overflow-y-scroll">
      <div
        id="mission-header"
        className="flex flex-row items-center justify-between px-4 py-4 border-b border-neutral-200 rounded-t-xl"
      >
        <h3 className="text-sm font-semibold text-neutral-400 tracking-widest uppercase">
          Missions
        </h3>
        <div className="flex flex-row items-center gap-2">
          <span className="material-icons-outlined">filter_alt</span>
          <span className="material-icons-outlined">search</span>
        </div>
      </div>
      {missions
        .filter(
          (mission: Mission) =>
            HOUSES_LIST[currentHouseIndex]?.id == mission.house
        )
        .map((mission, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border-b border-neutral-200"
            onClick={() => {
              dispatch(setSelectedMission(mission));
              dispatch(setMissionDetailsOpen(true));
            }}
          >
            <div className="flex flex-row items-center gap-2 w-full px-4">
              <img
                src={`images/houses/${mission.house}.png`}
                alt={mission.house}
                className="w-8 h-8 object-cover object-center rounded-full"
              />
              <h4 className="text-md font-semibold">{mission.title}</h4>
              <p className="text-sm font-regular ml-auto">
                {mission.housePoints} HP
              </p>
              <p className="text-sm font-regular">
                {calculateMissionStat(mission, "balance")} /{" "}
                {mission.indiePoints}
              </p>
              <p className="text-sm font-regular">
                {calculateMissionStat(mission, "status")}
              </p>
              {/* <p className="text-sm font-regular">{mission.createdAt ? prettyPrintDateInMMMDD(new Date(mission.createdAt)) : "uknown"}</p> */}
            </div>
            <div
              className="h-[2px] bg-green-500"
              style={{
                width: `${calculateMissionStat(mission, "percentage")}%`,
              }}
            ></div>
          </div>
        ))}
    </div>
  );
};

export const MissionsListSkeleton = () => {
  return (
    <div className="h-full flex flex-col gap-4 my-4 shadow-xl rounded-lg border animate-pulse">
      <div
        id="mission-header"
        className="flex flex-row items-center justify-between px-4 py-4 border-b border-neutral-200 rounded-t-xl"
      >
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="flex flex-row items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
          <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-2"
        >
          <div className="flex flex-row items-center gap-2 w-full">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-6"></div>
          </div>
          <div className="h-[2px] bg-gray-200 w-full"></div>
        </div>
      ))}
    </div>
  );
};
