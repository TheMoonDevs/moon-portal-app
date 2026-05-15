/* eslint-disable @next/next/no-img-element */

'use client';
import type { Mission, User } from '@db/client';
import dayjs from 'dayjs';
import React from 'react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

import {
  setActiveMission,
  setAllMissions,
  setMissionDetailsOpen,
  setMissionsLoading,
} from '@/utils/redux/missions/mission.slice';
import {
  setAllTasks,
  setTasksLoading,
} from '@/utils/redux/missions/missionsTasks.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';

import CreateMissionSlider from '../CreateMissionSlider';
import { HOUSES_LIST } from '../HousesList';
import ActionBar from './ActionBar';
import { getQueryString } from './mission.utils';
import MissionList from './MissionList';

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
  const [timeFrame, setTimeFrame] = useState('month');
  const [timeValue, setTimeValue] = useState(dayjs().format('YYYY-MM'));
  const [tasksFetched, setTasksFetched] = useState(false);

  const fetchUrl = `/api/missions?${getQueryString(timeFrame, timeValue)}`;
  const { data, error } = useSWR(fetchUrl, (url) =>
    fetch(url).then((res) => res.json()),
  );
  useEffect(() => {
    dispatch(setMissionsLoading(true));
    if (data) {
      // console.log(data);
      dispatch(setAllMissions(data?.data?.missions || []));
      const selectedMissionData =
        data?.data?.missions.filter(
          (mission: Mission) =>
            mission.house === HOUSES_LIST[currentHouseIndex]?.id,
        )[0] || null;
      dispatch(setActiveMission(selectedMissionData));
      dispatch(setMissionsLoading(false));
    }

    if (error) {
      dispatch(setMissionDetailsOpen(false));
      console.error('Error fetching missions:', error);
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
              null,
            );
            const tasksFromResponse = res.data.tasks || [];
            dispatch(setAllTasks(tasksFromResponse));
          } catch (error) {
            console.log(
              `Error fetching tasks for mission ${mission.id}:`,
              error,
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
    <div className="my-4 flex h-[96vh] flex-col overflow-y-scroll rounded-lg border shadow-xl">
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
    <div className="my-4 flex h-full animate-pulse flex-col gap-4 rounded-lg border shadow-xl">
      <div
        id="mission-header"
        className="flex flex-row items-center justify-between rounded-t-xl border-b border-neutral-200 p-4"
      >
        <div className="h-4 w-1/4 rounded bg-gray-200"></div>
        <div className="flex flex-row items-center gap-2">
          <div className="size-6 rounded-full bg-gray-200"></div>
          <div className="size-6 rounded-full bg-gray-200"></div>
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-2"
        >
          <div className="flex w-full flex-row items-center gap-2">
            <div className="size-8 rounded-full bg-gray-200"></div>
            <div className="h-4 w-1/3 rounded bg-gray-200"></div>
            <div className="ml-auto h-4 w-16 rounded bg-gray-200"></div>
            <div className="h-4 w-20 rounded bg-gray-200"></div>
            <div className="h-4 w-6 rounded bg-gray-200"></div>
          </div>
          <div className="h-[2px] w-full bg-gray-200"></div>
        </div>
      ))}
    </div>
  );
};
