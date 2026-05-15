/* eslint-disable @next/next/no-img-element */

import type { Mission, MissionTask } from '@db/client';
import { IconButton } from '@mui/material';
import React from 'react';

import { setActiveMission } from '@/utils/redux/missions/mission.slice';
import {
  setActiveTab,
  setEditModalOpen,
} from '@/utils/redux/missions/mission.ui.slice';
import { setActiveTask } from '@/utils/redux/missions/missionsTasks.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

export const MissionDetails = ({ loading }: { loading: boolean }) => {
  const dispatch = useAppDispatch();
  const { activeMission, allMissions, missionDetailsOpen, missionsLoading } =
    useAppSelector((state: RootState) => state.mission);
  const { allTasks, tasksLoading } = useAppSelector(
    (state: RootState) => state.missionsTasks,
  );

  const missionTasks = allTasks?.filter(
    (t) => t?.missionId === activeMission?.id,
  );

  if (tasksLoading || missionsLoading) {
    return <MissionDetailsSkeleton />;
  }

  if (allMissions?.length === 0) {
    return <div className="py-4 text-center text-lg">No missions found</div>;
  }

  if (allMissions && allMissions.length > 0 && !activeMission) {
    return (
      <div className="text-center text-3xl">Select mission to see details</div>
    );
  }

  return (
    <div
      className={`my-4 h-[96vh] overflow-y-scroll rounded-lg border-b border-neutral-200 bg-white p-6 shadow-lg`}
    >
      {missionDetailsOpen ? (
        <div className="flex flex-col gap-6">
          {allMissions?.map((mission: Mission) =>
            MissionComponent(mission, missionTasks),
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{activeMission?.title}</h2>
            <IconButton
              onClick={() => {
                dispatch(setActiveMission(activeMission));
                dispatch(setActiveTab('missions'));
                dispatch(setEditModalOpen(true));
              }}
            >
              <span className="material-symbols-outlined">edit_document</span>{' '}
            </IconButton>
          </div>
          <h3 className="mb-4 text-xl font-semibold">Tasks</h3>
          <ul className="space-y-4">
            {missionTasks.length > 0 ? (
              missionTasks?.map((task: any) => (
                <li
                  key={task.id}
                  className="rounded-lg p-4 shadow shadow-gray-300"
                >
                  <div className="mb-2 flex items-center">
                    <img
                      src={task.avatar || '/icons/placeholderAvatar.svg'}
                      alt={task.name}
                      className="mr-3 size-10 rounded-full object-cover"
                    />
                    <span className="font-semibold">
                      {task.name || 'Unknown'}
                    </span>
                  </div>
                  <p className="mb-2 font-bold text-gray-700">{task.title}</p>
                  <p className="mb-2 line-clamp-3 text-sm text-gray-700">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-right text-sm font-medium text-blue-600">
                      {task.indiePoints} Indie Points
                    </p>
                    <IconButton
                      onClick={() => {
                        dispatch(setActiveTask(task));
                        dispatch(setEditModalOpen(true));
                        dispatch(setActiveTab('tasks'));
                      }}
                    >
                      <span className="material-symbols-outlined">
                        edit_document
                      </span>{' '}
                    </IconButton>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm font-medium text-black">No tasks found</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export const MissionComponent = (
  mission: Mission,
  missionTasks: MissionTask[],
): any => {
  const filteredTasks = missionTasks.filter(
    (task: any) => task.missionId === mission.id,
  );
  return (
    <div className="">
      <h2 className="mb-4 text-2xl font-bold">{mission.title}</h2>
      <ul className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks?.map((task: any, index: number) => (
            <li key={`${task.id}-${index}`} className="rounded-lg p-4 shadow">
              <div className="mb-2 flex items-center">
                <img
                  src={task.avatar || '/icons/placeholderAvatar.svg'}
                  alt={task.name}
                  className="mr-3 size-10 rounded-full object-cover"
                />
                <span className="font-semibold">{task.name || 'Unknown'}</span>
              </div>
              <p className="mb-2 font-bold text-gray-700">{task.title}</p>
              <p className="mb-2 text-sm text-gray-700">{task.description}</p>
              <p className="text-right text-sm font-medium text-blue-600">
                {task.indiePoints} Indie Points
              </p>
            </li>
          ))
        ) : (
          <p className="text-sm font-medium text-black">No tasks found</p>
        )}
      </ul>
      <hr className="my-5 bg-black" />
    </div>
  );
};

export const MissionDetailsSkeleton = () => {
  return (
    <div className="my-4 h-full overflow-y-auto rounded-lg border-b border-neutral-200 bg-white p-6 shadow-lg">
      <div className="mb-4 h-8 w-3/4 rounded bg-gray-200"></div>
      <div className="mb-4 flex items-center">
        <div className="mr-3 size-10 rounded-full bg-gray-200"></div>
        <div className="h-6 w-24 rounded bg-gray-200"></div>
      </div>
      <div className="mb-4">
        <div className="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
        <div className="mb-2 h-4 w-2/3 rounded bg-gray-200"></div>
        <div className="h-4 w-1/3 rounded bg-gray-200"></div>
      </div>
      <div className="mb-6">
        <div className="h-2.5 w-full rounded-full bg-gray-200">
          <div className="h-2.5 w-1/2 rounded-full bg-gray-400"></div>
        </div>
        <div className="mt-1 h-4 w-1/3 rounded bg-gray-200"></div>
      </div>
      <div className="mb-4 h-6 w-1/4 rounded bg-gray-200"></div>
      <ul className="space-y-4">
        {[1, 2, 3].map((index) => (
          <li key={index} className="rounded-lg p-4 shadow">
            <div className="mb-2 flex items-center">
              <div className="mr-3 size-10 rounded-full bg-gray-200"></div>
              <div className="h-4 w-24 rounded bg-gray-200"></div>
            </div>
            <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
            <div className="mb-2 h-3 w-full rounded bg-gray-200"></div>
            <div className="ml-auto h-3 w-1/2 rounded bg-gray-200"></div>
          </li>
        ))}
      </ul>
    </div>
  );
};
