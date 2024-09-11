import dayjs from 'dayjs';
import { getStatsOfContent } from './Pattern';
import { ArrayHelper } from '@/utils/helpers/array';
import { WorkLogs } from '@prisma/client';

const calculateProductivityRatio = (completedTasks: number, totalTasks: number) => {
  return totalTasks === 0 ? 0 : completedTasks / totalTasks;
};

const findProductiveDays = (dailyTasks: Record<string, { totalTasks: number; completedTasks: number }>) => {
  let mostProductiveDay = '';
  let leastProductiveDay = '';
  let maxCompletedTasks = -1;
  let minProductivityRatio = Infinity;

  Object.keys(dailyTasks).forEach(day => {
    const { completedTasks, totalTasks } = dailyTasks[day];
    const productivityRatio = calculateProductivityRatio(completedTasks, totalTasks);

    if (completedTasks > maxCompletedTasks) {
      mostProductiveDay = day;
      maxCompletedTasks = completedTasks;
    }

    if (productivityRatio < minProductivityRatio && totalTasks > 0) {
      leastProductiveDay = day;
      minProductivityRatio = productivityRatio;
    }
  });

  return { mostProductiveDay, leastProductiveDay };
};

const formatDay = (day: string) => dayjs(day).format('MMM D');

export const groupByWeek = (worklogSummary: WorkLogs[]) => {
  const weeksData: Record<string, {
    totalTasks: number;
    completedTasks: number;
    dailyTasks: Record<string, { totalTasks: number; completedTasks: number }>;
    missedLogs: number;
  }> = {};

  ArrayHelper.forwardSortByDate(worklogSummary, "date").forEach(log => {
    const date = dayjs(log.date);
    const startOfMonth = date.startOf('month');
    const weekOfMonth = Math.floor(date.diff(startOfMonth, 'day') / 7) + 1;
    const weekStart = startOfMonth.add((weekOfMonth - 1) * 7, 'day');
    let weekEnd = weekStart.add(6, 'day');

    if (weekEnd.isAfter(date.endOf('month'))) {
      weekEnd = date.endOf('month');
    }

    const weekLabel = `Week ${weekOfMonth} (${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')})`;

    if (!weeksData[weekLabel]) {
      weeksData[weekLabel] = { totalTasks: 0, completedTasks: 0, dailyTasks: {}, missedLogs: 0 };
    }

    log.works.forEach((work: any) => {
      const { checks, points } = getStatsOfContent(
        (typeof work === 'object' && work !== null && 'content' in work
          ? work.content
          : '') as string
      );
      weeksData[weekLabel].totalTasks += points;
      weeksData[weekLabel].completedTasks += checks;

      const day = date.format('YYYY-MM-DD');
      if (!weeksData[weekLabel].dailyTasks[day]) {
        weeksData[weekLabel].dailyTasks[day] = { totalTasks: 0, completedTasks: 0 };
      }
      weeksData[weekLabel].dailyTasks[day].totalTasks += points;
      weeksData[weekLabel].dailyTasks[day].completedTasks += checks;
    });
  });

  Object.keys(weeksData).forEach(weekLabel => {
    const weekData = weeksData[weekLabel];
    const weekStart = dayjs(weekLabel.split(' (')[1].split(' - ')[0], 'MMM D');
    const weekEnd = dayjs(weekLabel.split(' - ')[1].replace(')', ''), 'MMM D');
    const totalDaysInWeek = weekEnd.diff(weekStart, 'day') + 1;

    const loggedDays = Object.keys(weekData.dailyTasks).length;
    weeksData[weekLabel].missedLogs = totalDaysInWeek - loggedDays;
  });

  return weeksData;
};

export const getWeekData = (groupedByWeek: any) => {
  return Object.keys(groupedByWeek).map((weekLabel) => {
    const dailyTasks = groupedByWeek[weekLabel].dailyTasks;
    const { mostProductiveDay, leastProductiveDay } = findProductiveDays(dailyTasks);

    const mostProductiveDate = formatDay(mostProductiveDay);
    const leastProductiveDate = formatDay(leastProductiveDay);

    const completedTasksMost = dailyTasks[mostProductiveDay]?.completedTasks || 0;
    const totalTasksMost = dailyTasks[mostProductiveDay]?.totalTasks || 0;

    const completedTasksLeast = dailyTasks[leastProductiveDay]?.completedTasks || 0;
    const totalTasksLeast = dailyTasks[leastProductiveDay]?.totalTasks || 0;

    return {
      weekLabel,
      ...groupedByWeek[weekLabel],
      mostProductiveDay: mostProductiveDay ? `${mostProductiveDate} (${completedTasksMost}/${totalTasksMost})` : 'N/A',
      leastProductiveDay: leastProductiveDay ? `${leastProductiveDate} (${completedTasksLeast}/${totalTasksLeast})` : 'N/A',
    };
  });
};

export const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return 0;
  const change = ((current - previous) / previous) * 100;
  return parseFloat(change.toFixed(1));
};
