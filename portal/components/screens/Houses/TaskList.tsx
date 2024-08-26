import { MissionTask } from '@/prisma/missionTasks';
import { RootState, useAppSelector } from '@/utils/redux/store';
import React from 'react';
import { Avatar } from '@mui/material';
import dayjs from 'dayjs';

const isMissionTaskArray = (value: any): value is MissionTask[] => {
  return (
    Array.isArray(value) &&
    value.every(
      (task) =>
        typeof task.title === 'string' && typeof task.indiePoints === 'number'
    )
  );
};

const formatDate = (date?: Date | null) => {
  if (!date) return 'Unknown';
  return dayjs(date).format('DD/MM/YYYY');
};

const renderAvatar = (userInfo?: { avatar: string; name: string }) => {
  if (userInfo?.avatar) {
    return <Avatar src={userInfo.avatar} />;
  } else {
    return <Avatar>{userInfo?.name.charAt(0) || 'U'}</Avatar>;
  }
};

const TasksList = () => {
  const missions = useAppSelector(
    (state: RootState) => state.selectedMission.missions
  );

  const allTasks: MissionTask[] = [];

  if (missions) {
    allTasks.length = 0; 
    missions.forEach((mission) => {
      if (isMissionTaskArray(mission.tasks)) {
        allTasks.push(...mission.tasks);
      }
    });
  }

  return (
    <div className='p-6'>
      {allTasks.length > 0 ? (
        allTasks.map((task, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 p-4 border rounded-lg my-2 ${
              task.completed
                ? 'bg-gray-200 border-green-400'
                : 'bg-white border-gray-300 cursor-pointer hover:bg-gray-50'
            }`}
          >
            <div className='flex flex-row items-center gap-3'>
              {renderAvatar(task.userInfo)}
              <div className='flex flex-col flex-grow'>
                <h4 className='text-lg font-semibold text-gray-800'>
                  {task.title}
                </h4>
                <p className='text-sm text-gray-600'>
                  {task.userInfo ? (
                    <>
                      <strong>Assignee:</strong> {task.userInfo.name}
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
                    <span className='material-symbols-outlined'>task_alt</span>{' '}
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
};

export default TasksList;
