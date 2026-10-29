/* eslint-disable @next/next/no-img-element */
'use client';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

import type { WorkScore } from '@/lib/progress/buff';
import {
  getBuffLevelAndTitle,
  getColorsForBuffLevel,
  nextBuffLevel,
} from '@/lib/progress/buff';
import { PortalSdk } from '@/utils/services/PortalSdk';

import MultiColorProgressBar from './MultiColorProgressBar';

/**
 * A month's level: its points from tasks and work points (a point for each
 * day a task gets work, more for finishing it), the days worked, and how
 * far it is to the next level.
 */
const WorklogBuff = ({
  month,
  version = 0,
}: {
  /** YYYY-MM */
  month: string;
  /** Changes when the person's tasks change, to read the score again. */
  version?: number;
}) => {
  const [score, setScore] = useState<WorkScore | null>(null);

  useEffect(() => {
    let live = true;
    const timer = setTimeout(
      () =>
        PortalSdk.getData(`/api/me/month?month=${month}`, null)
          .then((res) => live && setScore(res?.data ?? null))
          .catch(() => undefined),
      version ? 1000 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [month, version]);

  if (!score) return null;

  const start = dayjs(`${month}-01`);
  const buff = getBuffLevelAndTitle(score.points);
  const next = nextBuffLevel(buff.level);
  const from = buff.marker > 1 ? buff.marker : 0;

  return (
    <div className="mx-auto w-full max-w-lg rounded-xl border border-neutral-700 bg-black text-white shadow-xl">
      <div className="flex flex-row items-center justify-between border-b-2 border-neutral-700 px-6 py-3 text-xs">
        <h2 className="text-center text-xs uppercase tracking-[1em]">
          {start.format('MMMM')}
        </h2>
        <h2 className="text-center text-xs uppercase tracking-widest">
          {score.days}{' '}
          <span className="text-neutral-500">/ {start.daysInMonth()} days</span>
        </h2>
      </div>
      <div className="flex flex-row items-center justify-start gap-4 p-6 pt-4">
        <img
          src={buff.src}
          alt={buff.title.charAt(0)}
          className="w-24 rounded-full border border-white p-1 shadow-md"
        />
        <div className="flex min-w-0 grow flex-col">
          <div className="flex flex-row items-center justify-between gap-3">
            <h3 className="text-xl">{buff.title}</h3>
            <p className="text-right text-xs font-bold text-neutral-400">
              {next
                ? `${next.marker - score.points} pts till ${next.title}`
                : 'Top level'}
            </p>
          </div>
          <MultiColorProgressBar
            currentPoints={next ? score.points - from : 1}
            nextLevelPoints={next ? next.marker - from : 1}
            colors={getColorsForBuffLevel(buff.level)}
            height={8}
          />
          <p
            className="mt-2 text-[11px] text-neutral-500"
            title="A point for each day you work on a task, and 1 more when you finish it (3 for a major task)."
          >
            {score.points} pts · {score.finished} task
            {score.finished === 1 ? '' : 's'} finished
          </p>
        </div>
      </div>
    </div>
  );
};
export default WorklogBuff;
