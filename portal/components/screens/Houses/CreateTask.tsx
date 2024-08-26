import { Grid } from '@mui/material';
import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { User } from '@prisma/client';
import { DatePicker } from '@mui/x-date-pickers';
import { pillOptions } from './CreateMissionFields';
import { PillSelector } from './PillSelector';

type AddTaskState = {
  title: string;
  description: string;
  indiePoints: number;
  userId: string;
  completedAt: Dayjs;
  expiresAt: Dayjs;
  isCompleted: boolean;
  isExpirable: boolean;
  userInfo: {
    avatar: string;
    name: string;
    email: string;
    id: string;
  };
};

type CreateTaskProps = {
  addTaskState: AddTaskState;
  setAddTaskState: React.Dispatch<React.SetStateAction<AddTaskState>>;
  houseMembers: User[];
};

const CreateTask = ({
  addTaskState,
  setAddTaskState,
  houseMembers,
}: CreateTaskProps) => {
  return (
    <>
      <Grid container spacing={3} className='pt-4'>
        <Grid item xs={12}>
          <label className='text-sm font-medium text-black' htmlFor='title'>
            Task Title
          </label>
          <input
            type='text'
            id='title'
            value={addTaskState.title}
            onChange={(e) =>
              setAddTaskState({
                ...addTaskState,
                title: e.target.value,
              })
            }
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
          <input
            type='text'
            id='description'
            value={addTaskState.description}
            onChange={(e) =>
              setAddTaskState({
                ...addTaskState,
                description: e.target.value,
              })
            }
            className='w-full px-4 py-2 border border-gray-300 rounded-md'
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
            value={addTaskState.indiePoints}
            onChange={(e) =>
              setAddTaskState({
                ...addTaskState,
                indiePoints: parseInt(e.target.value, 10),
              })
            }
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
            value={addTaskState.userId}
            onChange={(e) => {
              const selectedUserId = e.target.value;
              const selectedUser = houseMembers.find(
                (user) => user.id === selectedUserId
              );

              setAddTaskState((prevState) => ({
                ...prevState,
                userId: selectedUserId,
                userInfo: selectedUser
                  ? {
                      avatar: selectedUser.avatar ?? '',
                      name: selectedUser.name ?? '',
                      email: selectedUser.email ?? '',
                      id: selectedUser.id ?? '',
                    }
                  : {
                      avatar: '',
                      name: '',
                      email: '',
                      id: '',
                    },
              }));
            }}
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
            value={addTaskState.completedAt}
            onChange={(newValue) =>
              setAddTaskState({
                ...addTaskState,
                completedAt: newValue || dayjs(),
              })
            }
            className='w-full'
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DatePicker
            label='Expires At'
            value={addTaskState.expiresAt}
            onChange={(newValue) =>
              setAddTaskState({
                ...addTaskState,
                expiresAt: newValue || dayjs(),
              })
            }
            className='w-full'
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <PillSelector
            label='Is Task Completed'
            options={pillOptions}
            selectedValue={addTaskState.isCompleted}
            onChange={(value) =>
              setAddTaskState({ ...addTaskState, isCompleted: value })
            }
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <PillSelector
            label='Is Task Expirable'
            options={pillOptions}
            selectedValue={addTaskState.isExpirable}
            onChange={(value) =>
              setAddTaskState({ ...addTaskState, isExpirable: value })
            }
          />
        </Grid>
      </Grid>
    </>
  );
};

export default CreateTask;
