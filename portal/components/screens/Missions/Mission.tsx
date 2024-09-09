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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { HOUSEID, Mission, User } from "@prisma/client";
import dayjs from "dayjs";
import { Dispatch, SetStateAction, useState } from "react";
import { ChevronDown, ChevronUp, Loader, Save } from "lucide-react";
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
  const [mission, setMission] = useState<Mission>(_mission);

  const updateMission = () => {
    setSavingMission(mission.id);
    PortalSdk.putData("/api/missions", mission)
      .then((data) => {
        // console.log(data);
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
        // console.log(data);
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
