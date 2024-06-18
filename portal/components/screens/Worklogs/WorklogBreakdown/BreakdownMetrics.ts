import { WorkLogs } from "@prisma/client";
import {
  differenceInDays,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface Metrics {
  completedTasks: number;
  taskCompletionRate: number;
  averageTasksPerDay: number;
  longestProductiveStreak: number;
  updateMetrics: { updatedDays: number };
  contributionPercentage: number;
  topProductiveDays: { date: string; completedTasks: number }[];
  totalTasks: number;
}

export function calculateMetrics(worklogSummary: WorkLogs[]): Metrics {
  const completedTasks = getCompletedTasks(worklogSummary);
  const taskCompletionRate = getTaskCompletionRate(worklogSummary);
  const averageTasksPerDay = getAverageTasksPerDay(worklogSummary);
  const longestProductiveStreak = getLongestProductiveStreak(worklogSummary);
  const updateMetrics = getUpdateMetrics(worklogSummary);
  const contributionPercentage = getContributionPercentage(worklogSummary);
  const topProductiveDays = getTopProductiveDays(worklogSummary);
  const totalTasks = getTotalTasks(worklogSummary);
  return {
    completedTasks,
    taskCompletionRate,
    averageTasksPerDay,
    longestProductiveStreak,
    updateMetrics,
    contributionPercentage,
    topProductiveDays,
    totalTasks,
  };
}

function getCompletedTasks(worklogSummary: WorkLogs[]): number {
  let completedTasks = 0;
  const allTasks = worklogSummary.flatMap((worklog) =>
    worklog.works.flatMap((work: any) =>
      work.content.split("\n").map((task: any) => task.trim())
    )
  );

  allTasks.forEach((task) => {
    if (task.endsWith("✅")) {
      completedTasks++;
    }
  });

  return completedTasks;
}

function getTaskCompletionRate(worklogSummary: WorkLogs[]): number {
  const totalTasks = getTotalTasks(worklogSummary);
  const completedTasks = getCompletedTasks(worklogSummary);
  return (completedTasks / totalTasks) * 100;
}

function getAverageTasksPerDay(worklogSummary: WorkLogs[]): number {
  const dates = worklogSummary.map((worklog) => parseISO(worklog.date || ""));
  const uniqueDates = Array.from(
    new Set(dates.map((date) => format(date, "yyyy-MM-dd")))
  );
  const totalTasks = getTotalTasks(worklogSummary);
  return totalTasks / uniqueDates.length;
}

function getLongestProductiveStreak(worklogSummary: WorkLogs[]): number {
  const dates = worklogSummary
    .map((worklog) => parseISO(worklog.date || ""))
    .sort((a, b) => a.getTime() - b.getTime());

  let longestStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const diff = differenceInDays(dates[i], dates[i - 1]);
    if (diff === 1) {
      currentStreak++;
    } else {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      currentStreak = 1;
    }
  }

  return Math.max(longestStreak, currentStreak);
}

function getTotalTasks(worklogSummary: WorkLogs[]): number {
  const allTasks = worklogSummary.flatMap((worklog) =>
    worklog.works.flatMap((work: any) =>
      work.content.split("\n").map((task: any) => task.trim())
    )
  );
  return allTasks.length;
}

function getUpdateMetrics(worklogSummary: WorkLogs[]): { updatedDays: number } {
  const dates = worklogSummary.map((worklog) => parseISO(worklog.date || ""));
  const uniqueDates = Array.from(
    new Set(dates.map((date) => format(date, "yyyy-MM-dd")))
  ).map((date) => parseISO(date));

  return {
    updatedDays: uniqueDates.length,
  };
}

function getContributionPercentage(worklogSummary: WorkLogs[]): number {
  const today = new Date();
  const lastMonthStart = startOfMonth(today.setMonth(today.getMonth() - 1));
  const lastMonthEnd = endOfMonth(today.setMonth(today.getMonth() - 1));
  const thisMonthLogs = worklogSummary.filter(
    (worklog) =>
      parseISO(worklog.date || "") >= startOfMonth(new Date()) &&
      parseISO(worklog.date || "") <= endOfMonth(new Date())
  );
  const lastMonthLogs = worklogSummary.filter(
    (worklog) =>
      parseISO(worklog.date || "") >= lastMonthStart &&
      parseISO(worklog.date || "") <= lastMonthEnd
  );

  const thisMonthTasks = thisMonthLogs.flatMap((worklog) =>
    worklog.works.flatMap((work: any) =>
      work.content.split("\n").map((task: any) => task.trim())
    )
  ).length;

  const lastMonthTasks = lastMonthLogs.flatMap((worklog) =>
    worklog.works.flatMap((work: any) =>
      work.content.split("\n").map((task: any) => task.trim())
    )
  ).length;

  return ((thisMonthTasks - lastMonthTasks) / (lastMonthTasks || 1)) * 100;
}

function getTopProductiveDays(worklogSummary: WorkLogs[]): {
  date: string;
  completedTasks: number;
}[] {
  const taskCounts: { [key: string]: number } = {};

  worklogSummary.forEach((worklog) => {
    const date = format(parseISO(worklog.date || ""), "yyyy-MM-dd");

    worklog.works.forEach((work: any) => {
      const tasks = work.content.split("\n").map((task: string) => task.trim());

      tasks.forEach((task: string) => {
        if (task.endsWith("✅")) {
          if (!taskCounts[date]) {
            taskCounts[date] = 0;
          }
          taskCounts[date]++;
        }
      });
    });
  });

  const productiveDays = Object.keys(taskCounts).map((date) => ({
    date,
    completedTasks: taskCounts[date],
  }));

  productiveDays.sort((a, b) => b.completedTasks - a.completedTasks);

  return productiveDays.slice(0, 3);
}
