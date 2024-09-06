'use client';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { Mission } from '@prisma/client';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { useMemo } from 'react';
import { calculateMissionStat } from './MissionsList';
import { Button } from '@mui/material';

const ExpandedMission = ({
  expanded,
  mission,
  setIsOpen,
  setActiveTab,
}: {
  expanded: string | false;
  mission: Mission;
  setIsOpen: () => void;
  setActiveTab: () => void;
}) => {
  const { tasks } = useAppSelector((state: RootState) => state.missionsTasks);

  const missionTasks = tasks?.filter((t) => t?.missionId === mission?.id);

  const missionStatus = useMemo(() => {
    return mission && calculateMissionStat(mission, missionTasks, 'status');
  }, [mission, missionTasks]);

  const missionPercentage = useMemo(() => {
    return mission && calculateMissionStat(mission, missionTasks, 'percentage');
  }, [mission, missionTasks]);

  const missionBalance = useMemo(() => {
    return mission && calculateMissionStat(mission, missionTasks, 'balance');
  }, [mission, missionTasks]);

  return (
    <div
      className={`overflow-hidden transition-all duration-500 ${
        expanded === mission.id ? 'max-h-[200px]' : 'max-h-0'
      } border border-neutral-300 rounded-lg shadow-sm overflow-y-scroll`}
    >
      <div className='p-4 bg-white'>
        <div className='mb-4 flex flex-row items-center justify-between gap-4'>
          <p className='text-sm text-gray-500 font-medium'>
            <strong className='text-gray-700'>House Points:</strong>{' '}
            {mission.housePoints}
          </p>
          <p className='text-sm text-gray-500 font-medium'>
            <strong className='text-gray-700'>Total Indie Points:</strong>{' '}
            {mission.indiePoints}
          </p>
          <p className='text-sm text-gray-500 font-medium'>
            <strong className='text-gray-700'>Status:</strong>{' '}
            {calculateMissionStat(mission, missionTasks, 'status') == 0
              ? 'Not Started yet'
              : calculateMissionStat(mission, missionTasks, 'status')}
          </p>
        </div>
        <div className='mb-6'>
          <div className='w-full bg-gray-200 rounded-full h-3'>
            <div
              className='bg-blue-600 h-3 rounded-full'
              style={{
                width: `${missionPercentage}%`,
              }}
            ></div>
          </div>
          <p className='text-sm text-gray-600 mt-2'>
            {missionBalance} / {mission?.indiePoints} Indie Points remaining
          </p>
        </div>
        <div className='flex flex-col gap-4'>
          <p className='text-sm text-gray-500 font-medium'>
            Mission description
          </p>
          {mission?.description ? (
            <div className='bg-gray-50 p-4 rounded-md shadow-inner'>
              <MdxAppEditor
                key={mission?.id}
                markdown={mission?.description}
                readOnly={true}
                contentEditableClassName='mdx_ce_min leading-6 text-sm text-gray-800'
              />
            </div>
          ) : (
            <p className='text-sm text-gray-400 italic'>
              Description not available for this mission
            </p>
          )}
          {missionTasks.length > 0 && (
            <p className='text-sm text-gray-500 font-medium'>
              No of Tasks for this mission: 0/{missionTasks.length}
            </p>
          )}
          <Button
            variant='contained'
            color='primary'
            onClick={() => {
              setActiveTab();
              setIsOpen();
            }}
          >
            Add New Task
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpandedMission;
