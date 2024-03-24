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
export const WorklogsPage = () => {
  const { user } = useUser();

  const thisMonth = dayjs().month();
  const thisDate = dayjs().date();
  const [monthTab, setMonthTab] = useState<number>(thisMonth);
  const [logsList, setLogsList] = useState<WorkLogs[]>([]);

  useEffect(() => {
    const _user = store.getState().auth.user;

    if (!_user) return;
    PortalSdk.getData(`/api/user/worklogs?userId=${_user.id}`, null)
      .then((data) => {
        console.log(data);
        const _total_days_in_month = dayjs().month(monthTab).daysInMonth();
        const _logList = Array.from({
          length:
            _total_days_in_month <= thisDate + 2
              ? _total_days_in_month
              : thisDate + 2,
        })
          .map((_, i) => {
            const _date = dayjs()
              .date(i + 1)
              .format("YYYY-MM-DD");
            const _worklog = data?.data?.workLogs.find(
              (wl: WorkLogs) => wl.date === _date
            );
            return _worklog || WorkLogsHelper.defaultWorklogs(_date, _user);
          })
          .reverse();
        setLogsList(_logList);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  if (!user?.workData) return null;

  return (
    <div className="flex flex-col">
      <div className="fixed left-0 right-0 top-0 z-10 bg-white flex flex-row gap-3 py-2 px-3 items-center justify-between border-b border-neutral-400">
        <h1 className="tracking-widest text-sm">My Worklogs</h1>
        <div className="flex flex-row gap-1">
          <Link href={APP_ROUTES.home}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-icons">arrow_back</span>
            </div>
          </Link>
          <Link href={APP_ROUTES.userWorklogs}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-icons">refresh</span>
            </div>
          </Link>
          <Link href={APP_ROUTES.userWorklogs}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-icons">
                add_circle_outline
              </span>
            </div>
          </Link>
        </div>
      </div>
      <div className="scrollable_list">
        <div className="h-[4em]"></div>
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 m-2">
          <h4 className="text-xs font-bold">My Private Board</h4>
          <div className="flex flex-col">
            {tempData[0].works.map((work) => (
              <div key={work.id} className="flex flex-row items-center">
                <p className="text-sm font-light line-clamp-1">{work.text}</p>
                {work.status == "done" && (
                  <span className="icon_size material-icons text-green-500">
                    task_alt
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-row justify-between sticky top-[3.5rem] bg-neutral-100 z-10">
          <h4 className="text-sm font-bold p-2 px-4">March</h4>
        </div>
        <div className="grid grid-cols-2 gap-3 p-2">
          {logsList.map((data) => (
            <Link
              href={APP_ROUTES.userWorklogs + "/" + data.id}
              key={data.id + "-" + data.date + "-" + data.userId}
              className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3"
            >
              <h1 className="text-xs font-bold">{data.title}</h1>
              <div className="flex flex-col max-h-[200px]">
                {data.works //.flatMap((wk) => (wk as any)?.pointInfos)
                  //.slice(0, 3)
                  .map((point: any) => (
                    <div
                      key={point.project}
                      className="flex flex-row items-center"
                    >
                      <div className="text-sm font-light">
                        <MdxAppEditor
                          markdown={point?.content}
                          readOnly={true}
                          contentEditableClassName="mdx_ce_min leading-0 imp-p-0 grow w-full h-full line-clamp-3"
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
              </div>
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3 h-[5rem]"></div>
      </div>
    </div>
  );
};
