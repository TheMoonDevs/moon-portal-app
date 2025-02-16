import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { User, WorkLogs } from '@prisma/client';
import dayjs from 'dayjs';
import { getStatsOfContent } from '../Worklogs/WorklogEditor';

interface WorkLogsByDate {
  [date: string]: WorkLogs[];
}

const EngagementWorklogs = ({
  workLogs,
  team,
  workLogsLoading,
  loading,
}: {
  workLogs: WorkLogs[];
  team: User[];
  workLogsLoading: boolean;
  loading: boolean;
}) => {
  const workLogsByDate = workLogs.reduce<WorkLogsByDate>((acc, workLog) => {
    const date = workLog.date;
    if (date !== null && !acc[date]) {
      acc[date] = [];
    }
    if (date !== null) {
      acc[date].push(workLog);
    }
    return acc;
  }, {} as WorkLogsByDate);

  return Object.keys(workLogsByDate).length > 0 ? (
    Object.entries(workLogsByDate).map(([date, workLogsForDate]) => {
      const formattedDate = dayjs(date).format('MMMM DD - dddd');
      return (
        <div key={date} className="mb-4 px-6">
          <h1 className="mb-4 px-4 text-lg font-semibold uppercase tracking-widest text-neutral-500">
            {formattedDate}
          </h1>
          {workLogsForDate.map((workLog) => (
            <div key={workLog.id} className="my-2 rounded-lg bg-white px-6">
              {workLog.works?.map((work) => {
                const user = team.find((u) => u.id === workLog.userId);
                const markdownData = workLog?.works[0];
                const stats =
                  markdownData &&
                  typeof markdownData === 'object' &&
                  'content' in markdownData
                    ? getStatsOfContent(markdownData.content as string)
                        .split(' / ')
                        .map(Number)
                    : [0, 0];
                const [completed, total] = stats;
                return (
                  <div
                    key={`${workLog.createdAt}-index-${workLog.id}`}
                    className="flex flex-col items-start gap-0"
                  >
                    {team
                      .filter((user) => user.id === workLog.userId)
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex flex-row items-center gap-2"
                        >
                          <img
                            src={user.avatar || '/images/avatar.png'}
                            alt={user.name || ''}
                            className="mt-1 h-[30px] w-[30px] rounded-full object-cover"
                          />
                          <span className="text-[0.8em] uppercase tracking-widest text-neutral-500">
                            {user?.name} -{' '}
                            <span className="font-semibold">
                              {completed} / {total}
                            </span>
                          </span>
                        </div>
                      ))}
                    <div className="ml-4 flex-grow">
                      <MdxAppEditor
                        readOnly
                        markdown={(work as { content: string }).content || ''}
                        contentEditableClassName="summary_mdx flex flex-col gap-4 z-1 mb-[-20px] ml-3"
                        editorKey={'engagement-mdx'}
                        className="z-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    })
  ) : (
    <div className="flex h-full items-center justify-center py-6">
      <p className="text-neutral-500">
        {workLogsLoading
          ? 'Loading work logs...'
          : loading
            ? 'Loading engagements...'
            : workLogs.length === 0 && 'No work logs found'}
      </p>
    </div>
  );
};

export default EngagementWorklogs;
