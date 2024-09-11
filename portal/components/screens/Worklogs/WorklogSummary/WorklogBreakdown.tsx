import React, { useState } from "react";
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
  TrendingUp,
  CircleAlert,
  RefreshCw,
  Star,
  TriangleAlert,
  Sparkles,
} from "lucide-react";
import { Stack, useMediaQuery } from "@mui/material";
// import Pattern from "./Pattern";
import { setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/quicklinks.slice";
import ToolTip from "@/components/elements/ToolTip";
// import StatiStics from "./StatiStics";
// import Pie from "./PieChart";
import dynamic from "next/dynamic";

const LoadingAnimation = () => (
  <div className="flex items-end justify-between w-[45px] h-[27px] pb-1/5">
    <div className="cube flex-shrink-0 w-[9px] h-[9px] bg-teal-400 rounded-[25%] animate-bounce"></div>
    <div className="cube flex-shrink-0 w-[9px] h-[9px] bg-teal-400 rounded-[25%] animate-bounce"></div>
    <div className="cube flex-shrink-0 w-[9px] h-[9px] bg-teal-400 rounded-[25%] animate-bounce"></div>
  </div>
);

const Pattern = dynamic(() => import("./Pattern"), {
  loading: () => (
    <div className="h-[200px] w-full flex items-center justify-center">
      <LoadingAnimation />,
    </div>
  ),
});

const Pie = dynamic(() => import("./PieChart"), {
  loading: () => (
    <div className="h-[200px] w-full flex items-center justify-center">
      <LoadingAnimation />
    </div>
  ),
});

const StatiStics = dynamic(() => import("./StatiStics"), {
  loading: () => (
    <div className="h-[200px] w-full flex items-center justify-center">
      <LoadingAnimation />
    </div>
  ),
});

const tabs: string[] = ["POINTERS", "ANALYTICS", "STATS", "GROWTH", "MISSIONS"];
const icons = [
  { icon: "show_chart", label: "Show Lines Chart" },
  { icon: "bar_chart", label: "Show Histogram" },
];

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
  const [activeTab, setActiveTab] = useState("ANALYTICS");
  const [activeIndex, setActiveIndex] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);

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
    <main className="flex flex-col justify-center gap-5 my-6 mx-2 px-2 pb-20 rounded-[32px] bg-white ">
      <h1 className="font-semibold text-lg md:text-2xl font-sans text-center justify-start mt-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
        Worklog Breakdown
      </h1>
      <div className="w-full flex items-center ml-6 gap-1 mt-6 mb-2 overflow-x-scroll no-scrollbar">
        {tabs.map((tab: string, i: number) => (
          <p
            key={`${tab}-${i}`}
            className={`text-sm text-black leading-3 tracking-widest px-2 pb-2 cursor-pointer transition-all duration-300 ease-in-out ${
              activeTab === tab
                ? "border-b-2 border-black font-extrabold rounded-b-sm rounded-t-sm rounded-r-sm rounded-l-sm"
                : "border-b-2 border-transparent font-normal"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </p>
        ))}
      </div>
      <div className="w-full flex justify-between items-center px-4">
        <p className="font-normal text-gray-500 text-xs leading-3">
          Check your Productivity & High Impact Points
        </p>
        <div className="flex items-center gap-2 border border-[#00000033] rounded-lg p-2">
          {icons.map((icon, index) => {
            return (
              <ToolTip key={icon.icon} title={icon.label}>
                <div
                  className={`flex items-center justify-center px-3 py-2 border border-[#00000033] rounded-lg hover:bg-neutral-100  transition-colors duration-300 cursor-pointer ${
                    activeIndex === index ? "bg-neutral-200" : "bg-white"
                  }`}
                  key={icon.icon}
                  onClick={() => setActiveIndex(index)}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "16px" }}
                  >
                    {icon.icon}
                  </span>
                </div>
              </ToolTip>
            );
          })}
          <ToolTip title={gridVisible ? "Hide Grid" : "Show Grid"}>
            <div
              className={`flex items-center justify-center px-3 py-2 border border-[#00000033] rounded-lg hover:bg-neutral-100  transition-colors duration-300 cursor-pointer ${
                gridVisible ? "bg-neutral-200" : "bg-white"
              }`}
              onClick={() => setGridVisible(!gridVisible)}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px" }}
              >
                {gridVisible ? "grid_off" : "grid_on"}
              </span>
            </div>
          </ToolTip>
        </div>
      </div>

      <div className="h-[400px] w-full py-4">
        <p className=" py-4 text-sm text-black leading-3 tracking-widest text-center">
          Total tasks and completed tasks (Day wise)
        </p>
        <Pattern gridVisible={gridVisible} worklogSummary={worklogSummary} />
      </div>
      <div className="py-4">
        <p className="pb-4 text-sm text-black leading-3 tracking-widest text-center">
          Check your Productivity (Total no. of tasks week wise)
        </p>
        <Pie worklogSummary={worklogSummary} />
      </div>
      <div className="">
        <p className="pb-4 text-sm text-black leading-3 tracking-widest text-center">
          Check your Productivity Stats
        </p>
        <StatiStics worklogSummary={worklogSummary} />
      </div>

      <section className="text-center p-4 bg-blue-50 rounded-lg shadow-md mb-5">
        <h2 className="text-lg font-semibold text-gray-700">Summary</h2>
        <p className="text-sm text-gray-600">
          {metrics.totalTasks} tasks logged with a{" "}
          {metrics.taskCompletionRate.toFixed(2)}% completion rate.
        </p>
      </section>
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
        <div className="grid grid-cols-2 gap-5 w-full mb-8 max-sm:grid-cols-1">
          <MetricCard
            title="Productive Streak"
            content={`${metrics.longestProductiveStreak} Days`}
            logo={<Sparkles color="#4CAF50 " size={30} />}
          />
          <MetricCard
            title="Task Completion Rate"
            content={`${metrics.taskCompletionRate.toFixed(2)}%`}
            logo={<CircleCheckBig color="#28A745 " size={30} />}
          />
          <MetricCard
            title="Missed Logs"
            content={`${metrics.missedLogs} Days`}
            logo={<CircleAlert color="#FF6347 " size={30} />}
          />
          <MetricCard
            title="Updated Logs Later"
            content={`${metrics.updatedLogsLater} Times`}
            logo={<History color="#FF9800" size={30} />}
          />
          <MetricCard
            title="Update Frequency"
            content={`${metrics.updateMetrics.updatedDays} Days`}
            logo={<RefreshCw color="#2196F3 " size={30} />}
          />
          <MetricCard
            title="Average Tasks Per Day"
            content={`${metrics.averageTasksPerDay.toFixed(2)}`}
            logo={<ListTodo color="#03A9F4" size={30} />}
          />
          <MetricCard
            title="Top Productive Days"
            content={
              <div className="flex flex-col gap-1">
                {metrics.topProductiveDays.map((day, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span>{format(parseISO(day.date), "MMM dd")}</span>
                    <span className="font-semibold text-gray-700">
                      {day.completedTasks.toString().padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            }
            logo={<Star color="#FFC107" size={30} />}
          />

          <MetricCard
            title="High Priority Tasks"
            content={`${metrics.highPriorityTasks} Tasks`}
            logo={<TriangleAlert color="#FF5722" size={30} />}
          />
        </div>
      </Stack>
    </main>
  );
};

export default WorklogBreakdown;
