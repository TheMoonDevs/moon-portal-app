import { MissionTask } from "@/prisma/missionTasks";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  Typography,
  Paper,
  Grid,
  Box,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { Mission, User } from "@prisma/client";
import dayjs from "dayjs";
import { Dispatch, SetStateAction } from "react";
import { Delete, Plus, X } from "lucide-react";

export const MissionTasks = ({
  mission,
  setShow,
  setMission,
  deleteMission,
  tasks,
  coreTeam,
}: {
  mission: Mission;
  setShow: Dispatch<SetStateAction<Boolean>>;
  setMission: Dispatch<SetStateAction<Mission>>;
  updateMission: () => void;
  deleteMission: () => void;
  tasks: MissionTask[];
  coreTeam: User[];
}) => {
  const setSelectedTask = (
    index: number,
    callback: (task: MissionTask) => MissionTask
  ) => {
    setMission((m) => {
      if (!m) return m;
      return {
        ...m,
        tasks: (m.tasks as any[])?.map((task, i) =>
          i === index ? callback(task) : task
        ) as any[],
      } as Mission;
    });
  };
  const deleteSelectedTask = (index: number) => {
    setMission((m) => {
      if (!m) return m;
      return {
        ...m,
        tasks: (m.tasks as any[])?.filter((_, i) => i != index) as any[],
      } as Mission;
    });
  };
  const addNewTask = () => {
    setMission((m) => {
      if (!m) return m;
      return {
        ...m,
        tasks: [
          ...((m.tasks as any[]) ?? []),
          {
            title: "New Task",
            description: "New Task Description",
            indiePoints: 100,
            expirable: true,
            expiresAt: dayjs().add(3, "day").toDate(),
          },
        ],
      } as Mission;
    });
  };
  return (
    <Paper elevation={2} className="mt-4 p-4">
      <Box>
        <Typography variant="h6">Tasks of {mission.title}</Typography>
        <Box
          sx={{
            padding: "8px 0",
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
          <Button
            variant="contained"
            color="error"
            startIcon={<Delete />}
            onClick={() => {
              deleteMission();
            }}
            size="small"
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} className="font-semibold mb-2">
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
                  (sm) => ({ ...sm, title: e.target.value } as MissionTask)
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
                    ({ ...sm, description: e.target.value } as MissionTask)
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
                    } as MissionTask)
                )
              }
            />
          </Grid>
          <Grid item xs={2}>
            <Select
              fullWidth
              size="small"
              value={task.userInfo?.id || ""}
              onChange={(e) =>
                setSelectedTask(index, (sm) => {
                  let sel_user = coreTeam.find(
                    (user) => user.id === e.target.value
                  );
                  let userInfo = {
                    avatar: sel_user?.avatar || "",
                    name: sel_user?.name || "",
                    email: sel_user?.email || "",
                    id: sel_user?.id || "",
                  };
                  return { ...sm, userInfo } as MissionTask;
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
                      completedAt: newValue ? (newValue.toDate() as any) : null,
                    } as MissionTask)
                )
              }
              slotProps={{ textField: { size: "small" } }}
            />
          </Grid>
          <Grid item xs={1}>
            <Checkbox
              checked={task.completed}
              onChange={(e) =>
                setSelectedTask(
                  index,
                  (sm) =>
                    ({ ...sm, completed: e.target.checked } as MissionTask)
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
                      expiresAt: newValue ? (newValue.toDate() as any) : null,
                    } as MissionTask)
                )
              }
              slotProps={{ textField: { size: "small" } }}
            />
          </Grid>
          <Grid item xs={1}>
            <Checkbox
              checked={task.expirable}
              onChange={(e) =>
                setSelectedTask(
                  index,
                  (sm) =>
                    ({ ...sm, expirable: e.target.checked } as MissionTask)
                )
              }
            />
          </Grid>
          <Grid item xs={1}>
            <Button
              color="error"
              startIcon={<Delete />}
              onClick={() => {
                deleteSelectedTask(index);
              }}
              size="small"
            />
          </Grid>
        </Grid>
      ))}
    </Paper>
  );
};
