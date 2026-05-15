import type { MissionTask, STATUS, User } from '@db/client';
import { Avatar, AvatarGroup, Button, Menu, MenuItem } from '@mui/material';
import { useEffect, useState } from 'react';

import ToolTip from '@/components/elements/ToolTip';
import {
  setActiveTab,
  setEditingMission,
  setEditModalOpen,
} from '@/utils/redux/missions/mission.ui.slice';
import {
  setActiveTask,
  updateTask,
} from '@/utils/redux/missions/missionsTasks.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { HOUSES_LIST } from '../../HousesList';
import { STATUSES } from '../mission.utils';

const Tasks = ({
  userList,
  currentHouseIndex,
}: {
  userList: User[];
  currentHouseIndex: number;
}) => {
  const { allMissions, activeMission, missionsLoading } = useAppSelector(
    (state: RootState) => state.mission,
  );
  const { allTasks } = useAppSelector(
    (state: RootState) => state.missionsTasks,
  );
  const dispatch = useAppDispatch();
  const [currentStatus, setCurrentStatus] = useState<STATUS | null>(null);
  const [activeMissionTasks, setActiveMissionTasks] = useState<
    MissionTask[] | []
  >([]);

  useEffect(() => {
    setActiveMissionTasks(
      allTasks.filter((t) => t?.missionId === activeMission?.id),
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
      }),
    );
    try {
      const taskToUpdate = activeMissionTasks.find(
        (task) => task.status?.value === currentStatus?.value,
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
    allMissions?.filter((m) => m.house === HOUSES_LIST[currentHouseIndex]?.id)
      .length === 0
  ) {
    return (
      <div
        className={`my-4 flex h-[96vh] items-center justify-center overflow-y-scroll rounded-lg border-b border-neutral-200 bg-white p-6 shadow-lg`}
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
        className={`my-4 flex h-[96vh] items-center justify-center overflow-y-scroll rounded-lg border-b border-neutral-200 bg-white p-6 shadow-lg`}
      >
        Select mission to see details
      </div>
    );
  }

  return (
    <div
      className={`my-4 h-[96vh] overflow-y-scroll rounded-lg border-b border-neutral-200 bg-white p-6 shadow-lg`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div
          className="group flex cursor-pointer items-center gap-2"
          onClick={() => {
            dispatch(setEditingMission(activeMission));
            dispatch(setEditModalOpen(true));
            dispatch(setActiveTab('missions'));
          }}
        >
          <ToolTip title={activeMission?.title || ''}>
            <h2 className="text-2xl font-bold">
              {activeMission?.title && activeMission?.title.length > 10
                ? activeMission?.title.slice(0, 10) + '...'
                : activeMission?.title}
            </h2>
          </ToolTip>
          <span className="material-symbols-outlined cursor-pointer !text-base !opacity-70 group-hover:!opacity-100">
            Edit
          </span>
        </div>
        <Button
          onClick={() => {
            dispatch(setActiveTab('tasks'));
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
            <div className="mt-4 flex items-center gap-2">
              <div className="flex cursor-pointer items-center gap-2 hover:opacity-70">
                <span className="icon_size material-icons !text-base !font-bold !text-neutral-400">
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
                    dispatch(setActiveTab('tasks'));
                    dispatch(setEditModalOpen(true));
                  }}
                  className="ml-4 mt-2 cursor-pointer rounded-xl border p-2 shadow-sm hover:bg-neutral-50"
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
                        className="size-4 cursor-pointer rounded-full bg-gray-200 hover:opacity-70"
                      ></div>
                      <p className="line-clamp-1 w-40 text-lg font-bold">
                        {task.title}
                      </p>
                    </div>
                    {task.priority && (
                      <div
                        style={{
                          color: task.priority?.color,
                        }}
                        className="flex items-center gap-1 text-sm font-bold text-neutral-400"
                      >
                        <span
                          style={{
                            fill: task.priority?.color,
                          }}
                          className="icon_size material-icons"
                        >
                          flag
                        </span>
                        <span>{task.priority?.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-400">
                        Due Date
                      </span>
                      <p className="text-xs text-neutral-600">
                        {task.expiresAt
                          ? new Date(task.expiresAt).toDateString().slice(4)
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="flex">
                      <AvatarGroup
                        max={4}
                        sx={{
                          '& .MuiAvatar-root': {
                            width: 24,
                            height: 24,
                            fontSize: 15,
                          },
                        }}
                      >
                        {userList
                          .filter((user) => task.assignees?.includes(user.id))
                          .map((user) => (
                            <ToolTip key={user.id} title={user.name || ''}>
                              <Avatar
                                sizes={'20px'}
                                key={user.id}
                                alt={user.name || ''}
                                src={user.avatar || ''}
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
              <div className="flex items-center gap-2">
                <span
                  style={{
                    background: s.color,
                  }}
                  className={`size-4 rounded-full`}
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
    <div className="my-4 h-full overflow-y-auto rounded-lg border-b border-neutral-200 bg-white p-6 shadow-lg">
      <div className="mb-4 h-8 w-3/4 rounded bg-gray-200"></div>
      <div className="mb-4 flex items-center">
        <div className="mr-3 size-10 rounded-full bg-gray-200"></div>
        <div className="h-6 w-24 rounded bg-gray-200"></div>
      </div>
      <div className="mb-4">
        <div className="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
        <div className="mb-2 h-4 w-2/3 rounded bg-gray-200"></div>
        <div className="h-4 w-1/3 rounded bg-gray-200"></div>
      </div>
      <div className="mb-6">
        <div className="h-2.5 w-full rounded-full bg-gray-200">
          <div className="h-2.5 w-1/2 rounded-full bg-gray-400"></div>
        </div>
        <div className="mt-1 h-4 w-1/3 rounded bg-gray-200"></div>
      </div>
      <div className="mb-4 h-6 w-1/4 rounded bg-gray-200"></div>
      <ul className="space-y-4">
        {[1, 2, 3].map((index) => (
          <li key={index} className="rounded-lg p-4 shadow">
            <div className="mb-2 flex items-center">
              <div className="mr-3 size-10 rounded-full bg-gray-200"></div>
              <div className="h-4 w-24 rounded bg-gray-200"></div>
            </div>
            <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
            <div className="mb-2 h-3 w-full rounded bg-gray-200"></div>
            <div className="ml-auto h-3 w-1/2 rounded bg-gray-200"></div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tasks;
