// import { MissionTask } from "@/prisma/missionTasks";
import {
  Box,
  Button,
  Checkbox,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import type { Mission, MissionTask, User } from '@prisma/client';
import dayjs from 'dayjs';
import { Loader, Plus, Save, Trash2, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

export const MissionTasks = ({
  mission,
  setShow,
  setMission,
  tasks,
  tasksLoading,
  coreTeam,
}: {
  mission: Mission & { tasks?: MissionTask[] };
  setShow: Dispatch<SetStateAction<boolean>>;
  setMission: Dispatch<SetStateAction<Mission & { tasks?: MissionTask[] }>>;
  tasks: MissionTask[];
  coreTeam: User[];
  tasksLoading: boolean;
}) => {
  const [savingTask, setSavingTask] = useState<boolean>(false);
  const [deletingTask, setDeletingTask] = useState<boolean>(false);

  const setSelectedTask = useCallback(
    (index: number, callback: (task: MissionTask) => MissionTask) => {
      setMission((m) => {
        if (!m) return m;
        return {
          ...m,
          tasks: (m.tasks || [])?.map((task, i) =>
            i === index ? callback(task) : task,
          ),
        };
      });
    },
    [setMission],
  );

  const deleteSelectedTask = useCallback(
    (index: number) => {
      setMission((m) => {
        if (!m) return m;
        return {
          ...m,
          tasks: (m.tasks || []).filter((_, i) => i !== index),
        };
      });
    },
    [setMission],
  );

  const addNewTask = useCallback(() => {
    setMission((m) => {
      if (!m) return m;
      return {
        ...m,
        tasks: [
          ...((m.tasks || []) as MissionTask[]),
          {
            title: 'New Task',
            description: 'New Task Description',
            indiePoints: 100,
            expirable: true,
            expiresAt: dayjs().add(1, 'day').toDate(),
            completed: false,
          } as MissionTask,
        ],
      };
    });
  }, [setMission]);

  const handleSave = async (index: number) => {
    if (!mission.tasks) {
      console.error('Mission tasks are undefined');
      return;
    }
    setSavingTask(true);

    const task = mission.tasks[index];

    try {
      const response = await (task.id
        ? PortalSdk.putData('/api/mission-tasks', task)
        : PortalSdk.postData('/api/mission-tasks', {
            ...task,
            missionId: mission.id,
          }));

      if (response.status === 'success') {
        console.log('Task saved successfully:', response.data.task);
        setSelectedTask(index, () => response.data.task);
      } else {
        console.error('Failed to save task:', response.message);
      }
      setSavingTask(false);
    } catch (error) {
      console.error('Error saving task:', error);
      setSavingTask(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!mission.tasks) {
      console.error('Mission tasks are undefined');
      return;
    }

    const task = mission.tasks[index];

    setDeletingTask(true);

    try {
      if (task.id) {
        const response = await PortalSdk.deleteData(`/api/mission-tasks`, task);

        if (response.status === 'success') {
          console.log('Task deleted successfully:', response.data);
        } else {
          console.error('Failed to delete task:', response.message);
        }
      } else {
        console.error('Task ID is missing for deletion');
      }
      setDeletingTask(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      setDeletingTask(false);
    }
  };

  return (
    <Paper elevation={2} className="mt-4 p-4">
      <Box>
        <Typography variant="h6">Tasks of {mission.title}</Typography>
        <Box
          sx={{
            padding: '8px 0',
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Plus />}
            onClick={addNewTask}
            size="small"
            sx={{ mr: 1 }}
          >
            Add Task
          </Button>
          <Button
            variant="outlined"
            startIcon={<X />}
            onClick={() => setShow(false)}
            size="small"
            sx={{ mr: 1 }}
          >
            Close
          </Button>
        </Box>
      </Box>
      {tasksLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Skeleton variant="rounded" sx={{ width: '100%', height: '100%' }} />
        </div>
      ) : (
        <>
          {tasks?.length > 0 ? (
            <>
              <Grid container spacing={2} className="mb-2 font-semibold">
                <Grid item xs={2}>
                  Title
                </Grid>
                <Grid item xs={2}>
                  Description
                </Grid>
                <Grid item xs={1}>
                  Indie Points
                </Grid>
                <Grid item xs={2}>
                  User
                </Grid>
                <Grid item xs={1}>
                  Completed At
                </Grid>
                <Grid item xs={1}>
                  Completed
                </Grid>
                <Grid item xs={1}>
                  Expires At
                </Grid>
                <Grid item xs={1}>
                  Expirable
                </Grid>
                <Grid item xs={1}>
                  Actions
                </Grid>
              </Grid>
              {tasks?.map((task, index) => (
                <Grid
                  container
                  spacing={2}
                  key={task.userId + `${index}`}
                  alignItems="center"
                  className="mb-2"
                >
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      value={task.title}
                      onChange={(e) =>
                        setSelectedTask(
                          index,
                          (sm) =>
                            ({ ...sm, title: e.target.value }) as MissionTask,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      value={task.description}
                      onChange={(e) =>
                        setSelectedTask(
                          index,
                          (sm) =>
                            ({
                              ...sm,
                              description: e.target.value,
                            }) as MissionTask,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={task.indiePoints}
                      onChange={(e) =>
                        setSelectedTask(
                          index,
                          (sm) =>
                            ({
                              ...sm,
                              indiePoints: parseInt(e.target.value),
                            }) as MissionTask,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Select
                      fullWidth
                      size="small"
                      value={task.userInfoId || ''}
                      onChange={(e) =>
                        setSelectedTask(index, (sm) => {
                          const sel_user = coreTeam.find(
                            (user) => user.id === e.target.value,
                          );
                          console.log(sel_user);
                          // let userInfo = {
                          //   avatar: sel_user?.avatar || '',
                          //   name: sel_user?.name || '',
                          //   email: sel_user?.email || '',
                          //   userInfoId: sel_user?.id || '',
                          // };
                          return {
                            ...sm,
                            avatar: sel_user?.avatar || '',
                            name: sel_user?.name || '',
                            email: sel_user?.email || '',
                            userInfoId: sel_user?.id,
                          } as MissionTask;
                        })
                      }
                    >
                      {coreTeam.map((sel_user) => (
                        <MenuItem key={sel_user.id} value={sel_user.id}>
                          {sel_user.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>
                  <Grid item xs={1}>
                    <DatePicker
                      value={task.completedAt ? dayjs(task.completedAt) : null}
                      onChange={(newValue) =>
                        setSelectedTask(
                          index,
                          (sm) =>
                            ({
                              ...sm,
                              completedAt: newValue
                                ? (newValue.toDate() as any)
                                : null,
                            }) as MissionTask,
                        )
                      }
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <Checkbox
                      checked={task.completed || false}
                      onChange={(e) =>
                        setSelectedTask(
                          index,
                          (sm) =>
                            ({
                              ...sm,
                              completed: e.target.checked,
                            }) as MissionTask,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <DatePicker
                      value={task.expiresAt ? dayjs(task.expiresAt) : null}
                      onChange={(newValue) =>
                        setSelectedTask(
                          index,
                          (sm) =>
                            ({
                              ...sm,
                              expiresAt: newValue
                                ? (newValue.toDate() as any)
                                : null,
                            }) as MissionTask,
                        )
                      }
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <Checkbox
                      checked={task.expirable || false}
                      onChange={(e) =>
                        setSelectedTask(
                          index,
                          (sm) =>
                            ({
                              ...sm,
                              expirable: e.target.checked,
                            }) as MissionTask,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={1} className="flex items-center gap-2">
                    <Tooltip title="Save Task">
                      <IconButton
                        color="success"
                        onClick={() => handleSave(index)}
                        size="small"
                      >
                        {savingTask ? <Loader /> : <Save />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Task">
                      <IconButton
                        color="error"
                        onClick={() => {
                          deleteSelectedTask(index);
                          handleDelete(index);
                        }}
                        size="small"
                      >
                        {deletingTask ? <Loader /> : <Trash2 />}
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
              ))}
            </>
          ) : (
            <h1 className="text-center text-lg">No Tasks Found</h1>
          )}
        </>
      )}
    </Paper>
  );
};
