/* eslint-disable @next/next/no-img-element */

"use client";
import React from "react";

import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Mission, User } from "@prisma/client";
import { HOUSES_LIST } from "../HousesList";
import { useEffect, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import dayjs from "dayjs";
import useSWR from "swr";
import {
  setAllTasks,
  setTasksLoading,
} from "@/utils/redux/missions/missionsTasks.slice";
import CreateMissionSlider from "../CreateMissionSlider";
import {
  setActiveMission,
  setAllMissions,
  setMissionDetailsOpen,
  setMissionsLoading,
} from "@/utils/redux/missions/mission.slice";

import ActionBar from "./ActionBar";
import { getQueryString } from "./mission.utils";
import MissionList from "./MissionList";

export const Missions = ({
  currentHouseIndex,
  houseMembers,
}: {
  loading: boolean;
  currentHouseIndex: number;
  houseMembers: User[];
}) => {
  const dispatch = useAppDispatch();
  const { allMissions } = useAppSelector((state: RootState) => state.mission);
  const { activeTab } = useAppSelector((state: RootState) => state.missionUi);
  const [timeFrame, setTimeFrame] = useState("month");
  const [timeValue, setTimeValue] = useState(dayjs().format("YYYY-MM"));
  const [tasksFetched, setTasksFetched] = useState(false);

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
        data?.data?.missions.filter(
          (mission: Mission) =>
            mission.house === HOUSES_LIST[currentHouseIndex]?.id
        )[0] || null;
      dispatch(setActiveMission(selectedMissionData));
      dispatch(setMissionsLoading(false));
    }

    if (error) {
      dispatch(setMissionDetailsOpen(false));
      console.error("Error fetching missions:", error);
      dispatch(setMissionsLoading(false));
    }
  }, [data, error, dispatch, currentHouseIndex]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (allMissions && !tasksFetched) {
        dispatch(setTasksLoading(true));
        for (const mission of allMissions) {
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
  }, [allMissions, tasksFetched, dispatch]);

  if (!allMissions) {
    return <MissionsListSkeleton />;
  }

  return (
    <div className=" flex flex-col  my-4 shadow-xl h-[96vh] rounded-lg border overflow-y-scroll">
      <ActionBar
        currentHouseIndex={currentHouseIndex}
        activeTab={activeTab}
        timeFrame={timeFrame}
        setTimeFrame={setTimeFrame}
        timeValue={timeValue}
        setTimeValue={setTimeValue}
      />
      <MissionList currentHouseIndex={currentHouseIndex} />
      <CreateMissionSlider
        currentHouseIndex={currentHouseIndex}
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
