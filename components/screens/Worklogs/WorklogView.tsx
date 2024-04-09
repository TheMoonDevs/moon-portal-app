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
import store from "@/utils/redux/store";

export const WorklogView = ({
  date,
  id,
  logType = "dayLog",
  compactView,
  visible = true,
}: {
  id?: string;
  date?: string | null;
  compactView?: boolean;
  visible?: boolean;
  logType?: string | null;
}) => {
  const { user } = useUser();
  const [workLog, setWorkLog] = useState<WorkLogs | null>(null);

  const refreshWorklogs = () => {
    let query = `?id=${id}`;
    let _id = id && id?.length > 5 ? id : null;
    if (!_id && date) query = `?date=${date}&userId=${user?.id}`;
    if (!_id && logType) query = `?logType=${logType}&userId=${user?.id}`;
    PortalSdk.getData(`/api/user/worklogs${query}`, null)
      .then((data) => {
        console.log(data);
        setWorkLog(
          data?.data?.workLogs?.[0] ||
            (logType === "privateLog"
              ? WorkLogsHelper.defaultPrivateBoard(
                  dayjs().format("MM-YYYY"),
                  user
                )
              : WorkLogsHelper.defaultWorklogs(date, user))
        );
      })
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    const _user = store.getState().auth.user;
    if (workLog || !_user) return;
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
      if (logType === "dayLog" && date)
        query = `?date=${date || dayjs().format("YYYY-MM-DD")}&userId=${
          _user?.id
        }`;
      else if (logType) query = `?logType=${logType}&userId=${_user?.id}`;
      else if (date)
        query = `?date=${date || dayjs().format("YYYY-MM-DD")}&userId=${
          _user?.id
        }`;
      console.log(query);
      PortalSdk.getData(`/api/user/worklogs${query}`, null)
        .then((data) => {
          console.log(data);
          setWorkLog(
            data?.data?.workLogs?.[0] ||
              (logType === "privateLog"
                ? WorkLogsHelper.defaultPrivateBoard(
                    dayjs().format("MM-YYYY"),
                    _user
                  )
                : WorkLogsHelper.defaultWorklogs(
                    date || dayjs().format("YYYY-MM-DD"),
                    _user
                  ))
          );
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [id, date, workLog, logType]);

  if (!visible) return;

  return (
    <WorklogEditor
      editWorkLogs={workLog}
      refreshWorklogs={refreshWorklogs}
      compactView={compactView}
    />
  );
};
