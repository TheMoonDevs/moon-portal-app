"use client";

import { MissionTask } from "@/prisma/missionTasks";
import { prettyPrintDateAndTime } from "@/utils/helpers/prettyprint";
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
  Avatar,
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
  ChevronDownIcon,
  ChevronUp,
  Loader,
  Plus,
  Save,
  X,
} from "lucide-react";

const MissionTasks = ({
  tasks,
  mission,
  setMission,
  coreTeam,
  setSelectedMission,
}: {
  tasks: MissionTask[];
  mission: Mission;
  setMission: Dispatch<SetStateAction<Mission | null>>;
  setSelectedMission: (
    mission: Mission,
    callback: ((mission: Mission) => Mission) | null
  ) => void;
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
        <Box sx={{
          padding: "8px 0",
        }}>
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
            onClick={() => setMission(null)}
            size="small"
            sx={{ mr: 1 }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Save />}
            onClick={() => {
              setMission(null);
              setSelectedMission(mission, null);
            }}
            size="small"
          >
            Save
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
      </Grid>

      {tasks?.map((task, index) => (
        <Grid
          container
          spacing={2}
          key={task.userId}
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
        </Grid>
      ))}
    </Paper>
  );
};

export const MissionsPage = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionTasks, setMissionTasks] = useState<Mission | null>(null);
  const [coreTeam, setCoreTeam] = useState<User[]>([]);
  const [savingMission, setSavingMission] = useState<string | null>(null);
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

  const updateMission = (_mission: Mission) => {
    setSavingMission(_mission.id);
    PortalSdk.putData("/api/missions", _mission)
      .then((data) => {
        console.log(data);
        setMissions((m) =>
          m.map((mission) => {
            if (_mission.id === mission.id) {
              return data.data.mission;
            }
            return mission;
          })
        );
        setSavingMission(null);
      })
      .catch((error) => {
        console.error(error);
        setSavingMission(null);
      });
  };

  const setSelectedMission = (
    _mission: Mission,
    callback: ((mission: Mission) => Mission) | null
  ) => {
    setMissions((m) =>
      m.map((mission) => {
        if (_mission.id === mission.id) {
          return callback ? callback(mission) : _mission;
        }
        return mission;
      })
    );
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

        <Grid container spacing={2} className="font-semibold mb-4 px-4 border-b-2 border-t-2">
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
            <Paper key={mission.id} elevation={1} className="mb-4 p-4">
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={1}>
                  <IconButton
                    onClick={() =>
                      setMissionTasks(
                        missionTasks?.id === mission.id ? null : mission
                      )
                    }
                  >
                    {missionTasks?.id === mission.id ? (
                      <ChevronUp />
                    ) : (
                      <ChevronDown />
                    )}
                  </IconButton>
                  {(mission.tasks as any[])?.length || 0}
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    value={mission.title}
                    onChange={(e) =>
                      setSelectedMission(
                        mission,
                        (sm) => ({ ...sm, title: e.target.value } as Mission)
                      )
                    }
                  />
                </Grid>
                <Grid item xs={1}>
                  <Select
                    fullWidth
                    value={mission.house}
                    onChange={(e) =>
                      setSelectedMission(
                        mission,
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
                      setSelectedMission(
                        mission,
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
                      setSelectedMission(
                        mission,
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
                    value={
                      mission.completedAt ? dayjs(mission.completedAt) : null
                    }
                    onChange={(newValue) =>
                      setSelectedMission(
                        mission,
                        (sm) =>
                          ({
                            ...sm,
                            completedAt: newValue
                              ? (newValue.toDate() as any)
                              : null,
                          } as Mission)
                      )
                    }
                  />
                </Grid>
                <Grid item xs={1}>
                  <Checkbox
                    checked={
                      mission.completed !== null ? mission.completed : false
                    }
                    onChange={(e) =>
                      setSelectedMission(
                        mission,
                        (sm) =>
                          ({ ...sm, completed: e.target.checked } as Mission)
                      )
                    }
                  />
                </Grid>
                <Grid item xs={1}>
                  <DatePicker
                    value={mission.expiresAt ? dayjs(mission.expiresAt) : null}
                    onChange={(newValue) =>
                      setSelectedMission(
                        mission,
                        (sm) =>
                          ({
                            ...sm,
                            expiresAt: newValue
                              ? (newValue.toDate() as any)
                              : null,
                          } as Mission)
                      )
                    }
                  />
                </Grid>
                <Grid item xs={1}>
                  <Checkbox
                    checked={
                      mission.expirable !== null ? mission.expirable : false
                    }
                    onChange={(e) =>
                      setSelectedMission(
                        mission,
                        (sm) =>
                          ({ ...sm, expirable: e.target.checked } as Mission)
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
                    onClick={() => updateMission(mission)}
                  >
                    {savingMission === mission.id ? <Loader /> : "Save"}
                  </Button>
                </Grid>
              </Grid>
              {missionTasks && missionTasks.id === mission.id && (
                <MissionTasks
                  mission={missionTasks}
                  setMission={setMissionTasks}
                  tasks={missionTasks?.tasks as any[]}
                  coreTeam={coreTeam}
                  setSelectedMission={setSelectedMission}
                />
              )}
            </Paper>
          ))
        )}
      </Paper>
    </LocalizationProvider>
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
