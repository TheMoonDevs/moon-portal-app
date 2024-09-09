/* eslint-disable @next/next/no-img-element */

"use client";
import React from "react";
import {
  setAllMissions,
  setMissionDetailsOpen,
  setMissionsLoading,
  setSelectedMission,
} from "@/utils/redux/missions/selectedMission.slice";
import { setActiveTab } from "@/utils/redux/missions/missionTaskEditorSlice.slice";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Mission, MissionTask, User } from "@prisma/client";
import { HOUSES_LIST } from "./HousesList";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import useSWR from "swr";
import TasksList from "./TaskList";
import {
  setAllTasks,
  setTasksLoading,
} from "@/utils/redux/missions/missionsTasks.slice";
import ExpandedMission from "./ExpandedMission";
import { setEditorModalOpen } from "@/utils/redux/missions/missionTaskEditorSlice.slice";

export function calculateMissionStat(
  mission: Mission,
  tasks: MissionTask[] = [],
  statType: "balance" | "percentage" | "status"
): number | string {
  const totalMissionPoints = mission.indiePoints;

  const allTaskPoints =
    tasks.length > 0
      ? tasks
          .filter((task) => task.missionId === mission.id)
          .reduce((sum, task) => sum + task.indiePoints, 0)
      : 0;

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
      return remainingBalance > 0 ? "🟡" : remainingBalance === 0 ? "✅" : "❌";
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
  const { activeTab } = useAppSelector(
    (state: RootState) => state.missionTaskEditor
  );
  const tasks = useAppSelector((state: RootState) => state.missionsTasks);
  const [timeFrame, setTimeFrame] = useState("month");
  const [timeValue, setTimeValue] = useState(dayjs().format("YYYY-MM"));
  const [tasksFetched, setTasksFetched] = useState(false);
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleAccordionChange = (missionId: string) => {
    setExpanded((prev) => (prev === missionId ? false : missionId));
  };

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

  const fetchUrl = `/api/missions?${getQueryString(timeFrame, timeValue)}`;
  const { data, error } = useSWR(fetchUrl, (url) =>
    fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    dispatch(setMissionsLoading(true));
    if (data) {
      // console.log(data);
      dispatch(setAllMissions(data?.data?.missions || []));
      const selectedMissionData =
        data?.data?.missions[currentHouseIndex] || null;
      dispatch(setSelectedMission(selectedMissionData));
      dispatch(setMissionsLoading(false));
    }

    if (error) {
      dispatch(setMissionDetailsOpen(false));
      console.error("Error fetching missions:", error);
      dispatch(setMissionsLoading(false));
    }
  }, [data, error, dispatch, missions]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (missions && !tasksFetched) {
        dispatch(setTasksLoading(true));
        for (const mission of missions) {
          try {
            const res = await PortalSdk.getData(
              `/api/mission-tasks?missionId=${mission.id}`,
              null
            );
            const tasksFromResponse = res.data.tasks || [];
            dispatch(setAllTasks(tasksFromResponse));
          } catch (error) {
            console.log(
              `Error fetching tasks for mission ${mission.id}:`,
              error
            );
          }
        }
        setTasksFetched(true);
        dispatch(setTasksLoading(false));
      } else {
        dispatch(setTasksLoading(false));
      }
    };

    fetchTasks();
  }, [missions, tasksFetched, dispatch]);

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
        <div className="flex flex-row items-center gap-2">
          <h3
            className={`text-sm font-semibold text-neutral-400 tracking-widest uppercase cursor-pointer border-b-4 w-20 flex justify-center transition-colors duration-300 ease-in-out ${
              activeTab === "missions"
                ? "border-neutral-400 bg-gray-100"
                : "border-transparent bg-white"
            }`}
            onClick={() => dispatch(setActiveTab("missions"))}
          >
            Missions
          </h3>
          <h3
            className={`text-sm font-semibold text-neutral-400 tracking-widest uppercase cursor-pointer border-b-4 w-20 flex justify-center transition-colors duration-300 ease-in-out ${
              activeTab === "tasks"
                ? "border-neutral-400 bg-gray-100"
                : "border-transparent bg-white"
            }`}
            onClick={() => dispatch(setActiveTab("tasks"))}
          >
            Tasks
          </h3>
          <Tooltip
            title={
              activeTab === "tasks" && missions.length === 0
                ? "No mission found. Add a new mission to create tasks."
                : activeTab === "tasks"
                ? "Add New Task"
                : "Add New Mission"
            }
          >
            <span
              className={`material-symbols-outlined cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110`}
              onClick={() => {
                if (activeTab === "tasks" && missions.length === 0) return;
                dispatch(setEditorModalOpen(true));
              }}
            >
              add_box
            </span>
          </Tooltip>
        </div>
        <div className="flex flex-row items-center gap-2">
          <FormControl variant="standard" size="small" className="w-[100px]">
            <Select
              value={timeFrame}
              onChange={handleTimeFrameChange}
              label="Time Frame"
              disabled={activeTab === "tasks"}
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
              disabled={activeTab === "tasks"}
            >
              {getTimeValueOptions().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* <span className="material-icons-outlined">search</span> */}
        </div>
      </div>
      {activeTab === "missions" ? (
        missions && missions.length > 0 ? (
          missions
            .filter(
              (mission: Mission) =>
                HOUSES_LIST[currentHouseIndex]?.id == mission.house
            )
            .map((mission, i) => {
              const missionTasks =
                tasks && Array.isArray(tasks)
                  ? tasks.filter((t) => t?.missionId === mission?.id)
                  : [];
              return (
                <React.Fragment key={`${i}-${mission?.id}`}>
                  <div
                    className={`flex flex-col gap-2 border-b pt-3 border-neutral-200 cursor-pointer hover:bg-gray-100 w-full
            ${
              selectedMission?.id === mission.id
                ? "bg-gray-200"
                : "text-gray-700"
            }
            ${expanded === mission.id ? "bg-gray-200" : "text-gray-700"}
          `}
                    onClick={() => {
                      dispatch(setSelectedMission(mission));
                      dispatch(setMissionDetailsOpen(false));
                      handleAccordionChange(mission.id);
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
                        {missionTasks.length > 0 &&
                          calculateMissionStat(
                            mission,
                            missionTasks,
                            "balance"
                          )}{" "}
                        / {mission.indiePoints}
                      </p>
                      <p className="text-sm font-regular">
                        {missionTasks.length > 0 &&
                          calculateMissionStat(mission, missionTasks, "status")}
                      </p>
                      {/* <p className="text-sm font-regular">{mission.createdAt ? prettyPrintDateInMMMDD(new Date(mission.createdAt)) : "uknown"}</p> */}
                    </div>
                    <div
                      className="h-[2px] bg-green-500"
                      style={{
                        width: `${calculateMissionStat(
                          mission,
                          missionTasks,
                          "percentage"
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <ExpandedMission
                    expanded={expanded}
                    mission={mission}
                  />
                </React.Fragment>
              );
            })
        ) : (
          <div className="text-gray-500 px-4 py-10 flex justify-center items-center">
            No Missions Found
          </div>
        )
      ) : (
        <TasksList currentHouseIndex={currentHouseIndex} />
      )}
      <CreateMission
        houseMembers={houseMembers}
        activeTab={activeTab}
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
