'use client';
import type { User } from '@db/client';
import { useEffect, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

import { HousesList } from './HousesList';
import { Missions } from './Mission/Missions';
import Tasks from './Mission/Task/Tasks';

export const HousesPage = () => {
  const [loading, setloading] = useState<boolean>(true);
  // This state is created to show first house mission on mount and to alternate between house missions
  const [currentHouseIndex, setCurrentHouseIndex] = useState<number>(0);
  const [houseMembers, setHouseMembers] = useState<User[]>([]);
  const [houseMembersLoading, setHouseMembersLoading] = useState<boolean>(true);
  useEffect(() => {
    PortalSdk.getData('/api/users', null)
      .then((data) => {
        setHouseMembers(data.data.user);
        setHouseMembersLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <div className="grid max-h-[96vh] grid-cols-8 gap-4">
      <div className="col-span-3">
        <HousesList
          setCurrentHouseIndex={setCurrentHouseIndex}
          currentHouseIndex={currentHouseIndex}
          houseMembers={houseMembers}
          houseMembersLoading={houseMembersLoading}
        />
      </div>
      <div className="col-span-3">
        <Missions
          loading={loading}
          currentHouseIndex={currentHouseIndex}
          houseMembers={houseMembers}
        />
      </div>
      <div className="col-span-2">
        <Tasks userList={houseMembers} currentHouseIndex={currentHouseIndex} />
        {/* <MissionDetails loading={loading} /> */}
      </div>
    </div>
  );
};
