import { useUser } from "@/utils/hooks/useUser";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Drawer } from "@mui/material";
import { User } from "@prisma/client";
import MissionForm from "./Mission/MissionForm";

import TaskForm from "./Mission/Task/TaskForm";
import {
  clearEditorState,
  setEditModalOpen,
} from "@/utils/redux/missions/mission.ui.slice";
import { setActiveTask } from "@/utils/redux/missions/missionsTasks.slice";
import { setActiveMission } from "@/utils/redux/missions/mission.slice";

const CreateMissionSlider = ({
  houseMembers,
  activeTab,
  currentHouseIndex,
}: {
  houseMembers: User[];
  activeTab: string;
  currentHouseIndex: number;
}) => {
  const { user } = useUser();
  const dispatch = useAppDispatch();
  const { isEditModalOpen } = useAppSelector(
    (state: RootState) => state.missionUi
  );
  const { activeTask } = useAppSelector(
    (state: RootState) => state.missionsTasks
  );
  const { activeMission } = useAppSelector((state: RootState) => state.mission);

  return (
    <Drawer
      anchor="right"
      open={isEditModalOpen}
      // open={false}
      onClose={() => {
        dispatch(clearEditorState());
        activeTask && dispatch(setActiveTask(null));
        dispatch(setEditModalOpen(false));
      }}
    >
      {
        activeTab === "missions" && (
          <MissionForm currentHouseIndex={currentHouseIndex} />
        )

        //   <MissionForm />
      }
      {activeTab === "tasks" && <TaskForm houseMembers={houseMembers} />}
    </Drawer>
  );
};

export default CreateMissionSlider;
