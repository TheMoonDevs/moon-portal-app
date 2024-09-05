'use client';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { Mission } from '@prisma/client';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { useMemo } from 'react';
import { calculateMissionStat } from './MissionsList';

const ExpandedMission = ({
  expanded,
  mission,
}: {
  expanded: string | false;
  mission: Mission;
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
        <div className='mb-2 flex flex-col gap-2'>
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
          <div className='mb-6'>
            <div className='w-full bg-gray-200 rounded-full h-2.5'>
              <div
                className='bg-blue-600 h-2.5 rounded-full'
                style={{
                  width: `${missionPercentage}%`,
                }}
              ></div>
            </div>
            <p className='text-sm text-gray-600 mt-1'>
              {missionBalance} / {mission?.indiePoints} Indie Points remaining
            </p>
          </div>
        </div>
        <div className='flex flex-col gap-2'>
          <p className='text-sm text-gray-500'>Mission description</p>
          {mission?.description ? (
            <div className='bg-gray-50 p-3 rounded-md shadow-inner'>
              <MdxAppEditor
                key={mission?.id}
                markdown={mission?.description}
                readOnly={true}
                contentEditableClassName='mdx_ce_min leading-6 text-sm text-gray-800'
              />
            </div>
          ) : (
            <p className='text-sm text-gray-400'>
              Description not available for this mission
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpandedMission;
