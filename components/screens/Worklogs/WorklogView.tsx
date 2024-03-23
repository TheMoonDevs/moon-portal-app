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

const tempData = {
  id: "idsdjneslnfrnleskdnelrnv",
  title: "March 24 - Sunday",
  date: "2021-03-24",
  createdAt: "2021-03-24T12:00:00.000Z",
  updatedAt: "2021-03-24T12:00:00.000Z",
  works: [
    {
      id: "sdjnvkrbd-2021-03-24", // should be random id - `random_uid+date`
      text: "Worked on the general PWA",
      status: "none", // none, done, inProgress
    },
    {
      id: "djncsjnk-2021-03-24", // should be random id - `random_uid+date`
      text: "Worked on the general Homepage",
      status: "done", // none, done, inProgress
    },
    {
      id: "sdvnsjknc-2021-03-24", // should be random id - `random_uid+date`
      text: "Worked on the general PWA",
      status: "none", // none, done, inProgress
    },
  ],
};
const MARKDOWN_PLACHELODER = `* `;

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

  const refreshWorklogs = () => {
    let query = `?id=${id}`;
    if (!id && _date) query = `?date=${_date}&userId=${user?.id}`;
    PortalSdk.getData(`/api/user/worklogs${query}`, null)
      .then((data) => {
        console.log(data);
        setWorkLog(
          data?.data?.worklog[0] || WorkLogsHelper.defaultWorklogs(_date, user)
        );
      })
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    if (workLog || !user) return;
    //setMarkdownData(`testing`)
    if (id && id != "new") {
      PortalSdk.getData(`/api/user/worklogs?id=${id}`, null)
        .then((data) => {
          console.log(data);
          setWorkLog(data?.data?.workLogs?.[0] || null);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      PortalSdk.getData(
        `/api/user/worklogs?date=${
          date || _date || dayjs().format("YYYY-MM-DD")
        }&userId=${user?.id}`,
        null
      )
        .then((data) => {
          console.log(data);
          setWorkLog(
            data?.data?.workLogs?.[0] ||
              WorkLogsHelper.defaultWorklogs(_date, user)
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
