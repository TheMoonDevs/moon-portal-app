import {
  setActiveMission,
  setAllMissions,
  setMissionDetailsOpen,
  setUpdateMission,
} from "@/utils/redux/missions/mission.slice";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Mission, MissionTask, STATUS } from "@prisma/client";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  calculateMissionStat,
  getMissionProgress,
  STATUSES,
} from "./mission.utils";
import { Menu, MenuItem } from "@mui/material";
import { PortalSdk } from "@/utils/services/PortalSdk";

const MissionListItem = ({
  mission,
  expanded,
  missionTasks,
  handleAccordionChange,
}: {
  mission: Mission;
  expanded: string | false;
  missionTasks: MissionTask[];
  handleAccordionChange: (missionId: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const [statusRef, setStatusRef] = useState<HTMLSpanElement | null>(null);
  const isStatusDropdownOpen = Boolean(statusRef);
  const { activeMission, allMissions } = useAppSelector(
    (state: RootState) => state.mission
  );
  const handleMissionStatusChange = async (status: STATUS) => {
    dispatch(
      setAllMissions(
        allMissions!.map((m) => {
          if (m.id === mission.id) {
            return {
              ...m,
              status,
            };
          }
          return m;
        })
      )
    );
    try {
      const res = await PortalSdk.putData(`/api/missions`, {
        ...mission,
        status,
      });
      dispatch(setUpdateMission(res.data.mission));
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div
      className={`flex flex-col gap-2 border-b py-2 px-2 border-neutral-200 cursor-pointer hover:bg-gray-100 w-full
    ${activeMission?.id === mission.id ? "bg-gray-200" : "text-gray-700"}
    ${expanded === mission.id ? "bg-gray-200" : "text-gray-700"}
  `}
      onClick={() => {
        dispatch(setActiveMission(mission));
        dispatch(setMissionDetailsOpen(false));
        handleAccordionChange(mission.id);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full">
          <span
            onClick={(e) => {
              setStatusRef(e.currentTarget);
            }}
            style={{
              background: mission.status?.color,
            }}
            className={` w-4 h-4 rounded-full border-2 border-gray-300 hover:opacity-40  p-1`}
          ></span>
          <Menu
            open={isStatusDropdownOpen}
            anchorEl={statusRef}
            onClose={() => setStatusRef(null)}
          >
            {STATUSES.map((s) => (
              <MenuItem
                key={s.label}
                onClick={() => {
                  handleMissionStatusChange(s);
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
          <Image
            src={`/images/houses/${mission.house}.png`}
            alt={mission.house}
            width={32}
            height={32}
            className="w-8 h-8 object-cover object-center rounded-full"
          />
          <div className="flex gap-3 items-center">
            <h4 className="text-md font-semibold ">
              {mission.title.length > 20
                ? mission.title.substring(0, 20).concat("...")
                : mission.title}
            </h4>
            {mission.priority && (
              <p
                style={{ color: mission.priority.color }}
                className="text-xs font-regular flex items-center gap-1"
              >
                <span
                  style={{ color: mission.priority.color }}
                  className="material-icons !text-sm"
                >
                  flag
                </span>
                <span className="font-semibold">{mission.priority?.label}</span>
              </p>
            )}
          </div>
        </div>
        <div className="w-full justify-end flex items-center gap-4">
          <div className="w-1/2">
            <span className="text-xs font-semibold text-neutral-500">
              {missionTasks.length > 0
                ? `${
                    missionTasks.filter((t) => t.status?.value === "COMPLETED")
                      .length
                  }
              
              / ${missionTasks.length} tasks completed`
                : "0 tasks"}
            </span>
            <div className=" h-[4px] bg-neutral-400 rounded-sm">
              <div
                className="h-full bg-green-500 rounded-sm"
                style={{
                  width: `${getMissionProgress(missionTasks)}%`,
                }}
              ></div>
            </div>
          </div>
          <span className="text-sm font-bold">
            {getMissionProgress(missionTasks)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default MissionListItem;
