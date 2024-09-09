/* eslint-disable @next/next/no-img-element */

import React, { useMemo } from "react";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { calculateMissionStat } from "./MissionsList";
import { Mission, MissionTask } from "@prisma/client";
import { IconButton } from "@mui/material";
import {
  setActiveTab,
  setEditingMission,
  setEditingTask,
  setEditorModalOpen,
} from "@/utils/redux/missions/missionTaskEditorSlice.slice";

export const MissionDetails = ({ loading }: { loading: boolean }) => {
  const dispatch = useAppDispatch();
  const { mission, missions, isOpen, missionsLoading } = useAppSelector(
    (state: RootState) => state.selectedMission
  );
  const { tasks, tasksLoading } = useAppSelector(
    (state: RootState) => state.missionsTasks
  );

  const missionTasks = tasks?.filter((t) => t?.missionId === mission?.id);

  if (tasksLoading || missionsLoading) {
    return <MissionDetailsSkeleton />;
  }

  if (missions?.length === 0) {
    return <div className="text-center text-lg py-4">No missions found</div>;
  }

  if (missions && missions.length > 0 && !mission) {
    return (
      <div className="text-center text-3xl">Select mission to see details</div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 h-[96vh] overflow-y-scroll my-4 border-b border-neutral-200 
      `}
    >
      {isOpen ? (
        <div className="flex flex-col gap-6">
          {missions?.map((mission: Mission) =>
            MissionComponent(mission, missionTasks)
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold ">{mission?.title}</h2>
            <IconButton
              onClick={() => {
                dispatch(setEditingMission(mission));
                dispatch(setActiveTab("missions"));
                dispatch(setEditorModalOpen(true));
              }}
            >
              <span className="material-symbols-outlined">edit_document</span>{" "}
            </IconButton>
          </div>
          <h3 className="text-xl font-semibold mb-4">Tasks</h3>
          <ul className="space-y-4">
            {missionTasks.length > 0 ? (
              missionTasks?.map((task: any) => (
                <li
                  key={task.id}
                  className="rounded-lg p-4 shadow shadow-gray-300"
                >
                  <div className="flex items-center mb-2">
                    <img
                      src={task.avatar || "/icons/placeholderAvatar.svg"}
                      alt={task.name}
                      className="w-10 h-10 object-cover rounded-full mr-3"
                    />
                    <span className="font-semibold">
                      {task.name || "Unknown"}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2 font-bold">{task.title}</p>
                  <p className="text-gray-700 mb-2 text-sm line-clamp-3">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-right font-medium text-blue-600 text-sm">
                      {task.indiePoints} Indie Points
                    </p>
                    <IconButton
                      onClick={() => {
                        dispatch(setEditingTask(task));
                        dispatch(setEditorModalOpen(true));
                        dispatch(setActiveTab("tasks"));
                      }}
                    >
                      <span className="material-symbols-outlined">
                        edit_document
                      </span>{" "}
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
  missionTasks: MissionTask[]
): any => {
  const filteredTasks = missionTasks.filter(
    (task: any) => task.missionId === mission.id
  );
  return (
    <div className="">
      <h2 className="text-2xl font-bold mb-4">{mission.title}</h2>
      <ul className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks?.map((task: any, index: number) => (
            <li key={`${task.id}-${index}`} className="rounded-lg p-4 shadow ">
              <div className="flex items-center mb-2">
                <img
                  src={task.avatar || "/icons/placeholderAvatar.svg"}
                  alt={task.name}
                  className="w-10 h-10 object-cover rounded-full mr-3"
                />
                <span className="font-semibold">{task.name || "Unknown"}</span>
              </div>
              <p className="text-gray-700 mb-2 font-bold">{task.title}</p>
              <p className="text-gray-700 mb-2 text-sm">{task.description}</p>
              <p className="text-right font-medium text-blue-600 text-sm">
                {task.indiePoints} Indie Points
              </p>
            </li>
          ))
        ) : (
          <p className="text-sm font-medium text-black">No tasks found</p>
        )}
      </ul>
      <hr className="my-5 bg-black " />
    </div>
  );
};

export const MissionDetailsSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto my-4 border-b border-neutral-200">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="mb-4">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-gray-400 h-2.5 rounded-full w-1/2"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-1"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <ul className="space-y-4">
        {[1, 2, 3].map((index) => (
          <li key={index} className="rounded-lg p-4 shadow">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 ml-auto"></div>
          </li>
        ))}
      </ul>
    </div>
  );
};
