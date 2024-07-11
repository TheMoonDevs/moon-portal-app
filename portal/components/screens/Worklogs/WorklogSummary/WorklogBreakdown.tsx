import React from "react";
import { User, WorkLogs } from "@prisma/client";
import { PieChart, BarChart } from "@mui/x-charts";
import { format, parseISO } from "date-fns";
import { calculateMetrics } from "../WorklogBreakdown/BreakdownMetrics";
import MetricCard from "../WorklogBreakdown/MetricCard";
import {
  AudioLines,
  CircleCheckBig,
  ListTodo,
  SquareGanttChart,
  CalendarCheck,
  CircleArrowUp,
  CircleX,
  History,
} from "lucide-react";
import { Stack, useMediaQuery } from "@mui/material";

interface WorklogBreakdownProps {
  worklogSummary: WorkLogs[];
  isMonthly: boolean;
  isYearly: boolean;
}

const WorklogBreakdown: React.FC<WorklogBreakdownProps> = ({
  worklogSummary,
  isMonthly,
  isYearly,
}) => {
  const metrics = calculateMetrics(worklogSummary, isMonthly, isYearly);

  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const completedTasksData = weekdays.map(
    (day) => metrics.tasksByWeekday[day]?.completed || 0
  );

  const inProgressTasksData = weekdays.map(
    (day) => metrics.tasksByWeekday[day]?.inProgress || 0
  );

  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const chartWidth = isSmallScreen ? 380 : 450;
  const chartHeight = isSmallScreen ? 200 : 300;
  const barChartWidth = isSmallScreen ? 350 : 550;
  return (
    <main className="flex flex-col justify-center gap-5 m-6 md:pb-20">
      <h1 className="font-semibold text-lg text-center md:text-xl font-sans justify-start mt-4">
        Worklog Breakdown
      </h1>

      <Stack spacing={3} alignItems="center">
        <PieChart
          colors={["blue", "#22c55e", "red", "orange", "purple"]}
          series={[
            {
              arcLabel: (item) => `${item.label} (${item.value})`,
              arcLabelMinAngle: 45,
              data: [
                { label: "In Progress", value: metrics.inProgressTasks, id: 0 },
                { label: "Completed", value: metrics.completedTasks, id: 1 },
                { label: "Failed", value: metrics.failedTasks, id: 2 },
                { label: "Blocked", value: metrics.blockedTasks, id: 3 },
                { label: "Scheduled", value: metrics.scheduledTasks, id: 4 },
              ],
            },
          ]}
          width={chartWidth}
          height={chartHeight}
        />
        <div>
          <strong>Total Tasks:</strong> {metrics.totalTasks}
        </div>
        <BarChart
          xAxis={[
            {
              scaleType: "band",
              data: weekdays,
              label: "Days",
            },
          ]}
          yAxis={[
            {
              label: "Tasks",
            },
          ]}
          series={[
            {
              data: completedTasksData,
              color: "#22c55e",
              label: "Completed tasks",
            },
            {
              data: inProgressTasksData,
              color: "blue",
              label: "In Progress tasks",
            },
          ]}
          width={barChartWidth}
          height={chartHeight}
        />
        <div className="pb-5">
          <strong>Tasks by Weekday</strong>
        </div>
        <div className="flex flex-wrap gap-5  justify-center items-stretch">
          <MetricCard
            title="Longest Productive Streak"
            content={
              <div>
                You had a streak of {metrics.longestProductiveStreak}{" "}
                consecutive productive days.
              </div>
            }
            logo={<SquareGanttChart color="#31c449" size={20} />}
          />
          <MetricCard
            title="Task Completion Rate"
            content={
              <div>
                Your task completion rate is{" "}
                {metrics.taskCompletionRate.toFixed(2)}%.
              </div>
            }
            logo={<CircleCheckBig color="#31c449" size={20} />}
          />
          <MetricCard
            title="Missed Logs"
            content={
              <div>
                There were {metrics.missedLogs} days without log entries.
              </div>
            }
            logo={<CircleX color="#808080" size={20} />}
          />
          <MetricCard
            title="Updated Logs Later"
            content={
              <div>
                You updated your logs on a different day{" "}
                {metrics.updatedLogsLater} times.
              </div>
            }
            logo={<History color="#808080" size={20} />}
          />
          <MetricCard
            title="Update Frequency"
            content={
              <div>
                You updated your worklog on {metrics.updateMetrics.updatedDays}{" "}
                different days.
              </div>
            }
            logo={<AudioLines color="#4169e1" size={20} />}
          />
          <MetricCard
            title="Average Tasks Per Day"
            content={
              <div>
                On average, you complete {metrics.averageTasksPerDay.toFixed(2)}{" "}
                tasks per day.
              </div>
            }
            logo={<ListTodo color="#4169e1" size={20} />}
          />
          <MetricCard
            title="Top Productive Days"
            content={metrics.topProductiveDays.map((day, index) => (
              <div key={index}>
                On {format(parseISO(day.date), "MMMM dd, yyyy")}, you completed{" "}
                {day.completedTasks} tasks.
              </div>
            ))}
            logo={<CalendarCheck color="#ff6f00" size={20} />}
          />
          <MetricCard
            title="High Priority Tasks"
            content={
              <div>
                You have {metrics.highPriorityTasks} high-priority tasks.
              </div>
            }
            logo={<CircleArrowUp color="#ff6f00" size={20} />}
          />
        </div>
      </Stack>
    </main>
  );
};

export default WorklogBreakdown;
