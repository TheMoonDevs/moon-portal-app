/* eslint-disable @next/next/no-img-element */
'use client';
import { useUser } from '@/utils/hooks/useUser';
import { Box, LinearProgress, styled, Typography } from '@mui/material';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { WorkLogs, BuffBadge, BUFF_LEVEL } from '@prisma/client';
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Skeleton } from '@mui/material';
import MultiColorProgressBar from './MultiColorProgressBar';

export const getPoints = (content: string) => {
  const points = (content?.match(/\n/g) || []).length + 1;
  return points;
};

const getColorsForBuffLevel = (level: BUFF_LEVEL) => {
  switch (level) {
    case BUFF_LEVEL.TRUTH_SEEKER:
      return ['#4caf50', '#81c784'];
    case BUFF_LEVEL.BABY_GROOT:
      return ['#8bc34a', '#c5e1a5'];
    case BUFF_LEVEL.WORK_HULK:
      return ['#f44336', '#ef5350'];
    case BUFF_LEVEL.VAMPIRE_LORD:
      return ['#9c27b0', '#d81b60'];
    case BUFF_LEVEL.ALIEN_PREDATOR:
      return ['#ff5722', '#ff8a65'];
    case BUFF_LEVEL.DEVIL:
      return ['#f44336', '#d50000'];
    default:
      return ['#e0e0e0', '#9e9e9e'];
  }
};

const isValidContent = (content: string) => {
  const trimmedContent = content.trim();
  return trimmedContent.length > 0 && /[a-zA-Z0-9]/.test(trimmedContent);
};

export const getBuffLevelAndTitle = (points: number) => {
  if (points < 10)
    return {
      level: BUFF_LEVEL.TRUTH_SEEKER,
      title: 'Truth Seeker',
      src: '/images/buff/truthSeeker.jpeg',
    };
  if (points < 25)
    return {
      level: BUFF_LEVEL.BABY_GROOT,
      title: 'Baby Groot',
      src: '/images/buff/babyGroot.jpeg',
    };
  if (points < 100)
    return {
      level: BUFF_LEVEL.WORK_HULK,
      title: 'Work Hulk',
      src: '/images/buff/workHulk.jpeg',
    };
  if (points < 150)
    return {
      level: BUFF_LEVEL.VAMPIRE_LORD,
      title: 'Vampire Lord',
      src: '/images/buff/vampire.jpeg',
    };
  if (points < 200)
    return {
      level: BUFF_LEVEL.ALIEN_PREDATOR,
      title: 'Alien Predator',
      src: '/images/buff/alien.jpeg',
    };
  return {
    level: BUFF_LEVEL.DEVIL,
    title: 'Devil',
    src: '/images/buff/devil.jpeg',
  };
};

const WorklogBuff = ({
  filteredLogs,
  monthTab,
}: {
  filteredLogs: WorkLogs[];
  monthTab: number;
}) => {
  const [buffBadge, setBuffBadge] = useState<BuffBadge[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useUser();
  const selectedMonth = dayjs().month(monthTab).format('MMMM');
  const [lastSelectedMonth, setLastSelectedMonth] = useState<string | null>(
    null
  );

  const totalPoints = useMemo(() => {
    return filteredLogs.reduce((total, log: WorkLogs) => {
      const logPoints = log.works.reduce((sum: number, work) => {
        const workContent = (
          typeof work === 'object' && work !== null && 'content' in work
            ? work.content
            : ''
        ) as string;

        if (isValidContent(workContent)) {
          return sum + getPoints(workContent);
        }
        return sum;
      }, 0);
      return total + logPoints;
    }, 0);
  }, [filteredLogs]);

  const getBuffBadges = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id ?? '',
        month: selectedMonth,
      }).toString();

      const res = await PortalSdk.getData(
        `/api/badges/buff-badges?${params}`,
        null
      );
      setBuffBadge(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const createBadge = async (title: string, buffLevel: BUFF_LEVEL) => {
    if (!user?.id) return;
    try {
      const res = await PortalSdk.postData('/api/badges/buff-badges', {
        userId: user?.id,
        title,
        points: totalPoints,
        buffLevel,
        month: selectedMonth,
      });
      setBuffBadge([res.data]);
    } catch (error) {
      console.error('Error creating buff badge:', error);
    }
  };

  const updateBadge = async (
    badgeId: string,
    title: string,
    buffLevel: BUFF_LEVEL
  ) => {
    if (!user?.id) return;
    try {
      const res = await PortalSdk.putData(`/api/badges/buff-badges`, {
        id: badgeId,
        userId: user?.id,
        title,
        points: totalPoints,
        buffLevel,
      });
      setBuffBadge([res.data]);
    } catch (error) {
      console.error('Error updating buff badge:', error);
    }
  };

  useEffect(() => {
    getBuffBadges();
    setLastSelectedMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    const { level, title } = getBuffLevelAndTitle(totalPoints);
    if (buffBadge.length === 0 && totalPoints > 0 && !loading) {
      createBadge(title, level);
    } else if (buffBadge.length > 0 && !loading) {
      if (
        (selectedMonth === lastSelectedMonth &&
          buffBadge[0].buffLevel !== level) ||
        buffBadge[0].title !== title ||
        totalPoints !== buffBadge[0].points
      ) {
        updateBadge(buffBadge[0].id, title, level);
      }
    }
  }, [totalPoints, buffBadge, loading]);

  const { level } = getBuffLevelAndTitle(totalPoints);

  const nextLevelPoints =
    level === BUFF_LEVEL.TRUTH_SEEKER
      ? 10
      : level === BUFF_LEVEL.BABY_GROOT
      ? 25
      : level === BUFF_LEVEL.WORK_HULK
      ? 100
      : level === BUFF_LEVEL.VAMPIRE_LORD
      ? 150
      : level === BUFF_LEVEL.ALIEN_PREDATOR
      ? 200
      : 250;

  return (
    <>
      {loading ? (
        <Skeleton
          variant='rectangular'
          animation='wave'
          sx={{
            borderRadius: '6px',
            boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
          }}
          height={224}
        />
      ) : filteredLogs && buffBadge.length > 0 ? (
        <>
          {
            <div className='p-6 border border-neutral-700 rounded-xl shadow-xl bg-gradient-to-br from-neutral-800 to-neutral-900 text-white w-full max-w-lg mx-auto'>
              <h2 className='text-center text-2xl font-bold mb-4'>
                {selectedMonth} Badge
              </h2>
              <div className='flex flex-row items-center justify-center gap-4'>
                <img
                  src={getBuffLevelAndTitle(buffBadge[0].points).src}
                  alt={buffBadge[0].title.charAt(0)}
                  className='w-24 h-24 rounded-full mb-2 border-4 border-neutral-600 shadow-md'
                />
                <div className='flex flex-col gap-2'>
                  <h3 className='text-xl font-semibold'>
                    {buffBadge[0].title}
                  </h3>
                  <p className='text-base text-neutral-400'>
                    {selectedMonth} Work Points -{' '}
                    <span className='font-bold'>{buffBadge[0].points} pts</span>
                  </p>
                </div>
              </div>
              <div className='mt-6'>
                <MultiColorProgressBar
                  currentPoints={totalPoints}
                  nextLevelPoints={nextLevelPoints}
                  colors={getColorsForBuffLevel(buffBadge[0]?.buffLevel)}
                  height={15}
                />
              </div>
            </div>
          }
        </>
      ) : null}
    </>
  );
};
export default WorklogBuff;
