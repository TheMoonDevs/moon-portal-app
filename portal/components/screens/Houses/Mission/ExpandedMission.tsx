"use client";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { Mission } from "@prisma/client";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { useMemo } from "react";
import { Button } from "@mui/material";
import {
  setActiveTab,
  setEditModalOpen,
} from "@/utils/redux/missions/mission.ui.slice";
import { calculateMissionStat, getMissionProgress } from "./mission.utils";
import { MDXEditor } from "@mdxeditor/editor";

const ExpandedMission = ({
  expanded,
  mission,
}: {
  expanded: string | false;
  mission: Mission;
}) => {
  const dispatch = useAppDispatch();
  const { allTasks } = useAppSelector(
    (state: RootState) => state.missionsTasks
  );

  const missionTasks = allTasks?.filter((t) => t?.missionId === mission?.id);

  const missionStatus = useMemo(() => {
    return mission && calculateMissionStat(mission, missionTasks, "status");
  }, [mission, missionTasks]);

  const missionPercentage =
    mission && calculateMissionStat(mission, missionTasks, "percentage");

  const missionBalance = useMemo(() => {
    return mission && calculateMissionStat(mission, missionTasks, "balance");
  }, [mission, missionTasks]);

  return (
    <div
      className={`overflow-hidden transition-all duration-500 ${
        expanded === mission.id ? "max-h-[200px]" : "max-h-0"
      } border-b overflow-y-auto`}
    >
      <div className="p-4">
        {/* <div className="mb-6">
          <span className="text-4xl font-bold text-green-500">
            {getMissionProgress(missionTasks)}%
          </span>
          <span>
            <span className=" font-bold">{mission?.title}</span>
          </span>
        </div> */}
        <div>
          {mission?.description ? (
            <div>
              <h1 className="text-lg font-bold mb-2">Description</h1>
              <MdxAppEditor
                editorKey={mission?.id}
                markdown={mission?.description}
                readOnly={true}
                contentEditableClassName="mdx_ce_min leading-6 text-sm text-gray-800 bg-neutral-100 rounded-md"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Description not available for this mission
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
// <div
//   className={`overflow-hidden transition-all duration-500 ${
//     expanded === mission.id ? "max-h-[200px]" : "max-h-0"
//   } border border-neutral-300 rounded-lg shadow-sm overflow-y-scroll`}
// >
//   <div className="p-4 bg-white">
//     <div className="mb-4 flex flex-row items-center justify-between gap-4">
//       <p className="text-sm text-gray-500 font-medium">
//         <strong className="text-gray-700">House Points:</strong>{" "}
//         {mission.housePoints}
//       </p>
//       <p className="text-sm text-gray-500 font-medium">
//         <strong className="text-gray-700">Total Indie Points:</strong>{" "}
//         {mission.indiePoints}
//       </p>
//       <p className="text-sm text-gray-500 font-medium">
//         <strong className="text-gray-700">Status:</strong>{" "}
//         {calculateMissionStat(mission, missionTasks, "status") == 0
//           ? "Not Started yet"
//           : calculateMissionStat(mission, missionTasks, "status")}
//       </p>
//     </div>
//     <div className="mb-6">
//       <div className="w-full bg-gray-200 rounded-full h-3">
//         <div
//           className="bg-blue-600 h-3 rounded-full"
//           style={{
//             width: `${missionPercentage}%`,
//           }}
//         ></div>
//       </div>
//       <p className="text-sm text-gray-600 mt-2">
//         {missionBalance} / {mission?.indiePoints} Indie Points remaining
//       </p>
//     </div>
//     <div className="flex flex-col gap-4">
//       <p className="text-sm text-gray-500 font-medium">
//         Mission description
//       </p>
//       {mission?.description ? (
//         <div className="bg-gray-50 p-4 rounded-md shadow-inner">
//           <MdxAppEditor
//             editorKey={mission?.id}
//             markdown={mission?.description}
//             readOnly={true}
//             contentEditableClassName="mdx_ce_min leading-6 text-sm text-gray-800"
//           />
//         </div>
//       ) : (
//         <p className="text-sm text-gray-400 italic">
//           Description not available for this mission
//         </p>
//       )}
//       {missionTasks.length > 0 && (
//         <p className="text-sm text-gray-500 font-medium">
//           No of Tasks for this mission: 0/{missionTasks.length}
//         </p>
//       )}
//       <Button
//         variant="contained"
//         color="primary"
//         onClick={() => {
//           dispatch(setActiveTab("tasks"));
//           dispatch(setEditModalOpen(true));
//         }}
//       >
//         Add New Task
//       </Button>
//     </div>
//   </div>
// </div>

export default ExpandedMission;
