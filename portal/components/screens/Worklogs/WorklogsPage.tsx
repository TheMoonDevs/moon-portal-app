"use client";

import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WorkLogs } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import store, { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import dayjs from "dayjs";
import { WorkLogsHelper } from "./WorklogsHelper";
import { Fade, useMediaQuery } from "@mui/material";
import media from "@/styles/media";
import { WorklogView } from "./WorklogView";
import { SummarizeButton } from "./SummarizeButton";
import { Toaster, toast } from "sonner";
import { setLogsList } from "@/utils/redux/worklogs/worklogs.slice";

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

const linkForWorkLog = (data: WorkLogs) => {
  return (
    APP_ROUTES.userWorklogs +
    "/" +
    (data.id || "new") +
    "?logType=" +
    data.logType +
    (data.logType === "dayLog" ? "&date=" + data.date : "")
  );
};

export const WorkLogItem = ({
  data,
  onClick,
  selected,
  isTabletOrMore,
}: {
  data: WorkLogs;
  onClick: any;
  selected?: boolean;
  isTabletOrMore: boolean;
}) => {
  return (
    <Link
      href={isTabletOrMore ? "" : linkForWorkLog(data)}
      className={`flex flex-col  gap-3 rounded-lg border border-neutral-200 p-3 overflow-y-hidden min-h-[150px] ${data.logType === "privateLog" ? " h-full " : ""
        } ${selected ? " bg-white border-neutral-900 border-2 " : ""}`}
      onClick={onClick}
    >
      <div
        className={`flex flex-row justify-between  ${selected ? "font-bold text-black" : "font-regular text-neutral-800"
          }`}
      >
        <h1 className={`text-xs `}>{data.title}</h1>
        {data.logType === "dayLog" && (
          <span
            className={`icon_size material-symbols-outlined 
          ${dayjs(data.date).isBefore(dayjs(), "date") && data.id === ""
                ? "text-red-500"
                : !selected
                  ? "text-neutral-500"
                  : dayjs(data.date).isSame(dayjs(), "date")
                    ? "text-green-500"
                    : data.id === "" || dayjs(data.date).isAfter(dayjs(), "date")
                      ? "text-neutral-500"
                      : "text-blue-500"
              }
          
          `}
          >
            {dayjs(data.date).isSame(dayjs(), "date")
              ? "radio_button_checked"
              : dayjs(data.date).isAfter(dayjs(), "date")
                ? data.id === ""
                  ? "add_box"
                  : "checklist"
                : data.id === ""
                  ? "pending"
                  : "checklist"}
          </span>
        )}
      </div>
      <div className="flex flex-col max-h-[100px] min-h-[100px] p-1">
        {data.id != "" &&
          data.works //.flatMap((wk) => (wk as any)?.pointInfos)
            //.slice(0, 3)
            .map((point: any, index: number) => (
              <div key={`${point.link_id}-${index}`} className="flex flex-row items-center">
                <div className="text-sm font-light">
                  <MdxAppEditor
                    key={point?.id}
                    markdown={point?.content}
                    readOnly={true}
                    contentEditableClassName="mdx_ce_min leading-0 imp-p-0 grow w-full h-full line-clamp-4"
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
            <p className="text-sm text-neutral-300">
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
  const dispatch = useAppDispatch();

  const [monthTab, setMonthTab] = useState<number>(thisMonth);
  const logsList = useAppSelector((state) => state.worklogs.logsList);
  const [yearLogData, setYearLogData] = useState<any>();
  const [privateBoard, setPrivateBoard] = useState<WorkLogs | null>(null);
  const isTabletOrMore = useMediaQuery(media.moreTablet);
  const isEditorSaving = useAppSelector(
    (state) => state.worklogs.isEditorSaving
  );

  useEffect(() => {
    const _user = store.getState().auth.user;

    if (!_user) return;
    PortalSdk.getData(`/api/user/worklogs?userId=${_user.id}`, null)
      .then((data) => {
        // console.log(data);
        setYearLogData(data);

        // const _privateboard = data?.data?.workLogs.find(
        //   (wl: WorkLogs) => wl.logType === "privateLog"
        // );
        // setPrivateBoard(
        //   _privateboard ||
        //     WorkLogsHelper.defaultPrivateBoard(
        //       dayjs().month(monthTab).format("MM-YYYY"),
        //       _user
        //     )
        // );
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    if (!yearLogData) return;
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
    dispatch(setLogsList(_logList));
  }, [monthTab, yearLogData, dispatch]);

  const [selectedID, setSelectedID] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    dayjs().format("YYYY-MM-DD")
  );
  const centerdate = useMemo(() => dayjs(selectedDate), [selectedDate]);

  // load default date id
  useEffect(() => {
    if (
      logsList.length > 0 &&
      !selectedID &&
      centerdate.isSame(dayjs(), "date")
    ) {
      const _worklog = logsList.find(
        (wl) => wl.date === centerdate.format("YYYY-MM-DD")
      );
      if (_worklog) {
        setSelectedID(_worklog.id);
      }
    }
  }, [logsList, centerdate, selectedID]);

  //if (!user?.workData) return null;

  return (
    <div className="flex flex-col">
      <div className="fixed left-0 right-0 top-0 z-10 bg-white flex flex-row gap-3 py-2 px-3 items-center justify-between border-b border-neutral-400 md:pl-[6rem]">
        <div className="flex items-center">
          <Link href={APP_ROUTES.home}>
            <h1 className="text-lg cursor-pointer font-bold border-r-2 pr-3 mr-3">
              The Moon Devs
            </h1>
          </Link>
          <h1 className="tracking-widest text-sm font-regular">My Worklogs</h1>
        </div>
        <div className="flex flex-row gap-1">
          <Link href={APP_ROUTES.userWorklogs}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-symbols-outlined">
                timeline
              </span>
            </div>
          </Link>
          <SummarizeButton userId={user?.id} />
        </div>
      </div>
      <div className="scrollable_list">
        <div className="h-[3.5rem]"></div>
        <div
          className="flex flex-row justify-between sticky top-[3.5rem] bg-neutral-100 z-[5]
         overflow-x-auto p-2 "
        >
          {Array.from({ length: 12 }).map((_, month_tab: number) => (
            <div
              key={month_tab}
              onClick={() => setMonthTab(month_tab)}
              className={` rounded-3xl cursor-pointer ${monthTab === month_tab ? "border border-neutral-600" : ""
                }`}
            >
              <h4
                className={`text-sm ${monthTab === month_tab
                  ? "font-bold text-neutral-800"
                  : "text-neutral-400"
                  } p-2 px-4`}
              >
                {dayjs().month(month_tab).format("MMMM")}
              </h4>
            </div>
          ))}
        </div>
        <div className="flex flex-row-reverse max-lg:flex-col w-full">
          <div className="hidden md:block p-8 invisible md:visible w-[40%] max-lg:w-full max-h-[80vh] overflow-y-scroll">
            <p className="text-lg font-bold my-4">Tasks from clickup</p>
            <ul className=" font-mono text-sm tracking-widest">
              <li className="">Something...</li>
            </ul>
            <p className="text-lg font-bold my-4">Worklog tips</p>
            <ul className="list-decimal font-mono text-sm tracking-widest ml-3">
              <li className="">Use Short Bulletin points</li>
              <li className="">Log every minor update</li>
              <li className="">Add ✅ as you complete each task.</li>
              <li className="">At the end, Note Todo&apos;s for tomorrow</li>
              <li className="">Use summarise to generate logs.</li>
            </ul>
            <p className="text-lg font-bold  my-4">Shortcuts</p>
            <ul className="list-disc font-mono text-sm tracking-widest">
              <li className="">Ctrl+Spacebar  === ✅</li>
              <li className="">Ctrl+S to save the logs manually</li>
              <li className="">Ctrl+R to Refresh the logs</li>
              <li className="">Type `-` to add bulletin</li>
              <li className="">Click Tab to add space to bulletin</li>
            </ul>
            <p className="text-lg font-bold my-4">Emoji Legend:</p>
            <ul className="list-disc font-mono text-sm tracking-widest">
              <li><span className="font-bold">:check:</span> === ✅ - Task Completed</li>
              <li><span className="font-bold">:cross:</span> === ❌ - Task Failed</li>
              <li><span className="font-bold">:yellow:</span> === 🟡 - Task In Progress</li>
              <li><span className="font-bold">:red:</span> === 🔴 - Task Blocked</li>
              <li><span className="font-bold">:calendar:</span> === 📅 - Scheduled Task</li>
              <li><span className="font-bold">:pencil:</span> === ✏️ - Task Being Written</li>
              <li><span className="font-bold">:bulb:</span> === 💡 - New Idea</li>
              <li><span className="font-bold">:question:</span> === ❓ - Need Clarification</li>
              <li><span className="font-bold">:star:</span> === ⭐ - High Priority</li>
            </ul>
          </div>
          <div className="hidden md:block p-2 invisible md:visible w-[50%] max-lg:w-full rounded-lg border border-neutral-200 m-3  max-h-[80vh] overflow-y-scroll">
            {/* {privateBoard && (
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
            )} */}
            <WorklogView
              id={selectedID}
              date={centerdate.format("YYYY-MM-DD")}
              logType={"dayLog"}
            />
          </div>
          <div className="grid grid-cols-2 lg:w-[30%] gap-3 p-2 max-lg:grid-cols-4 max-md:grid-cols-2 max-h-[80vh] overflow-y-scroll m-3">
            {logsList.map(
              (data) => (
                <WorkLogItem
                  isTabletOrMore={isTabletOrMore}
                  key={data.id + "-" + data.date + "-" + data.userId}
                  data={data}
                  selected={selectedDate === data.date}
                  onClick={() => {
                    if (isEditorSaving) {
                      toast.error("Save your Logs! (Ctrl+S)");
                      return;
                    }
                    if (data.id?.trim().length > 0) {
                      setSelectedID(data.id);
                      if (data.date) setSelectedDate(data.date);
                    } else if (data.date) {
                      // console.log(data);
                      setSelectedID(undefined);
                      if (data.date) setSelectedDate(data.date);
                    }
                  }}
                />
              )
              //)
            )}
          </div>
        </div>
        {/* <div className="flex flex-col gap-3 h-[5rem]"></div> */}
      </div>
      <Toaster />
    </div>
  );
};
