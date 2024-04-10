"use client";

import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WorkLogs } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import store from "@/utils/redux/store";
import dayjs from "dayjs";
import { WorkLogsHelper } from "./WorklogsHelper";

const tempData = [
  {
    id: "idsdjneslnfrnleskdnelrnv",
    title: "March 24 - Sunday",
    date: "2021-03-24",
    works: [
      {
        id: "sdjnvkrbd-2021-03-24", // should be random id - `random_uid+date`
        text: "Worked on the Moon PWA",
        status: "none", // none, done, inProgress
      },
      {
        id: "djncsjnk-2021-03-24", // should be random id - `random_uid+date`
        text: "Worked on the Moon Homepage",
        status: "done", // none, done, inProgress
      },
      {
        id: "sdvnsjknc-2021-03-24", // should be random id - `random_uid+date`
        text: "Worked on the Moon PWA",
        status: "none", // none, done, inProgress
      },
    ],
  },
];

export const WorkLogItem = ({ data }: { data: WorkLogs }) => {
  return (
    <Link
      href={
        APP_ROUTES.userWorklogs +
        "/" +
        (data.id || "new") +
        "?logType=" +
        data.logType
      }
      className={`flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 ${data.logType === 'privateLog' ? 'h-full' : '' }`}
    >
      <div
        className={`flex flex-row justify-between ${
          data.logType === "privateLog"
            ? "text-neutral-800"
            : dayjs(data.date).isSame(dayjs(), "date")
            ? "text-blue-400"
            : data.id === ""
            ? "text-neutral-500"
            : "text-green-500"
        }`}
      >
        <h1 className={`text-xs font-bold `}>{data.title}</h1>
        {data.logType === "dayLog" && (
          <span className={`icon_size material-symbols-outlined `}>
            {data.id === "" ? "add_box" : "checklist"}
          </span>
        )}
      </div>
      <div className="flex flex-col max-h-[100px] min-h-[100px] p-1">
        {data.id != "" &&
          data.works //.flatMap((wk) => (wk as any)?.pointInfos)
            //.slice(0, 3)
            .map((point: any) => (
              <div key={point.project} className="flex flex-row items-center">
                <div className="text-sm font-light">
                  <MdxAppEditor
                    markdown={point?.content}
                    readOnly={true}
                    contentEditableClassName="mdx_ce_min font-mono leading-0 imp-p-0 grow w-full h-full line-clamp-3"
                    // plugins={[
                    //   diffSourcePlugin({
                    //     diffMarkdown: "An older version",
                    //     viewMode: "diff",
                    //   }),
                    // ]}
                  />
                </div>
              </div>
            ))}
        {data.id === "" && (
          <div className="">
            <p className="text-sm font-mono text-neutral-300">
              Tap to jot down your logs...
            </p>
          </div>
        )}
      </div>
    </Link>
  );
};

export const WorklogsPage = () => {
  const { user } = useUser();

  const thisMonth = dayjs().month();
  const thisDate = dayjs().date();
  const [monthTab, setMonthTab] = useState<number>(thisMonth);
  const [logsList, setLogsList] = useState<WorkLogs[]>([]);
  const [yearLogData, setYearLogData] = useState<any>();
  const [privateBoard, setPrivateBoard] = useState<WorkLogs | null>(null);

  useEffect(() => {
    const _user = store.getState().auth.user;

    if (!_user) return;
    PortalSdk.getData(`/api/user/worklogs?userId=${_user.id}`, null)
      .then((data) => {
        console.log(data);
        setYearLogData(data);

        const _privateboard = data?.data?.workLogs.find(
          (wl: WorkLogs) => wl.logType === "privateLog"
        );
        setPrivateBoard(
          _privateboard ||
            WorkLogsHelper.defaultPrivateBoard(
              dayjs().month(monthTab).format("MM-YYYY"),
              _user
            )
        );
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    const _user = store.getState().auth.user;
    const _total_days_in_month = dayjs().month(monthTab).daysInMonth();
    const _logList = Array.from({
      length:
        monthTab != dayjs().month()
          ? _total_days_in_month
          : _total_days_in_month <= dayjs().date() + 2
          ? _total_days_in_month
          : dayjs().date() + 2,
    })
      .map((_, i) => {
        const _date = dayjs()
          .month(monthTab)
          .date(i + 1)
          .format("YYYY-MM-DD");
        const _worklog = yearLogData?.data?.workLogs.find(
          (wl: WorkLogs) => wl.date === _date
        );
        return _worklog || WorkLogsHelper.defaultWorklogs(_date, _user);
      })
      .reverse();
    setLogsList(_logList);
  }, [monthTab, yearLogData]);

  //if (!user?.workData) return null;

  return (
    <div className="flex flex-col">
      <div className="fixed left-0 right-0 top-0 z-10 bg-white flex flex-row gap-3 py-2 px-3 items-center justify-between border-b border-neutral-400 md:pl-[6rem]">
        <h1 className="tracking-widest text-sm font-bold">My Worklogs</h1>
        <div className="flex flex-row gap-1">
          <Link href={APP_ROUTES.userWorklogs}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-symbols-outlined">
                timeline
              </span>
            </div>
          </Link>
          <Link href={APP_ROUTES.userWorklogs}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-symbols-outlined">
                description
              </span>
            </div>
          </Link>
        </div>
      </div>
      <div className="scrollable_list">
        <div className="h-[3.5rem]"></div>
        <div
          className="flex flex-row justify-between sticky top-[3.5rem] bg-neutral-100 z-10
         overflow-x-scroll p-2 "
        >
          {Array.from({ length: 12 }).map((_, month_tab: number) => (
            <div
              key={month_tab}
              onClick={() => setMonthTab(month_tab)}
              className={` rounded-3xl cursor-pointer ${
                monthTab === month_tab ? "border border-neutral-600" : ""
              }`}
            >
              <h4
                className={`text-sm ${
                  monthTab === month_tab
                    ? "font-bold text-neutral-800"
                    : "text-neutral-400"
                } p-2 px-4`}
              >
                {dayjs().month(month_tab).format("MMMM")}
              </h4>
            </div>
          ))}
        </div>
        <div className="flex flex-row gap-1 max-lg:flex-col w-full">
          <div className="p-2 w-[25%] max-lg:w-full">
            {privateBoard && (
              <WorkLogItem
                key={
                  privateBoard.id +
                  "-" +
                  privateBoard.date +
                  "-" +
                  privateBoard.userId
                }
                data={privateBoard}
              />
            )}
          </div>
          <div className="grid grid-cols-4 gap-3 p-2 max-lg:grid-cols-3 max-md:grid-cols-2">
            {logsList.map((data) => (
              <WorkLogItem
                key={data.id + "-" + data.date + "-" + data.userId}
                data={data}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 h-[5rem]"></div>
      </div>
    </div>
  );
};
