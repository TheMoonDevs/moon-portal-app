'use client';

import type { WorkLogs } from '@db/client';
import dayjs from 'dayjs';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { WorklogEditor } from './WorklogEditor';
import { worklogSaves, WorkLogsHelper } from './WorklogsHelper';

export const WorklogView = ({
  date,
  id,
  logType = 'dayLog',
  compactView,
  visible = true,
  monthTab,
  setMonthTab,
  handleNextMonthClick,
  onPrevDay,
  onNextDay,
}: {
  id?: string;
  date?: string | null;
  compactView?: boolean;
  visible?: boolean;
  logType?: string | null;
  monthTab?: number;
  setMonthTab?: Dispatch<SetStateAction<number>>;
  handleNextMonthClick?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
}) => {
  const { user } = useUser();
  const _id = id && id.length > 5 ? id : null;
  // Which log this view shows. Day logs always load by date, so a stale id
  // can never point the editor at another day.
  const viewKey =
    logType === 'dayLog' && date
      ? `day:${date}`
      : _id
        ? `id:${_id}`
        : `type:${logType ?? ''}:${date ?? ''}`;
  // The log is kept with the key it was loaded for, so while the next day is
  // loading the editor never shows (or saves into) the previous one.
  const [loaded, setLoaded] = useState<{
    key: string;
    log: WorkLogs | null;
  } | null>(null);
  const workLog = loaded?.key === viewKey ? loaded.log : null;
  const [loading, setLoading] = useState(false);
  // Only the latest request may land; older responses are dropped.
  const requestSeq = useRef(0);

  const fetchOptions = Array.from({ length: 7 }, (_, i) => ({
    label: `Import incomplete tasks from ${i + 1} day${i === 0 ? '' : 's'} ago`,
    dateIdx: i + 1,
  }));

  const fetchXTasksForDay = async (
    fromDate: string,
  ): Promise<WorkLogs | null> => {
    try {
      const data = await PortalSdk.getData(
        `/api/user/worklogs?date=${fromDate}&userId=${user?.id}`,
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
        ...workLog.works.slice(1),
      ];
      return { ...workLog, works: updatedWorks };
    } catch (err) {
      console.error('Error fetching worklogs:', err);
      return null;
    }
  };

  const refreshWorklogs = useCallback(() => {
    if (!user?.id) return;
    const key = viewKey;
    const fallbackDate = date || dayjs().format('YYYY-MM-DD');
    let query = '';
    if (logType === 'dayLog' && date) query = `?date=${date}&userId=${user.id}`;
    else if (_id) query = `?id=${_id}`;
    else if (logType) query = `?logType=${logType}&userId=${user.id}`;
    else query = `?date=${fallbackDate}&userId=${user.id}`;

    const seq = ++requestSeq.current;
    setLoading(true);
    worklogSaves.queue
      .catch(() => undefined)
      .then(() => PortalSdk.getData(`/api/user/worklogs${query}`, null))
      .then((data) => {
        if (seq !== requestSeq.current) return;
        const found = data?.data?.workLogs?.[0];
        setLoaded({
          key,
          log:
            found ||
            (_id && !(logType === 'dayLog' && date)
              ? null
              : WorkLogsHelper.defaultWorklogs(fallbackDate, user)),
        });
        setLoading(false);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        console.log(err);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, user?.id]);

  useEffect(() => {
    refreshWorklogs();
  }, [refreshWorklogs]);

  if (!visible) return;

  return (
    <WorklogEditor
      // A fresh editor per day: nothing typed for one day can leak into the
      // next. The editor saves anything pending when it is swapped out.
      key={viewKey}
      loading={loading || !workLog}
      editWorkLogs={workLog}
      refreshWorklogs={refreshWorklogs}
      compactView={compactView}
      monthTab={monthTab}
      setMonthTab={setMonthTab}
      handleNextMonthClick={handleNextMonthClick}
      fetchXTasksForDay={fetchXTasksForDay}
      fetchOptions={fetchOptions}
      onPrevDay={onPrevDay}
      onNextDay={onNextDay}
    />
  );
};
