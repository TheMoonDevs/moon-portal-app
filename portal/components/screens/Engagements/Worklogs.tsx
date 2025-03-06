import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { User, WorkLogs } from '@prisma/client';
import dayjs from 'dayjs';
import { getStatsOfContent } from '../Worklogs/WorklogEditor';

interface WorkLogsByDate {
  [date: string]: WorkLogs[];
}

const isValidWorkLog = (workLog: WorkLogs) =>
  workLog.works?.some(
    (work) =>
      (work as { content: string }).content.trim() &&
      !/^[*]\s*$/m.test((work as { content: string }).content),
  );

const UserInfo = ({
  user,
  completed,
  total,
}: {
  user: User;
  completed: number;
  total: number;
}) => (
  <div className="flex flex-row items-center gap-2">
    <img
      src={user.avatar || '/images/avatar.png'}
      alt={user.name || ''}
      className="mt-1 h-[30px] w-[30px] rounded-full object-cover"
    />
    <span className="text-[0.8em] uppercase tracking-widest text-neutral-500">
      {user.name} -{' '}
      <span className="font-semibold">
        {completed} / {total}
      </span>
    </span>
  </div>
);

const WorkLogEntry = ({
  workLog,
  team,
}: {
  workLog: WorkLogs;
  team: User[];
}) => {
  const user = team.find((u) => u.id === workLog.userId);
  const markdownData = workLog.works?.[0];
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
    <div key={workLog.id} className="my-2 rounded-lg bg-white px-8">
      {user && <UserInfo user={user} completed={completed} total={total} />}
      <div className="ml-6 flex-grow">
        <MdxAppEditor
          readOnly
          markdown={(markdownData as { content: string })?.content || ''}
          contentEditableClassName="summary_mdx flex flex-col gap-4 z-1 mb-[-20px] ml-3"
          editorKey="engagement-mdx"
          className="z-1"
        />
      </div>
    </div>
  );
};

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
    if (workLog.date) {
      acc[workLog.date] = acc[workLog.date] || [];
      acc[workLog.date].push(workLog);
    }
    return acc;
  }, {});

  if (Object.keys(workLogsByDate).length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-6">
        <p className="text-neutral-500">
          {workLogsLoading
            ? 'Loading work logs...'
            : loading
              ? 'Loading engagements...'
              : 'No work logs found'}
        </p>
      </div>
    );
  }

  return Object.entries(workLogsByDate)
    .map(([date, workLogsForDate]) => {
      const validWorkLogs = workLogsForDate.filter(isValidWorkLog);
      if (validWorkLogs.length === 0) return null;

      return (
        <div key={date} className="mb-4 px-6">
          <h1 className="mb-4 px-4 text-lg font-semibold uppercase tracking-widest text-neutral-500">
            {dayjs(date).format('MMMM DD - dddd')}
          </h1>
          {validWorkLogs.map((workLog) => (
            <WorkLogEntry key={workLog.id} workLog={workLog} team={team} />
          ))}
        </div>
      );
    })
    .filter(Boolean);
};

export default EngagementWorklogs;
