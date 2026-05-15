import type { Mission, User } from '@db/client';
import { Box, Button, IconButton, Modal } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { Spinner } from '@/components/elements/Loaders';
import { useUser } from '@/utils/hooks/useUser';
import {
  clearEditorState,
  setEditModalOpen,
} from '@/utils/redux/missions/mission.ui.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';

import CreateMissionFields from './CreateMissionFields';
import CreateTask from './CreateTask';
import { initialMissionState, initialTaskState } from './state';

const CreateMission = ({
  houseMembers,
  activeTab,
}: {
  houseMembers: User[];
  activeTab: string;
}) => {
  const { isEditModalOpen } = useAppSelector(
    (state: RootState) => state.missionUi,
  );

  const { activeMission } = useAppSelector((state: RootState) => state.mission);
  const { activeTask } = useAppSelector(
    (state: RootState) => state.missionsTasks,
  );
  const [missionState, setMissionState] = useState<Partial<Mission>>(
    activeMission || initialMissionState,
  );
  const [taskState, setTaskState] = useState(activeTask || initialTaskState);
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setMissionState(activeMission || initialMissionState);
    setTaskState(activeTask || initialTaskState);
  }, [activeMission, activeTask]);

  const handleSubmit = async () => {
    const missionData = {
      ...missionState,
      vertical: user?.vertical || null,
      month: dayjs().format('YYYY-MM'),
      completedAt:
        missionState.completedAt !== activeMission?.completedAt
          ? missionState.completedAt
            ? missionState.completedAt.toISOString()
            : null
          : missionState.completedAt,
      expiresAt:
        missionState.expiresAt !== activeMission?.expiresAt
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
      dispatch(setEditModalOpen(false));
    } catch (error) {
      console.error('Error creating mission:', error);
      setLoading(false);
      toast.error('Failed to create mission');
      dispatch(setEditModalOpen(false));
      dispatch(clearEditorState());
    }
  };

  const handleCreateTask = async () => {
    const taskData = {
      ...taskState,
      indiePoints: Number(taskState.indiePoints) || 0,
      completedAt:
        taskState.completedAt !== activeTask?.completedAt
          ? taskState.completedAt
            ? taskState.completedAt.toISOString()
            : null
          : taskState.completedAt,
      expiresAt:
        taskState.expiresAt !== activeTask?.expiresAt
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
      dispatch(setEditModalOpen(false));
    } catch (error) {
      console.error('Error creating tasks:', error);
      setLoading(false);
      toast.error('Failed to create tasks');
      dispatch(setEditModalOpen(false));
    }
  };

  return (
    <>
      <Modal
        open={isEditModalOpen}
        onClose={() => {
          dispatch(clearEditorState());
          dispatch(setEditModalOpen(false));
        }}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        disableEnforceFocus
      >
        <Box
          className="no-scrollbar fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-8 shadow-lg outline-none"
          sx={{
            maxHeight: '80vh',
            position: 'relative',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <IconButton
              onClick={() => {
                dispatch(clearEditorState());
                dispatch(setEditModalOpen(false));
              }}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-gray-300 shadow-md hover:bg-gray-200"
              sx={{ position: 'absolute', transition: 'all 0.3s ease-in-out' }}
            >
              <span className="material-symbols-outlined text-lg text-black">
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
                  variant="contained"
                  color="primary"
                  sx={{
                    py: 2,
                    mt: 4,
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={handleSubmit}
                >
                  {loading ? (
                    <Spinner className="size-6 text-white" />
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
                  variant="contained"
                  color="primary"
                  sx={{
                    py: 2,
                    mt: 4,
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={handleCreateTask}
                  disabled={
                    !taskState.title?.trim() ||
                    !taskState.description?.trim() ||
                    !taskState.missionId
                  }
                >
                  {loading ? (
                    <Spinner className="size-6 text-white" />
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
      <Toaster richColors duration={3000} closeButton position="bottom-right" />
    </>
  );
};

export default CreateMission;
