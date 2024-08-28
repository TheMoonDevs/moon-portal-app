import { PortalSdk } from "@/utils/services/PortalSdk";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  Paper,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { HOUSEID, Mission, MissionTask, User } from "@prisma/client";
import dayjs from "dayjs";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ChevronDown, ChevronUp, Loader, Save, Trash2 } from "lucide-react";
import { MissionTasks } from "./MissionTasks";

export const MissionEntry = ({
  _mission,
  setMissions,
  coreTeam,
}: {
  _mission: Mission;
  setMissions: Dispatch<SetStateAction<Mission[]>>;
  coreTeam: User[];
}) => {
  const [showMissionTasks, setShowMissionTasks] = useState<Boolean>(false);
  const [savingMission, setSavingMission] = useState<string | null>(null);
  const [deletingMission, setDeletingMission] = useState<string | null>(null);
  const [mission, setMission] = useState<Mission & { tasks?: MissionTask[] }>(
    _mission
  );
  const [tasksLoading, setTasksLoading] = useState(false);

  const updateMission = useCallback(() => {
    setSavingMission(mission.id);

    const missionData = {
      ...mission,
      tasks: undefined,
    };

    PortalSdk.putData("/api/missions", missionData)
      .then((data) => {
        // console.log(data);
        setSavingMission(null);
      })
      .catch((error) => {
        console.error(error);
        setSavingMission(null);
      });
  }, [mission]);

  const deleteMission = useCallback(() => {
    setDeletingMission(mission.id);
    PortalSdk.deleteData("/api/missions", mission)
      .then((data) => {
        // console.log(data);
        if (data.status == "success") {
          setMissions((old) => old.filter((m) => m.id != data.data.mission.id));
        }
        setDeletingMission(null);
      })
      .catch((error) => {
        console.error(error);
        setDeletingMission(null);
      });
  }, [mission, setMissions]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const response = await PortalSdk.getData(
        `/api/mission-tasks?missionId=${mission.id}`,
        null
      );
      setMission((sm) => ({ ...sm, tasks: response.data.tasks }));
      setTasksLoading(false);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasksLoading(false);
    }
  }, [mission.id]);

  useEffect(() => {
    if (showMissionTasks) {
      fetchTasks();
    }
  }, [showMissionTasks, fetchTasks]);

  return (
    <Paper key={mission.id} elevation={1} className="mb-4 p-4">
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={1}>
          <IconButton onClick={() => setShowMissionTasks((old) => !old)}>
            {showMissionTasks ? <ChevronUp /> : <ChevronDown />}
          </IconButton>
          {/* {mission.tasks?.length || 0} */}
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
        <Grid item xs={1} className="flex items-center gap-2">
          <Tooltip title="Save Mission">
            <IconButton
              color="success"
              disabled={savingMission === mission.id}
              onClick={() => {
                updateMission();
              }}
            >
              {savingMission === mission.id ? <Loader /> : <Save />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Mission">
            <IconButton
              color="error"
              disabled={deletingMission === mission.id}
              onClick={() => {
                deleteMission();
              }}
            >
              {deletingMission === mission.id ? <Loader /> : <Trash2 />}
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>
      {showMissionTasks && (
        <MissionTasks
          mission={mission}
          setShow={setShowMissionTasks}
          setMission={setMission}
          tasks={mission.tasks as any[]}
          coreTeam={coreTeam}
          tasksLoading={tasksLoading}
        />
      )}
    </Paper>
  );
};
