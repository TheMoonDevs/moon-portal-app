"use client";
import React, { useEffect, useState } from "react";
import { User, WorkLogs } from "@prisma/client";
import { PieChart, BarChart } from "@mui/x-charts";
import { format, parseISO } from "date-fns";
import {
  calculateMetrics,
  getCompletedTasks,
  getLongestProductiveStreak,
  getMissedTasks,
  getMissedWorklogDates,
  getUpdatedLogsLater,
} from "../WorklogBreakdown/BreakdownMetrics";
import MetricCard, { SquareCard } from "../WorklogBreakdown/MetricCard";
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
// import { setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/quicklinks.slice";
import ToolTip from "@/components/elements/ToolTip";
// import StatiStics from "./StatiStics";
// import Pie from "./PieChart";
import dynamic from "next/dynamic";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  setIsShowProductiveStreak,
  setMissedDates,
  setProductiveStreakData,
  setShowMissedLogs,
  setShowUpdatedLogs,
  setShowMissedTasks,
  setMissedTasksData,
  setUpdatedLogsDates,
  setCompletedTasksData,
  setShowCompletedTasks,
} from "@/utils/redux/worklogsSummary/statsAction.slice";
import Pointers from "./Pointers";
import LoadingAnimation from "@/components/elements/LoadingAnimation";

const Pattern = dynamic(() => import("./Pattern"), {
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center">
      <LoadingAnimation />,
    </div>
  ),
});

const Pie = dynamic(() => import("./PieChart"), {
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center">
      <LoadingAnimation />
    </div>
  ),
});

