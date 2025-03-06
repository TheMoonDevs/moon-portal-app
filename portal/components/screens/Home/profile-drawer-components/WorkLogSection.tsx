import { User, WorkLogs } from '@prisma/client';
import { WorklogSummaryView } from '../../Worklogs/WorklogSummary/WorklogSummaryView';
import { ArrayHelper } from '@/utils/helpers/array';

export const WorkLogSection = ({
  selectedUser,
  worklogSummary,
}: {
  selectedUser: User;
  worklogSummary: WorkLogs[];
}) => {
  return (
    <div className="flex flex-col gap-1">
      <h6 className="pb-2 font-bold">Last worked on</h6>
      <div className="relative h-[310px] overflow-y-hidden">
        <div className="bottom-8 h-full overflow-y-scroll">
          <WorklogSummaryView
            workLogUser={selectedUser}
            worklogSummary={ArrayHelper.reverseSortByDate(
              worklogSummary,
              'date',
            ).slice(0, 5)}
            isDrawer={true}
          />
          <div className="absolute bottom-0 left-0 right-0 flex h-[30vh] flex-col justify-end bg-gradient-to-b from-transparent to-white">
            <p className="p-2 text-center text-xs font-semibold text-neutral-500"></p>
          </div>
        </div>
      </div>
    </div>
  );
};
