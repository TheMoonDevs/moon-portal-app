/* eslint-disable @next/next/no-img-element */

"use client";
import {
  setAllMissions,
  setMissionDetailsOpen,
  setSelectedMission,
} from "@/utils/redux/missions/selectedMission.slice";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Mission, User } from "@prisma/client";
import { HOUSES_LIST } from "./HousesList";
import { useCallback, useEffect, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import dayjs from "dayjs";
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
} from "@mui/material";
import CreateMission from "./CreateMission";

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
  loading,
  currentHouseIndex,
  houseMembers,
}: {
  loading: boolean;
  currentHouseIndex: number;
  houseMembers: User[];
}) => {
  const dispatch = useAppDispatch();
  const missions = useAppSelector(
    (state: RootState) => state.selectedMission.missions
  );
  const selectedMission = useAppSelector(
    (state: RootState) => state.selectedMission.mission
  );
  const [timeFrame, setTimeFrame] = useState("month");
  const [timeValue, setTimeValue] = useState(dayjs().format("YYYY-MM"));
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const getQueryString = useCallback((frame: string, value: string): string => {
    switch (frame) {
      case "month":
        return `month=${value}`;
      case "quarter":
        const year = dayjs().year().toString();
        return `year=${year}&quarter=${value}`;
      case "year":
        return `year=${value}`;
      default:
        return "";
    }
  }, []);

  useEffect(() => {
    const fetchUrl = `/api/missions?${getQueryString(timeFrame, timeValue)}`;
    PortalSdk.getData(fetchUrl, null)
      .then((data) => {
        dispatch(setAllMissions(data?.data?.missions || []));
        dispatch(
          setSelectedMission(data?.data?.missions[currentHouseIndex] || [])
        );
      })
      .catch((err) => {
        setMissionDetailsOpen(false);
        console.error("Error fetching missions:", err);
      });
  }, [currentHouseIndex, timeValue]);

  const getTimeValueOptions = useCallback(() => {
    const currentYear = dayjs().year();

    switch (timeFrame) {
      case "month":
        return Array.from({ length: 12 }, (_, i) => {
          const date = dayjs().month(i);
          return {
            value: date.format("YYYY-MM"),
            label: date.format("MMMM YYYY"),
          };
        });
      case "quarter":
        return [1, 2, 3, 4].map((q) => ({
          value: q.toString(),
          label: `Q${q} ${currentYear}`,
        }));
      case "year":
        return Array.from({ length: 5 }, (_, i) => {
          const year = currentYear - i;
          return {
            value: year.toString(),
            label: year.toString(),
          };
        });
      default:
        return [];
    }
  }, [timeFrame]);

  const handleTimeFrameChange = (event: SelectChangeEvent<string>) => {
    const newTimeFrame = event.target.value as string;
    setTimeFrame(newTimeFrame);
    switch (newTimeFrame) {
      case "month":
        setTimeValue(dayjs().format("YYYY-MM"));
        break;
      case "quarter":
        setTimeValue("1");
        break;
      case "year":
        setTimeValue(dayjs().year().toString());
        break;
    }
  };

  const handleTimeValueChange = (event: SelectChangeEvent<string>) => {
    const newTimeValue = event.target.value as string;
    setTimeValue(newTimeValue);
  };

  if (!missions) {
    return <MissionsListSkeleton />;
  }

  return (
    <div className=" flex flex-col  my-4 shadow-xl h-[96vh] rounded-lg border overflow-y-scroll">
      <div
        id="mission-header"
        className="flex flex-row items-center justify-between px-4 py-4 border-b border-neutral-200 rounded-t-xl"
      >
        <h3 className="text-sm font-semibold text-neutral-400 tracking-widest uppercase">
          Missions
        </h3>
        <Tooltip title="Add New Mission">
          <span
            className="material-symbols-outlined cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            add_box
          </span>
        </Tooltip>
        <div className="flex flex-row items-center gap-2">
          <FormControl variant="standard" size="small" className="w-[100px]">
            <Select
              value={timeFrame}
              onChange={handleTimeFrameChange}
              label="Time Frame"
            >
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="quarter">Quarter</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="standard" size="small" className="w-[100px]">
            <Select
              value={timeValue}
              onChange={handleTimeValueChange}
              label="Value"
            >
              {getTimeValueOptions().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <span className="material-icons-outlined">search</span>
        </div>
      </div>
      {missions &&
        missions
          .filter(
            (mission: Mission) =>
              HOUSES_LIST[currentHouseIndex]?.id == mission.house
          )
          .map((mission, i) => (
            <div
              key={i}
              className={`flex flex-col gap-2 border-b pt-3 border-neutral-200 cursor-pointer hover:bg-gray-100 
                ${
                  selectedMission?.id === mission.id
                    ? 'bg-gray-200'
                    : 'text-gray-700'
                }
              `}
              onClick={() => {
                dispatch(setSelectedMission(mission));
                dispatch(setMissionDetailsOpen(false));
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
      <CreateMission
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        houseMembers={houseMembers}
      />
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
