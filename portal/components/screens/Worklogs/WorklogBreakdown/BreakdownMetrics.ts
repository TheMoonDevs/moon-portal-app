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
  failedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  scheduledTasks: number;
  beingWrittenTasks: number;
  newIdeaTasks: number;
  needClarificationTasks: number;
  highPriorityTasks: number;
  completedTasksByWeekday: { [key: string]: number };
}

enum TaskType {
  Completed = "✅",
  Failed = "❌",
  InProgress = "🟡",
  Blocked = "🔴",
  Scheduled = "📅",
  BeingWritten = "✏️",
  NewIdea = "💡",
  NeedClarification = "❓",
  HighPriority = "⭐",
}

export function calculateMetrics(worklogSummary: WorkLogs[]): Metrics {
  const completedTasks = getTaskCountByType(worklogSummary, TaskType.Completed);
  const taskCompletionRate = getTaskCompletionRate(worklogSummary);
  const averageTasksPerDay = getAverageTasksPerDay(worklogSummary);
  const longestProductiveStreak = getLongestProductiveStreak(worklogSummary);
  const updateMetrics = getUpdateMetrics(worklogSummary);
  const contributionPercentage = getContributionPercentage(worklogSummary);
  const topProductiveDays = getTopProductiveDays(worklogSummary);
  const totalTasks = getTotalTasks(worklogSummary);
  const failedTasks = getTaskCountByType(worklogSummary, TaskType.Failed);
  const inProgressTasks = getTaskCountByType(
    worklogSummary,
    TaskType.InProgress
  );
  const blockedTasks = getTaskCountByType(worklogSummary, TaskType.Blocked);
  const scheduledTasks = getTaskCountByType(worklogSummary, TaskType.Scheduled);
  const beingWrittenTasks = getTaskCountByType(
    worklogSummary,
    TaskType.BeingWritten
  );
  const newIdeaTasks = getTaskCountByType(worklogSummary, TaskType.NewIdea);
  const needClarificationTasks = getTaskCountByType(
    worklogSummary,
    TaskType.NeedClarification
  );
  const highPriorityTasks = getTaskCountByType(
    worklogSummary,
    TaskType.HighPriority
  );
  const completedTasksByWeekday = getCompletedTasksByWeekday(worklogSummary);

  return {
    completedTasks,
    taskCompletionRate,
    averageTasksPerDay,
    longestProductiveStreak,
    updateMetrics,
    contributionPercentage,
    topProductiveDays,
    totalTasks,
    failedTasks,
    inProgressTasks,
    blockedTasks,
    scheduledTasks,
    beingWrittenTasks,
    newIdeaTasks,
    needClarificationTasks,
    highPriorityTasks,
    completedTasksByWeekday,
  };
}

function getTaskCountByType(
  worklogSummary: WorkLogs[],
  type: TaskType
): number {
  let count = 0;
  const allTasks = worklogSummary.flatMap((worklog) =>
    worklog.works.flatMap((work: any) =>
      work.content.split("\n").map((task: any) => task.trim())
    )
  );

  allTasks.forEach((task) => {
    if (task.endsWith(type)) {
      count++;
    }
  });

  return count;
}

function getTaskCompletionRate(worklogSummary: WorkLogs[]): number {
  const totalTasks = getTotalTasks(worklogSummary);
  const completedTasks = getTaskCountByType(worklogSummary, TaskType.Completed);
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
        if (task.endsWith(TaskType.Completed)) {
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

function getCompletedTasksByWeekday(worklogSummary: WorkLogs[]): {
  [key: string]: number;
} {
  const weekdayCounts: { [key: string]: number } = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  worklogSummary.forEach((worklog) => {
    const date = parseISO(worklog.date || "");
    const weekday = format(date, "EEEE");

    worklog.works.forEach((work: any) => {
      const tasks = work.content.split("\n").map((task: string) => task.trim());
      tasks.forEach((task: string) => {
        if (task.endsWith(TaskType.Completed)) {
          weekdayCounts[weekday]++;
        }
      });
    });
  });

  return weekdayCounts;
}
