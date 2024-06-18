import React from "react";
import { WorkLogs } from "@prisma/client";
import { PieChart, BarChart } from "@mui/x-charts";
import { Stack, Typography } from "@mui/material";
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
} from "lucide-react";

interface WorklogBreakdownProps {
  worklogSummary: WorkLogs[];
}

const WorklogBreakdown: React.FC<WorklogBreakdownProps> = ({
  worklogSummary,
}) => {
  const metrics = calculateMetrics(worklogSummary);

  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const completedTasksData = weekdays.map(
    (day) => metrics.completedTasksByWeekday[day] || 0
  );

  return (
    <main className="flex flex-col justify-center gap-5 m-6">
      <h1 className="font-semibold text-xl font-sans justify-start">
        Worklog Breakdown
      </h1>
      <Stack spacing={2} alignItems="center">
        <PieChart
          colors={["blue", "#22c55e", "red", "orange", "purple"]}
          series={[
            {
              arcLabel: (item) => `${item.label} (${item.value})`,
              arcLabelMinAngle: 45,
              data: [
                {
                  label: "In Progress",
                  value: metrics.inProgressTasks,
                  id: 0,
                },
                {
                  label: "Completed",
                  value: metrics.completedTasks,
                  id: 1,
                },
                {
                  label: "Failed",
                  value: metrics.failedTasks,
                  id: 2,
                },
                {
                  label: "Blocked",
                  value: metrics.blockedTasks,
                  id: 3,
                },
                {
                  label: "Scheduled",
                  value: metrics.scheduledTasks,
                  id: 4,
                },
              ],
            },
          ]}
          width={450}
          height={300}
        />
        {/* Display total tasks */}
        <Typography variant="body1">
          <strong>Total Tasks:</strong> {metrics.totalTasks}
        </Typography>
        <BarChart
          xAxis={[
            {
              scaleType: "band",
              data: weekdays,
              label: "Days", // Adding title for x-axis
            },
          ]}
          yAxis={[
            {
              label: "Tasks", // Adding title for y-axis
            },
          ]}
          series={[{ data: completedTasksData, color: "#374151" }]}
          width={550}
          height={300}
        />

        <Typography variant="body1" className="pb-5">
          <strong>Tasks by Weekday</strong>
        </Typography>

        {/* Additional metrics */}
        <div className="flex flex-wrap gap-5 justify-center items-stretch">
          <MetricCard
            title="Update Frequency"
            content={
              <Typography variant="body1">
                Updated Days: {metrics.updateMetrics.updatedDays}
              </Typography>
            }
            logo={<AudioLines color="#31c449" size={20} />}
          />
          <MetricCard
            title="Task Completion Rate"
            content={
              <Typography variant="body1">
                Completion Rate: {metrics.taskCompletionRate.toFixed(2)}%
              </Typography>
            }
            logo={<CircleCheckBig color="#31c449" size={20} />}
          />
          <MetricCard
            title="Average Tasks Per Day"
            content={
              <Typography variant="body1">
                Avg. Tasks/Day: {metrics.averageTasksPerDay.toFixed(2)}
              </Typography>
            }
            logo={<ListTodo color="#31c449" size={20} />}
          />
          <MetricCard
            title="Longest Productive Streak"
            content={
              <Typography variant="body1">
                Longest Streak: {metrics.longestProductiveStreak} days
              </Typography>
            }
            logo={<SquareGanttChart color="#31c449" size={20} />}
          />
          <MetricCard
            title="Top Productive Days"
            content={metrics.topProductiveDays.map((day, index) => (
              <Typography key={index} variant="body1">
                {format(parseISO(day.date), "MMMM dd, yyyy")}:{" "}
                {day.completedTasks} tasks completed
              </Typography>
            ))}
            logo={<CalendarCheck color="#31c449" size={20} />}
          />
          <MetricCard
            title="High Priority Tasks"
            content={
              <Typography variant="body1">
                High Priority Tasks: {metrics.highPriorityTasks}
              </Typography>
            }
            logo={<CircleArrowUp color="#31c449" size={20} />}
          />
        </div>
      </Stack>
    </main>
  );
};

export default WorklogBreakdown;
