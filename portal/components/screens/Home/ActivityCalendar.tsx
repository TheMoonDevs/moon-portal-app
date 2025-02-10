import { WorkLogs } from '@prisma/client';
import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import ActivityCalendar, { ThemeInput } from 'react-activity-calendar';
import {
  Box,
  Tooltip as MuiTooltip,
  Skeleton,
  useMediaQuery,
} from '@mui/material';
import useAsyncState from '@/utils/hooks/useAsyncState';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { RootState, useAppSelector } from '@/utils/redux/store';
import media, { breakpoints } from '@/styles/media';

const customTheme: ThemeInput = {
  light: [
    '#d6d6d6',
    '#e8f5e9',
    '#c8e6c9',
    '#a5d6a7',
    '#81c784',
    '#66bb6a',
    '#43a047',
    '#2e7d32',
    '#1b5e20',
    '#000000',
  ],
  dark: [
    '#2e2e2e',
    '#1b5e20',
    '#388e3c',
    '#43a047',
    '#66bb6a',
    '#81c784',
    '#a5d6a7',
    '#c8e6c9',
    '#e8f5e9',
    '#d6d6d6',
  ],
};

const getStatsOfContent = (content: string) => {
  const checks = (content?.match(/✅/g) || []).length;
  const points = (content?.match(/\n/g) || []).length + 1;
  return { checks, points };
};

const getAllDatesOfCurrentYear = () => {
  const startOfYear = dayjs().startOf('year');
  const endOfYear = dayjs().endOf('year');
  const dates = [];

  for (
    let date = startOfYear;
    date.isBefore(endOfYear) || date.isSame(endOfYear);
    date = date.add(1, 'day')
  ) {
    dates.push(date.format('YYYY-MM-DD'));
  }

  return dates;
};

const getLevelFromContribution = (count: number) => {
  if (count >= 8) return 1;
  return 9 - Math.min(count, 7);
};

const ReactActivityCalendar = () => {
  const { loading, setLoading } = useAsyncState();
  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const selectedUser = useAppSelector(
    (state: RootState) => state.coreTeam.selectedMember,
  );
  const allDatesOfCurrentYear = getAllDatesOfCurrentYear();

  const fetchWorklogDataYearly = useCallback(async () => {
    setLoading(true);
    try {
      const response = await PortalSdk.getData(
        `/api/user/worklogs/summary?userId=${
          selectedUser?.id
        }&year=${dayjs().year()}`,
        null,
      );
      setWorklogSummary(response.data.workLogs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, selectedUser?.id]);

  useEffect(() => {
    fetchWorklogDataYearly();
  }, []);

  const calendarData = allDatesOfCurrentYear.map((date) => {
    const worklogForDate = worklogSummary.find((worklog) =>
      dayjs(worklog.date).isSame(date, 'day'),
    );

    let checks = 0;

    if (worklogForDate && Array.isArray(worklogForDate.works)) {
      worklogForDate.works.forEach((work) => {
        if (work && typeof work === 'object' && 'content' in work) {
          const stats = getStatsOfContent(work.content as string);
          checks += stats.checks;
        }
      });
    }

    const level = getLevelFromContribution(checks);

    return {
      date,
      count: checks,
      level,
    };
  });

  return (
    <div
      className={`flex items-center overflow-x-auto py-4`}
      style={{
        width:
          innerWidth > breakpoints.tablet ? '100%' : window.innerWidth - 40,
      }}
    >
      {loading ? (
        <SkeletonLoader />
      ) : worklogSummary.length > 0 ? (
        <ActivityCalendar
          data={calendarData}
          renderBlock={(block, activity) => (
            <MuiTooltip
              title={`${activity.count} Contributions on ${activity.date}`}
              sx={{ cursor: 'pointer' }}
            >
              {block}
            </MuiTooltip>
          )}
          renderColorLegend={(block, level) => (
            <MuiTooltip title={`Level: ${level}`}>{block}</MuiTooltip>
          )}
          blockMargin={3}
          maxLevel={9}
          hideColorLegend
          hideTotalCount
          showWeekdayLabels
          blockSize={12}
          theme={customTheme}
          weekStart={0}
        />
      ) : (
        <div className="flex items-center justify-center">
          <p className="text-neutral-400">No Activities Found.</p>
        </div>
      )}
    </div>
  );
};

export default ReactActivityCalendar;

const SkeletonLoader = () => {
  return (
    <Box display="grid" gridTemplateColumns="repeat(10, 1fr)" gap={1} p={2}>
      {Array.from(Array(30)).map((_, index) => (
        <Skeleton key={index} variant="circular" width={20} height={20} />
      ))}
    </Box>
  );
};