const StatiStics = dynamic(() => import("./StatiStics"), {
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center">
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
  const [activeTab, setActiveTab] = useState("POINTERS");
  const [activeIndex, setActiveIndex] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);
  const dispatch = useAppDispatch();
  const { isShowProductiveStreak, productiveStreakData, showMissedLogs } =
    useAppSelector((state: RootState) => state.statsAction);

  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // const completedTasksData = weekdays.map(
  //   (day) => metrics.tasksByWeekday[day]?.completed || 0
  // );

  // const inProgressTasksData = weekdays.map(
  //   (day) => metrics.tasksByWeekday[day]?.inProgress || 0
  // );

  // const isSmallScreen = useMediaQuery("(max-width:600px)");

  // const chartWidth = isSmallScreen ? 380 : 450;
  // const chartHeight = isSmallScreen ? 200 : 300;
  // const barChartWidth = isSmallScreen ? 350 : 550;

  useEffect(() => {
    if (worklogSummary.length > 0) {
      dispatch(
        setProductiveStreakData(getLongestProductiveStreak(worklogSummary)),
      );
      dispatch(setMissedDates(getMissedWorklogDates(worklogSummary)));
      dispatch(setMissedTasksData(getMissedTasks(worklogSummary)));
      dispatch(setUpdatedLogsDates(getUpdatedLogsLater(worklogSummary)));
      dispatch(setCompletedTasksData(getCompletedTasks(worklogSummary)));
    }
  }, [worklogSummary, dispatch]);

  const handleCardClick = (cardTitle: string) => {
    dispatch(setIsShowProductiveStreak(false));
    dispatch(setShowMissedLogs(false));
    dispatch(setShowUpdatedLogs(false));
    dispatch(setShowMissedTasks(false));
    dispatch(setShowCompletedTasks(false));

    if (cardTitle === "topProductiveDays") {
      const topProductiveDay = metrics.topProductiveDays[0];
      if (topProductiveDay) {
        scrollToWorklog(topProductiveDay.date);
      }
    }
    if (cardTitle === "productiveStreak") {
      if (productiveStreakData.length > 0) {
        dispatch(setIsShowProductiveStreak(true));
      }
    }
    if (cardTitle === "missedLogs") {
      dispatch(setShowMissedLogs(true));
    }
    if (cardTitle === "updatedLogsLater") {
      dispatch(setShowUpdatedLogs(true));
    }
    if (cardTitle === "missedTasks") {
      dispatch(setShowMissedTasks(true));
    }
    if (cardTitle === "taskCompletionRate") {
      dispatch(setShowCompletedTasks(true));
    }
  };

  const scrollToWorklog = (date: string) => {
    const worklogElement = document.querySelector(`[data-date="${date}"]`);
    if (worklogElement) {
      const container = worklogElement.closest(
        ".scrollable-container-summaryView",
      );
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = worklogElement.getBoundingClientRect();
        const offset = 20;

        const scrollPosition =
          elementRect.top + container.scrollTop - containerRect.top - offset;

        container.scrollTo({
          top: scrollPosition,
          behavior: "smooth",
        });
      } else {
        worklogElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <main
      className={`overflow-y-hiddem relative mx-2 my-4 flex flex-col justify-start gap-5 overflow-x-hidden rounded-b-2xl bg-white px-2`}
      style={{ height: "calc(100vh - 110px)" }}
    >
      <div className="absolute top-0 z-10 w-full bg-white">
        <h1 className="mt-4 justify-start bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-center font-sans text-lg font-semibold text-transparent md:text-2xl">
          Worklog Breakdown
        </h1>
        <div className="no-scrollbar mb-2 ml-6 mt-6 flex w-full items-center gap-1">
          {tabs.map((tab: string, i: number) => (
            <p
              key={`${tab}-${i}`}
              className={`cursor-pointer px-2 pb-2 text-sm leading-3 tracking-widest text-black transition-all duration-300 ease-in-out ${
                activeTab === tab
                  ? "rounded-b-sm rounded-l-sm rounded-r-sm rounded-t-sm border-b-2 border-black font-extrabold"
                  : "border-b-2 border-transparent font-normal"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </p>
          ))}
        </div>
      </div>
      <div className="relative top-28 pb-6">
        {/* ANALYTICS */}
        {activeTab === "ANALYTICS" && (
          <div>
            <div className="flex w-full items-center justify-between px-4">
              <p className="text-xs font-normal leading-3 text-gray-500">
                Check your Productivity & High Impact Points
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-[#00000033] p-2">
                {icons.map((icon, index) => {
                  return (
                    <ToolTip key={icon.icon} title={icon.label}>
                      <div
                        className={`flex cursor-pointer items-center justify-center rounded-lg border border-[#00000033] px-3 py-2 transition-colors duration-300 hover:bg-neutral-100 ${
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
                    className={`flex cursor-pointer items-center justify-center rounded-lg border border-[#00000033] px-3 py-2 transition-colors duration-300 hover:bg-neutral-100 ${
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
              <p className="py-4 text-center text-sm leading-3 tracking-widest text-black">
                Total tasks and completed tasks (Day wise)
              </p>
              <Pattern
                gridVisible={gridVisible}
                worklogSummary={worklogSummary}
              />
            </div>
            <div className="py-4">
              <p className="pb-4 text-center text-sm leading-3 tracking-widest text-black">
                Check your Productivity (Total no. of tasks week wise)
              </p>
              <Pie worklogSummary={worklogSummary} />
            </div>
            <div className="">
              <p className="pb-4 text-center text-sm leading-3 tracking-widest text-black">
                Check your Productivity Stats
              </p>
              <StatiStics worklogSummary={worklogSummary} />
            </div>
          </div>
        )}
        {/* STATS */}
        {activeTab === "STATS" && (
          <>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                <MetricCard
                  title="Top Productive Days"
                  content={
                    <div className="max-w-[80%] text-sm">
                      {metrics.topProductiveDays
                        .map(
                          (day) =>
                            `${format(parseISO(day.date), "MMM d")}(${day.completedTasks.toString().padStart(2, "0")})`,
                        )
                        .join(", ")}
                    </div>
                  }
                  logo={<Star color="#FFC107" size={30} />}
                  onClick={() => handleCardClick("topProductiveDays")}
                />
                <MetricCard
                  title="Task Completion Rate"
                  content={`${metrics.taskCompletionRate.toFixed(2)}%`}
                  logo={<CircleCheckBig color="#28A745 " size={30} />}
                  onClick={() => handleCardClick("taskCompletionRate")}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
                <SquareCard
                  icon={<Sparkles color="#4CAF50" size={24} />}
                  content={`${metrics.longestProductiveStreakData.length}`}
                  title="Productive Streak"
                  onClick={() => handleCardClick("productiveStreak")}
                />
                <SquareCard
                  icon={<CircleAlert color="#FF6347" size={24} />}
                  content={`${metrics.missedLogsDates.length}`}
                  title="Missed Logs"
                  onClick={() => handleCardClick("missedLogs")}
                />
                <SquareCard
                  icon={<History color="#FF9800" size={24} />}
                  content={`${metrics.updatedLogsLater.length}`}
                  title="Updated Logs Later"
                  onClick={() => handleCardClick("updatedLogsLater")}
                />
                <SquareCard
                  icon={<TriangleAlert color="#FF5722" size={24} />}
                  content={`${metrics.missedTasks}`}
                  title="Missed Tasks"
                  onClick={() => handleCardClick("missedTasks")}
                />
              </div>
              <table className="min-w-full rounded-lg border border-gray-200 shadow-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-600">
                      Metric
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-600">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="transition duration-200 hover:bg-gray-50">
                    <td className="flex items-center gap-2 border-b p-3">
                      <ListTodo color="#03A9F4" size={24} />
                      Average Tasks Per Day
                    </td>
                    <td className="border-b p-3">
                      {metrics.averageTasksPerDay.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="transition duration-200 hover:bg-gray-50">
                    <td className="flex items-center gap-2 border-b p-3">
                      <RefreshCw color="#2196F3 " size={24} />
                      Update Frequency
                    </td>
                    <td className="border-b p-3">
                      {metrics.updateMetrics.updatedDays} Days
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
        {/* POINTERS */}
        {activeTab === "POINTERS" && (
          <div className="h-full">
            <Pointers />
          </div>
        )}
        {/* GROWTH */}
        {activeTab === "GROWTH" && (
          <div className="flex items-center justify-center p-4">
            Coming soon, Stay tuned!
          </div>
        )}{" "}
        {/* MISSIONS */}
        {activeTab === "MISSIONS" && (
          <div className="flex items-center justify-center p-4">
            Coming soon, Stay tuned!
          </div>
        )}
      </div>
    </main>
  );
};

export default WorklogBreakdown;
