"use client";

import { WorkLogPoints } from "@/utils/@types/interfaces";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WorkLogs } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WorklogEditor } from "./WorklogEditor";
import dayjs from "dayjs";
import { WorkLogsHelper } from "./WorklogsHelper";

export const WorklogView = ({
  date,
  id,
}: {
  id?: string;
  date?: string | null;
}) => {
  const { user } = useUser();
  const [workLog, setWorkLog] = useState<WorkLogs | null>(null);
  const queryParams = useSearchParams();
  const _date = queryParams?.get("date");
  const _logType = queryParams?.get("logType");

  const refreshWorklogs = () => {
    let query = `?id=${id}`;
    let _id = id && id?.length > 5 ? id : null;
    if (!_id && _date) query = `?date=${_date}&userId=${user?.id}`;
    if (!_id && _logType) query = `?logType=${_logType}&userId=${user?.id}`;
    PortalSdk.getData(`/api/user/worklogs${query}`, null)
      .then((data) => {
        console.log(data);
        setWorkLog(
          data?.data?.worklogs?.[0] ||
            (_logType === "privateLog"
              ? WorkLogsHelper.defaultPrivateBoard(
                  dayjs().format("MM-YYYY"),
                  user
                )
              : WorkLogsHelper.defaultWorklogs(_date, user))
        );
      })
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    if (workLog || !user) return;
    //setMarkdownData(`testing`)
    let _id = id && id?.length > 5 ? id : null;
    if (_id) {
      PortalSdk.getData(`/api/user/worklogs?id=${_id}`, null)
        .then((data) => {
          console.log(data);
          setWorkLog(data?.data?.workLogs?.[0] || null);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      let query = "";
      if (!_id && _date)
        query = `?date=${
          date || _date || dayjs().format("YYYY-MM-DD")
        }&userId=${user?.id}`;
      if (!_id && _logType) query = `?logType=${_logType}&userId=${user?.id}`;
      PortalSdk.getData(`/api/user/worklogs${query}`, null)
        .then((data) => {
          console.log(data);
          setWorkLog(
            data?.data?.worklogs?.[0] ||
              (_logType === "privateLog"
                ? WorkLogsHelper.defaultPrivateBoard(
                    dayjs().format("MM-YYYY"),
                    user
                  )
                : WorkLogsHelper.defaultWorklogs(_date, user))
          );
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [id, date, workLog, _date]);

  return (
    <WorklogEditor editworkLogs={workLog} refreshWorklogs={refreshWorklogs} />
  );
};
