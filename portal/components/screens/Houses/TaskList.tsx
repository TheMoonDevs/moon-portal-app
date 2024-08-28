import { RootState, useAppSelector } from '@/utils/redux/store';
import React from 'react';
import { Avatar } from '@mui/material';
import dayjs from 'dayjs';
import { Mission, MissionTask } from '@prisma/client';
import { HOUSES_LIST } from './HousesList';

const formatDate = (date?: Date | null) => {
  if (!date) return 'Unknown';
  return dayjs(date).format('DD/MM/YYYY');
};

const renderAvatar = (avatar: string | null, name: string | null) =>
  avatar ? <Avatar src={avatar} /> : <Avatar>{name?.charAt(0) || 'U'}</Avatar>;

const TasksList = React.memo(
  ({ currentHouseIndex }: { currentHouseIndex: number }) => {
    const tasks = useAppSelector(
      (state: RootState) => state.missionsTasks.tasks
    );
    const missions = useAppSelector(
      (state: RootState) => state.selectedMission.missions
    );
    const currentHouseMissions =
      missions?.filter(
        (mission: Mission) =>
          mission.house === HOUSES_LIST[currentHouseIndex]?.id
      ) || [];

    const currentMissionIds = currentHouseMissions.map(
      (mission: Mission) => mission.id
    );

    const filteredTasks = tasks.filter((task) =>
      currentMissionIds.includes(task.missionId)
    );

    return (
      <div className='p-6'>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task: MissionTask, i: number) => (
            <div
              key={task.id}
              className={`flex flex-col gap-2 p-4 border rounded-lg my-2 ${
                task.completed
                  ? 'bg-gray-200 border-green-400'
                  : 'bg-white border-gray-300 cursor-pointer hover:bg-gray-50'
              }`}
            >
              <div className='flex flex-row items-center gap-3'>
                {renderAvatar(task?.avatar, task.name)}
                <div className='flex flex-col flex-grow'>
                  <h4 className='text-lg font-semibold text-gray-800'>
                    {task.title}
                  </h4>
                  <p className='text-sm text-gray-600'>
                    {task.name ? (
                      <>
                        <strong>Assignee:</strong> {task.name}
                      </>
                    ) : (
                      'Not assigned'
                    )}
                  </p>
                </div>
                <div className='flex flex-col items-start gap-1'>
                  <p className='text-sm text-gray-600 flex flex-row items-center gap-1'>
                    <span className='material-symbols-outlined'>schedule</span>{' '}
                    Expires: {formatDate(task.expiresAt)}
                  </p>
                  {task.completed && task.completedAt && (
                    <p className='text-sm text-gray-600 flex flex-row items-center gap-1'>
                      <span className='material-symbols-outlined'>
                        task_alt
                      </span>{' '}
                      Completed: {formatDate(task.completedAt)}
                    </p>
                  )}
                </div>
              </div>
              {task.completed && (
                <div className='w-full h-[4px] bg-green-500 rounded-md'></div>
              )}
            </div>
          ))
        ) : (
          <div className='text-gray-500 py-4 flex justify-center items-center'>
            No Tasks Found
          </div>
        )}
      </div>
    );
  }
);

TasksList.displayName = 'TasksList';

export default TasksList;
