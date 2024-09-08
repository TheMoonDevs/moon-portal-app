import React, { useEffect, useState } from 'react';
import { Box, Modal, IconButton, Button, Grid } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { User, MissionTask, Mission } from '@prisma/client';
import CreateTask from './CreateTask';
import CreateMissionFields from './CreateMissionFields';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { useUser } from '@/utils/hooks/useUser';
import { toast, Toaster } from 'sonner';
import { Spinner } from '@/components/elements/Loaders';
import { initialMissionState, initialTaskState } from './state';
import {
  setEditorModalOpen,
  clearEditorState,
} from '@/utils/redux/missions/missionTaskEditorSlice.slice';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';

const CreateMission = ({
  houseMembers,
  activeTab,
}: {
  houseMembers: User[];
  activeTab: string;
}) => {
  const { isEditorModalOpen, editingMission, editingTask } = useAppSelector(
    (state: RootState) => state.missionTaskEditor
  );
  const [missionState, setMissionState] = useState<Partial<Mission>>(
    editingMission || initialMissionState
  );
  const [taskState, setTaskState] = useState(editingTask || initialTaskState);
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setMissionState(editingMission || initialMissionState);
    setTaskState(editingTask || initialTaskState);
  }, [editingMission, editingTask]);

  const handleSubmit = async () => {
    const missionData = {
      ...missionState,
      vertical: user?.vertical || null,
      month: dayjs().format('YYYY-MM'),
      completedAt:
        missionState.completedAt !== editingMission?.completedAt
          ? missionState.completedAt
            ? missionState.completedAt.toISOString()
            : null
          : missionState.completedAt,
      expiresAt:
        missionState.expiresAt !== editingMission?.expiresAt
          ? missionState.expiresAt
            ? missionState.expiresAt.toISOString()
            : null
          : missionState.expiresAt,
    };
    setLoading(true);
    try {
      let res;
      if (missionState.id) {
        res = await PortalSdk.putData(`/api/missions`, missionData);
        toast.success('Mission updated successfully!');
      } else {
        res = await PortalSdk.postData('/api/missions', missionData);
        toast.success('Mission created successfully!');
      }
      setLoading(false);
      dispatch(clearEditorState());
      dispatch(setEditorModalOpen(false));
      toast.success('Mission and tasks created successfully!');
    } catch (error) {
      console.error('Error creating mission:', error);
      setLoading(false);
      toast.error('Failed to create mission');
      dispatch(setEditorModalOpen(false));
      dispatch(clearEditorState());
    }
  };

  const handleCreateTask = async () => {
    const taskData = {
      ...taskState,
      indiePoints: Number(taskState.indiePoints) || 0,
      completedAt:
        taskState.completedAt !== editingTask?.completedAt
          ? taskState.completedAt
            ? taskState.completedAt.toISOString()
            : null
          : taskState.completedAt,
      expiresAt:
        taskState.expiresAt !== editingTask?.expiresAt
          ? taskState.expiresAt
            ? taskState.expiresAt.toISOString()
            : null
          : taskState.expiresAt,
    };
    setLoading(true);
    try {
      let res;
      if (taskState.id) {
        res = await PortalSdk.putData(`/api/mission-tasks`, taskData);
        toast.success('Task updated successfully!');
      } else {
        res = await PortalSdk.postData('/api/mission-tasks', taskState);
        toast.success('Task created successfully!');
      }
      setLoading(false);
      dispatch(clearEditorState());
      dispatch(setEditorModalOpen(false));
    } catch (error) {
      console.error('Error creating tasks:', error);
      setLoading(false);
      toast.error('Failed to create tasks');
      dispatch(setEditorModalOpen(false));
      dispatch(setEditorModalOpen(false));
    }
  };

  return (
    <>
      <Modal
        open={isEditorModalOpen}
        onClose={() => {
          dispatch(clearEditorState());
          dispatch(setEditorModalOpen(false));
        }}
        aria-labelledby='modal-modal-title'
        aria-describedby='modal-modal-description'
        disableEnforceFocus
      >
        <Box
          className='w-full max-w-2xl bg-white rounded-lg p-8 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-lg overflow-y-auto no-scrollbar outline-none'
          sx={{
            maxHeight: '80vh',
            position: 'relative',
            overflowY: 'auto',
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <IconButton
              onClick={() => {
                dispatch(clearEditorState());
                dispatch(setEditorModalOpen(false));
              }}
              className='absolute top-4 right-4 bg-gray-300 hover:bg-gray-200 rounded-full flex items-center justify-center w-8 h-8 shadow-lg'
              sx={{ position: 'absolute' }}
            >
              <span className='material-symbols-outlined text-black'>
                close
              </span>
            </IconButton>
            {activeTab === 'missions' && (
              <>
                <CreateMissionFields
                  state={missionState}
                  setState={setMissionState}
                />
                <Button
                  fullWidth
                  variant='contained'
                  color='primary'
                  sx={{ py: 2 }}
                  onClick={handleSubmit}
                >
                  {loading ? (
                    <Spinner className='w-6 h-6  text-white' />
                  ) : missionState.id ? (
                    'Update Mission'
                  ) : (
                    'Create Mission'
                  )}
                </Button>
              </>
            )}
            {activeTab === 'tasks' && (
              <>
                <CreateTask
                  taskState={taskState}
                  setTaskState={setTaskState}
                  houseMembers={houseMembers}
                />
                <Button
                  fullWidth
                  variant='contained'
                  color='primary'
                  sx={{ py: 2, mt: 2 }}
                  onClick={handleCreateTask}
                  disabled={
                    !taskState.title?.trim() ||
                    !taskState.description?.trim() ||
                    !taskState.missionId
                  }
                >
                  {loading ? (
                    <Spinner className='w-6 h-6  text-white' />
                  ) : taskState.id ? (
                    'Update Task'
                  ) : (
                    'Create Task'
                  )}
                </Button>
              </>
            )}
          </LocalizationProvider>
        </Box>
      </Modal>
      <Toaster richColors duration={3000} closeButton position='bottom-right' />
    </>
  );
};

export default CreateMission;
