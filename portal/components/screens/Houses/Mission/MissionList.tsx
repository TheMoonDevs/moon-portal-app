import { RootState, useAppSelector } from "@/utils/redux/store";
import { Mission } from "@prisma/client";
import { HOUSES_LIST } from "../HousesList";
import MissionListItem from "./MissionListItem";
import { useState } from "react";
import ExpandedMission from "../ExpandedMission";

const MissionList = ({ currentHouseIndex }: { currentHouseIndex: number }) => {
  const { allMissions } = useAppSelector((state: RootState) => state.mission);
  const { allTasks } = useAppSelector(
    (state: RootState) => state.missionsTasks
  );
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleAccordionChange = (missionId: string) => {
    setExpanded((prev) => (prev === missionId ? false : missionId));
  };

  return allMissions && allMissions.length > 0 ? (
    allMissions
      .filter(
        (mission: Mission) =>
          HOUSES_LIST[currentHouseIndex]?.id == mission.house
      )
      .map((mission, i) => {
        const missionTasks =
          allTasks && Array.isArray(allTasks)
            ? allTasks.filter((t) => t?.missionId === mission?.id)
            : [];
        return (
          <>
            <MissionListItem
              key={mission.id}
              mission={mission}
              expanded={expanded}
              handleAccordionChange={handleAccordionChange}
              missionTasks={missionTasks}
            />
            <ExpandedMission
              key={mission.id}
              expanded={expanded}
              mission={mission}
            />
          </>
          //     <React.Fragment key={`${i}-${mission?.id}`}>
          //       <div
          //         className={`flex flex-col gap-2 border-b pt-3 border-neutral-200 cursor-pointer hover:bg-gray-100 w-full
          //   ${
          //     activeMission?.id === mission.id ? "bg-gray-200" : "text-gray-700"
          //   }
          //   ${expanded === mission.id ? "bg-gray-200" : "text-gray-700"}
          // `}
          //         onClick={() => {
          //           dispatch(setActiveMission(mission));
          //           dispatch(setMissionDetailsOpen(false));
          //           handleAccordionChange(mission.id);
          //         }}
          //       >
          //         <div className="flex flex-row items-center gap-2 w-full px-4">
          //           <img
          //             src={`images/houses/${mission.house}.png`}
          //             alt={mission.house}
          //             className="w-8 h-8 object-cover object-center rounded-full"
          //           />
          //           <h4 className="text-md font-semibold">{mission.title}</h4>
          //           <p className="text-sm font-regular ml-auto">
          //             {mission.housePoints} HP
          //           </p>
          //           <p className="text-sm font-regular">
          //             {missionTasks.length > 0 &&
          //               calculateMissionStat(
          //                 mission,
          //                 missionTasks,
          //                 "balance"
          //               )}{" "}
          //             / {mission.indiePoints}
          //           </p>
          //           <p className="text-sm font-regular">
          //             {missionTasks.length > 0 &&
          //               calculateMissionStat(mission, missionTasks, "status")}
          //           </p>
          //           {/* <p className="text-sm font-regular">{mission.createdAt ? prettyPrintDateInMMMDD(new Date(mission.createdAt)) : "uknown"}</p> */}
          //         </div>
          //         <div
          //           className="h-[2px] bg-green-500"
          //           style={{
          //             width: `${calculateMissionStat(
          //               mission,
          //               missionTasks,
          //               "percentage"
          //             )}%`,
          //           }}
          //         ></div>
          //       </div>
          //       <ExpandedMission expanded={expanded} mission={mission} />
          //     </React.Fragment>
        );
      })
  ) : (
    <div className="text-gray-500 px-4 py-10 flex justify-center items-center">
      No Missions Found
    </div>
  );
};

export default MissionList;
