import React from "react";
import { WorkLogs } from "@prisma/client";
import { PieChart } from "@mui/x-charts/PieChart";
import { Stack, Typography } from "@mui/material";
import { format, parseISO } from "date-fns";
import { calculateMetrics } from "../WorklogBreakdown/BreakdownMetrics";
import MetricCard from "../WorklogBreakdown/MetricCard";

interface WorklogBreakdownProps {
  worklogSummary: WorkLogs[];
}

const WorklogBreakdown: React.FC<WorklogBreakdownProps> = ({
  worklogSummary,
}) => {
  const metrics = calculateMetrics(worklogSummary);

  return (
    <main className="flex flex-col justify-center gap-5 m-6">
      <h1 className="font-semibold text-xl font-sans justify-start">
        Worklog Breakdown
      </h1>
      <Stack spacing={4} alignItems="center">
        <PieChart
          colors={["blue", "green"]}
          series={[
            {
              arcLabel: (item) => `${item.label} (${item.value})`,
              arcLabelMinAngle: 45,
              data: [
                {
                  label: "In Progress",
                  value: metrics.totalTasks - metrics.completedTasks,
                  id: 0,
                },
                {
                  label: "Completed",
                  value: metrics.completedTasks,
                  id: 1,
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

        {/* Additional metrics */}
        <div className="flex flex-wrap gap-5 justify-center items-stretch">
          <MetricCard
            title="Update Frequency"
            content={
              <Typography variant="body1">
                Updated Days: {metrics.updateMetrics.updatedDays}
              </Typography>
            }
          />
          <MetricCard
            title="Task Completion Rate"
            content={
              <Typography variant="body1">
                Completion Rate: {metrics.taskCompletionRate.toFixed(2)}%
              </Typography>
            }
          />
          <MetricCard
            title="Average Tasks Per Day"
            content={
              <Typography variant="body1">
                Avg. Tasks/Day: {metrics.averageTasksPerDay.toFixed(2)}
              </Typography>
            }
          />
          <MetricCard
            title="Longest Productive Streak"
            content={
              <Typography variant="body1">
                Longest Streak: {metrics.longestProductiveStreak} days
              </Typography>
            }
          />
          <MetricCard
            title="Top Productive Days"
            content={metrics.topProductiveDays.map((day, index) => (
              <Typography key={index} variant="body1">
                {format(parseISO(day.date), "MMMM dd, yyyy")}:{" "}
                {day.completedTasks} tasks completed
              </Typography>
            ))}
          />
        </div>
      </Stack>
    </main>
  );
};

export default WorklogBreakdown;
