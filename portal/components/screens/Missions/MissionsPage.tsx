"use client";

import { MissionTask } from "@/prisma/missionTasks";
import { prettyPrintDateAndTime } from "@/utils/helpers/prettyprint";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Button } from "@mui/material";
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
import { ChevronDownIcon } from "lucide-react";

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
  const setSelectedTask = (callback: (task: MissionTask) => MissionTask) => {
    setMission((m) => {
      if (!m) return m;
      return {
        ...m,
        tasks: (m.tasks as any[])?.map((task) => callback(task)) as any[],
      } as Mission;
    });
  };

  return (
    <div className="mission-tasks p-4 border border-neutral-400">
      <div className="flex items-center gap-4 pb-4">
        <h2 className="pb-2">Tasks of {mission.title}</h2>
        <button
          onClick={() =>
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
            })
          }
          className="border border-black text-black px-4 py-2 text-xs"
        >
          Add
        </button>
        <button
          onClick={() => setMission(null)}
          className="bg-black text-white px-4 py-2 text-xs"
        >
          Close
        </button>
        <button
          onClick={() => {
            setMission(null);
            setSelectedMission(mission, null);
          }}
          className="bg-green-500 text-white px-4 py-2 text-xs"
        >
          Save
        </button>
      </div>
      <ul className="grid grid-cols-10 text-sm tracking-wide text-uppercase">
        <li>Title</li>
        <li>Description</li>
        <li>Indie Points</li>
        <li>User</li>
        <li>Completed At</li>
        <li>Completed</li>
        <li>Expires At</li>
        <li>Expirable</li>
      </ul>
      {tasks?.map((task) => (
        <ul key={task.userId}>
          <div
            className="grid grid-cols-10 items-center gap-2"
            key={task.userId}
          >
            <input
              className="border border-neutral-300  px-4"
              value={task.title}
              onChange={(e) =>
                setSelectedTask(
                  (sm) =>
                    ({
                      ...sm,
                      title: e.target.value,
                    } as MissionTask)
                )
              }
            />
            <input
              className="border border-neutral-300  px-4"
              value={task.description}
              onChange={(e) =>
                setSelectedTask(
                  (sm) =>
                    ({
                      ...sm,
                      description: e.target.value,
                    } as MissionTask)
                )
              }
            />
            <input
              type="number"
              className="border border-neutral-300  px-4"
              value={task.indiePoints}
              onChange={(e) =>
                setSelectedTask(
                  (sm) =>
                    ({
                      ...sm,
                      indiePoints: parseInt(e.target.value),
                    } as MissionTask)
                )
              }
            />
            <select
              className="border border-neutral-300  p-1"
              value={task.userInfo?.id}
              onChange={(e) =>
                setSelectedTask((sm) => {
                  let sel_user = coreTeam.find(
                    (user) => user.id === e.target.value
                  );
                  let userInfo = {
                    avatar: sel_user?.avatar || "",
                    name: sel_user?.name || "",
                    email: sel_user?.email || "",
                    id: sel_user?.id || "",
                  };
                  return {
                    ...sm,
                    userInfo,
                  } as MissionTask;
                })
              }
            >
              {coreTeam.map((sel_user) => (
                <option key={sel_user.id} value={sel_user.id}>
                  <img
                    src={sel_user.avatar ?? ""}
                    alt={sel_user.name ?? ""}
                    className="w-6 h-6 rounded-full"
                  />
                  {sel_user.name}
                </option>
              ))}
            </select>
            <DatePicker
              className="border border-neutral-300  px-4"
              value={task.completedAt ? dayjs(task.completedAt) : null}
              onChange={(newValue) =>
                setSelectedTask(
                  (sm) =>
                    ({
                      ...sm,
                      completedAt: newValue
                        ? (newValue?.toDate() as any)
                        : null,
                    } as MissionTask)
                )
              }
            />
            <input
              type="checkbox"
              className="border border-neutral-300 w-6 h-6  px-4"
              checked={task.completed}
              onChange={(e) =>
                setSelectedTask(
                  (sm) =>
                    ({
                      ...sm,
                      completed: e.target.checked,
                    } as MissionTask)
                )
              }
            />

            <DatePicker
              className="border border-neutral-300  px-4"
              value={task.expiresAt ? dayjs(task.expiresAt) : null}
              onChange={(newValue) =>
                setSelectedTask(
                  (sm) =>
                    ({
                      ...sm,
                      expiresAt: newValue ? (newValue?.toDate() as any) : null,
                    } as MissionTask)
                )
              }
            />
            <input
              type="checkbox"
              className="border border-neutral-300 w-6 h-6  px-4"
              checked={task.expirable}
              onChange={(e) =>
                setSelectedTask(
                  (sm) =>
                    ({
                      ...sm,
                      expirable: e.target.checked,
                    } as MissionTask)
                )
              }
            />
          </div>
        </ul>
      ))}
    </div>
  );
};

