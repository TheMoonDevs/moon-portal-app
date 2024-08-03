"use client";

import { MissionTask } from "@/prisma/missionTasks";
import { PortalSdk } from "@/utils/services/PortalSdk";
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
  IconButton,
  Skeleton,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  HOUSEID,
  Mission,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  User,
} from "@prisma/client";
import dayjs from "dayjs";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Delete,
  Loader,
  Plus,
  Save,
  X,
} from "lucide-react";

const MissionTasks = ({
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
  console.log("me render");
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
          {/* <Button
            variant="contained"
            color="success"
            startIcon={<Save />}
            onClick={() => {
              setMission(mission);
            }}
            size="small"
            sx={{ mr: 1 }}
          >
            Save
          </Button> */}
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

export const MissionsPage = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [coreTeam, setCoreTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PortalSdk.getData(
      "/api/user?role=" +
        USERROLE.CORETEAM +
        "&userType=" +
        USERTYPE.MEMBER +
        "&status=" +
        USERSTATUS.ACTIVE,
      null
    )
      .then((data) => {
        setCoreTeam(data?.data?.user || []);
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    PortalSdk.getData("/api/missions?month=" + dayjs().format("YYYY-MM"), null)
      .then((data) => {
        console.log(data);
        setMissions(data.data.missions);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const createMission = () => {
    PortalSdk.postData("/api/missions", {
      title: "New Mission",
      house: HOUSEID.MANAGEMENT,
      housePoints: 10,
      indiePoints: 1000,
      expirable: true,
      month: dayjs().format("YYYY-MM"),
      expiresAt: dayjs().add(1, "day").toDate(),
    })
      .then((data) => {
        console.log(data);
        setMissions([...missions, data.data.mission]);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper elevation={3} className="p-6 m-4">
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          className="mb-6"
        >
          <Typography variant="h4" component="h1">
            Missions
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus />}
            onClick={createMission}
            disabled={loading}
          >
            Create Mission
          </Button>
        </Grid>

        <Grid
          container
          spacing={2}
          className="font-semibold mb-4 px-4 border-b-2 border-t-2"
        >
          <Grid item xs={1}>
            Tasks
          </Grid>
          <Grid item xs={2}>
            Title
          </Grid>
          <Grid item xs={1}>
            House
          </Grid>
          <Grid item xs={1}>
            House Points
          </Grid>
          <Grid item xs={1}>
            Indie Points
          </Grid>
          <Grid item xs={1}>
            Indie Balance
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

        {loading ? (
          <>
            <MissionSkeleton />
            <MissionSkeleton />
            <MissionSkeleton />
          </>
        ) : (
          missions.map((mission) => (
            <MissionEntry
              key={mission.id}
              coreTeam={coreTeam}
              _mission={mission}
              setMissions={setMissions}
            />
          ))
        )}
      </Paper>
    </LocalizationProvider>
  );
};

const MissionEntry = ({
  _mission,
  setMissions,
  coreTeam,
}: {
  _mission: Mission;
  setMissions: Dispatch<SetStateAction<Mission[]>>;
  coreTeam: User[];
}) => {
  // const [missionTasks, setMissionTasks] = useState<Mission | null>(null);
  const [showMissionTasks, setShowMissionTasks] = useState<Boolean>(false);
  const [savingMission, setSavingMission] = useState<string | null>(null);
  const [mission, setMission] = useState<Mission>(_mission);

  const updateMission = () => {
    setSavingMission(mission.id);
    PortalSdk.putData("/api/missions", mission)
      .then((data) => {
        console.log(data);
        setSavingMission(null);
      })
      .catch((error) => {
        console.error(error);
        setSavingMission(null);
      });
  };

  const deleteMission = () => {
    PortalSdk.deleteData("/api/missions", mission)
      .then((data) => {
        console.log(data);
        if (data.status == "success") {
          setMissions((old) => old.filter((m) => m.id != data.data.mission.id));
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <Paper key={mission.id} elevation={1} className="mb-4 p-4">
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={1}>
          <IconButton onClick={() => setShowMissionTasks((old) => !old)}>
            {showMissionTasks ? <ChevronUp /> : <ChevronDown />}
          </IconButton>
          {(mission.tasks as any[])?.length || 0}
        </Grid>
        <Grid item xs={2}>
          <TextField
            fullWidth
            value={mission.title}
            onChange={(e) => {
              setMission((sm) => ({ ...sm, title: e.target.value } as Mission));
            }}
          />
        </Grid>
        <Grid item xs={1}>
          <Select
            fullWidth
            value={mission.house}
            onChange={(e) =>
              setMission(
                (sm) =>
                  ({
                    ...sm,
                    house: e.target.value as HOUSEID,
                  } as Mission)
              )
            }
          >
            {Object.values(HOUSEID).map((house) => (
              <MenuItem key={house} value={house}>
                {house}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={1}>
          <TextField
            fullWidth
            type="number"
            value={mission.housePoints}
            onChange={(e) =>
              setMission(
                (sm) =>
                  ({
                    ...sm,
                    housePoints: parseInt(e.target.value),
                    indiePoints: parseInt(e.target.value) * 100,
                  } as Mission)
              )
            }
          />
        </Grid>
        <Grid item xs={1}>
          <TextField
            fullWidth
            type="number"
            value={mission.indiePoints}
            onChange={(e) =>
              setMission(
                (sm) =>
                  ({
                    ...sm,
                    indiePoints: parseInt(e.target.value),
                  } as Mission)
              )
            }
          />
        </Grid>
        <Grid item xs={1}>
          {mission.indiePoints -
            ((mission.tasks as any[]) || []).reduce(
              (acc, task) => acc + task.indiePoints,
              0
            )}
        </Grid>
        <Grid item xs={1}>
          <DatePicker
            value={mission.completedAt ? dayjs(mission.completedAt) : null}
            onChange={(newValue) =>
              setMission(
                (sm) =>
                  ({
                    ...sm,
                    completedAt: newValue ? (newValue.toDate() as any) : null,
                  } as Mission)
              )
            }
          />
        </Grid>
        <Grid item xs={1}>
          <Checkbox
            checked={mission.completed !== null ? mission.completed : false}
            onChange={(e) =>
              setMission(
                (sm) => ({ ...sm, completed: e.target.checked } as Mission)
              )
            }
          />
        </Grid>
        <Grid item xs={1}>
          <DatePicker
            value={mission.expiresAt ? dayjs(mission.expiresAt) : null}
            onChange={(newValue) =>
              setMission(
                (sm) =>
                  ({
                    ...sm,
                    expiresAt: newValue ? (newValue.toDate() as any) : null,
                  } as Mission)
              )
            }
          />
        </Grid>
        <Grid item xs={1}>
          <Checkbox
            checked={mission.expirable !== null ? mission.expirable : false}
            onChange={(e) =>
              setMission(
                (sm) => ({ ...sm, expirable: e.target.checked } as Mission)
              )
            }
          />
        </Grid>
        <Grid item xs={1}>
          <Button
            variant="contained"
            color="success"
            startIcon={<Save />}
            disabled={savingMission === mission.id}
            onClick={() => {
              updateMission();
            }}
          >
            {savingMission === mission.id ? <Loader /> : "Save"}
          </Button>
        </Grid>
      </Grid>
      {showMissionTasks && (
        <MissionTasks
          mission={mission}
          setShow={setShowMissionTasks}
          setMission={setMission}
          deleteMission={deleteMission}
          updateMission={updateMission}
          tasks={mission.tasks as any[]}
          coreTeam={coreTeam}
        />
      )}
    </Paper>
  );
};

const MissionSkeleton = () => (
  <Paper elevation={1} className="mb-4 p-4">
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={1}>
        <Skeleton variant="circular" width={40} height={40} />
      </Grid>
      <Grid item xs={2}>
        <Skeleton variant="rectangular" height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="rectangular" height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="rectangular" height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="rectangular" height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="text" />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="rectangular" height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="circular" width={40} height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="rectangular" height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="circular" width={40} height={40} />
      </Grid>
      <Grid item xs={1}>
        <Skeleton variant="rectangular" width={80} height={40} />
      </Grid>
    </Grid>
  </Paper>
);
