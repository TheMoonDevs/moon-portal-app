import { Grid } from '@mui/material';
import React, { useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { Mission, MissionTask, User } from '@prisma/client';
import { DatePicker } from '@mui/x-date-pickers';
import { pillOptions } from './CreateMissionFields';
import { PillSelector } from './PillSelector';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';

type taskState = {
  missionId: string;
  userId: string | null;
  title: string | null;
  description: string | null;
  indiePoints: number;
  completedAt: Dayjs | null | Date;
  completed: boolean | null;
  expirable: boolean | null;
  expiresAt: Dayjs | null | Date;
  avatar: string | null;
  name: string | null;
  email: string | null;
  userInfoId: string | null;
};

type CreateTaskProps = {
  taskState: Partial<MissionTask>;
  setTaskState: React.Dispatch<React.SetStateAction<Partial<MissionTask>>>;
  houseMembers: User[];
};

const CreateTask = ({
  taskState,
  setTaskState,
  houseMembers,
}: CreateTaskProps) => {
  const missions = useAppSelector(
    (state: RootState) => state.selectedMission?.missions
  );

  const handleInputChange = useCallback(
    (key: keyof taskState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTaskState((prevState) => ({
          ...prevState,
          [key]:
            key === 'indiePoints'
              ? parseInt(e.target.value, 10)
              : e.target.value,
        }));
      },
    [setTaskState]
  );

  const handleUserChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedUserId = e.target.value;
      const selectedUser = houseMembers.find(
        (user) => user.id === selectedUserId
      );

      setTaskState((prevState) => ({
        ...prevState,
        userId: selectedUserId,
        avatar: selectedUser?.avatar || '',
        name: selectedUser?.name || '',
        email: selectedUser?.email || '',
        userInfoId: selectedUser?.id || '',
      }));
    },
    [setTaskState, houseMembers]
  );

  const handleMissionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedMissionId = e.target.value;

      setTaskState((prevState) => ({
        ...prevState,
        missionId: selectedMissionId,
      }));
    },
    [setTaskState]
  );

  return (
    <>
      <Grid container spacing={3} className='pt-4'>
        <Grid item xs={12}>
          <label className='text-sm font-medium text-black' htmlFor='title'>
            Select Mission
          </label>
          <select
            id='select-mission'
            value={taskState.missionId}
            onChange={handleMissionChange}
            className='w-full px-4 py-2 border border-gray-300 rounded-md'
          >
            <option value='' disabled>
              Select Mission
            </option>
            {missions?.map((mission: Mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.title}
              </option>
            ))}
          </select>
        </Grid>
        <Grid item xs={12}>
          <label className='text-sm font-medium text-black' htmlFor='title'>
            Task Title
          </label>
          <input
            type='text'
            id='title'
            value={taskState.title || ''}
            onChange={handleInputChange('title')}
            className='w-full px-4 py-2 border border-gray-300 rounded-md'
          />
        </Grid>
        <Grid item xs={12}>
          <label
            className='text-sm font-medium text-black'
            htmlFor='description'
          >
            Task Description
          </label>
          <textarea
            id='description'
            value={taskState.description || ''}
            onChange={handleInputChange('description')}
            className='w-full px-4 py-2 border border-gray-300 rounded-md h-[150px]'
            style={{ resize: 'none', maxHeight: '200px' }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <label
            className='text-sm font-medium text-black'
            htmlFor='indie-points'
          >
            Task Indie Points
          </label>
          <input
            type='number'
            id='indie-points'
            value={taskState.indiePoints}
            onChange={handleInputChange('indiePoints')}
            className='w-full px-4 py-2 border border-gray-300 rounded-md'
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <label
            className='text-sm font-medium text-black'
            htmlFor='select-user'
          >
            Select User to Assign Task
          </label>
          <select
            id='select-user'
            value={taskState.userId || ''}
            onChange={handleUserChange}
            className='w-full px-4 py-2 border border-gray-300 rounded-md'
          >
            <option value='' disabled>
              Select User
            </option>
            {houseMembers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </Grid>
        <Grid item xs={12} sm={6}>
          <DatePicker
            label='Completed At'
            value={taskState.completedAt ? dayjs(taskState.completedAt) : null}
            onChange={(newValue) =>
              setTaskState({
                ...taskState,
                completedAt: newValue ? newValue.toDate() : null,
              })
            }
            className='w-full'
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DatePicker
            label='Expires At'
            value={taskState.expiresAt ? dayjs(taskState.expiresAt) : null}
            onChange={(newValue) =>
              setTaskState({
                ...taskState,
                expiresAt: newValue ? newValue.toDate() : null,
              })
            }
            className='w-full'
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <PillSelector
            label='Is Task Completed'
            options={pillOptions}
            selectedValue={taskState.completed}
            onChange={(value) =>
              setTaskState({ ...taskState, completed: value })
            }
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <PillSelector
            label='Is Task Expirable'
            options={pillOptions}
            selectedValue={taskState.expirable}
            onChange={(value) =>
              setTaskState({ ...taskState, expirable: value })
            }
          />
        </Grid>
      </Grid>
    </>
  );
};

export default CreateTask;