export const MissionsPage = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionTasks, setMissionTasks] = useState<Mission | null>(null);
  const [coreTeam, setCoreTeam] = useState<User[]>([]);
  const [savingMission, setSavingMission] = useState<string | null>(null);

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
      house: HOUSEID.MANGEMENT,
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
      <div className="missions-page">
        <div className="flex flex-row w-full justify-between  p-4">
          <h1 className="text-3xl">Missions</h1>
          <button
            onClick={createMission}
            className="bg-black text-white px-4 text-md"
          >
            Create Mission
          </button>
        </div>
        <ul className="p-4 w-full justify-between grid grid-cols-11 text-sm tracking-wide text-uppercase border borer-neutral-500">
          <li>Tasks</li>
          <li>Title</li>
          <li>House</li>
          <li>House Points</li>
          <li>Indie Points</li>
          <li>Indie Balance</li>
          {/* <li>Created At</li>
                <li>Updated At</li> */}
          <li>Completed At</li>
          <li>Completed</li>
          <li>Expires At</li>
          <li>Expirable</li>
          <li>Status</li>
        </ul>
        {missions.map((mission) => (
          <ul key={mission.id}>
            <div
              onClick={() => {
                setSelectedMission(mission, null);
              }}
              className="grid grid-cols-11 items-center gap-2"
              key={mission.id}
            >
              <button
                className="flex items-center border border-neutral-300 px-4 text-md"
                onClick={() => setMissionTasks(mission)}
              >
                <ChevronDownIcon className="w-6 h-6" />
                {(mission.tasks as any[])?.length || 0} Tasks
              </button>
              <input
                className="border border-neutral-300  px-4"
                value={mission.title}
                onChange={(e) =>
                  setSelectedMission(
                    mission,
                    (sm) =>
                      ({
                        ...sm,
                        title: e.target.value,
                      } as Mission)
                  )
                }
              />
              <select
                className="border border-neutral-300  p-1"
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
                  <option key={house} value={house}>
                    {house}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="border border-neutral-300  px-4"
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
              <input
                type="number"
                className="border border-neutral-300  px-4"
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
              <p>
                {mission.indiePoints -
                  ((mission.tasks as any[]) || []).reduce(
                    (acc, task) => acc + task.indiePoints,
                    0
                  )}
              </p>
              {/* <DatePicker
                            className="border border-neutral-300  px-4"
                            value={mission.createdAt ? dayjs(mission.createdAt) : null}
                            onChange={(newValue) =>
                                setSelectedMission(mission,(sm) => ({
                                    ...sm,
                                    createdAt: newValue ? newValue?.toDate() as any : null
                                } as Mission))
                            }
                        />
                        <DatePicker
                            className="border border-neutral-300  px-4"
                            value={mission.updatedAt ? dayjs(mission.updatedAt) : null}
                            onChange={(newValue) =>
                                setSelectedMission(mission,(sm) => ({
                                    ...sm,
                                    updatedAt: newValue ? newValue?.toDate() as any : null
                                } as Mission))
                            }
                        /> */}

              <DatePicker
                className="border border-neutral-300  px-4"
                value={mission.completedAt ? dayjs(mission.completedAt) : null}
                onChange={(newValue) =>
                  setSelectedMission(
                    mission,
                    (sm) =>
                      ({
                        ...sm,
                        completedAt: newValue
                          ? (newValue?.toDate() as any)
                          : null,
                      } as Mission)
                  )
                }
              />
              <input
                type="checkbox"
                className="border border-neutral-300 w-6 h-6  px-4"
                checked={mission.completed !== null ? mission.completed : false}
                onChange={(e) =>
                  setSelectedMission(
                    mission,
                    (sm) =>
                      ({
                        ...sm,
                        completed: e.target.checked,
                      } as Mission)
                  )
                }
              />

              <DatePicker
                className="border border-neutral-300  px-4"
                value={mission.expiresAt ? dayjs(mission.expiresAt) : null}
                onChange={(newValue) =>
                  setSelectedMission(
                    mission,
                    (sm) =>
                      ({
                        ...sm,
                        expiresAt: newValue
                          ? (newValue?.toDate() as any)
                          : null,
                      } as Mission)
                  )
                }
              />
              <input
                type="checkbox"
                className="border border-neutral-300 w-6 h-6  px-4"
                checked={mission.expirable !== null ? mission.expirable : false}
                onChange={(e) =>
                  setSelectedMission(
                    mission,
                    (sm) =>
                      ({
                        ...sm,
                        expirable: e.target.checked,
                      } as Mission)
                  )
                }
              />
              <div className="flex">
                <button
                  style={{
                    opacity: savingMission === mission.id ? 0.5 : 1,
                  }}
                  disabled={savingMission === mission.id}
                  onClick={() => updateMission(mission)}
                  className="text-white bg-green-500 px-4 py-2 text-xs"
                >
                  {savingMission === mission.id ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            {missionTasks && missionTasks.id === mission.id && (
              <MissionTasks
                mission={missionTasks}
                setMission={setMissionTasks}
                tasks={missionTasks?.tasks as any[]}
                coreTeam={coreTeam}
                setSelectedMission={setSelectedMission}
              />
            )}
          </ul>
        ))}
      </div>
    </LocalizationProvider>
  );
};
