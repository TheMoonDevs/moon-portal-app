import type { Mission, MissionTask } from '@db/client';
import { Avatar } from '@mui/material';
import dayjs from 'dayjs';
import React from 'react';

import type { RootState } from '@/utils/redux/store';
import { useAppSelector } from '@/utils/redux/store';

import { HOUSES_LIST } from './HousesList';

const formatDate = (date?: Date | null) => {
  if (!date) return 'Unknown';
  return dayjs(date).format('DD/MM/YYYY');
};

const renderAvatar = (avatar: string | null, name: string | null) =>
  avatar ? <Avatar src={avatar} /> : <Avatar>{name?.charAt(0) || 'U'}</Avatar>;

const TasksList = React.memo(
  ({ currentHouseIndex }: { currentHouseIndex: number }) => {
    const { allTasks } = useAppSelector(
      (state: RootState) => state.missionsTasks,
    );
    const { allMissions } = useAppSelector((state: RootState) => state.mission);
    const currentHouseMissions =
      allMissions?.filter(
        (mission: Mission) =>
          mission.house === HOUSES_LIST[currentHouseIndex]?.id,
      ) || [];

    const currentMissionIds = currentHouseMissions.map(
      (mission: Mission) => mission.id,
    );

    const filteredTasks = allTasks.filter((task) =>
      currentMissionIds.includes(task.missionId),
    );

    return (
      <div className="p-6">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task: MissionTask, i: number) => (
            <div
              key={task.id}
              className={`my-2 flex flex-col gap-2 rounded-lg border p-4 ${
                task.completed
                  ? 'border-green-400 bg-gray-200'
                  : 'cursor-pointer border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-row items-center gap-3">
                {renderAvatar(task?.avatar, task.name)}
                <div className="flex grow flex-col">
                  <h4 className="text-lg font-semibold text-gray-800">
                    {task.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {task.name ? (
                      <>
                        <strong>Assignee:</strong> {task.name}
                      </>
                    ) : (
                      'Not assigned'
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <p className="flex flex-row items-center gap-1 text-sm text-gray-600">
                    <span className="material-symbols-outlined">schedule</span>{' '}
                    Expires: {formatDate(task.expiresAt)}
                  </p>
                  {task.completed && task.completedAt && (
                    <p className="flex flex-row items-center gap-1 text-sm text-gray-600">
                      <span className="material-symbols-outlined">
                        task_alt
                      </span>{' '}
                      Completed: {formatDate(task.completedAt)}
                    </p>
                  )}
                </div>
              </div>
              {task.completed && (
                <div className="h-[4px] w-full rounded-md bg-green-500"></div>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-4 text-gray-500">
            No Tasks Found
          </div>
        )}
      </div>
    );
  },
);

TasksList.displayName = 'TasksList';

export default TasksList;
