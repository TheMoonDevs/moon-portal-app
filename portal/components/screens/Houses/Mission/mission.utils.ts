import { Mission, MissionTask } from "@prisma/client";
import dayjs from "dayjs";

export const STATUSES = [
  {
    label: "In Testing",
    value: "IN_TESTING",
    color: "#f97316 ",
  },
  {
    label: "In Review",
    value: "IN_REVIEW",
    color: " #eab308",
  },
  {
    label: "In Progress",
    value: "IN_PROGRESS",
    color: "#3b82f6",
  },
  {
    label: "To Do",
    value: "IN_TODO",
    color: "#6b7280",
  },
  {
    label: "Completed",
    value: "COMPLETED",
    color: "#22c55e",
  },
  {
    label: "Backlog",
    value: "IN_BACKLOG",
    color: "#000000",
  },
];

export const PRIORITY = [
  {
    label: "Low",
    value: "LOW",
    color: "#f59e0b",
  },
  {
    label: "Normal",
    value: "NORMAL",
    color: "#f97316",
  },
  {
    label: "High",
    value: "HIGH",
    color: "#ef4444",
  },
  {
    label: "Urgent",
    value: "URGENT",
    color: "#dc2626",
  },
];

export function calculateMissionStat(
  mission: Mission,
  tasks: MissionTask[] = [],
  statType: "balance" | "percentage" | "status"
): number | string {
  const totalMissionPoints = mission.indiePoints;

  const allTaskPoints =
    tasks.length > 0
      ? tasks
          .filter((task) => task.missionId === mission.id)
          .reduce((sum, task) => sum + task.indiePoints, 0)
      : 0;

  const remainingBalance = totalMissionPoints - allTaskPoints;

  switch (statType) {
    case "balance":
      return remainingBalance;
    case "percentage":
      // if (remainingBalance === totalMissionPoints) {
      //   return 0;
      // }
      const completedPoints = totalMissionPoints - remainingBalance;
      const progress = (50 / 100) * 100;
      return progress;
    case "status":
      return remainingBalance > 0 ? "🟡" : remainingBalance === 0 ? "✅" : "❌";
    default:
      throw new Error("Invalid stat type");
  }
}

export const getMissionProgress = (tasks: MissionTask[]) => {
  const totalTasks = tasks.length;
  if (totalTasks === 0) return 0;
  const completedTasks = tasks.filter(
    (task) => task.status?.value === "COMPLETED"
  ).length;
  const progress = (completedTasks / totalTasks) * 100;
  return progress;
};

export const getQueryString = (frame: string, value: string): string => {
  switch (frame) {
    case "month":
      return `month=${value}`;
    case "quarter":
      const year = dayjs().year().toString();
      return `year=${year}&quarter=${value}`;
    case "year":
      return `year=${value}`;
    default:
      return "";
  }
};

export const getTimeValueOptions = (timeFrame: string) => {
  const currentYear = dayjs().year();

  switch (timeFrame) {
    case "month":
      return Array.from({ length: 12 }, (_, i) => {
        const date = dayjs().month(i);
        return {
          value: date.format("YYYY-MM"),
          label: date.format("MMMM YYYY"),
        };
      });
    case "quarter":
      return [1, 2, 3, 4].map((q) => ({
        value: q.toString(),
        label: `Q${q} ${currentYear}`,
      }));
    case "year":
      return Array.from({ length: 5 }, (_, i) => {
        const year = currentYear - i;
        return {
          value: year.toString(),
          label: year.toString(),
        };
      });
    default:
      return [];
  }
};
