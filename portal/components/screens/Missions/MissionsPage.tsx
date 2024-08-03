"use client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Button, Typography, Paper, Grid, Skeleton } from "@mui/material";
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
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { MissionEntry } from "./Mission";

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
        // console.log(data);
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
        // console.log(data);
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
