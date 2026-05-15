'use client';

import type { Engagement, WorkLogs } from '@db/client';
import dayjs from 'dayjs';
import { usePathname } from 'next/navigation';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { WorklogEditor } from './WorklogEditor';
import { WorkLogsHelper } from './WorklogsHelper';

export const WorklogView = ({
  date,
  id,
  logType = 'dayLog',
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
  const fetchOptions = Array.from({ length: 7 }, (_, i) => ({
    label: `Import incomplete tasks from ${i + 1} day${i === 0 ? '' : 's'} ago`,
    dateIdx: i + 1,
  }));
  const [loading, setLoading] = useState(false);
  const path = usePathname();
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  const fetchEngagements = async () => {
    try {
      const res = await PortalSdk.getData(
        `/api/engagement/user/${user?.id}`,
        null,
      );
      setEngagements(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (path?.includes('user/worklogs') && user?.id) fetchEngagements();
  }, [path, user?.id]);

  const fetchXTasksForDay = async (date: string): Promise<WorkLogs | null> => {
    setLoading(true);

    try {
      // refreshWorklogs();
      const data = await PortalSdk.getData(
        `/api/user/worklogs?date=${date}&userId=${user?.id}`,
        null,
      );
      const xTasks = data?.data?.workLogs?.[0]?.works
        .filter((work: { content: string | string[] }) =>
          work.content.includes('❌'),
        )
        .flatMap((work_1: { content: string }) => {
          return work_1.content
            .split('\n')
            .filter((line: string | string[]) => line.includes('❌'))
            .map((line_1: string) => {
              const taskText = line_1.match(/\*(.*?)❌/)?.[1]?.trim();
              return taskText ? `* ${taskText}❌` : null;
            })
            .filter(Boolean);
        });
      if (!workLog || !xTasks?.length) return workLog;
      const updatedWorks = [
        {
          ...(typeof workLog.works[0] === 'object' ? workLog.works[0] : {}),
          content: `${(workLog.works[0] as { content: string }).content ?? ''}\n${xTasks.join('\n')}`,
        },
      ];

      const newWorkLog = {
        ...workLog,
        works: updatedWorks,
      };
      setWorkLog(newWorkLog);
      console.log(newWorkLog?.works);
      return newWorkLog;
    } catch (err) {
      console.error('Error fetching worklogs:', err);
      setLoading(false);
      return null;
    }
  };

  const refreshWorklogs = () => {
    let query = `?id=${id}`;
    const _id = id && id?.length > 5 ? id : null;
    // Day logs should always load by date to avoid stale id/date mismatches.
    if (logType === 'dayLog' && date) query = `?date=${date}&userId=${user?.id}`;
    else if (_id) query = `?id=${_id}`;
    else if (logType) query = `?logType=${logType}&userId=${user?.id}`;
    else if (date) query = `?date=${date}&userId=${user?.id}`;
    setLoading(true);
    PortalSdk.getData(`/api/user/worklogs${query}`, null)
      .then((data) => {
        console.log(data);
        setLoading(false);
        setWorkLog(
          data?.data?.workLogs?.[0] ||
            WorkLogsHelper.defaultWorklogs(date, user),
        );
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!user?.id) return;
    const _id = id && id?.length > 5 ? id : null;
    if (logType === 'dayLog' && date) {
      setLoading(true);
      PortalSdk.getData(`/api/user/worklogs?date=${date}&userId=${user.id}`, null)
        .then((data) => {
          setWorkLog(
            data?.data?.workLogs?.[0] ||
              WorkLogsHelper.defaultWorklogs(date, user),
          );
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
          console.log(err);
        });
      return;
    }

    if (_id) {
      setLoading(true);
      PortalSdk.getData(`/api/user/worklogs?id=${_id}`, null)
        .then((data) => {
          setWorkLog(data?.data?.workLogs?.[0] || null);
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
          console.log(err);
        });
    } else {
      let query = '';
      if (logType) query = `?logType=${logType}&userId=${user?.id}`;
      else if (date)
        query = `?date=${date || dayjs().format('YYYY-MM-DD')}&userId=${
          user?.id
        }`;
      setLoading(true);
      PortalSdk.getData(`/api/user/worklogs${query}`, null)
        .then((data) => {
          setWorkLog(
            data?.data?.workLogs?.[0] ||
              WorkLogsHelper.defaultWorklogs(
                date || dayjs().format('YYYY-MM-DD'),
                user,
              ),
          );
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    }
  }, [id, date, logType, user?.id]);

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
      fetchXTasksForDay={fetchXTasksForDay}
      fetchOptions={fetchOptions}
      engagements={engagements}
    />
  );
};
