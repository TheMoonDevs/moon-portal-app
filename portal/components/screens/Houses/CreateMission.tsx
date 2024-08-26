import React, { useState } from 'react';
import { Box, Modal, IconButton, Button, Grid } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { User } from '@prisma/client';
import { MissionTask } from '@/prisma/missionTasks';
import CreateTask from './CreateTask';
import CreateMissionFields from './CreateMissionFields';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Tasks from './Tasks';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { useUser } from '@/utils/hooks/useUser';
import { toast, Toaster } from 'sonner';
import { Spinner } from '@/components/elements/Loaders';

const CreateMission = ({
  isOpen,
  onClose,
  houseMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  houseMembers: User[];
}) => {
  const [state, setState] = useState({
    title: '',
    house: '',
    housePoints: 0,
    indiePoints: 0,
    completedAt: dayjs(new Date()),
    expiresAt: dayjs(new Date()),
    isCompleted: false,
    isExpirable: true,
    todoMarkdown: '*',
    tasks: [] as MissionTask[],
  });
  const [showTaskFields, setShowTaskFields] = useState(false);
  const [addTaskState, setAddTaskState] = useState({
    title: '',
    description: '',
    indiePoints: 0,
    userId: '',
    completedAt: dayjs(new Date()),
    expiresAt: dayjs(new Date()),
    isCompleted: false,
    isExpirable: true,
    userInfo: {
      avatar: '',
      name: '',
      email: '',
      id: '',
    },
  });
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
      completedAt: state.completedAt ? state.completedAt.toISOString() : null,
      expirable: state.isExpirable ?? true,
      expiresAt: state.expiresAt ? state.expiresAt.toISOString() : null,
      tasks:
        state.tasks.length > 0
          ? state.tasks.map((task: MissionTask) => ({
              ...task,
              indiePoints: Number(task.indiePoints),
              completedAt: task.completedAt
                ? task.completedAt.toISOString()
                : null,
              expiresAt: task.expiresAt ? task.expiresAt.toISOString() : null,
            }))
          : undefined,
    };

    setLoading(true);
    try {
      const res = await PortalSdk.postData('/api/missions', missionData);
      console.log('Mission created:', res);
      setLoading(false);
      onClose();
      setState({
        title: '',
        house: '',
        housePoints: 0,
        indiePoints: 0,
        completedAt: dayjs(new Date()),
        expiresAt: dayjs(new Date()),
        isCompleted: false,
        isExpirable: true,
        todoMarkdown: '*',
        tasks: [] as MissionTask[],
      });
      toast.success('Mission created successfully!');
    } catch (error) {
      console.error('Error creating mission:', error);
      setLoading(false);
      toast.error('Failed to create mission');
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

    const newTask: MissionTask = {
      title,
      description,
      indiePoints: Number(indiePoints),
      userId,
      completedAt: completedAt?.toDate(),
      completed: isCompleted,
      expiresAt: expiresAt?.toDate(),
      expirable: isExpirable,
      userInfo,
    };

    setState((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    setShowTaskFields(false);

    setAddTaskState({
      title: '',
      description: '',
      indiePoints: 0,
      userId: '',
      completedAt: dayjs(),
      expiresAt: dayjs(),
      isCompleted: false,
      isExpirable: true,
      userInfo: { avatar: '', name: '', email: '', id: '' },
    });
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
