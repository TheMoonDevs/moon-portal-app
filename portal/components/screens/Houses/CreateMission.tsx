import React, { useState } from 'react';
import { Box, Modal, IconButton, Button, Grid } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { User, MissionTask } from '@prisma/client';
import CreateTask from './CreateTask';
import CreateMissionFields from './CreateMissionFields';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Tasks from './Tasks';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { useUser } from '@/utils/hooks/useUser';
import { toast, Toaster } from 'sonner';
import { Spinner } from '@/components/elements/Loaders';
import { initialAddTaskState, initialState } from './state';

const CreateMission = ({
  isOpen,
  onClose,
  houseMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  houseMembers: User[];
}) => {
  const [state, setState] = useState(initialState);
  const [showTaskFields, setShowTaskFields] = useState(false);
  const [addTaskState, setAddTaskState] = useState(initialAddTaskState);
  const { user } = useUser();
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    const missionData = {
      title: state.title,
      description: state.todoMarkdown || null,
      vertical: user ? user.vertical : null,
      house: state.house,
      month: dayjs().format('YYYY-MM'),
      completed: state.isCompleted ?? false,
      housePoints: Number(state.housePoints),
      indiePoints: Number(state.indiePoints),
      completedAt: state.completedAt
        ? state.completedAt.toISOString()
        : undefined,
      expirable: state.isExpirable ?? true,
      expiresAt: state.expiresAt ? state.expiresAt.toISOString() : undefined,
    };

    setLoading(true);
    try {
      const res = await PortalSdk.postData('/api/missions', missionData);
      console.log('Mission created:', res);

      if (state.tasks.length > 0 && res.data.mission.id) {
        const tasksData = state.tasks.map((task: MissionTask) => ({
          title: task.title || '',
          description: task.description || '',
          indiePoints: Number(task.indiePoints),
          completedAt: task.completedAt ? task.completedAt.toISOString() : null,
          expiresAt: task.expiresAt ? task.expiresAt.toISOString() : null,
          missionId: res.data.mission.id,
          userId: task.userId || '',
          expirable: task.expirable ?? false,
          avatar: task.avatar || '',
          name: task.name || null,
          email: task.email || null,
          userInfoId: task.userInfoId || null,
        }));

        await Promise.all(
          tasksData.map(async (taskData) => {
            await PortalSdk.postData('/api/mission-tasks', taskData);
          })
        );
      }

      setLoading(false);
      onClose();
      setState(initialState);
      toast.success('Mission and tasks created successfully!');
    } catch (error) {
      console.error('Error creating mission or tasks:', error);
      setLoading(false);
      toast.error('Failed to create mission or tasks');
    }
  };

  const handleAddTask = () => {
    const {
      title,
      description,
      indiePoints,
      userId,
      completedAt,
      isCompleted,
      expiresAt,
      isExpirable,
      userInfo,
    } = addTaskState;

    if (!title.trim() || !description.trim()) return;

    const newTask = {
      title,
      description,
      indiePoints: Number(indiePoints),
      userId,
      completedAt: completedAt?.toDate() || undefined,
      completed: isCompleted,
      expiresAt: expiresAt?.toDate() || undefined,
      expirable: isExpirable,
      userInfoId: userInfo?.id || undefined,
      avatar: userInfo?.avatar || undefined,
      name: userInfo?.name || undefined,
      email: userInfo?.email || undefined,
    };

    setState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask as MissionTask],
    }));
    setShowTaskFields(false);
    setAddTaskState(initialAddTaskState);
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
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
              onClick={onClose}
              className='absolute top-4 right-4 bg-gray-300 hover:bg-gray-200 rounded-full flex items-center justify-center w-8 h-8 shadow-lg'
              sx={{ position: 'absolute' }}
            >
              <span className='material-symbols-outlined text-black'>
                close
              </span>
            </IconButton>
            <CreateMissionFields state={state} setState={setState} />
            {!showTaskFields && (
              <Button
                variant='contained'
                color='primary'
                sx={{ py: 1, my: 3 }}
                onClick={() => setShowTaskFields(true)}
              >
                Add Task
              </Button>
            )}
            {showTaskFields && (
              <>
                <CreateTask
                  addTaskState={addTaskState}
                  setAddTaskState={setAddTaskState}
                  houseMembers={houseMembers}
                />
                <Button
                  fullWidth
                  variant='contained'
                  color='primary'
                  sx={{ py: 2, my: 2 }}
                  onClick={handleAddTask}
                  disabled={
                    !addTaskState.title.trim() ||
                    !addTaskState.description.trim()
                  }
                >
                  Add Task
                </Button>
              </>
            )}
            {state.tasks.length > 0 && (
              <Tasks tasks={state.tasks} setState={setState} />
            )}
            <Button
              fullWidth
              variant='contained'
              color='primary'
              sx={{ py: 2 }}
              onClick={handleSubmit}
            >
              {loading ? (
                <Spinner className='w-6 h-6  text-white' />
              ) : (
                'Create Mission'
              )}
            </Button>
          </LocalizationProvider>
        </Box>
      </Modal>
      <Toaster richColors duration={3000} closeButton position='bottom-right' />
    </>
  );
};

export default CreateMission;
