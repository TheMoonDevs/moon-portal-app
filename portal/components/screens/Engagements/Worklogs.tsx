import ToolTip from '@/components/elements/ToolTip';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { User, WorkLogs } from '@prisma/client';
import React from 'react';

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
  return workLogs.length > 0 ? (
    workLogs.map((workLog) => {
      return (
        <div key={workLog.id}>
          {workLog.works?.map((work) => {
            return (
              <div
                key={workLog.id}
                className="mx-4 my-2 rounded-lg bg-white px-4"
              >
                <h1 className="flex items-center gap-2 text-base font-semibold uppercase tracking-[1.5px] text-gray-800">
                  {team
                    .filter((user) => user.id === workLog.userId)
                    .map((user) => (
                      <ToolTip
                        key={user.id}
                        title={`${user.name} | ${user.vertical}`}
                      >
                        <img
                          key={user.id}
                          src={user.avatar || '/images/avatar.png'}
                          alt={user.name || ''}
                          className="h-8 w-8 cursor-pointer rounded-full object-cover"
                        />
                      </ToolTip>
                    ))}
                  {workLog.title}
                </h1>

                <MdxAppEditor
                  readOnly
                  markdown={
                    typeof work === 'object' &&
                    work !== null &&
                    'content' in work
                      ? ((work.content as string) ?? '')
                      : ''
                  }
                  contentEditableClassName="summary_mdx flex flex-col gap-4 z-1 mb-[-20px] ml-3"
                  editorKey={'engagement-mdx'}
                  className="z-1"
                />
              </div>
            );
          })}
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
