import { WorkLogs } from "@prisma/client";
import React from "react";
import dayjs from "dayjs";
import ActivityCalendar, { ThemeInput } from "react-activity-calendar";
import { Box, Tooltip as MuiTooltip, Skeleton } from "@mui/material";

const getStatsOfContent = (content: string) => {
  const checks = (content?.match(/✅/g) || []).length;
  const points = (content?.match(/\n/g) || []).length + 1;
  return { checks, points };
};

const getAllDatesOfCurrentMonth = () => {
  const startOfMonth = dayjs().startOf("month");
  const endOfMonth = dayjs().endOf("month");
  const dates = [];

  for (
    let date = startOfMonth;
    date.isBefore(endOfMonth) || date.isSame(endOfMonth);
    date = date.add(1, "day")
  ) {
    dates.push(date.format("YYYY-MM-DD"));
  }

  return dates;
};

const getLevelFromContribution = (count: number) => {
  if (count >= 8) return 1;
  return 9 - Math.min(count, 7);
};

const ReactActivityCalendar = ({
  worklogSummary,
  loading,
}: {
  worklogSummary: WorkLogs[];
  loading: boolean;
}) => {
  const allDatesOfCurrentMonth = getAllDatesOfCurrentMonth();

  const calendarData = allDatesOfCurrentMonth.map((date) => {
    const worklogForDate = worklogSummary.find((worklog) =>
      dayjs(worklog.date).isSame(date, "day")
    );

    let checks = 0;

    if (worklogForDate && Array.isArray(worklogForDate.works)) {
      worklogForDate.works.forEach((work) => {
        if (work && typeof work === "object" && "content" in work) {
          const stats = getStatsOfContent(work.content as string);
          checks += stats.checks;
        }
      });
    }

    const level = getLevelFromContribution(checks);

    return {
      date,
      count: checks,
      level,
    };
  });

  return (
    <div className="flex items-center  py-4 ">
      {loading ? (
        <SkeletonLoader />
      ) : worklogSummary.length > 0 ? (
        <ActivityCalendar
          data={calendarData}
          renderBlock={(block, activity) => (
            <MuiTooltip
              title={`${activity.count} Contributions on ${activity.date}`}
              sx={{ cursor: "pointer" }}
            >
              {block}
            </MuiTooltip>
          )}
          renderColorLegend={(block, level) => (
            <MuiTooltip title={`Level: ${level}`}>{block}</MuiTooltip>
          )}
          blockMargin={8}
          maxLevel={9}
          hideMonthLabels
          hideColorLegend
          showWeekdayLabels={["sun", "mon", "tue", "wed", "thu", "fri", "sat"]}
          hideTotalCount
          // blockRadius={8}
          blockSize={12}
          weekStart={0}
        />
      ) : (
        <div className="flex items-center justify-center">
          <p className="text-neutral-400">No Activities Found.</p>
        </div>
      )}
    </div>
  );
};

export default ReactActivityCalendar;

const SkeletonLoader = () => {
  return (
    <Box display="grid" gridTemplateColumns="repeat(10, 1fr)" gap={1} p={2}>
      {Array.from(Array(30)).map((_, index) => (
        <Skeleton key={index} variant="circular" width={20} height={20} />
      ))}
    </Box>
  );
};
