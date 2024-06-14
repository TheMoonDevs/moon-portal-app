import React from "react";
import { WorkLogs } from "@prisma/client";
import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import { Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { format, parseISO } from "date-fns";
import MetricCard from "../WorklogBreakdown/MertricCard";
import { calculateMetrics } from "../WorklogBreakdown/BreakdownMetrics";

interface WorklogBreakdownProps {
  worklogSummary: WorkLogs[];
}

const WorklogBreakdown: React.FC<WorklogBreakdownProps> = ({
  worklogSummary,
}) => {
  const theme = useTheme();
  const metrics = calculateMetrics(worklogSummary);

  return (
    <main className="flex flex-col justify-center gap-5 m-6">
      <h1 className="font-semibold text-xl font-sans justify-start">
        Worklog Breakdown
      </h1>
      <Stack spacing={4} alignItems="center">
        <PieChart
          series={[
            {
              arcLabel: (item) => `${item.label} (${item.value})`,
              arcLabelMinAngle: 45,
              data: [
                {
                  label: "In Progress",
                  value: metrics.totalTasks - metrics.completedTasks,
                  id: 1,
                },
                { label: "Completed", value: metrics.completedTasks, id: 2 },
              ],
            },
          ]}
          sx={{
            [`& .${pieArcLabelClasses.root}`]: {
              fill: "white",
              fontWeight: "bold",
            },
          }}
          width={450}
          height={300}
          theme={theme}
          margin={{ right: 150 }}
        />

        <Typography variant="body1">
          <strong>Total Tasks:</strong> {metrics.totalTasks}
        </Typography>

        <div className="flex flex-wrap gap-5 justify-center items-stretch">
          <MetricCard
            title="Update Frequency"
            content={
              <>
                <Typography variant="body1">
                  Updated Days: {metrics.updateMetrics.updatedDays}
                </Typography>
              </>
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
