"use client";

import { WorkLogPoints } from "@/utils/@types/interfaces";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WorkLogs } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
  monthTab,
  setMonthTab,
  handleNextMonthClick,
}: {
  id?: string;
  date?: string | null;
  compactView?: boolean;
  visible?: boolean;
  logType?: string | null;
  monthTab?: number;
  setMonthTab?: Dispatch<SetStateAction<number>>;
  handleNextMonthClick?: () => void;
}) => {
  const { user } = useUser();
  const [workLog, setWorkLog] = useState<WorkLogs | null>(null);

  const refreshWorklogs = () => {
    let query = `?id=${id}`;
    let _id = id && id?.length > 5 ? id : null;
    if (!_id && date) query = `?date=${date}&userId=${user?.id}`;
    if (!_id && logType) query = `?logType=${logType}&userId=${user?.id}`;
    setLoading(true);
    PortalSdk.getData(`/api/user/worklogs${query}`, null)
      .then((data) => {
        console.log(data);
        setLoading(false);
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
        setLoading(false);
      });
  };

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const _user = store.getState().auth.user;
    if (
      (workLog &&
        (id ? workLog?.id == id : `${workLog?.date}` === `${date}`)) ||
      !_user
    )
      return;
    // console.log(`${workLog?.id}-${workLog?.date}`, `${id}${date}`);
    //setMarkdownData(`testing`)
    let _id = id && id?.length > 5 ? id : null;
    if (_id) {
      setLoading(true);
      PortalSdk.getData(`/api/user/worklogs?id=${_id}`, null)
        .then((data) => {
          // console.log(data);
          setWorkLog(data?.data?.workLogs?.[0] || null);
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
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
      // console.log(query);
      setLoading(true);
      PortalSdk.getData(`/api/user/worklogs${query}`, null)
        .then((data) => {
          // console.log(data);
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
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    }
  }, [id, date, workLog, logType]);

  if (!visible) return;

  return (
    <WorklogEditor
      loading={loading}
      editWorkLogs={workLog}
      refreshWorklogs={refreshWorklogs}
      compactView={compactView}
      monthTab={monthTab}
      setMonthTab={setMonthTab}
      handleNextMonthClick={handleNextMonthClick}
    />
  );
};
