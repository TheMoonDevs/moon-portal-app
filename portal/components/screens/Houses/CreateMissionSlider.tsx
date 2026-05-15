import type { User } from '@db/client';
import { Drawer } from '@mui/material';

import { useUser } from '@/utils/hooks/useUser';
import {
  clearEditorState,
  setEditModalOpen,
} from '@/utils/redux/missions/mission.ui.slice';
import { setActiveTask } from '@/utils/redux/missions/missionsTasks.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

import MissionForm from './Mission/MissionForm';
import TaskForm from './Mission/Task/TaskForm';

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
    (state: RootState) => state.missionUi,
  );
  const { activeTask } = useAppSelector(
    (state: RootState) => state.missionsTasks,
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
        activeTab === 'missions' && (
          <MissionForm currentHouseIndex={currentHouseIndex} />
        )

        //   <MissionForm />
      }
      {activeTab === 'tasks' && <TaskForm houseMembers={houseMembers} />}
    </Drawer>
  );
};

export default CreateMissionSlider;
