import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { STATUSES } from "../mission.utils";
import { Avatar, AvatarGroup, Button, Menu, MenuItem } from "@mui/material";
import { MissionTask, STATUS, User } from "@prisma/client";
import ToolTip from "@/components/elements/ToolTip";
import { useEffect, useState } from "react";
import {
  setActiveTask,
  updateTask,
} from "@/utils/redux/missions/missionsTasks.slice";
import { PortalSdk } from "@/utils/services/PortalSdk";
import {
  setActiveTab,
  setEditingMission,
  setEditModalOpen,
} from "@/utils/redux/missions/mission.ui.slice";
import { HOUSES_LIST } from "../../HousesList";

const Tasks = ({
  userList,
  currentHouseIndex,
}: {
  userList: User[];
  currentHouseIndex: number;
}) => {
  const { allMissions, activeMission, missionsLoading } = useAppSelector(
    (state: RootState) => state.mission
  );
  const { allTasks } = useAppSelector(
    (state: RootState) => state.missionsTasks
  );
  const dispatch = useAppDispatch();
  const [currentStatus, setCurrentStatus] = useState<STATUS | null>(null);
  const [activeMissionTasks, setActiveMissionTasks] = useState<
    MissionTask[] | []
  >([]);

  useEffect(() => {
    setActiveMissionTasks(
      allTasks.filter((t) => t?.missionId === activeMission?.id)
    );
  }, [allTasks, activeMission?.id]);

  const [statusRef, setStatusRef] = useState<HTMLSpanElement | null>(null);
  const isStatusDropdownOpen = Boolean(statusRef);
  const handleTaskStatusChange = async (status: STATUS) => {
    setActiveMissionTasks((prev) =>
      prev.map((task) => {
        if (task.status?.value === currentStatus?.value) {
          return {
            ...task,
            status,
          };
        }
        return task;
      })
    );
    try {
      const taskToUpdate = activeMissionTasks.find(
        (task) => task.status?.value === currentStatus?.value
      );
      if (!taskToUpdate) {
        return;
      }
      const res = await PortalSdk.putData(`/api/mission-tasks`, {
        ...taskToUpdate,
        status,
      });
      dispatch(updateTask(res.data.task));
    } catch (error) {
      console.error(error);
    }
  };

  if (missionsLoading) {
    return <MissionDetailsSkeleton />;
  }

  if (
    allMissions?.length === 0 ||
    allMissions?.filter((m) => m.house === HOUSES_LIST[currentHouseIndex].id)
      .length === 0
  ) {
    return (
      <div
        className={`bg-white rounded-lg shadow-lg p-6 h-[96vh] flex items-center justify-center overflow-y-scroll my-4 border-b border-neutral-200 `}
      >
        <Button
          onClick={() => dispatch(setEditModalOpen(true))}
          startIcon={<span className="material-icons">add</span>}
        >
          Add Missions to start
        </Button>
      </div>
    );
  }

  if (allMissions && allMissions.length > 0 && !activeMission) {
    return (
      <div
        className={`bg-white rounded-lg shadow-lg p-6 h-[96vh] flex items-center justify-center overflow-y-scroll my-4 border-b border-neutral-200 `}
      >
        Select mission to see details
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 h-[96vh] overflow-y-scroll my-4 border-b border-neutral-200 
    `}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => {
            dispatch(setEditingMission(activeMission));
            dispatch(setEditModalOpen(true));
            dispatch(setActiveTab("missions"));
          }}
        >
          <ToolTip title={activeMission?.title || ""}>
            <h2 className="text-2xl font-bold">
              {activeMission?.title && activeMission?.title.length > 10
                ? activeMission?.title.slice(0, 10) + "..."
                : activeMission?.title}
            </h2>
          </ToolTip>
          <span className="material-symbols-outlined !text-base !opacity-70 group-hover:!opacity-100 cursor-pointer">
            Edit
          </span>
        </div>
        <Button
          onClick={() => {
            dispatch(setActiveTab("tasks"));
            dispatch(setEditModalOpen(true));
          }}
        >
          <span className="material-symbols-outlined">add</span>
          <span>Add Task</span>
        </Button>
        {/* {activeMissionTasks.length > 0 &&
          activeMissionTasks.map((task) => <div>{task.title}</div>)} */}
      </div>
      <div>
        {STATUSES.map((status) => (
          <>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-2 cursor-pointer  hover:opacity-70">
                <span className="icon_size !text-base !font-bold !text-neutral-400  material-icons">
                  keyboard_arrow_down
                </span>
                <span className="text-base font-bold text-neutral-400">
                  {status.label}
                </span>
              </div>
            </div>
            {activeMissionTasks
              .filter((task) => task.status?.value === status.value)
              .map((task) => (
                <div
                  key={task.id}
                  onClick={(e) => {
                    dispatch(setActiveTask(task));
                    dispatch(setActiveTab("tasks"));
                    dispatch(setEditModalOpen(true));
                  }}
                  className="cursor-pointer hover:bg-neutral-50 ml-4 mt-2 p-2 shadow-sm border rounded-xl"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusRef(e.currentTarget);
                          setCurrentStatus(status);
                        }}
                        style={{ backgroundColor: status.color }}
                        className="cursor-pointer w-4 h-4 bg-gray-200 rounded-full hover:opacity-70"
                      ></div>
                      <p className="text-lg w-40 line-clamp-1 font-bold">
                        {task.title}
                      </p>
                    </div>
                    {task.priority && (
                      <div
                        style={{
                          color: task.priority?.color,
                        }}
                        className="text-sm flex items-center gap-1 font-bold text-neutral-400"
                      >
                        <span
                          style={{
                            fill: task.priority?.color,
                          }}
                          className="icon_size material-icons "
                        >
                          flag
                        </span>
                        <span>{task.priority?.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="text-xs font-bold text-neutral-400">
                        Due Date
                      </span>
                      <p className="text-xs text-neutral-600">
                        {task.expiresAt
                          ? new Date(task.expiresAt).toDateString().slice(4)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="flex">
                      <AvatarGroup
                        max={4}
                        sx={{
                          "& .MuiAvatar-root": {
                            width: 24,
                            height: 24,
                            fontSize: 15,
                          },
                        }}
                      >
                        {userList
                          .filter((user) => task.assignees?.includes(user.id))
                          .map((user) => (
                            <ToolTip key={user.id} title={user.name || ""}>
                              <Avatar
                                sizes={"20px"}
                                key={user.id}
                                alt={user.name || ""}
                                src={user.avatar || ""}
                              />
                            </ToolTip>
                          ))}
                      </AvatarGroup>
                    </div>
                  </div>
                </div>
              ))}
          </>
        ))}
        <Menu
          open={isStatusDropdownOpen}
          anchorEl={statusRef}
          onClose={() => setStatusRef(null)}
        >
          {STATUSES.map((s) => (
            <MenuItem
              key={s.label}
              onClick={() => {
                handleTaskStatusChange(s);
                setStatusRef(null);
              }}
            >
              <div className="flex gap-2 items-center">
                <span
                  style={{
                    background: s.color,
                  }}
                  className={`w-4 h-4  rounded-full`}
                ></span>
                <span>{s.label}</span>
              </div>
            </MenuItem>
          ))}
        </Menu>
      </div>
    </div>
  );
};

export const MissionDetailsSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto my-4 border-b border-neutral-200">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="mb-4">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-gray-400 h-2.5 rounded-full w-1/2"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-1"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <ul className="space-y-4">
        {[1, 2, 3].map((index) => (
          <li key={index} className="rounded-lg p-4 shadow">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 ml-auto"></div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tasks;
