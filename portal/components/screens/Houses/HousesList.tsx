/* eslint-disable @next/next/no-img-element */

import type { Mission, User } from '@db/client';
import { HOUSEID } from '@db/client';
import { Avatar, AvatarGroup, Tooltip } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { Spinner } from '@/components/elements/Loaders';
import { setActiveMission } from '@/utils/redux/missions/mission.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

interface House {
  id: HOUSEID;
  name: string;
  description: string;
  image: string;
  background: string;
}

export const HOUSES_LIST: House[] = [
  {
    id: HOUSEID.MANAGEMENT,
    name: 'Management',
    description: 'Management House',
    image: `images/houses/${HOUSEID.MANAGEMENT}.png`,
    background: `linear-gradient(180deg, #D40000, #000000)`,
  },
  {
    id: HOUSEID.GROWTH,
    name: 'Growth',
    description: 'Growth House',
    image: `images/houses/${HOUSEID.GROWTH}.png`,
    background: `linear-gradient(180deg, #540907, #060405)`,
  },
  {
    id: HOUSEID.EXECUTIVE,
    name: 'Executive',
    description: 'Executive House',
    image: `images/houses/${HOUSEID.EXECUTIVE}.png`,
    background: `linear-gradient(180deg, #0A95A8, #10303C)`,
  },
  {
    id: HOUSEID.PRODUCT_TECH,
    name: 'Product',
    description: 'Product House',
    image: `images/houses/${HOUSEID.PRODUCT_TECH}.png`,
    background: `linear-gradient(180deg, #62368D, #291643)`,
  },
];

function sumHousePoints(missions: Mission[], targetHouse: HOUSEID): number {
  return missions.reduce((total, mission) => {
    if (mission.house === targetHouse) {
      return total + mission.housePoints;
    }
    return total;
  }, 0);
}

interface HousesListProps {
  currentHouseIndex: number;
  setCurrentHouseIndex: (index: number) => void;
  houseMembers: User[];
  houseMembersLoading: boolean;
}

export const HousesList = ({
  currentHouseIndex,
  setCurrentHouseIndex,
  houseMembers,
  houseMembersLoading,
}: HousesListProps) => {
  const { allMissions } = useAppSelector((state: RootState) => state.mission);
  const dispatch = useAppDispatch();
  const toggleHouse = useCallback(
    (index: number) => {
      setCurrentHouseIndex(currentHouseIndex === index ? -1 : index);
    },
    [currentHouseIndex, setCurrentHouseIndex],
  );

  const housePoints = useMemo(() => {
    return HOUSES_LIST.map((house) => ({
      id: house.id,
      points: sumHousePoints(allMissions || [], house.id),
    }));
  }, [allMissions]);

  const getHousePoints = (houseId: HOUSEID) => {
    const housePoint = housePoints.find((h) => h.id === houseId);
    return housePoint ? housePoint.points : 0;
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4 pr-0">
      {HOUSES_LIST.map((house, index) => (
        <div
          key={house.id}
          style={{
            background: house.background,
          }}
          onClick={() => {
            dispatch(setActiveMission(null));
            toggleHouse(index);
          }}
          className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 text-white transition-all duration-1000 ease-in-out"
        >
          <div className="relative">
            <div className="absolute right-4 top-9 cursor-pointer">
              {currentHouseIndex === index ? (
                <ChevronUp size={24} />
              ) : (
                <ChevronDown size={24} />
              )}
            </div>
            <div
              className={`flex flex-row items-center gap-2 border-b border-white/20 p-4 px-8 transition-all duration-300 ease-in-out ${
                currentHouseIndex === index
                  ? ''
                  : 'items-center justify-between'
              }`}
            >
              <img
                src={house.image}
                alt={house.name}
                className={`object-cover object-center transition-all duration-300 ease-in-out ${
                  currentHouseIndex === index
                    ? 'size-44 rounded-full'
                    : 'size-16 overflow-y-hidden rounded-full'
                }`}
              />
              <div
                className={`p-4 transition-all duration-300 ease-in-out ${
                  currentHouseIndex === index
                    ? ''
                    : 'flex flex-1 items-center justify-between'
                }`}
              >
                <h3 className="font-regular text-xl uppercase tracking-widest">
                  {house.name}
                </h3>
                {currentHouseIndex === index ? (
                  <div className="flex flex-col">
                    <h1 className="text-[3em] font-bold">
                      {houseMembersLoading ? (
                        <Spinner />
                      ) : (
                        getHousePoints(house.id)
                      )}
                    </h1>
                    <div>
                      <p className="text-sm">House Members</p>
                      {houseMembersLoading ? (
                        <div className="mt-2 size-12 animate-pulse rounded-full bg-gray-300 pt-2"></div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2 overflow-x-auto">
                          <AvatarGroup max={4}>
                            {houseMembers
                              .filter((member) => member.house === house.id)
                              .map((member) => (
                                <Tooltip
                                  key={member.id}
                                  title={member.name || ''}
                                >
                                  <Avatar
                                    src={member.avatar || ''}
                                    alt={member.name || ''}
                                    className="size-12 rounded-full"
                                  />
                                </Tooltip>
                              ))}
                          </AvatarGroup>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="mr-2">HP:</span>
                    <span className="text-2xl font-bold">
                      {houseMembersLoading ? (
                        <Spinner />
                      ) : (
                        sumHousePoints(allMissions || [], house.id)
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {currentHouseIndex === index && (
            <div className="p-4">
              <p className="text-sm">{house.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
