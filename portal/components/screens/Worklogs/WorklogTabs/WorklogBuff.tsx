/* eslint-disable @next/next/no-img-element */
'use client';
import type { WorkLogs } from '@db/client';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';

import {
  getBuffLevelAndTitle,
  getColorsForBuffLevel,
  worklogPoints,
} from '@/lib/progress/buff';

import MultiColorProgressBar from './MultiColorProgressBar';

/** This month's worklog buff: level, points and progress to the next one. */
const WorklogBuff = ({
  filteredLogs,
  monthTab,
}: {
  filteredLogs: WorkLogs[];
  monthTab: number;
}) => {
  const selectedMonth = dayjs().month(monthTab).format('MMMM');

  const totalPoints = useMemo(
    () => worklogPoints(filteredLogs),
    [filteredLogs],
  );

  const loggedDays = useMemo(
    () =>
      filteredLogs.filter((wl) =>
        wl.works.length > 0 ? (wl.works[0] as any)?.content?.length > 3 : false,
      ).length,
    [filteredLogs],
  );

  if (!filteredLogs || totalPoints <= 0) return null;

  const buff = getBuffLevelAndTitle(totalPoints);
  const nextLevelPoints = buff.next;

  return (
    <div className="mx-auto w-full max-w-lg rounded-xl border border-neutral-700 bg-black text-white shadow-xl">
      <div className="flex flex-row items-center justify-between border-b-2 border-neutral-700 px-6 py-3 text-xs">
        <h2 className="text-center text-xs uppercase tracking-[1em]">
          {selectedMonth}
        </h2>
        <h2 className="text-center text-xs uppercase tracking-widest">
          {loggedDays}{' '}
          <span className="text-neutral-500">
            {' '}
            / {dayjs().month(monthTab).daysInMonth()} days{' '}
          </span>
        </h2>
      </div>
      <div className="flex flex-row items-center justify-start gap-4 p-6 pt-4">
        <img
          src={buff.src}
          alt={buff.title.charAt(0)}
          className="w-24 rounded-full border border-white p-1 shadow-md"
        />
        <div className="flex grow flex-col">
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-xl">{buff.title}</h3>
            <p className="text-xs text-neutral-400">
              <span className="font-bold">
                {Math.max(nextLevelPoints - totalPoints, 0)} pts till `
                {getBuffLevelAndTitle(nextLevelPoints).title}`{' '}
              </span>
            </p>
          </div>
          <MultiColorProgressBar
            currentPoints={totalPoints}
            nextLevelPoints={nextLevelPoints}
            colors={getColorsForBuffLevel(buff.level)}
            height={8}
          />
        </div>
      </div>
    </div>
  );
};
export default WorklogBuff;
