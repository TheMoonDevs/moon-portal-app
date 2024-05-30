"use client";

import { useSearchParams } from "next/navigation";
import { WorklogView } from "./WorklogView";
import { useMediaQuery } from "@mui/material";
import media from "@/styles/media";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import store from "@/utils/redux/store";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WorkLogsHelper } from "./WorklogsHelper";
import { WorkLogs } from "@prisma/client";

export const WorklogViewPageWrapper = ({ id }: { id: string }) => {
  const queryParams = useSearchParams();
  const _date = queryParams?.get("date");
  const _logType = queryParams?.get("logType");
  const isTabletOrMore = useMediaQuery(media.moreTablet);

  const [logsList, setLogsList] = useState<WorkLogs[]>([]);

  useEffect(() => {
    if (!isTabletOrMore) return;
    if (_logType != "dayLog") return;
    const _user = store.getState().auth.user;
    const _total_days_in_month = dayjs(_date).daysInMonth();
    const _logList = Array.from({
      length: _total_days_in_month,
    }).map((_, i) => {
      const _date2 = dayjs()
        .month(dayjs(_date).month())
        .date(i + 1)
        .format("YYYY-MM-DD");
      // const _worklog = yearLogData?.data?.workLogs.find(
      //   (wl: WorkLogs) => wl.date === _date2
      // );
      return WorkLogsHelper.defaultWorklogs(_date2, _user);
    });
    //.reverse();
    setLogsList(_logList);
  }, [isTabletOrMore, _logType, _date]);

  if (isTabletOrMore && _logType === "dayLog" && _date && _date?.length > 0) {
    const centerdate = dayjs(_date);
    const leftdate = centerdate.subtract(1, "day");
    const rightdate = centerdate.add(1, "day");

    return (
      <div className="bg-white flex flex-row flex-wrap items-center justify-start gap-4 h-screen ">
        <div className="my-4 h-[90vh] bg-white overflow-y-scroll">
          <div className="flex flex-col max-w-[400px] ">
            {logsList.map((log, _i) => (
              <div
                key={log.id + _i}
                className={`p-4 border-b text-black ${
                  log.date === dayjs().format("YYYY-MM-DD")
                    ? "text-blue-500 font-bold"
                    : log.date === dayjs(centerdate).format("YYYY-MM-DD")
                    ? "font-bold"
                    : ""
                }`}
              >
                <p>{dayjs(log.date).format("MMM DD")}</p>
              </div>
            ))}
          </div>
        </div>
        {/* <div className="my-4 h-[90vh] bg-white">
          <WorklogView
            id={id}
            date={leftdate.format("YYYY-MM-DD")}
            logType={_logType}
          />
        </div> */}
        <div className="my-4 h-[90vh] bg-white">
          <WorklogView
            id={id}
            date={centerdate.format("YYYY-MM-DD")}
            logType={_logType}
          />
        </div>
        {/* <div className="my-4 h-[90vh] bg-white">
          <WorklogView
            id={id}
            date={rightdate.format("YYYY-MM-DD")}
            logType={_logType}
          />
        </div> */}
      </div>
    );
  }

  return <WorklogView id={id} date={_date} logType={_logType} />;
};
