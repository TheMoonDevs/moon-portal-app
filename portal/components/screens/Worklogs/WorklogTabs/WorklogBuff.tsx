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
import {
  getBuffLevelAndTitle,
  getColorsForBuffLevel,
  getPoints,
  isValidContent,
} from '@/utils/helpers/badges';
import { Summarize, SummarizeOutlined } from '@mui/icons-material';

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

  const loggedDays = useMemo(() => {
    return filteredLogs.filter((wl) => wl.works.length > 0 ? (wl.works[0] as any)?.content?.length > 3 : false).length;
  }, [filteredLogs]);

  //console.log('loggedDays:', filteredLogs.filter((wl) => wl.works.length > 0 ? (wl.works[0] as any)?.content?.length > 3 : false));

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
      // console.log(res.data)
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
  }, []);

  useEffect(() => {
    const { level, title } = getBuffLevelAndTitle(totalPoints);
    if (buffBadge.length === 0 && totalPoints > 0 && !loading) {
      createBadge(title, level);
    } else if (buffBadge.length > 0 && !loading) {
      if (
        buffBadge[0].buffLevel !== level ||
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
        <Box sx={{
          bgcolor: '#121212',
        }} className=' rounded-xl'>
          <Skeleton
            variant='rectangular'
            animation='pulse'
            sx={{
              borderRadius: 2,
              bgcolor: 'grey.800',
            }}
            height={150}
          />
        </Box>
      ) : filteredLogs && buffBadge.length > 0 && buffBadge[0].points > 0 ? (
        <>
          {
            <div className=' border border-neutral-700 rounded-xl shadow-xl bg-black text-white w-full max-w-lg mx-auto'>
              <div className=' px-6 py-3 text-xs flex flex-row items-center justify-between border-b-2 border-neutral-700'>
                <h2 className='text-center uppercase tracking-[1em] text-xs'>
                  {selectedMonth}
                </h2>
                <h2 className='text-center uppercase tracking-[0.1em] text-xs'>
                  {loggedDays} <span className='text-neutral-500'> / {dayjs().daysInMonth()} days </span>
                </h2>
              </div>
              <div className='p-6 pt-4 flex flex-row items-center justify-start gap-4'>
                <img
                  src={getBuffLevelAndTitle(buffBadge[0].points).src}
                  alt={buffBadge[0].title.charAt(0)}
                  className='w-24 rounded-full border p-1 border-white shadow-md'
                />
                <div className='flex flex-col flex-grow'>
                  <div className='flex flex-row items-center justify-between'>
                    <h3 className='text-xl'>
                      {getBuffLevelAndTitle(buffBadge[0].points).title}
                    </h3>
                    <p className='text-base text-xs text-neutral-400'>
                      <span className='font-bold'>{nextLevelPoints - totalPoints} pts till `{getBuffLevelAndTitle(nextLevelPoints).title}` </span>
                    </p>
                  </div>
                  <MultiColorProgressBar
                    currentPoints={totalPoints}
                    nextLevelPoints={nextLevelPoints}
                    colors={getColorsForBuffLevel(getBuffLevelAndTitle(buffBadge[0]?.points).level)}
                    height={8}
                  />
                </div>
              </div>
            </div>
          }
        </>
      ) : null}
    </>
  );
};
export default WorklogBuff;
